# End-to-End (E2E) Testing — LPE Hub

Dokumentasi pengujian End-to-End (E2E) untuk project LPE Hub menggunakan **Playwright Test**.

---

## Tech Stack

| Tool | Versi | Fungsi |
|------|-------|--------|
| [@playwright/test](https://playwright.dev/) | ^1.64.x | Test framework & runner untuk browser Chromium |
| [NextAuth JWT Helper](https://next-auth.js.org/) | ^5.0.0-beta.31 | Enkripsi session token cookie untuk setup otentikasi |
| [dotenv](https://github.com/motdotla/dotenv) | ^17.x | Load environment variable (`AUTH_SECRET`) pada environment tes |

---

## Perintah Menjalankan Tes

```bash
# 1. Jalankan seluruh pengujian E2E (headless mode)
npm run test:e2e

# 2. Jalankan pengujian dengan Interactive UI Mode (Time-travel debugging)
npm run test:e2e:ui

# 3. Buka laporan HTML dari hasil pengujian terakhir
npm run test:e2e:report

# 4. Menjalankan file pengujian spesifik
npx playwright test tests/e2e/auth.spec.js
npx playwright test tests/e2e/dashboard.spec.js
npx playwright test tests/e2e/expatriate.spec.js
npx playwright test tests/e2e/todolist.spec.js
npx playwright test tests/e2e/notes.spec.js
```

---

## Konsep & Keputusan Arsitektur

### 1. Global Authentication Session Re-use (`auth.setup.js`)
LPE Hub menggunakan NextAuth v5 dengan strategi JWT cookie (`authjs.session-token`).
- File `auth.setup.js` berjalan pertama kali melalui project `setup` di `playwright.config.js`.
- File ini meng-generate JWT token terenkripsi menggunakan `AUTH_SECRET`, memasukkannya ke cookie browser pada `http://localhost:3000`, lalu mengekspor session state ke:
  `playwright/.auth/admin.json`
- Seluruh file pengujian fitur (`chromium` project) otomatis mewarisi session state ini tanpa perlu melakukan submit form login berulang-ulang.

### 2. Strategi API Interception Mocking (`page.route`)
Database produksi dan development LPE Hub (SQL Server `172.16.128.221:1433`) berada pada intranet tertutup korporat DNP Indonesia yang tidak dapat diakses tanpa koneksi VPN/jaringan kantor.

Untuk menjamin pengujian E2E dapat berjalan **100% reliabel, cepat, dan independen** di laptop developer maupun GitHub Actions CI/CD:
- Semua request API (`/api/todos`, `/api/expatriate`, `/api/notes`) di-intercept pada layer jaringan browser menggunakan `await page.route(...)`.
- Pengujian memverifikasi interaksi antarmuka pengguna nyata (klik tombol, input form, perubahan DOM, filter tabel) dengan data in-memory lokal sementara.

---

## Katalog Skenario Pengujian (Total: 21 Tes)

### 1. Project Setup
- `auth.setup.js`: Autentikasi akun admin via cookie JWT dan simpan session state ke `admin.json`.

### 2. Autentikasi & Proteksi Rute (`auth.spec.js` — 3 Tes)
- **Tes 1:** Harus me-redirect user anonim (belum login) dari root `/` ke halaman `/login`.
- **Tes 2:** Menampilkan pesan error validasi saat login dengan email/password yang salah.
- **Tes 3:** Berhasil login menggunakan kredensial akun valid dan diarahkan masuk ke Dashboard.

### 3. Dashboard Utama (`dashboard.spec.js` — 1 Tes)
- **Tes 1:** User yang sudah login dapat langsung mengakses halaman dashboard utama tanpa melihat form login.

### 4. Modul Expatriate Management (`expatriate.spec.js` — 5 Tes)
- **Tes 1:** Menampilkan daftar kartu ekspatriat dan jumlah data yang sesuai.
- **Tes 2:** Fitur pencarian real-time untuk menyaring nama/departemen ekspatriat.
- **Tes 3:** Beralih antara tampilan kartu (List View) dan tampilan tabel (Table View).
- **Tes 4:** Membuka dan menutup popup modal Tambah Expatriate.
- **Tes 5:** Mengisi form lengkap identitas/paspor/pekerjaan dan submit untuk membuat data ekspatriat baru.

### 5. Modul Todo List (`todolist.spec.js` — 5 Tes)
- **Tes 1:** Menampilkan daftar tugas awal dan badge counter status (aktif / selesai).
- **Tes 2:** Menambahkan item tugas baru ke dalam daftar.
- **Tes 3:** Menandai tugas sebagai selesai (toggle centang / garis coret).
- **Tes 4:** Menghapus tugas dari daftar.
- **Tes 5:** Menyaring tugas dengan tombol filter (Semua, Aktif, Selesai).

### 6. Modul Activity Notes (`notes.spec.js` — 6 Tes)
- **Tes 1:** Menampilkan daftar catatan aktivitas dan status awal `On Going`.
- **Tes 2:** Menambahkan catatan baru dengan form dinamis (judul & deskripsi expandable).
- **Tes 3:** Mengubah status catatan menjadi `Done` (badge berubah warna).
- **Tes 4:** Membuka panel progress catatan dan menambahkan sub-aktivitas progress baru.
- **Tes 5:** Menambahkan masukan / feedback ke dalam item progress tertentu.
- **Tes 6:** Menghapus catatan aktivitas dengan menangani konfirmasi dialog browser.

---

## Troubleshooting Umum

1. **Port 3000 In Use:**  
   Jika muncul peringatan port 3000 bentrok dengan proses Next.js yang menggantung, matikan prosesnya dengan:
   ```powershell
   taskkill /PID <PID_SERVER> /F
   ```
2. **Playwright UI Hanya Menampilkan `setup`:**  
   Pada Playwright UI (`npm run test:e2e:ui`), pastikan project **`chromium`** dicentang pada panel filter *Projects* di sidebar sebelah kiri.

