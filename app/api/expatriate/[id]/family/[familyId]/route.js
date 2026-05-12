import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin, diffChanges } from "../../../_helpers";

const STRING_FIELDS = ["name", "gender", "birthPlace", "passportNo", "familyStatus"];
const DATE_FIELDS = ["birthDate", "passportIssuedDate", "passportExpiryDate", "arrivalDate"];

export async function PATCH(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = {};
  for (const f of STRING_FIELDS) { if (body[f] !== undefined) data[f] = body[f]; }
  for (const f of DATE_FIELDS) { if (body[f] !== undefined) data[f] = new Date(body[f]); }

  const updated = await prisma.expatFamily.update({ where: { id: familyId }, data });

  await prisma.expatFamilyHistory.create({
    data: {
      familyId,
      action: "UPDATE",
      changes: diffChanges(member, updated),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expatFamily.delete({ where: { id: familyId } });
  return NextResponse.json({ ok: true });
}
