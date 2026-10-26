# Unit Testing — LPE Hub

Dokumentasi unit testing untuk project LPE Hub menggunakan **Vitest v4**.

---

## Tech Stack

| Tool | Versi | Fungsi |
|------|-------|--------|
| [Vitest](https://vitest.dev/) | ^4.x | Test runner |
| [@testing-library/react](https://testing-library.com/react) | ^16.x | Testing komponen React |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | ^6.x | Custom DOM matchers |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.x | JSX transform untuk test |

---

## Menjalankan Tests

```bash
# Jalankan semua test sekali
npm test

# Jalankan test dalam watch mode (development)
npm run test:watch

# Jalankan test dengan coverage report
npm run test:coverage
```

---

## Struktur Folder

```
tests/
├── README.md                           # Dokumentasi ini
├── setup.js                            # Global test setup
└── unit/
    ├── auth/
    │   ├── auth-config.test.js         # Auth callbacks (authorized, jwt, session)
    │   └── auth-credentials.test.js    # Credentials authorize() logic
    ├── helpers/
    │   └── diffChanges.test.js         # Utility function diffChanges()
    ├── api/
        ├── notes.test.js               # API /api/notes (GET, POST)
        ├── notes-detail.test.js        # API /api/notes/[id] (PATCH, DELETE)
        ├── todos.test.js               # API /api/todos (GET, POST)
        ├── todos-detail.test.js        # API /api/todos/[id] (PATCH, DELETE)
        ├── admin-users.test.js         # API /api/admin/users (GET, POST)
        ├── admin-users-detail.test.js  # API /api/admin/users/[id] (PATCH, DELETE)
        ├── profile.test.js             # API /api/profile (PATCH)
        ├── expat-helpers.test.js       # requireExpatAdmin() role guard
        ├── upload-helpers.test.js      # saveUploadedFile(), deleteFileIfExists()
        ├── uploads.test.js             # GET /api/uploads/[...slug] (static serving)
        ├── notes-progress.test.js      # API /api/notes/[id]/progress (POST)
        ├── notes-progress-detail.test.js # API /api/notes/[id]/progress/[progressId] (PATCH, DELETE)
        ├── notes-feedback.test.js      # API /api/notes/[id]/progress/[progressId]/feedback (POST)
        ├── notes-feedback-detail.test.js # API /api/notes/[id]/progress/[progressId]/feedback/[feedbackId] (DELETE)
        ├── expatriate.test.js          # API /api/expatriate (GET, POST)
        ├── expatriate-detail.test.js   # API /api/expatriate/[id] (GET, PATCH, DELETE)
        ├── expatriate-photo.test.js    # API /api/expatriate/[id]/photo (POST, DELETE)
        ├── expatriate-passport-scan.test.js # API /api/expatriate/[id]/passport-scan (POST, DELETE)
        ├── expatriate-passport-renew.test.js # API /api/expatriate/[id]/passport/renew (POST)
        ├── expatriate-passport-history.test.js # API /api/expatriate/[id]/passport/history/[historyId] (DELETE)
        ├── permit-types.test.js        # API /api/expatriate/permit-types (GET, POST)
        ├── permit-types-detail.test.js # API /api/expatriate/permit-types/[typeId] (PATCH, DELETE)
        ├── expatriate-permits.test.js  # API /api/expatriate/[id]/permits (POST)
        ├── expatriate-permit-detail.test.js # API /api/expatriate/[id]/permits/[permitId] (PATCH, DELETE)
        ├── expatriate-permit-renew.test.js # API /api/expatriate/[id]/permits/[permitId]/renew (POST)
        ├── expatriate-permit-scan.test.js  # API /api/expatriate/[id]/permits/[permitId]/scan (POST, DELETE)
        ├── expatriate-epo.test.js          # API /api/expatriate/[id]/epo (GET, POST, PATCH, DELETE - 410)
        ├── expatriate-family.test.js       # API /api/expatriate/[id]/family (POST)
        ├── expatriate-family-detail.test.js # API /api/expatriate/[id]/family/[familyId] (PATCH, DELETE)
        ├── expatriate-family-photo-scan.test.js # API /api/expatriate/[id]/family/[familyId]/photo & passport-scan (POST, DELETE)
        ├── expatriate-family-passport.test.js # API /api/expatriate/[id]/family/[familyId]/passport/renew & history (POST, DELETE)
        ├── expatriate-family-permits.test.js # API /api/expatriate/[id]/family/[familyId]/permits/** (POST, PATCH, DELETE)
        └── expatriate-family-epo.test.js   # API /api/expatriate/[id]/family/[familyId]/epo (GET, POST, PATCH, DELETE - 410)
    └── components/
        ├── Navbar.test.jsx             # Navbar (render links, roles, signOut)
        ├── NotesItem.test.jsx          # NotesItem (render, toggle done, inline edit, delete)
        ├── NotesProgress.test.jsx      # NotesProgress (render, add progress/feedback, cycle status, delete)
        ├── UserManagement.test.jsx     # UserManagement (render table, filter nonaktif, add/edit/delete user)
        ├── SessionProviderWrapper.test.jsx # SessionProviderWrapper (render children inside SessionProvider)
        └── useAutoResizeTextarea.test.jsx # useAutoResizeTextarea hook (auto-resize scrollHeight, isVisible guard)
```

---

## Test Suites — Sudah Diimplementasikan_________________________________________________________________

### P0 — Pure Functions & Auth (Prioritas Tertinggi)

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 1 | **diffChanges()** | `unit/helpers/diffChanges.test.js` | 10 | Tidak ada perubahan, single/multiple field change, skip createdAt/updatedAt, handle Date, null values, type coercion, keys hanya dari `before` |
| 2 | **Auth Callbacks** | `unit/auth/auth-config.test.js` | 11 | `authorized()`: redirect logged-in dari /login, block unauthenticated, allow normal pages. `jwt()`: enrich token saat login, preserve token. `session()`: enrich session dari token |

### P1 — API Route Handlers

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 3 | **Notes API** | `unit/api/notes.test.js` | 7 | GET: auth guard, return user notes. POST: auth guard, validasi title kosong/whitespace, create dengan trim, desc opsional |
| 4 | **Notes Detail** | `unit/api/notes-detail.test.js` | 10 | PATCH: auth guard, note not found, ownership check, update title/desc. DELETE: auth guard, ownership check, delete note |
| 5 | **Todos API** | `unit/api/todos.test.js` | 6 | GET: auth guard, return user todos. POST: auth guard, validasi text, create dengan trim |
| 6 | **Admin Users** | `unit/api/admin-users.test.js` | 11 | GET: auth guard, role guard (admin only), return users. POST: validasi name/email/password, email duplicate check, password hashing, default role |
| 7 | **Admin Users Detail** | `unit/api/admin-users-detail.test.js` | 8 | PATCH: role guard, user not found, email duplicate. DELETE: self-delete prevention, soft delete (set deletedAt) |
| 8 | **Profile** | `unit/api/profile.test.js` | 9 | Auth guard, user not found, empty update, update nama, password change (missing current, wrong current, too short, success), update nama + password |

### P1 — Core Services & Uploads

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 9 | **Credentials authorize()** | `unit/auth/auth-credentials.test.js` | 6 | Missing email/password, user not found, soft-deleted user, password mismatch, login sukses return user profile |
| 10 | **requireExpatAdmin** | `unit/api/expat-helpers.test.js` | 4 | Unauthenticated (null session), role employee ditolak, role admin diizinkan, role expatriate_admin diizinkan |
| 11 | **Upload Helpers** | `unit/api/upload-helpers.test.js` | 7 | `saveUploadedFile`: file tidak ada, tipe tidak didukung, ukuran > 10MB, simpan & return URL. `deleteFileIfExists`: null URL, file ada → unlink, file tidak ada → silent |
| 12 | **Uploads Static Serving** | `unit/api/uploads.test.js` | 5 | Slug kosong 404, path traversal (..) 403, file tidak ditemukan 404, serve PDF + header benar, tipe unknown → octet-stream |

### P1 — Personal Modules (Todos & Notes Nested)

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 13 | **Todos Detail** | `unit/api/todos-detail.test.js` | 7 | PATCH: 401 unauthenticated, 404 not owned, toggle done, update text. DELETE: 401 unauthenticated, 404 not owned, hapus todo sukses |
| 14 | **Notes Progress** | `unit/api/notes-progress.test.js` | 5 | POST: 401 unauthenticated, 404 note not owned, 400 act kosong, default status "Plan", create progress sukses |
| 15 | **Notes Progress Detail** | `unit/api/notes-progress-detail.test.js` | 7 | PATCH: 401 unauth, 404 note not owned, 404 progress mismatch, update fields sukses. DELETE: 401 unauth, 404 not owned, delete sukses |
| 16 | **Notes Feedback** | `unit/api/notes-feedback.test.js` | 5 | POST: 401 unauth, 404 note not owned, 404 progress mismatch, 400 text kosong, create feedback sukses |
| 17 | **Notes Feedback Detail** | `unit/api/notes-feedback-detail.test.js` | 3 | DELETE: 401 unauth, 404 note not owned, delete feedback sukses |

### P2 — Expatriate Core Module

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 18 | **Expatriate List & Create** | `unit/api/expatriate.test.js` | 5 | GET: 403 unauthorized, return expat list & permits & family count. POST: 403 unauthorized, 400 missing required fields, create expat & record CREATE history |
| 19 | **Expatriate Detail** | `unit/api/expatriate-detail.test.js` | 9 | GET: 403 unauth, 404 not found, return full detail + relations. PATCH: 403 unauth, 404 not found, parse string/date/int & record diff. DELETE: 403 unauth, 404 not found, delete sukses |
| 20 | **Expatriate Photo** | `unit/api/expatriate-photo.test.js` | 7 | POST: 403 unauth, 404 not found, 400 upload gagal, upload foto baru & hapus foto lama & update DB. DELETE: 403 unauth, 404 not found, hapus file fisik & reset photoUrl null |
| 21 | **Expatriate Passport Scan** | `unit/api/expatriate-passport-scan.test.js` | 7 | POST: 403 unauth, 404 not found, 400 upload gagal, upload PDF & hapus file lama & update DB. DELETE: 403 unauth, 404 not found, hapus file fisik & reset passportScanUrl null |
| 22 | **Expatriate Passport Renewal** | `unit/api/expatriate-passport-renew.test.js` | 4 | POST: 403 unauth, 404 not found, 400 missing required fields, archive old passport to expatPassportHistory & update to new passport |
| 23 | **Expatriate Passport History** | `unit/api/expatriate-passport-history.test.js` | 4 | DELETE: 403 unauth, 404 not found / mismatch expatId, delete scan file & delete history record |

### P2 — Expatriate Permits & Types

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 24 | **Permit Types List & Create** | `unit/api/permit-types.test.js` | 7 | GET: 403 unauthorized, return sorted permit types. POST: 403 unauthorized, 400 nama wajib diisi, 409 duplicate name, create dengan default flags, create dengan custom flags & order |
| 25 | **Permit Types Detail** | `unit/api/permit-types-detail.test.js` | 9 | PATCH: 403 unauth, 404 not found, 400 empty name, 409 duplicate name, 200 update metadata. DELETE: 403 unauth, 404 not found, 409 conflict if in use, 200 delete sukses |
| 26 | **Expatriate Permits** | `unit/api/expatriate-permits.test.js` | 8 | POST: 403 unauth, 404 expat/permitType not found, 400 validation & forExpat guard, 409 EPO duplicate, 201 create permit & snapshot history |
| 27 | **Expatriate Permit Detail** | `unit/api/expatriate-permit-detail.test.js` | 7 | PATCH: 403 unauth, 404 not found/mismatch expatId, update fields + diff audit. DELETE: 403 unauth, 404 not found, cascade cleanup replaced permits & scans, delete permit |
| 28 | **Expatriate Permit Renewal** | `unit/api/expatriate-permit-renew.test.js` | 6 | POST: 403 unauth, 404 not found/mismatch expatId, 409 already replaced, 400 validation, 201 create renewed permit & record 2 history entries |
| 29 | **Expatriate Permit Scan** | `unit/api/expatriate-permit-scan.test.js` | 7 | POST: 403 unauth, 404 not found/mismatch expatId, 400 upload error, 200 upload new PDF & delete old scan. DELETE: 403 unauth, 404 not found, 200 delete physical scan & reset DB |
| 30 | **Legacy EPO Handlers** | `unit/api/expatriate-epo.test.js` | 4 | GET, POST, PATCH, DELETE return 410 Gone with redirect instruction |

### P2 — Expatriate Family Module

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 31 | **Family List & Create** | `unit/api/expatriate-family.test.js` | 5 | POST: 403 unauth, 404 expat not found, 400 validation required fields, 201 create family member & snapshot history |
| 32 | **Family Detail** | `unit/api/expatriate-family-detail.test.js` | 7 | PATCH: 403 unauth, 404 not found/mismatch expatId, update fields + diff audit. DELETE: 403 unauth, 404 not found, delete member |
| 33 | **Family Photo & Passport Scan** | `unit/api/expatriate-family-photo-scan.test.js` | 14 | POST & DELETE upload/hapus fisik foto dan berkas scan paspor keluarga |
| 34 | **Family Passport Renewal & History** | `unit/api/expatriate-family-passport.test.js` | 8 | POST: renew paspor keluarga, arsip ke familyPassportHistory, reset scanUrl. DELETE: hapus riwayat & scan berkas |
| 35 | **Family Permits Management** | `unit/api/expatriate-family-permits.test.js` | 12 | POST/PATCH/DELETE permit keluarga, validasi flag `forFamily`, perpanjangan izin (renew), upload/delete scan permit |
| 36 | **Family Legacy EPO Handlers** | `unit/api/expatriate-family-epo.test.js` | 4 | Verifikasi 410 Gone untuk seluruh HTTP methods (GET, POST, PATCH, DELETE) |

### P3 — React Components & Hooks

| # | Test Suite | File | Tests | Cakupan |
|---|-----------|------|-------|---------|
| 37 | **Navbar** | `unit/components/Navbar.test.jsx` | 6 | Render link reguler, role admin (Kelola User & Expat), role expat_admin, role employee, penanda rute aktif, signOut |
| 38 | **NotesItem** | `unit/components/NotesItem.test.jsx` | 7 | Render title/desc/status, toggle done, inline edit title/desc, konfirmasi delete & cancel, togglePrgs |
| 39 | **NotesProgress** | `unit/components/NotesProgress.test.jsx` | 6 | Render list progress & feedbacks, submit add progress, cycle status (Plan->On Process), delete progress, add feedback, delete feedback |
| 40 | **UserManagement** | `unit/components/UserManagement.test.jsx` | 7 | Render tabel pengguna & badge Saya, filter user nonaktif, tambah user baru & error handling, edit user, nonaktifkan user & self-delete protection |
| 41 | **SessionProviderWrapper** | `unit/components/SessionProviderWrapper.test.jsx` | 2 | Render children dengan benar di dalam NextAuth SessionProvider |
| 42 | **useAutoResizeTextarea** | `unit/components/useAutoResizeTextarea.test.jsx` | 5 | Mengembalikan ref, auto-resize scrollHeight saat value berubah, penanganan saat isVisible toggle, null ref safety |

**Total: 42 test suites, 288 tests (100% SELESAI)**

---

## Status Implementasi

> **Seluruh 42 test suites dari P0 sampai P3 telah berhasil diimplementasikan dan diverifikasi passing 100%!** Tidak ada test suites yang tertunda.

---

## Konvensi & Pola

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

## Konfigurasi

- **Config file**: `vitest.config.mjs` (root project)
- **Environment default**: `node` (untuk API routes & helpers)
- **Path alias**: `@/` → root project (sama dengan Next.js tsconfig paths)
- **Test file pattern**: `tests/**/*.test.{js,jsx}`
- **Setup file**: `tests/setup.js` (dijalankan sebelum setiap file test)

### Proteksi Database (Defense-in-Depth Safety Guard)

Untuk menjamin bahwa eksekusi unit test **tidak pernah menyentuh database nyata** (baik di lokal dev, CI/CD pipeline, maupun jika dijalankan di server production), diterapkan dua lapis proteksi:

1. **Layer 1: Global Fail-Safe Proxy (`tests/setup.js`)**:
   - Menangani kasus *human error* jika programmer lupa mendeklarasikan `vi.mock("@/lib/prisma")`.
   - Proxy otomatis memblokir pemanggilan dan melempar error keras:
     ```
     Error: [TEST SAFETY GUARD] Akses ke prisma.<model>.<method> DIBLOKIR!
     Anda lupa menambahkan vi.mock("@/lib/prisma") pada file test ini.
     ```
   - Test otomatis gagal dan koneksi fisik dicegah 100%.

2. **Layer 2: Dummy Environment Variables (`vitest.config.mjs`)**:
   - Menimpa `DATABASE_URL` di runtime test dengan host dan port tertutup:
     ```js
     env: {
       NODE_ENV: "test",
       DATABASE_URL: "postgresql://guard:blocked@127.0.0.1:59999/safeguard_blocked_db",
       NEXTAUTH_SECRET: "test-secret-at-least-32-chars-long-for-testing-purpose",
       NEXTAUTH_URL: "http://localhost:3000",
     }
     ```
   - Menjamin tidak ada koneksi yang bocor meskipun inisialisasi PrismaClient lolos.

### Menambahkan jsdom untuk Component Test

Tambahkan comment di baris pertama file test:

```js
// @vitest-environment jsdom
```

---

## CI Integration

Unit tests terintegrasi di GitHub Actions CI pipeline (`.github/workflows/ci.yml`):

```
Install → Prisma Generate → Unit Tests → Build
```

Tests dijalankan **sebelum build** sehingga error terdeteksi lebih awal.
