// app/api/v1/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helper: batas hari ini dalam WIB ─────────────────────────────
function getTodayRangeWIB() {
  const now = new Date();
  const WIB_OFFSET = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const diffMs = (WIB_OFFSET + localOffset) * 60 * 1000;
  const wibNow = new Date(now.getTime() + diffMs);

  const todayStart = new Date(wibNow);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartUTC = new Date(todayStart.getTime() - diffMs);

  const todayEnd = new Date(wibNow);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndUTC = new Date(todayEnd.getTime() - diffMs);

  return { todayStartUTC, todayEndUTC, nowUTC: now };
}

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const formData = await req.formData();

    const latStr = formData.get("lat") as string | null;
    const lonStr = formData.get("lon") as string | null;
    const timestampStr = formData.get("timestamp") as string | null;
    const photoFile = formData.get("photo") as File | null;
    const typeRaw = formData.get("type") as string | null;
    const absenType: "CLOCK_IN" | "CLOCK_OUT" = typeRaw === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN";

    // ── Validasi foto ─────────────────────────────────────────────
    if (!photoFile) {
      return NextResponse.json(
        { success: false, error: "Foto wajah wajib diunggah" },
        { status: 400 }
      );
    }

    // ── Validasi ukuran file (max 5MB) ───────────────────────────
    if (photoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Ukuran foto terlalu besar (maksimal 5MB)" },
        { status: 400 }
      );
    }

    const { todayStartUTC, todayEndUTC, nowUTC } = getTodayRangeWIB();
    const now = timestampStr ? new Date(Number(timestampStr)) : nowUTC;

    // ── Cek absensi hari ini ────────────────────────────────────
    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStartUTC, lte: todayEndUTC },
      },
    });

    // ── CLOCK_IN: validasi ───────────────────────────────────────
    if (absenType === "CLOCK_IN") {
      if (todayAttendance && todayAttendance.clockIn) {
        return NextResponse.json(
          { success: false, error: "Anda sudah absen masuk hari ini." },
          { status: 400 }
        );
      }
    }

    // ── CLOCK_OUT: validasi ──────────────────────────────────────
    if (absenType === "CLOCK_OUT") {
      if (!todayAttendance || !todayAttendance.clockIn) {
        return NextResponse.json(
          { success: false, error: "Belum absen masuk hari ini." },
          { status: 400 }
        );
      }
      if (todayAttendance.clockOut) {
        return NextResponse.json(
          { success: false, error: "Sudah absen pulang hari ini." },
          { status: 400 }
        );
      }
    }

    // ── Upload foto ke Cloudinary ─────────────────────────────────
    const buffer = Buffer.from(await photoFile.arrayBuffer());

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "absensi",
            public_id: `absensi_${Date.now()}_${userAccess.userId}`,
          },
          (err, result) => {
            if (err) return reject(err);
            if (!result) return reject(new Error("Upload gagal"));
            resolve(result);
          }
        )
        .end(buffer);
    });

    const photoUrl = uploadResult.secure_url;

    // ── Simpan lokasi ─────────────────────────────────────────────
    let locationId: string | null = null;
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const location = await db.location.create({
          data: {
            latitude: lat,
            longitude: lon,
            address: null,
          },
        });
        locationId = location.id;
      }
    }

    // ── CLOCK_IN: buat attendance baru ───────────────────────────
    if (absenType === "CLOCK_IN") {
      const prefix = "ABSEN-IN-";
      const dateStr = nowUTC.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
      const code = `${prefix}${dateStr}-${userAccess.userId}-${randomPart}-FACE`;
      const expiredAt = new Date(nowUTC.getTime() + 5 * 60 * 1000);

      const qr = await db.qRCode.create({
        data: { 
          userId: userAccess.userId, 
          code, 
          date: nowUTC, 
          expiredAt, 
          isUsed: true 
        },
      });

      const attendance = await db.attendance.create({
        data: {
          userId: userAccess.userId,
          qrId: qr.id,
          clockIn: now,
          photoUrl,
          locationId,
        },
      });

      return NextResponse.json({
        success: true,
        type: "CLOCK_IN",
        data: {
          id: attendance.id,
          name: userAccess.name,
          timestamp: now.getTime(),
          photoUrl,
          clockIn: now.toISOString(),
        },
        message: "Absen masuk berhasil",
      });
    }

    // ── CLOCK_OUT: update clockOut + hitung durasi ───────────────
    const updated = await db.attendance.update({
      where: { id: todayAttendance!.id },
      data: {
        clockOut: now,
        photoUrlOut: photoUrl,
        locationId: locationId ?? todayAttendance!.locationId,
      },
    });

    const clockInTime = todayAttendance!.clockIn!;
    const durasiMs = now.getTime() - clockInTime.getTime();
    const jam = Math.floor(durasiMs / (1000 * 60 * 60));
    const menit = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));
    const detik = Math.floor((durasiMs % (1000 * 60)) / 1000);

    let durasiText = "";
    if (jam > 0) durasiText = `${jam} jam ${menit} menit`;
    else if (menit > 0) durasiText = `${menit} menit ${detik} detik`;
    else durasiText = `${detik} detik`;

    return NextResponse.json({
      success: true,
      type: "CLOCK_OUT",
      durasi: durasiText,
      data: {
        id: updated.id,
        name: userAccess.name,
        timestamp: now.getTime(),
        photoUrl,
        clockIn: clockInTime.toISOString(),
        clockOut: now.toISOString(),
      },
      message: "Absen pulang berhasil",
    });

  } catch (error) {
    console.error("Error /attendance:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Gagal menyimpan absensi", 
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined 
      },
      { status: 500 }
    );
  }
}