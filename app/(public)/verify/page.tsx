"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, LogIn, LogOut } from "lucide-react";

type Status = "loading" | "ready" | "submitting" | "success" | "error";

interface QRInfo {
  type: "CLOCK_IN" | "CLOCK_OUT";
  userName: string;
  message?: string;
}

interface VerifyResponse {
  success: boolean;
  type?: "CLOCK_IN" | "CLOCK_OUT";
  message?: string;
  durasi?: string;
  data?: {
    user?: { name: string; email: string; position: string };
    attendance?: {
      id: string;
      clockIn: string | null;
      clockOut: string | null;
    };
  };
  error?: string;
}

export default function VerifyQRPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <VerifyQRContent />
    </Suspense>
  );
}

function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [qrInfo, setQrInfo] = useState<QRInfo | null>(null);
  const [durasi, setDurasi] = useState<string>("");
  const [needLogin, setNeedLogin] = useState(false);

  // ── 1. Validasi QR tanpa melakukan absen ────────────────────────
  // Kita gunakan endpoint verify-qr yang sudah ada tapi via HEAD-like
  // trick: cek QR di DB dulu sebelum POST. Karena verify-qr (GET) langsung
  // buat attendance, kita cukup parse token untuk preview info saja,
  // lalu baru hit GET saat user klik tombol konfirmasi.
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("QR Code tidak ditemukan di URL.");
      return;
    }

    // Parse info dari token (format: ABSEN-IN-YYYYMMDD-userId-RANDOM atau ABSEN-OUT-...)
    // Ini hanya untuk menentukan tipe QR di UI — validasi sesungguhnya di server
    const type: "CLOCK_IN" | "CLOCK_OUT" = code.startsWith("ABSEN-OUT-")
      ? "CLOCK_OUT"
      : "CLOCK_IN";

    setQrInfo({
      type,
      userName: "",
      message:
        type === "CLOCK_IN"
          ? "Konfirmasi absen masuk"
          : "Konfirmasi absen pulang",
    });
    setStatus("ready");
  }, [code]);

  // ── 2. Konfirmasi absen → hit verify-qr ─────────────────────────
  const handleAbsen = async () => {
    if (!code) return;

    setStatus("submitting");

    try {
      const res = await fetch(
        `/api/v1/attendance/verify-qr?code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data: VerifyResponse = await res.json().catch(() => ({
        success: false,
        message: "Respons tidak valid dari server",
      }));

      if (res.status === 401) {
        setStatus("error");
        setNeedLogin(true);
        setMessage("Silakan login terlebih dahulu.");
        return;
      }

      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.message || data.error || "Gagal absen");
        return;
      }

      // Update info nama dari response
      if (data.data?.user?.name) {
        setQrInfo((prev) =>
          prev ? { ...prev, userName: data.data!.user!.name } : prev
        );
      }

      if (data.durasi) setDurasi(data.durasi);

      setStatus("success");
      setMessage(data.message || "Absensi berhasil");
    } catch {
      setStatus("error");
      setMessage("Server tidak merespon. Coba lagi.");
    }
  };

  // ── UI ───────────────────────────────────────────────────────────
  const isClockOut = qrInfo?.type === "CLOCK_OUT";

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-gray-500 font-medium">Memuat QR...</p>
        </div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-10 max-w-sm w-full text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            Gagal
          </h2>
          <p className="text-red-500 font-medium">{message}</p>

          {needLogin && (
            <Link
              href={`/login?redirect=${encodeURIComponent(
                `/verify?code=${code}`
              )}`}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all"
            >
              <LogIn className="w-4 h-4" />
              Login untuk lanjut
            </Link>
          )}

          {!needLogin && (
            <Link
              href="/"
              className="inline-block text-indigo-600 dark:text-indigo-400 underline text-sm"
            >
              Kembali ke beranda
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Success
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-10 max-w-sm w-full text-center space-y-5">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              isClockOut
                ? "bg-orange-100 dark:bg-orange-900/30"
                : "bg-emerald-100 dark:bg-emerald-900/30"
            }`}
          >
            <CheckCircle2
              className={`w-10 h-10 ${
                isClockOut ? "text-orange-500" : "text-emerald-500"
              }`}
            />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            {isClockOut ? "Absen Pulang!" : "Absen Masuk!"}
          </h2>
          {qrInfo?.userName && (
            <p
              className={`font-semibold ${
                isClockOut ? "text-orange-500" : "text-emerald-600"
              }`}
            >
              {isClockOut
                ? `Sampai jumpa, ${qrInfo.userName}! 👋`
                : `Selamat datang, ${qrInfo.userName}! 👋`}
            </p>
          )}
          <p className="text-gray-500 text-sm">{message}</p>
          {durasi && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
              <span className="text-orange-700 dark:text-orange-300 font-bold text-sm">
                Durasi kerja: {durasi}
              </span>
            </div>
          )}
          <Link
            href="/"
            className="inline-block text-indigo-600 dark:text-indigo-400 underline text-sm"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  // Ready — tampilkan tombol konfirmasi
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-10 max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            isClockOut
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-indigo-100 dark:bg-indigo-900/30"
          }`}
        >
          {isClockOut ? (
            <LogOut className="w-10 h-10 text-orange-500" />
          ) : (
            <LogIn className="w-10 h-10 text-indigo-500" />
          )}
        </div>

        {/* Judul */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            {isClockOut ? "Absen Pulang" : "Absen Masuk"}
          </h2>
          <p className="text-gray-500 text-sm">
            {isClockOut
              ? "Konfirmasi untuk mencatat waktu pulang Anda"
              : "Konfirmasi untuk mencatat kehadiran Anda"}
          </p>
        </div>

        {/* Token info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 text-left">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">
            Token
          </p>
          <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
            {code}
          </p>
        </div>

        {/* Tombol konfirmasi */}
        <button
          onClick={() => void handleAbsen()}
          disabled={status === "submitting"}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-white font-black text-lg rounded-2xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            isClockOut
              ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:shadow-orange-200"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-200"
          }`}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Memproses...
            </>
          ) : isClockOut ? (
            <>
              <LogOut className="w-5 h-5" />
              Konfirmasi Pulang
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Konfirmasi Absen Masuk
            </>
          )}
        </button>

        <p className="text-xs text-gray-400">
          Pastikan Anda sudah login sebelum konfirmasi
        </p>
      </div>
    </div>
  );
}