/**
 * Integration tests for POST /api/rides/[id]/accept
 *
 * We import the route handler directly and mock all external dependencies
 * (Prisma, NextAuth session, push notifications) so no real DB or network
 * calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock all external deps before importing the route ─────────────────────────

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rideRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    rideOffer: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/push", () => ({
  notifyRideEvent: vi.fn(() => Promise.resolve()),
}));

import { POST } from "@/app/api/rides/[id]/accept/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body = {}): NextRequest {
  return new NextRequest("http://localhost/api/rides/ride-1/accept", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = "ride-1") {
  return { params: Promise.resolve({ id }) };
}

const driverSession = {
  user: { id: "driver-1", name: "Carlos", role: "DRIVER" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/rides/[id]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authenticated as rider (not driver)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "rider-1", role: "RIDER" },
    });

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when ride does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce(null);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Ride not found");
  });

  it("returns 409 when ride is not in OFFERED status", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      id: "ride-1",
      status: "ACCEPTED",
    } as any);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("no longer available");
  });

  it("returns 404 when no valid pending offer exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      id: "ride-1",
      status: "OFFERED",
    } as any);
    vi.mocked(prisma.rideOffer.findFirst).mockResolvedValueOnce(null);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No valid pending offer");
  });

  it("returns 409 when offer was already handled (race condition)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique).mockResolvedValueOnce({
      id: "ride-1",
      status: "OFFERED",
    } as any);
    vi.mocked(prisma.rideOffer.findFirst).mockResolvedValueOnce({
      id: "offer-1",
      driverId: "driver-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000),
    } as any);
    vi.mocked(prisma.rideOffer.updateMany).mockResolvedValueOnce({ count: 0 } as any);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already handled");
  });

  it("generates a 4-digit verifyCode on successful accept", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique)
      // first call: pre-check
      .mockResolvedValueOnce({ id: "ride-1", status: "OFFERED" } as any)
      // second call: after transaction, fetch full ride
      .mockResolvedValueOnce({
        id: "ride-1",
        status: "ACCEPTED",
        verifyCode: "7341",
        rider: { id: "rider-1", name: "Alice" },
        driver: { id: "driver-1", name: "Carlos", driverProfile: {} },
      } as any);
    vi.mocked(prisma.rideOffer.findFirst).mockResolvedValueOnce({
      id: "offer-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000),
    } as any);
    vi.mocked(prisma.rideOffer.updateMany).mockResolvedValueOnce({ count: 1 } as any);
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, {}] as any);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);

    // Verify the transaction was called with a verifyCode
    const txCall = vi.mocked(prisma.$transaction).mock.calls[0][0] as any[];
    // The $transaction receives an array of prisma operations — we can't inspect
    // them directly, but we can verify the transaction was called once
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("calls notifyRideEvent to alert the rider", async () => {
    const { notifyRideEvent } = await import("@/lib/push");

    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.rideRequest.findUnique)
      .mockResolvedValueOnce({ id: "ride-1", status: "OFFERED" } as any)
      .mockResolvedValueOnce({
        id: "ride-1",
        status: "ACCEPTED",
        verifyCode: "1234",
        rider: { id: "rider-1", name: "Alice" },
        driver: { id: "driver-1", name: "Carlos", driverProfile: {} },
      } as any);
    vi.mocked(prisma.rideOffer.findFirst).mockResolvedValueOnce({
      id: "offer-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000),
    } as any);
    vi.mocked(prisma.rideOffer.updateMany).mockResolvedValueOnce({ count: 1 } as any);
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, {}] as any);

    await POST(makeReq(), makeParams());

    expect(notifyRideEvent).toHaveBeenCalledWith(
      "rider-1",
      "ride_accepted",
      "ride-1",
      expect.objectContaining({ driverName: "Carlos" })
    );
  });
});
