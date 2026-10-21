// tests/unit/api/expatriate-family.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/expatriate/[id]/family/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findUnique: vi.fn(),
    },
    expatFamily: {
      create: vi.fn(),
    },
    expatFamilyHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/expat-1/family", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: "expat-1" });
const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

const VALID_FAMILY_PAYLOAD = {
  name: "Jane Doe",
  gender: "Female",
  birthPlace: "Osaka",
  birthDate: "1990-03-15",
  passportNo: "B98765432",
  passportIssuedDate: "2021-06-01",
  passportExpiryDate: "2031-06-01",
  familyStatus: "Spouse",
  arrivalDate: "2022-01-10",
};

describe("Expatriate Family API Handlers (/api/expatriate/[id]/family)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/expatriate/[id]/family", () => {
    it("harus mengembalikan 403 Forbidden jika user bukan admin expat", async () => {
      requireExpatAdmin.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_FAMILY_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(prisma.expatFamily.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 404 Not Found jika expat induk tidak ditemukan", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce(null);

      const res = await POST(makeReq(VALID_FAMILY_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(prisma.expatFamily.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika ada field wajib yang belum diisi (misal: familyStatus)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });

      const invalidPayload = { ...VALID_FAMILY_PAYLOAD, familyStatus: "" };
      const res = await POST(makeReq(invalidPayload), { params: PARAMS });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Semua field wajib diisi");
      expect(prisma.expatFamily.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 Bad Request jika arrivalDate belum diisi", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });

      const invalidPayload = { ...VALID_FAMILY_PAYLOAD, arrivalDate: null };
      const res = await POST(makeReq(invalidPayload), { params: PARAMS });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Semua field wajib diisi");
      expect(prisma.expatFamily.create).not.toHaveBeenCalled();
    });

    it("harus berhasil membuat anggota keluarga baru dan mencatat history CREATE (201 Created)", async () => {
      requireExpatAdmin.mockResolvedValueOnce(SESSION);
      prisma.expatriate.findUnique.mockResolvedValueOnce({ id: "expat-1" });

      const createdMember = {
        id: "family-1",
        expatId: "expat-1",
        ...VALID_FAMILY_PAYLOAD,
        birthDate: new Date(VALID_FAMILY_PAYLOAD.birthDate),
        passportIssuedDate: new Date(VALID_FAMILY_PAYLOAD.passportIssuedDate),
        passportExpiryDate: new Date(VALID_FAMILY_PAYLOAD.passportExpiryDate),
        arrivalDate: new Date(VALID_FAMILY_PAYLOAD.arrivalDate),
      };
      prisma.expatFamily.create.mockResolvedValueOnce(createdMember);

      const res = await POST(makeReq(VALID_FAMILY_PAYLOAD), { params: PARAMS });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBe("family-1");
      expect(json.name).toBe("Jane Doe");

      expect(prisma.expatFamily.create).toHaveBeenCalledWith({
        data: {
          expatId: "expat-1",
          name: "Jane Doe",
          gender: "Female",
          birthPlace: "Osaka",
          birthDate: new Date("1990-03-15"),
          passportNo: "B98765432",
          passportIssuedDate: new Date("2021-06-01"),
          passportExpiryDate: new Date("2031-06-01"),
          familyStatus: "Spouse",
          arrivalDate: new Date("2022-01-10"),
        },
      });

      expect(prisma.expatFamilyHistory.create).toHaveBeenCalledWith({
        data: {
          familyId: "family-1",
          action: "CREATE",
          changes: JSON.stringify({ snapshot: createdMember }),
          changedBy: "admin-1",
        },
      });
    });
  });
});