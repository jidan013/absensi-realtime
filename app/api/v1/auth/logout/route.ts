// app/api/v1/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: "Logout berhasil" 
    });

    // ✅ Hanya hapus cookie auth (access_token)
    response.cookies.set({
      name: "access_token",
      value: "",
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 0,
    });

    // ✅ Hapus juga absensi_session (fallback)
    response.cookies.set({
      name: "absensi_session",
      value: "",
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 0,
    });

    // ❌ JANGAN hapus cookie user_id, user_name, user_role
    // Biarkan tetap ada untuk timer persistensi
    
    // Optional: Hapus session dari database (jika diperlukan)
    // const token = req.cookies.get("access_token")?.value;
    // if (token) {
    //   const payload = verifyToken(token);
    //   if (payload) {
    //     await db.session.deleteMany({ where: { userId: payload.userId } });
    //   }
    // }

    console.log("✅ Logout successful, auth cookies cleared, user_id cookie preserved for timer");

    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}