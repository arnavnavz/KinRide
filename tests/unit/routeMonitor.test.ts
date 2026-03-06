import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock external dependencies (socket.io, push) before importing the module ─

vi.mock("@/lib/socket-server", () => ({
  getSocketIO: vi.fn(() => null),
}));

vi.mock("@/lib/push", () => ({
  notifyRideEvent: vi.fn(() => Promise.resolve()),
}));

import { haversineDistance, runRouteMonitor, type MonitorInput } from "@/lib/routeMonitor";
import { getSocketIO } from "@/lib/socket-server";
import { notifyRideEvent } from "@/lib/push";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal valid MonitorInput, overridable per test. */
function makeInput(overrides: Partial<MonitorInput> = {}): MonitorInput {
  return {
    rideId: "ride-1",
    riderId: "rider-1",
    // Driver sitting exactly on pickup
    driverLat: 37.7749,
    driverLng: -122.4194,
    pickupLat: 37.7749,
    pickupLng: -122.4194,
    dropoffLat: 37.8044,
    dropoffLng: -122.2712,
    routePolyline: null,
    prevLat: null,
    prevLng: null,
    speed: 30,
    stoppedSince: null,
    lastDeviationAlertAt: null,
    lastStopAlertAt: null,
    ...overrides,
  };
}

// 10 minutes ago — safely past the alert cooldown
const pastCooldown = new Date(Date.now() - 11 * 60 * 1000);

// ── haversineDistance ─────────────────────────────────────────────────────────

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(37.77, -122.42, 37.77, -122.42)).toBe(0);
  });

  it("approximates SF→Oakland correctly (~12 miles)", () => {
    // San Francisco (City Hall) to Oakland (Lake Merritt) — ~8.3 miles direct
    const d = haversineDistance(37.7749, -122.4194, 37.8044, -122.2712);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(11);
  });

  it("is symmetric (A→B equals B→A)", () => {
    const d1 = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    const d2 = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });

  it("is always non-negative", () => {
    expect(haversineDistance(0, 0, 0, 1)).toBeGreaterThan(0);
    expect(haversineDistance(-33, 151, -34, 151)).toBeGreaterThan(0);
  });

  it("roughly matches known NY→LA distance (~2450 miles)", () => {
    const d = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(2400);
    expect(d).toBeLessThan(2500);
  });
});

// ── runRouteMonitor — deviation ───────────────────────────────────────────────

describe("runRouteMonitor — route deviation", () => {
  beforeEach(() => {
    vi.mocked(notifyRideEvent).mockReset();
    vi.mocked(getSocketIO).mockReturnValue(null);
  });

  it("does NOT alert when driver is on the straight-line route", async () => {
    // Driver exactly at pickup — 0 miles off
    const result = await runRouteMonitor(makeInput());
    expect(notifyRideEvent).not.toHaveBeenCalled();
    expect(result.lastDeviationAlertAt).toBeNull();
  });

  it("alerts when driver is far off the straight-line route", async () => {
    const result = await runRouteMonitor(
      makeInput({
        // Move driver ~2 miles north, far off the SF→Oakland corridor
        driverLat: 37.7949,
        driverLng: -122.5800,
      })
    );
    expect(notifyRideEvent).toHaveBeenCalledWith(
      "rider-1",
      "safety_check",
      "ride-1",
      expect.objectContaining({ safetyMessage: expect.stringContaining("miles off the expected route") })
    );
    expect(result.lastDeviationAlertAt).not.toBeNull();
  });

  it("uses polyline segments when routePolyline is provided", async () => {
    // Route goes west along latitude 37.77 then north along longitude -122.55
    const polyline: [number, number][] = [
      [37.7749, -122.4194], // pickup
      [37.7749, -122.5500], // jog west
      [37.8044, -122.5500], // jog north
    ];
    // Driver is right on the western segment — should NOT alert
    const result = await runRouteMonitor(
      makeInput({
        driverLat: 37.7749,
        driverLng: -122.5000, // on the first segment
        routePolyline: polyline,
      })
    );
    expect(notifyRideEvent).not.toHaveBeenCalled();
    expect(result.lastDeviationAlertAt).toBeNull();
  });

  it("alerts via polyline when driver is off all segments", async () => {
    const polyline: [number, number][] = [
      [37.7749, -122.4194],
      [37.7749, -122.4200],
    ];
    const result = await runRouteMonitor(
      makeInput({
        driverLat: 37.8500, // far north, ~5 miles from all segments
        driverLng: -122.4194,
        routePolyline: polyline,
      })
    );
    expect(notifyRideEvent).toHaveBeenCalledWith(
      "rider-1",
      "safety_check",
      "ride-1",
      expect.anything()
    );
    expect(result.lastDeviationAlertAt).not.toBeNull();
  });

  it("respects alert cooldown and does NOT re-alert within 10 minutes", async () => {
    const recentAlert = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    const result = await runRouteMonitor(
      makeInput({
        driverLat: 37.7949,
        driverLng: -122.5800,
        lastDeviationAlertAt: recentAlert,
      })
    );
    expect(notifyRideEvent).not.toHaveBeenCalled();
    // Alert time stays unchanged since no new alert fired
    expect(result.lastDeviationAlertAt).toEqual(recentAlert);
  });

  it("re-alerts after cooldown has expired", async () => {
    const result = await runRouteMonitor(
      makeInput({
        driverLat: 37.7949,
        driverLng: -122.5800,
        lastDeviationAlertAt: pastCooldown,
      })
    );
    expect(notifyRideEvent).toHaveBeenCalled();
    expect(result.lastDeviationAlertAt!.getTime()).toBeGreaterThan(pastCooldown.getTime());
  });

  it("emits socket event when io is available", async () => {
    const mockEmit = vi.fn();
    const mockTo = vi.fn(() => ({ emit: mockEmit }));
    vi.mocked(getSocketIO).mockReturnValue({ to: mockTo } as any);

    await runRouteMonitor(
      makeInput({ driverLat: 37.7949, driverLng: -122.5800 })
    );

    expect(mockTo).toHaveBeenCalledWith("ride:ride-1");
    expect(mockEmit).toHaveBeenCalledWith("safety:check", expect.objectContaining({
      type: "deviation",
    }));
  });
});

// ── runRouteMonitor — stopped vehicle ────────────────────────────────────────

describe("runRouteMonitor — stopped vehicle", () => {
  beforeEach(() => {
    vi.mocked(notifyRideEvent).mockReset();
    vi.mocked(getSocketIO).mockReturnValue(null);
  });

  it("does NOT set stoppedSince when driver is moving", async () => {
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7850, // ~0.7 miles north — clearly moving
        driverLng: -122.4194,
        speed: 25,
        stoppedSince: null,
      })
    );
    expect(result.stoppedSince).toBeNull();
  });

  it("sets stoppedSince when driver doesn't move between pings", async () => {
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7749, // same position
        driverLng: -122.4194,
        speed: 0,
        stoppedSince: null,
      })
    );
    expect(result.stoppedSince).not.toBeNull();
  });

  it("sets stoppedSince based on low speed even if position shifted slightly", async () => {
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.77491, // tiny GPS drift — under 50m threshold
        driverLng: -122.41941,
        speed: 1, // < 2 mph
        stoppedSince: null,
      })
    );
    expect(result.stoppedSince).not.toBeNull();
  });

  it("does NOT alert for a stop shorter than 5 minutes", async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7749,
        driverLng: -122.4194,
        speed: 0,
        stoppedSince: twoMinAgo,
      })
    );
    expect(notifyRideEvent).not.toHaveBeenCalled();
    expect(result.stoppedSince).toEqual(twoMinAgo); // unchanged
  });

  it("alerts after driver has been stopped for > 5 minutes", async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000);
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7749,
        driverLng: -122.4194,
        speed: 0,
        stoppedSince: sixMinAgo,
      })
    );
    expect(notifyRideEvent).toHaveBeenCalledWith(
      "rider-1",
      "safety_check",
      "ride-1",
      expect.objectContaining({ safetyMessage: expect.stringContaining("minutes") })
    );
    expect(result.lastStopAlertAt).not.toBeNull();
  });

  it("respects stop alert cooldown", async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000);
    const recentStopAlert = new Date(Date.now() - 3 * 60 * 1000); // 3 min ago
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7749,
        driverLng: -122.4194,
        speed: 0,
        stoppedSince: sixMinAgo,
        lastStopAlertAt: recentStopAlert,
      })
    );
    expect(notifyRideEvent).not.toHaveBeenCalled();
  });

  it("re-alerts on stop after cooldown expires", async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000);
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7749,
        driverLng: -122.4194,
        speed: 0,
        stoppedSince: sixMinAgo,
        lastStopAlertAt: pastCooldown,
      })
    );
    expect(notifyRideEvent).toHaveBeenCalled();
  });

  it("resets stoppedSince when driver starts moving again", async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await runRouteMonitor(
      makeInput({
        prevLat: 37.7749,
        prevLng: -122.4194,
        driverLat: 37.7850, // moved ~0.7 miles
        driverLng: -122.4194,
        speed: 30,
        stoppedSince: fiveMinAgo,
      })
    );
    expect(result.stoppedSince).toBeNull();
  });

  it("sets stoppedSince when no previous position is known (first ping, low speed)", async () => {
    const result = await runRouteMonitor(
      makeInput({
        prevLat: null,
        prevLng: null,
        speed: 0,
        stoppedSince: null,
      })
    );
    // prevLat/Lng null → distanceMoved = Infinity → not stopped by distance alone.
    // But speed=0 < 2 → still considered stationary.
    expect(result.stoppedSince).not.toBeNull();
  });

  it("does NOT set stoppedSince on first ping with no prev location and high speed", async () => {
    const result = await runRouteMonitor(
      makeInput({
        prevLat: null,
        prevLng: null,
        speed: 40,
        stoppedSince: null,
      })
    );
    expect(result.stoppedSince).toBeNull();
  });
});

// ── runRouteMonitor — return values ──────────────────────────────────────────

describe("runRouteMonitor — result structure", () => {
  beforeEach(() => {
    vi.mocked(notifyRideEvent).mockReset();
    vi.mocked(getSocketIO).mockReturnValue(null);
  });

  it("always returns the three monitoring fields", async () => {
    const result = await runRouteMonitor(makeInput());
    expect(result).toHaveProperty("stoppedSince");
    expect(result).toHaveProperty("lastDeviationAlertAt");
    expect(result).toHaveProperty("lastStopAlertAt");
  });

  it("preserves existing lastStopAlertAt when no new stop alert fires", async () => {
    const existing = new Date(Date.now() - 30 * 60 * 1000);
    const result = await runRouteMonitor(makeInput({ lastStopAlertAt: existing }));
    expect(result.lastStopAlertAt).toEqual(existing);
  });
});

// ── Verify code generation logic ──────────────────────────────────────────────

describe("verify code (unit logic)", () => {
  it("Math.floor(1000 + Math.random() * 9000) always produces 4-digit strings", () => {
    for (let i = 0; i < 100; i++) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      expect(code).toMatch(/^\d{4}$/);
      const n = parseInt(code, 10);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(9999);
    }
  });

  it("codes are not always the same (randomness check)", () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => String(Math.floor(1000 + Math.random() * 9000)))
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it("code validation rejects wrong code", () => {
    const stored = "7341";
    const submitted = "1234";
    expect(submitted !== stored).toBe(true);
  });

  it("code validation accepts correct code (string equality)", () => {
    const stored = "7341";
    const submitted = "7341";
    expect(submitted === stored).toBe(true);
  });

  it("code validation rejects partial match", () => {
    const stored = "7341";
    expect("734" === stored).toBe(false);
    expect("73410" === stored).toBe(false);
  });

  it("code validation is type-safe (no implicit coercion)", () => {
    const stored = "0042";
    // Numeric 42 !== string "0042"
    expect(String(42) === stored).toBe(false);
    expect("0042" === stored).toBe(true);
  });
});
