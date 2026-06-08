import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({
    where: { id },
    select: { id: true, passportNo: true, passportIssuedDate: true, passportExpiryDate: true, passportScanUrl: true },
  });
  if (!expat) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const { passportNo, passportIssuedDate, passportExpiryDate } = await req.json();
  if (!passportNo || !passportIssuedDate || !passportExpiryDate)
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });

  // Simpan paspor lama ke history (beserta scan jika ada)
  await prisma.expatPassportHistory.create({
    data: {
      expatId: id,
      passportNo: expat.passportNo,
      issuedDate: expat.passportIssuedDate,
      expiryDate: expat.passportExpiryDate,
      scanUrl: expat.passportScanUrl ?? null,
      replacedBy: session.user.id,
    },
  });

  // Update ke paspor baru, reset scan URL
  const updated = await prisma.expatriate.update({
    where: { id },
    data: {
      passportNo,
      passportIssuedDate: new Date(passportIssuedDate),
      passportExpiryDate: new Date(passportExpiryDate),
      passportScanUrl: null,
    },
  });

  return NextResponse.json(updated);
}
