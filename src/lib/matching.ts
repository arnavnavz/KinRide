import { prisma } from "./prisma";
import { notifyRideEvent } from "./push";

const MAX_RADIUS_MILES = 10;
const MAX_DRIVERS_TO_OFFER = 5;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DriverWithDistance {
  id: string;
  distance: number;
}

async function findNearbyDrivers(
  pickupLat: number,
  pickupLng: number,
  excludeIds: string[] = []
): Promise<DriverWithDistance[]> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Get fresh driver locations
  const driverLocations = await prisma.driverLocation.findMany({
    where: {
      updatedAt: { gte: tenMinAgo },
      ...(excludeIds.length > 0 ? { driverId: { notIn: excludeIds } } : {}),
    },
    select: { driverId: true, lat: true, lng: true },
  });

  // Get online + verified driver IDs
  const onlineDrivers = await prisma.driverProfile.findMany({
    where: { isOnline: true, isVerified: true },
    select: { userId: true },
  });
  const onlineSet = new Set(onlineDrivers.map((d) => d.userId));

  // Calculate distances for online drivers with recent locations
  const driversWithDistance: DriverWithDistance[] = [];

  for (const loc of driverLocations) {
    if (!onlineSet.has(loc.driverId)) continue;
    if (excludeIds.includes(loc.driverId)) continue;

    const dist = haversineDistance(pickupLat, pickupLng, loc.lat, loc.lng);
    if (dist <= MAX_RADIUS_MILES) {
      driversWithDistance.push({ id: loc.driverId, distance: dist });
    }
  }

  // Sort by distance (closest first)
  driversWithDistance.sort((a, b) => a.distance - b.distance);

  return driversWithDistance.slice(0, MAX_DRIVERS_TO_OFFER);
}

async function fallbackDrivers(excludeIds: string[] = []): Promise<string[]> {
  const onlineDrivers = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      id: { notIn: excludeIds },
      driverProfile: { isOnline: true, isVerified: true },
    },
    take: MAX_DRIVERS_TO_OFFER,
    select: { id: true },
  });
  return onlineDrivers.map((d) => d.id);
}

export async function createOffersForRide(rideRequestId: string) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: { rider: { include: { favorites: true } } },
  });
  if (!ride || ride.status !== "REQUESTED") return;

  // 1. Specific driver requested — offer only to them
  if (ride.specificDriverId) {
    const driver = await prisma.user.findUnique({
      where: { id: ride.specificDriverId },
      include: { driverProfile: true },
    });
    if (driver?.driverProfile?.isOnline && driver.driverProfile.isVerified) {
      await prisma.rideOffer.create({
        data: {
          rideRequestId: ride.id,
          driverId: driver.id,
          expiresAt: new Date(Date.now() + 30_000),
        },
      });
      await prisma.rideRequest.update({
        where: { id: ride.id },
        data: { status: "OFFERED" },
      });
      notifyRideEvent(driver.id, "new_ride_offer", ride.id, {
        pickup: ride.pickupAddress,
      }).catch(() => {});
    }
    return;
  }

  // 2. Kin ride — try favorite drivers first
  let targetDriverIds: string[] = [];

  if (ride.preferKin && ride.rider.favorites.length > 0) {
    const favDriverIds = ride.rider.favorites.map((f) => f.driverId);
    const onlineFavs = await prisma.user.findMany({
      where: {
        id: { in: favDriverIds },
        driverProfile: { isOnline: true, isVerified: true },
      },
      select: { id: true },
    });
    targetDriverIds = onlineFavs.map((d) => d.id);

    // If we have pickup coords and Kin drivers, sort Kin drivers by proximity too
    if (targetDriverIds.length > 1 && ride.pickupLat && ride.pickupLng) {
      const kinLocations = await prisma.driverLocation.findMany({
        where: {
          driverId: { in: targetDriverIds },
          updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
        select: { driverId: true, lat: true, lng: true },
      });
      const locMap = new Map(kinLocations.map((l) => [l.driverId, l]));
      targetDriverIds.sort((a, b) => {
        const locA = locMap.get(a);
        const locB = locMap.get(b);
        const distA = locA
          ? haversineDistance(ride.pickupLat!, ride.pickupLng!, locA.lat, locA.lng)
          : Infinity;
        const distB = locB
          ? haversineDistance(ride.pickupLat!, ride.pickupLng!, locB.lat, locB.lng)
          : Infinity;
        return distA - distB;
      });
    }
  }

  // 3. Non-Kin ride or no Kin drivers available — find by proximity
  if (targetDriverIds.length === 0) {
    if (ride.pickupLat && ride.pickupLng) {
      const nearbyDrivers = await findNearbyDrivers(ride.pickupLat, ride.pickupLng);
      targetDriverIds = nearbyDrivers.map((d) => d.id);
      
      if (targetDriverIds.length === 0) {
        // No drivers within radius — fall back to any online driver
        targetDriverIds = await fallbackDrivers();
      }
    } else {
      // No coordinates available — fall back to any online driver
      targetDriverIds = await fallbackDrivers();
    }
  }

  if (targetDriverIds.length === 0) return;

  const offers = targetDriverIds.map((driverId) => ({
    rideRequestId: ride.id,
    driverId,
    expiresAt: new Date(Date.now() + 30_000),
  }));

  await prisma.rideOffer.createMany({ data: offers });

  for (const driverId of targetDriverIds) {
    notifyRideEvent(driverId, "new_ride_offer", ride.id, {
      pickup: ride.pickupAddress,
    }).catch(() => {});
  }

  await prisma.rideRequest.update({
    where: { id: ride.id },
    data: { status: "OFFERED" },
  });
}
