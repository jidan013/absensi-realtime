// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpiredRuntimeEdge } from "./lib/auth-edge";

const publicPaths = ["/login", "/register", "/verify"];
const apiPublicPaths = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  
  // ✅ Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(response, request);
    return response;
  }

  // Allow API public paths
  if (apiPublicPaths.some(path => pathname.startsWith(path))) {
    const response = NextResponse.next();
    setCorsHeaders(response, request);
    return response;
  }

  // Allow static files
  if (pathname.includes("/_next") || 
      pathname.includes("/favicon.ico") || 
      pathname.includes("/public/")) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  let isExpired = true;
  if (token) {
    isExpired = isTokenExpiredRuntimeEdge(token);
    
    if (isExpired) {
      const response = NextResponse.next();
      response.cookies.delete("access_token");
      setCorsHeaders(response, request);
      
      if (!isPublic && !pathname.startsWith("/api/")) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }
  }

  // API routes protection
  if (pathname.startsWith("/api/") && !apiPublicPaths.some(p => pathname.startsWith(p))) {
    if (!token || isExpired) {
      const response = NextResponse.json(
        { success: false, error: "Unauthorized: Please login first" },
        { status: 401 }
      );
      setCorsHeaders(response, request);
      return response;
    }
    const response = NextResponse.next();
    setCorsHeaders(response, request);
    return response;
  }

  // Public route
  if (isPublic) {
    if (token && !isExpired && 
        (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/absensi", request.url));
    }
    const response = NextResponse.next();
    setCorsHeaders(response, request);
    return response;
  }

  // Private route but no valid token
  if (!token || isExpired) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  setCorsHeaders(response, request);
  return response;
}

// ✅ Helper function untuk CORS headers
function setCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production")) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};