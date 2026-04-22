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

    const latStr = formData.get("lat") as string | null;
    const lonStr = formData.get("lon") as string | null;
    const timestampStr = formData.get("timestamp") as string | null;
    const photoFile = formData.get("photo") as File | null;

    const qrCodeFromClient = formData.get("qrCode") as string | null;

    if (!photoFile) {
      return NextResponse.json(
        { error: "Foto wajib diunggah" },
        { status: 400 }
      );
    }

    if (!qrCodeFromClient) {
      return NextResponse.json(
        { error: "QR Code wajib dikirim" },
        { status: 400 }
      );
    }

    // ── VALIDASI QR ─────────────────────────────
    const qr = await db.qRCode.findFirst({
      where: {
        code: qrCodeFromClient,
        isUsed: false,
        expiredAt: { gt: new Date() },
      },
    });

    if (!qr) {
      return NextResponse.json(
        { error: "QR tidak valid atau sudah expired" },
        { status: 400 }
      );
    }

    // ── UPLOAD FOTO ─────────────────────────────
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

    // ── LOCATION ─────────────────────────────
    let locationId: string | null = null;

    if (latStr && lonStr) {
      const location = await db.location.create({
        data: {
          latitude: parseFloat(latStr),
          longitude: parseFloat(lonStr),
          address: null,
        },
      });

      locationId = location.id;
    }

    // ── CREATE ATTENDANCE ─────────────────────
    const attendance = await db.attendance.create({
      data: {
        userId: userAccess.userId,
        qrId: qr.id,
        clockIn: timestampStr
          ? new Date(Number(timestampStr))
          : new Date(),
        photoUrl,
        locationId,
      },
    });

    // ── MARK QR USED (INI PENTING) ────────────
    await db.qRCode.update({
      where: { id: qr.id },
      data: { isUsed: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attendance.id,
        qrCode: qr.code,
        name: userAccess.name,
        timestamp: Date.now(),
        photoUrl,
      },
      message: "Absensi berhasil",
    });
  } catch (error) {
    console.error("Error /attendance:", error);
    return NextResponse.json(
      {
        error: "Gagal menyimpan absensi",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}