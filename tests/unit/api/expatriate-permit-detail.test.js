// tests/unit/api/expatriate-permit-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/expatriate/[id]/permits/[permitId]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
  diffChanges: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  deleteFileIfExists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatPermit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expatPermitHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin, diffChanges } from "@/app/api/expatriate/_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/expat-1/permits/permit-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: "expat-1", permitId: "permit-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Expatriate Permit Detail API Handlers (/api/expatriate/[id]/permits/[permitId])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/expatriate/[id]/permits/[permitId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ number: "NEW-001" }), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ number: "NEW-001" }), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika expatId pada permit tidak cocok", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        expatId: "other-expat",
      });

      const res = await PATCH(makeReq({ number: "NEW-001" }), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.update).not.toHaveBeenCalled();
    });

    it("harus berhasil update permit, panggil diffChanges, dan catat history UPDATE (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const existingPermit = {
        id: "permit-1",
        expatId: "expat-1",
        permitTypeId: "pt-kitas",
        number: "KITAS-OLD",
        issuedDate: new Date("2025-01-01"),
        expiryDate: new Date("2026-01-01"),
      };
      prisma.expatPermit.findUnique.mockResolvedValueOnce(existingPermit);

      const updatedPermit = {
        ...existingPermit,
        number: "KITAS-NEW",
        issuedDate: new Date("2025-02-01"),
        expiryDate: null,
        permitType: { id: "pt-kitas", name: "KITAS" },
      };
      prisma.expatPermit.update.mockResolvedValueOnce(updatedPermit);
      diffChanges.mockReturnValueOnce(JSON.stringify({ number: { from: "KITAS-OLD", to: "KITAS-NEW" } }));

      const res = await PATCH(
        makeReq({
          number: "KITAS-NEW",
          issuedDate: "2025-02-01",
          expiryDate: null,
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.number).toBe("KITAS-NEW");

      expect(prisma.expatPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: {
          number: "KITAS-NEW",
          issuedDate: new Date("2025-02-01"),
          expiryDate: null,
        },
        include: { permitType: true },
      });

      expect(diffChanges).toHaveBeenCalledWith(existingPermit, updatedPermit);
      expect(prisma.expatPermitHistory.create).toHaveBeenCalledWith({
        data: {
          permitId: "permit-1",
          action: "UPDATE",
          changes: JSON.stringify({ number: { from: "KITAS-OLD", to: "KITAS-NEW" } }),
          changedBy: "admin-1",
        },
      });
    });
  });

  describe("DELETE /api/expatriate/[id]/permits/[permitId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/permits/permit-1", { method: "DELETE" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce(null);

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/permits/permit-1", { method: "DELETE" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.delete).not.toHaveBeenCalled();
    });

    it("harus membersihkan permit replaced beserta scan berkasnya dan menghapus permit utama (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const permitToDelete = {
        id: "permit-1",
        expatId: "expat-1",
        permitTypeId: "pt-kitas",
        scanUrl: "/uploads/scan-active.pdf",
      };
      prisma.expatPermit.findUnique.mockResolvedValueOnce(permitToDelete);

      const replacedPermits = [
        { id: "permit-old-1", scanUrl: "/uploads/scan-old-1.pdf" },
        { id: "permit-old-2", scanUrl: null },
      ];
      prisma.expatPermit.findMany.mockResolvedValueOnce(replacedPermits);

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/permits/permit-1", { method: "DELETE" }),
        { params: PARAMS }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });

      // Verifikasi pembersihan permit replaced
      expect(prisma.expatPermit.findMany).toHaveBeenCalledWith({
        where: { expatId: "expat-1", permitTypeId: "pt-kitas", status: "replaced" },
        select: { id: true, scanUrl: true },
      });
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/scan-old-1.pdf");
      expect(prisma.expatPermit.delete).toHaveBeenCalledWith({ where: { id: "permit-old-1" } });
      expect(prisma.expatPermit.delete).toHaveBeenCalledWith({ where: { id: "permit-old-2" } });

      // Verifikasi pembersihan permit utama
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/scan-active.pdf");
      expect(prisma.expatPermitHistory.create).toHaveBeenCalledWith({
        data: {
          permitId: "permit-1",
          action: "DELETE",
          changes: JSON.stringify({ snapshot: permitToDelete }),
          changedBy: "admin-1",
        },
      });
      expect(prisma.expatPermit.delete).toHaveBeenCalledWith({ where: { id: "permit-1" } });
    });
  });
});