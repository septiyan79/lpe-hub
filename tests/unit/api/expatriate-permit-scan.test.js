// tests/unit/api/expatriate-permit-scan.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/expatriate/[id]/permits/[permitId]/scan/route";

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
    expatPermit: {
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

function makeParams(id = "expat-1", permitId = "permit-1") {
  return { params: Promise.resolve({ id, permitId }) };
}

const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Expatriate Permit Scan API Handlers (/api/expatriate/[id]/permits/[permitId]/scan)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/expatriate/[id]/permits/[permitId]/scan", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await POST(mockReq(), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce(null);

      const res = await POST(mockReq(), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(saveUploadedFile).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika upload berkas PDF gagal", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        expatId: "expat-1",
        scanUrl: null,
      });
      saveUploadedFile.mockResolvedValueOnce({ error: "File harus berformat PDF" });

      const res = await POST(mockReq(), makeParams());
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("File harus berformat PDF");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus berhasil upload scan PDF, hapus file scan lama, dan update DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        expatId: "expat-1",
        scanUrl: "/uploads/old-scan.pdf",
      });
      saveUploadedFile.mockResolvedValueOnce({ url: "/uploads/new-scan.pdf" });
      prisma.expatPermit.update.mockResolvedValueOnce({
        id: "permit-1",
        scanUrl: "/uploads/new-scan.pdf",
      });

      const res = await POST(mockReq(), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ scanUrl: "/uploads/new-scan.pdf" });

      expect(saveUploadedFile).toHaveBeenCalledWith(
        expect.anything(),
        "file",
        ALLOWED_PDF,
        ["expat-permit", "permit-1"],
        "scan"
      );
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old-scan.pdf");
      expect(prisma.expatPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: { scanUrl: "/uploads/new-scan.pdf" },
      });
    });
  });

  describe("DELETE /api/expatriate/[id]/permits/[permitId]/scan", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await DELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        expatId: "other-expat",
        scanUrl: "/uploads/scan.pdf",
      });

      const res = await DELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(deleteFileIfExists).not.toHaveBeenCalled();
    });

    it("harus menghapus file fisik scan dan mereset scanUrl ke null di DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        expatId: "expat-1",
        scanUrl: "/uploads/scan.pdf",
      });
      deleteFileIfExists.mockResolvedValueOnce();
      prisma.expatPermit.update.mockResolvedValueOnce({
        id: "permit-1",
        scanUrl: null,
      });

      const res = await DELETE(new Request("http://localhost"), makeParams());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/scan.pdf");
      expect(prisma.expatPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: { scanUrl: null },
      });
    });
  });
});