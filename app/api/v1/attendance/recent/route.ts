// app/api/v1/attendance/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    //  ONLY ADMIN CAN ACCESS
    if (userAccess.role !== "ADMIN") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unauthorized: Admin access required",
          message: "Anda tidak memiliki akses ke data ini"
        },
        { status: 403 }
      );
    }

    // Get query params for pagination (optional)
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Get date range (last 30 days by default)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate")!) 
      : thirtyDaysAgo;
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date();

    // Get total count for pagination
    const totalCount = await db.attendance.count({
      where: {
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get attendance records
    const attendances = await db.attendance.findMany({
      where: {
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
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
      skip,
      take: limit,
    });

    // Map data with status calculation
    const data = attendances.map((attendance) => {
      // Calculate status based on clock in time
      const clockInTime = attendance.clockIn;
      let status: "present" | "late" | "absent" | "on_time" = "present";
      
      if (clockInTime) {
        const hours = clockInTime.getHours();
        const minutes = clockInTime.getMinutes();
        
        // Office hours start at 8:00 AM (can be configured)
        const OFFICE_START_HOUR = 8;
        const OFFICE_START_MINUTE = 0;
        
        if (hours > OFFICE_START_HOUR || 
            (hours === OFFICE_START_HOUR && minutes > OFFICE_START_MINUTE)) {
          status = "late";
        } else if (hours < OFFICE_START_HOUR) {
          status = "on_time";
        } else {
          status = "present";
        }
      }

      // Determine method from QR code
      let method: "QR" | "FACE" | "MANUAL" = "MANUAL";
      if (attendance.qrCode) {
        if (attendance.qrCode.code.includes("FACE")) {
          method = "FACE";
        } else if (attendance.qrCode.code.includes("QR")) {
          method = "QR";
        }
      }

      // Get device info from location or default
      const device = attendance.location?.address || null;

      return {
        id: attendance.id,
        user: {
          id: attendance.user.id,
          name: attendance.user.name,
          email: attendance.user.email,
          position: attendance.user.position,
        },
        clockIn: attendance.clockIn?.toISOString() || null,
        clockOut: attendance.clockOut?.toISOString() || null,
        status,
        method,
        device,
        location: attendance.location ? {
          latitude: attendance.location.latitude,
          longitude: attendance.location.longitude,
          address: attendance.location.address,
        } : null,
        createdAt: attendance.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to fetch attendance records:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch attendance records",
        message: "Terjadi kesalahan saat mengambil data absensi"
      },
      { status: 500 }
    );
  }
}