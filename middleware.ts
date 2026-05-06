// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpiredRuntimeEdge, getTokenPayloadEdge } from "./lib/auth-edge";

// Public paths yang tidak memerlukan auth
const publicPaths = ["/login", "/register", "/verify"];
const apiPublicPaths = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  
  // Log untuk debugging (hapus di production)
  if (process.env.NODE_ENV === "development") {
    console.log(`[Middleware] Path: ${pathname}, Has Token: ${!!token}`);
  }

  // Allow API public paths
  if (apiPublicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.includes("/_next") || 
      pathname.includes("/favicon.ico") || 
      pathname.includes("/public/")) {
    return NextResponse.next();
  }

  // Check if path is public
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  // Jika ada token, cek expired
  let isExpired = true;
  if (token) {
    isExpired = isTokenExpiredRuntimeEdge(token);
    
    // Jika token expired, hapus cookie
    if (isExpired) {
      console.log(`[Middleware] Token expired for path: ${pathname}`);
      const response = NextResponse.next();
      response.cookies.delete("access_token");
      
      // Redirect ke login jika bukan public path
      if (!isPublic && !pathname.startsWith("/api/")) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      return response;
    }
  }

  // 🔒 API routes protection (selain public API)
  if (pathname.startsWith("/api/") && !apiPublicPaths.some(p => pathname.startsWith(p))) {
    if (!token || isExpired) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please login first" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ✅ Public route - allow access
  if (isPublic) {
    // Jika sudah login dan mencoba akses login/register → redirect ke dashboard
    if (token && !isExpired && 
        (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/absensi", request.url));
    }
    return NextResponse.next();
  }

  // 🔒 Private route but no valid token
  if (!token || isExpired) {
    console.log(`[Middleware] No valid token for private path: ${pathname}`);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Valid token, proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};