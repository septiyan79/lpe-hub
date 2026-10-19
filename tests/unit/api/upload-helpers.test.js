// tests/unit/api/upload-helpers.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises agar tidak menulis ke disk sungguhan
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

import { saveUploadedFile, deleteFileIfExists, ALLOWED_IMAGE, MAX_BYTES } from "@/app/api/expatriate/_upload-helpers";
import { writeFile, mkdir, unlink, access } from "fs/promises";

// -------------------------------------------------------------------
// Helper: membuat mock File object seperti dari FormData
// -------------------------------------------------------------------
function makeFile(type, sizeBytes) {
  return {
    type,
    size: sizeBytes,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(sizeBytes)),
  };
}

function makeFormData(fieldName, file) {
  return { get: (key) => (key === fieldName ? file : null) };
}

// -------------------------------------------------------------------
// Test suite: saveUploadedFile
// -------------------------------------------------------------------
describe("saveUploadedFile()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when file not found in FormData", async () => {
    const formData = { get: () => null };
    const result = await saveUploadedFile(formData, "photo", ALLOWED_IMAGE, ["expat", "u1"], "photo");
    expect(result).toEqual({ url: null, error: "File tidak ditemukan" });
  });

  it("returns error when file type is not allowed", async () => {
    const file = makeFile("text/plain", 1000);
    const formData = makeFormData("photo", file);
    const result = await saveUploadedFile(formData, "photo", ALLOWED_IMAGE, ["expat", "u1"], "photo");
    expect(result.url).toBeNull();
    expect(result.error).toMatch(/Format tidak didukung/);
  });

  it("returns error when file size exceeds 10 MB", async () => {
    const file = makeFile("image/jpeg", MAX_BYTES + 1);
    const formData = makeFormData("photo", file);
    const result = await saveUploadedFile(formData, "photo", ALLOWED_IMAGE, ["expat", "u1"], "photo");
    expect(result).toEqual({ url: null, error: "Ukuran file maksimal 10 MB" });
  });

  it("saves valid file and returns correct URL", async () => {
    const file = makeFile("image/jpeg", 1000);
    const formData = makeFormData("photo", file);
    const result = await saveUploadedFile(formData, "photo", ALLOWED_IMAGE, ["expat", "u1"], "photo");
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.url).toBe("/uploads/expat/u1/photo.jpg");
  });
});

// -------------------------------------------------------------------
// Test suite: deleteFileIfExists
// -------------------------------------------------------------------
describe("deleteFileIfExists()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when publicUrl is null", async () => {
    await deleteFileIfExists(null);
    expect(access).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });

  it("calls unlink when file exists", async () => {
    access.mockResolvedValue(undefined); // file ada
    await deleteFileIfExists("/uploads/expat/u1/photo.jpg");
    expect(unlink).toHaveBeenCalled();
  });

  it("does not throw when file does not exist", async () => {
    access.mockRejectedValue(new Error("ENOENT")); // file tidak ada
    await expect(deleteFileIfExists("/uploads/expat/u1/photo.jpg")).resolves.not.toThrow();
    expect(unlink).not.toHaveBeenCalled();
  });
});