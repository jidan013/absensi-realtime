// app/api/v1/attendance/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const body = await req.json();
    const { qrCode, lat, lon, timestamp } = body;

    console.log("📱 Scan request:", { qrCode, userId: userAccess.userId });

    // Validasi QR Code
    if (!qrCode || typeof qrCode !== "string") {
      return NextResponse.json(
        { 
          success: false,
          error: "QR Code wajib diisi" 
        },
        { status: 400 }
      );
    }

    // ── Cari QR ────────────────────────────────────────
    const qr = await db.qRCode.findUnique({
      where: { code: qrCode },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!qr) {
      return NextResponse.json(
        { 
          success: false,
          error: "QR Code tidak ditemukan" 
        },
        { status: 404 }
      );
    }

    // ── Validasi pemilik QR ────────────────────────────
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        { 
          success: false,
          error: "QR Code bukan milik Anda" 
        },
        { status: 403 }
      );
    }

    // ── Validasi Expired ───────────────────────────────
    const now = new Date();
    if (now > qr.expiredAt) {
      return NextResponse.json(
        { 
          success: false,
          error: "QR Code sudah kadaluarsa",
          expiredAt: qr.expiredAt.toISOString()
        },
        { status: 400 }
      );
    }

    // ── Cek apakah QR sudah digunakan ──────────────────
    if (qr.isUsed) {
      return NextResponse.json(
        { 
          success: false,
          error: "QR Code sudah digunakan sebelumnya" 
        },
        { status: 400 }
      );
    }

    // ── Cek absensi hari ini ──────────────────────────
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

    // ✅ SUDAH ABSEN MASUK
    if (existingAttendance && existingAttendance.clockIn) {
      // Cek apakah sudah absen pulang juga
      const isClockedOut = existingAttendance.clockOut !== null;
      
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        alreadyCheckedOut: isClockedOut,
        attendanceId: existingAttendance.id,
        name: qr.user.name,
        clockIn: existingAttendance.clockIn.toISOString(),
        clockOut: existingAttendance.clockOut?.toISOString() || null,
        message: isClockedOut ? "Anda sudah absen masuk dan pulang hari ini" : "Anda sudah absen masuk hari ini",
      });
    }

    // ── Simpan lokasi (optional) ──────────────────────
    let locationId: string | null = null;
    if (lat != null && lon != null) {
      try {
        const loc = await db.location.create({
          data: { 
            latitude: parseFloat(String(lat)), 
            longitude: parseFloat(String(lon)) 
          },
        });
        locationId = loc.id;
      } catch (locError) {
        console.error("Location save error:", locError);
        // Lanjutkan tanpa lokasi
      }
    }

    // ── Create attendance ─────────────────────────────
    const clockInTime = timestamp ? new Date(Number(timestamp)) : new Date();
    
    // Validasi clockInTime
    if (isNaN(clockInTime.getTime())) {
      return NextResponse.json(
        { 
          success: false,
          error: "Timestamp tidak valid" 
        },
        { status: 400 }
      );
    }

    const attendance = await db.attendance.create({
      data: {
        userId: userAccess.userId,
        qrId: qr.id,
        clockIn: clockInTime,
        locationId: locationId,
      },
    });

    // Mark QR as used
    await db.qRCode.update({
      where: { id: qr.id },
      data: { isUsed: true },
    });

    console.log("✅ Attendance created:", attendance.id);

    // Return success response
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      alreadyCheckedOut: false,
      attendanceId: attendance.id,
      name: qr.user.name,
      clockIn: clockInTime.toISOString(),
      message: "Absen masuk berhasil",
    });

  } catch (error) {
    console.error("ERROR /attendance/scan:", error);
    
    // Kirim error yang lebih informatif
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