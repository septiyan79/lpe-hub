// tests/unit/api/notes-feedback.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/notes/[id]/progress/[progressId]/feedback/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    note: { findUnique: vi.fn() },
    progress: { findUnique: vi.fn() },
    feedback: { create: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function makeReq(body) {
  return new Request("http://localhost/api/notes/n1/progress/p1/feedback", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeParams(id = "n1", progressId = "p1") {
  return { params: Promise.resolve({ id, progressId }) };
}

const SESSION = { user: { id: "u1" } };
const NOTE = { id: "n1", userId: "u1" };
const PROGRESS = { id: "p1", noteId: "n1" };

describe("POST /api/notes/[id]/progress/[progressId]/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeReq({ text: "Bagus" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when note not found or not owned by user", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ text: "Bagus" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 404 when progress not found or does not belong to note", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue({ id: "p1", noteId: "other-note" });

    const res = await POST(makeReq({ text: "Bagus" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when text is missing or whitespace only", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue(PROGRESS);

    const res = await POST(makeReq({ text: "   " }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Feedback wajib diisi");
  });

  it("creates feedback with trimmed text and returns 201", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.note.findUnique.mockResolvedValue(NOTE);
    prisma.progress.findUnique.mockResolvedValue(PROGRESS);

    const createdFeedback = {
      id: "f1",
      text: "Feedback mantap",
      tglFeedback: new Date("2024-06-01"),
      progressId: "p1",
    };
    prisma.feedback.create.mockResolvedValue(createdFeedback);

    const res = await POST(
      makeReq({ text: "  Feedback mantap  ", tglFeedback: "2024-06-01" }),
      makeParams()
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        text: "Feedback mantap",
        tglFeedback: new Date("2024-06-01"),
        progressId: "p1",
      },
    });
    expect(data.id).toBe("f1");
    expect(data.text).toBe("Feedback mantap");
  });
});