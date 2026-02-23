import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rideRequestSchema } from "@/lib/validations";
import { createOffersForRide } from "@/lib/matching";
import { estimateFare } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = rideRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { pickupAddress, dropoffAddress, preferKin, specificDriverId, scheduledAt, riderNote, rideType } = parsed.data;

    const fare = await estimateFare(pickupAddress, dropoffAddress);

    // Determine if this is a Kin ride (requesting specific driver or preferring Kin)
    let isKinRide = false;
    if (specificDriverId) {
      const isFav = await prisma.favoriteDriver.findFirst({
        where: { riderId: session.user.id, driverId: specificDriverId },
      });
      isKinRide = !!isFav;
    }

    const ride = await prisma.rideRequest.create({
      data: {
        riderId: session.user.id,
        pickupAddress,
        dropoffAddress,
        preferKin: preferKin ?? false,
        specificDriverId: specificDriverId ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        estimatedFare: fare,
        isKinRide,
        riderNote: riderNote ?? null,
        rideType: rideType ?? "regular",
      },
    });

    if (!scheduledAt) {
      createOffersForRide(ride.id).catch(console.error);
    }

    return NextResponse.json(ride, { status: 201 });
  } catch (err) {
    console.error("POST /api/rides/request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rides = await prisma.rideRequest.findMany({
      where: { riderId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        driver: { select: { id: true, name: true, driverProfile: true } },
      },
    });

    return NextResponse.json(rides);
  } catch (err) {
    console.error("GET /api/rides/request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
