// app/api/v1/attendance/timer-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      );
    }
    
    // Cari absensi hari ini yang belum clock out
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.attendance.findFirst({
      where: {
        userId: userId,
        clockIn: { gte: today },
        clockOut: null,
      },
      select: {
        id: true,
        clockIn: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: { clockIn: "desc" },
    });
    
    if (!attendance || !attendance.clockIn) {
      return NextResponse.json({
        success: true,
        isClockedIn: false,
        data: null,
      });
    }
    
    return NextResponse.json({
      success: true,
      isClockedIn: true,
      data: {
        attendanceId: attendance.id,
        name: attendance.user.name,
        clockInTime: attendance.clockIn.toISOString(),
      },
    });
  } catch (error) {
    console.error("Timer status error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}