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
    └── api/
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
        └── expatriate-passport-history.test.js # API /api/expatriate/[id]/passport/history/[historyId] (DELETE)
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

**Total: 23 test suites, 157 tests**

---

## Test Suites — Belum Diimplementasikan_________________________________________________________________

### P2 — Expatriate Permits & Types

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 24 | Permit Types List & Create | `app/api/expatriate/permit-types/route.js` | ~5 | GET: list jenis izin terurut. POST: validasi nama wajib, cek duplikasi nama, parsing boolean flags (`forExpat`, `forFamily`, `isEPO`) |
| 25 | Permit Types Detail | `app/api/expatriate/permit-types/[typeId]/route.js` | ~6 | PATCH: update metadata jenis izin, proteksi duplicate name. DELETE: proteksi 409 Conflict jika jenis izin masih digunakan oleh permit aktif |
| 26 | Expatriate Permits | `app/api/expatriate/[id]/permits/route.js` | ~6 | POST: tambah permit baru, validasi flag `forExpat`, proteksi duplikasi permit jika `isEPO`, pencatatan riwayat CREATE |
| 27 | Expatriate Permit Detail | `app/api/expatriate/[id]/permits/[permitId]/route.js` | ~6 | PATCH: update nomor/tanggal/tipe permit + diff audit. DELETE: cascade pembersihan izin replaced & berkas scannya |
| 28 | Expatriate Permit Renewal | `app/api/expatriate/[id]/permits/[permitId]/renew/route.js` | ~5 | POST: ubah status permit lama menjadi `replaced`, buat permit baru status `active`, catat relasi riwayat |
| 29 | Expatriate Permit Scan | `app/api/expatriate/[id]/permits/[permitId]/scan/route.js` | ~4 | POST: upload berkas scan izin expat. DELETE: hapus berkas scan izin |
| 30 | Legacy EPO Handlers | `app/api/expatriate/[id]/epo/route.js` | ~3 | Verifikasi semua method (GET/POST/PATCH/DELETE) mengembalikan 410 Gone (dialihkan ke endpoint permits) |

### P2 — Expatriate Family Module

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 31 | Family List & Create | `app/api/expatriate/[id]/family/route.js` | ~5 | POST: validasi seluruh data keluarga (status keluarga, paspor, tgl lahir), simpan relasi `expatId`, catat history |
| 32 | Family Detail | `app/api/expatriate/[id]/family/[familyId]/route.js` | ~6 | PATCH: update data keluarga, audit diff changes. DELETE: hapus data anggota keluarga |
| 33 | Family Photo & Passport Scan | `.../family/[familyId]/photo` & `passport-scan` | ~6 | POST & DELETE upload foto dan berkas scan paspor anggota keluarga |
| 34 | Family Passport Renewal & History | `.../family/[familyId]/passport/renew` & `history/[historyId]` | ~6 | POST: perpanjang paspor keluarga (arsip ke `expatFamilyPassportHistory`). DELETE: hapus riwayat paspor lama |
| 35 | Family Permits Management | `.../family/[familyId]/permits/**` | ~8 | POST/PATCH/DELETE permit keluarga, validasi flag `forFamily`, perpanjangan izin (renew), upload/delete scan permit |
| 36 | Family Legacy EPO Handlers | `app/api/expatriate/[id]/family/[familyId]/epo/route.js` | ~3 | Verifikasi respons 410 Gone untuk seluruh HTTP methods |

### P3 — React Components & Hooks

> Membutuhkan `jsdom` environment. Dapat dijalankan dengan menambahkan comment `// @vitest-environment jsdom` pada baris pertama file test.

| # | Test Suite | Source File | Estimasi Tests | Cakupan |
|---|-----------|------------|----------------|---------|
| 37 | Navbar | `components/Navbar.jsx` | ~7 | Render link navigasi berdasarkan role (`admin`, `expatriate_admin`, `employee`), penanda rute aktif, tombol signOut |
| 38 | NotesItem | `components/notes/NotesItem.jsx` | ~4 | Render title/deskripsi note, toggle status selesai/belum, pemanggilan handler delete |
| 39 | NotesProgress | `components/notes/NotesProgress.jsx` | ~5 | Render daftar progress, submit form progress baru, update status item, render feedback list |
| 40 | UserManagement | `components/admin/UserManagement.jsx` | ~6 | Render tabel pengguna, validasi form modal tambah/edit user, submit data, konfirmasi aksi delete |
| 41 | SessionProviderWrapper | `components/SessionProviderWrapper.jsx` | ~2 | Render children dengan benar di dalam NextAuth `SessionProvider` |
| 42 | useAutoResizeTextarea | `hooks/useAutoResizeTextarea.js` | ~4 | Mengembalikan ref, auto-resize tinggi textarea saat value berubah, penanganan saat visibility toggle |

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
