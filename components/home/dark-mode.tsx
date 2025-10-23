"use client";

import React, { createContext, useState, Dispatch, SetStateAction } from "react";

// ✔️ 1. Definisikan tipe untuk Context
type DarkModeContextType = {
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
};

// ✔️ 2. Buat Context dengan tipe
export const DarkModeContext = createContext<DarkModeContextType | undefined>(
  undefined
);

type DarkModeProviderProps = {
  children: React.ReactNode;
};

export function DarkModeProvider({ children }: DarkModeProviderProps) {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}
