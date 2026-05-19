import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validation/auth";
import db from "@/lib/db";
import { generateToken } from "@/lib/auth";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validasi input dengan schema yang sudah termasuk rememberMe
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          message: "Validation error", 
          errors: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validation.data;

    // Cari user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" }, 
        { status: 401 }
      );
    }

    // Validasi password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" }, 
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      roleId: user.id,
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
    });

    // Max age berdasarkan remember me (30 hari jika centang, 7 hari jika tidak)
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;

    // Buat response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login berhasil",
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          position: user.position,
        },
      },
      { status: 200 }
    );

    // Set cookie access_token
    response.cookies.set({
      name: "access_token",
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: maxAge,
    });

    // Set cookie session untuk fallback (non-httpOnly)
    response.cookies.set({
      name: "absensi_session",
      value: JSON.stringify({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }),
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: maxAge,
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    console.log(`✅ Login successful: ${user.email} (${user.role}), rememberMe: ${rememberMe}`);

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" }, 
      { status: 500 }
    );
  }
}