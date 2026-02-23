import { prisma } from "./prisma";

export async function createOffersForRide(rideRequestId: string) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: { rider: { include: { favorites: true } } },
  });
  if (!ride || ride.status !== "REQUESTED") return;

  // If a specific driver was requested, only offer to them
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
    }
    return;
  }

  // If preferKin, try favorite drivers first
  let targetDriverIds: string[] = [];

  if (ride.preferKin && ride.rider.favorites.length > 0) {
    const favDriverIds = ride.rider.favorites.map((f) => f.driverId);
    const onlineFavs = await prisma.user.findMany({
      where: {
        id: { in: favDriverIds },
        driverProfile: { isOnline: true, isVerified: true },
      },
    });
    targetDriverIds = onlineFavs.map((d) => d.id);
  }

  // If no kin drivers available, get any online verified driver
  if (targetDriverIds.length === 0) {
    const onlineDrivers = await prisma.user.findMany({
      where: {
        role: "DRIVER",
        driverProfile: { isOnline: true, isVerified: true },
      },
      take: 5,
    });
    targetDriverIds = onlineDrivers.map((d) => d.id);
  }

  if (targetDriverIds.length === 0) return;

  const offers = targetDriverIds.map((driverId) => ({
    rideRequestId: ride.id,
    driverId,
    expiresAt: new Date(Date.now() + 30_000),
  }));

  await prisma.rideOffer.createMany({ data: offers });
  await prisma.rideRequest.update({
    where: { id: ride.id },
    data: { status: "OFFERED" },
  });
}
