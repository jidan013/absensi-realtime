import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import { Prisma } from "@prisma/client"; 

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    if (userAccess.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

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

    // 1. Menggunakan tipe data bawaan Prisma (Full Type-Safe)
    const whereClause: Prisma.AttendanceWhereInput = {};
    
    if (startDate || endDate) {
      whereClause.clockIn = dateFilter;
    }

    // 2. Karena whereClause sudah strongly-typed, TypeScript tidak akan kebingungan
    const attendances = await db.attendance.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, position: true } },
        location: { select: { latitude: true, longitude: true, address: true } },
        qrCode: { select: { code: true } },
      },
      orderBy: { clockIn: "desc" },
    });

    // 3. Tipe data 'att' sekarang secara otomatis terdeteksi dengan tepat 
    // berdasarkan skema database Anda, tanpa perlu menggunakan ": any"
    const result = attendances.map((att) => ({
      id: att.id,
      name: att.user?.name ?? "-",
      email: att.user?.email ?? null,
      method: att.qrId ? "qr" : "selfie",
      clockIn: att.clockIn?.toISOString() ?? null,
      clockOut: att.clockOut?.toISOString() ?? null,
      photoUrl: att.photoUrl ?? null,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error /api/v1/attendance/list:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data", details: (error as Error).message },
      { status: 500 }
    );
  }
}