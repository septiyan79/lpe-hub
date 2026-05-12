import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "./_helpers";

export async function GET() {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const expatriates = await prisma.expatriate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      permits: {
        orderBy: { issuedDate: "asc" },
        include: { permitType: true },
      },
      _count: { select: { families: true } },
    },
  });

  return NextResponse.json(expatriates);
}

export async function POST(req) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    name, birthPlace, birthDate, gender,
    passportNo, passportIssuedDate, passportExpiryDate,
    position, department, presentAddress, permanentAddress, arrivalDate,
  } = body;

  if (!name || !birthPlace || !birthDate || !gender || !passportNo ||
      !passportIssuedDate || !passportExpiryDate || !position ||
      !department || !presentAddress || !permanentAddress || !arrivalDate) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const expat = await prisma.expatriate.create({
    data: {
      name, birthPlace,
      birthDate: new Date(birthDate),
      gender, passportNo,
      passportIssuedDate: new Date(passportIssuedDate),
      passportExpiryDate: new Date(passportExpiryDate),
      position, department, presentAddress, permanentAddress,
      arrivalDate: new Date(arrivalDate),
    },
  });

  await prisma.expatHistory.create({
    data: {
      expatId: expat.id,
      action: "CREATE",
      changes: JSON.stringify({ snapshot: expat }),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(expat, { status: 201 });
}
