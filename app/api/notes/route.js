import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      progress: {
        orderBy: { createdAt: "asc" },
        include: { feedbacks: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  return NextResponse.json(notes);
}

export async function POST(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, desc } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });

  const note = await prisma.note.create({
    data: { title: title.trim(), desc: desc?.trim() || null, userId: session.user.id },
    include: { progress: { include: { feedbacks: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
