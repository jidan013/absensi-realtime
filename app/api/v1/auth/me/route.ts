// app/api/v1/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("access_token")?.value;

    // ✅ Debug log — hapus setelah fix
    console.log("[/me] All cookies:", req.cookies.getAll());
    console.log("[/me] access_token:", token ? "EXISTS" : "NOT FOUND");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // ✅ verifyToken sudah handle expired — tidak perlu cek payload.exp manual
    const payload = verifyToken(token);

    console.log("[/me] Token payload:", payload);

    if (!payload) {
      const response = NextResponse.json(
        { success: false, error: "Invalid or expired token" },
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

    console.log("[/me] User from DB:", user ? user.email : "NOT FOUND");

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: "User not found" },
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
    console.error("[/me] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}