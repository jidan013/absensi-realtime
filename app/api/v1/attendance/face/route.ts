// app/api/v1/attendance/face/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const { photoBase64, lat, lon, type } = await req.json();
    
    if (!photoBase64) {
      return NextResponse.json(
        { error: "Foto wajah wajib diunggah" },
        { status: 400 }
      );
    }

    const { todayStartUTC, todayEndUTC, nowUTC } = getTodayRangeWIB();
    const now = nowUTC;

    // Cek absensi hari ini
    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStartUTC, lte: todayEndUTC },
      },
    });

    // Validasi berdasarkan type
    if (type === "CLOCK_IN") {
      if (todayAttendance) {
        return NextResponse.json(
          { error: "Anda sudah absen masuk hari ini." },
          { status: 400 }
        );
      }
    } else if (type === "CLOCK_OUT") {
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

    // Upload foto ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(photoBase64, {
      folder: "absensi/face",
      public_id: `face_${Date.now()}_${userAccess.userId}`,
    });

    const photoUrl = uploadResult.secure_url;

    // Simpan lokasi
    let locationId: string | null = null;
    if (lat && lon) {
      const location = await db.location.create({
        data: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        },
      });
      locationId = location.id;
    }

    // Proses absen
    if (type === "CLOCK_IN") {
      // Generate QR code for face method (optional, untuk tracing)
      const qrCode = await db.qRCode.create({
        data: {
          userId: userAccess.userId,
          code: `FACE-IN-${Date.now()}-${userAccess.userId}`,
          date: now,
          expiredAt: new Date(now.getTime() + 5 * 60 * 1000),
          isUsed: true,
        },
      });

      const attendance = await db.attendance.create({
        data: {
          userId: userAccess.userId,
          qrId: qrCode.id,
          clockIn: now,
          photoUrl,
          locationId,
        },
      });

      return NextResponse.json({
        success: true,
        type: "CLOCK_IN",
        attendanceId: attendance.id,
        name: userAccess.name,
        clockIn: now.toISOString(),
        message: "Absen masuk (Face) berhasil",
      });
    } 
    else if (type === "CLOCK_OUT") {
      const updated = await db.attendance.update({
        where: { id: todayAttendance?.id },
        data: {
          clockOut: now,
          photoUrlOut: photoUrl,
          locationId: locationId || todayAttendance?.locationId,
        },
      });

      const clockInTime = todayAttendance?.clockIn || now;
      const durasiMs = now.getTime() - clockInTime.getTime();
      const jam = Math.floor(durasiMs / (1000 * 60 * 60));
      const menit = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));

      // Hapus cookie session setelah clock out
      const response = NextResponse.json({
        success: true,
        type: "CLOCK_OUT",
        durasi: `${jam} jam ${menit} menit`,
        attendanceId: updated.id,
        message: "Absen pulang (Face) berhasil",
      });
      
      response.cookies.delete("absensi_session");
      return response;
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error face attendance:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan absensi face" },
      { status: 500 }
    );
  }
}

// GET: cek status face recognition (apakah user sudah terdaftar face-nya)
export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    // Cek apakah user sudah memiliki face descriptor
    // (Anda perlu menambahkan field faceDescriptor di model User)
    const user = await db.user.findUnique({
      where: { id: userAccess.userId },
      select: { 
        id: true, 
        name: true,
        // faceDescriptor: true // uncomment jika sudah tambah field
      },
    });

    return NextResponse.json({
      hasFaceEnrolled: false, // Ubah sesuai logic face enrollment
      user,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get face status" }, { status: 500 });
  }
}