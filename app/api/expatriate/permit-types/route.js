import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../_helpers";

export async function GET() {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const types = await prisma.permitType.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(types);
}

export async function POST(req) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, forExpat, forFamily, hasExpiry, isOneTime, isEPO, linkedToWorkPermit, order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

  const existing = await prisma.permitType.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "Nama jenis izin sudah ada" }, { status: 409 });

  const type = await prisma.permitType.create({
    data: {
      name: name.trim(),
      description: description || null,
      forExpat: forExpat ?? true,
      forFamily: forFamily ?? true,
      hasExpiry: hasExpiry ?? true,
      isOneTime: isOneTime ?? false,
      isEPO: isEPO ?? false,
      linkedToWorkPermit: linkedToWorkPermit ?? false,
      order: order != null ? Number(order) : 0,
    },
  });

  return NextResponse.json(type, { status: 201 });
}
