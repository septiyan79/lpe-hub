// tests/unit/api/expatriate-photo.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/expatriate/[id]/photo/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  saveUploadedFile: vi.fn(),
  deleteFileIfExists: vi.fn(),
  ALLOWED_IMAGE: ["image/jpeg", "image/png"],
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
import { saveUploadedFile, deleteFileIfExists, ALLOWED_IMAGE } from "@/app/api/expatriate/_upload-helpers";
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
const EXISTING_EXPAT = { id: "exp-1", photoUrl: "/uploads/expat/exp-1/photo.jpg" };

describe("POST /api/expatriate/[id]/photo", () => {
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
    saveUploadedFile.mockResolvedValue({ url: null, error: "Ukuran file maksimal 10 MB" });

    const res = await POST(mockReq(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Ukuran file maksimal 10 MB");
  });

  it("uploads new photo, deletes old photo, updates DB, and returns photoUrl", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    saveUploadedFile.mockResolvedValue({ url: "/uploads/expat/exp-1/photo.png", error: null });
    deleteFileIfExists.mockResolvedValue(undefined);
    prisma.expatriate.update.mockResolvedValue({ photoUrl: "/uploads/expat/exp-1/photo.png" });

    const dummyFormData = { get: vi.fn() };
    const res = await POST(mockReq(dummyFormData), makeParams("exp-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(saveUploadedFile).toHaveBeenCalledWith(
      dummyFormData,
      "file",
      ALLOWED_IMAGE,
      ["expat", "exp-1"],
      "photo"
    );
    expect(deleteFileIfExists).toHaveBeenCalledWith(EXISTING_EXPAT.photoUrl);
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { photoUrl: "/uploads/expat/exp-1/photo.png" },
    });
    expect(data).toEqual({ photoUrl: "/uploads/expat/exp-1/photo.png" });
  });
});

describe("DELETE /api/expatriate/[id]/photo", () => {
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

  it("deletes physical file and resets photoUrl to null in DB", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    deleteFileIfExists.mockResolvedValue(undefined);
    prisma.expatriate.update.mockResolvedValue({ id: "exp-1", photoUrl: null });

    const res = await DELETE({}, makeParams("exp-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(deleteFileIfExists).toHaveBeenCalledWith(EXISTING_EXPAT.photoUrl);
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { photoUrl: null },
    });
    expect(data).toEqual({ ok: true });
  });
});