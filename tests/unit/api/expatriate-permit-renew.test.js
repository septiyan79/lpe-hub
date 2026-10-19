// tests/unit/api/expatriate-permit-renew.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/expatriate/[id]/permits/[permitId]/renew/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatPermit: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
  return new Request("http://localhost/api/expatriate/expat-1/permits/permit-old/renew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: "expat-1", permitId: "permit-old" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

const VALID_RENEW_PAYLOAD = {
  number: "KITAS-2026-RENEW",
  issuedDate: "2026-02-01",
  expiryDate: "2027-02-01",
};

describe("Expatriate Permit Renewal API Handlers (/api/expatriate/[id]/permits/[permitId]/renew)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/expatriate/[id]/permits/[permitId]/renew", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_RENEW_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika izin lama tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_RENEW_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika izin lama bukan milik expat yang dimaksud", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-old",
        expatId: "other-expat",
      });

      const res = await POST(makeReq(VALID_RENEW_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 409 Conflict jika izin lama sudah berstatus replaced", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-old",
        expatId: "expat-1",
        status: "replaced",
      });

      const res = await POST(makeReq(VALID_RENEW_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toBe("Izin ini sudah pernah diperpanjang");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika number atau issuedDate tidak diisi", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatPermit.findUnique.mockResolvedValueOnce({
        id: "permit-old",
        expatId: "expat-1",
        status: "active",
      });

      const res = await POST(
        makeReq({
          number: "",
          issuedDate: "2026-02-01",
        }),
        { params: PARAMS }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("number dan issuedDate wajib diisi");
      expect(prisma.expatPermit.create).not.toHaveBeenCalled();
    });

    it("harus berhasil memperpanjang izin, mengubah status izin lama, dan mencatat riwayat audit (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);

      const oldPermit = {
        id: "permit-old",
        expatId: "expat-1",
        permitTypeId: "pt-kitas",
        number: "KITAS-OLD",
        status: "active",
      };
      prisma.expatPermit.findUnique.mockResolvedValueOnce(oldPermit);

      const createdNewPermit = {
        id: "permit-new",
        expatId: "expat-1",
        permitTypeId: "pt-kitas",
        number: "KITAS-2026-RENEW",
        issuedDate: new Date("2026-02-01"),
        expiryDate: new Date("2027-02-01"),
        status: "active",
        renewedFromId: "permit-old",
        permitType: { id: "pt-kitas", name: "KITAS" },
      };
      prisma.expatPermit.create.mockResolvedValueOnce(createdNewPermit);

      const res = await POST(makeReq(VALID_RENEW_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBe("permit-new");
      expect(json.renewedFromId).toBe("permit-old");

      // 1. Update status permit lama menjadi replaced
      expect(prisma.expatPermit.update).toHaveBeenCalledWith({
        where: { id: "permit-old" },
        data: { status: "replaced" },
      });

      // 2. Buat permit baru
      expect(prisma.expatPermit.create).toHaveBeenCalledWith({
        data: {
          expatId: "expat-1",
          permitTypeId: "pt-kitas",
          number: "KITAS-2026-RENEW",
          issuedDate: new Date("2026-02-01"),
          expiryDate: new Date("2027-02-01"),
          status: "active",
          renewedFromId: "permit-old",
        },
        include: { permitType: true },
      });

      // 3. Catat 2 entri history
      expect(prisma.expatPermitHistory.create).toHaveBeenNthCalledWith(1, {
        data: {
          permitId: "permit-old",
          action: "REPLACED",
          changes: JSON.stringify({ renewedBy: "permit-new" }),
          changedBy: "admin-1",
        },
      });
      expect(prisma.expatPermitHistory.create).toHaveBeenNthCalledWith(2, {
        data: {
          permitId: "permit-new",
          action: "CREATE",
          changes: JSON.stringify({ renewedFrom: "permit-old" }),
          changedBy: "admin-1",
        },
      });
    });
  });
});