import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

const DEFAULT_ZONE_RADIUS = 5; // miles
const SURGE_CACHE_TTL = 120; // seconds

const SURGE_THRESHOLDS = [
  { ratio: 0.3, multiplier: 2.5 },
  { ratio: 0.5, multiplier: 2.0 },
  { ratio: 0.7, multiplier: 1.5 },
  { ratio: 0.85, multiplier: 1.25 },
  { ratio: 1.0, multiplier: 1.0 },
];

const MAX_SURGE = 3.0;
const MIN_SURGE = 1.0;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getSurgeMultiplier(lat: number, lng: number): Promise<{
  multiplier: number;
  activeRequests: number;
  availableDrivers: number;
  zone: string;
}> {
  const cacheKey = `surge:${lat.toFixed(2)}:${lng.toFixed(2)}`;

  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "object") {
        return cached as any;
      }
    } catch {}
  }

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const activeRequests = await prisma.rideRequest.count({
    where: {
      status: { in: ["REQUESTED", "OFFERED"] },
      createdAt: { gte: fifteenMinAgo },
    },
  });

  const onlineDrivers = await prisma.driverProfile.findMany({
    where: { isOnline: true, isVerified: true },
    select: { lastKnownLat: true, lastKnownLng: true },
  });

  const nearbyDrivers = onlineDrivers.filter((d) => {
    if (!d.lastKnownLat || !d.lastKnownLng) return false;
    return haversineDistance(lat, lng, d.lastKnownLat, d.lastKnownLng) <= DEFAULT_ZONE_RADIUS;
  });

  const availableDrivers = nearbyDrivers.length;

  let multiplier = MIN_SURGE;

  if (availableDrivers === 0 && activeRequests > 0) {
    multiplier = MAX_SURGE;
  } else if (availableDrivers > 0) {
    const ratio = availableDrivers / Math.max(activeRequests, 1);

    for (const threshold of SURGE_THRESHOLDS) {
      if (ratio <= threshold.ratio) {
        multiplier = threshold.multiplier;
        break;
      }
    }
  }

  multiplier = Math.min(multiplier, MAX_SURGE);
  multiplier = Math.max(multiplier, MIN_SURGE);
  multiplier = Math.round(multiplier * 4) / 4;

  const result = {
    multiplier,
    activeRequests,
    availableDrivers,
    zone: `${lat.toFixed(2)},${lng.toFixed(2)}`,
  };

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), { ex: SURGE_CACHE_TTL });
    } catch {}
  }

  return result;
}

export function applySurge(baseFare: number, multiplier: number): number {
  return Math.round(baseFare * multiplier * 100) / 100;
}

export function getSurgeLabel(multiplier: number): string {
  if (multiplier <= 1.0) return "";
  if (multiplier <= 1.25) return "Slightly busy";
  if (multiplier <= 1.5) return "Busy";
  if (multiplier <= 2.0) return "Very busy";
  return "Extremely busy";
}

export function formatSurgeLabel(multiplier: number): string {
  return multiplier > 1 ? `${multiplier.toFixed(1)}x` : '';
}
