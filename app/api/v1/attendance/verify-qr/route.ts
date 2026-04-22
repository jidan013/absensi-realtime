import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // ================= AUTH =================
    let userAccess;
    try {
      userAccess = await requireAuth();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    // ================= PARAM =================
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, message: "QR Code tidak ditemukan." },
        { status: 400 }
      );
    }

    // ================= GET QR =================
    const qr = await db.qRCode.findUnique({
      where: { code },
      include: {
        user: { select: { name: true, email: true, position: true } },
      },
    });

    if (!qr) {
      return NextResponse.json(
        { success: false, message: "QR Code tidak valid." },
        { status: 404 }
      );
    }

    // ================= VALIDASI USER =================
    if (qr.userId !== userAccess.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "QR bukan milik Anda.",
        },
        { status: 403 }
      );
    }

    // ================= VALIDASI QR =================
    if (new Date() > qr.expiredAt) {
      return NextResponse.json(
        { success: false, message: "QR sudah kadaluarsa." },
        { status: 400 }
      );
    }

    if (qr.isUsed) {
      return NextResponse.json(
        { success: false, message: "QR sudah digunakan." },
        { status: 400 }
      );
    }

    // ================= TIPE QR =================
    const qrType: "CLOCK_IN" | "CLOCK_OUT" = qr.code.startsWith("ABSEN-OUT-")
      ? "CLOCK_OUT"
      : "CLOCK_IN";

    // ================= TANGGAL =================
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ================= CEK ABSENSI =================
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

    // ================= CLOCK IN =================
    if (qrType === "CLOCK_IN") {
      if (todayAttendance) {
        return NextResponse.json(
          { success: false, message: "Sudah absen masuk hari ini." },
          { status: 400 }
        );
      }

      const attendance = await db.attendance.create({
        data: {
          userId: userAccess.userId,
          qrId: qr.id,
          clockIn: now,
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
        message: "Absen masuk berhasil",
        data: {
          user: qr.user,
          attendance: {
            id: attendance.id,
            clockIn: now.toISOString(),
            clockOut: null,
            location: attendance.location ?? null,
          },
        },
      });
    }

    // ================= CLOCK OUT =================
    if (!todayAttendance) {
      return NextResponse.json(
        { success: false, message: "Belum absen masuk." },
        { status: 400 }
      );
    }

    if (todayAttendance.clockOut) {
      return NextResponse.json(
        { success: false, message: "Sudah absen pulang." },
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

    // ================= DURASI =================
    const clockInTime = todayAttendance.clockIn ?? now;
    const durasiMs = now.getTime() - clockInTime.getTime();

    const jam = Math.floor(durasiMs / (1000 * 60 * 60));
    const menit = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      success: true,
      type: "CLOCK_OUT",
      message: "Absen pulang berhasil",
      durasi: `${jam} jam ${menit} menit`,
      data: {
        user: qr.user,
        attendance: {
          id: updated.id,
          clockIn: todayAttendance.clockIn?.toISOString() ?? null,
          clockOut: now.toISOString(),
          location: updated.location ?? null,
        },
      },
    });
  } catch (error) {
    console.error("VERIFY QR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}