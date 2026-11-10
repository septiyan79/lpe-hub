import { test, expect } from "@playwright/test";

test.describe("Fitur Todo List LPE Hub", () => {
  // Penyimpanan data lokal sementara di memori test runner
  let todos = [];

  test.beforeEach(async ({ page }) => {
    // 1. Siapkan data awal sebelum setiap skenario dijalankan
    todos = [
      { id: "1", text: "Periksa berkas izin KITAS", done: false },
      { id: "2", text: "Kirim laporan bulanan TKA", done: true },
    ];

    // 2. Intercept API GET & POST /api/todos
    await page.route("**/api/todos", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(todos),
        });
      } else if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newTodo = {
          id: String(Date.now()),
          text: body.text,
          done: false,
        };
        todos.push(newTodo);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newTodo),
        });
      }
    });

    // 3. Intercept API PATCH & DELETE /api/todos/*
    await page.route("**/api/todos/*", async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const id = url.split("/").pop();

      if (method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        todos = todos.map((t) => (t.id === id ? { ...t, ...body } : t));
        const updated = todos.find((t) => t.id === id);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
      } else if (method === "DELETE") {
        todos = todos.filter((t) => t.id !== id);
        await route.fulfill({ status: 204 });
      }
    });

    // 4. Kunjungi halaman Todo List (otomatis login via storageState)
    await page.goto("/todolist");
    await expect(page.getByRole("heading", { name: "Todo List" })).toBeVisible();
  });

  test("1. Harus menampilkan daftar tugas awal dan badge counter", async ({ page }) => {
    // Verifikasi teks item tugas tampil
    await expect(page.getByText("Periksa berkas izin KITAS")).toBeVisible();
    await expect(page.getByText("Kirim laporan bulanan TKA")).toBeVisible();

    // Verifikasi badge status (1 aktif, 1 selesai)
    await expect(page.getByText("1 aktif")).toBeVisible();
    await expect(page.getByText("1 selesai")).toBeVisible();
  });

  test("2. Harus bisa menambahkan tugas baru ke daftar", async ({ page }) => {
    const input = page.getByPlaceholder("Tambah tugas baru...");
    const addButton = page.getByRole("button", { name: "Tambah" });

    // Ketik tugas baru dan klik tombol Tambah
    await input.fill("Follow-up perpanjangan visa");
    await addButton.click();

    // Verifikasi tugas baru muncul di daftar
    await expect(page.getByText("Follow-up perpanjangan visa")).toBeVisible();

    // Counter aktif bertambah menjadi 2
    await expect(page.getByText("2 aktif")).toBeVisible();

    // Input form otomatis bersih kembali
    await expect(input).toHaveValue("");
  });

  test("3. Harus bisa menandai tugas sebagai selesai (toggle done)", async ({ page }) => {
    // Cari baris tugas pertama yang masih aktif
    const todoItem = page.locator("li").filter({ hasText: "Periksa berkas izin KITAS" });
    const checkButton = todoItem.locator("button").first();

    // Klik tombol centang
    await checkButton.click();

    // Verifikasi counter berubah menjadi (0 aktif, 2 selesai)
    await expect(page.getByText("0 aktif")).toBeVisible();
    await expect(page.getByText("2 selesai")).toBeVisible();

    // Verifikasi teks dicoret (memiliki class line-through)
    await expect(todoItem.getByText("Periksa berkas izin KITAS")).toHaveClass(/line-through/);
  });

  test("4. Harus bisa menghapus tugas dari daftar", async ({ page }) => {
    const todoItem = page.locator("li").filter({ hasText: "Kirim laporan bulanan TKA" });
    
    // Cari tombol icon tempat sampah di baris tersebut
    const deleteButton = todoItem.locator("button").last();
    await deleteButton.click();

    // Verifikasi tugas hilang dari layar
    await expect(page.getByText("Kirim laporan bulanan TKA")).not.toBeVisible();

    // Counter selesai berkurang menjadi 0
    await expect(page.getByText("0 selesai")).toBeVisible();
  });

  test("5. Harus bisa menyaring tugas dengan filter (Semua, Aktif, Selesai)", async ({ page }) => {
    // Klik filter "Aktif"
    await page.getByRole("button", { name: "Aktif", exact: true }).click();
    await expect(page.getByText("Periksa berkas izin KITAS")).toBeVisible();
    await expect(page.getByText("Kirim laporan bulanan TKA")).not.toBeVisible();

    // Klik filter "Selesai"
    await page.getByRole("button", { name: "Selesai", exact: true }).click();
    await expect(page.getByText("Periksa berkas izin KITAS")).not.toBeVisible();
    await expect(page.getByText("Kirim laporan bulanan TKA")).toBeVisible();

    // Kembalikan ke filter "Semua"
    await page.getByRole("button", { name: "Semua", exact: true }).click();
    await expect(page.getByText("Periksa berkas izin KITAS")).toBeVisible();
    await expect(page.getByText("Kirim laporan bulanan TKA")).toBeVisible();
  });
});