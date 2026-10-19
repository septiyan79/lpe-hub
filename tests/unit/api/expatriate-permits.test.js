// tests/unit/api/expatriate-permits.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/expatriate/[id]/permits/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findUnique: vi.fn(),
    },
    permitType: {
      findUnique: vi.fn(),
    },
    expatPermit: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    expatPermitHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/expat-1/permits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: "expat-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

const VALID_PAYLOAD = {
  permitTypeId: "pt-kitas",
  number: "KITAS-2026-001",
  issuedDate: "2026-01-01",
  expiryDate: "2027-01-01",
};

describe("Expatriate Permits API Handlers (/api/expatriate/[id]/permits)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/expatriate/[id]/permits", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika expat tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika field wajib tidak lengkap", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });

      // Missing issuedDate
      const res = await POST(
        makeReq({
          permitTypeId: "pt-kitas",
          number: "KITAS-001",
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("permitTypeId, number, dan issuedDate wajib diisi");
      expect(prisma.permitType.findUnique).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika permitTypeId tidak ditemukan di master permitType", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Jenis izin tidak ditemukan");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika jenis izin tidak berlaku untuk expat (forExpat: false)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-family-only",
        name: "Izin Keluarga",
        forExpat: false,
      });

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Jenis izin tidak berlaku untuk expatriate");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 409 Conflict jika izin EPO sudah pernah diterbitkan untuk expat ini", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-epo",
        name: "EPO",
        forExpat: true,
        isEPO: true,
      });
      prisma.expatPermit.findFirst.mockResolvedValueOnce({
        id: "permit-epo-existing",
        expatId: "expat-1",
      });

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toBe("EPO sudah ada untuk expatriate ini");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus berhasil membuat permit baru dan mencatat history CREATE (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-kitas",
        name: "KITAS",
        forExpat: true,
        isEPO: false,
      });

      const mockCreatedPermit = {
        id: "permit-new",
        expatId: "expat-1",
        permitTypeId: "pt-kitas",
        number: "KITAS-2026-001",
        issuedDate: new Date("2026-01-01"),
        expiryDate: new Date("2027-01-01"),
        permitType: { id: "pt-kitas", name: "KITAS" },
      };
      prisma.expatPermit.create.mockResolvedValueOnce(mockCreatedPermit);

      const res = await POST(makeReq(VALID_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBe("permit-new");
      expect(prisma.expatPermit.create).toHaveBeenCalledWith({
        data: {
          expatId: "expat-1",
          permitTypeId: "pt-kitas",
          number: "KITAS-2026-001",
          issuedDate: new Date("2026-01-01"),
          expiryDate: new Date("2027-01-01"),
        },
        include: { permitType: true },
      });

      expect(prisma.expatPermitHistory.create).toHaveBeenCalledWith({
        data: {
          permitId: "permit-new",
          action: "CREATE",
          changes: JSON.stringify({ snapshot: mockCreatedPermit }),
          changedBy: "admin-1",
        },
      });
    });

    it("harus berhasil membuat permit EPO baru jika belum ada dan expiryDate null (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });
      prisma.permitType.findUnique.mockResolvedValueOnce({
        id: "pt-epo",
        name: "EPO",
        forExpat: true,
        isEPO: true,
      });
      prisma.expatPermit.findFirst.mockResolvedValueOnce(null);

      const mockCreatedEPO = {
        id: "permit-epo-new",
        expatId: "expat-1",
        permitTypeId: "pt-epo",
        number: "EPO-2026-001",
        issuedDate: new Date("2026-06-01"),
        expiryDate: null,
        permitType: { id: "pt-epo", name: "EPO" },
      };
      prisma.expatPermit.create.mockResolvedValueOnce(mockCreatedEPO);

      const res = await POST(
        makeReq({
          permitTypeId: "pt-epo",
          number: "EPO-2026-001",
          issuedDate: "2026-06-01",
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("permit-epo-new");
      expect(prisma.expatPermit.create).toHaveBeenCalledWith({
        data: {
          expatId: "expat-1",
          permitTypeId: "pt-epo",
          number: "EPO-2026-001",
          issuedDate: new Date("2026-06-01"),
          expiryDate: null,
        },
        include: { permitType: true },
      });
    });
  });
});