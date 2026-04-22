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
  LogOut,
  Timer,
  CalendarCheck,
} from "lucide-react";
import Confetti from "react-confetti";
import { Toaster, toast } from "sonner";
import { useWindowSize } from "react-use";
import { QRCodeCanvas } from "qrcode.react";
import FooterClient from "@/components/layouts/Footer";
import { useUser } from "@/providers/auth-provider";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ── Custom Hooks ──────────────────────────────────────────────────
import { useCamera } from "@/hooks/useCamera";
import { useGeolocation } from "@/hooks/useGeolocations";

// ── Types ─────────────────────────────────────────────────────────
interface AttendanceResponse {
  success?: boolean;
  sessionToken?: string;
  data?: {
    id: string;
    qrCode: string;
    name: string;
    timestamp: number;
    photoUrl: string;
  };
  error?: string;
}

interface CheckoutResponse {
  error?: string;
  details?: string;
}

interface QRStatusResponse {
  scanned?: boolean;
  name?: string;
  attendanceId?: string;
  error?: string;
}

interface CheckInSession {
  attendanceId: string;
  name: string;
  checkInTime: number;
}

type AbsenMode = "face" | "qr";
type AppStep = "form" | "checked-in";

const QR_REFRESH_INTERVAL = 60;
const SESSION_KEY = "absensi_checkin_session";

// ── Helpers ───────────────────────────────────────────────────────
const generateQRToken = (userId: string): string => {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ABSEN-${userId}-${ts}-${rand}`;
};

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
};

const formatTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ── Success Popup ─────────────────────────────────────────────────
interface SuccessPopupProps {
  show: boolean;
  type: "checkin" | "checkout";
  userName?: string;
  duration?: string;
}

function SuccessPopup({ show, type, userName, duration }: SuccessPopupProps) {
  const isCheckout = type === "checkout";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.55)" }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center overflow-hidden"
          >
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl ${
                isCheckout
                  ? "bg-gradient-to-r from-orange-400 via-rose-500 to-pink-500"
                  : "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"
              }`}
            />
            <motion.div
              initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className={`mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center shadow-xl ${
                isCheckout
                  ? "bg-gradient-to-br from-orange-400 to-rose-500"
                  : "bg-gradient-to-br from-emerald-400 to-teal-500"
              }`}
            >
              {isCheckout
                ? <LogOut className="w-12 h-12 text-white" strokeWidth={2.5} />
                : <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-gray-900 dark:text-white mb-2"
            >
              {isCheckout ? "Absen Pulang!" : "Absensi Berhasil!"}
            </motion.h2>
            {userName && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-lg font-semibold mb-1 ${
                  isCheckout
                    ? "text-orange-500 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isCheckout ? `Sampai jumpa, ${userName}! 👋` : `Selamat datang, ${userName}! 👋`}
              </motion.p>
            )}
            {isCheckout && duration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-3 mb-2 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/30 rounded-2xl border border-orange-200 dark:border-orange-700"
              >
                <Timer className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 dark:text-orange-300 font-bold text-sm">
                  Durasi kerja: {duration}
                </span>
              </motion.div>
            )}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 dark:text-gray-400 text-sm mt-2"
            >
              {isCheckout ? "Kehadiran Anda telah selesai dicatat." : "Kehadiran Anda telah tercatat."}
              <br />
              Mengalihkan ke halaman utama...
            </motion.p>
            <motion.div className="mt-6 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3.2, ease: "linear", delay: 0.4 }}
                className={`h-full rounded-full ${
                  isCheckout
                    ? "bg-gradient-to-r from-orange-400 to-rose-500"
                    : "bg-gradient-to-r from-emerald-400 to-teal-500"
                }`}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── CheckedIn Screen ──────────────────────────────────────────────
interface CheckedInScreenProps {
  session: CheckInSession;
  onCheckOut: () => void;
  checkingOut: boolean;
}

function CheckedInScreen({ session, onCheckOut, checkingOut }: CheckedInScreenProps) {
  const [elapsed, setElapsed] = useState<number>(() => Date.now() - session.checkInTime);

  useEffect(() => {
    setElapsed(Date.now() - session.checkInTime);
    const interval = setInterval(() => setElapsed(Date.now() - session.checkInTime), 1000);
    return () => clearInterval(interval);
  }, [session.checkInTime]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const workdayMs = 8 * 60 * 60 * 1000;
  const progress = Math.min(elapsed / workdayMs, 1);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  const checkInDate = new Date(session.checkInTime).toLocaleDateString("id-ID", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <motion.div
      key="checked-in"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-10 py-6"
    >
      <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-700">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-700 dark:text-emerald-300 font-bold text-sm tracking-wide">
          Sedang Absen Masuk
        </span>
      </div>

      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="8" />
          <circle
            cx="110" cy="110" r={radius} fill="none" stroke="url(#timerGrad)" strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Timer className="w-6 h-6 text-emerald-500 mb-1" />
          <div className="text-4xl font-black tabular-nums text-gray-900 dark:text-white tracking-tight">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">Durasi kerja</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-900/10 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-4 h-4 text-indigo-500" />
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Jam Masuk</p>
          </div>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">{formatTime(session.checkInTime)}</p>
          <p className="text-xs text-indigo-500/70 dark:text-indigo-400/60 mt-1 leading-tight">{checkInDate}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/10 rounded-2xl p-5 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">Nama</p>
          </div>
          <p className="text-xl font-black text-purple-700 dark:text-purple-300 truncate">{session.name}</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
          <span>Progress hari kerja (8 jam)</span>
          <span className="tabular-nums">{Math.min(Math.round(progress * 100), 100)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all duration-1000"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCheckOut}
        disabled={checkingOut}
        className="relative w-full max-w-md flex items-center justify-center gap-4 px-10 py-7 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-2xl font-black rounded-3xl shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all overflow-hidden"
      >
        {checkingOut
          ? <><RefreshCw className="w-8 h-8 animate-spin" />Memproses...</>
          : <><LogOut className="w-8 h-8" />Akhiri Absen (Pulang)</>}
      </motion.button>

      <p className="text-sm text-gray-400 dark:text-gray-500 text-center max-w-xs">
        Tekan tombol di atas untuk mencatat waktu pulang. Data durasi kerja akan tersimpan otomatis.
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function AbsensiClient() {
  const { user } = useUser();
  const router = useRouter();

  // ── App state ──
  const [mode, setMode] = useState<AbsenMode>("face");
  const [appStep, setAppStep] = useState<AppStep>("form");
  const [checkInSession, setCheckInSession] = useState<CheckInSession | null>(null);
  const [checkingOut, setCheckingOut] = useState<boolean>(false);

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Custom hooks ──────────────────────────────────────────────
  // useCamera: mengelola stream kamera, start/stop, cleanup otomatis
  const camera = useCamera(videoRef);

  // useGeolocation: watchPosition + retry + IP fallback, cleanup otomatis
  const geo = useGeolocation();

  // ── Face state ──
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoURL, setPhotoURL] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // ── Success popup ──
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [successType, setSuccessType] = useState<"checkin" | "checkout">("checkin");
  const [successName, setSuccessName] = useState<string>("");
  const [successDuration, setSuccessDuration] = useState<string>("");

  // ── QR state ──
  const [qrToken, setQrToken] = useState<string>("");
  const [qrCountdown, setQrCountdown] = useState<number>(QR_REFRESH_INTERVAL);
  const [qrSubmitting, setQrSubmitting] = useState<boolean>(false);
  const [qrScanned, setQrScanned] = useState<boolean>(false);
  const [qrSessionActive, setQrSessionActive] = useState<boolean>(false);

  const { width, height } = useWindowSize();

  // ── Restore session ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored) as CheckInSession;
        if (
          session.attendanceId &&
          !session.attendanceId.startsWith("local-") &&
          typeof session.checkInTime === "number" &&
          session.checkInTime > 0
        ) {
          setCheckInSession(session);
          setAppStep("checked-in");
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch { localStorage.removeItem(SESSION_KEY); }
  }, []);

  // ── Init nama dari user ──
  useEffect(() => {
    nameInputRef.current?.focus();
    if (user?.name && !name.trim()) setName(user.name);
  }, [user]); // eslint-disable-line

  // ── Success popup + redirect ──
  const triggerSuccessAndRedirect = useCallback((
    type: "checkin" | "checkout",
    displayName?: string,
    duration?: string,
  ): void => {
    setSuccessType(type);
    setSuccessName(displayName ?? "");
    setSuccessDuration(duration ?? "");
    setShowSuccessPopup(true);
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setShowSuccessPopup(false);
      router.push("/");
    }, 3800);
  }, [router]);

  // ── Checkout ──
  const handleCheckOut = useCallback(async (): Promise<void> => {
    if (!checkInSession) return;
    setCheckingOut(true);

    const checkOutTime = Date.now();
    const durationMs = checkOutTime - checkInSession.checkInTime;
    const durationStr = formatDuration(durationMs);

    try {
      const res = await fetch("/api/v1/attendance/clockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: checkInSession.attendanceId,
          checkOutTime,
          durationMs,
          lat: geo.coords.lat,  // ← dari useGeolocation
          lon: geo.coords.lon,  // ← dari useGeolocation
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as CheckoutResponse;
        throw new Error(data.error ?? "Gagal menyimpan absen pulang");
      }

      localStorage.removeItem(SESSION_KEY);
      setCheckInSession(null);
      setAppStep("form");
      triggerSuccessAndRedirect("checkout", checkInSession.name, durationStr);
    } catch (err: unknown) {
      toast.error(
        "Gagal absen pulang: " + (err instanceof Error ? err.message : "Kesalahan tidak diketahui"),
        { duration: 6000 }
      );
    } finally {
      setCheckingOut(false);
    }
  }, [checkInSession, geo.coords, triggerSuccessAndRedirect]);

  // ── Photo capture ──
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
    camera.stop();           // ← dari useCamera
    setName("");
    setPhotoBlob(null);
    setPhotoURL("");
    setUploadProgress(0);
    nameInputRef.current?.focus();
    toast.info("Form di-reset");
  }, [camera]);

  // ── QR Session ──
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
          lat: geo.coords.lat,        // ← dari useGeolocation
          lon: geo.coords.lon,        // ← dari useGeolocation
          accuracy: geo.coords.accuracy,
          timestamp: geo.coords.timestamp ?? Date.now(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as AttendanceResponse;
        throw new Error(d.error ?? "Gagal membuat sesi QR");
      }
      const data = (await res.json()) as AttendanceResponse;
      const token = data.sessionToken ?? generateQRToken(user?.userId ?? "USER");
      setQrToken(token);
      setQrCountdown(QR_REFRESH_INTERVAL);
      setQrScanned(false);
      setQrSessionActive(true);
      toast.success("Sesi QR berhasil dibuat!");
    } catch {
      refreshQRToken();
      setQrSessionActive(true);
      toast.info("Sesi QR dibuat secara lokal.");
    } finally {
      setQrSubmitting(false);
    }
  }, [geo.coords, user?.userId, refreshQRToken]);

  const stopQRSession = useCallback((): void => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
    setQrSessionActive(false);
    setQrToken("");
    setQrCountdown(QR_REFRESH_INTERVAL);
    setQrScanned(false);
    toast.info("Sesi QR dihentikan.");
  }, []);

  // QR countdown timer
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

  // QR polling (cek apakah sudah di-scan)
  useEffect(() => {
    if (!qrSessionActive || !qrToken || qrScanned) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/attendance/qr-status?token=${encodeURIComponent(qrToken)}`);
        if (!res.ok) return;
        const data = (await res.json()) as QRStatusResponse;
        if (data.scanned && data.attendanceId) {
          setQrScanned(true);
          clearInterval(poll);
          const session: CheckInSession = {
            attendanceId: data.attendanceId,
            name: data.name ?? "User",
            checkInTime: Date.now(),
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          setCheckInSession(session);
          setAppStep("checked-in");
          triggerSuccessAndRedirect("checkin", session.name);
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [qrSessionActive, qrToken, qrScanned, refreshQRToken, triggerSuccessAndRedirect]);

  // Stop camera/QR session saat ganti mode
  useEffect(() => {
    if (mode === "face") {
      stopQRSession();
    } else {
      camera.stop();         // ← dari useCamera
      setPhotoBlob(null);
      setPhotoURL("");
    }
  }, [mode]); // eslint-disable-line

  // ── Submit Face ──
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
      formData.append("lat", geo.coords.lat?.toString() ?? "");    // ← dari useGeolocation
      formData.append("lon", geo.coords.lon?.toString() ?? "");    // ← dari useGeolocation
      formData.append("accuracy", geo.coords.accuracy?.toString() ?? "");
      formData.append("timestamp", geo.coords.timestamp?.toString() ?? Date.now().toString());
      formData.append("photo", photoBlob, `absensi_${Date.now()}.jpg`);

      const res = await fetch("/api/v1/attendance", { method: "POST", body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gagal mengirim absensi");
      }

      const data = (await res.json()) as AttendanceResponse;

      if (!data.data?.id) {
        throw new Error("Server tidak mengembalikan ID absensi. Hubungi administrator.");
      }

      const session: CheckInSession = {
        attendanceId: data.data.id,
        name: name.trim(),
        checkInTime: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setCheckInSession(session);

      resetFaceForm();
      setAppStep("checked-in");
      triggerSuccessAndRedirect("checkin", name.trim());
    } catch (err: unknown) {
      toast.error("Gagal mengirim: " + (err instanceof Error ? err.message : "Kesalahan tidak diketahui"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [name, photoBlob, geo.coords, resetFaceForm, triggerSuccessAndRedirect]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submitFace(); }
      if (e.key === "Escape") { e.preventDefault(); if (mode === "face") resetFaceForm(); else stopQRSession(); }
      if (e.key === " " && camera.active && !photoURL) { e.preventDefault(); capturePhoto(); }
      //                     ↑ camera.active dari useCamera
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera.active, photoURL, mode, submitFace, resetFaceForm, stopQRSession, capturePhoto]);

  // ══════════════════════════════════════════════════════════════════
  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
      <SuccessPopup show={showSuccessPopup} type={successType} userName={successName} duration={successDuration} />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-black dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-6xl">

          <motion.div className="text-center mb-10" initial={{ y: -40 }} animate={{ y: 0 }}>
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Absensi Realtime
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 font-medium">
              Verifikasi kehadiran • Real-time
            </p>
          </motion.div>

          <div className="backdrop-blur-2xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
            <div className="p-8 lg:p-12">
              <AnimatePresence mode="wait">

                {appStep === "checked-in" && checkInSession && (
                  <CheckedInScreen
                    key="checked-in"
                    session={checkInSession}
                    onCheckOut={() => void handleCheckOut()}
                    checkingOut={checkingOut}
                  />
                )}

                {appStep === "form" && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                    {/* Mode Toggle */}
                    <div className="flex justify-center mb-10">
                      <div className="flex bg-gray-100 dark:bg-gray-900 rounded-2xl p-1.5 shadow-inner ring-1 ring-black/5 dark:ring-white/10 gap-1">
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

                    <AnimatePresence mode="wait">

                      {/* ── FACE MODE ── */}
                      {mode === "face" && (
                        <motion.div
                          key="face"
                          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
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
                                  {!camera.active && !photoURL && (
                                    // ↑ camera.active dari useCamera
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
                                    onClick={() => camera.active ? camera.stop() : void camera.start()}
                                    // ↑ camera.active / camera.stop / camera.start dari useCamera
                                    className="flex-1 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3"
                                  >
                                    <Camera className="w-6 h-6" />
                                    {camera.active ? "Matikan Kamera" : "Nyalakan Kamera"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!camera.active}    // ← camera.active dari useCamera
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
                                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
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

                              {/* LocationPanel menerima data dari useGeolocation */}
                              <LocationPanel
                                coords={geo.coords}
                                locationStatus={geo.status}
                                locationErrorMsg={geo.error}
                              />
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
                                  <><Send className="w-8 h-8" />Kirim Absensi</>
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

                      {/* ── QR MODE ── */}
                      {mode === "qr" && (
                        <motion.div
                          key="qr"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                        >
                          <div className="grid lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                              <h3 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-white">
                                <QrCode className="w-8 h-8 text-purple-600" />
                                QR Code Absensi Anda
                              </h3>
                              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-2 border-gray-200 dark:border-gray-800 p-8">
                                <AnimatePresence>
                                  {qrScanned && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                      className="absolute inset-0 z-10 bg-emerald-500/95 dark:bg-emerald-600/95 flex flex-col items-center justify-center gap-4 rounded-3xl"
                                    >
                                      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5 }}>
                                        <CheckCircle2 className="w-28 h-28 text-white drop-shadow-2xl" />
                                      </motion.div>
                                      <p className="text-white text-3xl font-black tracking-wide">Absensi Tercatat!</p>
                                      <p className="text-white/80 text-base font-medium">QR berhasil discan</p>
                                      <div className="flex items-center gap-2 text-white/70 text-sm">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Mengalihkan...
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                {qrSessionActive && qrToken ? (
                                  <div className="flex flex-col items-center gap-6">
                                    <div className="relative">
                                      <svg className="w-72 h-72 -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="2" />
                                        <circle
                                          cx="50" cy="50" r="46" fill="none" stroke="url(#qrGrad)"
                                          strokeWidth="2.5" strokeLinecap="round"
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
                                            value={`${window.location.origin}/verify?code=${encodeURIComponent(qrToken)}`}
                                            size={180} level="H" includeMargin={false}
                                            imageSettings={{ src: "/favicon.ico", x: undefined, y: undefined, height: 28, width: 28, excavate: true }}
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
                                      {qrSubmitting
                                        ? <><RefreshCw className="w-6 h-6 animate-spin" />Membuat Sesi...</>
                                        : <><Zap className="w-6 h-6" />Buat QR Absensi</>}
                                    </button>
                                  </div>
                                )}
                              </div>
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

                            {/* LocationPanel menerima data dari useGeolocation */}
                            <LocationPanel
                              coords={geo.coords}
                              locationStatus={geo.status}
                              locationErrorMsg={geo.error}
                            />
                          </div>
                          <div className="mt-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                            QR Code diperbarui otomatis setiap <b>{QR_REFRESH_INTERVAL} detik</b> untuk keamanan. Izinkan akses <b>Lokasi</b>.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
import type { Coordinates } from "@/hooks/useGeolocations";

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
        {([
          { label: "Latitude",  value: coords.lat      ? coords.lat.toFixed(6)             : "..." },
          { label: "Longitude", value: coords.lon      ? coords.lon.toFixed(6)             : "..." },
          { label: "Akurasi",   value: coords.accuracy ? `${coords.accuracy.toFixed(0)} m` : "..." },
          { label: "Waktu",     value: coords.timestamp ? new Date(coords.timestamp).toLocaleTimeString("id-ID") : "..." },
        ] as const).map((item, i) => (
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