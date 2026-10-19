import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    note: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PATCH, DELETE } from "@/app/api/notes/[id]/route";

function makeReq(body) {
  return new Request("http://localhost/api/notes/n1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}

describe("API /api/notes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── PATCH ─────────────────────────────────────────────────────
  describe("PATCH", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const res = await PATCH(makeReq({ title: "Test" }), makeParams("n1"));
      expect(res.status).toBe(401);
    });

    it("returns 404 when note does not exist", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue(null);

      const res = await PATCH(makeReq({ title: "Test" }), makeParams("n1"));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Tidak ditemukan");
    });

    it("returns 404 when note belongs to another user", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-other" });

      const res = await PATCH(makeReq({ title: "Test" }), makeParams("n1"));
      expect(res.status).toBe(404);
    });

    it("updates title only when only title is provided", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-1" });

      const updatedNote = { id: "n1", title: "Updated", desc: null, done: false, progress: [] };
      prisma.note.update.mockResolvedValue(updatedNote);

      const res = await PATCH(makeReq({ title: "Updated" }), makeParams("n1"));
      expect(res.status).toBe(200);

      const updateCall = prisma.note.update.mock.calls[0][0];
      expect(updateCall.data.title).toBe("Updated");
      expect(updateCall.data).not.toHaveProperty("desc");
      expect(updateCall.data).not.toHaveProperty("done");
    });

    it("updates multiple fields at once", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-1" });

      const updatedNote = { id: "n1", title: "New", desc: "Desc", done: true, progress: [] };
      prisma.note.update.mockResolvedValue(updatedNote);

      const res = await PATCH(
        makeReq({ title: "New", desc: "Desc", done: true }),
        makeParams("n1"),
      );
      expect(res.status).toBe(200);

      const updateCall = prisma.note.update.mock.calls[0][0];
      expect(updateCall.data.title).toBe("New");
      expect(updateCall.data.desc).toBe("Desc");
      expect(updateCall.data.done).toBe(true);
    });

    it("includes progress with feedbacks in response", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-1" });

      const updatedNote = {
        id: "n1", title: "Test", progress: [
          { id: "p1", feedbacks: [{ id: "f1", text: "Good" }] },
        ],
      };
      prisma.note.update.mockResolvedValue(updatedNote);

      const res = await PATCH(makeReq({ title: "Test" }), makeParams("n1"));
      const body = await res.json();
      expect(body.progress[0].feedbacks).toHaveLength(1);

      const updateCall = prisma.note.update.mock.calls[0][0];
      expect(updateCall.include).toEqual({
        progress: { include: { feedbacks: true } },
      });
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────
  describe("DELETE", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const req = new Request("http://localhost/api/notes/n1", { method: "DELETE" });
      const res = await DELETE(req, makeParams("n1"));
      expect(res.status).toBe(401);
    });

    it("returns 404 when note does not exist", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue(null);

      const req = new Request("http://localhost/api/notes/n1", { method: "DELETE" });
      const res = await DELETE(req, makeParams("n1"));
      expect(res.status).toBe(404);
    });

    it("returns 404 when note belongs to another user", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-other" });

      const req = new Request("http://localhost/api/notes/n1", { method: "DELETE" });
      const res = await DELETE(req, makeParams("n1"));
      expect(res.status).toBe(404);
    });

    it("deletes note and returns success", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "user-1" });
      prisma.note.delete.mockResolvedValue({});

      const req = new Request("http://localhost/api/notes/n1", { method: "DELETE" });
      const res = await DELETE(req, makeParams("n1"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(prisma.note.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
    });
  });
});
