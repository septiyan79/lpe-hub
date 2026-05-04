import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ownsItem(userId, id) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  return todo?.userId === userId ? todo : null;
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const todo = await ownsItem(session.user.id, id);
  if (!todo) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.todo.update({
    where: { id },
    data: {
      ...(body.text !== undefined && { text: body.text }),
      ...(body.done !== undefined && { done: body.done }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const todo = await ownsItem(session.user.id, id);
  if (!todo) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
