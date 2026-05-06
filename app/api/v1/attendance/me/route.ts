import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    // ── Range hari ini ─────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ── Cari attendance hari ini ───────────────────────
    const attendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { clockIn: "desc" },
    });

    // ── BELUM ABSEN ────────────────────────────────────
    if (!attendance) {
      return NextResponse.json({
        checkedIn: false,
        alreadyDone: false,
        message: "Belum melakukan absensi hari ini",
      });
    }

    // ── SUDAH CLOCK-OUT ────────────────────────────────
    if (attendance.clockOut) {
      return NextResponse.json({
        checkedIn: false,
        alreadyDone: true,
        attendanceId: attendance.id,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        message: "Anda sudah absen masuk & pulang hari ini",
      });
    }

    // ── MASIH AKTIF (SUDAH CLOCK-IN) ───────────────────
    return NextResponse.json({
      checkedIn: true,
      alreadyDone: false,
      attendanceId: attendance.id,
      clockIn: attendance.clockIn,
      clockOut: null,
    });

  } catch (error) {
    console.error("ERROR /attendance/me:", error);

    return NextResponse.json(
      {
        checkedIn: false,
        alreadyDone: false,
        error: "Gagal mengambil status absensi",
      },
      { status: 500 }
    );
  }
}