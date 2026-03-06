/**
 * Safety feature E2E tests:
 * - Verify code display (rider side)
 * - SOS modal and tel:911 link
 * - Driver dashboard
 * - Public trip share page
 */
import { test, expect } from "@playwright/test";
import { RIDER_STATE, DRIVER_STATE, mockRide } from "./helpers";

// ── Verify Code and Safety Alerts — Rider Side ────────────────────────────────

test.describe("Verify Code — Rider Side", () => {
  test.use({ storageState: RIDER_STATE });

  test("non-existent ride shows 'Ride not found.'", async ({ page }) => {
    await page.goto("/rider/ride/nonexistent-id-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Ride not found.")).toBeVisible({ timeout: 10000 });
  });

  test("verify code card appears when ride status is ARRIVING with a code", async ({ page }) => {
    await mockRide(page, "ARRIVING", { verifyCode: "7341" });
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("text=Share this code with your driver")
    ).toBeVisible({ timeout: 10000 });
  });

  test("verify code card NOT shown when ride is IN_PROGRESS", async ({ page }) => {
    await mockRide(page, "IN_PROGRESS", { verifyCode: null });
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    // Wait for page to fully load by checking something that should be present
    await expect(page.locator("text=Carlos")).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator("text=Share this code with your driver")
    ).not.toBeVisible();
  });

  test("SOS button is visible during an active ride", async ({ page }) => {
    await mockRide(page, "IN_PROGRESS");
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("button").filter({ hasText: /sos/i })).toBeVisible({ timeout: 10000 });
  });

  test("SOS modal opens on SOS button click", async ({ page }) => {
    await mockRide(page, "IN_PROGRESS");
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    await page.locator("button").filter({ hasText: /sos/i }).click();
    await expect(page.locator("text=Emergency SOS")).toBeVisible({ timeout: 5000 });
  });

  test("Call 911 in SOS modal is an <a href='tel:911'> link — not a dead button", async ({ page }) => {
    await mockRide(page, "IN_PROGRESS");
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    await page.locator("button").filter({ hasText: /sos/i }).click();
    await expect(page.locator("text=Emergency SOS")).toBeVisible({ timeout: 5000 });

    const call911 = page.locator("a[href='tel:911']");
    await expect(call911).toBeVisible({ timeout: 3000 });
    await expect(call911).toContainText("911");
  });

  test("driver details (name and car color) are shown on active ride page", async ({ page }) => {
    await mockRide(page, "ARRIVING", { verifyCode: "5678" });
    await page.goto("/rider/ride/fake-ride");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Carlos")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Silver")).toBeVisible({ timeout: 5000 });
  });
});

// ── Driver Dashboard ──────────────────────────────────────────────────────────

test.describe("Driver Dashboard", () => {
  test.use({ storageState: DRIVER_STATE });

  test("driver dashboard loads with a heading", async ({ page }) => {
    await page.goto("/driver/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
  });

  test("driver online/offline toggle button is present", async ({ page }) => {
    await page.goto("/driver/dashboard");
    await page.waitForLoadState("networkidle");
    // Text is "Go Online" or "Go Offline" depending on current state
    const toggle = page.locator("button").filter({ hasText: /Go Online|Go Offline/i }).first();
    await expect(toggle).toBeVisible({ timeout: 8000 });
  });
});

// ── Public Trip Share Page (unauthenticated) ──────────────────────────────────

test.describe("Public Trip Share Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows 'Trip not found.' for an invalid token", async ({ page }) => {
    await page.goto("/trip/this-token-does-not-exist-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Trip not found.")).toBeVisible({ timeout: 10000 });
  });
});
