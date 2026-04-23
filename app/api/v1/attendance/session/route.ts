/**
 * /api/v1/attendance/session
 *
 * GET    → Baca session aktif dari cookie HttpOnly "absensi_session"
 * POST   → Simpan session baru ke cookie (dipanggil setelah clock-in berhasil)
 * DELETE → Hapus cookie (opsional, clockout sudah hapus otomatis)
 */

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "absensi_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 jam

interface CheckInSession {
  attendanceId: string;
  name: string;
  checkInTime: number;
}

// ── GET ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME);

  if (!cookie?.value) {
    return NextResponse.json({ active: false });
  }

  try {
    const session = JSON.parse(cookie.value) as CheckInSession;

    if (
      !session.attendanceId ||
      session.attendanceId.startsWith("local-") ||
      typeof session.checkInTime !== "number" ||
      session.checkInTime <= 0
    ) {
      const res = NextResponse.json({ active: false });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    return NextResponse.json({ active: true, session });
  } catch {
    const res = NextResponse.json({ active: false });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

// ── POST ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CheckInSession>;

    if (!body.attendanceId || typeof body.checkInTime !== "number" || !body.name) {
      return NextResponse.json(
        { error: "Data session tidak lengkap" },
        { status: 400 }
      );
    }

    const session: CheckInSession = {
      attendanceId: body.attendanceId,
      name: body.name,
      checkInTime: body.checkInTime,
    };

    const res = NextResponse.json({ ok: true });

    res.cookies.set(COOKIE_NAME, JSON.stringify(session), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}