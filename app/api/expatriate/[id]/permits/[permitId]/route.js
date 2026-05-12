import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin, diffChanges } from "../../../_helpers";

export async function PATCH(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, permitId } = await params;
  const permit = await prisma.expatPermit.findUnique({ where: { id: permitId } });
  if (!permit || permit.expatId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = {};
  if (body.permitTypeId !== undefined) data.permitTypeId = body.permitTypeId;
  if (body.number !== undefined) data.number = body.number;
  if (body.issuedDate !== undefined) data.issuedDate = new Date(body.issuedDate);
  if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

  const updated = await prisma.expatPermit.update({
    where: { id: permitId },
    data,
    include: { permitType: true },
  });

  await prisma.expatPermitHistory.create({
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

  const { id, permitId } = await params;
  const permit = await prisma.expatPermit.findUnique({ where: { id: permitId } });
  if (!permit || permit.expatId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expatPermitHistory.create({
    data: {
      permitId,
      action: "DELETE",
      changes: JSON.stringify({ snapshot: permit }),
      changedBy: session.user.id,
    },
  });

  await prisma.expatPermit.delete({ where: { id: permitId } });
  return NextResponse.json({ ok: true });
}
