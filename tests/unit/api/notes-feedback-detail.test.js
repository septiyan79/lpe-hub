// tests/unit/api/notes-feedback-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/notes/[id]/progress/[progressId]/feedback/[feedbackId]/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    note: { findUnique: vi.fn() },
    feedback: { delete: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function makeReq() {
  return new Request("http://localhost/api/notes/n1/progress/p1/feedback/f1", {
    method: "DELETE",
  });
}

function makeParams(id = "n1", progressId = "p1", feedbackId = "f1") {
  return { params: Promise.resolve({ id, progressId, feedbackId }) };
}

const SESSION = { user: { id: "u1" } };
const NOTE = { id: "n1", userId: "u1" };

describe("DELETE /api/notes/[id]/progress/[progressId]/feedback/[feedbackId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when note not found or not owned by user", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it("deletes feedback and returns success", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.feedback.delete.mockResolvedValue({ id: "f1" });

    const res = await DELETE(makeReq(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.feedback.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
    expect(data).toEqual({ success: true });
  });
});