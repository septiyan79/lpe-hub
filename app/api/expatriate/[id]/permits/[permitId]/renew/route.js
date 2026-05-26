import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../../../_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, permitId } = await params;
  const oldPermit = await prisma.expatPermit.findUnique({
    where: { id: permitId },
    include: { permitType: true },
  });
  if (!oldPermit || oldPermit.expatId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (oldPermit.status === "replaced")
    return NextResponse.json({ error: "Izin ini sudah pernah diperpanjang" }, { status: 409 });

  const { number, issuedDate, expiryDate } = await req.json();
  if (!number || !issuedDate)
    return NextResponse.json({ error: "number dan issuedDate wajib diisi" }, { status: 400 });

  await prisma.expatPermit.update({
    where: { id: permitId },
    data: { status: "replaced" },
  });

  const newPermit = await prisma.expatPermit.create({
    data: {
      expatId: id,
      permitTypeId: oldPermit.permitTypeId,
      number,
      issuedDate: new Date(issuedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: "active",
      renewedFromId: permitId,
    },
    include: { permitType: true },
  });

  await prisma.expatPermitHistory.create({
    data: {
      permitId,
      action: "REPLACED",
      changes: JSON.stringify({ renewedBy: newPermit.id }),
      changedBy: session.user.id,
    },
  });
  await prisma.expatPermitHistory.create({
    data: {
      permitId: newPermit.id,
      action: "CREATE",
      changes: JSON.stringify({ renewedFrom: permitId }),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(newPermit, { status: 201 });
}
