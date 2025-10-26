"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DarkModeContext } from "@/components/home/dark-mode";
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  Settings, 
  ChevronDown,
  Activity,
  LogIn
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | ""; text: string }>({
    type: "",
    text: "",
  });
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const darkModeContext = useContext(DarkModeContext);
  if (!darkModeContext) throw new Error("Navbar harus dibungkus dalam <DarkModeProvider />");
  const { darkMode, setDarkMode } = darkModeContext;

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    setUser(email);
  }, []);

  const handleLogout = () => {
    setLoading(true);
    setMessage({ type: "success", text: "Berhasil logout! Mengarahkan ke login..." });
    setTimeout(() => {
      localStorage.removeItem("userEmail");
      setUser(null);
      setLoading(false);
      setProfileOpen(false);
      setMenuOpen(false);
      router.push("/login");
    }, 1200);
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Absensi", href: "/absensi" },
    { name: "Kontak", href: "/kontak" },
  ];

  return (
    <>
      {/* Ultra Premium Animations & Effects */}
      <style jsx>{`
        @keyframes float3D {
          0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
          50% { transform: translateY(-8px) rotateX(3deg) rotateY(3deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.7), 0 0 75px rgba(99, 102, 241, 0.5); }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        .animate-float3D { animation: float3D 5s ease-in-out infinite; }
        .animate-pulseGlow { animation: pulseGlow 4s ease-in-out infinite; }
        .ripple::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 100%; height: 100%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 60%);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .ripple:active::before { animation: ripple 0.6s ease-out; }
      `}</style>

      <nav
        className={`sticky top-0 z-50 flex justify-between items-center px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-5 border-b backdrop-blur-3xl transition-all duration-700 shadow-md ${
          darkMode 
            ? "bg-gray-950/95 border-gray-900/50 text-gray-50" 
            : "bg-white/95 border-gray-100/50 text-gray-950"
        }`}
      >
        {/* Logo - 3D Float + Dynamic Glow */}
        <Link href="/" className="group relative perspective-1000">
          <motion.div 
            className="flex items-center gap-1 animate-float3D"
            whileHover={{ scale: 1.1, rotateY: 10, rotateX: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              RAD
              <motion.span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-300"
                animate={{ backgroundPosition: ["0%", "100%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 100%" }}
              >
                .
              </motion.span>
            </span>
            <motion.div 
              className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-cyan-300/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulseGlow"
            />
          </motion.div>
        </Link>

        {/* Desktop Navigation - Ripple Hover + Underline */}
        <ul className="hidden lg:flex items-center gap-2 xl:gap-4">
          {navItems.map((item, i) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <Link
                href={item.href}
                className="relative px-4 py-2.5 text-sm xl:text-base font-semibold transition-all duration-400 group overflow-hidden ripple"
              >
                <span className="relative z-10">{item.name}</span>
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 to-cyan-300 rounded-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.span 
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/5 to-cyan-300/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                />
              </Link>
            </motion.li>
          ))}
        </ul>

        {/* Right Actions - Responsive Gap */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Dark Mode Toggle - Flip Animation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full w-10 h-10 sm:w-11 sm:h-11 backdrop-blur-2xl hover:bg-white/10 dark:hover:bg-gray-800/50 transition-all duration-300"
          >
            <motion.div
              initial={false}
              animate={{ rotateY: darkMode ? 180 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="perspective-1000"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </Button>

          {/* User Profile Dropdown - Avatar + Status + Ultra Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full backdrop-blur-3xl border transition-all duration-300 hover:shadow-2xl group"
                style={{
                  background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"
                }}
              >
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-cyan-300 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <motion.div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulseGlow"
                  />
                </div>
                <span className="hidden sm:block text-sm font-semibold">{user.split("@")[0]}</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-400 group-hover:rotate-180" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -15, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className={`absolute right-0 mt-4 w-64 sm:w-72 rounded-3xl shadow-3xl overflow-hidden backdrop-blur-3xl border ${
                      darkMode ? "bg-gray-800/98 border-gray-700/50" : "bg-white/98 border-gray-200/50"
                    }`}
                  >
                    <div className="p-4 sm:p-5 border-b border-gray-200/30 dark:border-gray-700/30">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user}</p>
                      <p className="text-xs opacity-70 flex items-center gap-1 mt-1">
                        <Activity className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                        Online Sekarang
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 space-y-1">
                      {[
                        { icon: User, label: "Profil Saya", href: "/profile" },
                        { icon: Settings, label: "Pengaturan", href: "/settings" },
                      ].map((item, i) => (
                        <Link
                          key={i}
                          href={item.href}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                            darkMode ? "hover:bg-gray-700/70" : "hover:bg-gray-100/70"
                          }`}
                          onClick={() => setProfileOpen(false)}
                        >
                          <item.icon className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-300 ${
                          darkMode 
                            ? "hover:bg-red-900/40 text-red-400" 
                            : "hover:bg-red-50/70 text-red-600"
                        }`}
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {loading ? "Keluar..." : "Logout"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold px-5 sm:px-7 py-2 rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-400 text-sm sm:text-base"
            >
              <LogIn className="w-4 h-4 mr-1.5 sm:mr-2" />
              Logout
            </Button>
          )}

          {/* Mobile Menu Toggle - Rotate Icon */}
          <button
            className="lg:hidden p-2 rounded-full backdrop-blur-2xl hover:bg-white/10 dark:hover:bg-gray-800/50 transition-all duration-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <motion.div
              animate={{ rotate: menuOpen ? 90 : 0 }}
              transition={{ duration: 0.4 }}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.div>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-In Menu - Ultra Smooth */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={`fixed right-0 top-0 h-full w-80 sm:w-96 shadow-4xl z-50 p-6 sm:p-8 overflow-y-auto ${
                darkMode ? "bg-gray-950" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-center mb-10 sm:mb-12">
                <Link href="/" className="text-2xl sm:text-3xl font-extrabold">
                  RAD<span className="text-blue-500">.</span>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-3 sm:space-y-4 mb-10 sm:mb-12">
                {navItems.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className={`block px-5 sm:px-6 py-3 sm:py-4 rounded-3xl text-lg sm:text-xl font-bold transition-all duration-400 ${
                      darkMode ? "hover:bg-gray-800/70" : "hover:bg-gray-100/70"
                    } hover:shadow-md`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="space-y-3 sm:space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-base sm:text-lg py-6 sm:py-7 rounded-3xl font-semibold border-2"
                  onClick={() => {
                    setDarkMode(!darkMode);
                    setMenuOpen(false);
                  }}
                >
                  {darkMode ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </Button>

                {user ? (
                  <Button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full justify-center text-base sm:text-lg py-6 sm:py-7 rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-400"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    {loading ? "Keluar..." : "Logout"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/login");
                    }}
                    className="w-full justify-center text-base sm:text-lg py-6 sm:py-7 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-400"
                  >
                    <LogIn className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Alert - Ultra Floating */}
      <AnimatePresence>
        {message.type === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -70, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -70, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 600, damping: 35 }}
            className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50"
          >
            <Alert className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50 text-green-800 shadow-3xl backdrop-blur-2xl rounded-2xl">
              <Activity className="w-5 h-5 text-green-600 animate-pulse" />
              <AlertTitle className="font-extrabold text-base">Sukses!</AlertTitle>
              <AlertDescription className="font-medium text-sm">{message.text}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}