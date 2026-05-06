import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const body = await req.json();

    const { qrCode, lat, lon, timestamp } = body;

    if (!qrCode || typeof qrCode !== "string") {
      return NextResponse.json(
        { error: "QR Code wajib diisi" },
        { status: 400 }
      );
    }

    // ── Cari QR ────────────────────────────────────────
    const qr = await db.qRCode.findUnique({
      where: { code: qrCode },
      include: { user: { select: { name: true } } },
    });

    if (!qr) {
      return NextResponse.json(
        { error: "QR Code tidak ditemukan" },
        { status: 404 }
      );
    }

    // ── Validasi pemilik QR ────────────────────────────
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        { error: "QR Code bukan milik Anda" },
        { status: 403 }
      );
    }

    // ── Expired ───────────────────────────────────────
    if (new Date() > qr.expiredAt) {
      return NextResponse.json(
        { error: "QR Code sudah kadaluarsa" },
        { status: 400 }
      );
    }

    // ── Cek sudah absen hari ini ──────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    // ✅ SUDAH ABSEN → kirim data lama (anti error UI)
    if (existing && existing.clockIn) {
  return NextResponse.json(
    {
      success: false,
      error: "Anda sudah absen hari ini",
      attendanceId: existing.id,
      clockIn: existing.clockIn.toISOString(),
    },
    { status: 400 }
  );
}

    // ── Simpan lokasi (optional) ──────────────────────
    let locationId: string | null = null;
    if (lat != null && lon != null) {
      const loc = await db.location.create({
        data: { latitude: lat, longitude: lon },
      });
      locationId = loc.id;
    }

    // ── Create attendance ─────────────────────────────
    const clockInTime = timestamp ? new Date(timestamp) : new Date();

    const attendance = await db.attendance.create({
      data: {
        userId: userAccess.userId,
        qrId: qr.id,
        clockIn: clockInTime,
        locationId,
      },
    });

    // ⚠️ optional: kalau QR mau reusable, HAPUS ini
    await db.qRCode.update({
      where: { id: qr.id },
      data: { isUsed: true },
    });

    return NextResponse.json({
      success: true,
      attendanceId: attendance.id,
      name: qr.user.name,
      clockIn: clockInTime.toISOString(),
      message: "Absensi berhasil",
    });

  } catch (error) {
    console.error("ERROR /attendance/scan:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan absensi" },
      { status: 500 }
    );
  }
}