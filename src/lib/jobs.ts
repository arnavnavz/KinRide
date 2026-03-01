import { prisma } from "./prisma";
import { createOffersForRide } from "./matching";

/**
 * Expire ride offers that have passed their expiresAt time.
 * If all offers for a ride have expired/declined, re-create offers or cancel.
 */
export async function expireStaleOffers(): Promise<{ expired: number; reoffered: number }> {
  const now = new Date();

  const staleOffers = await prisma.rideOffer.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, rideRequestId: true },
  });

  if (staleOffers.length === 0) return { expired: 0, reoffered: 0 };

  await prisma.rideOffer.updateMany({
    where: {
      id: { in: staleOffers.map((o) => o.id) },
    },
    data: { status: "EXPIRED" },
  });

  // Check each affected ride to see if it needs re-offering
  const rideIds = [...new Set(staleOffers.map((o) => o.rideRequestId))];
  let reoffered = 0;

  for (const rideId of rideIds) {
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      select: { id: true, status: true, createdAt: true },
    });

    if (!ride || ride.status !== "OFFERED") continue;

    const activeOffers = await prisma.rideOffer.count({
      where: {
        rideRequestId: rideId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });

    if (activeOffers > 0) continue;

    // If ride is older than 10 minutes with no takers, cancel it
    const ageMs = Date.now() - ride.createdAt.getTime();
    if (ageMs > 10 * 60 * 1000) {
      await prisma.rideRequest.update({
        where: { id: rideId },
        data: { status: "CANCELED" },
      });
      continue;
    }

    // Re-offer to new drivers
    try {
      await prisma.rideRequest.update({
        where: { id: rideId },
        data: { status: "REQUESTED" },
      });
      await createOffersForRide(rideId);
      reoffered++;
    } catch (err) {
      console.error(`[jobs] Failed to re-offer ride ${rideId}:`, err);
    }
  }

  return { expired: staleOffers.length, reoffered };
}

/**
 * Trigger matching for scheduled rides whose scheduledAt time has arrived.
 */
export async function triggerScheduledRides(): Promise<{ triggered: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer

  const scheduledRides = await prisma.rideRequest.findMany({
    where: {
      status: "REQUESTED",
      scheduledAt: {
        gte: windowStart,
        lte: now,
      },
    },
    select: { id: true },
  });

  let triggered = 0;

  for (const ride of scheduledRides) {
    try {
      await createOffersForRide(ride.id);
      triggered++;
    } catch (err) {
      console.error(`[jobs] Failed to trigger scheduled ride ${ride.id}:`, err);
    }
  }

  return { triggered };
}

/**
 * Clean up stale driver locations (older than 1 hour).
 */
export async function cleanupStaleLocations(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const result = await prisma.driverLocation.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });
  return { deleted: result.count };
}

/**
 * Auto-expire unverified documents older than 30 days.
 */
export async function cleanupOldDocuments(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.driverDocument.deleteMany({
    where: {
      status: "rejected",
      updatedAt: { lt: cutoff },
    },
  });
  return { deleted: result.count };
}

/**
 * Clean up old read notifications (older than 30 days).
 */
export async function cleanupOldNotifications(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 1000);
  const result = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: cutoff },
    },
  });
  return { deleted: result.count };
}

export interface JobDefinition {
  name: string;
  fn: () => Promise<Record<string, number>>;
  intervalMs: number;
}

export const JOB_DEFINITIONS: JobDefinition[] = [
  {
    name: "expire-offers",
    fn: expireStaleOffers,
    intervalMs: 15_000, // every 15 seconds
  },
  {
    name: "scheduled-rides",
    fn: triggerScheduledRides,
    intervalMs: 30_000, // every 30 seconds
  },
  {
    name: "cleanup-locations",
    fn: cleanupStaleLocations,
    intervalMs: 5 * 60_000, // every 5 minutes
  },
  {
    name: "cleanup-documents",
    fn: cleanupOldDocuments,
    intervalMs: 60 * 60_000, // every hour
  },
  {
    name: "cleanup-notifications",
    fn: cleanupOldNotifications,
    intervalMs: 60 * 60_000, // every hour
  },
];

const jobTimers: NodeJS.Timeout[] = [];

export function startBackgroundJobs() {
  console.log(`[jobs] Starting ${JOB_DEFINITIONS.length} background jobs`);

  for (const job of JOB_DEFINITIONS) {
    const run = async () => {
      try {
        const result = await job.fn();
        const hasActivity = Object.values(result).some((v) => v > 0);
        if (hasActivity) {
          console.log(`[jobs] ${job.name}:`, result);
        }
      } catch (err) {
        console.error(`[jobs] ${job.name} failed:`, err);
      }
    };

    // Run once on startup (with a small delay to let DB connect)
    setTimeout(run, 5000);
    const timer = setInterval(run, job.intervalMs);
    jobTimers.push(timer);
  }
}

export function stopBackgroundJobs() {
  for (const timer of jobTimers) {
    clearInterval(timer);
  }
  jobTimers.length = 0;
  console.log("[jobs] All background jobs stopped");
}
