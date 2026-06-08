import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin, diffChanges } from "../_helpers";

const STRING_FIELDS = ["name", "birthPlace", "gender", "passportNo", "position", "department", "presentAddress", "permanentAddress"];
const DATE_FIELDS = ["birthDate", "passportIssuedDate", "passportExpiryDate", "arrivalDate"];
const INT_FIELDS = ["renewalNo"];

export async function GET(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const expat = await prisma.expatriate.findUnique({
    where: { id },
    include: {
      permits: {
        orderBy: { issuedDate: "asc" },
        include: { permitType: true },
      },
      families: {
        orderBy: { createdAt: "asc" },
        include: {
          permits: {
            orderBy: { issuedDate: "asc" },
            include: { permitType: true },
          },
          passportHistories: { orderBy: { replacedAt: "desc" } },
        },
      },
      histories: { orderBy: { changedAt: "desc" }, take: 20 },
      passportHistories: { orderBy: { replacedAt: "desc" } },
    },
  });

  if (!expat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(expat);
}

export async function PATCH(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id } });
  if (!expat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = {};
  for (const f of STRING_FIELDS) { if (body[f] !== undefined) data[f] = body[f]; }
  for (const f of DATE_FIELDS) { if (body[f] !== undefined) data[f] = new Date(body[f]); }
  for (const f of INT_FIELDS) { if (body[f] !== undefined) data[f] = body[f] != null ? Number(body[f]) : null; }

  const updated = await prisma.expatriate.update({ where: { id }, data });

  await prisma.expatHistory.create({
    data: {
      expatId: id,
      action: "UPDATE",
      changes: diffChanges(expat, updated),
      changedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id } });
  if (!expat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expatriate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
