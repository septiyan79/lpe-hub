# 🧪 Unit Testing — LPE Hub

Dokumentasi unit testing untuk project LPE Hub menggunakan **Vitest v4**.

---

## 📦 Tech Stack

| Tool | Versi | Fungsi |
|------|-------|--------|
| [Vitest](https://vitest.dev/) | ^4.x | Test runner |
| [@testing-library/react](https://testing-library.com/react) | ^16.x | Testing komponen React |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | ^6.x | Custom DOM matchers |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.x | JSX transform untuk test |

---

## 🚀 Menjalankan Tests

```bash
# Jalankan semua test sekali
npm test

# Jalankan test dalam watch mode (development)
npm run test:watch

# Jalankan test dengan coverage report
npm run test:coverage
```

---

## 📂 Struktur Folder

```
tests/
├── README.md                  # Dokumentasi ini
├── setup.js                   # Global test setup
└── unit/
    ├── auth/
    │   └── auth-config.test.js    # Auth callbacks (authorized, jwt, session)
    ├── helpers/
    │   └── diffChanges.test.js    # Utility function diffChanges()
    └── api/
        ├── notes.test.js              # API /api/notes (GET, POST)
        ├── todos.test.js              # API /api/todos (GET, POST)
        ├── admin-users.test.js        # API /api/admin/users (GET, POST)
        ├── admin-users-detail.test.js # API /api/admin/users/[id] (PATCH, DELETE)
        └── profile.test.js           # API /api/profile (PATCH)
```

---

## ✅ Test Suites — Sudah Diimplementasikan

### P0 — Pure Functions & Auth (Prioritas Tertinggi)

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 1 | **diffChanges()** | `unit/helpers/diffChanges.test.js` | 10 | Tidak ada perubahan, single/multiple field change, skip createdAt/updatedAt, handle Date, null values, type coercion, keys hanya dari `before` |
| 2 | **Auth Callbacks** | `unit/auth/auth-config.test.js` | 11 | `authorized()`: redirect logged-in dari /login, block unauthenticated, allow normal pages. `jwt()`: enrich token saat login, preserve token. `session()`: enrich session dari token |

### P1 — API Route Handlers

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 3 | **Notes API** | `unit/api/notes.test.js` | 7 | GET: auth guard, return user notes. POST: auth guard, validasi title kosong/whitespace, create dengan trim, desc opsional |
| 4 | **Todos API** | `unit/api/todos.test.js` | 6 | GET: auth guard, return user todos. POST: auth guard, validasi text, create dengan trim |
| 5 | **Admin Users** | `unit/api/admin-users.test.js` | 11 | GET: auth guard, role guard (admin only), return users. POST: validasi name/email/password, email duplicate check, password hashing, default role |
| 6 | **Admin Users Detail** | `unit/api/admin-users-detail.test.js` | 8 | PATCH: role guard, user not found, email duplicate. DELETE: self-delete prevention, soft delete (set deletedAt) |
| 7 | **Profile** | `unit/api/profile.test.js` | 9 | Auth guard, user not found, empty update, update nama, password change (missing current, wrong current, too short, success), update nama + password |

**Total: 7 test suites, 62 tests**

---

## 📋 Test Suites — Belum Diimplementasikan

### P1 — API Routes

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 8 | Notes Detail | `app/api/notes/[id]/route.js` | ~6 | PATCH/DELETE + ownership check |
| 9 | Todos Detail | `app/api/todos/[id]/route.js` | ~6 | PATCH/DELETE + ownership check |
| 10 | Upload Helpers | `app/api/expatriate/_upload-helpers.js` | ~8 | File type/size validation, save, delete |
| 11 | requireExpatAdmin | `app/api/expatriate/_helpers.js` | ~4 | Role guard (admin, expatriate_admin, employee, no session) |

### P2 — Expatriate Module

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 12 | Expatriate API | `app/api/expatriate/route.js` | ~4 | GET/POST + role guard + required fields validation |
| 13 | Expatriate Detail | `app/api/expatriate/[id]/route.js` | ~6 | GET/PATCH/DELETE + history tracking |
| 14 | Permit Types | `app/api/expatriate/permit-types/route.js` | ~4 | GET/POST permit type management |

### P2 — React Components & Hooks

> ⚠️ Membutuhkan `jsdom` environment. Saat ini ada kompatibilitas issue
> dengan Node v20.17.0 — perlu upgrade Node ke ≥20.19.0 atau menggunakan
> `happy-dom` sebagai alternatif.

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 15 | Navbar | `components/Navbar.jsx` | ~7 | Render link berdasarkan role, highlight active, signOut |
| 16 | NotesItem | `components/notes/NotesItem.jsx` | ~4 | Render title/desc, status, handler delete/toggle |
| 17 | NotesProgress | `components/notes/NotesProgress.jsx` | ~5 | Render progress items, status update |
| 18 | UserManagement | `components/admin/UserManagement.jsx` | ~4 | Render user list, form validation, submit |
| 19 | useAutoResizeTextarea | `hooks/useAutoResizeTextarea.js` | ~4 | Return ref, auto-resize on value change, isVisible toggle |

---

## 🏗️ Konvensi & Pola

### Mocking Dependencies

Semua API route tests menggunakan pola mock yang konsisten:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    modelName: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock bcryptjs (jika dibutuhkan)
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));
```

### Request Helper

```js
function makeReq(body) {
  return new Request("http://localhost/api/...", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

### Params Helper (Dynamic Routes)

```js
function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}
```

### Reset Mocks

```js
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## ⚙️ Konfigurasi

- **Config file**: `vitest.config.mjs` (root project)
- **Environment default**: `node` (untuk API routes & helpers)
- **Path alias**: `@/` → root project (sama dengan Next.js tsconfig paths)
- **Test file pattern**: `tests/**/*.test.{js,jsx}`

### Menambahkan jsdom untuk Component Test

Tambahkan comment di baris pertama file test:

```js
// @vitest-environment jsdom
```

---

## 🔄 CI Integration

Unit tests terintegrasi di GitHub Actions CI pipeline (`.github/workflows/ci.yml`):

```
Install → Prisma Generate → ✅ Unit Tests → Build
```

Tests dijalankan **sebelum build** sehingga error terdeteksi lebih awal.
