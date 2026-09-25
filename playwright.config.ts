import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://127.0.0.1:5173" },
  projects: [
    { name: "phone-portrait", use: { viewport: { width: 390, height: 844 } } },
    { name: "phone-landscape", use: { viewport: { width: 844, height: 390 } } },
    { name: "ipad", use: { viewport: { width: 1024, height: 1366 } } },
    { name: "desktop", use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
});
