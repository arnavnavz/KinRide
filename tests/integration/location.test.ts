/**
 * Integration tests for POST /api/driver/location
 *
 * Verifies that route monitoring is triggered during IN_PROGRESS rides and
 * that the location is correctly persisted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    driverLocation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    rideRequest: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/routeMonitor", () => ({
  runRouteMonitor: vi.fn(() =>
    Promise.resolve({
      stoppedSince: null,
      lastDeviationAlertAt: null,
      lastStopAlertAt: null,
    })
  ),
}));

import { POST, GET } from "@/app/api/driver/location/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { runRouteMonitor } from "@/lib/routeMonitor";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/driver/location", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetReq(driverId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/driver/location?driverId=${driverId}`
  );
}

const driverSession = { user: { id: "driver-1", name: "Carlos", role: "DRIVER" } };
const riderSession  = { user: { id: "rider-1",  name: "Alice",  role: "RIDER"  } };

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/driver/location", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(makePostReq({ lat: 37.77, lng: -122.42 }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a rider (not driver)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    const res = await POST(makePostReq({ lat: 37.77, lng: -122.42 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when lat/lng are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    const res = await POST(makePostReq({ lat: "bad" }));
    expect(res.status).toBe(400);
  });

  it("upserts location and returns success", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    const res = await POST(makePostReq({ lat: 37.77, lng: -122.42, heading: 90, speed: 30 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(prisma.driverLocation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { driverId: "driver-1" },
        create: expect.objectContaining({ lat: 37.77, lng: -122.42 }),
        update: expect.objectContaining({ lat: 37.77, lng: -122.42 }),
      })
    );
  });

  it("does NOT run route monitoring when no active ride", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    await POST(makePostReq({ lat: 37.77, lng: -122.42 }));
    expect(runRouteMonitor).not.toHaveBeenCalled();
  });

  it("runs route monitoring when ride is IN_PROGRESS and coords are set", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce({
      lat: 37.76,
      lng: -122.41,
      stoppedSince: null,
      lastDeviationAlertAt: null,
      lastStopAlertAt: null,
    } as any);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce({
      id: "ride-1",
      riderId: "rider-1",
      pickupLat: 37.7749,
      pickupLng: -122.4194,
      dropoffLat: 37.8044,
      dropoffLng: -122.2712,
      routePolyline: null,
    } as any);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    await POST(makePostReq({ lat: 37.77, lng: -122.42, speed: 25 }));

    expect(runRouteMonitor).toHaveBeenCalledWith(
      expect.objectContaining({
        rideId: "ride-1",
        riderId: "rider-1",
        driverLat: 37.77,
        driverLng: -122.42,
        prevLat: 37.76,
        prevLng: -122.41,
        speed: 25,
        routePolyline: null,
      })
    );
  });

  it("skips route monitoring when ride is IN_PROGRESS but coords are null", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce({
      id: "ride-1",
      riderId: "rider-1",
      pickupLat: null,
      pickupLng: null,
      dropoffLat: null,
      dropoffLng: null,
      routePolyline: null,
    } as any);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    await POST(makePostReq({ lat: 37.77, lng: -122.42 }));
    expect(runRouteMonitor).not.toHaveBeenCalled();
  });

  it("passes routePolyline from DB to runRouteMonitor", async () => {
    const polyline = [[37.77, -122.42], [37.78, -122.43]];

    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce({
      lat: 37.76, lng: -122.41,
      stoppedSince: null, lastDeviationAlertAt: null, lastStopAlertAt: null,
    } as any);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce({
      id: "ride-1",
      riderId: "rider-1",
      pickupLat: 37.7749,
      pickupLng: -122.4194,
      dropoffLat: 37.8044,
      dropoffLng: -122.2712,
      routePolyline: polyline,
    } as any);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    await POST(makePostReq({ lat: 37.77, lng: -122.42 }));

    expect(runRouteMonitor).toHaveBeenCalledWith(
      expect.objectContaining({ routePolyline: polyline })
    );
  });

  it("resets stoppedSince when no active ride", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(driverSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce({
      lat: 37.77, lng: -122.42,
      stoppedSince: new Date(),
      lastDeviationAlertAt: null,
      lastStopAlertAt: null,
    } as any);
    vi.mocked(prisma.rideRequest.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.driverLocation.upsert).mockResolvedValueOnce({} as any);

    await POST(makePostReq({ lat: 37.77, lng: -122.42 }));

    expect(prisma.driverLocation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ stoppedSince: null }),
      })
    );
  });
});

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/driver/location", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(makeGetReq("driver-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when driverId is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    const res = await GET(new NextRequest("http://localhost/api/driver/location"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no location found", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce(null);
    const res = await GET(makeGetReq("driver-1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when location is stale (>1 hour old)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce({
      lat: 37.77,
      lng: -122.42,
      heading: null,
      speed: null,
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    } as any);
    const res = await GET(makeGetReq("driver-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("stale");
  });

  it("returns fresh location successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(riderSession);
    vi.mocked(prisma.driverLocation.findUnique).mockResolvedValueOnce({
      lat: 37.77,
      lng: -122.42,
      heading: 90,
      speed: 30,
      updatedAt: new Date(), // fresh
    } as any);
    const res = await GET(makeGetReq("driver-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lat).toBe(37.77);
    expect(body.lng).toBe(-122.42);
    expect(body.heading).toBe(90);
    expect(body.speed).toBe(30);
  });
});
