import { test, expect } from "@playwright/test";

test.describe("Fitur Utama Expatriate LPE Hub", () => {
  // Simulasi database lokal expatriate
  let expatriates = [];

  test.beforeEach(async ({ page }) => {
    // 1. Data awal expatriate untuk pengujian
    expatriates = [
      {
        id: "expat-1",
        name: "Kenji Sato",
        gender: "Male",
        position: "Technical Advisor",
        department: "Engineering",
        arrivalDate: "2024-01-15T00:00:00.000Z",
        passportNo: "TK12345678",
        permits: [],
        _count: { families: 2 },
      },
      {
        id: "expat-2",
        name: "Hiroshi Tanaka",
        gender: "Male",
        position: "General Manager",
        department: "Management",
        arrivalDate: "2023-06-01T00:00:00.000Z",
        passportNo: "TK98765432",
        permits: [],
        _count: { families: 0 },
      },
    ];

    // 2. Intercept API master permit-types
    await page.route("**/api/expatriate/permit-types", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "pt-1", name: "Pengesahan RPTKA", linkedToWorkPermit: true },
        ]),
      });
    });

    // 3. Intercept API GET & POST /api/expatriate
    await page.route("**/api/expatriate", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(expatriates),
        });
      } else if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newExpat = {
          id: "expat-new-123",
          ...body,
          permits: [],
          _count: { families: 0 },
        };
        expatriates.push(newExpat);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newExpat),
        });
      }
    });

        // Mock khusus detail expatriate (hanya yang diawali expat-)
    await page.route("**/api/expatriate/expat-*", async (route) => {
      const url = route.request().url();
      const id = url.split("/").pop();
      const expat = expatriates.find((e) => e.id === id) || expatriates[0];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...expat,
          permits: expat.permits || [],
          families: [],
          histories: [],
          passportHistories: [],
        }),
      });
    });

    // 4. Kunjungi halaman Expatriate (otomatis login sebagai Admin via storageState)
    await page.goto("/expatriate");
    await expect(page.getByRole("heading", { name: "Expatriate", exact: true })).toBeVisible();
  });

  test("1. Harus menampilkan daftar kartu expatriate dan jumlah data yang sesuai", async ({ page }) => {
    // Verifikasi badge total data
    await expect(page.getByText("2 data")).toBeVisible();

    // Verifikasi kartu Kenji Sato
    await expect(page.getByText("Kenji Sato")).toBeVisible();
    await expect(page.getByText("Technical Advisor")).toBeVisible();
    await expect(page.getByText("Engineering")).toBeVisible();

    // Verifikasi kartu Hiroshi Tanaka
    await expect(page.getByText("Hiroshi Tanaka")).toBeVisible();
    await expect(page.getByText("General Manager")).toBeVisible();
  });

  test("2. Harus bisa menyaring data menggunakan fitur pencarian (Search)", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Cari nama, jabatan, dept...");

    // Cari "Kenji"
    await searchInput.fill("Kenji");

    // Kenji Sato tetap tampil, Hiroshi Tanaka menghilang
    await expect(page.getByText("Kenji Sato")).toBeVisible();
    await expect(page.getByText("Hiroshi Tanaka")).not.toBeVisible();
    await expect(page.getByText("1 data")).toBeVisible();

    // Bersihkan pencarian
    await searchInput.fill("");

    // Kedua data muncul kembali
    await expect(page.getByText("Kenji Sato")).toBeVisible();
    await expect(page.getByText("Hiroshi Tanaka")).toBeVisible();
    await expect(page.getByText("2 data")).toBeVisible();
  });

  test("3. Harus bisa beralih antara tampilan List dan Tabel (View Toggle)", async ({ page }) => {
    // Klik tombol tampilan tabel
    const tableViewButton = page.getByTitle("Tampilan tabel");
    await tableViewButton.click();

    // Pastikan header tabel utama muncul
    await expect(page.getByRole("columnheader", { name: "Nama" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Jabatan" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Dept" })).toBeVisible();

    // Klik kembali ke tampilan list
    const listViewButton = page.getByTitle("Tampilan list");
    await listViewButton.click();

    // Pastikan tampilan kembali ke kartu list
    await expect(page.getByText("Technical Advisor")).toBeVisible();
  });

  test("4. Harus bisa membuka dan menutup modal Tambah Expatriate", async ({ page }) => {
    const openAddButton = page.getByRole("button", { name: /Tambah Expatriate/i });
    await openAddButton.click();

    // Verifikasi popup modal terbuka
    const modalHeading = page.getByRole("heading", { name: "Tambah Expatriate" });
    await expect(modalHeading).toBeVisible();

    // Klik tombol Batal
    await page.getByRole("button", { name: "Batal" }).click();

    // Verifikasi modal tertutup kembali
    await expect(modalHeading).not.toBeVisible();
  });

    test("5. Harus bisa mengisi form dan menambah data Expatriate baru", async ({ page }) => {
    // 1. Buka modal tambah
    await page.getByRole("button", { name: /Tambah Expatriate/i }).click();
    await expect(page.getByRole("heading", { name: "Tambah Expatriate" })).toBeVisible();

    // 2. Isi bagian Identitas
    await page.locator('label:has-text("Nama Lengkap") + input').fill("Takeshi Kovacs");
    await page.locator('label:has-text("Tempat Lahir") + input').fill("Tokyo");
    await page.locator('label:has-text("Tanggal Lahir") + input').fill("1985-05-20");

    // 3. Isi bagian Passport
    await page.locator('label:has-text("Nomor Passport") + input').fill("TK99887766");
    await page.locator('label:has-text("Issued Date") + input').fill("2020-01-01");
    await page.locator('label:has-text("Expiry Date") + input').fill("2030-01-01");

    // 4. Isi bagian Pekerjaan & Alamat
    await page.locator('label:has-text("Jabatan") + input').fill("Senior Consultant");
    await page.locator('label:has-text("Department") + input').fill("Operations");
    await page.locator('label:has-text("Present Address") + textarea').fill("Jl. Jend. Sudirman, Jakarta");
    await page.locator('label:has-text("Permanent Address") + textarea').fill("Shibuya, Tokyo, Japan");
    await page.locator('label:has-text("Arrival Date") + input').fill("2024-01-10");

    // 5. Simpan formulir
    const submitButton = page.getByRole("button", { name: /Simpan & Buka Detail/i });
    await submitButton.click();

    // 6. Verifikasi diarahkan ke halaman detail expatriate baru
    await expect(page).toHaveURL(/\/expatriate\/expat-new-123/);
  });
});