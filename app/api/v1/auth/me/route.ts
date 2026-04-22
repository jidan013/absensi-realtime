import { NextResponse } from "next/server";
import { requireAuthOrNull } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuthOrNull();

    if (user instanceof NextResponse) {
      return user; // kalau unauthorized
    }

    return NextResponse.json(
      { user },
      { status: 200 }
    );
  } catch (error) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}