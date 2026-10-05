import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

const { authorized, jwt, session } = authConfig.callbacks;

// Helper to build a fake nextUrl
function makeNextUrl(pathname) {
  return new URL(`http://localhost:3000${pathname}`);
}

describe("auth.config callbacks", () => {
  // ─── authorized() ───────────────────────────────────────────────
  describe("authorized()", () => {
    it("redirects logged-in user away from /login page", () => {
      const result = authorized({
        auth: { user: { id: "1" } },
        request: { nextUrl: makeNextUrl("/login") },
      });
      // Should return a redirect Response
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(302);
      expect(new URL(result.headers.get("Location")).pathname).toBe("/");
    });

    it("blocks unauthenticated user from non-login page", () => {
      const result = authorized({
        auth: null,
        request: { nextUrl: makeNextUrl("/notes") },
      });
      expect(result).toBe(false);
    });

    it("allows authenticated user on normal pages", () => {
      const result = authorized({
        auth: { user: { id: "1" } },
        request: { nextUrl: makeNextUrl("/notes") },
      });
      expect(result).toBe(true);
    });

    it("allows unauthenticated user on /login page", () => {
      const result = authorized({
        auth: null,
        request: { nextUrl: makeNextUrl("/login") },
      });
      expect(result).toBe(true);
    });

    it("redirects logged-in user from /login/callback sub-path", () => {
      const result = authorized({
        auth: { user: { id: "1" } },
        request: { nextUrl: makeNextUrl("/login/callback") },
      });
      expect(result).toBeInstanceOf(Response);
    });

    it("blocks unauthenticated user from deep nested path", () => {
      const result = authorized({
        auth: null,
        request: { nextUrl: makeNextUrl("/admin/users/123") },
      });
      expect(result).toBe(false);
    });
  });

  // ─── jwt() ──────────────────────────────────────────────────────
  describe("jwt()", () => {
    it("adds user id and role to token on first login", () => {
      const token = { sub: "abc" };
      const user = { id: "user-1", role: "admin" };
      const result = jwt({ token, user });
      expect(result.id).toBe("user-1");
      expect(result.role).toBe("admin");
    });

    it("preserves existing token when no user (subsequent request)", () => {
      const token = { sub: "abc", id: "user-1", role: "admin" };
      const result = jwt({ token, user: undefined });
      expect(result.id).toBe("user-1");
      expect(result.role).toBe("admin");
    });

    it("does not overwrite token fields when user is null", () => {
      const token = { id: "existing", role: "employee" };
      const result = jwt({ token, user: null });
      expect(result.id).toBe("existing");
      expect(result.role).toBe("employee");
    });
  });

  // ─── session() ──────────────────────────────────────────────────
  describe("session()", () => {
    it("enriches session.user with token id and role", () => {
      const sessionObj = { user: { name: "Alice", email: "a@b.com" } };
      const token = { id: "user-1", role: "admin" };
      const result = session({ session: sessionObj, token });
      expect(result.user.id).toBe("user-1");
      expect(result.user.role).toBe("admin");
      // Should preserve existing fields
      expect(result.user.name).toBe("Alice");
      expect(result.user.email).toBe("a@b.com");
    });

    it("overwrites session.user fields from token", () => {
      const sessionObj = { user: { id: "old-id", role: "old-role" } };
      const token = { id: "new-id", role: "admin" };
      const result = session({ session: sessionObj, token });
      expect(result.user.id).toBe("new-id");
      expect(result.user.role).toBe("admin");
    });
  });
});
