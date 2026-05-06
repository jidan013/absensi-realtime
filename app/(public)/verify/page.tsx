"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────
type PageStatus =
  | "loading"
  | "ready"
  | "already-in"
  | "success-in"
  | "success-out"
  | "error";

interface SessionCookie {
  attendanceId: string;
  name: string;
  checkInTime: number;
}

// ── Helpers ───────────────────────────────────────────────────────
const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
};

// ✅ ambil cookie dari browser
function getSessionFromCookie(): SessionCookie | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/absensi_session=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}

export default function VerifyQRPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <VerifyQRContent />
    </Suspense>
  );
}

function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<PageStatus>("loading");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<{
    attendanceId: string;
    name: string;
    clockIn: string;
  } | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [checkoutDuration, setCheckoutDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── TIMER ──
  useEffect(() => {
    if (!session) return;
    const start = new Date(session.clockIn).getTime();
    const i = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);
    return () => clearInterval(i);
  }, [session]);

  const elapsedStr = (() => {
    const s = Math.floor(elapsed / 1000);
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(sec).padStart(2, "0")}`;
  })();

  // ── INIT ──
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("QR tidak ditemukan");
      return;
    }

    // ✅ 1. restore dari cookie (instant)
    const local = getSessionFromCookie();
    if (local) {
      setSession({
        attendanceId: local.attendanceId,
        name: local.name,
        clockIn: new Date(local.checkInTime).toISOString(),
      });
      setStatus("already-in");
    }

    // ✅ 2. validasi ke server (background)
    const sync = async () => {
      try {
        const res = await fetch("/api/v1/attendance/me", {
          credentials: "include",
        });

        if (res.ok) {
          const me = await res.json();
          if (me.checkedIn && me.clockIn) {
            setSession({
              attendanceId: me.attendanceId,
              name: me.name ?? "User",
              clockIn: me.clockIn,
            });
            setStatus("already-in");
          }
        }
      } catch {}
    };

    void sync();
  }, [code]);

  // ── CLOCK IN ──
  const handleClockIn = useCallback(async () => {
    if (!code || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: code }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Gagal absen");
        return;
      }

      // ✅ simpan cookie
      await fetch("/api/v1/attendance/session", {
        method: "POST",
        body: JSON.stringify({
          attendanceId: data.attendanceId,
          name: data.name,
        }),
      });

      const clockIn = data.clockIn || new Date().toISOString();

      setSession({
        attendanceId: data.attendanceId,
        name: data.name,
        clockIn,
      });

      setStatus("success-in");
    } catch {
      setStatus("error");
      setMessage("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isSubmitting]);

  // ── CLOCK OUT ──
  const handleClockOut = useCallback(async () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = Date.now();
      const duration = now - new Date(session.clockIn).getTime();

      const res = await fetch("/api/v1/attendance/clockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attendanceId: session.attendanceId,
          checkOutTime: now,
          durationMs: duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal absen pulang");
        return;
      }

      // ✅ hapus cookie
      await fetch("/api/v1/attendance/session", {
        method: "DELETE",
      });

      setCheckoutDuration(formatDuration(duration));
      setSession(null);
      setStatus("success-out");
    } catch {
      alert("Error");
    } finally {
      setIsSubmitting(false);
    }
  }, [session, isSubmitting]);

  if (status === "loading") return <LoadingScreen />;

  return (
    <div className="p-6">
      {status === "ready" && (
        <button onClick={handleClockIn}>Absen Masuk</button>
      )}

      {(status === "already-in" || status === "success-in") && session && (
        <div>
          <p>{session.name}</p>
          <p>{elapsedStr}</p>
          <button onClick={handleClockOut}>Absen Pulang</button>
        </div>
      )}

      {status === "success-out" && (
        <div>
          <p>Selesai</p>
          <p>{checkoutDuration}</p>
          <Link href="/">Home</Link>
        </div>
      )}

      {status === "error" && <p>{message}</p>}
    </div>
  );
}
