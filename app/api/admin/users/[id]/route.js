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

export async function PATCH(req, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, email, password, role } = await req.json();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
  }

  const updateData = {};
  if (name?.trim()) updateData.name = name.trim();
  if (email?.trim()) updateData.email = email.trim();
  if (role) updateData.role = role;
  if (password?.trim()) updateData.password = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true, deletedAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  // Soft delete — set deletedAt, tidak hapus dari database
  const deleted = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, createdAt: true, deletedAt: true },
  });

  return NextResponse.json(deleted);
}
