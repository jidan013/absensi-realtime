import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

    // ✅ update minimal dulu (anti crash)
    const updated = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        clockOut: new Date(checkOutTime || Date.now()),
      },
    });

    return NextResponse.json({ success: true, data: updated });

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