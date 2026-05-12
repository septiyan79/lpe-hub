import { auth } from "@/lib/auth";

export async function requireExpatAdmin() {
  const session = await auth();
  if (!session) return null;
  const { role } = session.user;
  if (role !== "admin" && role !== "expatriate_admin") return null;
  return session;
}

export function diffChanges(before, after) {
  const changes = {};
  const skip = new Set(["createdAt", "updatedAt"]);
  for (const key of Object.keys(before)) {
    if (skip.has(key)) continue;
    const b = before[key] instanceof Date ? before[key].toISOString() : before[key];
    const a = after[key] instanceof Date ? after[key].toISOString() : after[key];
    if (String(b) !== String(a)) changes[key] = { before: b, after: a };
  }
  return JSON.stringify(changes);
}
