// app/api/v1/attendance/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    // ── Range hari ini (WIB adjustment) ─────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log("📊 Fetching attendance for:", {
      userId: userAccess.userId,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
    });

    // ── Cari attendance hari ini dengan include user ────
    const attendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            position: true,
          },
        },
        location: {
          select: {
            latitude: true,
            longitude: true,
            address: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
    });

    // ── BELUM ABSEN SAMA SEKALI ─────────────────────────
    if (!attendance) {
      return NextResponse.json({
        success: true,
        checkedIn: false,
        alreadyDone: false,
        hasAttendance: false,
        message: "Belum melakukan absensi hari ini",
      });
    }

    // ── HITUNG DURASI (jika sudah clock out) ────────────
    let duration = null;
    let durationText = null;
    
    if (attendance.clockIn && attendance.clockOut) {
      const durationMs = attendance.clockOut.getTime() - attendance.clockIn.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      duration = durationMs;
      if (hours > 0) durationText = `${hours} jam ${minutes} menit`;
      else if (minutes > 0) durationText = `${minutes} menit ${seconds} detik`;
      else durationText = `${seconds} detik`;
    }

    // ── SUDAH CLOCK OUT (selesai semua) ─────────────────
    if (attendance.clockIn && attendance.clockOut) {
      return NextResponse.json({
        success: true,
        checkedIn: false,
        alreadyDone: true,
        hasAttendance: true,
        attendanceId: attendance.id,
        name: attendance.user.name,
        email: attendance.user.email,
        position: attendance.user.position,
        clockIn: attendance.clockIn.toISOString(),
        clockOut: attendance.clockOut.toISOString(),
        duration: duration,
        durationText: durationText,
        location: attendance.location,
        message: "Anda sudah absen masuk & pulang hari ini",
      });
    }

    // ── MASIH AKTIF (SUDAH CLOCK IN, BELUM CLOCK OUT) ───
    if (attendance.clockIn && !attendance.clockOut) {
      // Hitung durasi sementara (sejak clock in sampai sekarang)
      const now = new Date();
      const currentDurationMs = now.getTime() - attendance.clockIn.getTime();
      const currentHours = Math.floor(currentDurationMs / (1000 * 60 * 60));
      const currentMinutes = Math.floor((currentDurationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return NextResponse.json({
        success: true,
        checkedIn: true,
        alreadyDone: false,
        hasAttendance: true,
        attendanceId: attendance.id,
        name: attendance.user.name,
        email: attendance.user.email,
        position: attendance.user.position,
        clockIn: attendance.clockIn.toISOString(),
        clockOut: null,
        currentDuration: currentDurationMs,
        currentDurationText: `${currentHours} jam ${currentMinutes} menit`,
        location: attendance.location,
        message: "Sedang dalam sesi absen",
      });
    }

    // ── FALLBACK (harusnya tidak sampai sini) ───────────
    return NextResponse.json({
      success: true,
      checkedIn: false,
      alreadyDone: false,
      hasAttendance: false,
      message: "Status tidak diketahui",
    });

  } catch (error) {
    console.error("❌ ERROR /attendance/me:", error);
    
    return NextResponse.json(
      {
        success: false,
        checkedIn: false,
        alreadyDone: false,
        hasAttendance: false,
        error: "Gagal mengambil status absensi",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}