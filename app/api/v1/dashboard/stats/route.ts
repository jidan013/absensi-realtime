// app/api/v1/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    //  Add authentication check
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const isAdmin = userAccess.role === "ADMIN";

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // For admin: get all users stats
    // For employee: only get their own stats
    const userWhereClause = isAdmin ? {} : { id: userAccess.userId };
    const attendanceWhereClause = isAdmin 
      ? {}
      : { userId: userAccess.userId };

    // Get total users (admin sees all, employee sees 1)
    const totalUsers = await db.user.count({
      where: userWhereClause,
    });

    // Get today's attendance
    const todayAttendance = await db.attendance.count({
      where: {
        ...attendanceWhereClause,
        clockIn: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get active users now (clocked in but not clocked out)
    const activeNow = await db.attendance.count({
      where: {
        ...attendanceWhereClause,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    });

    // Get total attendance all time
    const totalAttendance = await db.attendance.count({
      where: attendanceWhereClause,
    });

    // Calculate average attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceLast30Days = await db.attendance.count({
      where: {
        ...attendanceWhereClause,
        clockIn: { gte: thirtyDaysAgo },
      },
    });
    
    // Get total work days in last 30 days (weekdays)
    let workDays = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }
    }
    
    const averageAttendance = totalUsers > 0 && workDays > 0 
      ? (attendanceLast30Days / (totalUsers * workDays)) * 100 
      : 0;

    // Response data berdasarkan role
    const responseData = isAdmin ? {
      totalUsers,
      todayAttendance,
      activeNow,
      totalAttendance,
      averageAttendance: Math.round(averageAttendance * 10) / 10,
    } : {
      // Untuk employee: hanya menampilkan data mereka sendiri
      totalUsers: 1,
      todayAttendance: todayAttendance > 0 ? 1 : 0,
      activeNow: activeNow > 0 ? 1 : 0,
      totalAttendance,
      averageAttendance: Math.round(averageAttendance * 10) / 10,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      userRole: userAccess.role,
      isAdmin,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}