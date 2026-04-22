import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    // 🔹 1. VALIDASI PARAM
    if (!code) {
      return NextResponse.json(
        { success: false, message: "QR Code tidak ditemukan." },
        { status: 400 }
      );
    }

    // 🔹 2. CARI QR
    const qr = await db.qRCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        expiredAt: true,
        isUsed: true,
        createdAt: true,
      },
    });

    if (!qr) {
      return NextResponse.json(
        { success: false, message: "QR tidak valid atau tidak ditemukan." },
        { status: 404 }
      );
    }

    const now = new Date();

    // 🔹 3. CEK EXPIRED
    if (now > qr.expiredAt) {
      return NextResponse.json(
        {
          success: false,
          message: "QR Code sudah kadaluarsa.",
        },
        { status: 400 }
      );
    }

    // 🔹 4. CEK SUDAH DIPAKAI
    if (qr.isUsed) {
      return NextResponse.json(
        {
          success: false,
          message: "QR Code sudah pernah digunakan.",
        },
        { status: 400 }
      );
    }

    // 🔹 5. DETEKSI TIPE QR (optional tapi recommended)
    const type: "CLOCK_IN" | "CLOCK_OUT" = qr.code.startsWith("ABSEN-OUT-")
      ? "CLOCK_OUT"
      : "CLOCK_IN";

    // 🔹 6. RESPONSE SUCCESS
    return NextResponse.json({
      success: true,
      message: "QR valid",
      data: {
        code: qr.code,
        type,
        expiredAt: qr.expiredAt,
      },
    });
  } catch (error) {
    console.error("CHECK QR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}