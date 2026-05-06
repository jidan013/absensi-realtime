// app/api/v1/attendance/clockout/route.ts
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Ambil token dari cookie
    const token = req.cookies.get("access_token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { attendanceId, checkOutTime, lat, lon } = body;

    // Validasi attendanceId
    if (!attendanceId || attendanceId.startsWith("local-")) {
      return NextResponse.json(
        { success: false, error: "ID absensi tidak valid" },
        { status: 400 }
      );
    }

    // Cek attendance di DB
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

    // Validasi kepemilikan
    if (existing.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "Data absensi bukan milik Anda" },
        { status: 403 }
      );
    }

    // Cek sudah clock out
    if (existing.clockOut) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Anda sudah absen pulang sebelumnya",
          alreadyClockedOut: true
        },
        { status: 400 }
      );
    }

    // Cek sudah clock in
    if (!existing.clockIn) {
      return NextResponse.json(
        { success: false, error: "Belum ada absen masuk" },
        { status: 400 }
      );
    }

    // Simpan lokasi
    let locationId = existing.locationId;
    if (lat != null && lon != null) {
      try {
        const location = await db.location.create({
          data: {
            latitude: parseFloat(String(lat)),
            longitude: parseFloat(String(lon)),
          },
        });
        locationId = location.id;
      } catch (locError) {
        console.warn("Failed to save location:", locError);
      }
    }

    const clockOutTime = checkOutTime ? new Date(Number(checkOutTime)) : new Date();
    const clockInTime = existing.clockIn;
    
    // Validasi waktu
    if (clockOutTime < clockInTime) {
      return NextResponse.json(
        { success: false, error: "Waktu pulang tidak boleh kurang dari waktu masuk" },
        { status: 400 }
      );
    }

    // Update attendance
    const updated = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        clockOut: clockOutTime,
        locationId: locationId,
      },
    });

    // Hitung durasi
    const durationMs = clockOutTime.getTime() - clockInTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    let durationText = "";
    if (hours > 0) durationText = `${hours} jam ${minutes} menit`;
    else if (minutes > 0) durationText = `${minutes} menit`;
    else durationText = "kurang dari 1 menit";

    // Response sukses
    const res = NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        clockIn: clockInTime.toISOString(),
        clockOut: clockOutTime.toISOString(),
        duration: durationMs,
        durationText: durationText,
        userName: existing.user.name,
      },
      message: "Absen pulang berhasil",
    });

    // Hapus cookie session
    res.cookies.delete("absensi_session");
    res.headers.set('X-Session-Ended', 'true');

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