import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// Tipe QR dibaca dari prefix code:
// ABSEN-IN-...  = clock in
// ABSEN-OUT-... = clock out

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, message: "QR Code tidak ditemukan dalam URL." },
        { status: 400 }
      );
    }

    // 1. Cari QR
    const qr = await db.qRCode.findUnique({
      where: { code },
      include: {
        user: { select: { name: true, email: true, position: true } },
      },
    });

    if (!qr) {
      return NextResponse.json(
        { success: false, message: "QR Code tidak valid atau tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. QR harus milik user yang scan
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "QR Code bukan milik Anda. Gunakan QR milik Anda sendiri.",
        },
        { status: 403 }
      );
    }

    // 3. Cek expired
    if (new Date() > qr.expiredAt) {
      return NextResponse.json(
        {
          success: false,
          message: "QR Code sudah kadaluarsa (lebih dari 60 detik). Minta QR baru.",
        },
        { status: 400 }
      );
    }

    // 4. Cek sudah dipakai
    if (qr.isUsed) {
      return NextResponse.json(
        { success: false, message: "QR Code sudah pernah digunakan." },
        { status: 400 }
      );
    }

    // 5. Baca tipe dari prefix code
    const qrType: "CLOCK_IN" | "CLOCK_OUT" = qr.code.startsWith("ABSEN-OUT-")
      ? "CLOCK_OUT"
      : "CLOCK_IN";

    // 6. Ambil data absensi hari ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
      include: {
        location: {
          select: { latitude: true, longitude: true, address: true },
        },
      },
    });

    const now = new Date();

    // ── CLOCK IN ──────────────────────────────────────────────────
    if (qrType === "CLOCK_IN") {
      if (todayAttendance) {
        return NextResponse.json(
          { success: false, message: "Anda sudah absen masuk hari ini." },
          { status: 400 }
        );
      }

      const attendance = await db.attendance.create({
        data: {
          userId: userAccess.userId,
          qrId: qr.id,
          clockIn: now,
          locationId: null,
        },
        include: {
          location: {
            select: { latitude: true, longitude: true, address: true },
          },
        },
      });

      await db.qRCode.update({
        where: { id: qr.id },
        data: { isUsed: true },
      });

      return NextResponse.json({
        success: true,
        type: "CLOCK_IN",
        message: "Absen masuk berhasil dicatat.",
        data: {
          user: {
            name: qr.user.name,
            email: qr.user.email,
            position: qr.user.position,
          },
          attendance: {
            id: attendance.id,
            clockIn: now.toISOString(),
            clockOut: null,
            location: attendance.location ?? null,
          },
        },
      });
    }

    // ── CLOCK OUT ─────────────────────────────────────────────────
    if (!todayAttendance) {
      return NextResponse.json(
        { success: false, message: "Anda belum absen masuk hari ini." },
        { status: 400 }
      );
    }

    if (todayAttendance.clockOut) {
      return NextResponse.json(
        { success: false, message: "Anda sudah absen pulang hari ini." },
        { status: 400 }
      );
    }

    const updated = await db.attendance.update({
      where: { id: todayAttendance.id },
      data: { clockOut: now },
      include: {
        location: {
          select: { latitude: true, longitude: true, address: true },
        },
      },
    });

    await db.qRCode.update({
      where: { id: qr.id },
      data: { isUsed: true },
    });

    // Hitung durasi kerja
    const clockInTime = todayAttendance.clockIn ?? now;
    const durasiMs = now.getTime() - clockInTime.getTime();
    const durasiJam = Math.floor(durasiMs / (1000 * 60 * 60));
    const durasiMenit = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      success: true,
      type: "CLOCK_OUT",
      message: "Absen pulang berhasil dicatat.",
      durasi: `${durasiJam} jam ${durasiMenit} menit`,
      data: {
        user: {
          name: qr.user.name,
          email: qr.user.email,
          position: qr.user.position,
        },
        attendance: {
          id: updated.id,
          clockIn: todayAttendance.clockIn?.toISOString() ?? null,
          clockOut: now.toISOString(),
          location: updated.location ?? null,
        },
      },
    });
  } catch (error) {
    console.error("Error /api/v1/attendance/verify-qr:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server. Coba lagi.",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}