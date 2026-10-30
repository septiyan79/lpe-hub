// tests/unit/api/expatriate-passport-scan.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/expatriate/[id]/passport-scan/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  saveUploadedFile: vi.fn(),
  deleteFileIfExists: vi.fn(),
  ALLOWED_PDF: ["application/pdf"],
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function mockReq(formData = {}) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  };
}

function makeParams(id = "exp-1") {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { user: { id: "admin-1", role: "admin" } };
const EXISTING_EXPAT = { id: "exp-1", passportScanUrl: "/uploads/expat/exp-1/old-passport.pdf" };

describe("POST /api/expatriate/[id]/passport-scan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await POST(mockReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await POST(mockReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when upload fails", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    saveUploadedFile.mockResolvedValue({ url: null, error: "Format tidak didukung. Gunakan: application/pdf" });

    const res = await POST(mockReq(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Format tidak didukung/);
  });

  it("uploads passport scan, deletes old file, updates DB, and returns passportScanUrl", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    saveUploadedFile.mockResolvedValue({ url: "/uploads/expat/exp-1/passport.pdf", error: null });
    deleteFileIfExists.mockResolvedValue(undefined);
    prisma.expatriate.update.mockResolvedValue({ passportScanUrl: "/uploads/expat/exp-1/passport.pdf" });

    const dummyFormData = { get: vi.fn() };
    const res = await POST(mockReq(dummyFormData), makeParams("exp-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(saveUploadedFile).toHaveBeenCalledWith(
      dummyFormData,
      "file",
      ALLOWED_PDF,
      ["expat", "exp-1"],
      "passport"
    );
    expect(deleteFileIfExists).toHaveBeenCalledWith(EXISTING_EXPAT.passportScanUrl);
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { passportScanUrl: "/uploads/expat/exp-1/passport.pdf" },
    });
    expect(data).toEqual({ passportScanUrl: "/uploads/expat/exp-1/passport.pdf" });
  });
});

describe("DELETE /api/expatriate/[id]/passport-scan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await DELETE({}, makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await DELETE({}, makeParams());
    expect(res.status).toBe(404);
  });

  it("deletes physical file and resets passportScanUrl to null in DB", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    deleteFileIfExists.mockResolvedValue(undefined);
    prisma.expatriate.update.mockResolvedValue({ id: "exp-1", passportScanUrl: null });

    const res = await DELETE({}, makeParams("exp-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(deleteFileIfExists).toHaveBeenCalledWith(EXISTING_EXPAT.passportScanUrl);
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { passportScanUrl: null },
    });
    expect(data).toEqual({ ok: true });
  });
});