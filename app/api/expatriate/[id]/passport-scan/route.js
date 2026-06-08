import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "@/app/api/expatriate/_upload-helpers";

export async function POST(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id }, select: { id: true, passportScanUrl: true } });
  if (!expat) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const { url, error } = await saveUploadedFile(formData, "file", ALLOWED_PDF, ["expat", id], "passport");
  if (error) return NextResponse.json({ error }, { status: 400 });

  if (expat.passportScanUrl) await deleteFileIfExists(expat.passportScanUrl);

  const updated = await prisma.expatriate.update({ where: { id }, data: { passportScanUrl: url } });
  return NextResponse.json({ passportScanUrl: updated.passportScanUrl });
}

export async function DELETE(req, { params }) {
  const session = await requireExpatAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expat = await prisma.expatriate.findUnique({ where: { id }, select: { id: true, passportScanUrl: true } });
  if (!expat) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await deleteFileIfExists(expat.passportScanUrl);
  await prisma.expatriate.update({ where: { id }, data: { passportScanUrl: null } });
  return NextResponse.json({ ok: true });
}
