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

    const latStr       = formData.get("lat")       as string | null;
    const lonStr       = formData.get("lon")       as string | null;
    const timestampStr = formData.get("timestamp") as string | null;
    const photoFile    = formData.get("photo")     as File   | null;
    // ── type: "CLOCK_IN" | "CLOCK_OUT" — default CLOCK_IN jika tidak dikirim
    const typeRaw      = formData.get("type")      as string | null;
    const absenType: "CLOCK_IN" | "CLOCK_OUT" =
      typeRaw === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN";

    // ── Foto wajib ───────────────────────────────────────────────
    if (!photoFile) {
      return NextResponse.json(
        { error: "Foto wajah wajib diunggah" },
        { status: 400 }
      );
    }

    const { todayStartUTC, todayEndUTC, nowUTC } = getTodayRangeWIB();
    const now = timestampStr ? new Date(Number(timestampStr)) : nowUTC;

    // ── Cari absensi hari ini ────────────────────────────────────
    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStartUTC, lte: todayEndUTC },
      },
    });

    // ── CLOCK_IN: belum boleh ada absensi hari ini ───────────────
    if (absenType === "CLOCK_IN") {
      if (todayAttendance) {
        return NextResponse.json(
          { error: "Anda sudah absen masuk hari ini." },
          { status: 400 }
        );
      }
    }

    // ── CLOCK_OUT: harus sudah absen masuk & belum clock out ─────
    if (absenType === "CLOCK_OUT") {
      if (!todayAttendance) {
        return NextResponse.json(
          { error: "Belum absen masuk hari ini." },
          { status: 400 }
        );
      }
      if (todayAttendance.clockOut) {
        return NextResponse.json(
          { error: "Sudah absen pulang hari ini." },
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
            if (err)     return reject(err);
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
      const location = await db.location.create({
        data: {
          latitude:  parseFloat(latStr),
          longitude: parseFloat(lonStr),
          address:   null,
        },
      });
      locationId = location.id;
    }

    // ── CLOCK_IN: buat attendance baru ───────────────────────────
    if (absenType === "CLOCK_IN") {
      // Cari/buat QR face mode
      const prefix = "ABSEN-IN-";
      let qr = await db.qRCode.findFirst({
        where: {
          userId: userAccess.userId,
          code: { startsWith: prefix },
          expiredAt: { gt: nowUTC },
          isUsed: false,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!qr) {
        const dateStr    = nowUTC.toISOString().slice(0, 10).replace(/-/g, "");
        const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
        const code       = `${prefix}${dateStr}-${userAccess.userId}-${randomPart}-FACE`;
        const expiredAt  = new Date(nowUTC.getTime() + 5 * 60 * 1000);

        try {
          qr = await db.qRCode.create({
            data: { userId: userAccess.userId, code, date: nowUTC, expiredAt, isUsed: false },
          });
        } catch {
          qr = null;
        }
      }

      const attendance = await db.attendance.create({
        data: {
          userId:    userAccess.userId,
          qrId:      qr?.id ?? null,
          clockIn:   now,
          photoUrl,
          locationId,
        },
      });

      if (qr) {
        await db.qRCode.update({ where: { id: qr.id }, data: { isUsed: true } });
      }

      return NextResponse.json({
        success: true,
        type: "CLOCK_IN",
        data: {
          id:        attendance.id,
          name:      userAccess.name,
          timestamp: now.getTime(),
          photoUrl,
        },
        message: "Absen masuk berhasil",
      });
    }

    // ── CLOCK_OUT: update clockOut + hitung durasi ───────────────
    const updated = await db.attendance.update({
      where: { id: todayAttendance!.id },
      data: {
        clockOut:     now,
        photoUrlOut:  photoUrl, 
        locationId:   locationId ?? todayAttendance!.locationId,
      },
    });

    const clockInTime = todayAttendance!.clockIn ?? now;
    const durasiMs    = now.getTime() - clockInTime.getTime();
    const jam         = Math.floor(durasiMs / (1000 * 60 * 60));
    const menit       = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      success: true,
      type: "CLOCK_OUT",
      durasi: `${jam} jam ${menit} menit`,
      data: {
        id:        updated.id,
        name:      userAccess.name,
        timestamp: now.getTime(),
        photoUrl,
      },
      message: "Absen pulang berhasil",
    });

  } catch (error) {
    console.error("Error /attendance:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan absensi", details: (error as Error).message },
      { status: 500 }
    );
  }
}