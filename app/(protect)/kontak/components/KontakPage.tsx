"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
    Mail,
    Phone,
    MapPin,
    Send,
    User,
    MessageSquare,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function KontakPage() {
    const nameRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) return toast.error("Nama wajib diisi");
        if (!formData.email.trim()) return toast.error("Email wajib diisi");
        if (!formData.message.trim()) return toast.error("Pesan wajib diisi");

        setIsSubmitting(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1800));

            toast.success("Pesan berhasil dikirim! Kami akan segera menghubungi kamu.", {
                duration: 6000,
            });

            // Reset form
            setFormData({ name: "", email: "", message: "" });
            nameRef.current?.focus();
        } catch (err) {
            toast.error("Gagal mengirim pesan. Coba lagi nanti.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Toaster position="top-center" richColors closeButton />

            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-black dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-6xl"
                >
                    {/* Header */}
                    <motion.div
                        className="text-center mb-12"
                        initial={{ y: -40 }}
                        animate={{ y: 0 }}
                    >
                        <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Hubungi Kami
                        </h1>
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 font-medium">
                            Ada pertanyaan? Kami siap membantu 24/7
                        </p>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Form Kontak */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="backdrop-blur-2xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-8 lg:p-12"
                        >
                            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                                <MessageSquare className="w-10 h-10 text-purple-600" />
                                Kirim Pesan
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="flex items-center gap-3 text-lg font-bold mb-3">
                                        <User className="w-6 h-6 text-indigo-600" />
                                        Nama Lengkap
                                    </label>
                                    <input
                                        ref={nameRef}
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-6 py-5 text-xl rounded-2xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all outline-none"
                                        placeholder="Masukkan nama kamu"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 text-lg font-bold mb-3">
                                        <Mail className="w-6 h-6 text-pink-600" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-6 py-5 text-xl rounded-2xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all outline-none"
                                        placeholder="example@gmail.com"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 text-lg font-bold mb-3">
                                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                                        Pesan
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows={6}
                                        className="w-full px-6 py-5 text-xl rounded-2xl bg-gray-100/70 dark:bg-gray-900/70 border border-gray-300/50 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all outline-none resize-none"
                                        placeholder="Tulis pesan kamu di sini..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full px-12 py-7 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl font-black rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-8 h-8" />
                                            Kirim Pesan
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>

                        {/* Info Kontak */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-8"
                        >
                            <div className="backdrop-blur-2xl bg-white/70 dark:bg-gray-950/80 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-8 lg:p-12">
                                <h2 className="text-3xl font-bold mb-8">Informasi Kontak</h2>

                                <div className="space-y-8">
                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <Mail className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                                Email
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                advent@mail.go.id
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                                            <Phone className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                                Telepon / WhatsApp
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                +62 812-3456-7890
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                            <MapPin className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                                Alamat Kantor
                                            </p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                                                PT PAL Indonesia (persero) <br />
                                                Jl. Ujung Surabaya Surabaya 60155 Indonesia
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 p-6 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-2xl border border-purple-500/20">
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        Respon dalam 1×24 jam (hari kerja)
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </>
    );
}