// tests/unit/api/todos-detail.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/todos/[id]/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    todo: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Helper
function makeReq(body) {
  return new Request("http://localhost/api/todos/t1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { user: { id: "u1" } };
const TODO = { id: "t1", userId: "u1", text: "Belajar", done: false };

// -------------------------------------------------------------------
describe("PATCH /api/todos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await PATCH(makeReq({}), makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when todo not found or not owned", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.todo.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeReq({ done: true }), makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("toggles done field and returns updated todo", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.todo.findUnique.mockResolvedValue(TODO);
    const updated = { ...TODO, done: true };
    prisma.todo.update.mockResolvedValue(updated);

    const res = await PATCH(makeReq({ done: true }), makeParams("t1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.todo.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { done: true },
    });
    expect(data.done).toBe(true);
  });

  it("updates text field and returns updated todo", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.todo.findUnique.mockResolvedValue(TODO);
    const updated = { ...TODO, text: "Belajar Vitest" };
    prisma.todo.update.mockResolvedValue(updated);

    const res = await PATCH(makeReq({ text: "Belajar Vitest" }), makeParams("t1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.text).toBe("Belajar Vitest");
  });
});

// -------------------------------------------------------------------
describe("DELETE /api/todos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await DELETE(makeReq({}), makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when todo not found or not owned", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.todo.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeReq({}), makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("deletes todo and returns success", async () => {
    auth.mockResolvedValue(SESSION);
    prisma.todo.findUnique.mockResolvedValue(TODO);
    prisma.todo.delete.mockResolvedValue(TODO);

    const res = await DELETE(makeReq({}), makeParams("t1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.todo.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(data).toEqual({ success: true });
  });
});