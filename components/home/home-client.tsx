// app/page.tsx
"use client";

import Image from "next/image";
import Foto from "@/public/image.jpg";
import { DataTableDemo } from "./home-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  Zap, Shield, Users, BarChart3, Clock, ArrowRight, Mail, Phone,
  Calendar, Activity, Globe, ChevronDown, Star
} from "lucide-react";
import { DarkModeContext } from "@/components/home/dark-mode";

// === VARIANTS (Ringan) ===
const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// === DATA ===
const stats = [
  { number: 250, suffix: "+", text: "Pengguna Aktif Global", icon: Users },
  { number: 20000, suffix: "+", text: "Data Tercatat", icon: BarChart3 },
  { number: 99.999, suffix: "%", text: "Uptime Sistem", icon: Shield },
];

const features = [
  { title: "Realtime AI", desc: "Absensi instan dengan deteksi AI dan notifikasi push.", icon: Zap },
  { title: "Dashboard Analitik", desc: "Visualisasi data real-time dan prediksi tren.", icon: BarChart3 },
  { title: "Skalabilitas Enterprise", desc: "Arsitektur modular, auto-scaling, low-code.", icon: Clock },
  { title: "Keamanan Quantum-Ready", desc: "Enkripsi AES-256, GDPR, ISO 27001 compliant.", icon: Shield },
];

const reviews = [
  { name: "Advent", role: "CEO TechCorp", rating: 5, review: "Efisiensi absensi naik 40% dalam 2 minggu. Dashboard AI-nya bikin HR kerja jadi lebih santai!" },
  { name: "Sarah", role: "HR Manager, Global Inc", rating: 5, review: "Insight AI-nya bener-bener actionable. Gak cuma data, tapi solusi langsung buat tim." },
  { name: "Michael", role: "CTO, Enterprise Solutions", rating: 5, review: "Skalabel untuk 10.000+ karyawan tanpa kendala. Setup 1 hari, langsung jalan mulus." },
];

const faqs = [
  { question: "Apa itu Sistem Absensi RAD AI?", answer: "Sistem absensi karyawan berbasis AI yang dikembangkan dengan metode RAD — cepat, stabil, dan mudah disesuaikan." },
  { question: "Apakah bisa terintegrasi dengan HRIS?", answer: "Ya. Dukung REST API, GraphQL, SAP, Oracle, Google Workspace." },
  { question: "Bagaimana keamanan data?", answer: "Enkripsi AES-256, zero-access, audit rutin, GDPR & ISO 27001." },
  { question: "Ada dukungan teknis?", answer: "Chat & email 24/7. Paket enterprise dapat SLA + onboarding." },
];

// === HERO SECTION ===
function HeroSection() {
  const onlineUsers = useMemo(() => Math.floor(Math.random() * 300 + 500), []);
  const activeUsers = useMemo(() => 300 + Math.floor(Math.random() * 50), []);

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-28 overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-black">
      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-gradient-to-br from-slate-400/5 to-gray-500/5 rounded-full animate-float-slow" />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-gradient-to-tl from-cyan-400/5 to-blue-500/5 rounded-full animate-float-slow-reverse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>{activeUsers} user aktif</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Absensi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Realtime</span>
              <br />
              <span className="text-3xl md:text-5xl text-gray-300">dengan </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-gray-300">RAD</span>
            </h1>

            <p className="text-base md:text-lg text-gray-300 max-w-xl leading-relaxed">
              Santai aja. Absen pake AI — cepat, akurat, dan bikin HR nggak pusing lagi.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold px-8 py-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base md:text-lg group">
                <span className="flex items-center gap-3">
                  Coba
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </span>
              </Button>
              <Button variant="outline" className="border-2 border-white/30 text-black px-8 py-6 rounded-xl font-bold hover:bg-white/10 transform hover:scale-105 transition-all duration-300 text-base md:text-lg">
                Lihat Demo
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              {[{ icon: Shield, text: "Super Aman" }, { icon: Activity, text: "AI Cerdas" }, { icon: Globe, text: "Siap Global" }].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-full px-5 py-3 border border-white/10">
                  <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">
            <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-cyan-300" />
                  <span className="text-white font-bold text-xl">Dashboard RAD</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse delay-300" />
                  <div className="w-3 h-3 bg-rose-400 rounded-full animate-pulse delay-700" />
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <Image
                  src={Foto}
                  alt="Dashboard RAD"
                  className="w-full h-64 sm:h-80 md:h-96 object-cover"
                  quality={70}
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                />
                <div className="absolute top-4 left-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                  <Activity className="w-5 h-5 animate-pulse" />
                  Live Sync
                </div>
                <div className="absolute bottom-4 right-4 bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm">
                  {onlineUsers} online
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                {[{ label: "Hadir", percent: 98, color: "from-emerald-400 to-teal-400" }, { label: "Terlambat", percent: 1, color: "from-amber-400 to-orange-400" }, { label: "Absen", percent: 1, color: "from-rose-400 to-pink-400" }].

map((stat, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-gray-300 text-xs font-medium">{stat.label}</p>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.color}`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                    <p className="text-white font-bold text-lg mt-1">{stat.percent}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 180" fill="none" className="w-full h-28 text-white" preserveAspectRatio="none">
          <path d="M0,100 C360,180 1080,20 1440,120 L1440,180 L0,180 Z" fill="currentColor" opacity="0.9" />
        </svg>
      </div>
    </section>
  );
}

// === MAIN COMPONENT ===
export default function HomeClient() {
  const { darkMode } = useContext(DarkModeContext) || { darkMode: false };
  const [counts, setCounts] = useState([0, 0, 0]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // COUNTER: requestAnimationFrame
  useEffect(() => {
    if (!isMounted) return;

    const targets = stats.map(s => s.number);
    const startTime = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCounts(targets.map(t => Math.floor(t * progress)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMounted]);

  if (!isMounted) return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black" />;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'} overflow-x-hidden`}>
      
      {/* HERO */}
      <HeroSection />

      {/* STATS */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  variants={slideUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <Icon className="w-12 h-12 text-cyan-400" />
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                    {counts[i]}{stat.suffix}
                  </h3>
                  <p className="mt-3 text-gray-300 text-lg">{stat.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DATA TABLE */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Data Absensi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Live</span>
          </h2>
          <div className="bg-white/5 rounded-2xl p-6 md:p-10 border border-white/10">
            <DataTableDemo />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Fitur <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Unggulan</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-white/10 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONI */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Apa Kata <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Mitra Kami</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Testimoni dari perusahaan dan tim yang telah menggunakan sistem absensi kami.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((r, i) => (
              <motion.div
                key={i}
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-white/10 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(r.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  ))}
                </div>
                <p className="text-gray-300 italic mb-6 leading-relaxed">“{r.review}”</p>
                <div>
                  <p className="text-white font-bold">{r.name}</p>
                  <p className="text-gray-400 text-sm">{r.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-center text-white mb-16">
            FAQ <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Santai</span>
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl border border-white/10 overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-6 text-left text-lg md:text-xl font-bold text-white hover:bg-gray-700 transition"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.question}
                  <ChevronDown className={`w-6 h-6 text-cyan-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 p-6' : 'max-h-0'}`}>
                  <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-7xl font-bold text-white mb-8">Siap Bikin Absen Jadi Santai?</h2>
          <Button className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold px-12 py-8 rounded-xl text-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300">
            Mulai Absen Sekarang
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">RAD</span> Absensi
              </h2>
              <p className="text-sm leading-relaxed">Absen pake AI. Cepat, akurat, dan bikin hidup HR jadi lebih chill.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Navigasi</h4>
              <ul className="space-y-2 text-sm">
                {["Home", "Absensi", "Kontak"].map((item) => (
                  <li key={item}><Link href="#" className="hover:text-cyan-400 transition">→ {item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Layanan</h4>
              <ul className="space-y-2 text-sm">
                {["Realtime", "Data Privacy", "Support 24/7"].map((item) => (
                  <li key={item} className="hover:text-cyan-400 transition cursor-pointer">• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Hubungi</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-400" /> advent@mail.go.id</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> +62 812-3456-7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} RAD Absensi. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Global CSS Animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(80px, -80px); }
        }
        @keyframes float-slow-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-80px, 80px); }
        }
        .animate-float-slow { animation: float-slow 20s infinite linear; }
        .animate-float-slow-reverse { animation: float-slow-reverse 18s infinite linear; }
      `}</style>
    </div>
  );
}