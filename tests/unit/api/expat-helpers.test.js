// tests/unit/api/expat-helpers.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireExpatAdmin } from "@/app/api/expatriate/_helpers";

// Mock auth dari lib/auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

// -------------------------------------------------------------------
// Test suite
// -------------------------------------------------------------------
describe("requireExpatAdmin()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when unauthenticated (no session)", async () => {
    auth.mockResolvedValue(null);

    const result = await requireExpatAdmin();

    expect(result).toBeNull();
  });

  it("returns null when role is employee", async () => {
    auth.mockResolvedValue({ user: { role: "employee" } });

    const result = await requireExpatAdmin();

    expect(result).toBeNull();
  });

  it("returns session when role is admin", async () => {
    const session = { user: { id: "u1", role: "admin" } };
    auth.mockResolvedValue(session);

    const result = await requireExpatAdmin();

    expect(result).toEqual(session);
  });

  it("returns session when role is expatriate_admin", async () => {
    const session = { user: { id: "u2", role: "expatriate_admin" } };
    auth.mockResolvedValue(session);

    const result = await requireExpatAdmin();

    expect(result).toEqual(session);
  });
});