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

// ── Types ─────────────────────────────────────────────────────────
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

interface VerifySuccess {
  success: true;
  type: "CLOCK_IN" | "CLOCK_OUT";
  message: string;
  durasi?: string;
  data: {
    user: UserData;
    attendance: AttendanceData;
  };
}

interface VerifyError {
  success: false;
  message: string;
}

type VerifyResult = VerifySuccess | VerifyError;
type Status = "loading" | "success" | "error";

// ── Helpers ───────────────────────────────────────────────────────
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

// ── Loading fallback ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <QrCode className="w-12 h-12 text-white" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-gray-800">Memverifikasi QR Code...</p>
          <p className="text-gray-500 mt-2 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Mohon tunggu sebentar
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Inner component (pakai useSearchParams) ───────────────────────
function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setResult({ success: false, message: "QR Code tidak ditemukan dalam URL." });
      return;
    }

    const verify = async (): Promise<void> => {
      try {
        const res = await fetch(
          `/api/v1/attendance/verify-qr?code=${encodeURIComponent(code)}`
        );
        const data = (await res.json()) as VerifyResult;
        setResult(data);

        if (data.success) {
          setStatus("success");
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 6000);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
        setResult({ success: false, message: "Terjadi kesalahan jaringan. Coba lagi." });
      }
    };

    void verify();
  }, [code]);

  // ── Loading ────────────────────────────────────────────────────
  if (status === "loading") {
    return <LoadingScreen />;
  }

  // ── Error ──────────────────────────────────────────────────────
  if (status === "error" || !result?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-red-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              >
                <XCircle className="w-20 h-20 text-white mx-auto drop-shadow-xl" />
              </motion.div>
              <h1 className="text-3xl font-black text-white mt-4">Verifikasi Gagal</h1>
            </div>

            <div className="p-8 text-center space-y-6">
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <p className="text-red-700 font-medium leading-relaxed">
                  {!result?.success ? result?.message : "Terjadi kesalahan tidak diketahui."}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-gray-500 text-sm font-medium">Kemungkinan penyebab:</p>
                <ul className="text-sm text-gray-600 space-y-1.5 text-left bg-gray-50 rounded-2xl p-4">
                  {[
                    "QR Code sudah kadaluarsa (lebih dari 60 detik)",
                    "QR Code sudah pernah digunakan",
                    "Anda sudah absen masuk dan pulang hari ini",
                    "QR Code bukan milik Anda",
                    "Anda belum login — silakan login dulu",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/absensi"
                  className="flex-1 flex items-center justify-center gap-3 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-sm"
                >
                  <Home className="w-4 h-4" />
                  Ke Absensi
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────
  const { user, attendance } = result.data;
  const isClockIn = result.type === "CLOCK_IN";

  const gradientClass = isClockIn
    ? "from-emerald-500 to-teal-600"
    : "from-blue-500 to-indigo-600";

  const bgClass = isClockIn
    ? "from-emerald-50 via-white to-teal-50"
    : "from-blue-50 via-white to-indigo-50";

  const ringClass = isClockIn ? "ring-emerald-100" : "ring-blue-100";

  return (
    <>
      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />
      )}

      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className={`bg-white rounded-3xl shadow-2xl ring-1 ${ringClass} overflow-hidden`}>

            {/* Top bar */}
            <div className={`bg-gradient-to-r ${gradientClass} p-8 text-center relative overflow-hidden`}>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full" />

              <AnimatePresence>
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="flex justify-center"
                >
                  <CheckCircle2 className="w-24 h-24 text-white drop-shadow-2xl" />
                </motion.div>
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full mt-4 mb-2">
                  {isClockIn
                    ? <LogIn className="w-4 h-4 text-white" />
                    : <LogOut className="w-4 h-4 text-white" />
                  }
                  <span className="text-white font-bold text-sm">
                    {isClockIn ? "Absen Masuk" : "Absen Pulang"}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-wide">
                  Berhasil!
                </h1>
                <p className="text-white/80 mt-1 text-sm">
                  Kehadiran Anda telah tercatat
                </p>
              </motion.div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                {/* Nama */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3" /> Karyawan
                    </p>
                    <p className="text-lg font-black text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.position}</p>
                  </div>
                </div>

                {/* Jam Masuk */}
                {attendance.clockIn && (
                  <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
                        Jam Masuk
                      </p>
                      <p className="text-base font-bold text-gray-900 mt-0.5 leading-snug">
                        {formatTime(attendance.clockIn)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Jam Pulang + Durasi */}
                {!isClockIn && attendance.clockOut && (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                          Jam Pulang
                        </p>
                        <p className="text-base font-bold text-gray-900 mt-0.5 leading-snug">
                          {formatTime(attendance.clockOut)}
                        </p>
                      </div>
                    </div>

                    {result.durasi && (
                      <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <Timer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">
                            Total Durasi Kerja
                          </p>
                          <p className="text-xl font-black text-gray-900 mt-0.5">
                            {result.durasi}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Waktu scan (clock in) */}
                {isClockIn && (
                  <div className="flex items-start gap-4 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">
                        Waktu Absen
                      </p>
                      <p className="text-base font-bold text-gray-900 mt-0.5 leading-snug">
                        {formatTime(attendance.clockIn!)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lokasi */}
                {attendance.location && (
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-gray-500 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                        Lokasi Absen
                      </p>
                      <p className="text-sm font-medium text-gray-700 mt-0.5 leading-snug">
                        {attendance.location.address ??
                          `${attendance.location.latitude.toFixed(5)}, ${attendance.location.longitude.toFixed(5)}`}
                      </p>
                      <a
                        href={mapsURL(attendance.location.latitude, attendance.location.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block font-medium"
                      >
                        Lihat di Google Maps →
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Pesan */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center py-3 border-t border-gray-100"
              >
                <p className="text-gray-500 text-sm leading-relaxed">
                  {isClockIn
                    ? "Selamat bekerja! Semangat hari ini 💪"
                    : "Terima kasih atas kerja keras Anda hari ini 🎉"}
                </p>
              </motion.div>

              {/* Tombol */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Link
                  href="/"
                  className={`flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r ${gradientClass} text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}
                >
                  <Home className="w-5 h-5" />
                  Kembali ke Beranda
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-6"
          >
            <span className="inline-flex items-center gap-2 text-sm text-gray-400 bg-white/80 px-4 py-2 rounded-full shadow-sm">
              <QrCode className="w-4 h-4" />
              Diverifikasi via QR Code • RAD Absensi
            </span>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

// ── Default export dengan Suspense wrapper ────────────────────────
export default function VerifyQRPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <VerifyQRContent />
    </Suspense>
  );
}