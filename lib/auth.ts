// lib/auth.ts
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
  
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  
  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    domain: domain,
  });
};

/**
 * 🍪 SET SESSION COOKIE (non-httpOnly untuk frontend)
 */
export const setSessionCookie = async (data: {
  userId: string;
  name: string;
  email: string;
  role: string;
}): Promise<void> => {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  
  cookieStore.set("user_session", JSON.stringify(data), {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    domain: domain,
  });
};

/**
 * 🗑️ CLEAR AUTH COOKIE
 */
export const clearAuthCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  
  cookieStore.set("access_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 0,
    domain: domain,
  });
  
  // Juga hapus session cookie
  cookieStore.set("user_session", "", {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 0,
    domain: domain,
  });
};

/**
 * 🗑️ CLEAR ALL COOKIES
 */
export const clearAllCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  
  const cookiesToClear = ["access_token", "user_session", "absensi_session"];
  
  for (const cookieName of cookiesToClear) {
    cookieStore.set(cookieName, "", {
      httpOnly: cookieName === "access_token",
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 0,
      domain: domain,
    });
  }
};

/**
 * 🔐 GENERATE TOKEN
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
 */
export const verifyToken = (token: string): UserAuth | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded || typeof decoded === "string") return null;

    return decoded as UserAuth;
  } catch (err) {
    console.log("❌ verifyToken error:", err);
    return null;
  }
};

/**
 * 🧠 GET CURRENT USER
 */
export const getCurrentUser = async (): Promise<UserAuth | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Cek expiry manual
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

/**
 * 🔐 REQUIRE ROLE
 */
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

/**
 * 🌐 SERVER GUARD WITH ROLE
 */
export const requireRoleOrNull = async (
  allowedRoles: string[]
): Promise<UserAuth | NextResponse> => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
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

/**
 * 📝 GET USER FROM SESSION COOKIE (Frontend helper)
 */
export const getUserFromSessionCookie = async (): Promise<{
  userId: string;
  name: string;
  email: string;
  role: string;
} | null> => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("user_session")?.value;
    
    if (!sessionCookie) return null;
    
    return JSON.parse(sessionCookie);
  } catch (error) {
    console.error("Error parsing session cookie:", error);
    return null;
  }
};

/**
 * 🔄 REFRESH TOKEN
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const newToken = generateToken({
      userId: user.userId,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: new Date().toISOString(),
    });
    
    await setAuthCookie(newToken);
    return newToken;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
};