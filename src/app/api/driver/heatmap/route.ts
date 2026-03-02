import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try Redis cache first
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get("heatmap:data");
        if (cached) {
          return NextResponse.json(typeof cached === "string" ? JSON.parse(cached) : cached);
        }
      } catch (e) {
        console.error("Redis get error:", e);
      }
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Get recent ride requests with location data
    const recentRequests = await prisma.rideRequest.findMany({
      where: {
        createdAt: { gte: twoHoursAgo },
        status: { in: ["REQUESTED", "OFFERED", "ACCEPTED", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        pickupAddress: true,
        createdAt: true,
        status: true,
      },
    });

    // Get online drivers with locations
    const onlineDrivers = await prisma.driverProfile.findMany({
      where: { isOnline: true },
      select: {
        lastKnownLat: true,
        lastKnownLng: true,
      },
    });

    // Get driver locations for more precise data
    const driverLocations = await prisma.driverLocation.findMany({
      where: {
        updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      select: {
        lat: true,
        lng: true,
      },
    });

    // Geocode-based zones: use driver locations and ride request patterns
    const zoneMap = new Map<string, { lat: number; lng: number; requests: number; drivers: number }>();
    const GRID_SIZE = 0.01; // ~1.1km

    // Add driver supply zones
    const allDriverLocs = [
      ...driverLocations.map(d => ({ lat: d.lat, lng: d.lng })),
      ...onlineDrivers
        .filter(d => d.lastKnownLat && d.lastKnownLng)
        .map(d => ({ lat: d.lastKnownLat!, lng: d.lastKnownLng! })),
    ];

    // Deduplicate driver locations (same driver may appear in both)
    const seenDriverZones = new Set<string>();
    for (const loc of allDriverLocs) {
      const zoneKey = `${(Math.round(loc.lat / GRID_SIZE) * GRID_SIZE).toFixed(4)},${(Math.round(loc.lng / GRID_SIZE) * GRID_SIZE).toFixed(4)}`;
      if (seenDriverZones.has(`${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`)) continue;
      seenDriverZones.add(`${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`);

      if (!zoneMap.has(zoneKey)) {
        zoneMap.set(zoneKey, {
          lat: Math.round(loc.lat / GRID_SIZE) * GRID_SIZE,
          lng: Math.round(loc.lng / GRID_SIZE) * GRID_SIZE,
          requests: 0,
          drivers: 0,
        });
      }
      zoneMap.get(zoneKey)!.drivers++;
    }

    // Build hot zones based on request volume
    const totalRequests = recentRequests.length;
    const totalDrivers = seenDriverZones.size;

    const zones = Array.from(zoneMap.values()).map(zone => {
      const ratio = zone.drivers > 0
        ? Math.max(0, 1 - (zone.drivers / Math.max(totalRequests / Math.max(zoneMap.size, 1), 1)))
        : 0.5;
      return {
        lat: zone.lat,
        lng: zone.lng,
        intensity: Math.min(1, Math.max(0, ratio)),
        requestCount: Math.round(totalRequests / Math.max(zoneMap.size, 1)),
        driverCount: zone.drivers,
      };
    });

    // If we have requests but no driver zones, create a default zone
    if (zones.length === 0 && totalRequests > 0) {
      zones.push({
        lat: 42.36,
        lng: -71.06,
        intensity: 0.8,
        requestCount: totalRequests,
        driverCount: 0,
      });
    }

    const responseData = {
      zones,
      stats: {
        totalRequests,
        totalDrivers,
        surgeActive: totalRequests > totalDrivers * 2,
        updatedAt: new Date().toISOString(),
      },
    };

    // Cache the result in Redis with 30-second TTL
    if (redis) {
      try {
        await redis.set("heatmap:data", JSON.stringify(responseData), { ex: 30 });
      } catch (e) {
        console.error("Redis set error:", e);
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json({ error: "Failed to load heatmap data" }, { status: 500 });
  }
}
