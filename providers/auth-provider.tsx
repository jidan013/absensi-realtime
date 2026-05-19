"use client";

import { UserAuth } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { createContext, useContext, ReactNode, useEffect, useRef } from "react";
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
    // 401 = belum login, bukan error — return null saja
    if (error.response?.status === 401) return null;
    // 403, 500, dll — lempar supaya React Query bisa retry/handle
    throw err;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  // ✅ Guard supaya tidak spam refresh
  const isRefreshing = useRef(false);

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

  const refreshUserData = async () => {
    // ✅ Hindari concurrent refresh
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await refetch();
    } finally {
      isRefreshing.current = false;
    }
  };

  useEffect(() => {
    const handleAttendanceSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("🔄 Attendance sync event", customEvent.detail);
      refreshUserData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "attendance_sync" ||
        e.key === "access_token" ||
        e.key === "absensi_session"
      ) {
        console.log("🔄 Storage event:", e.key);
        refreshUserData();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshUserData();
      }
    };

    const handleOnline = () => {
      console.log("🔄 Network online, refreshing...");
      refreshUserData();
    };

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel("attendance-sync");
      broadcastChannel.onmessage = (event) => {
        console.log("📡 Broadcast received", event.data);
        if (
          event.data.type === "CLOCK_OUT" ||
          event.data.type === "LOGOUT" ||
          event.data.type === "SESSION_CHANGED"
        ) {
          refreshUserData();
        }
      };
    }

    window.addEventListener("attendance-sync", handleAttendanceSync);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // ✅ Polling hanya jika user sudah login (hindari spam 401)
    const interval = setInterval(() => {
      const cached = queryClient.getQueryData<UserAuth | null>(["auth", "me"]);
      if (cached) refreshUserData();
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
    <AuthContext.Provider
      value={{ user, isLoading, refetchUser: refetch, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser harus digunakan dalam AuthProvider");
  return ctx;
};