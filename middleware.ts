import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpiredRuntimeEdge } from "./lib/auth-edge";

// ✅ tambahkan verify sebagai public
const publicPaths = ["/login", "/register", "/verify"];

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  console.log("Path:", pathname);
  console.log("Token:", !!token);

  // allow root
  if (pathname === "/") {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 🔐 cek token expired (hanya kalau ada token)
  if (token && isTokenExpiredRuntimeEdge(token)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    return response;
  }

  // ✅ kalau PUBLIC route
  if (isPublic) {
    // kalau sudah login & buka login/register → redirect ke dashboard
    if (token && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/absensi", request.url));
    }

    return NextResponse.next();
  }

  // 🔒 PRIVATE route tapi tidak ada token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ✅ lolos semua
  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};