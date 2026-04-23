import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const body = (await req.json()) as {
      lat?: number;
      lon?: number;
    };

    const { lat, lon } = body;

    // ── cek attendance hari ini ──
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

    // ── tentukan mode ──
    let qrType: "CLOCK_IN" | "CLOCK_OUT";

    if (!todayAttendance) {
      qrType = "CLOCK_IN";
    } else if (todayAttendance.clockIn && !todayAttendance.clockOut) {
      qrType = "CLOCK_OUT";
    } else {
      return NextResponse.json(
        {
          error: "Anda sudah absen masuk & pulang hari ini.",
          alreadyDone: true,
        },
        { status: 400 }
      );
    }

    const prefix = qrType === "CLOCK_IN" ? "ABSEN-IN-" : "ABSEN-OUT-";

    // ── reuse QR aktif jika masih ada ──
    const existingQR = await db.qRCode.findFirst({
      where: {
        userId: userAccess.userId,
        code: { startsWith: prefix },
        expiredAt: { gt: new Date() },
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingQR) {
      return NextResponse.json({
        success: true,
        sessionToken: existingQR.code,
        type: qrType,
        expiredAt: existingQR.expiredAt.toISOString(),
        message: "QR masih aktif (reuse session)",
      });
    }

    // ── buat QR baru ──
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
    const sessionToken = `${prefix}${dateStr}-${userAccess.userId}-${randomPart}`;
    const expiredAt = new Date(Date.now() + 60 * 1000);

    const qrCode = await db.qRCode.create({
      data: {
        userId: userAccess.userId,
        code: sessionToken,
        date: now,
        expiredAt,
        isUsed: false,
      },
    });

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
        qrType === "CLOCK_IN" ? "QR absen masuk dibuat" : "QR absen pulang dibuat",
    });
  } catch (error) {
    console.error("QR SESSION ERROR:", error);
    return NextResponse.json(
      { error: "Gagal membuat QR session", details: (error as Error).message },
      { status: 500 }
    );
  }
}