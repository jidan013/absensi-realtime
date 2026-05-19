import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email required" },
        { status: 400 }
      );
    }
    
    // Cari user berdasarkan email
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    // Cari absensi hari ini yang belum clock out
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.attendance.findFirst({
      where: {
        userId: user.id,
        clockIn: { gte: today },
        clockOut: null,
      },
      select: {
        id: true,
        clockIn: true,
      },
      orderBy: { clockIn: "desc" },
    });
    
    return NextResponse.json({
      success: true,
      isClockedIn: attendance !== null && attendance.clockIn !== null,
      data: attendance ? {
        attendanceId: attendance.id,
        name: user.name,
        clockInTime: attendance.clockIn?.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error("Status by email error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}