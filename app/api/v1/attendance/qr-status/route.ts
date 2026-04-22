import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// Laptop polling endpoint: cek apakah user sudah absen hari ini
// GET /api/v1/attendance/qr-status?token=ABSEN-xxx
export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { scanned: false, error: "Token tidak ditemukan." },
        { status: 400 }
      );
    }

    // Cari QR berdasarkan token/code
    const qr = await db.qRCode.findUnique({
      where: { code: token },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!qr) {
      return NextResponse.json(
        { scanned: false, error: "QR tidak ditemukan." },
        { status: 404 }
      );
    }

    // Pastikan QR milik user yang sedang login
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        { scanned: false, error: "QR bukan milik Anda." },
        { status: 403 }
      );
    }

    // Jika QR belum dipakai, berarti belum di-scan
    if (!qr.isUsed) {
      return NextResponse.json({ scanned: false });
    }

    // QR sudah dipakai — cari attendance record hari ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        qrId: qr.id,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
      select: {
        id: true,
        clockIn: true,
      },
    });

    if (!attendance) {
      return NextResponse.json({ scanned: false });
    }

    // ✅ Berhasil — return data yang dibutuhkan AbsensiClient
    return NextResponse.json({
      scanned: true,
      attendanceId: attendance.id,       // ← dipakai untuk session
      name: qr.user.name,                // ← dipakai untuk display nama
      clockIn: attendance.clockIn?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("QR STATUS ERROR:", error);
    return NextResponse.json(
      { scanned: false, error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}