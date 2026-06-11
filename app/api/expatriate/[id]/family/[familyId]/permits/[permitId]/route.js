import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin, diffChanges } from "../../../../../_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";

export async function PATCH(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { familyId, permitId } = await params;
  const permit = await prisma.familyPermit.findUnique({ where: { id: permitId } });
  if (!permit || permit.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = {};
  if (body.permitTypeId !== undefined) data.permitTypeId = body.permitTypeId;
  if (body.number !== undefined) data.number = body.number;
  if (body.issuedDate !== undefined) data.issuedDate = new Date(body.issuedDate);
  if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

  const updated = await prisma.familyPermit.update({
    where: { id: permitId },
    data,
    include: { permitType: true },
  });

  await prisma.familyPermitHistory.create({
    data: {
      permitId,
      action: "UPDATE",
      changes: diffChanges(permit, updated),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { familyId, permitId } = await params;
  const permit = await prisma.familyPermit.findUnique({ where: { id: permitId } });
  if (!permit || permit.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hapus semua permit replaced (history) untuk tipe yang sama — ikut dibersihkan beserta scan-nya
  const replacedPermits = await prisma.familyPermit.findMany({
    where: { familyId, permitTypeId: permit.permitTypeId, status: "replaced" },
    select: { id: true, scanUrl: true },
  });
  for (const rp of replacedPermits) {
    if (rp.scanUrl) await deleteFileIfExists(rp.scanUrl);
    await prisma.familyPermit.delete({ where: { id: rp.id } });
  }

  // Hapus scan file permit ini
  if (permit.scanUrl) await deleteFileIfExists(permit.scanUrl);

  await prisma.familyPermitHistory.create({
    data: {
      permitId,
      action: "DELETE",
      changes: JSON.stringify({ snapshot: permit }),
      changedBy: session.user.id,
    },
  });

  await prisma.familyPermit.delete({ where: { id: permitId } });
  return NextResponse.json({ ok: true });
}
