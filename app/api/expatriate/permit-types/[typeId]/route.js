import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../_helpers";

export async function PATCH(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { typeId } = await params;
  const existing = await prisma.permitType.findUnique({ where: { id: typeId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    const dupe = await prisma.permitType.findUnique({ where: { name: body.name.trim() } });
    if (dupe && dupe.id !== typeId) return NextResponse.json({ error: "Nama jenis izin sudah ada" }, { status: 409 });
    data.name = body.name.trim();
  }
  if (body.description !== undefined) data.description = body.description || null;
  if (body.forExpat !== undefined) data.forExpat = Boolean(body.forExpat);
  if (body.forFamily !== undefined) data.forFamily = Boolean(body.forFamily);
  if (body.hasExpiry !== undefined) data.hasExpiry = Boolean(body.hasExpiry);
  if (body.isEPO !== undefined) data.isEPO = Boolean(body.isEPO);
  if (body.linkedToWorkPermit !== undefined) data.linkedToWorkPermit = Boolean(body.linkedToWorkPermit);
  if (body.order !== undefined) data.order = Number(body.order);

  const updated = await prisma.permitType.update({ where: { id: typeId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { typeId } = await params;
  const existing = await prisma.permitType.findUnique({
    where: { id: typeId },
    include: { _count: { select: { expatPermits: true, familyPermits: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inUse = existing._count.expatPermits + existing._count.familyPermits;
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Jenis izin ini masih digunakan oleh ${inUse} permit dan tidak dapat dihapus` },
      { status: 409 }
    );
  }

  await prisma.permitType.delete({ where: { id: typeId } });
  return NextResponse.json({ ok: true });
}
