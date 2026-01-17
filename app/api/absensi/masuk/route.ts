import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.absensi.findFirst({
    where: {
      userId: session.user.id,
      tanggal: today,
    },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Sudah absen hari ini" },
      { status: 409 }
    );
  }

  const absensi = await prisma.absensi.create({
    data: {
      userId: session.user.id,
      tanggal: today,
      masukAt: new Date(),
      statusMasuk: "HADIR",
    },
  });

  return NextResponse.json(absensi);
}
