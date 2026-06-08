import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({
    where: { id: familyId },
    select: { id: true, expatId: true, passportNo: true, passportIssuedDate: true, passportExpiryDate: true, passportScanUrl: true },
  });
  if (!member || member.expatId !== id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const { passportNo, passportIssuedDate, passportExpiryDate } = await req.json();
  if (!passportNo || !passportIssuedDate || !passportExpiryDate)
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });

  // Simpan paspor lama ke history
  await prisma.familyPassportHistory.create({
    data: {
      familyId,
      passportNo: member.passportNo,
      issuedDate: member.passportIssuedDate,
      expiryDate: member.passportExpiryDate,
      scanUrl: member.passportScanUrl ?? null,
      replacedBy: session.user.id,
    },
  });

  // Update ke paspor baru, reset scan URL
  const updated = await prisma.expatFamily.update({
    where: { id: familyId },
    data: {
      passportNo,
      passportIssuedDate: new Date(passportIssuedDate),
      passportExpiryDate: new Date(passportExpiryDate),
      passportScanUrl: null,
    },
  });

  return NextResponse.json(updated);
}
