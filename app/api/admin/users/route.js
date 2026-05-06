import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: role || "employee",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, deletedAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
