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
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("new-hashed-password"),
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PATCH } from "@/app/api/profile/route";

function makeReq(body) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("API /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await PATCH(makeReq({ name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found in database", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeReq({ name: "Test" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User tidak ditemukan");
  });

  it("returns 400 when no data is provided to update", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "hash" });

    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Tidak ada data yang diubah");
  });

  it("updates name only", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "hash" });
    prisma.user.update.mockResolvedValue({
      id: "u1", name: "New Name", email: "a@b.com", role: "employee",
    });

    const res = await PATCH(makeReq({ name: "  New Name  " }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "New Name" },
      })
    );
  });

  it("returns 400 when newPassword given without currentPassword", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "hash" });

    const res = await PATCH(makeReq({ newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Password saat ini wajib diisi");
  });

  it("returns 400 when currentPassword is wrong", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "hash" });
    bcrypt.compare.mockResolvedValue(false);

    const res = await PATCH(makeReq({ currentPassword: "wrong", newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Password saat ini salah");
  });

  it("returns 400 when newPassword is less than 6 characters", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "hash" });
    bcrypt.compare.mockResolvedValue(true);

    const res = await PATCH(makeReq({ currentPassword: "correct", newPassword: "12345" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Password baru minimal 6 karakter");
  });

  it("updates password when all validations pass", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "old-hash" });
    bcrypt.compare.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({
      id: "u1", name: "Alice", email: "a@b.com", role: "employee",
    });

    const res = await PATCH(makeReq({ currentPassword: "correct", newPassword: "newsecret" }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { password: "new-hashed-password" },
      })
    );
  });

  it("updates both name and password at the same time", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "old-hash" });
    bcrypt.compare.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({
      id: "u1", name: "New Name", email: "a@b.com", role: "employee",
    });

    const res = await PATCH(makeReq({
      name: "New Name",
      currentPassword: "correct",
      newPassword: "newsecret",
    }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "New Name", password: "new-hashed-password" },
      })
    );
  });
});
