import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data = await prisma.absensi.findFirst({
    where: {
      userId: session.user.id,
      tanggal: today,
    },
  });

  return NextResponse.json(data);
}
