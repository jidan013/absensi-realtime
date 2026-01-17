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

  const absensi = await prisma.absensi.findFirst({
    where: {
      userId: session.user.id,
      tanggal: today,
    },
  });

  if (!absensi) {
    return NextResponse.json(
      { message: "Belum absen masuk" },
      { status: 400 }
    );
  }

  if (absensi.pulangAt) {
    return NextResponse.json(
      { message: "Sudah absen pulang" },
      { status: 409 }
    );
  }

  const updated = await prisma.absensi.update({
    where: { id: absensi.id },
    data: {
      pulangAt: new Date(),
      statusPulang: "PULANG",
    },
  });

  return NextResponse.json(updated);
}
