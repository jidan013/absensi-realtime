// components/GlobalTimer.tsx
"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

export function GlobalTimer() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [timerData, setTimerData] = useState<{
    name: string;
    clockInTime: string;
  } | null>(null);
  const [duration, setDuration] = useState(0);

  // Ambil userId dari cookie (tetap ada meskipun logout)
  const getUserId = () => {
    const match = document.cookie.match(/user_id=([^;]+)/);
    return match ? match[1] : null;
  };

  // Ambil status timer dari server
  const fetchTimerStatus = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      const res = await fetch(`/api/v1/attendance/timer-status?userId=${userId}`);
      const data = await res.json();
      
      if (data.success && data.isClockedIn && data.data) {
        setIsClockedIn(true);
        setTimerData({
          name: data.data.name,
          clockInTime: data.data.clockInTime,
        });
        const clockInTime = new Date(data.data.clockInTime).getTime();
        setDuration(Date.now() - clockInTime);
      } else {
        setIsClockedIn(false);
        setTimerData(null);
      }
    } catch (error) {
      console.error("Failed to fetch timer:", error);
    }
  };

  // Update timer setiap detik
  useEffect(() => {
    if (!isClockedIn || !timerData) return;
    
    const interval = setInterval(() => {
      const clockInTime = new Date(timerData.clockInTime).getTime();
      setDuration(Date.now() - clockInTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isClockedIn, timerData]);

  // Fetch status setiap 5 detik
  useEffect(() => {
    fetchTimerStatus();
    const interval = setInterval(fetchTimerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isClockedIn || !timerData) return null;

  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-2xl p-4 cursor-pointer hover:scale-105 transition-transform duration-300">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 bg-white rounded-full absolute -top-1 -right-1 animate-ping" />
            <div className="w-2 h-2 bg-white rounded-full absolute -top-1 -right-1 animate-pulse" />
            <Timer className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs opacity-80 font-medium">Sedang Bekerja</p>
            <p className="text-2xl font-bold font-mono tracking-wider">
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
            <p className="text-xs opacity-80 mt-0.5">{timerData.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}