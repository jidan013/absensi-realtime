import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.absensi.findMany({
    where: { userId: session.user.id },
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json(history);
}
