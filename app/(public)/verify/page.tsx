"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "loading" | "ready" | "success" | "error";

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    type?: "CLOCK_IN" | "CLOCK_OUT";
  };
}

export default function VerifyQRPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <VerifyQRContent />
    </Suspense>
  );
}

function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrType, setQrType] = useState<"CLOCK_IN" | "CLOCK_OUT" | null>(null);

  // ================= 1. CHECK QR =================
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("QR Code tidak ditemukan.");
      return;
    }

    const checkQR = async () => {
      try {
        const res = await fetch(
          `/api/v1/attendance/check-qr?code=${encodeURIComponent(code)}`,
          {
            credentials: "include", // 🔥 penting kalau check butuh auth
          }
        );

        let data: ApiResponse = {};
        try {
          data = await res.json();
        } catch {}

        // 🔴 belum login
        if (res.status === 401) {
          setStatus("error");
          setMessage("Silakan login terlebih dahulu.");
          return;
        }

        // 🔴 error lain
        if (!res.ok) {
          setStatus("error");
          setMessage(data.message || data.error || "QR tidak valid");
          return;
        }

        // ✅ success
        setQrType(data.data?.type ?? null);
        setStatus("ready");
        setMessage("QR valid, silakan lanjutkan absensi.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Server tidak merespon.");
      }
    };

    checkQR();
  }, [code]);

  // ================= 2. ABSEN =================
  const handleAbsen = async () => {
    if (!code) return;

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/v1/attendance/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          qrCode: code,
        }),
      });

      let data: ApiResponse = {};
      try {
        data = await res.json();
      } catch {}

      // 🔴 belum login → redirect dengan query
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(
          `/verify?code=${code}`
        )}`;
        return;
      }

      // 🔴 error
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || data.message || "Gagal absen");
        return;
      }

      // ✅ success
      setStatus("success");
      setMessage(data.message || "Absensi berhasil");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Terjadi kesalahan server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= UI =================

  if (status === "loading") {
    return <div className="p-10 text-center">Memuat QR...</div>;
  }

  if (status === "error") {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-red-500 font-bold">{message}</p>

        <Link
          href={`/login?redirect=${encodeURIComponent(
            `/verify?code=${code}`
          )}`}
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Login untuk lanjut
        </Link>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="font-bold">{message}</p>

        {qrType && (
          <p className="text-sm text-gray-500">
            Tipe: {qrType === "CLOCK_IN" ? "Absen Masuk" : "Absen Pulang"}
          </p>
        )}

        <button
          onClick={handleAbsen}
          disabled={isSubmitting}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {isSubmitting ? "Memproses..." : "Klik untuk Absen"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-10 text-center">
      <p className="text-green-600 font-bold">{message}</p>

      <Link href="/" className="mt-4 block underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}