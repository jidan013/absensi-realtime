"use client";

import { UserAuth } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AuthContextType = {
  user: UserAuth | null;
  isLoading: boolean;
  refetchUser: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserMe = async (): Promise<UserAuth | null> => {
  try {
    const res = await axios.get("/api/v1/auth/me", {
      withCredentials: true,
    });
    return res.data?.data ?? res.data?.user ?? null;
  } catch (err) {
    const error = err as AxiosError;
    if (error.response?.status === 401) return null;
    throw err;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchUserMe,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // ✅ Function untuk refresh user
  const refreshUserData = async () => {
    console.log("🔄 AuthProvider: Refreshing user data...");
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    refetch();
  };

  // ✅ Handle attendance sync (dengan type yang benar)
  useEffect(() => {
    // Handler untuk custom event
    const handleAttendanceSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("🔄 AuthProvider: Attendance sync event received", customEvent.detail);
      refreshUserData();
    };

    // Handler untuk storage change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "attendance_sync" || e.key === "access_token" || e.key === "absensi_session") {
        console.log("🔄 AuthProvider: Storage event detected", e.key);
        refreshUserData();
      }
    };

    // Handler untuk visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("🔄 AuthProvider: Tab became visible, refreshing...");
        refreshUserData();
      }
    };

    // Handler untuk online event
    const handleOnline = () => {
      console.log("🔄 AuthProvider: Network online, refreshing...");
      refreshUserData();
    };

    // Broadcast channel untuk cross-tab/device
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel("attendance-sync");
      broadcastChannel.onmessage = (event) => {
        console.log("📡 AuthProvider: Broadcast received", event.data);
        if (event.data.type === "CLOCK_OUT" || event.data.type === "LOGOUT" || event.data.type === "SESSION_CHANGED") {
          refreshUserData();
        }
      };
    }

    // Register event listeners
    window.addEventListener("attendance-sync", handleAttendanceSync);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Polling setiap 30 detik (fallback)
    const interval = setInterval(() => {
      refreshUserData();
    }, 30000);

    return () => {
      window.removeEventListener("attendance-sync", handleAttendanceSync);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      if (broadcastChannel) broadcastChannel.close();
      clearInterval(interval);
    };
  }, [queryClient, refetch]);

  const isAuthenticated = !!user && user.userId !== undefined;

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser: refetch, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser harus digunakan dalam AuthProvider");
  return ctx;
};