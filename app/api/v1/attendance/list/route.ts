import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    //  Hanya admin yang bisa melihat semua data absensi
    if (userAccess.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang dapat melihat laporan ini." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const search = searchParams.get("search") || "";

    //  Filter tanggal
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateFilter.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }

    //  Build where clause dengan tipe yang aman
    const whereClause: Prisma.AttendanceWhereInput = {};
    
    if (Object.keys(dateFilter).length > 0) {
      whereClause.clockIn = dateFilter;
    }

    //  Tambahkan filter pencarian (opsional)
    if (search) {
      whereClause.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    //  Get attendance records
    const attendances = await db.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
        location: {
          select: {
            latitude: true,
            longitude: true,
            address: true,
          },
        },
        qrCode: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
    });

    //  Format response dengan type yang aman
    const result = attendances.map((att) => ({
      id: att.id,
      name: att.user?.name ?? "Unknown",
      email: att.user?.email ?? null,
      position: att.user?.position ?? null,
      method: att.qrId ? "qr" : "selfie",
      clockIn: att.clockIn?.toISOString() ?? null,
      clockOut: att.clockOut?.toISOString() ?? null,
      photoUrl: att.photoUrl ?? null,
      photoUrlOut: att.photoUrlOut ?? null,
      location: att.location
        ? {
            latitude: att.location.latitude,
            longitude: att.location.longitude,
            address: att.location.address ?? null,
          }
        : null,
      qrCode: att.qrCode?.code ?? null,
      createdAt: att.createdAt.toISOString(),
    }));

    //  Tambahkan metadata response
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        total: result.length,
        startDate: startDate || null,
        endDate: endDate || null,
        filters: {
          hasDateFilter: Object.keys(dateFilter).length > 0,
          hasSearch: !!search,
        },
      },
    });
  } catch (error) {
    console.error("Error /api/v1/attendance/list:", error);
    
    // Better error response
    return NextResponse.json(
      { 
        success: false,
        error: "Gagal mengambil data absensi",
        message: process.env.NODE_ENV === "development" 
          ? (error as Error).message 
          : "Terjadi kesalahan pada server",
      },
      { status: 500 }
    );
  }
}