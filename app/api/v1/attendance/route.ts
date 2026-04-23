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

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const formData = await req.formData();

    const latStr      = formData.get("lat")       as string | null;
    const lonStr      = formData.get("lon")       as string | null;
    const timestampStr = formData.get("timestamp") as string | null;
    const photoFile   = formData.get("photo")     as File   | null;

    // ── Foto wajib untuk face mode ───────────────────────────────
    if (!photoFile) {
      return NextResponse.json(
        { error: "Foto wajib diunggah" },
        { status: 400 }
      );
    }

    // ── Cek sudah absen hari ini ─────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    if (todayAttendance) {
      return NextResponse.json(
        { error: "Anda sudah absen masuk hari ini." },
        { status: 400 }
      );
    }

    // ── Cari QR aktif milik user (reuse jika masih valid) ────────
    const now = new Date();
    const prefix = "ABSEN-IN-";

    let qr = await db.qRCode.findFirst({
      where: {
        userId: userAccess.userId,
        code: { startsWith: prefix },
        expiredAt: { gt: now },
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Tidak ada QR aktif → buat baru khusus face mode ──────────
    if (!qr) {
      const dateStr    = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
      const code       = `${prefix}${dateStr}-${userAccess.userId}-${randomPart}-FACE`;
      const expiredAt  = new Date(now.getTime() + 5 * 60 * 1000); // 5 menit cukup

      // @@unique([userId, date]) di schema → pakai upsert aman
      try {
        qr = await db.qRCode.create({
          data: {
            userId:    userAccess.userId,
            code,
            date:      now,
            expiredAt,
            isUsed:    false,
          },
        });
      } catch {
        // Jika unique constraint error (sudah ada QR hari ini),
        // ambil yang ada meskipun expired → kita tetap lanjut tanpa qrId
        qr = null;
      }
    }

    // ── Upload foto ke Cloudinary ─────────────────────────────────
    const buffer = Buffer.from(await photoFile.arrayBuffer());

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:    "absensi",
            public_id: `absensi_${Date.now()}_${userAccess.userId}`,
          },
          (err, result) => {
            if (err)      return reject(err);
            if (!result)  return reject(new Error("Upload gagal"));
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

    // ── Buat attendance ───────────────────────────────────────────
    const attendance = await db.attendance.create({
      data: {
        userId:     userAccess.userId,
        qrId:       qr?.id ?? null,   // null jika QR tidak bisa dibuat (aman, field opsional)
        clockIn:    timestampStr ? new Date(Number(timestampStr)) : now,
        photoUrl,
        locationId,
      },
    });

    // ── Tandai QR sudah digunakan ─────────────────────────────────
    if (qr) {
      await db.qRCode.update({
        where: { id: qr.id },
        data:  { isUsed: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id:       attendance.id,
        qrCode:   qr?.code ?? null,
        name:     userAccess.name,
        timestamp: Date.now(),
        photoUrl,
      },
      message: "Absensi berhasil",
    });

  } catch (error) {
    console.error("Error /attendance:", error);
    return NextResponse.json(
      {
        error:   "Gagal menyimpan absensi",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}