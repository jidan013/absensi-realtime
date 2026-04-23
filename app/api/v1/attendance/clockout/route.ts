import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "absensi_session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("BODY:", body);

    const { attendanceId, checkOutTime } = body;

    if (!attendanceId || attendanceId.startsWith("local-")) {
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
      );
    }

    // ✅ cek dulu di DB
    const existing = await db.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data tidak ditemukan di DB" },
        { status: 404 }
      );
    }

    // ✅ update clockOut
    const updated = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        clockOut: new Date(checkOutTime || Date.now()),
      },
    });

    // ✅ Hapus cookie session → semua device kembali ke form absen
    const res = NextResponse.json({ success: true, data: updated });
    res.cookies.delete(SESSION_COOKIE);

    return res;
  } catch (error) {
    console.error("ERROR CLOCKOUT:", error);
    return NextResponse.json(
      {
        error: "Gagal clockout",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}