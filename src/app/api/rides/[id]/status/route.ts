import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rideStatusSchema } from "@/lib/validations";
import { RideStatus } from "@prisma/client";
import { computeCommission, computeLoyaltyCredits, getCurrentWeek } from "@/lib/pricing";
import { chargeRide } from "@/lib/charge-ride";

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["CANCELED"],
  OFFERED: ["CANCELED"],
  ACCEPTED: ["ARRIVING", "CANCELED"],
  ARRIVING: ["IN_PROGRESS", "CANCELED"],
  IN_PROGRESS: ["COMPLETED", "CANCELED"],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = rideStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id } });
    if (!ride) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isDriver = ride.driverId === session.user.id;
    const isRider = ride.riderId === session.user.id;

    if (parsed.data.status === "CANCELED") {
      if (!isDriver && !isRider) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!isDriver) {
      return NextResponse.json({ error: "Only driver can update status" }, { status: 403 });
    }

    const allowed = VALID_TRANSITIONS[ride.status];
    if (!allowed || !allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${ride.status} to ${parsed.data.status}` },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.status as RideStatus;

    if (newStatus === "CANCELED") {
      await prisma.rideOffer.updateMany({
        where: { rideRequestId: id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    }

    // On completion, compute commission and award loyalty credits
    let platformFee: number | undefined;
    if (newStatus === "COMPLETED" && ride.estimatedFare && ride.driverId) {
      const driverSub = await prisma.driverSubscription.findUnique({
        where: { driverId: ride.driverId },
      });
      const driverPlan = driverSub?.plan ?? "FREE";

      // Check if the rider has this driver as a favorite (Kin ride)
      const isKin = ride.isKinRide || !!(await prisma.favoriteDriver.findFirst({
        where: { riderId: ride.riderId, driverId: ride.driverId },
      }));

      const commission = computeCommission(ride.estimatedFare, isKin, driverPlan);
      platformFee = commission.fee;

      // Award loyalty credits to rider
      const currentWeek = getCurrentWeek();
      const loyalty = await prisma.riderLoyalty.upsert({
        where: { riderId: ride.riderId },
        create: { riderId: ride.riderId, credits: 0, lifetimeRides: 0, streakWeeks: 0 },
        update: {},
      });

      const isConsecutiveWeek = loyalty.lastRideWeek && loyalty.lastRideWeek !== currentWeek;
      const newStreak = loyalty.lastRideWeek === currentWeek
        ? loyalty.streakWeeks
        : isConsecutiveWeek
          ? loyalty.streakWeeks + 1
          : 1;

      const creditCalc = computeLoyaltyCredits(newStreak);

      await prisma.$transaction([
        prisma.riderLoyalty.update({
          where: { riderId: ride.riderId },
          data: {
            credits: { increment: creditCalc.total },
            lifetimeRides: { increment: 1 },
            streakWeeks: newStreak,
            lastRideWeek: currentWeek,
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            riderId: ride.riderId,
            amount: creditCalc.total,
            reason: "ride_completed",
            rideRequestId: id,
          },
        }),
      ]);
    }

    const updated = await prisma.rideRequest.update({
      where: { id },
      data: {
        status: newStatus,
        ...(platformFee !== undefined ? { platformFee } : {}),
      },
      include: {
        rider: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, driverProfile: true } },
      },
    });

    // Charge rider when ride is completed
    let paymentError: string | undefined;
    if (newStatus === "COMPLETED") {
      const chargeResult = await chargeRide(id);
      if (!chargeResult.success && chargeResult.error) {
        paymentError = chargeResult.error;
      }
    }

    return NextResponse.json({
      ...updated,
      ...(paymentError ? { paymentError } : {}),
    });
  } catch (err) {
    console.error("POST /api/rides/[id]/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
