// hooks/useAttendanceStatus.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";

interface AttendanceStatus {
  success?: boolean;
  checkedIn: boolean;
  alreadyDone: boolean;
  hasAttendance?: boolean;
  attendanceId: string | null;
  clockIn: string | null;
  clockOut: string | null;
  name: string | null;
  durationText?: string;
}

async function fetchAttendanceStatus(): Promise<AttendanceStatus> {
  try {
    const res = await fetch("/api/v1/attendance/me", {
      credentials: "include",
      cache: "no-store",
    });
    
    if (!res.ok) {
      // Jika 401 atau error, return default
      return {
        checkedIn: false,
        alreadyDone: false,
        hasAttendance: false,
        attendanceId: null,
        clockIn: null,
        clockOut: null,
        name: null,
      };
    }
    
    return await res.json();
  } catch (error) {
    console.error("Fetch attendance status error:", error);
    return {
      checkedIn: false,
      alreadyDone: false,
      hasAttendance: false,
      attendanceId: null,
      clockIn: null,
      clockOut: null,
      name: null,
    };
  }
}

export function useAttendanceStatus() {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);
  
  const query = useQuery({
    queryKey: ["attendance", "status"],
    queryFn: fetchAttendanceStatus,
    refetchInterval: 3000, // Polling setiap 3 detik
    refetchIntervalInBackground: true,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });

  // Broadcast ke komponen lain ketika status berubah (hanya jika benar-benar berbeda)
  useEffect(() => {
    if (query.data) {
      const currentStatus = JSON.stringify({
        checkedIn: query.data.checkedIn,
        alreadyDone: query.data.alreadyDone,
        clockOut: query.data.clockOut,
      });
      
      // Hanya broadcast jika status berubah
      if (previousStatusRef.current !== currentStatus) {
        previousStatusRef.current = currentStatus;
        
        console.log("📡 Attendance status changed:", query.data);
        
        const event = new CustomEvent("attendance-status-change", {
          detail: query.data,
        });
        window.dispatchEvent(event);
        
        // Storage event untuk cross-tab
        localStorage.setItem("attendance_sync", JSON.stringify({
          type: "STATUS_CHANGE",
          data: query.data,
          timestamp: Date.now()
        }));
        setTimeout(() => localStorage.removeItem("attendance_sync"), 100);
      }
    }
  }, [query.data]);

  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
  }, [queryClient]);

  const isActive = query.data?.checkedIn === true && query.data?.alreadyDone === false;
  const isCompleted = query.data?.alreadyDone === true;

  return { 
    ...query, 
    refetch,
    isActive,
    isCompleted,
  };
}