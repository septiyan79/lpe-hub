import { describe, it, expect, vi } from "vitest";

// Mock auth to prevent next-auth from resolving next/server
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));


import { diffChanges } from "@/app/api/expatriate/_helpers";

describe("diffChanges", () => {
  it("returns empty JSON object when no fields changed", () => {
    const before = { name: "Alice", age: 30 };
    const after = { name: "Alice", age: 30 };
    expect(diffChanges(before, after)).toBe("{}");
  });

  it("detects a single field change", () => {
    const before = { name: "Alice" };
    const after = { name: "Bob" };
    const result = JSON.parse(diffChanges(before, after));
    expect(result).toEqual({ name: { before: "Alice", after: "Bob" } });
  });

  it("detects multiple field changes", () => {
    const before = { name: "Alice", position: "Staff", department: "HR" };
    const after = { name: "Bob", position: "Manager", department: "HR" };
    const result = JSON.parse(diffChanges(before, after));
    expect(result).toEqual({
      name: { before: "Alice", after: "Bob" },
      position: { before: "Staff", after: "Manager" },
    });
    expect(result.department).toBeUndefined();
  });

  it("skips createdAt and updatedAt fields", () => {
    const before = { name: "Alice", createdAt: "2024-01-01", updatedAt: "2024-01-01" };
    const after = { name: "Alice", createdAt: "2024-06-01", updatedAt: "2024-06-01" };
    expect(diffChanges(before, after)).toBe("{}");
  });

  it("handles Date objects by converting to ISO string", () => {
    const d1 = new Date("2024-01-15T00:00:00.000Z");
    const d2 = new Date("2024-06-15T00:00:00.000Z");
    const before = { birthDate: d1 };
    const after = { birthDate: d2 };
    const result = JSON.parse(diffChanges(before, after));
    expect(result.birthDate.before).toBe(d1.toISOString());
    expect(result.birthDate.after).toBe(d2.toISOString());
  });

  it("reports no change when Date objects are equal", () => {
    const d = new Date("2024-01-15T00:00:00.000Z");
    const before = { birthDate: new Date(d.getTime()) };
    const after = { birthDate: new Date(d.getTime()) };
    expect(diffChanges(before, after)).toBe("{}");
  });

  it("handles null to value change", () => {
    const before = { photoUrl: null };
    const after = { photoUrl: "/uploads/photo.jpg" };
    const result = JSON.parse(diffChanges(before, after));
    expect(result.photoUrl).toEqual({
      before: null,
      after: "/uploads/photo.jpg",
    });
  });

  it("handles value to null change", () => {
    const before = { photoUrl: "/uploads/photo.jpg" };
    const after = { photoUrl: null };
    const result = JSON.parse(diffChanges(before, after));
    expect(result.photoUrl).toEqual({
      before: "/uploads/photo.jpg",
      after: null,
    });
  });

  it("treats number and equivalent string as same (String coercion)", () => {
    // diffChanges uses String(b) !== String(a), so 1 and "1" are equal
    const before = { renewalNo: 1 };
    const after = { renewalNo: "1" };
    expect(diffChanges(before, after)).toBe("{}");
  });

  it("only iterates over keys from 'before' object", () => {
    // Keys present only in 'after' are NOT detected
    const before = { name: "Alice" };
    const after = { name: "Alice", newField: "extra" };
    expect(diffChanges(before, after)).toBe("{}");
  });
});
