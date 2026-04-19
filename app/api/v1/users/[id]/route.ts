import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

type Role = "ADMIN" | "EMPLOYEE";

// Type untuk body PATCH (semua optional)
interface UpdateUserInput {
  name?: string;
  position?: string;
  role?: Role;
  password?: string;
}

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  createdAt: Date;
  updatedAt: Date;
};

const VALID_ROLES: Role[] = ["ADMIN", "EMPLOYEE"];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const user: SafeUser | null = await db.user.findUnique({
      where: { id },
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
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data user" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body: UpdateUserInput = await req.json();

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const updateData: {
      name?: string;
      position?: string;
      role?: Role;
      password?: string;
    } = {};

    if (body.name) updateData.name = body.name;
    if (body.position) updateData.position = body.position;
    if (body.role && VALID_ROLES.includes(body.role)) {
      updateData.role = body.role;
    }
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diubah" },
        { status: 400 },
      );
    }

    const updatedUser: SafeUser = await db.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      message: "User berhasil diupdate",
      data: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengupdate user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus user" },
      { status: 500 },
    );
  }
}