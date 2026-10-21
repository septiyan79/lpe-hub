import { vi } from "vitest";

// ============================================================================
// GLOBAL SAFETY GUARD: PREVENT UNMOCKED DATABASE CALLS IN TESTS
// ============================================================================
// Jika ada file test yang lupa memanggil vi.mock("@/lib/prisma"),
// Proxy ini akan menangkap akses tersebut dan melempar error keras sebelum
// ada koneksi jaringan atau database yang tersenggol.
// Jika file test mendeklarasikan vi.mock("@/lib/prisma"), mock lokal di file
// tersebut yang akan digunakan.
// ============================================================================

vi.mock("@/lib/prisma", () => {
  const blockedHandler = {
    get(target, prop) {
      if (prop === "then" || prop === "$$typeof" || prop === "default") {
        return undefined;
      }
      return new Proxy(() => {}, {
        get(subTarget, subProp) {
          if (subProp === "then" || subProp === "$$typeof") return undefined;
          throw new Error(
            `[TEST SAFETY GUARD] Akses ke prisma.${String(prop)}.${String(subProp)} DIBLOKIR!\n` +
            `Anda lupa menambahkan vi.mock("@/lib/prisma") pada file test ini.`
          );
        },
        apply() {
          throw new Error(
            `[TEST SAFETY GUARD] Pemanggilan prisma.${String(prop)}() DIBLOKIR!\n` +
            `Anda lupa menambahkan vi.mock("@/lib/prisma") pada file test ini.`
          );
        },
      });
    },
  };

  return {
    default: new Proxy({}, blockedHandler),
    __esModule: true,
  };
});

