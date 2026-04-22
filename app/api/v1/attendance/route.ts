import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// Konfigurasi Cloudinary
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
    // const accuracyStr = formData.get("accuracy") as string | null;
    const timestampStr = formData.get("timestamp") as string | null;
    const photoFile = formData.get("photo") as File | null;

    if (!photoFile) {
      return NextResponse.json(
        { error: "Foto wajib diunggah" },
        { status: 400 },
      );
    }

    let photoUrl: string = "";

    try {
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "absensi",
                public_id: `absensi_${Date.now()}_${userAccess.userId}`,
                resource_type: "image" as const,
              },
              (
                error: Error | null | undefined,
                result: UploadApiResponse | undefined,
              ) => {
                if (error) {
                  reject(error);
                  return;
                }
                if (!result) {
                  reject(new Error("Upload selesai tapi result tidak ada"));
                  return;
                }
                resolve(result);
              },
            )
            .end(buffer);
        },
      );

      photoUrl = uploadResult.secure_url;
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      return NextResponse.json(
        { error: "Gagal mengunggah foto ke Cloudinary" },
        { status: 500 },
      );
    }

    // 4. Simpan lokasi baru
    let locationId: string | null = null;
    if (latStr && lonStr) {
      const location = await db.location.create({
        data: {
          latitude: parseFloat(latStr),
          longitude: parseFloat(lonStr),
          address: null, // bisa diisi nanti pakai reverse geocoding kalau mau
        },
      });
      locationId = location.id;
    }

    // Buat QRCode otomatis
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = crypto.randomUUID().slice(0, 8);
    const qrCodeValue = `ABSEN-${dateStr}-${userAccess.userId}-${randomPart}`;

    const qrCode = await db.qRCode.create({
      data: {
        userId: userAccess.userId,
        code: qrCodeValue,
        date: today,
        expiredAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        isUsed: false,
      },
    });

    const attendance = await db.attendance.create({
      data: {
        userId: userAccess.userId,
        qrId: qrCode.id,
        clockIn: timestampStr ? new Date(Number(timestampStr)) : new Date(),
        photoUrl,
        locationId,
      },
    });

    return NextResponse.json({
  success: true,
  data: {
    id: attendance.id,
    qrCode: qrCode.code,
    name: userAccess.name,
    timestamp: Number(timestampStr) || Date.now(),
    photoUrl,
  },
  message: "Absensi berhasil & QR dibuat",
});
  } catch (error) {
    console.error("Error /api/v1/attendance:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan absensi", details: (error as Error).message },
      { status: 500 },
    );
  }
}
