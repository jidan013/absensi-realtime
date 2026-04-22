"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  QrCode,
  RefreshCw,
  Home,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import Link from "next/link";

// ================= TYPES =================
type Status = "loading" | "ready" | "success" | "error";

interface AttendanceData {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  location?: {
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
}

interface UserData {
  name: string;
  email: string;
  position: string;
}

interface VerifyResult {
  success: boolean;
  type?: "CLOCK_IN" | "CLOCK_OUT";
  message: string;
  durasi?: string;
  data?: {
    user: UserData;
    attendance: AttendanceData;
  };
}

// ================= HELPERS =================
const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const mapsURL = (lat: number, lon: number): string =>
  `https://www.google.com/maps?q=${lat},${lon}`;

// ================= LOADING =================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );
}

// ================= MAIN =================
function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  // ================= STEP 1: VALIDASI =================
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setResult({ success: false, message: "QR Code tidak ditemukan." });
      return;
    }

    const checkQR = async () => {
      try {
        const res = await fetch(
          `/api/v1/attendance/check-qr?code=${encodeURIComponent(code)}`
        );
        const data: VerifyResult = await res.json();

        if (data.success) {
          setStatus("ready");
          setResult(data);
        } else {
          setStatus("error");
          setResult(data);
        }
      } catch {
        setStatus("error");
        setResult({ success: false, message: "Server error." });
      }
    };

    checkQR();
  }, [code]);

  // ================= STEP 2: ABSEN =================
  const handleAbsen = async () => {
    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/v1/attendance/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data: VerifyResult = await res.json();
      setResult(data);

      if (data.success) {
        setStatus("success");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= LOADING =================
  if (status === "loading") return <LoadingScreen />;

  // ================= ERROR =================
  if (status === "error" || !result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="font-bold text-lg">{result?.message}</p>

          <Link href="/" className="block mt-4 underline">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  // ================= READY =================
  if (status === "ready") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-md text-center space-y-4"
        >
          <QrCode className="w-16 h-16 mx-auto text-indigo-600" />
          <h1 className="text-xl font-bold">QR Valid</h1>
          <p className="text-gray-500">Klik tombol di bawah untuk absen</p>

          <button
            onClick={handleAbsen}
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
          >
            {isSubmitting ? "Memproses..." : "Klik untuk Absen"}
          </button>
        </motion.div>
      </div>
    );
  }

  // ================= SUCCESS =================
  const { user, attendance } = result.data!;
  const isClockIn = result.type === "CLOCK_IN";

  return (
    <>
      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} />
      )}

      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-md space-y-4"
        >
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold mt-2">
              {isClockIn ? "Absen Masuk" : "Absen Pulang"} Berhasil
            </h1>
          </div>

          {/* USER */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <User />
            <div>
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-gray-500">{user.position}</p>
            </div>
          </div>

          {/* JAM */}
          {attendance.clockIn && (
            <div className="flex gap-3 items-start">
              <LogIn className="text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Jam Masuk</p>
                <p className="font-bold">{formatTime(attendance.clockIn)}</p>
              </div>
            </div>
          )}

          {attendance.clockOut && (
            <div className="flex gap-3 items-start">
              <LogOut className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Jam Pulang</p>
                <p className="font-bold">{formatTime(attendance.clockOut)}</p>
              </div>
            </div>
          )}

          {result.durasi && (
            <div className="flex gap-3 items-start">
              <Timer className="text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Durasi</p>
                <p className="font-bold">{result.durasi}</p>
              </div>
            </div>
          )}

          {/* LOKASI */}
          {attendance.location && (
            <div className="flex gap-3 items-start">
              <MapPin />
              <a
                href={mapsURL(
                  attendance.location.latitude,
                  attendance.location.longitude
                )}
                target="_blank"
                className="text-blue-500 text-sm underline"
              >
                Lihat Lokasi
              </a>
            </div>
          )}

          <Link
            href="/"
            className="block text-center mt-4 bg-indigo-600 text-white py-2 rounded-xl"
          >
            <Home className="inline w-4 h-4 mr-1" />
            Kembali
          </Link>
        </motion.div>
      </div>
    </>
  );
}

// ================= EXPORT =================
export default function VerifyQRPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <VerifyQRContent />
    </Suspense>
  );
}