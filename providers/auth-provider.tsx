"use client";

import { UserAuth } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type AuthContextType = {
  user: UserAuth | null;
  isLoading: boolean;
  refetchUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserMe = async (): Promise<UserAuth | null> => {
  try {
    const res = await axios.get("/api/v1/auth/me", {
      withCredentials: true,
    });
    return res.data?.user ?? null;
  } catch (err) {
    const error = err as AxiosError;
    // 401 = belum login / cookie expired → bukan error, return null
    if (error.response?.status === 401) return null;
    // Error lain (500, network) → throw supaya useQuery tahu ada masalah
    throw err;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchUserMe,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser: refetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser harus digunakan dalam AuthProvider");
  return ctx;
};