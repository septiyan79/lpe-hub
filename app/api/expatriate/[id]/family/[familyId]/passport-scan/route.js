import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "@/app/api/expatriate/_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { id: true, expatId: true, passportScanUrl: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_PDF, ["family", familyId], "passport");
  if (error) return NextResponse.json({ error }, { status: 400 });

  if (member.passportScanUrl) await deleteFileIfExists(member.passportScanUrl);

  const updated = await prisma.expatFamily.update({ where: { id: familyId }, data: { passportScanUrl: url } });
  return NextResponse.json({ passportScanUrl: updated.passportScanUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, familyId } = await params;
  const member = await prisma.expatFamily.findUnique({ where: { id: familyId }, select: { id: true, expatId: true, passportScanUrl: true } });
  if (!member || member.expatId !== id) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(member.passportScanUrl);
  await prisma.expatFamily.update({ where: { id: familyId }, data: { passportScanUrl: null } });
  return NextResponse.json({ ok: true });
}
