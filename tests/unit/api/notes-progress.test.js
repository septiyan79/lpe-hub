// tests/unit/api/notes-progress.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/notes/[id]/progress/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    note: { findUnique: vi.fn() },
    progress: { create: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/notes/n1/progress", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { user: { id: "u1" } };
const NOTE = { id: "n1", userId: "u1", title: "Belajar" };

describe("POST /api/notes/[id]/progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeReq({ act: "Membaca" }), makeParams("n1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when note not found or not owned", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ act: "Membaca" }), makeParams("n1"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when act is empty", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    const res = await POST(makeReq({ act: "   " }), makeParams("n1"));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Aktivitas wajib diisi");
  });

  it("uses default status Plan when status is not provided", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    const created = { id: "p1", act: "Membaca", status: "Plan", tglAct: null, feedbacks: [] };
    prisma.progress.create.mockResolvedValue(created);

    const res = await POST(makeReq({ act: "Membaca" }), makeParams("n1"));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(prisma.progress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "Plan" }) })
    );
    expect(data.status).toBe("Plan");
  });

  it("creates progress with all fields and returns 201", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    const created = { id: "p1", act: "Membaca", status: "Done", tglAct: new Date("2024-01-01"), feedbacks: [] };
    prisma.progress.create.mockResolvedValue(created);

    const res = await POST(
      makeReq({ act: "  Membaca  ", status: "Done", tglAct: "2024-01-01" }),
      makeParams("n1")
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(prisma.progress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ act: "Membaca", status: "Done" }),
      })
    );
    expect(data.id).toBe("p1");
  });
});