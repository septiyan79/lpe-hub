import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000, // Timeout assertion: 10 detik (sebelumnya default 5 detik)
  },
  /* Jalankan test secara paralel di local */
  fullyParallel: false,
  /* Gagal di CI jika ada test.only yang tertinggal */
  forbidOnly: !!process.env.CI,
  /* Retry hanya jika di CI */
  retries: process.env.CI ? 2 : 0,
  /* Worker threads */
  workers: 1,
  /* Reporter */
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    /* Base URL aplikasi Next.js */
    baseURL: "http://localhost:3000",
    /* Kumpulkan trace saat test gagal */
    trace: "on",
    screenshot: "only-on-failure",
  },

  projects: [
    // 1. Project Setup: Dijalankan pertama kali untuk membuat session file
    {
      name: "setup",
      testMatch: /.*\.setup\.js/,
    },

    // 2. Project Chromium: Menjalankan test fitur dengan sesi yang sudah tersimpan
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Gunakan state autentikasi yang dihasilkan oleh setup
        storageState: "playwright/.auth/admin.json",
      },
      // Pastikan project 'setup' selesai dulu sebelum chromium berjalan
      dependencies: ["setup"],
      // Jangan jalankan kembali file setup di dalam project ini
      testIgnore: [/.*\.setup\.js/],
    },
  ],

  /* Otomatis menyalakan server lokal saat testing berjalan */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});