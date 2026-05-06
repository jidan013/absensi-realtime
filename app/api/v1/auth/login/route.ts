import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validation/auth";
import db from "@/lib/db";
import { generateToken } from "@/lib/auth";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validasi input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Cari user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    // Validasi password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    const token = generateToken({
      userId: user.id,
      roleId: user.id,
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
    });

    const response = NextResponse.json(
      {
        message: "Login berhasil",
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );

    // ✅ FIX: sameSite konsisten dengan lib/auth.ts
    // "none" + secure di production agar cookie ikut saat scan QR dari HP
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}