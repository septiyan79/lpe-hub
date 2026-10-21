// tests/unit/api/expatriate-family-permits.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createPermitPOST } from "@/app/api/expatriate/[id]/family/[familyId]/permits/route";
import { PATCH as permitPATCH, DELETE as permitDELETE } from "@/app/api/expatriate/[id]/family/[familyId]/permits/[permitId]/route";
import { POST as renewPOST } from "@/app/api/expatriate/[id]/family/[familyId]/permits/[permitId]/renew/route";
import { POST as scanPOST, DELETE as scanDELETE } from "@/app/api/expatriate/[id]/family/[familyId]/permits/[permitId]/scan/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
  diffChanges: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  saveUploadedFile: vi.fn(),
  deleteFileIfExists: vi.fn(),
  ALLOWED_PDF: ["application/pdf"],
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatFamily: {
      findUnique: vi.fn(),
    },
    permitType: {
      findUnique: vi.fn(),
    },
    familyPermit: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    familyPermitHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin, diffChanges } from "@/app/api/expatriate/_helpers";
import { saveUploadedFile, deleteFileIfExists, ALLOWED_PDF } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function makeReq(body, method = "POST") {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockFormData(formData = {}) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  };
}

const PARAMS = Promise.resolve({ id: "expat-1", familyId: "fam-1", permitId: "permit-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Expatriate Family Permits Management Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Create Permit (permits/route.js)", () => {
    it("POST harus mengembalikan 403 Forbidden jika unauthorized", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await createPermitPOST(makeReq({}), { params: PARAMS });
      expect(res.status).toBe(403);
    });

    it("POST harus mengembalikan 404 Not Found jika family member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await createPermitPOST(makeReq({}), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it("POST harus mengembalikan 400 Bad Request jika field wajib tidak lengkap", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ id: "fam-1", expatId: "expat-1" });

      const res = await createPermitPOST(makeReq({ permitTypeId: "pt-1" }), { params: PARAMS });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("permitTypeId, number, dan issuedDate wajib diisi");
    });

    it("POST harus mengembalikan 400 Bad Request jika permitType tidak berlaku untuk keluarga", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ id: "fam-1", expatId: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", forFamily: false });

      const res = await createPermitPOST(
        makeReq({ permitTypeId: "pt-1", number: "KITAS-FAM-1", issuedDate: "2026-01-01" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Jenis izin tidak berlaku untuk keluarga");
    });

    it("POST harus mengembalikan 409 Conflict jika izin EPO sudah pernah ada untuk keluarga ini", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ id: "fam-1", expatId: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-epo", forFamily: true, isEPO: true });
      prisma.familyPermit.findFirst.mockResolvedValueOnce({ id: "permit-epo-existing" });

      const res = await createPermitPOST(
        makeReq({ permitTypeId: "pt-epo", number: "EPO-FAM-1", issuedDate: "2026-01-01" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("EPO sudah ada untuk anggota keluarga ini");
    });

    it("POST harus berhasil membuat permit keluarga baru dan mencatat history CREATE (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ id: "fam-1", expatId: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", forFamily: true, isEPO: false });

      const createdPermit = {
        id: "permit-fam-1",
        familyId: "fam-1",
        permitTypeId: "pt-1",
        number: "KITAS-FAM-1",
        issuedDate: new Date("2026-01-01"),
        expiryDate: new Date("2027-01-01"),
      };
      prisma.familyPermit.create.mockResolvedValueOnce(createdPermit);

      const res = await createPermitPOST(
        makeReq({
          permitTypeId: "pt-1",
          number: "KITAS-FAM-1",
          issuedDate: "2026-01-01",
          expiryDate: "2027-01-01",
        }),
        { params: PARAMS }
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("permit-fam-1");

      expect(prisma.familyPermitHistory.create).toHaveBeenCalledWith({
        data: {
          permitId: "permit-fam-1",
          action: "CREATE",
          changes: JSON.stringify({ snapshot: createdPermit }),
          changedBy: "admin-1",
        },
      });
    });
  });

  describe("2. Update & Delete Permit ([permitId]/route.js)", () => {
    it("PATCH harus berhasil mengupdate permit dan mencatat diff history (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      const existing = { id: "permit-1", familyId: "fam-1", number: "OLD-NUM" };
      prisma.familyPermit.findUnique.mockResolvedValueOnce(existing);

      const updated = { ...existing, number: "NEW-NUM" };
      prisma.familyPermit.update.mockResolvedValueOnce(updated);
      diffChanges.mockReturnValueOnce(JSON.stringify({ number: { from: "OLD-NUM", to: "NEW-NUM" } }));

      const res = await permitPATCH(makeReq({ number: "NEW-NUM" }, "PATCH"), { params: PARAMS });
      expect(res.status).toBe(200);

      expect(prisma.familyPermitHistory.create).toHaveBeenCalledWith({
        data: {
          permitId: "permit-1",
          action: "UPDATE",
          changes: JSON.stringify({ number: { from: "OLD-NUM", to: "NEW-NUM" } }),
          changedBy: "admin-1",
        },
      });
    });

    it("DELETE harus membersihkan permit replaced beserta scan-nya dan menghapus permit utama (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      const permitToDelete = { id: "permit-1", familyId: "fam-1", permitTypeId: "pt-1", scanUrl: "/uploads/main.pdf" };
      prisma.familyPermit.findUnique.mockResolvedValueOnce(permitToDelete);

      const replaced = [{ id: "permit-old", scanUrl: "/uploads/old.pdf" }];
      prisma.familyPermit.findMany.mockResolvedValueOnce(replaced);

      const res = await permitDELETE(new Request("http://localhost"), { params: PARAMS });
      expect(res.status).toBe(200);

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old.pdf");
      expect(prisma.familyPermit.delete).toHaveBeenCalledWith({ where: { id: "permit-old" } });
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/main.pdf");
      expect(prisma.familyPermit.delete).toHaveBeenCalledWith({ where: { id: "permit-1" } });
    });
  });

  describe("3. Renew Permit ([permitId]/renew/route.js)", () => {
    it("POST harus mengembalikan 409 Conflict jika izin lama sudah pernah digantikan (status === replaced)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        familyId: "fam-1",
        status: "replaced",
      });

      const res = await renewPOST(makeReq({ number: "NEW-NUM", issuedDate: "2026-01-01" }), { params: PARAMS });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Izin ini sudah pernah diperpanjang");
    });

    it("POST harus berhasil memperpanjang izin dan mencatat 2 audit history (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        familyId: "fam-1",
        permitTypeId: "pt-1",
        status: "active",
      });

      const renewed = { id: "permit-renewed-1", status: "active", renewedFromId: "permit-1" };
      prisma.familyPermit.create.mockResolvedValueOnce(renewed);

      const res = await renewPOST(
        makeReq({ number: "NEW-NUM", issuedDate: "2026-02-01", expiryDate: "2027-02-01" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(201);

      expect(prisma.familyPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: { status: "replaced" },
      });
      expect(prisma.familyPermitHistory.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("4. Scan Permit ([permitId]/scan/route.js)", () => {
    it("POST harus berhasil upload scan PDF dan menghapus scan lama jika ada (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        familyId: "fam-1",
        scanUrl: "/uploads/old-scan.pdf",
      });
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ expatId: "expat-1" });
      saveUploadedFile.mockResolvedValueOnce({ url: "/uploads/new-scan.pdf" });
      prisma.familyPermit.update.mockResolvedValueOnce({ scanUrl: "/uploads/new-scan.pdf" });

      const res = await scanPOST(mockFormData(), { params: PARAMS });
      expect(res.status).toBe(200);

      expect(saveUploadedFile).toHaveBeenCalledWith(
        expect.anything(),
        "file",
        ALLOWED_PDF,
        ["family-permit", "permit-1"],
        "scan"
      );
      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old-scan.pdf");
      expect(prisma.familyPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: { scanUrl: "/uploads/new-scan.pdf" },
      });
    });

    it("DELETE harus menghapus berkas fisik scan dan mereset scanUrl ke null di DB (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPermit.findUnique.mockResolvedValueOnce({
        id: "permit-1",
        familyId: "fam-1",
        scanUrl: "/uploads/scan.pdf",
      });
      prisma.expatFamily.findUnique.mockResolvedValueOnce({ expatId: "expat-1" });
      deleteFileIfExists.mockResolvedValueOnce();
      prisma.familyPermit.update.mockResolvedValueOnce({ scanUrl: null });

      const res = await scanDELETE(new Request("http://localhost"), { params: PARAMS });
      expect(res.status).toBe(200);

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/scan.pdf");
      expect(prisma.familyPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-1" },
        data: { scanUrl: null },
      });
    });
  });
});