"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useContext } from "react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DarkModeContext } from "@/components/home/dark-mode"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | ""; text: string }>({
    type: "", text: ""
  })

  // ✅ Safe access context
  const darkModeContext = useContext(DarkModeContext)
  if (!darkModeContext) {
    throw new Error("Navbar harus dibungkus dengan <DarkModeProvider />")
  }

  const { darkMode, setDarkMode } = darkModeContext

  useEffect(() => {
    const email = localStorage.getItem("userEmail")
    setUser(email)
  }, [])

  const handleLogout = () => {
    setMessage({ type: "success", text: "Logout berhasil! Tunggu sebentar..." })
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <nav
      className={`flex justify-between items-center py-4 px-4 shadow-2xl 
      ${darkMode ? "bg-gray-900 text-black" : "bg-white text-black"}`}
    >
      <Link href="/">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-black"}`}>RAD</h1>
      </Link>

      <ul className={`flex space-x-4 ${darkMode ? "text-white" : "text-black"}`}>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/absensi">Absensi</Link></li>
      </ul>

      {message.type === "success" && (
        <Alert className="absolute top-16 right-4 w-auto">
          <AlertTitle>Berhasil</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        {/* 🌓 Toggle Dark Mode */}
        <Button
          variant="outline"
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-xl"
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </Button>

        {user && <span className="text-sm">Hi, {user}</span>}
        <Button
          className="bg-black rounded-2xl"
          variant="destructive"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </nav>
  )
}
