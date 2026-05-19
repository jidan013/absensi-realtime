"use client";

import { useEffect, useState } from "react";

export function AttendanceTimer() {
  const [duration, setDuration] = useState(0);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Ambil userId dari cookie/localStorage
  useEffect(() => {
    // Coba dari cookie
    const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
    if (cookieMatch) {
      try {
        const user = JSON.parse(decodeURIComponent(cookieMatch[1]));
        setUserId(user.userId);
      } catch {}
    }
    
    // Atau dari localStorage
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Ambil status attendance (pakai API publik)
  const fetchStatus = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`/api/v1/attendance/public-status?userId=${userId}`);
      const data = await res.json();
      
      if (data.success && data.data.clockInTime && !data.data.clockOutTime) {
        setClockInTime(new Date(data.data.clockInTime));
      } else {
        setClockInTime(null);
        setDuration(0);
      }
    } catch (error) {
      console.error("Fetch status error:", error);
    }
  };

  // Timer update
  useEffect(() => {
    if (!clockInTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      setDuration(Math.floor(diff / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [clockInTime]);

  // Refresh status setiap 5 detik
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  if (!clockInTime) return null;

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  return (
    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
      <p className="text-sm text-gray-500">Durasi Bekerja</p>
      <p className="text-2xl font-bold font-mono">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </p>
      <p className="text-xs text-amber-600 mt-1">
        ⏰ Timer tetap berjalan meskipun Anda logout
      </p>
    </div>
  );
}