import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    todo: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET, POST } from "@/app/api/todos/route";

describe("API /api/todos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET ───────────────────────────────────────────────────────
  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns todos for authenticated user", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const mockTodos = [{ id: "t1", text: "Buy milk", done: false }];
      prisma.todo.findMany.mockResolvedValue(mockTodos);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(mockTodos);
      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  // ─── POST ──────────────────────────────────────────────────────
  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const req = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({ text: "Task" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when text is missing", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const req = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Text wajib diisi");
    });

    it("returns 400 when text is whitespace only", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const req = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({ text: "   " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates todo successfully with trimmed text", async () => {
      auth.mockResolvedValue({ user: { id: "user-1" } });
      const mockTodo = { id: "t1", text: "Buy milk", done: false, userId: "user-1" };
      prisma.todo.create.mockResolvedValue(mockTodo);

      const req = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({ text: "  Buy milk  " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(mockTodo);
      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: { text: "Buy milk", userId: "user-1" },
      });
    });
  });
});
