/**
 * Authentication E2E tests.
 * These run WITHOUT a stored session (unauthenticated context).
 */
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("landing page loads and redirects or shows sign-in options", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Either lands on a page with a CTA or gets redirected to sign-in
    const hasSignIn = await page
      .locator("a, button")
      .filter({ hasText: /sign.?in|get started|request a ride|login/i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasSignIn || url.includes("signin") || url.includes("auth")).toBe(true);
  });

  test("navigating to /rider/request redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/rider/request");
    await page.waitForURL(/signin|login|auth/, { timeout: 8000 });
    expect(page.url()).toMatch(/signin|login|auth/);
  });

  test("navigating to /driver/dashboard redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/driver/dashboard");
    await page.waitForURL(/signin|login|auth/, { timeout: 8000 });
    expect(page.url()).toMatch(/signin|login|auth/);
  });

  test("sign-in page shows email and password fields", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible();
  });

  test("sign-in rejects bad credentials — stays on auth flow", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill("input[type='email'], input[name='email']", "nobody@example.com");
    await page.fill("input[type='password'], input[name='password']", "wrongpassword");
    await page.click("button[type='submit']");
    await page.waitForTimeout(3000);
    // Should either show an error or redirect back to signin with ?error= — never reach the app
    const url = page.url();
    expect(url).not.toMatch(/rider|driver|dashboard/);
  });

  test("rider demo account can sign in", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill("input[type='email'], input[name='email']", "alice@kayu.com");
    await page.fill("input[type='password'], input[name='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL(/rider|dashboard|request/, { timeout: 10000 });
    expect(page.url()).toMatch(/rider|dashboard|request/);
  });

  test("driver demo account can sign in", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill("input[type='email'], input[name='email']", "driver.carlos@kayu.com");
    await page.fill("input[type='password'], input[name='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL(/driver|dashboard/, { timeout: 10000 });
    expect(page.url()).toMatch(/driver|dashboard/);
  });
});
