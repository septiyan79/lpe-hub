import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id } });
  if (!expat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    name, gender, birthPlace, birthDate,
    passportNo, passportIssuedDate, passportExpiryDate,
    familyStatus, arrivalDate,
  } = await req.json();

  if (!name || !gender || !birthPlace || !birthDate || !passportNo ||
      !passportIssuedDate || !passportExpiryDate || !familyStatus || !arrivalDate) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const member = await prisma.expatFamily.create({
    data: {
      expatId: id,
      name, gender, birthPlace,
      birthDate: new Date(birthDate),
      passportNo,
      passportIssuedDate: new Date(passportIssuedDate),
      passportExpiryDate: new Date(passportExpiryDate),
      familyStatus,
      arrivalDate: new Date(arrivalDate),
    },
  });

  await prisma.expatFamilyHistory.create({
    data: {
      familyId: member.id,
      action: "CREATE",
      changes: JSON.stringify({ snapshot: member }),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(member, { status: 201 });
}
