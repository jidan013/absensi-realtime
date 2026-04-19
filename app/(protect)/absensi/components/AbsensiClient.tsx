"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  FormEvent,
  ChangeEvent,
} from "react";
import {
  Camera,
  Upload,
  MapPin,
  User,
  Send,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Clock,
  Zap,
} from "lucide-react";
import Confetti from "react-confetti";
import { Toaster, toast } from "sonner";
import { useWindowSize } from "react-use";
import { QRCodeCanvas } from "qrcode.react";
import FooterClient from "@/components/layouts/Footer";
import { useUser } from "@/providers/auth-provider";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────
interface Coordinates {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface IPApiResponse {
  latitude?: number;
  longitude?: number;
}

interface AttendanceResponse {
  id?: string;
  name?: string;
  error?: string;
  qrCodeValue?: string;
  sessionToken?: string;
}

interface QRStatusResponse {
  scanned?: boolean;
  name?: string;
  error?: string;
}

type AbsenMode = "face" | "qr";

const QR_REFRESH_INTERVAL = 60;

// ── Helpers ───────────────────────────────────────────────────────
const generateQRToken = (userId: string): string => {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ABSEN-${userId}-${ts}-${rand}`;
};

// ═══════════════════════════════════════════════════════════════════
export default function AbsensiClient() {
  const { user } = useUser();

  const [mode, setMode] = useState<AbsenMode>("face");

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watchRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const qrRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 4;

  // ── Face state ──
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoURL, setPhotoURL] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // ── QR state ──
  const [qrToken, setQrToken] = useState<string>("");
  const [qrCountdown, setQrCountdown] = useState<number>(QR_REFRESH_INTERVAL);
  const [qrSubmitting, setQrSubmitting] = useState<boolean>(false);
  const [qrScanned, setQrScanned] = useState<boolean>(false);
  const [qrSessionActive, setQrSessionActive] = useState<boolean>(false);

  // ── Location state ──
  const [coords, setCoords] = useState<Coordinates>({
    lat: null,
    lon: null,
    accuracy: null,
    timestamp: null,
  });
  const [locationStatus, setLocationStatus] = useState<
    | "loading"
    | "success"
    | "fallback"
    | "error"
    | "denied"
    | "timeout"
    | "permanent-error"
  >("loading");
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>("");

  const { width, height } = useWindowSize();

  // ── Init nama dari user ──
  useEffect(() => {
    nameInputRef.current?.focus();
    if (user?.name && !name.trim()) setName(user.name);
  }, [user]); // eslint-disable-line

  // ── Geolocation ──────────────────────────────────────────────────
  const startWatchingLocation = useCallback((): (() => void) | undefined => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationErrorMsg("Geolocation tidak didukung di browser ini");
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    };

    const fallbackToIP = async (): Promise<void> => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("Fallback gagal");
        const data = (await res.json()) as IPApiResponse;
        if (data.latitude && data.longitude) {
          setCoords({ lat: data.latitude, lon: data.longitude, accuracy: 5000, timestamp: Date.now() });
          setLocationStatus("fallback");
          setLocationErrorMsg("Menggunakan estimasi lokasi dari IP.");
          toast.info("Lokasi approximasi via IP digunakan.");
        } else throw new Error("No lat/lon");
      } catch {
        setLocationStatus("permanent-error");
        setLocationErrorMsg("Lokasi tidak tersedia. Pastikan WiFi aktif, matikan VPN.");
        toast.error("Gagal mendapatkan lokasi.");
      }
    };

    const success = (pos: GeolocationPosition): void => {
      setCoords({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      setLocationStatus("success");
      setLocationErrorMsg("");
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };

    const errorHandler = (error: GeolocationPositionError): void => {
      if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
        setLocationStatus("denied");
        setLocationErrorMsg("Izin lokasi ditolak. Izinkan di pengaturan browser.");
        return;
      }
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => startWatchingLocation(), 8000);
      } else void fallbackToIP();
    };

    watchRef.current = navigator.geolocation.watchPosition(success, errorHandler, options);
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const cleanup = startWatchingLocation();
    return cleanup;
  }, [startWatchingLocation]);

  // ── Camera ───────────────────────────────────────────────────────
  const stopCamera = useCallback((): void => {
    if (videoRef.current?.srcObject instanceof MediaStream) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t: MediaStreamTrack) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  const startCamera = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!videoRef.current) return;
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= video.HAVE_CURRENT_DATA) { resolve(); return; }
        const onLoaded = (): void => { video.removeEventListener("loadeddata", onLoaded); resolve(); };
        video.addEventListener("loadeddata", onLoaded);
        video.play().catch(reject);
        setTimeout(() => reject(new Error("Timeout")), 10000);
      });
      setStreamActive(true);
      toast.success("Kamera berhasil diaktifkan");
    } catch (err: unknown) {
      let message = "Kamera tidak dapat diakses";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") message = "Izin kamera ditolak. Izinkan di browser.";
        else if (err.name === "NotFoundError") message = "Tidak ditemukan kamera.";
      }
      toast.error(message);
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback((): void => {
    if (!videoRef.current || !canvasRef.current) { toast.error("Video tidak tersedia"); return; }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      toast.warning("Video belum siap."); return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob && blob.size > 1000) {
        if (photoURL) URL.revokeObjectURL(photoURL);
        setPhotoBlob(blob);
        setPhotoURL(URL.createObjectURL(blob));
        toast.success("Foto berhasil di-capture!");
      } else toast.error("Hasil capture kosong");
    }, "image/jpeg", 0.92);
  }, [photoURL]);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoURL) URL.revokeObjectURL(photoURL);
    setPhotoBlob(file);
    setPhotoURL(URL.createObjectURL(file));
    toast.success("Foto berhasil di-upload!");
  }, [photoURL]);

  useEffect(() => () => { if (photoURL) URL.revokeObjectURL(photoURL); }, [photoURL]);

  const resetFaceForm = useCallback((): void => {
    stopCamera();
    setName("");
    setPhotoBlob(null);
    setPhotoURL("");
    setUploadProgress(0);
    nameInputRef.current?.focus();
    toast.info("Form di-reset");
  }, [stopCamera]);

  // ── QR Session ───────────────────────────────────────────────────
  const refreshQRToken = useCallback((): void => {
    const token = generateQRToken(user?.userId ?? "USER");
    setQrToken(token);
    setQrCountdown(QR_REFRESH_INTERVAL);
    setQrScanned(false);
  }, [user?.userId]);

  const startQRSession = useCallback(async (): Promise<void> => {
    setQrSubmitting(true);
    try {
      const res = await fetch("/api/v1/attendance/qr-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lon: coords.lon,
          accuracy: coords.accuracy,
          timestamp: coords.timestamp ?? Date.now(),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as AttendanceResponse;
        throw new Error(data.error ?? "Gagal membuat sesi QR");
      }

      const data = (await res.json()) as AttendanceResponse;
      const token = data.sessionToken ?? generateQRToken(user?.userId ?? "USER");
      setQrToken(token);
      setQrCountdown(QR_REFRESH_INTERVAL);
      setQrScanned(false);
      setQrSessionActive(true);
      toast.success("Sesi QR berhasil dibuat!");
    } catch {
      // Fallback: generate lokal
      refreshQRToken();
      setQrSessionActive(true);
      toast.info("Sesi QR dibuat secara lokal.");
    } finally {
      setQrSubmitting(false);
    }
  }, [coords, user?.userId, refreshQRToken]);

  const stopQRSession = useCallback((): void => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
    setQrSessionActive(false);
    setQrToken("");
    setQrCountdown(QR_REFRESH_INTERVAL);
    setQrScanned(false);
    toast.info("Sesi QR dihentikan.");
  }, []);

  // QR countdown + auto-refresh
  useEffect(() => {
    if (!qrSessionActive || qrScanned) return;
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          refreshQRToken();
          toast.info("QR Code diperbarui otomatis.");
          return QR_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    qrRefreshRef.current = interval;
    return () => clearInterval(interval);
  }, [qrSessionActive, qrScanned, refreshQRToken]);

  // Poll status scan dari server
  useEffect(() => {
    if (!qrSessionActive || !qrToken || qrScanned) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/v1/attendance/qr-status?token=${encodeURIComponent(qrToken)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as QRStatusResponse;
        if (data.scanned) {
          setQrScanned(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 6000);
          toast.success(
            `Absensi berhasil! ${data.name ? `Selamat datang, ${data.name}` : ""}`,
            { duration: 5000 }
          );
          clearInterval(poll);
          setTimeout(() => {
            setQrScanned(false);
            refreshQRToken();
          }, 4000);
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [qrSessionActive, qrToken, qrScanned, refreshQRToken]);

  // Cleanup saat ganti mode
  useEffect(() => {
    if (mode === "face") stopQRSession();
    else { stopCamera(); setPhotoBlob(null); setPhotoURL(""); }
  }, [mode]); // eslint-disable-line

  // ── Submit Face ──────────────────────────────────────────────────
  const submitFace = useCallback(async (e?: FormEvent<HTMLFormElement>): Promise<void> => {
    e?.preventDefault?.();
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!photoBlob) { toast.error("Ambil atau upload foto terlebih dahulu"); return; }

    setUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 150);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("lat", coords.lat?.toString() ?? "");
      formData.append("lon", coords.lon?.toString() ?? "");
      formData.append("accuracy", coords.accuracy?.toString() ?? "");
      formData.append("timestamp", coords.timestamp?.toString() ?? Date.now().toString());
      formData.append("photo", photoBlob, `absensi_${Date.now()}.jpg`);

      const res = await fetch("/api/v1/attendance", { method: "POST", body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gagal mengirim absensi");
      }

      const data = (await res.json()) as AttendanceResponse;
      toast.success("Absensi berhasil dikirim!", { duration: 5000 });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);

      const qrUrl = `/absensi/qr?id=${data.id ?? ""}&name=${encodeURIComponent(name)}&timestamp=${coords.timestamp ?? Date.now()}&qrCodeValue=${data.qrCodeValue ?? ""}`;
      window.location.href = qrUrl;
      resetFaceForm();
    } catch (err: unknown) {
      toast.error("Gagal mengirim: " + (err instanceof Error ? err.message : "Kesalahan tidak diketahui"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [name, photoBlob, coords, resetFaceForm]);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submitFace(); }
      if (e.key === "Escape") { e.preventDefault(); if (mode === "face") resetFaceForm(); else stopQRSession(); }
      if (e.key === " " && streamActive && !photoURL) { e.preventDefault(); capturePhoto(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [streamActive, photoURL, mode, submitFace, resetFaceForm, stopQRSession, capturePhoto]);

  // ══════════════════════════════════════════════════════════════════
  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-black dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-6xl"
        >
          {/* Header */}
          <motion.div className="text-center mb-10" initial={{ y: -40 }} animate={{ y: 0 }}>
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Absensi Realtime
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 font-medium">
              Verifikasi kehadiran • Real-time
            </p>
          </motion.div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white dark:bg-gray-900 rounded-2xl p-1.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10 gap-1">
              {(["face", "qr"] as AbsenMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-base transition-all duration-300 ${
                    mode === m
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {m === "face" ? <Camera className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                  {m === "face" ? "Selfie / Foto" : "QR Code Absensi"}
                </button>
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="backdrop-blur-2xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
            <div className="p-8 lg:p-12">
              <AnimatePresence mode="wait">

                {/* ════ FACE MODE ════ */}
                {mode === "face" && (
                  <motion.div
                    key="face"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <form onSubmit={(e) => void submitFace(e)} className="space-y-12">
                      <div className="relative group">
                        <label className="flex items-center gap-3 text-lg font-bold text-gray-800 dark:text-white">
                          <User className="w-6 h-6 text-indigo-600" />
                          Nama Lengkap
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                          className="mt-3 w-full px-6 py-5 text-xl rounded-2xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all outline-none"
                          placeholder="Masukkan nama Anda"
                        />
                      </div>

                      <div className="grid lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <h3 className="flex items-center gap-3 text-2xl font-bold">
                            <Camera className="w-8 h-8 text-purple-600" />
                            Selfie Verifikasi
                          </h3>
                          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black">
                            <video ref={videoRef} playsInline className="w-full aspect-video object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            {!streamActive && !photoURL && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-10">
                                <p className="text-white text-2xl font-bold tracking-wider text-center px-6">
                                  Tekan tombol untuk mengaktifkan kamera
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <button
                              type="button"
                              onClick={() => streamActive ? stopCamera() : void startCamera()}
                              className="flex-1 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3"
                            >
                              <Camera className="w-6 h-6" />
                              {streamActive ? "Matikan Kamera" : "Nyalakan Kamera"}
                            </button>
                            <button
                              type="button"
                              disabled={!streamActive}
                              onClick={capturePhoto}
                              className="px-10 py-5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-2xl font-bold text-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                              </div>
                              Capture
                            </button>
                            <label className="px-8 py-5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-2xl font-bold text-lg cursor-pointer hover:shadow-lg flex items-center justify-center gap-3">
                              <Upload className="w-6 h-6" />
                              Upload
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                          <AnimatePresence>
                            {photoURL && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white dark:ring-gray-900"
                              >
                                <Image src={photoURL} alt="Preview selfie" fill className="object-cover" sizes="(max-width: 768px) 100vw, 500px" unoptimized />
                                <button
                                  type="button"
                                  onClick={() => { if (photoURL) URL.revokeObjectURL(photoURL); setPhotoURL(""); setPhotoBlob(null); }}
                                  className="absolute top-4 right-4 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                                  <p className="text-white font-bold text-lg flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6" />
                                    Foto siap dikirim
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <LocationPanel coords={coords} locationStatus={locationStatus} locationErrorMsg={locationErrorMsg} />
                      </div>

                      <div className="pt-8 flex flex-col sm:flex-row gap-6 items-center">
                        <button
                          type="submit"
                          disabled={uploading || !photoBlob || !name.trim()}
                          className="relative flex-1 w-full sm:w-auto px-12 py-7 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl font-black rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 overflow-hidden"
                        >
                          {uploading ? (
                            <>
                              <RefreshCw className="w-8 h-8 animate-spin" />
                              Mengirim... {uploadProgress}%
                              <div className="absolute bottom-0 left-0 h-2 bg-white/30 w-full">
                                <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </>
                          ) : (
                            <>
                              <Send className="w-8 h-8" />
                              Kirim Absensi
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={resetFaceForm}
                          className="px-10 py-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-lg rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                          Reset
                        </button>
                      </div>
                    </form>
                    <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
                      <p>Izinkan Akses <b>Kamera</b> dan <b>Lokasi</b> untuk mengirimkan absensi.</p>
                    </div>
                  </motion.div>
                )}

                {/* ════ QR MODE ════ */}
                {mode === "qr" && (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="grid lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <h3 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-white">
                          <QrCode className="w-8 h-8 text-purple-600" />
                          QR Code Absensi Anda
                        </h3>

                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-2 border-gray-200 dark:border-gray-800 p-8">
                          {/* Success overlay */}
                          <AnimatePresence>
                            {qrScanned && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-10 bg-emerald-500/95 dark:bg-emerald-600/95 flex flex-col items-center justify-center gap-4 rounded-3xl"
                              >
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", bounce: 0.5 }}
                                >
                                  <CheckCircle2 className="w-28 h-28 text-white drop-shadow-2xl" />
                                </motion.div>
                                <p className="text-white text-3xl font-black tracking-wide">Absensi Tercatat!</p>
                                <p className="text-white/80 text-base font-medium">QR berhasil discan</p>
                                <div className="flex items-center gap-2 text-white/70 text-sm">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Memperbarui QR...
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {qrSessionActive && qrToken ? (
                            <div className="flex flex-col items-center gap-6">
                              {/* Countdown ring + QR */}
                              <div className="relative">
                                <svg className="w-72 h-72 -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="2" />
                                  <circle
                                    cx="50" cy="50" r="46"
                                    fill="none"
                                    stroke="url(#qrGrad)"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 46}`}
                                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - qrCountdown / QR_REFRESH_INTERVAL)}`}
                                    style={{ transition: "stroke-dashoffset 1s linear" }}
                                  />
                                  <defs>
                                    <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#6366f1" />
                                      <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-white dark:bg-white p-3 rounded-2xl shadow-xl">
                                    <QRCodeCanvas
                                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/absensi/verify?code=${encodeURIComponent(qrToken)}`}
                                      size={180}
                                      level="H"
                                      includeMargin={false}
                                      imageSettings={{
                                        src: "/favicon.ico",
                                        x: undefined,
                                        y: undefined,
                                        height: 28,
                                        width: 28,
                                        excavate: true,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between w-full px-2">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm font-medium">Refresh dalam</span>
                                </div>
                                <div className={`text-2xl font-black tabular-nums ${qrCountdown <= 10 ? "text-red-500 animate-pulse" : "text-indigo-600 dark:text-indigo-400"}`}>
                                  {qrCountdown}s
                                </div>
                              </div>

                              <div className="w-full bg-gray-100 dark:bg-gray-800/80 rounded-2xl px-5 py-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">Token Sesi</p>
                                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">{qrToken}</p>
                              </div>

                              <div className="flex gap-3 w-full">
                                <button
                                  onClick={refreshQRToken}
                                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all text-sm"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Refresh QR
                                </button>
                                <button
                                  onClick={stopQRSession}
                                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-sm"
                                >
                                  <X className="w-4 h-4" />
                                  Stop
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-8 py-8">
                              <div className="relative">
                                <div className="w-52 h-52 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                                  <QrCode className="w-24 h-24 text-indigo-400 dark:text-indigo-500" />
                                </div>
                                {(["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"] as const).map((cls, i) => (
                                  <div key={i} className={`absolute w-6 h-6 border-indigo-400 rounded-sm ${cls}`} />
                                ))}
                              </div>
                              <div className="text-center space-y-2">
                                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Buat sesi QR absensi</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">QR akan diperbarui setiap {QR_REFRESH_INTERVAL} detik</p>
                              </div>
                              <button
                                onClick={() => void startQRSession()}
                                disabled={qrSubmitting}
                                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                              >
                                {qrSubmitting ? (
                                  <><RefreshCw className="w-6 h-6 animate-spin" />Membuat Sesi...</>
                                ) : (
                                  <><Zap className="w-6 h-6" />Buat QR Absensi</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                              <p className="font-bold">Cara absen dengan QR:</p>
                              <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                                <li>Tekan <b>Buat QR Absensi</b></li>
                                <li>Tunjukkan QR ke peserta / tampilkan di layar</li>
                                <li>Peserta scan QR dengan HP mereka</li>
                                <li>Absensi otomatis tercatat — QR refresh tiap {QR_REFRESH_INTERVAL}s</li>
                              </ol>
                            </div>
                          </div>
                        </div>

                        {user && (
                          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl">
                              {user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-white">{user.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${qrSessionActive ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
                              <span className={`text-sm font-medium ${qrSessionActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}>
                                {qrSessionActive ? "Sesi aktif" : "Belum aktif"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <LocationPanel coords={coords} locationStatus={locationStatus} locationErrorMsg={locationErrorMsg} />
                    </div>

                    <div className="mt-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                      QR Code diperbarui otomatis setiap <b>{QR_REFRESH_INTERVAL} detik</b> untuk keamanan. Izinkan akses <b>Lokasi</b>.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      <FooterClient />
    </>
  );
}

// ── LocationPanel ─────────────────────────────────────────────────
interface LocationPanelProps {
  coords: Coordinates;
  locationStatus: string;
  locationErrorMsg: string;
}

function LocationPanel({ coords, locationStatus, locationErrorMsg }: LocationPanelProps) {
  const buildMapURL = (lat: number, lon: number): string =>
    `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.004},${lat - 0.004},${lon + 0.004},${lat + 0.004}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-white">
        <MapPin className="w-8 h-8 text-emerald-600" />
        Lokasi Real-time
      </h3>

      {locationStatus === "loading" && (
        <div className="text-center py-4 text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
          Mencari lokasi...
        </div>
      )}
      {locationStatus === "denied" && (
        <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-2xl text-red-800 dark:text-red-300">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" />
          <p className="font-bold text-center">Izin lokasi ditolak</p>
          <p className="mt-2 text-sm text-center">Izinkan akses lokasi di pengaturan browser.</p>
        </div>
      )}
      {locationErrorMsg && locationStatus !== "denied" && (
        <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {locationErrorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {(
          [
            { label: "Latitude",  value: coords.lat      ? coords.lat.toFixed(6)               : "..." },
            { label: "Longitude", value: coords.lon      ? coords.lon.toFixed(6)               : "..." },
            { label: "Akurasi",   value: coords.accuracy ? `${coords.accuracy.toFixed(0)} m`   : "..." },
            { label: "Waktu",     value: coords.timestamp ? new Date(coords.timestamp).toLocaleTimeString("id-ID") : "..." },
          ] as const
        ).map((item, i) => (
          <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-2 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl overflow-hidden shadow-2xl ring-2 ring-gray-300 dark:ring-gray-700">
        {coords.lat && coords.lon ? (
          <iframe src={buildMapURL(coords.lat, coords.lon)} className="w-full h-96" loading="lazy" title="Lokasi Anda" />
        ) : (
          <div className="h-96 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">{locationErrorMsg || "Menunggu sinyal lokasi..."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}