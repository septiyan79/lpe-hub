import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ownsProgress(userId, noteId, progressId) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) return null;
  const progress = await prisma.progress.findUnique({ where: { id: progressId } });
  return progress?.noteId === noteId ? progress : null;
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, progressId } = await params;
  const progress = await ownsProgress(session.user.id, id, progressId);
  if (!progress) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.progress.update({
    where: { id: progressId },
    data: {
      ...(body.act !== undefined && { act: body.act }),
      ...(body.tglAct !== undefined && { tglAct: body.tglAct ? new Date(body.tglAct) : null }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: { feedbacks: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, progressId } = await params;
  const progress = await ownsProgress(session.user.id, id, progressId);
  if (!progress) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.progress.delete({ where: { id: progressId } });
  return NextResponse.json({ success: true });
}
