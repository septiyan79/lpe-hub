// tests/unit/auth/auth-credentials.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  default: { user: { findUnique: vi.fn() } },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

// -------------------------------------------------------------------
// Fungsi authorize yang diuji – diambil langsung dari lib/auth.js
// Ini sengaja di-copy agar test tidak bergantung pada next-auth runtime.
// -------------------------------------------------------------------
async function authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;

  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user || user.deletedAt) return null;

  const passwordMatch = await bcrypt.compare(
    credentials.password,
    user.password
  );

  if (!passwordMatch) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// -------------------------------------------------------------------
// Test suite
// -------------------------------------------------------------------
describe("Credentials authorize()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when email is missing", async () => {
    const result = await authorize({ email: undefined, password: "anyPassword" });
    expect(result).toBeNull();
  });

  it("rejects when password is missing", async () => {
    const result = await authorize({ email: "user@example.com", password: undefined });
    expect(result).toBeNull();
  });

  it("rejects when user not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await authorize({ email: "unknown@example.com", password: "pw" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "unknown@example.com" },
    });
    expect(result).toBeNull();
  });

  it("rejects when user is soft-deleted", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      deletedAt: new Date(),
    });

    const result = await authorize({ email: "deleted@example.com", password: "pw" });
    expect(result).toBeNull();
  });

  it("rejects when password does not match", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      role: "admin",
      password: "hashed",
      deletedAt: null,
    });
    bcrypt.compare.mockResolvedValue(false);

    const result = await authorize({ email: "alice@example.com", password: "wrongPw" });

    expect(bcrypt.compare).toHaveBeenCalledWith("wrongPw", "hashed");
    expect(result).toBeNull();
  });

  it("returns user payload when credentials are correct", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      role: "admin",
      password: "hashed",
      deletedAt: null,
    });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authorize({ email: "alice@example.com", password: "correctPw" });

    expect(bcrypt.compare).toHaveBeenCalledWith("correctPw", "hashed");
    expect(result).toEqual({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      role: "admin",
    });
  });
});
