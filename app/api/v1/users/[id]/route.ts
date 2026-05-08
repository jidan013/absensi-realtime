// app/api/v1/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
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
    // ✅ Authentication check
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const { id } = await context.params;

    // ✅ Authorization: Admin bisa lihat semua, user biasa hanya bisa lihat sendiri
    if (userAccess.role !== "ADMIN" && userAccess.userId !== id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You can only view your own data" },
        { status: 403 },
      );
    }

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
    // ✅ Authentication check
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const { id } = await context.params;
    const body: UpdateUserInput = await req.json();

    // ✅ Authorization: Admin bisa edit semua, user biasa hanya bisa edit sendiri
    const isAdmin = userAccess.role === "ADMIN";
    const isSelf = userAccess.userId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You can only edit your own data" },
        { status: 403 },
      );
    }

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

    // ✅ Non-admin tidak bisa mengubah role
    if (body.name) updateData.name = body.name;
    if (body.position) updateData.position = body.position;
    
    // ✅ Hanya admin yang bisa mengubah role
    if (body.role && isAdmin && VALID_ROLES.includes(body.role)) {
      updateData.role = body.role;
    } else if (body.role && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Only admin can change role" },
        { status: 403 },
      );
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

    console.log(`✅ User updated: ${existingUser.email} by ${userAccess.email}`);

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
    // ✅ Authentication check
    const userAccess = await requireAuth();
    if (userAccess instanceof NextResponse) return userAccess;

    const { id } = await context.params;

    // ✅ Only admin can delete users
    if (userAccess.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin only" },
        { status: 403 },
      );
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    // ✅ Prevent admin from deleting themselves
    if (user.id === userAccess.userId) {
      return NextResponse.json(
        { success: false, message: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    // ✅ Check if user has attendance records (optional: soft delete instead)
    const attendanceCount = await db.attendance.count({
      where: { userId: id },
    });

    if (attendanceCount > 0) {
      // Option 1: Prevent deletion
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot delete user because they have ${attendanceCount} attendance record(s). Delete the attendance records first.` 
        },
        { status: 400 },
      );
      
      // Option 2: Soft delete (add isActive field to schema)
      // await db.user.update({
      //   where: { id },
      //   data: { isActive: false },
      // });
    }

    await db.user.delete({ where: { id } });

    console.log(`✅ User deleted: ${user.email} (${user.name}) by ${userAccess.email}`);

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus",
      data: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    
    // Handle Prisma foreign key constraint error
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2003") {
      return NextResponse.json(
        { 
          success: false, 
          message: "Cannot delete user because they have related records (attendance, QR codes, etc.)" 
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menghapus user" },
      { status: 500 },
    );
  }
}