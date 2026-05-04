import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, progressId } = await params;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== session.user.id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const progress = await prisma.progress.findUnique({ where: { id: progressId } });
  if (!progress || progress.noteId !== id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const { text, tglFeedback } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Feedback wajib diisi" }, { status: 400 });

  const feedback = await prisma.feedback.create({
    data: {
      text: text.trim(),
      tglFeedback: tglFeedback ? new Date(tglFeedback) : null,
      progressId,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
