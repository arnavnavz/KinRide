import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_DIR = path.join(__dirname, "tests/e2e/.auth");

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: /global-setup\.ts/,
  timeout: 30000,
  retries: 1,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: path.join(AUTH_DIR, "rider.json"),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
