// tests/unit/api/expatriate-family-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/expatriate/[id]/family/[familyId]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
  diffChanges: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatFamily: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expatFamilyHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin, diffChanges } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/expat-1/family/fam-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: "expat-1", familyId: "fam-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Expatriate Family Detail API Handlers (/api/expatriate/[id]/family/[familyId])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/expatriate/[id]/family/[familyId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ name: "Updated Name" }), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika anggota keluarga tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ name: "Updated Name" }), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika expatId pada anggota keluarga tidak cocok", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "other-expat",
      });

      const res = await PATCH(makeReq({ name: "Updated Name" }), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatFamily.update).not.toHaveBeenCalled();
    });

    it("harus berhasil update data string & tanggal, panggil diffChanges, dan catat riwayat UPDATE (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const existingMember = {
        id: "fam-1",
        expatId: "expat-1",
        name: "Jane Doe",
        familyStatus: "Spouse",
        arrivalDate: new Date("2022-01-10"),
      };
      prisma.expatFamily.findUnique.mockResolvedValueOnce(existingMember);

      const updatedMember = {
        ...existingMember,
        name: "Jane Smith Doe",
        familyStatus: "Wife",
        arrivalDate: new Date("2022-02-15"),
      };
      prisma.expatFamily.update.mockResolvedValueOnce(updatedMember);
      diffChanges.mockReturnValueOnce(JSON.stringify({ name: { from: "Jane Doe", to: "Jane Smith Doe" } }));

      const res = await PATCH(
        makeReq({
          name: "Jane Smith Doe",
          familyStatus: "Wife",
          arrivalDate: "2022-02-15",
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Jane Smith Doe");

      expect(prisma.expatFamily.update).toHaveBeenCalledWith({
        where: { id: "fam-1" },
        data: {
          name: "Jane Smith Doe",
          familyStatus: "Wife",
          arrivalDate: new Date("2022-02-15"),
        },
      });

      expect(diffChanges).toHaveBeenCalledWith(existingMember, updatedMember);
      expect(prisma.expatFamilyHistory.create).toHaveBeenCalledWith({
        data: {
          familyId: "fam-1",
          action: "UPDATE",
          changes: JSON.stringify({ name: { from: "Jane Doe", to: "Jane Smith Doe" } }),
          changedBy: "admin-1",
        },
      });
    });
  });

  describe("DELETE /api/expatriate/[id]/family/[familyId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/family/fam-1", { method: "DELETE" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika anggota keluarga tidak ditemukan atau mismatch expatId", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce(null);

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/family/fam-1", { method: "DELETE" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatFamily.delete).not.toHaveBeenCalled();
    });

    it("harus berhasil menghapus data anggota keluarga dan mengembalikan 200 OK", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatFamily.findUnique.mockResolvedValueOnce({
        id: "fam-1",
        expatId: "expat-1",
      });
      prisma.expatFamily.delete.mockResolvedValueOnce({ id: "fam-1" });

      const res = await DELETE(
        new Request("http://localhost/api/expatriate/expat-1/family/fam-1", { method: "DELETE" }),
        { params: PARAMS }
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });
      expect(prisma.expatFamily.delete).toHaveBeenCalledWith({
        where: { id: "fam-1" },
      });
    });
  });
});