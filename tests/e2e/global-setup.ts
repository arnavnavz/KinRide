/**
 * Playwright global setup:
 * 1. Authenticate as rider and driver.
 * 2. Dismiss onboarding, cookie consent, and notification prompt.
 * 3. Save sessions to disk for reuse in tests (avoiding per-test login).
 */
import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_DIR = path.join(__dirname, ".auth");

/** LocalStorage keys to pre-set so modals don't block tests */
const DISMISS_KEYS: Record<string, string> = {
  "kayu-cookie-consent": "accepted",
  "kayu-onboarding-done": "true",
  "kayu-notif-dismissed": "true",
};

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch();

  async function authenticate(
    email: string,
    password: string,
    redirectPattern: RegExp,
    outFile: string
  ) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto("http://localhost:3000/auth/signin");
    await page.fill("input[type='email'], input[name='email']", email);
    await page.fill("input[type='password'], input[name='password']", password);
    await page.click("button[type='submit']");
    await page.waitForURL(redirectPattern, { timeout: 15000 });

    // Pre-dismiss all modal overlays so tests start clean
    await page.evaluate((keys) => {
      for (const [k, v] of Object.entries(keys)) {
        localStorage.setItem(k, v);
      }
    }, DISMISS_KEYS);

    await ctx.storageState({ path: outFile });
    await ctx.close();
  }

  await authenticate(
    "alice@kayu.com",
    "password123",
    /rider|dashboard|request/,
    path.join(AUTH_DIR, "rider.json")
  );

  await authenticate(
    "driver.carlos@kayu.com",
    "password123",
    /driver|dashboard/,
    path.join(AUTH_DIR, "driver.json")
  );

  await browser.close();
}
