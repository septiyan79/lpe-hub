import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== session.user.id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const { act, tglAct, status } = await req.json();
  if (!act?.trim()) return NextResponse.json({ error: "Aktivitas wajib diisi" }, { status: 400 });

  const progress = await prisma.progress.create({
    data: {
      act: act.trim(),
      tglAct: tglAct ? new Date(tglAct) : null,
      status: status || "Plan",
      noteId: id,
    },
    include: { feedbacks: true },
  });

  return NextResponse.json(progress, { status: 201 });
}
