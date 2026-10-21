// tests/unit/api/expatriate-family-passport.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as renewPOST } from "@/app/api/expatriate/[id]/family/[familyId]/passport/renew/route";
import { DELETE as historyDELETE } from "@/app/api/expatriate/[id]/family/[familyId]/passport/history/[historyId]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  deleteFileIfExists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatFamily: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    familyPassportHistory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/expat-1/family/fam-1/passport/renew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const RENEW_PARAMS = Promise.resolve({ id: "expat-1", familyId: "fam-1" });
const HISTORY_PARAMS = Promise.resolve({ id: "expat-1", familyId: "fam-1", historyId: "hist-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

const VALID_RENEW_PAYLOAD = {
  passportNo: "NEW-PASS-999",
  passportIssuedDate: "2026-02-01",
  passportExpiryDate: "2036-02-01",
};

describe("Expatriate Family Passport Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/expatriate/[id]/family/[familyId]/passport/renew", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await renewPOST(makeReq(VALID_RENEW_PAYLOAD), { params: RENEW_PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.familyPassportHistory.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika member tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await renewPOST(makeReq(VALID_RENEW_PAYLOAD), { params: RENEW_PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(prisma.familyPassportHistory.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika field paspor baru tidak lengkap", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
      });

      const res = await renewPOST(
        makeReq({
          passportNo: "",
          passportIssuedDate: "2026-02-01",
          passportExpiryDate: "2036-02-01",
        }),
        { params: RENEW_PARAMS }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Semua field wajib diisi");
      expect(prisma.familyPassportHistory.create).not.toHaveBeenCalled();
    });

    it("harus berhasil mengarsipkan paspor lama dan mengupdate ke paspor baru (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const oldMember = {
        id: "fam-1",
        expatId: "expat-1",
        passportNo: "OLD-PASS-111",
        passportIssuedDate: new Date("2016-01-01"),
        passportExpiryDate: new Date("2026-01-01"),
        passportScanUrl: "/uploads/old-scan.pdf",
      };
      prisma.expatFamily.findUnique.mockResolvedValueOnce(oldMember);

      const updatedMember = {
        ...oldMember,
        passportNo: "NEW-PASS-999",
        passportIssuedDate: new Date("2026-02-01"),
        passportExpiryDate: new Date("2036-02-01"),
        passportScanUrl: null,
      };
      prisma.expatFamily.update.mockResolvedValueOnce(updatedMember);

      const res = await renewPOST(makeReq(VALID_RENEW_PAYLOAD), { params: RENEW_PARAMS });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.passportNo).toBe("NEW-PASS-999");
      expect(json.passportScanUrl).toBeNull();

      // Cek arsip riwayat paspor lama
      expect(prisma.familyPassportHistory.create).toHaveBeenCalledWith({
        data: {
          familyId: "fam-1",
          passportNo: "OLD-PASS-111",
          issuedDate: oldMember.passportIssuedDate,
          expiryDate: oldMember.passportExpiryDate,
          scanUrl: "/uploads/old-scan.pdf",
          replacedBy: "admin-1",
        },
      });

      // Cek update data paspor baru
      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: {
          passportNo: "NEW-PASS-999",
          passportIssuedDate: new Date("2026-02-01"),
          passportExpiryDate: new Date("2036-02-01"),
          passportScanUrl: null,
        },
      });
    });
  });

  describe("DELETE /api/expatriate/[id]/family/[familyId]/passport/history/[historyId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await historyDELETE(new Request("http://localhost"), { params: HISTORY_PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.familyPassportHistory.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika history tidak ditemukan atau mismatch familyId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPassportHistory.findUnique.mockResolvedValueOnce({
        id: "hist-1",
        familyId: "other-family",
        scanUrl: null,
      });

      const res = await historyDELETE(new Request("http://localhost"), { params: HISTORY_PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(prisma.familyPassportHistory.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika member keluarga tidak cocok dengan expat induk", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPassportHistory.findUnique.mockResolvedValueOnce({
        id: "hist-1",
        familyId: "fam-1",
        scanUrl: null,
      });
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        expatId: "other-expat",
      });

      const res = await historyDELETE(new Request("http://localhost"), { params: HISTORY_PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Tidak ditemukan");
      expect(prisma.familyPassportHistory.delete).not.toHaveBeenCalled();
    });

    it("harus menghapus file fisik scan dan record riwayat paspor (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.familyPassportHistory.findUnique.mockResolvedValueOnce({
        id: "hist-1",
        familyId: "fam-1",
        scanUrl: "/uploads/old-scan.pdf",
      });
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        expatId: "expat-1",
      });
      deleteFileIfExists.mockResolvedValueOnce();
      prisma.familyPassportHistory.delete.mockResolvedValueOnce({ id: "hist-1" });

      const res = await historyDELETE(new Request("http://localhost"), { params: HISTORY_PARAMS });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });

      expect(deleteFileIfExists).toHaveBeenCalledWith("/uploads/old-scan.pdf");
      expect(prisma.familyPassportHistory.delete).toHaveBeenCalledWith({
        where: { id: "hist-1" },
      });
    });
  });
});