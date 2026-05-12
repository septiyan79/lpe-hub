import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../../../_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { permitTypeId, number, issuedDate, expiryDate } = await req.json();
  if (!permitTypeId || !number || !issuedDate) {
    return NextResponse.json({ error: "permitTypeId, number, dan issuedDate wajib diisi" }, { status: 400 });
  }

  const permitType = await prisma.permitType.findUnique({ where: { id: permitTypeId } });
  if (!permitType) return NextResponse.json({ error: "Jenis izin tidak ditemukan" }, { status: 404 });
  if (!permitType.forFamily) return NextResponse.json({ error: "Jenis izin tidak berlaku untuk keluarga" }, { status: 400 });

  if (permitType.isEPO) {
    const existingEPO = await prisma.familyPermit.findFirst({
      where: { familyId, permitType: { isEPO: true } },
    });
    if (existingEPO) return NextResponse.json({ error: "EPO sudah ada untuk anggota keluarga ini" }, { status: 409 });
  }

  const permit = await prisma.familyPermit.create({
    data: {
      familyId,
      permitTypeId,
      number,
      issuedDate: new Date(issuedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
    include: { permitType: true },
  });

  await prisma.familyPermitHistory.create({
    data: {
      permitId: permit.id,
      action: "CREATE",
      changes: JSON.stringify({ snapshot: permit }),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(permit, { status: 201 });
}
