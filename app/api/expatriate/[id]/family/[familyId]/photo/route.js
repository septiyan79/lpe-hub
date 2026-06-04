import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../../../_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_IMAGE } from "../../../../_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { id: true, expatId: true, photoUrl: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_IMAGE, ["family", familyId], "photo");
  if (error) return NextResponse.json({ error }, { status: 400 });

  if (member.photoUrl) await deleteFileIfExists(member.photoUrl);

  const updated = await prisma.expatFamily.update({ where: { id: familyId }, data: { photoUrl: url } });
  return NextResponse.json({ photoUrl: updated.photoUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { id: true, expatId: true, photoUrl: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(member.photoUrl);
  await prisma.expatFamily.update({ where: { id: familyId }, data: { photoUrl: null } });
  return NextResponse.json({ ok: true });
}
