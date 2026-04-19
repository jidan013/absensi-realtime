import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const body = (await req.json()) as {
      qrCode: string;
      lat?: number;
      lon?: number;
      accuracy?: number;
      timestamp?: number;
    };

    const { qrCode, lat, lon, timestamp } = body;

    if (!qrCode || typeof qrCode !== "string") {
      return NextResponse.json({ error: "QR Code wajib diisi" }, { status: 400 });
    }

    // 1. Cari QR Code di DB
    const qr = await db.qRCode.findUnique({
      where: { code: qrCode },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!qr) {
      return NextResponse.json({ error: "QR Code tidak ditemukan" }, { status: 404 });
    }

    // 2. QR harus milik user yang scan (self-absen) ATAU bisa milik siapapun
    // — sesuai kebutuhan sistem: user scan QR milik DIRI SENDIRI
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        { error: "QR Code bukan milik Anda. Gunakan QR Code Anda sendiri." },
        { status: 403 }
      );
    }

    // 3. Cek expired
    if (new Date() > qr.expiredAt) {
      return NextResponse.json(
        { error: "QR Code sudah kadaluarsa. Silakan buat QR baru." },
        { status: 400 }
      );
    }

    // 4. Cek sudah dipakai
    if (qr.isUsed) {
      return NextResponse.json(
        { error: "QR Code sudah pernah digunakan hari ini." },
        { status: 400 }
      );
    }

    // 5. Cek sudah absen hari ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Anda sudah absen hari ini." },
        { status: 400 }
      );
    }

    // 6. Simpan lokasi
    let locationId: string | null = null;
    if (lat != null && lon != null) {
      const location = await db.location.create({
        data: { latitude: lat, longitude: lon, address: null },
      });
      locationId = location.id;
    }

    // 7. Buat attendance
    const clockInTime = timestamp ? new Date(timestamp) : new Date();
    const attendance = await db.attendance.create({
      data: {
        userId: userAccess.userId,
        qrId: qr.id,
        clockIn: clockInTime,
        locationId,
      },
    });

    // 8. Tandai QR sudah dipakai
    await db.qRCode.update({
      where: { id: qr.id },
      data: { isUsed: true },
    });

    return NextResponse.json({
      success: true,
      attendanceId: attendance.id,
      name: qr.user.name,
      clockIn: clockInTime.toISOString(),
      message: "Absensi berhasil dicatat",
    });
  } catch (error) {
    console.error("Error /api/v1/attendance/scan:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan absensi", details: (error as Error).message },
      { status: 500 }
    );
  }
}