// tests/unit/api/expatriate.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/expatriate/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    expatHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const SESSION = { user: { id: "admin-1", role: "expatriate_admin" } };

const VALID_EXPAT_PAYLOAD = {
  name: "John Doe",
  birthPlace: "Tokyo",
  birthDate: "1985-05-20",
  gender: "Male",
  passportNo: "A12345678",
  passportIssuedDate: "2020-01-10",
  passportExpiryDate: "2030-01-10",
  position: "Technical Advisor",
  department: "Engineering",
  presentAddress: "Jakarta",
  permanentAddress: "Tokyo, Japan",
  arrivalDate: "2024-01-15",
};

describe("GET /api/expatriate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when not authorized by requireExpatAdmin", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns expatriate list with permits and family count", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    const mockExpats = [
      { id: "e1", name: "John Doe", permits: [], _count: { families: 2 } },
    ];
    prisma.expatriate.findMany.mockResolvedValue(mockExpats);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.expatriate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        permits: {
          orderBy: { issuedDate: "asc" },
          include: { permitType: true },
        },
        _count: { select: { families: true } },
      },
    });
    expect(data).toEqual(mockExpats);
  });
});

describe("POST /api/expatriate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when not authorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await POST(makeReq(VALID_EXPAT_PAYLOAD));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);

    // Kirim payload tidak lengkap (tanpa passportNo)
    const invalidPayload = { ...VALID_EXPAT_PAYLOAD };
    delete invalidPayload.passportNo;

    const res = await POST(makeReq(invalidPayload));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Semua field wajib diisi");
    expect(prisma.expatriate.create).not.toHaveBeenCalled();
  });

  it("creates expatriate, records history, and returns 201", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    const createdExpat = { id: "exp-1", ...VALID_EXPAT_PAYLOAD };
    prisma.expatriate.create.mockResolvedValue(createdExpat);
    prisma.expatHistory.create.mockResolvedValue({ id: "hist-1" });

    const res = await POST(makeReq(VALID_EXPAT_PAYLOAD));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(prisma.expatriate.create).toHaveBeenCalledWith({
      data: {
        name: "John Doe",
        birthPlace: "Tokyo",
        birthDate: new Date("1985-05-20"),
        gender: "Male",
        passportNo: "A12345678",
        passportIssuedDate: new Date("2020-01-10"),
        passportExpiryDate: new Date("2030-01-10"),
        position: "Technical Advisor",
        department: "Engineering",
        presentAddress: "Jakarta",
        permanentAddress: "Tokyo, Japan",
        arrivalDate: new Date("2024-01-15"),
      },
    });
    expect(prisma.expatHistory.create).toHaveBeenCalledWith({
      data: {
        expatId: "exp-1",
        action: "CREATE",
        changes: JSON.stringify({ snapshot: createdExpat }),
        changedBy: "admin-1",
      },
    });
    expect(data).toEqual(createdExpat);
  });
});