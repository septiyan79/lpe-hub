import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "../../../../../_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "../../../../../_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId, permitId } = await params;
  const permit = await prisma.familyPermit.findUnique({ where: { id: permitId }, select: { id: true, familyId: true, scanUrl: true } });
  if (!permit || permit.familyId !== familyId) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  // Verify family belongs to expat
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { expatId: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_PDF, ["family-permit", permitId], "scan");
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Only delete old scan for this specific permit
  if (permit.scanUrl) await deleteFileIfExists(permit.scanUrl);

  const updated = await prisma.familyPermit.update({ where: { id: permitId }, data: { scanUrl: url } });
  return NextResponse.json({ scanUrl: updated.scanUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId, permitId } = await params;
  const permit = await prisma.familyPermit.findUnique({ where: { id: permitId }, select: { id: true, familyId: true, scanUrl: true } });
  if (!permit || permit.familyId !== familyId) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { expatId: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(permit.scanUrl);
  await prisma.familyPermit.update({ where: { id: permitId }, data: { scanUrl: null } });
  return NextResponse.json({ ok: true });
}
