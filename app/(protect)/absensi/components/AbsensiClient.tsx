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
} from "lucide-react";
import Confetti from "react-confetti";
import { Toaster, toast } from "sonner";
import { useWindowSize } from "react-use";
import Image from "next/image";
import FooterClient from "@/components/layouts/Footer";

interface Coordinates {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

export default function AbsensiClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watchRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoURL, setPhotoURL] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const [coords, setCoords] = useState<Coordinates>({
    lat: null,
    lon: null,
    accuracy: null,
    timestamp: null,
  });

  const { width, height } = useWindowSize();

  // Focus input nama saat mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Geolocation watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung di browser ini");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({
          lat: latitude,
          lon: longitude,
          accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Gagal mendapatkan lokasi");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchRef.current = watchId;

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  // Stop camera helper (stable)
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject instanceof MediaStream) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  // Ensure camera is stopped on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1920, height: 1080 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Kamera tidak dapat diakses – gunakan Upload Foto");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setPhotoURL(URL.createObjectURL(blob));
          toast.success("Foto berhasil diambil!");
        }
      },
      "image/jpeg",
      0.95
    );
  }, []);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoBlob(file);
    setPhotoURL(URL.createObjectURL(file));
    toast.success("Foto berhasil di-upload!");
  }, []);

  const resetForm = useCallback(() => {
    stopCamera();
    setName("");
    setPhotoBlob(null);
    setPhotoURL("");
    setUploadProgress(0);
    nameInputRef.current?.focus();
    toast.info("Form di-reset");
  }, [stopCamera]);

  // Single submit function (optional event allowed)
  const submitAttendance = useCallback(
    async (e?: FormEvent<HTMLFormElement> | globalThis.KeyboardEvent) => {
      e?.preventDefault?.();

      if (!name.trim()) {
        toast.error("Nama wajib diisi");
        return;
      }
      if (!photoBlob) {
        toast.error("Ambil atau upload foto terlebih dahulu");
        return;
      }

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

        const res = await fetch("/api/attendance", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Gagal mengirim absensi");
        }

        toast.success("Absensi berhasil dikirim!", { duration: 5000 });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
        resetForm();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error("Gagal mengirim: " + message);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [name, photoBlob, coords, resetForm]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Enter + Ctrl/Cmd → submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void submitAttendance();
      }

      // Escape → reset
      if (e.key === "Escape") {
        e.preventDefault();
        resetForm();
      }

      // Space → capture
      if (e.key === " " && streamActive && !photoURL) {
        e.preventDefault();
        capturePhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [streamActive, photoURL, submitAttendance, resetForm, capturePhoto]);

  const mapURL = (lat: number, lon: number) =>
    `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.004},${lat - 0.004},${lon + 0.004},${lat + 0.004}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-black dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-6xl">
          {/* Header */}
          <motion.div className="text-center mb-10" initial={{ y: -40 }} animate={{ y: 0 }}>
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Absensi Realtime
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 font-medium">Verifikasi kehadiran • Real-time</p>
          </motion.div>

          {/* Card */}
          <div className="backdrop-blur-2xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
            <div className="p-8 lg:p-12">
              <form onSubmit={(e) => void submitAttendance(e)} className="space-y-12">
                {/* Nama */}
                <div className="relative group">
                  <label className="flex items-center gap-3 text-lg font-bold text-gray-800 dark:text-white">
                    <User className="w-6 h-6 text-indigo-600" />
                    Nama Lengkap
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-3 w-full px-6 py-5 text-xl rounded-2xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all outline-none"
                    placeholder="Masukkan nama Anda"
                  />
                </div>

                {/* Grid Utama */}
                <div className="grid lg:grid-cols-2 gap-10">
                  {/* Kamera */}
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
                          <p className="text-white text-2xl font-bold tracking-wider">Tekan tombol untuk mengaktifkan kamera</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        type="button"
                        onClick={() => (streamActive ? stopCamera() : void startCamera())}
                        className="flex-1 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3"
                      >
                        <Camera className="w-6 h-6" />
                        {streamActive ? "Matikan Kamera" : "Nyalakan Kamera"}
                      </button>

                      <button
                        type="button"
                        disabled={!streamActive}
                        onClick={() => void capturePhoto()}
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
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white dark:ring-gray-900">
                          <Image src={photoURL} alt="Preview selfie" className="w-full object-cover" />
                          <button type="button" onClick={() => { setPhotoURL(""); setPhotoBlob(null); }} className="absolute top-4 right-4 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl">
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

                  {/* Lokasi */}
                  <div className="space-y-8">
                    <h3 className="flex items-center gap-3 text-2xl font-bold">
                      <MapPin className="w-8 h-8 text-emerald-600" />
                      Lokasi Real-time
                    </h3>

                    <div className="grid grid-cols-2 gap-5">
                      {["Latitude", "Longitude", "Akurasi", "Waktu"].map((label, i) => (
                        <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-800">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
                            {i === 0
                              ? coords.lat?.toFixed(6) ?? "..."
                              : i === 1
                              ? coords.lon?.toFixed(6) ?? "..."
                              : i === 2
                              ? coords.accuracy
                                ? `${coords.accuracy.toFixed(0)} m`
                                : "..."
                              : coords.timestamp
                              ? new Date(coords.timestamp).toLocaleTimeString()
                              : "..."}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl overflow-hidden shadow-2xl ring-2 ring-gray-300 dark:ring-gray-700">
                      {coords.lat && coords.lon ? (
                        <iframe src={mapURL(coords.lat, coords.lon)} className="w-full h-96" loading="lazy" title="Lokasi Anda" />
                      ) : (
                        <div className="h-96 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 text-lg">Menunggu sinyal GPS...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit & Reset */}
                <div className="pt-8 flex flex-col sm:flex-row gap-6 items-center">
                  <button type="submit" disabled={uploading || !photoBlob || !name.trim()} className="relative flex-1 w-full sm:w-auto px-12 py-7 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl font-black rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 overflow-hidden">
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

                  <button type="button" onClick={resetForm} className="px-10 py-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-lg rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                    Reset
                  </button>
                </div>
              </form>

              <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
                <p>
                  Izinkan Akses <b>Kamera</b> dan <b>Lokasi</b> untuk mengirimkan absensi.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <FooterClient />
    </>
  );
}