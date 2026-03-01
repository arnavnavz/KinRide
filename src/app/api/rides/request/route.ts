import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rideRequestSchema } from "@/lib/validations";
import { createOffersForRide } from "@/lib/matching";
import { estimateFare } from "@/lib/pricing";
import { getSurgeMultiplier, applySurge } from "@/lib/surge";

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.rideRequest);
  if (limited) return limited;

  try {
    let userId: string;
    
    // Support API key auth for native app (Siri extension)
    const apiKey = req.headers.get("x-api-key");
    const apiUserId = req.headers.get("x-user-id");
    
    if (apiKey && apiUserId && process.env.KAYU_API_KEY && apiKey === process.env.KAYU_API_KEY) {
      const user = await prisma.user.findUnique({ where: { id: apiUserId } });
      if (!user || user.role !== "RIDER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== "RIDER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
    }

    const body = await req.json();
    const parsed = rideRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { pickupAddress, dropoffAddress, preferKin, specificDriverId, scheduledAt, riderNote, rideType } = parsed.data;
    const { riderLat, riderLng } = body;

    const nearLocation = (typeof riderLat === "number" && typeof riderLng === "number") ? { lat: riderLat, lng: riderLng } : undefined;
    let fare = await estimateFare(pickupAddress, dropoffAddress, nearLocation);

    let surgeMultiplier = 1.0;
    if (fare && typeof riderLat === "number" && typeof riderLng === "number") {
      const surge = await getSurgeMultiplier(riderLat, riderLng);
      surgeMultiplier = surge.multiplier;
      if (surgeMultiplier > 1) {
        fare = applySurge(fare, surgeMultiplier);
      }
    }

    // Determine if this is a Kin ride (requesting specific driver or preferring Kin)
    let isKinRide = false;
    if (specificDriverId) {
      const isFav = await prisma.favoriteDriver.findFirst({
        where: { riderId: userId, driverId: specificDriverId },
      });
      isKinRide = !!isFav;
    }

    const ride = await prisma.rideRequest.create({
      data: {
        riderId: userId,
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

    return NextResponse.json({ ...ride, surgeMultiplier }, { status: 201 });
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
