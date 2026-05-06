// app/api/v1/attendance/clockout/route.ts
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "absensi_session";

export async function POST(req: NextRequest) {
  try {
    // ✅ Auth - wajib login
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const body = await req.json();
    console.log("📤 Clockout request:", { body, userId: userAccess.userId });

    const { attendanceId, checkOutTime, lat, lon } = body;

    // Validasi attendanceId
    if (!attendanceId || attendanceId.startsWith("local-")) {
      return NextResponse.json(
        { success: false, error: "ID absensi tidak valid" },
        { status: 400 }
      );
    }

    // ── Cek attendance di DB ──────────────────────────
    const existing = await db.attendance.findUnique({
      where: { id: attendanceId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Data absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    // ✅ Validasi kepemilikan
    if (existing.userId !== userAccess.userId) {
      return NextResponse.json(
        { success: false, error: "Data absensi bukan milik Anda" },
        { status: 403 }
      );
    }

    // ✅ Cek apakah sudah clock out
    if (existing.clockOut) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Anda sudah absen pulang sebelumnya",
          clockOut: existing.clockOut.toISOString()
        },
        { status: 400 }
      );
    }

    // ✅ Cek apakah sudah clock in
    if (!existing.clockIn) {
      return NextResponse.json(
        { success: false, error: "Belum ada absen masuk" },
        { status: 400 }
      );
    }

    // ── Simpan lokasi clock out (optional) ────────────
    let locationId = existing.locationId;
    if (lat != null && lon != null) {
      try {
        const location = await db.location.create({
          data: {
            latitude: parseFloat(String(lat)),
            longitude: parseFloat(String(lon)),
            address: null,
          },
        });
        locationId = location.id;
      } catch (locError) {
        console.warn("Failed to save location:", locError);
      }
    }

    // ── Update clockOut ───────────────────────────────
    const clockOutTime = checkOutTime ? new Date(Number(checkOutTime)) : new Date();
    
    // Validasi clockOutTime
    if (isNaN(clockOutTime.getTime())) {
      return NextResponse.json(
        { success: false, error: "Timestamp tidak valid" },
        { status: 400 }
      );
    }

    // Pastikan clockOut tidak lebih kecil dari clockIn
    const clockInTime = existing.clockIn;
    if (clockOutTime < clockInTime) {
      return NextResponse.json(
        { success: false, error: "Waktu pulang tidak boleh kurang dari waktu masuk" },
        { status: 400 }
      );
    }

    const updated = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        clockOut: clockOutTime,
        locationId: locationId,
      },
    });

    // ── Hitung durasi ─────────────────────────────────
    const durationMs = clockOutTime.getTime() - clockInTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    let durationText = "";
    if (hours > 0) durationText = `${hours} jam ${minutes} menit`;
    else if (minutes > 0) durationText = `${minutes} menit ${seconds} detik`;
    else durationText = `${seconds} detik`;

    // ✅ Hapus cookie session → semua device logout dari sesi absen
    const res = NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        clockIn: clockInTime.toISOString(),
        clockOut: clockOutTime.toISOString(),
        duration: durationMs,
        durationText: durationText,
        hours: hours,
        minutes: minutes,
        userName: existing.user.name,
      },
      message: "Absen pulang berhasil",
    });

    res.cookies.delete(SESSION_COOKIE);

    console.log("✅ Clockout success:", { attendanceId, durationText });
    return res;

  } catch (error) {
    console.error("❌ ERROR CLOCKOUT:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal melakukan absen pulang",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: GET untuk cek status clockout
export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get("attendanceId");

    if (!attendanceId) {
      return NextResponse.json(
        { success: false, error: "Attendance ID required" },
        { status: 400 }
      );
    }

    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        userId: true,
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, error: "Attendance not found" },
        { status: 404 }
      );
    }

    if (attendance.userId !== userAccess.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      isClockedOut: attendance.clockOut !== null,
      clockOut: attendance.clockOut?.toISOString() || null,
      clockIn: attendance.clockIn?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error checking clockout status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check status" },
      { status: 500 }
    );
  }
}