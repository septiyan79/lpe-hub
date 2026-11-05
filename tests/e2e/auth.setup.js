import { test as setup } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const AUTH_SECRET = process.env.AUTH_SECRET;

const authFile = "playwright/.auth/admin.json";

setup("Autentikasi admin dan simpan session state", async ({ page, context }) => {
  // 1. Dynamic import library JWT
  const { encode } = await import("next-auth/jwt");

  // 2. Buat JWT session token yang valid untuk Admin
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

  // 3. Suntikkan cookie sesi ke context browser
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      url: "http://localhost:3000",
    },
  ]);

  // 4. Kunjungi root dashboard untuk memastikan cookie aktif dan diakui server Next.js
  await page.goto("/");
  await page.waitForURL("http://localhost:3000/");

  // 5. Simpan seluruh cookies & storage ke file JSON
  await context.storageState({ path: authFile });
});