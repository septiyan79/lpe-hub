import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId, historyId } = await params;
  const history = await prisma.familyPassportHistory.findUnique({
    where: { id: historyId },
    select: { id: true, familyId: true, scanUrl: true },
  });
  if (!history || history.familyId !== familyId)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  // Verify family belongs to expat
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { expatId: true } });
  if (!member || member.expatId !== id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (history.scanUrl) await deleteFileIfExists(history.scanUrl);
  await prisma.familyPassportHistory.delete({ where: { id: historyId } });
  return NextResponse.json({ ok: true });
}
