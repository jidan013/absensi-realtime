"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FaceRecognition from "@/components/FaceRecognition";

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

interface AttendanceData {
  success: boolean;
  checkedIn?: boolean;
  alreadyDone?: boolean;
  attendanceId?: string;
  name?: string;
  clockIn?: string;
  clockOut?: string;
  durationText?: string;
}

// ── Helpers ───────────────────────────────────────────────────────
const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
};

// Ambil cookie dari browser
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

// Hapus cookie
function deleteSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "absensi_session=; path=/; max-age=0";
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat...</p>
      </div>
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
  const [loadingStep, setLoadingStep] = useState("");
  
  // Face recognition states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceType, setFaceType] = useState<"CLOCK_IN" | "CLOCK_OUT">("CLOCK_IN");
  
  // Refs untuk cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── TIMER ──
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!session) return;
    
    const start = new Date(session.clockIn).getTime();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  const elapsedStr = (() => {
    const s = Math.floor(elapsed / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  })();

  // ── INIT ──
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("QR tidak ditemukan");
      return;
    }

    // Restore dari cookie
    const local = getSessionFromCookie();
    if (local) {
      setSession({
        attendanceId: local.attendanceId,
        name: local.name,
        clockIn: new Date(local.checkInTime).toISOString(),
      });
      setStatus("already-in");
    }

    // Validasi ke server
    const sync = async () => {
      try {
        const res = await fetch("/api/v1/attendance/me", {
          credentials: "include",
        });
        
        if (res.ok) {
          const data: AttendanceData = await res.json();
          
          if (data.checkedIn && data.clockIn && data.attendanceId) {
            setSession({
              attendanceId: data.attendanceId,
              name: data.name ?? "User",
              clockIn: data.clockIn,
            });
            setStatus("already-in");
          } else if (data.alreadyDone) {
            setCheckoutDuration(data.durationText || "Selesai");
            setStatus("success-out");
            deleteSessionCookie();
          } else if (!local) {
            setStatus("ready");
          }
        } else if (!local) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Sync error:", error);
        if (!local) {
          setStatus("ready");
        }
      }
    };
    
    void sync();
  }, [code]);

  // ── CLOCK IN with QR ──
  const handleClockIn = useCallback(async () => {
    if (!code || isSubmitting) return;
    setIsSubmitting(true);
    setLoadingStep("Memverifikasi QR Code...");

    try {
      setLoadingStep("Menghubungi server...");
      console.log("🔍 Scanning QR:", code);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch("/api/v1/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: code }),
        credentials: "include",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      setLoadingStep("Memproses response...");
      const data = await res.json();
      console.log("📦 Response:", data);

      // Handle error response
      if (data.error) {
        setStatus("error");
        setMessage(data.error);
        return;
      }

      // Handle sudah absen
      if (data.alreadyCheckedIn) {
        setSession({
          attendanceId: data.attendanceId,
          name: data.name,
          clockIn: data.clockIn,
        });
        setStatus("already-in");
        return;
      }

      // Handle success
      if (data.success) {
        setLoadingStep("Menyimpan session...");
        
        // Simpan cookie
        try {
          await fetch("/api/v1/attendance/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attendanceId: data.attendanceId,
              name: data.name,
            }),
          });
        } catch (cookieError) {
          console.warn("Cookie error:", cookieError);
        }

        setSession({
          attendanceId: data.attendanceId,
          name: data.name,
          clockIn: data.clockIn || new Date().toISOString(),
        });
        setStatus("success-in");
      } else {
        throw new Error(data.message || "Gagal absen");
      }
    } catch (error) {
      console.error("❌ Clock in error:", error);
      if ((error as Error).name === "AbortError") {
        setMessage("Request timeout, silakan coba lagi");
      } else {
        setMessage((error as Error).message || "Terjadi kesalahan");
      }
      setStatus("error");
    } finally {
      setIsSubmitting(false);
      setLoadingStep("");
    }
  }, [code, isSubmitting]);

  // ── CLOCK OUT with QR ──
  const handleClockOut = useCallback(async () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);
    setLoadingStep("Memproses absen pulang...");

    try {
      const now = Date.now();
      
      // Dapatkan lokasi (optional)
      let lat = null, lon = null;
      try {
        const position = await Promise.race([
          new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
        if (position) {
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        }
      } catch (error) {
        console.warn("Location denied or timeout:", error);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/v1/attendance/clockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attendanceId: session.attendanceId,
          checkOutTime: now,
          lat: lat,
          lon: lon,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Gagal absen pulang");
        return;
      }

      // Hapus session lokal
      const durationText = data.data?.durationText || data.durationText || "Berhasil";
      setCheckoutDuration(durationText);
      setSession(null);
      setStatus("success-out");
      
      // Hapus cookie dari browser
      deleteSessionCookie();
      
    } catch (error) {
      console.error("Clock out error:", error);
      if ((error as Error).name === "AbortError") {
        setMessage("Request timeout, silakan coba lagi");
      } else {
        setMessage("Terjadi kesalahan saat absen pulang");
      }
      setStatus("error");
    } finally {
      setIsSubmitting(false);
      setLoadingStep("");
    }
  }, [session, isSubmitting]);

  // ── FACE RECOGNITION HANDLER ──
  const handleFaceCapture = async (photoBase64: string) => {
    setIsSubmitting(true);
    setLoadingStep("Memproses face recognition...");
    
    try {
      let lat = null, lon = null;
      try {
        const position = await Promise.race([
          new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
        if (position) {
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        }
      } catch (error) {
        console.warn("Location denied:", error);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch("/api/v1/attendance/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          photoBase64,
          type: faceType,
          lat,
          lon,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || data.error) {
        setStatus("error");
        setMessage(data.error || "Gagal absen dengan face");
        setShowFaceModal(false);
        return;
      }

      if (data.type === "CLOCK_IN") {
        await fetch("/api/v1/attendance/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendanceId: data.attendanceId,
            name: data.name,
          }),
        });

        setSession({
          attendanceId: data.attendanceId,
          name: data.name,
          clockIn: data.clockIn,
        });
        setStatus("success-in");
      } else {
        setCheckoutDuration(data.durasi || data.durationText || "Berhasil");
        setSession(null);
        setStatus("success-out");
        deleteSessionCookie();
      }
      
      setShowFaceModal(false);
    } catch (error) {
      console.error("Face capture error:", error);
      if ((error as Error).name === "AbortError") {
        setMessage("Request timeout, silakan coba lagi");
      } else {
        setMessage("Terjadi kesalahan saat absen face");
      }
      setStatus("error");
    } finally {
      setIsSubmitting(false);
      setLoadingStep("");
    }
  };

  if (status === "loading") return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Sistem Absensi
          </h1>
          <p className="text-gray-600">Scan QR atau Gunakan Face Recognition</p>
        </div>

        {/* Loading Step Indicator */}
        {isSubmitting && loadingStep && (
          <div className="mb-4 p-3 bg-blue-100 rounded-lg text-center">
            <p className="text-blue-800 text-sm">{loadingStep}</p>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mt-2"></div>
          </div>
        )}

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6">
            <AnimatePresence mode="wait">
              {status === "ready" && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-800 text-sm text-center">
                      📍 Silakan pilih metode absen masuk
                    </p>
                  </div>
                  
                  <button
                    onClick={handleClockIn}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>📱</span>
                    <span>Scan QR Code Absen Masuk</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setFaceType("CLOCK_IN");
                      setShowFaceModal(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-green-600 text-white p-4 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>😊</span>
                    <span>Face Recognition Absen Masuk</span>
                  </button>
                </motion.div>
              )}

              {(status === "already-in" || status === "success-in") && session && (
                <motion.div
                  key="checked-in"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-green-800 font-semibold">
                      Selamat Datang, {session.name}!
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Anda telah absen masuk
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-gray-600 text-sm">Durasi Bekerja</p>
                    <p className="text-4xl font-bold text-gray-800 font-mono mt-1">
                      {elapsedStr}
                    </p>
                  </div>

                  <button
                    onClick={handleClockOut}
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 text-white p-4 rounded-xl font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>🏠</span>
                    <span>Absen Pulang</span>
                  </button>

                  <button
                    onClick={() => {
                      setFaceType("CLOCK_OUT");
                      setShowFaceModal(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-purple-600 text-white p-4 rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>😊</span>
                    <span>Face Recognition Absen Pulang</span>
                  </button>
                </motion.div>
              )}

              {status === "success-out" && (
                <motion.div
                  key="checked-out"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      Terima Kasih!
                    </h2>
                    <p className="text-gray-600">Absen pulang berhasil</p>
                    {checkoutDuration && (
                      <div className="mt-3 p-2 bg-white rounded-lg">
                        <p className="text-sm text-gray-500">Total Durasi</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {checkoutDuration}
                        </p>
                      </div>
                    )}
                  </div>

                  <Link href="/">
                    <button className="w-full bg-gray-600 text-white p-4 rounded-xl font-semibold hover:bg-gray-700 transition-all">
                      Kembali ke Beranda
                    </button>
                  </Link>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-red-800 font-semibold">Terjadi Kesalahan</p>
                    <p className="text-red-600 text-sm mt-1">{message}</p>
                  </div>

                  <button
                    onClick={() => setStatus("ready")}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-semibold hover:bg-blue-700 transition-all"
                  >
                    Coba Lagi
                  </button>

                  <Link href="/">
                    <button className="w-full bg-gray-600 text-white p-4 rounded-xl font-semibold hover:bg-gray-700 transition-all">
                      Kembali ke Beranda
                    </button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Pastikan kamera dan lokasi diaktifkan untuk face recognition
          </p>
        </div>
      </div>

      <FaceRecognition
        isOpen={showFaceModal}
        onCapture={handleFaceCapture}
        onError={(error) => {
          setMessage(error);
          setStatus("error");
        }}
        onClose={() => setShowFaceModal(false)}
        type={faceType}
      />
    </div>
  );
}