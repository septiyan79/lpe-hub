import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ownsNote(userId, id) {
  const note = await prisma.note.findUnique({ where: { id } });
  return note?.userId === userId ? note : null;
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await ownsNote(session.user.id, id);
  if (!note) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.desc !== undefined && { desc: body.desc }),
      ...(body.done !== undefined && { done: body.done }),
    },
    include: { progress: { include: { feedbacks: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await ownsNote(session.user.id, id);
  if (!note) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
