/**
 * Ride request and history E2E tests.
 * Uses the saved rider session (alice@kayu.com).
 */
import { test, expect } from "@playwright/test";
import { RIDER_STATE } from "./helpers";

test.use({ storageState: RIDER_STATE });

test.describe("Ride Request Flow", () => {
  test("rider can reach the request ride page", async ({ page }) => {
    await page.goto("/rider/request");
    await page.waitForLoadState("networkidle");

    // The pickup AddressInput renders as <input role="combobox" placeholder="Pickup location">
    // Try multiple selector strategies to be resilient
    const pickupInput = page.locator(
      "input[placeholder='Pickup location'], [role='combobox'][placeholder='Pickup location']"
    ).first();
    await expect(pickupInput).toBeVisible({ timeout: 10000 });
  });

  test("request page shows the where-to heading", async ({ page }) => {
    await page.goto("/rider/request");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 8000 });
  });

  test("ride history page loads", async ({ page }) => {
    await page.goto("/rider/history");
    await page.waitForLoadState("networkidle");
    // Either shows history cards, or an empty state "No rides found"
    const noRides = await page.locator("text=No rides found").isVisible({ timeout: 8000 }).catch(() => false);
    const hasHeading = await page.locator("h1, h2").first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(noRides || hasHeading).toBe(true);
  });

  test("non-existent ride page shows 'Ride not found'", async ({ page }) => {
    await page.goto("/rider/ride/nonexistent-id-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Ride not found.")).toBeVisible({ timeout: 10000 });
  });
});
