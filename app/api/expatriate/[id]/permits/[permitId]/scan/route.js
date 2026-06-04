import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../../../_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "../../../../_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, permitId } = await params;
  const permit = await prisma.expatPermit.findUnique({ where: { id: permitId }, select: { id: true, expatId: true, scanUrl: true } });
  if (!permit || permit.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_PDF, ["expat-permit", permitId], "scan");
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Only delete old scan for this specific permit (never touch other permits' files)
  if (permit.scanUrl) await deleteFileIfExists(permit.scanUrl);

  const updated = await prisma.expatPermit.update({ where: { id: permitId }, data: { scanUrl: url } });
  return NextResponse.json({ scanUrl: updated.scanUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, permitId } = await params;
  const permit = await prisma.expatPermit.findUnique({ where: { id: permitId }, select: { id: true, expatId: true, scanUrl: true } });
  if (!permit || permit.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(permit.scanUrl);
  await prisma.expatPermit.update({ where: { id: permitId }, data: { scanUrl: null } });
  return NextResponse.json({ ok: true });
}
