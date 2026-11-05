import { test, expect } from "@playwright/test";

test.describe("Dashboard Utama (Dengan Global Auth)", () => {
  test("Harus langsung bisa mengakses dashboard tanpa login form", async ({ page }) => {
    // Buka root URL secara langsung
    await page.goto("/");

    // Pastikan langsung berada di dashboard
    await expect(page).toHaveURL("http://localhost:3000/");

    // Pastikan teks selamat datang untuk admin muncul
    await expect(
      page.getByRole("heading", { name: /Selamat datang, Admin!/i })
    ).toBeVisible();

    // Verifikasi teks deskripsi portal
    await expect(
      page.getByText("LPE HUB — Portal aktivitas karyawan internal")
    ).toBeVisible();
  });
});