"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  RefreshCw,
  Search,
  MapPin,
  Camera,
  Calendar,
  Users,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  XCircle,
  CalendarCheck,
  Timer,
  ShieldCheck,
  LogIn,
  LogOut,
  Hourglass,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Image from "next/image";

interface AttendanceRecord {
  id: string;
  name: string;
  email?: string | null;
  method: "selfie" | "qr";
  clockIn?: string | null;
  clockOut?: string | null;
  photoUrl?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string | null;
  } | null;
  qrCode?: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  masihHadir: number;
  sudahPulang: number;
  tanpaLokasi: number;
}

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────
const formatTime = (dt: string | null | undefined) =>
  dt
    ? new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "—";

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

const calcDuration = (
  clockIn: string | null | undefined,
  clockOut: string | null | undefined
): string | null => {
  if (!clockIn) return null;
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  const totalMs = end - start;
  if (totalMs <= 0) return null;
  const totalSec = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
};

// ── Live duration cell — updates every minute for ongoing rows ────
function LiveDuration({
  clockIn,
  clockOut,
}: {
  clockIn?: string | null;
  clockOut?: string | null;
}) {
  const [dur, setDur] = useState(() => calcDuration(clockIn, clockOut));

  useEffect(() => {
    if (clockOut) return; // already checked out — static
    setDur(calcDuration(clockIn, clockOut));
    const interval = setInterval(() => setDur(calcDuration(clockIn, clockOut)), 60_000);
    return () => clearInterval(interval);
  }, [clockIn, clockOut]);

  if (!dur) return <span className="text-gray-400 text-xs">—</span>;

  const isOngoing = !clockOut;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
        isOngoing
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
          : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
      }`}
    >
      {isOngoing ? (
        <Timer className="w-3 h-3 animate-pulse" />
      ) : (
        <Hourglass className="w-3 h-3" />
      )}
      {dur}
      {isOngoing && <span className="opacity-60 text-[10px]">live</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function LaporanPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    masihHadir: 0,
    sudahPulang: 0,
    tanpaLokasi: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      const res = await fetch(`/api/v1/attendance/list?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Gagal memuat data");

      const data: AttendanceRecord[] = await res.json();
      setRecords(data);
      setStats({
        total: data.length,
        masihHadir: data.filter((d) => !d.clockOut).length,
        sudahPulang: data.filter((d) => !!d.clockOut).length,
        tanpaLokasi: data.filter((d) => !d.location).length,
      });
    } catch {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const name = r.name?.toLowerCase() ?? "";
      const email = r.email?.toLowerCase() ?? "";
      const qrCode = r.qrCode?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q) || qrCode.includes(q);
    });
  }, [records, search]);

  useEffect(() => { setPage(1); }, [search, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      const res = await fetch(`/api/v1/attendance/export?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Export gagal");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-absensi-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor data");
    } finally {
      setExporting(false);
    }
  };

  const mapsUrl = (loc?: AttendanceRecord["location"]) =>
    loc ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}` : null;

  const statCards = [
    {
      label: "Total Absensi",
      value: stats.total,
      icon: Users,
      gradient: "from-indigo-500 to-purple-600",
      bg: "from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-900/10",
      border: "border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Masih Hadir",
      value: stats.masihHadir,
      icon: LogIn,
      gradient: "from-emerald-500 to-teal-600",
      bg: "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Sudah Pulang",
      value: stats.sudahPulang,
      icon: LogOut,
      gradient: "from-blue-500 to-indigo-600",
      bg: "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Tanpa Lokasi",
      value: stats.tanpaLokasi,
      icon: MapPin,
      gradient: "from-rose-500 to-pink-600",
      bg: "from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/10",
      border: "border-rose-200 dark:border-rose-800",
      text: "text-rose-700 dark:text-rose-300",
    },
  ];

  const columns = [
    "No", "Karyawan", "Metode", "Tanggal",
    "Absen Masuk", "Absen Pulang", "Durasi",
    "Foto", "Lokasi",
  ];

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* ── Photo Preview Modal ── */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.75)" }}
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <Image
                src={previewPhoto}
                alt="Foto absensi"
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <a
                href={previewPhoto}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Buka Original
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout ── */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-black dark:via-gray-950 dark:to-indigo-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          >
            <div>
              <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Laporan Absensi
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">
                Rekap kehadiran via Selfie &amp; QR — Super Admin
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || records.length === 0}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {exporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {exporting ? "Mengekspor..." : "Export Excel"}
            </motion.button>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${s.bg} rounded-2xl p-5 border ${s.border} shadow-lg`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-md`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <p className={`text-4xl font-black ${s.text}`}>{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/80 rounded-2xl p-6 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, email, QR code..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 transition-all text-base"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-4 py-3.5 rounded-xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 pr-4 py-3.5 rounded-xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => void fetchData()}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Filter
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Memuat data...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                  <Users className="w-10 h-10 text-indigo-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">Tidak ada data absensi</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Coba ubah filter atau rentang tanggal</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
                      {columns.map((h) => (
                        <th
                          key={h}
                          className="px-5 py-4 text-left text-sm font-black tracking-wide whitespace-nowrap first:text-center"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/60 dark:divide-gray-800/60">
                    {paginated.map((att, i) => {
                      const clockInVal = att.clockIn ?? att.createdAt;
                      const isOngoing = !att.clockOut;
                      return (
                        <motion.tr
                          key={att.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors ${
                            isOngoing ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          {/* No */}
                          <td className="px-5 py-4 text-center">
                            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400 mx-auto">
                              {(safePage - 1) * PAGE_SIZE + i + 1}
                            </span>
                          </td>

                          {/* Karyawan */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                  {att.name?.[0]?.toUpperCase() ?? "?"}
                                </div>
                                {isOngoing && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-950 animate-pulse" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{att.name}</p>
                                {att.email && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{att.email}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Metode */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                att.method === "selfie"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                              }`}
                            >
                              {att.method === "selfie" ? <Camera className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                              {att.method === "selfie" ? "Selfie" : "QR Scan"}
                            </span>
                          </td>

                          {/* Tanggal */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              <CalendarCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              {new Date(att.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </div>
                          </td>

                          {/* Absen Masuk */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                                  <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm tabular-nums">
                                  {formatTime(clockInVal)}
                                </span>
                              </div>
                              <span className="pl-9 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                                {formatDate(clockInVal)}
                              </span>
                            </div>
                          </td>

                          {/* Absen Pulang */}
                          <td className="px-5 py-4">
                            {att.clockOut ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                    <LogOut className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-blue-700 dark:text-blue-400 font-black text-sm tabular-nums">
                                    {formatTime(att.clockOut)}
                                  </span>
                                </div>
                                <span className="pl-9 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                                  {formatDate(att.clockOut)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                </div>
                                <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">
                                  Belum pulang
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Durasi */}
                          <td className="px-5 py-4">
                            <LiveDuration clockIn={clockInVal} clockOut={att.clockOut} />
                          </td>

                          {/* Foto */}
                          <td className="px-5 py-4">
                            {att.method === "selfie" && att.photoUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(att.photoUrl ?? null)}
                                className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-indigo-300 dark:ring-indigo-700 hover:ring-indigo-500 transition-all group/photo shadow-md"
                              >
                                <Image
                                  src={att.photoUrl}
                                  alt="Foto selfie"
                                  fill
                                  className="object-cover group-hover/photo:scale-110 transition-transform"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/30 transition-colors flex items-center justify-center">
                                  <Camera className="w-5 h-5 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity drop-shadow" />
                                </div>
                              </button>
                            ) : att.method === "selfie" ? (
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                                <Camera className="w-3.5 h-3.5" />
                                Tanpa foto
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                                <QrCode className="w-3.5 h-3.5" />
                                QR only
                              </span>
                            )}
                          </td>

                          {/* Lokasi */}
                          <td className="px-5 py-4">
                            {att.location ? (
                              <a
                                href={mapsUrl(att.location) ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="group/loc flex flex-col gap-1 max-w-[130px]"
                              >
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm group-hover/loc:underline">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {att.location.address ||
                                      `${att.location.latitude.toFixed(4)}, ${att.location.longitude.toFixed(4)}`}
                                  </span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/loc:opacity-100 transition-opacity" />
                                </span>
                                {att.location.accuracy !== undefined && (
                                  <span className="text-xs text-gray-400 pl-5">
                                    ±{att.location.accuracy.toFixed(0)}m
                                  </span>
                                )}
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5" />
                                Tidak ada
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100/60 dark:border-gray-800/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    <span className="font-black text-gray-700 dark:text-gray-300">{filtered.length}</span> data
                    {" · "}Halaman{" "}
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{safePage}</span>
                    {" "}dari{" "}
                    <span className="font-black text-gray-700 dark:text-gray-300">{totalPages}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors ring-1 ring-gray-200 dark:ring-gray-700"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                    const p = start + i;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                          p === safePage
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110"
                            : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors ring-1 ring-gray-200 dark:ring-gray-700"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center gap-5 px-2 pb-4 text-xs text-gray-400 dark:text-gray-500"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Baris hijau = karyawan masih hadir (belum clock-out)
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              Durasi <i>live</i> diperbarui tiap 1 menit
            </span>
            <span className="flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
              Durasi final setelah clock-out
            </span>
          </motion.div>
        </div>
      </div>
    </>
  );
}