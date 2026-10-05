import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PATCH, DELETE } from "@/app/api/admin/users/[id]/route";

function makeReq(body) {
  return new Request("http://localhost/api/admin/users/u2", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}

describe("API /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── PATCH ─────────────────────────────────────────────────────
  describe("PATCH", () => {
    it("returns 403 when not admin", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "employee" } });
      const res = await PATCH(makeReq({ name: "Test" }), makeParams("u2"));
      expect(res.status).toBe(403);
    });

    it("returns 404 when user not found", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await PATCH(makeReq({ name: "Test" }), makeParams("u2"));
      expect(res.status).toBe(404);
    });

    it("returns 400 when email is already taken by another user", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      // First call: find user being edited
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "u2", email: "old@test.com" })
        // Second call: check if new email exists
        .mockResolvedValueOnce({ id: "u3", email: "taken@test.com" });

      const res = await PATCH(makeReq({ email: "taken@test.com" }), makeParams("u2"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Email sudah digunakan");
    });

    it("updates user fields successfully", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue({ id: "u2", email: "user@test.com" });

      const updatedUser = {
        id: "u2", name: "Updated", email: "user@test.com",
        role: "admin", createdAt: "2024-01-01", deletedAt: null,
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const res = await PATCH(
        makeReq({ name: "Updated", role: "admin" }),
        makeParams("u2"),
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────
  describe("DELETE (soft delete)", () => {
    it("returns 403 when not admin", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "employee" } });
      const req = new Request("http://localhost/api/admin/users/u2", { method: "DELETE" });
      const res = await DELETE(req, makeParams("u2"));
      expect(res.status).toBe(403);
    });

    it("returns 400 when trying to delete own account", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      const req = new Request("http://localhost/api/admin/users/u1", { method: "DELETE" });
      const res = await DELETE(req, makeParams("u1"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Tidak bisa menghapus akun sendiri");
    });

    it("returns 404 when user not found", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue(null);
      const req = new Request("http://localhost/api/admin/users/u2", { method: "DELETE" });
      const res = await DELETE(req, makeParams("u2"));
      expect(res.status).toBe(404);
    });

    it("soft deletes user by setting deletedAt", async () => {
      auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
      prisma.user.findUnique.mockResolvedValue({ id: "u2", name: "Target" });

      const deletedUser = {
        id: "u2", name: "Target", email: "t@test.com",
        role: "employee", createdAt: "2024-01-01", deletedAt: "2024-06-01",
      };
      prisma.user.update.mockResolvedValue(deletedUser);

      const req = new Request("http://localhost/api/admin/users/u2", { method: "DELETE" });
      const res = await DELETE(req, makeParams("u2"));
      expect(res.status).toBe(200);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u2" },
          data: { deletedAt: expect.any(Date) },
        })
      );
    });
  });
});
