// tests/unit/api/expatriate-passport-renew.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/expatriate/[id]/passport/renew/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    expatPassportHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/expatriate/exp-1/passport/renew", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeParams(id = "exp-1") {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { user: { id: "admin-1", role: "admin" } };
const OLD_EXPAT = {
  id: "exp-1",
  passportNo: "OLD12345",
  passportIssuedDate: new Date("2015-01-01"),
  passportExpiryDate: new Date("2025-01-01"),
  passportScanUrl: "/uploads/expat/exp-1/passport.pdf",
};

describe("POST /api/expatriate/[id]/passport/renew", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(OLD_EXPAT);

    // Kirim tanpa passportExpiryDate
    const res = await POST(
      makeReq({ passportNo: "NEW99999", passportIssuedDate: "2025-01-02" }),
      makeParams()
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Semua field wajib diisi");
    expect(prisma.expatPassportHistory.create).not.toHaveBeenCalled();
    expect(prisma.expatriate.update).not.toHaveBeenCalled();
  });

  it("archives old passport, updates to new passport, resets scanUrl, and returns 200", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(OLD_EXPAT);
    prisma.expatPassportHistory.create.mockResolvedValue({ id: "hist-1" });

    const updatedExpat = {
      ...OLD_EXPAT,
      passportNo: "NEW99999",
      passportIssuedDate: new Date("2025-01-02"),
      passportExpiryDate: new Date("2035-01-02"),
      passportScanUrl: null,
    };
    prisma.expatriate.update.mockResolvedValue(updatedExpat);

    const res = await POST(
      makeReq({
        passportNo: "NEW99999",
        passportIssuedDate: "2025-01-02",
        passportExpiryDate: "2035-01-02",
      }),
      makeParams("exp-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);

    // Verifikasi arsip paspor lama
    expect(prisma.expatPassportHistory.create).toHaveBeenCalledWith({
      data: {
        expatId: "exp-1",
        passportNo: OLD_EXPAT.passportNo,
        issuedDate: OLD_EXPAT.passportIssuedDate,
        expiryDate: OLD_EXPAT.passportExpiryDate,
        scanUrl: OLD_EXPAT.passportScanUrl,
        replacedBy: "admin-1",
      },
    });

    // Verifikasi update data paspor baru
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: {
        passportNo: "NEW99999",
        passportIssuedDate: new Date("2025-01-02"),
        passportExpiryDate: new Date("2035-01-02"),
        passportScanUrl: null,
      },
    });

    expect(data.passportNo).toBe("NEW99999");
    expect(data.passportScanUrl).toBeNull();
  });
});