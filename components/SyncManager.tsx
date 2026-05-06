// components/SyncManager.tsx
"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function SyncManager() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Hanya aktif di halaman verify
    if (!pathname?.includes('/verify')) return;

    let lastAttendanceId: string | null = null;
    let isMounted = true;

    // Function untuk cek status dari server
    const checkServerStatus = async () => {
      if (!isMounted) return;
      
      try {
        const res = await fetch('/api/v1/attendance/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Baca cookie lokal
        const getLocalSession = () => {
          const match = document.cookie.match(/absensi_session=([^;]+)/);
          if (!match) return null;
          try {
            return JSON.parse(decodeURIComponent(match[1]));
          } catch {
            return null;
          }
        };
        
        const localSession = getLocalSession();
        
        // CASE 1: Server sudah clock out (selesai)
        if (data.alreadyDone === true || (data.checkedIn === false && data.hasAttendance === true)) {
          document.cookie = 'absensi_session=; path=/; max-age=0';
          
          if (localSession && isMounted) {
            console.log('🔄 Syncing: Server indicates clocked out');
            window.dispatchEvent(new CustomEvent('attendance-sync', { 
              detail: { type: 'CLOCK_OUT', source: 'polling' } 
            }));
            router.refresh();
          }
        }
        
        // CASE 2: Server tidak punya attendance aktif tapi lokal masih ada
        if (!data.hasAttendance && !data.checkedIn && localSession && isMounted) {
          console.log('🔄 Syncing: Server has no active session');
          document.cookie = 'absensi_session=; path=/; max-age=0';
          window.dispatchEvent(new CustomEvent('attendance-sync', { 
            detail: { type: 'CLEANUP', source: 'polling' } 
          }));
          router.refresh();
        }
        
        // CASE 3: Cek perubahan attendanceId
        if (data.attendanceId && data.attendanceId !== lastAttendanceId && isMounted) {
          lastAttendanceId = data.attendanceId;
          if (data.clockOut) {
            document.cookie = 'absensi_session=; path=/; max-age=0';
            router.refresh();
          }
        }
        
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // ✅ Perbaiki: gunakan const untuk interval (bukan let)
    const pollingInterval = setInterval(checkServerStatus, 3000);
    
    // Listen untuk broadcast channel (cross-tab)
    let broadcastChannel: BroadcastChannel | null = null;
    
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('attendance-sync');
      broadcastChannel.onmessage = (event) => {
        console.log('📡 Broadcast received:', event.data);
        if (event.data.type === 'CLOCK_OUT' || event.data.type === 'SESSION_CHANGED') {
          document.cookie = 'absensi_session=; path=/; max-age=0';
          router.refresh();
          if (isMounted) {
            window.location.reload();
          }
        }
      };
    }
    
    // Listen untuk storage event (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'absensi_session' && !e.newValue && isMounted) {
        console.log('🔄 Storage event: Session cookie removed');
        router.refresh();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen untuk custom event
    const handleCustomSync = (event: CustomEvent) => {
      console.log('🔄 Custom sync event:', event.detail);
      if (isMounted) {
        checkServerStatus();
      }
    };
    
    window.addEventListener('attendance-sync', handleCustomSync as EventListener);
    
    // Initial check
    checkServerStatus();
    
    return () => {
      isMounted = false;
      clearInterval(pollingInterval); 
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('attendance-sync', handleCustomSync as EventListener);
    };
  }, [router, pathname]);

  return null;
}