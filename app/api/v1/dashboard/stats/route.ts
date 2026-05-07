import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total users
    const totalUsers = await db.user.count();

    // Get today's attendance
    const todayAttendance = await db.attendance.count({
      where: {
        clockIn: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get active users now (clocked in but not clocked out)
    const activeNow = await db.attendance.count({
      where: {
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    });

    // Get total attendance all time
    const totalAttendance = await db.attendance.count();

    // Calculate average attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const totalDays = 30;
    const attendanceLast30Days = await db.attendance.count({
      where: {
        clockIn: { gte: thirtyDaysAgo },
      },
    });
    
    // Get total work days in last 30 days (weekdays)
    let workDays = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
        workDays++;
      }
    }
    
    const averageAttendance = totalUsers > 0 && workDays > 0 
      ? (attendanceLast30Days / (totalUsers * workDays)) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        todayAttendance,
        activeNow,
        totalAttendance,
        averageAttendance: Math.round(averageAttendance * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}