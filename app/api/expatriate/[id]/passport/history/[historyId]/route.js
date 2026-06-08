import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, historyId } = await params;
  const history = await prisma.expatPassportHistory.findUnique({
    where: { id: historyId },
    select: { id: true, expatId: true, scanUrl: true },
  });
  if (!history || history.expatId !== id)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (history.scanUrl) await deleteFileIfExists(history.scanUrl);
  await prisma.expatPassportHistory.delete({ where: { id: historyId } });
  return NextResponse.json({ ok: true });
}
