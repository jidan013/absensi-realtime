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

    // validasi basic
    if (
      !session.attendanceId ||
      typeof session.checkInTime !== "number"
    ) {
      const res = NextResponse.json({ active: false });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    // ⛔ auto expire (optional tapi bagus)
    const now = Date.now();
    const isExpired = now - session.checkInTime > COOKIE_MAX_AGE * 1000;

    if (isExpired) {
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

// ── POST (SET SESSION setelah scan) ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CheckInSession>;

    if (!body.attendanceId || !body.name) {
      return NextResponse.json(
        { error: "Data session tidak lengkap" },
        { status: 400 }
      );
    }

    const session: CheckInSession = {
      attendanceId: body.attendanceId,
      name: body.name,
      checkInTime: Date.now(), // pakai waktu sekarang
    };

    const res = NextResponse.json({ success: true, session });

    res.cookies.set(COOKIE_NAME, JSON.stringify(session), {
      httpOnly: false, // ✅ penting: biar frontend bisa baca
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Request tidak valid" },
      { status: 400 }
    );
  }
}

// ── DELETE (CLOCK OUT) ────────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}