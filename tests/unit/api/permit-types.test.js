// tests/unit/api/permit-types.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/expatriate/permit-types/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    permitType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/permit-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

describe("Permit Types API Handlers (/api/expatriate/permit-types)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/expatriate/permit-types", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await GET();
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.permitType.findMany).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 200 OK dengan daftar permit types yang diurutkan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      const mockTypes = [
        { id: "pt-1", name: "RPTKA", order: 1 },
        { id: "pt-2", name: "KITAS", order: 2 },
      ];
      prisma.permitType.findMany.mockResolvedValueOnce(mockTypes);

      const res = await GET();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual(mockTypes);
      expect(prisma.permitType.findMany).toHaveBeenCalledWith({
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });
    });
  });

  describe("POST /api/expatriate/permit-types", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await POST(makeReq({ name: "KITAS" }));
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.permitType.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika name kosong atau hanya whitespace", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const res = await POST(makeReq({ name: "   " }));
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Nama wajib diisi");
      expect(prisma.permitType.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 409 Conflict jika nama jenis izin sudah ada", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce({ id: "pt-1", name: "KITAS" });

      const res = await POST(makeReq({ name: "KITAS" }));
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toBe("Nama jenis izin sudah ada");
      expect(prisma.permitType.findUnique).toHaveBeenCalledWith({
        where: { name: "KITAS" },
      });
      expect(prisma.permitType.create).not.toHaveBeenCalled();
    });

    it("harus berhasil membuat permit type dengan default flags (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce(null);

      const createdType = {
        id: "pt-new",
        name: "KITAS",
        description: null,
        forExpat: true,
        forFamily: true,
        hasExpiry: true,
        isOneTime: false,
        isEPO: false,
        linkedToWorkPermit: false,
        order: 0,
      };
      prisma.permitType.create.mockResolvedValueOnce(createdType);

      const res = await POST(makeReq({ name: "  KITAS  " }));
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toEqual(createdType);
      expect(prisma.permitType.create).toHaveBeenCalledWith({
        data: {
          name: "KITAS",
          description: null,
          forExpat: true,
          forFamily: true,
          hasExpiry: true,
          isOneTime: false,
          isEPO: false,
          linkedToWorkPermit: false,
          order: 0,
        },
      });
    });

    it("harus berhasil membuat permit type dengan custom flags dan order (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.permitType.findUnique.mockResolvedValueOnce(null);

      const customPayload = {
        name: "Exit Permit Only (EPO)",
        description: "Izin pengakhiran masa kerja",
        forExpat: true,
        forFamily: false,
        hasExpiry: false,
        isOneTime: true,
        isEPO: true,
        linkedToWorkPermit: false,
        order: "5",
      };

      const createdType = {
        id: "pt-epo",
        ...customPayload,
        order: 5,
      };
      prisma.permitType.create.mockResolvedValueOnce(createdType);

      const res = await POST(makeReq(customPayload));
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toEqual(createdType);
      expect(prisma.permitType.create).toHaveBeenCalledWith({
        data: {
          name: "Exit Permit Only (EPO)",
          description: "Izin pengakhiran masa kerja",
          forExpat: true,
          forFamily: false,
          hasExpiry: false,
          isOneTime: true,
          isEPO: true,
          linkedToWorkPermit: false,
          order: 5,
        },
      });
    });
  });
});