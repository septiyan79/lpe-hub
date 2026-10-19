// tests/unit/api/notes-progress-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/notes/[id]/progress/[progressId]/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    note: { findUnique: vi.fn() },
    progress: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function makeReq(body, method = "PATCH") {
  return new Request("http://localhost/api/notes/n1/progress/p1", {
    method,
    body: JSON.stringify(body),
  });
}

function makeParams(id = "n1", progressId = "p1") {
  return { params: Promise.resolve({ id, progressId }) };
}

const SESSION = { user: { id: "u1" } };
const NOTE = { id: "n1", userId: "u1" };
const PROGRESS = { id: "p1", noteId: "n1", act: "Aktivitas 1", status: "Plan" };

// -------------------------------------------------------------------
describe("PATCH /api/notes/[id]/progress/[progressId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await PATCH(makeReq({ status: "Done" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when note not found or not owned by user", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeReq({ status: "Done" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 404 when progress not found or does not belong to note", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue({ id: "p1", noteId: "different-note" });

    const res = await PATCH(makeReq({ status: "Done" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("updates progress fields and returns updated object", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue(PROGRESS);

    const updated = {
      ...PROGRESS,
      act: "Aktivitas baru",
      status: "Done",
      tglAct: new Date("2024-05-01"),
      feedbacks: [],
    };
    prisma.progress.update.mockResolvedValue(updated);

    const res = await PATCH(
      makeReq({ act: "Aktivitas baru", status: "Done", tglAct: "2024-05-01" }),
      makeParams()
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.progress.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        act: "Aktivitas baru",
        status: "Done",
        tglAct: new Date("2024-05-01"),
      },
      include: { feedbacks: true },
    });
    expect(data.status).toBe("Done");
  });
});

// -------------------------------------------------------------------
describe("DELETE /api/notes/[id]/progress/[progressId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when note/progress is not owned", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    expect(res.status).toBe(404);
  });

  it("deletes progress and returns success", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue(PROGRESS);
    prisma.progress.delete.mockResolvedValue(PROGRESS);

    const res = await DELETE(makeReq({}, "DELETE"), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.progress.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(data).toEqual({ success: true });
  });
});