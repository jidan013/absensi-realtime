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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await db.attendance.findFirst({
      where: {
        userId: userId,
        clockIn: { gte: today },
      },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isClockedIn: attendance !== null && attendance.clockOut === null,
        clockInTime: attendance?.clockIn || null,
        clockOutTime: attendance?.clockOut || null,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}