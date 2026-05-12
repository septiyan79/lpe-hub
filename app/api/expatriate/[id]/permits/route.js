import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id } });
  if (!expat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { permitTypeId, number, issuedDate, expiryDate } = await req.json();
  if (!permitTypeId || !number || !issuedDate) {
    return NextResponse.json({ error: "permitTypeId, number, dan issuedDate wajib diisi" }, { status: 400 });
  }

  const permitType = await prisma.permitType.findUnique({ where: { id: permitTypeId } });
  if (!permitType) return NextResponse.json({ error: "Jenis izin tidak ditemukan" }, { status: 404 });
  if (!permitType.forExpat) return NextResponse.json({ error: "Jenis izin tidak berlaku untuk expatriate" }, { status: 400 });

  if (permitType.isEPO) {
    const existingEPO = await prisma.expatPermit.findFirst({
      where: { expatId: id, permitType: { isEPO: true } },
    });
    if (existingEPO) return NextResponse.json({ error: "EPO sudah ada untuk expatriate ini" }, { status: 409 });
  }

  const permit = await prisma.expatPermit.create({
    data: {
      expatId: id,
      permitTypeId,
      number,
      issuedDate: new Date(issuedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
    include: { permitType: true },
  });

  await prisma.expatPermitHistory.create({
    data: {
      permitId: permit.id,
      action: "CREATE",
      changes: JSON.stringify({ snapshot: permit }),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(permit, { status: 201 });
}
