import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Role = "ADMIN" | "EMPLOYEE";

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const users: SafeUser[] = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data user" },
      { status: 500 },
    );
  }
}