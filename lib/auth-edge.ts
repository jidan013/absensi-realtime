// lib/auth-edge.ts
import { UserAuth } from "@/types/auth";

/**
 * Cek apakah token expired di Edge Runtime (tanpa jwt library)
 * Ini lebih ringan dan cepat untuk middleware
 */
export function isTokenExpiredRuntimeEdge(token: string): boolean {
  if (!token || token === "") return true;
  
  try {
    // Parse JWT token tanpa verifikasi signature (hanya untuk cek expired)
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    
    const payloadBase64 = parts[1];
    if (!payloadBase64) return true;
    
    // Decode base64 (handle URL-safe base64)
    let decoded = payloadBase64;
    // Replace URL-safe characters
    decoded = decoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (decoded.length % 4) {
      decoded += '=';
    }
    
    const decodedPayload = atob(decoded);
    const payload = JSON.parse(decodedPayload);
    
    const { exp } = payload;
    
    // Jika tidak ada exp, anggap expired
    if (!exp || typeof exp !== 'number') return true;
    
    // exp dalam detik, konversi ke milidetik
    const expired = exp * 1000 < Date.now();
    
    if (expired) {
      console.log("⏰ Token expired at:", new Date(exp * 1000).toISOString());
    }
    
    return expired;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Assume expired if error
  }
}

/**
 * Extract payload dari token (tanpa verifikasi)
 * Untuk digunakan di middleware
 */
export function getTokenPayloadEdge(token: string): UserAuth | null {
  if (!token || token === "") return null;
  
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payloadBase64 = parts[1];
    if (!payloadBase64) return null;
    
    // Decode base64 URL-safe
    let decoded = payloadBase64;
    decoded = decoded.replace(/-/g, '+').replace(/_/g, '/');
    while (decoded.length % 4) {
      decoded += '=';
    }
    
    const decodedPayload = atob(decoded);
    const payload = JSON.parse(decodedPayload);
    
    return payload as UserAuth;
  } catch (error) {
    console.error("Error extracting token payload:", error);
    return null;
  }
}

/**
 * Cek apakah token valid (tidak expired) di Edge Runtime
 */
export function isTokenValidEdge(token: string): boolean {
  if (!token || token === "") return false;
  return !isTokenExpiredRuntimeEdge(token);
}