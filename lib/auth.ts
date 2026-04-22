import jwt from "jsonwebtoken";
import { UserAuth } from "@/types/auth";
import { cookies } from "next/headers";
import db from "./db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

/**
 * 🔥 HARD GUARD (WAJIB)
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables");
}

/**
 * 🔐 GENERATE TOKEN
 */
export const generateToken = (payload: UserAuth): string => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
  });
};

/**
 * 🔍 VERIFY TOKEN
 */
export const verifyToken = (token: string): UserAuth | null => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as UserAuth;
  } catch (err) {
    console.log("❌ verifyToken error:", err);
    return null;
  }
};

/**
 * 🧠 GET CURRENT USER (🔥 FIX UTAMA DI SINI)
 */
export const getCurrentUser = async () => {
  try {
    // ❗ FIX: cookies() itu synchronous
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    console.log("🍪 TOKEN:", token);

    if (!token) return null;

    const payload = verifyToken(token);

    console.log("📦 PAYLOAD:", payload);

    if (!payload) return null;

    // 🔥 FIX: cek expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.log("⛔ Token expired");
      return null;
    }

    // 🔍 Ambil user dari DB
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) return null;

    let roleId = "";
    let name = "";

    switch (user.role) {
      case "ADMIN":
        roleId = user.id;
        name = "Administrator";
        break;
      case "EMPLOYEE":
        roleId = user.id;
        name = user.name || "";
        break;
    }

    return {
      userId: user.id,
      roleId,
      email: user.email,
      name,
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
 * 🔐 CLIENT GUARD
 */
export const requireAuth = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

export const requireRole = async (allowedRoles: string[]) => {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
};

/**
 * 🌐 SERVER GUARD
 */
export const requireAuthOrNull = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return user;
};

export const requireRoleOrNull = async (allowedRoles: string[]) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
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
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};