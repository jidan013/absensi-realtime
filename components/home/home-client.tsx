// app/page.tsx
"use client";

import { DataTableDemo } from "./home-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { motion, Variants } from "framer-motion";
import {
  Zap,
  Shield,
  Users,
  BarChart3,
  Clock,
  ArrowRight,
  Mail,
  Phone,
  Calendar,
  Activity,
  Globe,
  ChevronDown,
  Star,
  Award,
  CheckCircle,
  Smartphone,
  Cloud,
  Database,
  RefreshCw,
  Eye,
} from "lucide-react";
import { DarkModeContext } from "@/components/home/dark-mode";
import { useUser } from "@/providers/auth-provider";
import { useAttendanceStatus } from "@/hooks/useAttendanceStatus";

interface DashboardStats {
  totalUsers: number;
  todayAttendance: number;
  activeNow: number;
  totalAttendance: number;
  averageAttendance: number;
}

// === VARIANTS ===
const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// === FEATURES DATA ===
const features = [
  { title: "Face Recognition", desc: "Deteksi wajah akurat dengan teknologi AI canggih.", icon: Zap, color: "from-cyan-400 to-blue-500" },
  { title: "Multi-Device Sync", desc: "Akses dari HP, laptop, atau tablet dengan sinkronisasi real-time.", icon: Smartphone, color: "from-emerald-400 to-teal-500" },
  { title: "Cloud Based", desc: "Data tersimpan aman di cloud dengan backup otomatis.", icon: Cloud, color: "from-purple-400 to-pink-500" },
  { title: "Analytics Dashboard", desc: "Visualisasi data kehadiran dengan grafik interaktif.", icon: BarChart3, color: "from-orange-400 to-red-500" },
  { title: "QR Code Scan", desc: "Absen cepat dengan scan QR code dari perangkat apapun.", icon: Globe, color: "from-cyan-400 to-blue-500" },
  { title: "Laporan Real-time", desc: "Generate laporan kehadiran instan kapan saja.", icon: Clock, color: "from-emerald-400 to-teal-500" },
];

const reviews = [
  { name: "Advent", role: "CEO TechCorp", rating: 5, review: "Efisiensi absensi naik 40% dalam 2 minggu. Dashboard AI-nya bikin HR kerja jadi lebih santai!" },
  { name: "Sarah", role: "HR Manager", rating: 5, review: "Insight AI-nya bener-bener actionable. Gak cuma data, tapi solusi langsung buat tim." },
  { name: "Michael", role: "CTO Enterprise", rating: 5, review: "Skalabel untuk 10.000+ karyawan tanpa kendala. Setup 1 hari, langsung jalan mulus." },
  { name: "Jessica", role: "Operation Director", rating: 5, review: "Customer support sangat responsif. Fitur face recognition-nya akurat banget!" },
];

const faqs = [
  { question: "Apa itu Sistem Absensi RAD AI?", answer: "Sistem absensi karyawan berbasis AI yang dikembangkan dengan metode RAD — cepat, stabil, dan mudah disesuaikan dengan kebutuhan perusahaan." },
  { question: "Apakah bisa terintegrasi dengan HRIS?", answer: "Ya. Dukung REST API, GraphQL, SAP, Oracle, dan Google Workspace untuk integrasi seamless." },
  { question: "Bagaimana keamanan data?", answer: "Enkripsi AES-256, zero-access data policy, audit rutin, dan compliant dengan GDPR & ISO 27001." },
  { question: "Ada dukungan teknis?", answer: "Chat & email support 24/7. Paket enterprise mendapatkan SLA dedicated dan onboarding assistance." },
  { question: "Berapa lama implementasi?", answer: "Rata-rata implementasi hanya 1-3 hari untuk perusahaan skala menengah." },
];

// === HERO SECTION ===
function HeroSection({ activeUsers }: { activeUsers: number }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-28 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-float-slow-reverse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.div variants={slideUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>{activeUsers.toLocaleString()} user aktif sekarang</span>
          </motion.div>

          <motion.h1 variants={slideUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            Absensi{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Realtime
            </span>
            <br />
            <span className="text-2xl md:text-4xl text-gray-300">dengan Teknologi</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-gray-300">
              RAD AI
            </span>
          </motion.h1>

          <motion.p variants={slideUp} className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mt-6">
            Sistem absensi pintar berbasis AI yang membuat HR lebih santai. 
            Cepat, akurat, dan terintegrasi dengan berbagai platform.
          </motion.p>

          <motion.div variants={slideUp} className="flex flex-wrap gap-3 justify-center mt-8">
            {[
              { icon: Shield, text: "Enterprise Grade" },
              { icon: Activity, text: "AI Powered" },
              { icon: Globe, text: "Global Ready" },
              { icon: CheckCircle, text: "ISO 27001" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <item.icon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-gray-200">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs">Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}

// === STATS SECTION ===
function StatsSection({ stats: dashboardStats, onRefresh }: { stats: DashboardStats; onRefresh?: () => void }) {
  const stats = [
    { number: dashboardStats.totalUsers, suffix: "", text: "Total Pengguna", icon: Users, color: "from-cyan-400 to-blue-500" },
    { number: dashboardStats.todayAttendance, suffix: "", text: "Hadir Hari Ini", icon: CheckCircle, color: "from-emerald-400 to-teal-500" },
    { number: dashboardStats.averageAttendance, suffix: "%", text: "Rata-rata Kehadiran", icon: Shield, color: "from-purple-400 to-pink-500" },
  ];

  const [counts, setCounts] = useState([0, 0, 0]);

  useEffect(() => {
    const targets = stats.map((s) => s.number);
    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCounts(targets.map((t) => Math.floor(t * progress)));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [dashboardStats]);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <Award className="w-8 h-8 text-cyan-400/20" />
                </div>
                <h3 className="text-4xl md:text-5xl font-bold text-white">
                  {counts[i].toLocaleString()}{stat.suffix}
                </h3>
                <p className="mt-2 text-gray-400">{stat.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// === FEATURES SECTION ===
function FeaturesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Fitur{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Unggulan
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Dilengkapi dengan teknologi AI terbaru untuk kemudahan absensi
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 hover:-translate-y-2 transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// === TESTIMONIALS SECTION ===
function TestimonialsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Apa Kata{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Klien Kami
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Dipercaya oleh berbagai perusahaan dari berbagai skala
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(review.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm italic mb-4 leading-relaxed">
                &quot;{review.review}&quot;
              </p>
              <div>
                <p className="text-white font-semibold">{review.name}</p>
                <p className="text-gray-500 text-xs">{review.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// === FAQ SECTION ===
function FAQSection({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: (i: number | null) => void }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Questions
            </span>
          </h2>
          <p className="text-gray-400">Jawaban untuk pertanyaan yang sering diajukan</p>
        </motion.div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                className="w-full flex justify-between items-center p-5 text-left font-semibold text-white hover:bg-white/5 transition-all duration-300"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.question}</span>
                <motion.div
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-cyan-400" />
                </motion.div>
              </button>
              <motion.div
                initial={false}
                animate={{ height: openFaq === i ? "auto" : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-5 pt-0">
                  <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// === CTA SECTION ===
function CTASection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Siap Bikin Absen Jadi Lebih Mudah?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Bergabunglah dengan ribuan perusahaan yang sudah menggunakan sistem absensi RAD
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={isAuthenticated ? "/absensi" : "/register"}>
              <Button className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-6 rounded-xl text-lg hover:scale-105 transition-all duration-300">
                {isAuthenticated ? "Mulai Absen" : "Daftar Sekarang"}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// === FOOTER ===
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              RAD<span className="text-cyan-400">.</span>Absensi
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Solusi absensi pintar berbasis AI untuk perusahaan modern.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Produk</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/absensi" className="hover:text-cyan-400 transition">Absensi</Link></li>
              <li><Link href="/laporan" className="hover:text-cyan-400 transition">Laporan</Link></li>
              <li><Link href="/users" className="hover:text-cyan-400 transition">Manajemen User</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-cyan-400 transition">Tentang Kami</Link></li>
              <li><Link href="/contact" className="hover:text-cyan-400 transition">Kontak</Link></li>
              <li><Link href="/privacy" className="hover:text-cyan-400 transition">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@radabsensi.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +62 812-3456-7890</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} RAD Absensi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// === ADMIN ONLY DATA TABLE SECTION ===
function AdminDataSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium">ADMIN ACCESS</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Data Absensi{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Seluruh Karyawan
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Pantau kehadiran seluruh karyawan secara real-time
          </p>
        </motion.div>
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <DataTableDemo />
        </div>
      </div>
    </section>
  );
}

// === MAIN COMPONENT ===
export default function HomeClient() {
  const { isAuthenticated, user } = useUser();
  const { data: attendanceStatus, refetch: refetchStatus } = useAttendanceStatus();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    todayAttendance: 0,
    activeNow: 0,
    totalAttendance: 0,
    averageAttendance: 0,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === "ADMIN" || user?.role === "admin";

  // Fetch real data from API
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/dashboard/stats", {
        credentials: "include",
        cache: "no-store",
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDashboardStats(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    await refetchStatus();
  };

  // Auto refresh when attendance status changes
  useEffect(() => {
    if (attendanceStatus) {
      fetchDashboardStats();
    }
  }, [attendanceStatus, fetchDashboardStats]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardStats();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <HeroSection activeUsers={dashboardStats.activeNow} />
      <StatsSection stats={dashboardStats} onRefresh={handleRefresh} />
      <FeaturesSection />
      
      {/* ✅ Data Table Section - ONLY FOR ADMIN */}
      {isAdmin && <AdminDataSection />}
      
      {/* Optional: Message for non-admin users */}
      {!isAdmin && isAuthenticated && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-12 border border-white/10"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-2xl mb-4 mx-auto">
                <Eye className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Data Absensi Karyawan
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Halaman data absensi hanya dapat diakses oleh administrator. 
                Silakan hubungi admin jika Anda memerlukan akses.
              </p>
            </motion.div>
          </div>
        </section>
      )}

      <TestimonialsSection />
      <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <CTASection isAuthenticated={isAuthenticated} />
      <Footer />

      {refreshing && (
        <div className="fixed bottom-4 right-4 bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-sm shadow-lg animate-pulse">
          Refreshing...
        </div>
      )}

      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(80px, -80px); }
        }
        @keyframes float-slow-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-80px, 80px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: float-slow-reverse 18s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}