import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

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

    const attendances = await db.attendance.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { clockIn: dateFilter } : {}),
      },
      include: {
        user: { select: { name: true, email: true, position: true } },
        location: { select: { latitude: true, longitude: true, address: true } },
        qrCode: { select: { code: true } },
      },
      orderBy: { clockIn: "desc" },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error /api/v1/attendance/list:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data", details: (error as Error).message },
      { status: 500 }
    );
  }
}