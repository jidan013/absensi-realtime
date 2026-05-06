import jwt from "jsonwebtoken";
import { UserAuth } from "@/types/auth";
import { cookies } from "next/headers";
import db from "./db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// ── Hard guard ────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables");
}

// ── Deteksi production ────────────────────────────────────────────
const isProd = process.env.NODE_ENV === "production";

/**
 * 🍪 SET AUTH COOKIE
 *
 * sameSite "none" + secure di production agar cookie ikut saat:
 *  - user scan QR dari HP (cross-site request)
 *  - buka link /verify?code=... dari kamera HP
 *
 * sameSite "lax" di development (localhost tidak support "none" tanpa HTTPS)
 */
export const setAuthCookie = async (token: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
};

/**
 * 🗑️ CLEAR AUTH COOKIE
 */
export const clearAuthCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set("access_token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });
};

/**
 * 🔐 GENERATE TOKEN
 *
 * FIX: tidak lagi terima exp/iat dari luar — biarkan jwt.sign yang handle
 * supaya tidak ada konflik dua exp field di payload.
 */
export const generateToken = (
  payload: Omit<UserAuth, "exp" | "iat">
): string => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
};

/**
 * 🔍 VERIFY TOKEN
 *
 * FIX: return type eksplisit, tidak cast langsung — pastikan payload ada
 * sebelum akses field apapun.
 */
export const verifyToken = (token: string): UserAuth | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // FIX: pastikan decoded bukan string (edge case jwt.verify)
    if (!decoded || typeof decoded === "string") return null;

    return decoded as UserAuth;
  } catch (err) {
    console.log("❌ verifyToken error:", err);
    return null;
  }
};

/**
 * 🧠 GET CURRENT USER
 *
 * FIX: cek payload null sebelum akses .exp
 */
export const getCurrentUser = async (): Promise<UserAuth | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);

    // FIX: null check sebelum akses payload.exp
    if (!payload) return null;

    // Cek expiry manual (defence in depth)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log("⛔ Token expired");
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) return null;

    return {
      userId: user.id,
      roleId: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(),
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch (error) {
    console.error("❌ getCurrentUser error:", error);
    return null;
  }
};

/**
 * 🔐 REQUIRE AUTH — throws jika tidak login
 */
export const requireAuth = async (): Promise<UserAuth> => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
};

export const requireRole = async (allowedRoles: string[]): Promise<UserAuth> => {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) throw new Error("Forbidden");
  return user;
};

/**
 * 🌐 SERVER GUARD — return NextResponse jika tidak login
 */
export const requireAuthOrNull = async (): Promise<UserAuth | NextResponse> => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
};

export const requireRoleOrNull = async (
  allowedRoles: string[]
): Promise<UserAuth | NextResponse> => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return user;
};

/**
 * 🔑 PASSWORD HELPERS
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};