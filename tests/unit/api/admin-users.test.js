import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs — hash returns predictable value
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET, POST } from "@/app/api/admin/users/route";

describe("API /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET ───────────────────────────────────────────────────────
  describe("GET", () => {
    it("returns 403 when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns 403 when user is not admin", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "employee" } });
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns 403 when user is expatriate_admin (not full admin)", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "expatriate_admin" } });
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns users list for admin", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      const mockUsers = [
        { id: "u1", name: "Admin", email: "admin@test.com", role: "admin", createdAt: "2024-01-01", deletedAt: null },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(mockUsers);
    });
  });

  // ─── POST ──────────────────────────────────────────────────────
  describe("POST", () => {
    it("returns 403 when not admin", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "employee" } });
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "A", email: "a@b.com", password: "123456" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when name is missing", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", password: "123456" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Nama wajib diisi");
    });

    it("returns 400 when email is missing", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", password: "123456" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Email wajib diisi");
    });

    it("returns 400 when password is missing", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", email: "a@b.com" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Password wajib diisi");
    });

    it("returns 400 when email already exists", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue({ id: "existing", email: "a@b.com" });

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", email: "a@b.com", password: "123456" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Email sudah digunakan");
    });

    it("creates user with hashed password and default role", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue(null); // email not taken

      const createdUser = {
        id: "u2", name: "Alice", email: "alice@test.com",
        role: "employee", createdAt: "2024-01-01", deletedAt: null,
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", email: "alice@test.com", password: "secret123" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Alice",
          email: "alice@test.com",
          password: "hashed-password",
          role: "employee",
        },
        select: expect.any(Object),
      });
    });

    it("creates user with specified role", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue(null);

      const createdUser = {
        id: "u2", name: "Bob", email: "bob@test.com",
        role: "expatriate_admin", createdAt: "2024-01-01", deletedAt: null,
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Bob", email: "bob@test.com",
          password: "secret", role: "expatriate_admin",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: "expatriate_admin" }),
        })
      );
    });
  });
});
