// tests/unit/api/permit-types-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/expatriate/permit-types/[typeId]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    permitType: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/permit-types/pt-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ typeId: "pt-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Permit Types Detail API Handlers (/api/expatriate/permit-types/[typeId])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/expatriate/permit-types/[typeId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ name: "Updated" }), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.permitType.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit type tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce(null);

      const res = await PATCH(makeReq({ name: "Updated" }), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.permitType.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika name dikirim kosong atau hanya whitespace", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", name: "KITAS" });

      const res = await PATCH(makeReq({ name: "   " }), { params: PARAMS });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Nama wajib diisi");
      expect(prisma.permitType.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 409 Conflict jika nama baru sudah digunakan oleh permit type lain", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      // Panggilan 1: Cek existing id
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", name: "KITAS" });
      // Panggilan 2: Cek duplicate name
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-2", name: "RPTKA" });

      const res = await PATCH(makeReq({ name: "RPTKA" }), { params: PARAMS });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toBe("Nama jenis izin sudah ada");
      expect(prisma.permitType.update).not.toHaveBeenCalled();
    });

    it("harus berhasil update metadata permit type dan mengembalikan 200 OK", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      // Panggilan 1: Cek existing id
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", name: "KITAS" });
      // Panggilan 2: Cek duplicate name (menemukan dirinya sendiri pt-1 sehingga tidak conflict)
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", name: "KITAS" });

      const updatedData = {
        id: "pt-1",
        name: "KITAS",
        description: "Kartu Izin Tinggal Terbatas",
        forExpat: true,
        forFamily: false,
        hasExpiry: true,
        isOneTime: false,
        isEPO: false,
        linkedToWorkPermit: true,
        order: 3,
      };
      prisma.permitType.update.mockResolvedValueOnce(updatedData);

      const res = await PATCH(
        makeReq({
          name: "KITAS",
          description: "Kartu Izin Tinggal Terbatas",
          forExpat: true,
          forFamily: false,
          hasExpiry: true,
          isOneTime: false,
          isEPO: false,
          linkedToWorkPermit: true,
          order: "3",
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(updatedData);
      expect(prisma.permitType.update).toHaveBeenCalledWith({
        where: { id: "pt-1" },
        data: {
          name: "KITAS",
          description: "Kartu Izin Tinggal Terbatas",
          forExpat: true,
          forFamily: false,
          hasExpiry: true,
          isOneTime: false,
          isEPO: false,
          linkedToWorkPermit: true,
          order: 3,
        },
      });
    });
  });

  describe("DELETE /api/expatriate/permit-types/[typeId]", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await DELETE(new Request("http://localhost/api/expatriate/permit-types/pt-1", { method: "DELETE" }), {
        params: PARAMS,
      });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.permitType.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permit type tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce(null);

      const res = await DELETE(new Request("http://localhost/api/expatriate/permit-types/pt-1", { method: "DELETE" }), {
        params: PARAMS,
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.permitType.delete).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 409 Conflict jika jenis izin masih digunakan oleh expat atau family permits", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-1",
        name: "KITAS",
        _count: {
          expatPermits: 2,
          familyPermits: 1,
        },
      });

      const res = await DELETE(new Request("http://localhost/api/expatriate/permit-types/pt-1", { method: "DELETE" }), {
        params: PARAMS,
      });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toBe("Jenis izin ini masih digunakan oleh 3 permit dan tidak dapat dihapus");
      expect(prisma.permitType.delete).not.toHaveBeenCalled();
    });

    it("harus berhasil menghapus permit type jika tidak ada relasi aktif (200 OK)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-1",
        name: "KITAS",
        _count: {
          expatPermits: 0,
          familyPermits: 0,
        },
      });
      prisma.permitType.delete.mockResolvedValueOnce({ id: "pt-1" });

      const res = await DELETE(new Request("http://localhost/api/expatriate/permit-types/pt-1", { method: "DELETE" }), {
        params: PARAMS,
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ ok: true });
      expect(prisma.permitType.delete).toHaveBeenCalledWith({
        where: { id: "pt-1" },
      });
    });
  });
});