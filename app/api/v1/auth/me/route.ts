import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("access_token")?.value;

    // Debug log (hapus di production)
    if (process.env.NODE_ENV === "development") {
      console.log("[/me] access_token:", token ? "EXISTS" : "NOT FOUND");
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    // Verify token (sudah handle expired)
    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.json(
        { success: false, error: "Invalid or expired token", code: "INVALID_TOKEN" },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      return response;
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: "User not found", code: "USER_NOT_FOUND" },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      return response;
    }

    // ✅ Tambahkan data attendance status untuk timer
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await db.attendance.findFirst({
      where: {
        userId: user.id,
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
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        createdAt: user.createdAt,
        lastLogin: user.updatedAt,
        // ✅ Timer info - tetap ada meskipun user logout!
        attendance: {
          isClockedIn: todayAttendance !== null && todayAttendance.clockOut === null,
          clockInTime: todayAttendance?.clockIn || null,
          clockOutTime: todayAttendance?.clockOut || null,
          attendanceId: todayAttendance?.id || null,
        },
      },
    });
  } catch (error) {
    console.error("[/me] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}