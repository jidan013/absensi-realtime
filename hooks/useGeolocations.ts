import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface Coordinates {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

type LocationStatus =
  | "loading"
  | "success"
  | "fallback"
  | "error"
  | "denied"
  | "timeout"
  | "permanent-error";

interface IPApiResponse {
  latitude?: number;
  longitude?: number;
}

const MAX_RETRIES = 4;

export function useGeolocation() {
  const [coords, setCoords] = useState<Coordinates>({
    lat: null, lon: null, accuracy: null, timestamp: null,
  });
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [error, setError] = useState<string>("");

  const watchRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);

  const startWatching = useCallback((): (() => void) | undefined => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation tidak didukung di browser ini");
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    };

    const fallbackToIP = async (): Promise<void> => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("Fallback gagal");
        const data = (await res.json()) as IPApiResponse;
        if (data.latitude && data.longitude) {
          setCoords({ lat: data.latitude, lon: data.longitude, accuracy: 5000, timestamp: Date.now() });
          setStatus("fallback");
          setError("Menggunakan estimasi lokasi dari IP.");
          toast.info("Lokasi approximasi via IP digunakan.");
        } else throw new Error("No lat/lon");
      } catch {
        setStatus("permanent-error");
        setError("Lokasi tidak tersedia. Pastikan WiFi aktif, matikan VPN.");
        toast.error("Gagal mendapatkan lokasi.");
      }
    };

    const onSuccess = (pos: GeolocationPosition): void => {
      setCoords({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      setStatus("success");
      setError("");
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };

    const onError = (err: GeolocationPositionError): void => {
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        setStatus("denied");
        setError("Izin lokasi ditolak. Izinkan di pengaturan browser.");
        return;
      }
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => startWatching(), 8000);
      } else {
        void fallbackToIP();
      }
    };

    watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options);

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const cleanup = startWatching();
    return cleanup;
  }, [startWatching]);

  return { coords, status, error };
}