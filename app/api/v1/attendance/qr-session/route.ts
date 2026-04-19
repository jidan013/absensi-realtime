import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// Tanpa field 'type' di schema — tipe dibaca dari prefix code:
// ABSEN-IN-...  = clock in
// ABSEN-OUT-... = clock out

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const body = (await req.json()) as {
      lat?: number;
      lon?: number;
      accuracy?: number;
      timestamp?: number;
    };

    const { lat, lon } = body;

    // ── Cek kondisi absensi hari ini ──────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    // Tentukan tipe dari prefix code
    let qrType: "CLOCK_IN" | "CLOCK_OUT";

    if (!todayAttendance) {
      qrType = "CLOCK_IN";
    } else if (todayAttendance.clockIn && !todayAttendance.clockOut) {
      qrType = "CLOCK_OUT";
    } else {
      return NextResponse.json(
        {
          error: "Anda sudah melakukan absen masuk dan pulang hari ini.",
          alreadyDone: true,
        },
        { status: 400 }
      );
    }

    // ── Expired-kan QR lama yang belum dipakai ────────────────────
    const prefix = qrType === "CLOCK_IN" ? "ABSEN-IN-" : "ABSEN-OUT-";

    const oldQRs = await db.qRCode.findMany({
      where: {
        userId: userAccess.userId,
        isUsed: false,
        date: { gte: todayStart, lte: todayEnd },
        code: { startsWith: prefix },
      },
    });

    if (oldQRs.length > 0) {
      await db.qRCode.updateMany({
        where: {
          id: { in: oldQRs.map((q) => q.id) },
        },
        data: { expiredAt: new Date() },
      });
    }

    // ── Buat QR baru ──────────────────────────────────────────────
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
    const sessionToken = `${prefix}${dateStr}-${userAccess.userId}-${randomPart}`;

    const expiredAt = new Date();
    expiredAt.setSeconds(expiredAt.getSeconds() + 60);

    const qrCode = await db.qRCode.create({
      data: {
        userId: userAccess.userId,
        code: sessionToken,
        date: now,
        expiredAt,
        isUsed: false,
      },
    });

    // Simpan lokasi sesi kalau ada
    if (lat != null && lon != null) {
      await db.location.create({
        data: { latitude: lat, longitude: lon, address: null },
      });
    }

    return NextResponse.json({
      success: true,
      sessionToken: qrCode.code,
      type: qrType,
      expiredAt: qrCode.expiredAt.toISOString(),
      message:
        qrType === "CLOCK_IN"
          ? "QR absen masuk berhasil dibuat"
          : "QR absen pulang berhasil dibuat",
    });
  } catch (error) {
    console.error("Error /api/v1/attendance/qr-session:", error);
    return NextResponse.json(
      { error: "Gagal membuat sesi QR", details: (error as Error).message },
      { status: 500 }
    );
  }
}