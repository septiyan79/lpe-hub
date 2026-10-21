import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    // Use node environment by default (API routes, helpers, auth)
    // Use jsdom per-file for React components via @vitest-environment jsdom comment
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://guard:blocked@127.0.0.1:59999/safeguard_blocked_db",
      NEXTAUTH_SECRET: "test-secret-at-least-32-chars-long-for-testing-purpose",
      NEXTAUTH_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      include: [
        "lib/**",
        "hooks/**",
        "app/api/**",
        "components/**",
      ],
      exclude: [
        "app/generated/**",
        "node_modules/**",
      ],
    },
  },
});
