import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const AUTH_SECRET = process.env.AUTH_SECRET;

// Reset cookies khusus untuk file ini agar browser tetap anonim/belum login
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Autentikasi & Proteksi Rute LPE Hub", () => {
  test("Harus me-redirect user anonim dari / ke halaman /login", async ({ page }) => {
    // Kunjungi root dashboard tanpa login
    await page.goto("/");

    // Pastikan ter-redirect ke /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "LPE HUB" })).toBeVisible();
  });

  test("Menampilkan pesan error jika login dengan email/password salah", async ({ page }) => {
    // Mock NextAuth credentials callback untuk mengembalikan error CredentialsSignin
    await page.route("**/api/auth/callback/credentials*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:3000/api/auth/signin?error=CredentialsSignin",
        }),
      });
    });

    await page.goto("/login");

    // Isi formulir login dengan data invalid
    await page.getByPlaceholder("nama@perusahaan.com").fill("salah@dnp-g.com");
    await page.getByPlaceholder("••••••••").fill("passwordsalah");

    // Klik tombol Masuk
    await page.getByRole("button", { name: "Masuk" }).click();

    // Verifikasi pesan validasi error
    const errorMessage = page.locator("text=Email atau password salah.");
    await expect(errorMessage).toBeVisible();
  });

  test("Berhasil login dengan akun valid dan masuk ke dashboard", async ({ page, context }) => {
    // Dynamic import untuk modul ESM next-auth/jwt
    const { encode } = await import("next-auth/jwt");

    // Generate valid session JWT token untuk NextAuth
    const sessionToken = await encode({
      salt: "authjs.session-token",
      secret: AUTH_SECRET,
      token: {
        name: "Admin",
        email: "sep@dnp-g.com",
        role: "admin",
        id: "test-admin-id",
        sub: "test-admin-id",
      },
    });

    // Mock NextAuth credentials callback untuk mengembalikan respons sukses
    await page.route("**/api/auth/callback/credentials*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:3000/",
        }),
      });
    });

    await page.goto("/login");

    // Isi formulir login dengan kredensial akun valid
    await page.getByPlaceholder("nama@perusahaan.com").fill("sep@dnp-g.com");
    await page.getByPlaceholder("••••••••").fill("password123");

    // Set cookie autentikasi langsung ke browser context sebelum submit
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        url: "http://localhost:3000",
      },
    ]);

    // Klik tombol Masuk
    await page.getByRole("button", { name: "Masuk" }).click();

    // Tunggu navigasi ke dashboard utama
    await expect(page).toHaveURL("http://localhost:3000/");

    // Verifikasi teks selamat datang di dashboard
    await expect(
      page.getByRole("heading", { name: /Selamat datang, Admin!/i })
    ).toBeVisible();
  });
});
