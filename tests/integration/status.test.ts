/**
 * Integration tests for POST /api/rides/[id]/status
 *
 * Focuses on verify code validation (ARRIVING → IN_PROGRESS) and core
 * state-machine enforcement.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rideRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    rideOffer: { updateMany: vi.fn() },
    riderLoyalty: { upsert: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    favoriteDriver: { findFirst: vi.fn() },
    driverSubscription: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/push", () => ({ notifyRideEvent: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/charge-ride", () => ({ chargeRide: vi.fn(() => Promise.resolve({ success: true })) }));
vi.mock("@/lib/email", () => ({ sendRideReceipt: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/pricing", () => ({
  computeCommission: vi.fn(() => ({ rate: 0.15, fee: 15 })),
  computeLoyaltyCredits: vi.fn(() => ({ base: 10, streakBonus: 0, total: 10 })),
  getCurrentWeek: vi.fn(() => "2025-W08"),
}));
vi.mock("@/lib/routing", () => ({ fetchRoute: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@/lib/validations", () => ({
  rideStatusSchema: {
    safeParse: (body: any) => {
      const valid = ["ARRIVING", "IN_PROGRESS", "COMPLETED", "CANCELED"];
      if (body?.status && valid.includes(body.status)) {
        return { success: true, data: { status: body.status } };
      }
      return { success: false, error: { flatten: () => ({}) } };
    },
  },
}));

import { POST } from "@/app/api/rides/[id]/status/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/rides/ride-1/status", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = "ride-1") {
  return { params: Promise.resolve({ id }) };
}

const driverSession = { user: { id: "driver-1", name: "Carlos", role: "DRIVER" } };
const riderSession  = { user: { id: "rider-1",  name: "Alice",  role: "RIDER"  } };

function arrivingRide(extra = {}) {
  return {
    id: "ride-1",
    driverId: "driver-1",
    riderId: "rider-1",
    status: "ARRIVING",
    estimatedFare: 25,
    isKinRide: false,
    pickupAddress: "123 Main St",
    dropoffAddress: "456 Oak Ave",
    pickupLat: 37.7749,
    pickupLng: -122.4194,
    dropoffLat: 37.8044,
    dropoffLng: -122.2712,
    verifyCode: "7341",
    ...extra,
  };
}

// ── Auth / permissions ────────────────────────────────────────────────────────

describe("POST /api/rides/[id]/status — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(makeReq({ status: "ARRIVING" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    const res = await POST(makeReq({ status: "FLYING" }), makeParams());
    expect(res.status).toBe(400);
  });
});

// ── State machine ─────────────────────────────────────────────────────────────

describe("POST /api/rides/[id]/status — state machine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid transition (ACCEPTED → COMPLETED)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      ...arrivingRide({ status: "ACCEPTED" }),
    } as any);

    const res = await POST(makeReq({ status: "COMPLETED" }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Cannot transition");
  });

  it("allows ACCEPTED → ARRIVING", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      ...arrivingRide({ status: "ACCEPTED" }),
    } as any);
    vi.mocked(prisma.rideRequest.update).mockResolvedValueOnce({
      ...arrivingRide({ status: "ARRIVING" }),
      rider: { id: "rider-1", name: "Alice" },
      driver: { id: "driver-1", name: "Carlos", driverProfile: null },
    } as any);

    const res = await POST(makeReq({ status: "ARRIVING" }), makeParams());
    expect(res.status).toBe(200);
  });

  it("allows rider to cancel a ride", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      ...arrivingRide(),
    } as any);
    vi.mocked(prisma.rideOffer.updateMany).mockResolvedValueOnce({ count: 0 } as any);
    vi.mocked(prisma.rideRequest.update).mockResolvedValueOnce({
      ...arrivingRide({ status: "CANCELED" }),
      rider: { id: "rider-1", name: "Alice" },
      driver: { id: "driver-1", name: "Carlos", driverProfile: null },
    } as any);

    const res = await POST(makeReq({ status: "CANCELED" }), makeParams());
    expect(res.status).toBe(200);
  });
});

// ── Verify code validation ────────────────────────────────────────────────────

describe("POST /api/rides/[id]/status — verify code (ARRIVING → IN_PROGRESS)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when no verifyCode is submitted", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(arrivingRide() as any);

    const res = await POST(makeReq({ status: "IN_PROGRESS" }), makeParams());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Incorrect verification code");
  });

  it("returns 403 when wrong code is submitted", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(arrivingRide() as any);

    const res = await POST(makeReq({ status: "IN_PROGRESS", verifyCode: "0000" }), makeParams());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Incorrect verification code");
  });

  it("returns 403 when partial code is submitted", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(arrivingRide() as any);

    const res = await POST(makeReq({ status: "IN_PROGRESS", verifyCode: "734" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 403 when code has leading zeros stripped (numeric coercion)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    // Code starts with a zero
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(
      arrivingRide({ verifyCode: "0234" }) as any
    );

    // Submitting as a number would strip the leading zero → wrong
    const res = await POST(
      makeReq({ status: "IN_PROGRESS", verifyCode: "234" }),
      makeParams()
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 when correct code is submitted", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(arrivingRide() as any);
    vi.mocked(prisma.rideRequest.update).mockResolvedValueOnce({
      ...arrivingRide({ status: "IN_PROGRESS" }),
      rider: { id: "rider-1", name: "Alice" },
      driver: { id: "driver-1", name: "Carlos", driverProfile: null },
    } as any);

    const res = await POST(
      makeReq({ status: "IN_PROGRESS", verifyCode: "7341" }),
      makeParams()
    );
    expect(res.status).toBe(200);
  });

  it("does NOT require code for other transitions (ACCEPTED → ARRIVING)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(
      arrivingRide({ status: "ACCEPTED" }) as any
    );
    vi.mocked(prisma.rideRequest.update).mockResolvedValueOnce({
      ...arrivingRide({ status: "ARRIVING" }),
      rider: { id: "rider-1", name: "Alice" },
      driver: { id: "driver-1", name: "Carlos", driverProfile: null },
    } as any);

    // No verifyCode submitted — should still succeed for ARRIVING
    const res = await POST(makeReq({ status: "ARRIVING" }), makeParams());
    expect(res.status).toBe(200);
  });
});
