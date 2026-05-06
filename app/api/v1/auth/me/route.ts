// app/api/v1/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Ambil token dari cookie
    const token = req.cookies.get("access_token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      const response = NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      return response;
    }

    // Cek expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const response = NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      return response;
    }

    // Get fresh user data from database
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
        isActive: true,
      },
    });

    if (!user || user.isActive === false) {
      const response = NextResponse.json(
        { success: false, error: "User not found or inactive" },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      return response;
    }

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
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}