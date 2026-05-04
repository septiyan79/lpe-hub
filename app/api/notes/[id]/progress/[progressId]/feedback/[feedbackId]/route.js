import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, feedbackId } = await params;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== session.user.id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.feedback.delete({ where: { id: feedbackId } });
  return NextResponse.json({ success: true });
}
