"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "loading" | "ready" | "success" | "error";

interface ApiResponse {
  success?: boolean;
  message?: string;
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
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ================= VALIDASI QR =================
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("QR Code tidak ditemukan.");
      return;
    }

    const checkQR = async () => {
      try {
        const res = await fetch(
          `/api/v1/attendance/check-qr?code=${encodeURIComponent(code)}`
        );

        let data: ApiResponse = {};
        try {
          data = await res.json();
        } catch {
          // ignore parse error
        }

        if (!res.ok) {
          setStatus("error");
          setMessage(data.message ?? "QR tidak valid");
          return;
        }

        setStatus("ready");
        setMessage("QR valid, silakan lanjutkan absensi.");
      } catch (error) {
        console.error("CHECK QR ERROR:", error);
        setStatus("error");
        setMessage("Server tidak merespon.");
      }
    };

    checkQR();
  }, [code]);

  // ================= PROSES ABSEN =================
  const handleAbsen = async () => {
    if (!code) return;

    try {
      setIsSubmitting(true);

      const res = await fetch(
        `/api/v1/attendance/verify-qr?code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      let data: ApiResponse = {};
      try {
        data = await res.json();
      } catch {
        // ignore parse error
      }

      if (res.status === 401) {
        setStatus("error");
        setMessage("Silakan login terlebih dahulu.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Gagal absen");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "Absen berhasil");
    } catch (error) {
      console.error("VERIFY ERROR:", error);
      setStatus("error");
      setMessage("Terjadi kesalahan server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= UI =================
  if (status === "loading") {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (status === "error") {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold">{message}</p>

        <Link
          href="/login"
          className="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Login
        </Link>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="p-10 text-center">
        <p className="font-bold">{message}</p>

        <button
          onClick={handleAbsen}
          disabled={isSubmitting}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
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