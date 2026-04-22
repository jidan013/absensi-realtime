import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    // ── Ambil batas hari ini ─────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ── Cari attendance terakhir hari ini ────────────────
    const attendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        clockIn: "desc",
      },
      include: {
        location: true,
      },
    });

    // ── Kalau belum absen ────────────────────────────────
    if (!attendance) {
      return NextResponse.json({
        checkedIn: false,
        message: "Belum melakukan absensi hari ini",
      });
    }

    // ── Sudah absen ──────────────────────────────────────
    return NextResponse.json({
      checkedIn: true,
      attendanceId: attendance.id,
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut ?? null,
      photoUrl: attendance.photoUrl,
      location: attendance.location
        ? {
            lat: attendance.location.latitude,
            lon: attendance.location.longitude,
          }
        : null,
    });
  } catch (error) {
    console.error("ERROR /attendance/me:", error);

    return NextResponse.json(
      {
        checkedIn: false,
        error: "Gagal mengambil status absensi",
      },
      { status: 500 }
    );
  }
}