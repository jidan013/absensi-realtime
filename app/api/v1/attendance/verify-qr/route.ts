import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// ── Helper: ambil batas hari ini dalam WIB (UTC+7) ───────────────
function getTodayRangeWIB() {
  const now = new Date();

  // Offset WIB = UTC+7
  const WIB_OFFSET = 7 * 60; // menit
  const localOffset = now.getTimezoneOffset(); // menit (negatif untuk UTC+)
  const diffMs = (WIB_OFFSET + localOffset) * 60 * 1000;

  const wibNow = new Date(now.getTime() + diffMs);

  const todayStart = new Date(wibNow);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartUTC = new Date(todayStart.getTime() - diffMs);

  const todayEnd = new Date(wibNow);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndUTC = new Date(todayEnd.getTime() - diffMs);

  return { todayStartUTC, todayEndUTC, nowWIB: wibNow, nowUTC: now };
}

export async function GET(req: NextRequest) {
  try {
    // ================= AUTH =================
    let userAccess;
    try {
      userAccess = await requireAuth();
    } catch {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
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
        { success: false, message: "QR bukan milik Anda." },
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

    // ================= TANGGAL WIB =================
    const { todayStartUTC, todayEndUTC, nowUTC } = getTodayRangeWIB();

    // ================= CEK ABSENSI =================
    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: userAccess.userId,
        clockIn: { gte: todayStartUTC, lte: todayEndUTC },
      },
      include: {
        location: {
          select: { latitude: true, longitude: true, address: true },
        },
      },
    });

    const now = nowUTC; // gunakan UTC yang sudah sinkron ke WIB

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
      { success: false, message: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}