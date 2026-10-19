// tests/unit/api/expatriate-passport-history.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/expatriate/[id]/passport/history/[historyId]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
}));

vi.mock("@/app/api/expatriate/_upload-helpers", () => ({
  deleteFileIfExists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatPassportHistory: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";
import { deleteFileIfExists } from "@/app/api/expatriate/_upload-helpers";
import prisma from "@/lib/prisma";

function makeParams(id = "exp-1", historyId = "hist-1") {
  return { params: Promise.resolve({ id, historyId }) };
}

const SESSION = { user: { id: "admin-1", role: "admin" } };
const HISTORY_RECORD = {
  id: "hist-1",
  expatId: "exp-1",
  scanUrl: "/uploads/expat/exp-1/old-passport.pdf",
};

describe("DELETE /api/expatriate/[id]/passport/history/[historyId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await DELETE({}, makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when passport history not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatPassportHistory.findUnique.mockResolvedValue(null);

    const res = await DELETE({}, makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 404 when passport history belongs to another expatriate", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatPassportHistory.findUnique.mockResolvedValue({
      id: "hist-1",
      expatId: "other-expat",
      scanUrl: null,
    });

    const res = await DELETE({}, makeParams("exp-1", "hist-1"));
    expect(res.status).toBe(404);
  });

  it("deletes file scan if exists, deletes history record, and returns { ok: true }", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatPassportHistory.findUnique.mockResolvedValue(HISTORY_RECORD);
    deleteFileIfExists.mockResolvedValue(undefined);
    prisma.expatPassportHistory.delete.mockResolvedValue(HISTORY_RECORD);

    const res = await DELETE({}, makeParams("exp-1", "hist-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(deleteFileIfExists).toHaveBeenCalledWith(HISTORY_RECORD.scanUrl);
    expect(prisma.expatPassportHistory.delete).toHaveBeenCalledWith({
      where: { id: "hist-1" },
    });
    expect(data).toEqual({ ok: true });
  });
});