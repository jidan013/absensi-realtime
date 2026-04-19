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
  CheckCircle2,
  Clock,
  XCircle,
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
  selfie: number;
  qrScan: number;
  tanpaLokasi: number;
}

const PAGE_SIZE = 10;

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
    selfie: 0,
    qrScan: 0,
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
        selfie: data.filter((d) => d.method === "selfie").length,
        qrScan: data.filter((d) => d.method === "qr").length,
        tanpaLokasi: data.filter((d) => !d.location).length,
      });
    } catch {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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

  const formatTime = (dt: string | null | undefined) =>
    dt ? new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const mapsUrl = (loc?: AttendanceRecord["location"]) =>
    loc ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}` : null;

  return (
    <>
      <Toaster position="top-center" richColors />

      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
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
                className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
                aria-label="Tutup preview"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <a
                href={previewPhoto}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                Buka Original
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-black dark:to-indigo-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                Laporan{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Absensi
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Rekap kehadiran via Selfie & QR — Super Admin
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || records.length === 0}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all"
            >
              {exporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {exporting ? "Mengekspor..." : "Export Excel"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Absensi", value: stats.total, icon: Users, color: "from-indigo-500 to-purple-600" },
              { label: "Selfie", value: stats.selfie, icon: Camera, color: "from-emerald-500 to-teal-600" },
              { label: "QR Scan", value: stats.qrScan, icon: QrCode, color: "from-blue-500 to-indigo-600" },
              { label: "Tanpa Lokasi", value: stats.tanpaLokasi, icon: MapPin, color: "from-rose-500 to-pink-600" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-800"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, email, QR code..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-gray-500">Memuat data...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Users className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg font-medium">Tidak ada data absensi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      {["No", "Karyawan", "Metode", "Tanggal", "Jam Masuk", "Jam Keluar", "Foto", "Lokasi", "QR Code"].map((h) => (
                        <th key={h} className="px-5 py-4 text-left text-sm font-bold whitespace-nowrap first:text-center">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginated.map((att, i) => (
                      <motion.tr
                        key={att.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <td className="px-5 py-4 text-center text-sm font-bold text-gray-400">
                          {(safePage - 1) * PAGE_SIZE + i + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                              {att.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{att.name}</p>
                              {att.email && <p className="text-xs text-gray-500 dark:text-gray-400">{att.email}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              att.method === "selfie"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                            }`}
                          >
                            {att.method === "selfie" ? <Camera className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                            {att.method === "selfie" ? "Selfie" : "QR Scan"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(att.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            {formatTime(att.clockIn ?? att.createdAt)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {att.clockOut ? (
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-sm">
                              <Clock className="w-4 h-4" />
                              {formatTime(att.clockOut)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              Belum keluar
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {att.method === "selfie" && att.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(att.photoUrl ?? null)}
                              className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-indigo-300 hover:ring-indigo-500 transition-all group"
                            >
                              <Image
                                src={att.photoUrl}
                                alt="Foto selfie"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ) : att.method === "selfie" ? (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5" />
                              Tanpa foto
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" />
                              QR only
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {att.location ? (
                            <a
                              href={mapsUrl(att.location) ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-col gap-1 text-emerald-600 dark:text-emerald-400 hover:underline text-sm font-medium"
                            >
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-[100px]">
                                  {att.location.address ||
                                    `${att.location.latitude.toFixed(4)}, ${att.location.longitude.toFixed(4)}`}
                                </span>
                              </span>
                              {att.location.accuracy !== undefined && (
                                <span className="text-xs opacity-75">Akurasi: {att.location.accuracy.toFixed(0)}m</span>
                              )}
                              <ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto" />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              Tidak ada
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 truncate max-w-[120px] block">
                            {att.qrCode ?? "—"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filtered.length} data • Halaman {safePage} dari {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
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
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}