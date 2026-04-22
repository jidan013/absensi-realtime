import { RefObject, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [active, setActive] = useState(false);

  const stop = useCallback((): void => {
    if (videoRef.current?.srcObject instanceof MediaStream) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t: MediaStreamTrack) => t.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, [videoRef]);

  const start = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!videoRef.current) return;
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= video.HAVE_CURRENT_DATA) { resolve(); return; }
        const onLoaded = (): void => { video.removeEventListener("loadeddata", onLoaded); resolve(); };
        video.addEventListener("loadeddata", onLoaded);
        video.play().catch(reject);
        setTimeout(() => reject(new Error("Timeout")), 10000);
      });
      setActive(true);
      toast.success("Kamera berhasil diaktifkan");
    } catch (err: unknown) {
      let message = "Kamera tidak dapat diakses";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") message = "Izin kamera ditolak. Izinkan di browser.";
        else if (err.name === "NotFoundError") message = "Tidak ditemukan kamera.";
      }
      toast.error(message);
    }
  }, [videoRef]);

  // Auto-cleanup saat unmount
  useEffect(() => () => stop(), [stop]);

  return { active, start, stop };
}