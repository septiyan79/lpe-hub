// tests/unit/api/expatriate-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/expatriate/[id]/route";

vi.mock("@/app/api/expatriate/_helpers", () => ({
  requireExpatAdmin: vi.fn(),
  diffChanges: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    expatriate: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expatHistory: {
      create: vi.fn(),
    },
  },
}));

import { requireExpatAdmin, diffChanges } from "@/app/api/expatriate/_helpers";
import prisma from "@/lib/prisma";

function makeReq(body, method = "PATCH") {
  const options = { method };
  if (method !== "GET" && method !== "HEAD" && body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/expatriate/exp-1", options);
}

function makeParams(id = "exp-1") {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { user: { id: "admin-1", role: "admin" } };
const EXISTING_EXPAT = {
  id: "exp-1",
  name: "John Doe",
  department: "IT",
  renewalNo: 1,
  birthDate: new Date("1985-05-20"),
};

describe("GET /api/expatriate/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await GET(makeReq({}, "GET"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await GET(makeReq({}, "GET"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns expatriate details with all relations", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);

    const res = await GET(makeReq({}, "GET"), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.expatriate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "exp-1" } })
    );
    expect(data.id).toBe("exp-1");
  });
});

describe("PATCH /api/expatriate/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await PATCH(makeReq({ name: "Jane" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeReq({ name: "Jane" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("updates string, date, int fields and creates history diff", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);

    const updatedExpat = {
      ...EXISTING_EXPAT,
      name: "John Smith",
      arrivalDate: new Date("2024-02-01"),
      renewalNo: 2,
    };
    prisma.expatriate.update.mockResolvedValue(updatedExpat);
    diffChanges.mockReturnValue(JSON.stringify({ name: { before: "John Doe", after: "John Smith" } }));
    prisma.expatHistory.create.mockResolvedValue({ id: "hist-1" });

    const res = await PATCH(
      makeReq({
        name: "John Smith",
        arrivalDate: "2024-02-01",
        renewalNo: "2",
      }),
      makeParams()
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.expatriate.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: {
        name: "John Smith",
        arrivalDate: new Date("2024-02-01"),
        renewalNo: 2,
      },
    });
    expect(diffChanges).toHaveBeenCalledWith(EXISTING_EXPAT, updatedExpat);
    expect(prisma.expatHistory.create).toHaveBeenCalledWith({
      data: {
        expatId: "exp-1",
        action: "UPDATE",
        changes: JSON.stringify({ name: { before: "John Doe", after: "John Smith" } }),
        changedBy: "admin-1",
      },
    });
    expect(data.name).toBe("John Smith");
  });
});

describe("DELETE /api/expatriate/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthorized", async () => {
    requireExpatAdmin.mockResolvedValue(null);

    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when expatriate not found", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    expect(res.status).toBe(404);
  });

  it("deletes expatriate and returns { ok: true }", async () => {
    requireExpatAdmin.mockResolvedValue(SESSION);
    prisma.expatriate.findUnique.mockResolvedValue(EXISTING_EXPAT);
    prisma.expatriate.delete.mockResolvedValue(EXISTING_EXPAT);

    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.expatriate.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
    expect(data).toEqual({ ok: true });
  });
});