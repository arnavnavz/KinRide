import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runRouteMonitor } from "@/lib/routeMonitor";

const STALE_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lat, lng, heading, speed } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const driverId = session.user.id;

    // Read existing row so we can detect movement and carry monitoring state forward
    const existing = await prisma.driverLocation.findUnique({
      where: { driverId },
      select: {
        lat: true,
        lng: true,
        stoppedSince: true,
        lastDeviationAlertAt: true,
        lastStopAlertAt: true,
      },
    });

    // Look up any active IN_PROGRESS ride (with coords needed for deviation check)
    const activeRide = await prisma.rideRequest.findFirst({
      where: { driverId, status: "IN_PROGRESS" },
      select: {
        id: true,
        riderId: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        routePolyline: true,
      },
    });

    // Build the monitoring state we will persist after the checks
    let monitoringState: {
      stoppedSince: Date | null;
      lastDeviationAlertAt: Date | null;
      lastStopAlertAt: Date | null;
    } = {
      stoppedSince: existing?.stoppedSince ?? null,
      lastDeviationAlertAt: existing?.lastDeviationAlertAt ?? null,
      lastStopAlertAt: existing?.lastStopAlertAt ?? null,
    };

    if (
      activeRide &&
      activeRide.pickupLat != null &&
      activeRide.pickupLng != null &&
      activeRide.dropoffLat != null &&
      activeRide.dropoffLng != null
    ) {
      // Prisma returns JSON columns as unknown; cast to the shape we stored
      const polyline = Array.isArray(activeRide.routePolyline)
        ? (activeRide.routePolyline as [number, number][])
        : null;

      monitoringState = await runRouteMonitor({
        rideId: activeRide.id,
        riderId: activeRide.riderId,
        driverLat: lat,
        driverLng: lng,
        pickupLat: activeRide.pickupLat,
        pickupLng: activeRide.pickupLng,
        dropoffLat: activeRide.dropoffLat,
        dropoffLng: activeRide.dropoffLng,
        routePolyline: polyline,
        prevLat: existing?.lat ?? null,
        prevLng: existing?.lng ?? null,
        speed: speed ?? null,
        stoppedSince: existing?.stoppedSince ?? null,
        lastDeviationAlertAt: existing?.lastDeviationAlertAt ?? null,
        lastStopAlertAt: existing?.lastStopAlertAt ?? null,
      });
    } else if (!activeRide) {
      // No active ride — reset the stopped timer so it starts fresh next ride
      monitoringState.stoppedSince = null;
    }

    await prisma.driverLocation.upsert({
      where: { driverId },
      create: {
        driverId,
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
        ...monitoringState,
      },
      update: {
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
        ...monitoringState,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/driver/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = req.nextUrl.searchParams.get("driverId");
    if (!driverId) {
      return NextResponse.json({ error: "driverId required" }, { status: 400 });
    }

    const location = await prisma.driverLocation.findUnique({
      where: { driverId },
    });

    if (!location) {
      return NextResponse.json({ error: "No location found" }, { status: 404 });
    }

    // Discard stale locations older than 1 hour
    if (Date.now() - location.updatedAt.getTime() > STALE_MS) {
      return NextResponse.json({ error: "Location is stale" }, { status: 404 });
    }

    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      speed: location.speed,
      updatedAt: location.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/driver/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
