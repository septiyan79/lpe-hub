// tests/unit/api/expatriate-family-photo-scan.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as photoPOST, DELETE as photoDELETE } from "@/app/api/expatriate/[id]/family/[familyId]/photo/route";
import { POST as scanPOST, DELETE as scanDELETE } from "@/app/api/expatriate/[id]/family/[familyId]/passport-scan/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  saveUploadedFile: vi.fn(),
  deleteFileIfExists: vi.fn(),
  ALLOWED_IMAGE: ["image/jpeg", "image/png"],
  ALLOWED_PDF: ["application/pdf"],
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatFamily: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_IMAGE, ALLOWED_PDF } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function mockReq(formData = {}) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  };
}

function makeParams(id = "expat-1", familyId = "fam-1") {
  return { params: Promise.resolve({ id, familyId }) };
}

const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Expatriate Family Photo & Passport Scan Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Family Photo (/api/expatriate/[id]/family/[familyId]/photo)", () => {
    it("POST harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await photoPOST(mockReq(), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("POST harus mengembalikan 404 Not Found jika member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await photoPOST(mockReq(), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(saveUploadedFile).not.toHaveBeenCalled();
    });

    it("POST harus mengembalikan 400 Bad Request jika upload foto gagal", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        photoUrl: null,
      });
      saveUploadedFile.mockResolvedValueOnce({ error: "Format gambar tidak didukung" });

      const res = await photoPOST(mockReq(), makeParams());
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Format gambar tidak didukung");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("POST harus berhasil upload foto, hapus foto lama jika ada, dan update DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        photoUrl: "/uploads/old-photo.jpg",
      });
      saveUploadedFile.mockResolvedValueOnce({ url: "/uploads/new-photo.jpg" });
      prisma.expatFamily.update.mockResolvedValueOnce({
        id: "fam-1",
        photoUrl: "/uploads/new-photo.jpg",
      });

      const res = await photoPOST(mockReq(), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ photoUrl: "/uploads/new-photo.jpg" });

      expect(saveUploadedFile).toHaveBeenCalledWith(
        expect.anything(),
        "file",
        ALLOWED_IMAGE,
        ["family", "fam-1"],
        "photo"
      );
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old-photo.jpg");
      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: { photoUrl: "/uploads/new-photo.jpg" },
      });
    });

    it("DELETE harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await photoDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("DELETE harus mengembalikan 404 Not Found jika member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "other-expat",
        photoUrl: "/uploads/photo.jpg",
      });

      const res = await photoDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(deleteFileIfExists).not.toHaveBeenCalled();
    });

    it("DELETE harus berhasil menghapus file fisik foto dan mereset photoUrl ke null di DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        photoUrl: "/uploads/photo.jpg",
      });
      deleteFileIfExists.mockResolvedValueOnce();
      prisma.expatFamily.update.mockResolvedValueOnce({
        id: "fam-1",
        photoUrl: null,
      });

      const res = await photoDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/photo.jpg");
      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: { photoUrl: null },
      });
    });
  });

  describe("Family Passport Scan (/api/expatriate/[id]/family/[familyId]/passport-scan)", () => {
    it("POST harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await scanPOST(mockReq(), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("POST harus mengembalikan 404 Not Found jika member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await scanPOST(mockReq(), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(saveUploadedFile).not.toHaveBeenCalled();
    });

    it("POST harus mengembalikan 400 Bad Request jika upload berkas PDF gagal", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        passportScanUrl: null,
      });
      saveUploadedFile.mockResolvedValueOnce({ error: "File harus berformat PDF" });

      const res = await scanPOST(mockReq(), makeParams());
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("File harus berformat PDF");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("POST harus berhasil upload berkas PDF, hapus scan lama jika ada, dan update DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        passportScanUrl: "/uploads/old-scan.pdf",
      });
      saveUploadedFile.mockResolvedValueOnce({ url: "/uploads/new-scan.pdf" });
      prisma.expatFamily.update.mockResolvedValueOnce({
        id: "fam-1",
        passportScanUrl: "/uploads/new-scan.pdf",
      });

      const res = await scanPOST(mockReq(), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ passportScanUrl: "/uploads/new-scan.pdf" });

      expect(saveUploadedFile).toHaveBeenCalledWith(
        expect.anything(),
        "file",
        ALLOWED_PDF,
        ["family", "fam-1"],
        "passport"
      );
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old-scan.pdf");
      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: { passportScanUrl: "/uploads/new-scan.pdf" },
      });
    });

    it("DELETE harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await scanDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("DELETE harus mengembalikan 404 Not Found jika member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "other-expat",
        passportScanUrl: "/uploads/scan.pdf",
      });

      const res = await scanDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(deleteFileIfExists).not.toHaveBeenCalled();
    });

    it("DELETE harus berhasil menghapus file fisik scan dan mereset passportScanUrl ke null di DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
        passportScanUrl: "/uploads/scan.pdf",
      });
      deleteFileIfExists.mockResolvedValueOnce();
      prisma.expatFamily.update.mockResolvedValueOnce({
        id: "fam-1",
        passportScanUrl: null,
      });

      const res = await scanDELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/scan.pdf");
      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: { passportScanUrl: null },
      });
    });
  });
});