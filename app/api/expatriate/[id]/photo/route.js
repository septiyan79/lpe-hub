import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_IMAGE } from "../../_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id }, select: { id: true, photoUrl: true } });
  if (!expat) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_IMAGE, ["expat", id], "photo");
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Delete old photo file (may have different extension)
  if (expat.photoUrl) await deleteFileIfExists(expat.photoUrl);

  const updated = await prisma.expatriate.update({ where: { id }, data: { photoUrl: url } });
  return NextResponse.json({ photoUrl: updated.photoUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id }, select: { id: true, photoUrl: true } });
  if (!expat) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(expat.photoUrl);
  await prisma.expatriate.update({ where: { id }, data: { photoUrl: null } });
  return NextResponse.json({ ok: true });
}
