"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useSession, signOut } from "next-auth/react"

type UserRole = "ADMIN" | "USER"
type User = {
  id: string
  name: string
  email: string
  role: UserRole
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return // NextAuth masih loading
    if (status === "authenticated" && session?.user) {
      setUser(session.user as User)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [status, session])

  const isAdmin = user?.role === "ADMIN"

  const login = async () => {
    // Trigger login flow - akan redirect ke login page
    window.location.href = "/login"
  }

  const logout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const value = {
    user,
    isLoading,
    isAdmin,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
