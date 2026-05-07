export function broadcastSync(type: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  
  // BroadcastChannel untuk cross-tab/device
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("attendance-sync");
    channel.postMessage({ type, timestamp: Date.now(), ...data });
    channel.close();
  }
  
  // Storage event sebagai fallback
  localStorage.setItem("attendance_sync", JSON.stringify({ type, timestamp: Date.now(), ...data }));
  setTimeout(() => localStorage.removeItem("attendance_sync"), 100);
  
  // Custom event untuk halaman yang sama
  const event = new CustomEvent("attendance-sync", { 
    detail: { type, ...data } 
  });
  window.dispatchEvent(event);
}