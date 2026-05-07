// app/api/v1/attendance/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    // Get recent attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendances = await db.attendance.findMany({
      where: {
        clockIn: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            position: true,
          },
        },
        qrCode: true,
        location: true,
      },
      orderBy: {
        clockIn: "desc",
      },
      take: 50, // Limit to 50 records for performance
    });

    // Map data with status calculation
    const data = attendances.map((attendance) => {
      // Calculate status based on clock in time
      const clockInTime = attendance.clockIn;
      let status: "present" | "late" | "absent" | "on_time" = "present";
      
      if (clockInTime) {
        const hours = clockInTime.getHours();
        const minutes = clockInTime.getMinutes();
        
        // Assume office hours start at 8:00 AM
        if (hours > 8 || (hours === 8 && minutes > 0)) {
          status = "late";
        } else if (hours < 8) {
          status = "on_time";
        } else {
          status = "present";
        }
      }

      // Determine method from QR code or default
      let method: "QR" | "FACE" | "MANUAL" = "MANUAL";
      if (attendance.qrCode) {
        method = attendance.qrCode.code.includes("FACE") ? "FACE" : "QR";
      }

      return {
        id: attendance.id,
        user: {
          name: attendance.user.name,
          email: attendance.user.email,
          position: attendance.user.position,
        },
        clockIn: attendance.clockIn?.toISOString() || new Date().toISOString(),
        clockOut: attendance.clockOut?.toISOString() || null,
        status,
        method,
        createdAt: attendance.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to fetch attendance records:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}