// components/SyncManager.tsx
"use client";

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export function SyncManager() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Function untuk refresh semua data
  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all data...');
    
    await queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    
    router.refresh();
  }, [queryClient, router]);

  useEffect(() => {
    if (!pathname?.includes('/verify') && !pathname?.includes('/absensi')) return;

    let lastStatus: string | null = null;
    let isMounted = true;

    const checkServerStatus = async () => {
      if (!isMounted) return;
      
      try {
        const res = await fetch('/api/v1/attendance/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        const currentStatus = JSON.stringify({
          checkedIn: data.checkedIn,
          alreadyDone: data.alreadyDone,
          hasAttendance: data.hasAttendance,
          clockOut: data.clockOut,
          attendanceId: data.attendanceId
        });
        
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
        
        if (lastStatus && lastStatus !== currentStatus) {
          console.log('🔄 Status changed, syncing...');
          
          if (data.alreadyDone === true || (data.checkedIn === false && data.hasAttendance === true)) {
            document.cookie = 'absensi_session=; path=/; max-age=0';
            
            if (localSession && isMounted) {
              console.log('🔄 Syncing: Server indicates clocked out');
              const syncEvent = new CustomEvent('attendance-sync', { 
                detail: { type: 'CLOCK_OUT', source: 'polling', data } 
              });
              window.dispatchEvent(syncEvent);
              await refreshAllData();
            }
          }
          
          if (!data.hasAttendance && !data.checkedIn && localSession && isMounted) {
            console.log('🔄 Syncing: Server has no active session');
            document.cookie = 'absensi_session=; path=/; max-age=0';
            const syncEvent = new CustomEvent('attendance-sync', { 
              detail: { type: 'CLEANUP', source: 'polling' } 
            });
            window.dispatchEvent(syncEvent);
            await refreshAllData();
          }
          
          if (data.clockOut && lastStatus && !JSON.parse(lastStatus).clockOut) {
            console.log('🔄 Syncing: Clock out detected');
            document.cookie = 'absensi_session=; path=/; max-age=0';
            await refreshAllData();
          }
        }
        
        lastStatus = currentStatus;
        
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const pollingInterval = setInterval(checkServerStatus, 3000);
    
    let broadcastChannel: BroadcastChannel | null = null;
    
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('attendance-sync');
      broadcastChannel.onmessage = async (event) => {
        console.log('📡 Broadcast received:', event.data);
        if (event.data.type === 'CLOCK_OUT' || event.data.type === 'SESSION_CHANGED') {
          document.cookie = 'absensi_session=; path=/; max-age=0';
          await refreshAllData();
        }
      };
    }
    
    // ✅ Fix: Storage event handler - synchronous
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attendance_sync' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'CLOCK_OUT' || data.type === 'SESSION_CHANGED') {
            console.log('🔄 Storage event: Syncing...');
            document.cookie = 'absensi_session=; path=/; max-age=0';
            refreshAllData();
          }
        } catch {}
      }
      
      if (e.key === 'absensi_session' && !e.newValue && isMounted) {
        console.log('🔄 Storage event: Session cookie removed');
        refreshAllData();
      }
    };
    
    // ✅ Fix: Custom event handler - synchronous wrapper
    const handleCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Custom sync event:', customEvent.detail);
      if (isMounted) {
        checkServerStatus();
        refreshAllData();
      }
    };
    
    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('🔄 Tab became visible, checking status...');
        checkServerStatus();
      }
    };
    
    // Online handler
    const handleOnline = () => {
      if (isMounted) {
        console.log('🔄 Network online, syncing...');
        checkServerStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('attendance-sync', handleCustomSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    checkServerStatus();
    
    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('attendance-sync', handleCustomSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [router, pathname, queryClient, refreshAllData]);

  return null;
}