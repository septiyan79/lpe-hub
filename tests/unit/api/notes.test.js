import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth — semua API route pakai @/lib/auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    note: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET, POST } from "@/app/api/notes/route";

describe("API /api/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET ───────────────────────────────────────────────────────
  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns notes for authenticated user", async () => {
      const mockSession = { user: { id: "user-1" } };
      auth.mockResolvedValue(mockSession);

      const mockNotes = [
        { id: "n1", title: "Note 1", userId: "user-1", progress: [] },
      ];
      prisma.note.findMany.mockResolvedValue(mockNotes);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(mockNotes);
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        include: {
          progress: {
            orderBy: { createdAt: "asc" },
            include: { feedbacks: { orderBy: { createdAt: "asc" } } },
          },
        },
      });
    });
  });

  // ─── POST ──────────────────────────────────────────────────────
  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Test" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when title is missing", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ desc: "only desc" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Judul wajib diisi");
    });

    it("returns 400 when title is whitespace only", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "   " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates note successfully with trimmed title", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });

      const createdNote = {
        id: "n1",
        title: "My Note",
        desc: null,
        userId: "user-1",
        progress: [],
      };
      prisma.note.create.mockResolvedValue(createdNote);

      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "  My Note  " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body).toEqual(createdNote);
      expect(prisma.note.create).toHaveBeenCalledWith({
        data: { title: "My Note", desc: null, userId: "user-1" },
        include: { progress: { include: { feedbacks: true } } },
      });
    });

    it("creates note with description when provided", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });

      const createdNote = {
        id: "n2",
        title: "Title",
        desc: "Description",
        userId: "user-1",
        progress: [],
      };
      prisma.note.create.mockResolvedValue(createdNote);

      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Title", desc: "  Description  " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      expect(prisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ desc: "Description" }),
        })
      );
    });
  });
});
