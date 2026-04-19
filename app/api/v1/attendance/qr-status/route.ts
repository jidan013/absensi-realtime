import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";

// Tipe QR dibaca dari prefix code:
// ABSEN-IN-...  = clock in
// ABSEN-OUT-... = clock out

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token wajib diisi" }, { status: 400 });
    }

    const qrCode = await db.qRCode.findUnique({
      where: { code: token },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ scanned: false, error: "QR tidak ditemukan" });
    }

    if (qrCode.userId !== userAccess.userId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const isExpired = new Date() > qrCode.expiredAt;
    const scanned = qrCode.isUsed;

    // Baca tipe dari prefix code
    const qrType: "CLOCK_IN" | "CLOCK_OUT" = qrCode.code.startsWith("ABSEN-OUT-")
      ? "CLOCK_OUT"
      : "CLOCK_IN";

    return NextResponse.json({
      scanned,
      isExpired,
      type: qrType,
      name: scanned ? qrCode.user.name : null,
    });
  } catch (error) {
    console.error("Error /api/v1/attendance/qr-status:", error);
    return NextResponse.json(
      { error: "Gagal mengecek status QR", details: (error as Error).message },
      { status: 500 }
    );
  }
}