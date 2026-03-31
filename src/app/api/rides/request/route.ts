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

    const { pickupAddress, dropoffAddress, preferKin, specificDriverId, scheduledAt, riderNote, rideType, stops, promoCode } = parsed.data;
    const { riderLat, riderLng, dropoffLat, dropoffLng } = body;

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

    let promoDiscount: number | null = null;
    let loyaltyDiscount: number | null = null;
    let appliedPromoCode: string | null = null;
    let promoRecord: { id: string } | null = null;

    if (promoCode && fare && fare > 0) {
      const promo = await prisma.promoCode.findUnique({ where: { code: promoCode } });

      if (!promo) {
        return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
      }
      if (!promo.isActive) {
        return NextResponse.json({ error: "Promo code is no longer active" }, { status: 400 });
      }
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return NextResponse.json({ error: "Promo code has expired" }, { status: 400 });
      }
      if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
        return NextResponse.json({ error: "Promo code has reached its maximum uses" }, { status: 400 });
      }
      if (promo.minFare !== null && fare < promo.minFare) {
        return NextResponse.json({ error: `Minimum fare of $${promo.minFare.toFixed(2)} required for this promo` }, { status: 400 });
      }

      const alreadyUsed = await prisma.promoRedemption.findUnique({
        where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
      });
      if (alreadyUsed) {
        return NextResponse.json({ error: "You have already used this promo code" }, { status: 400 });
      }

      let discount = promo.discountType === "PERCENTAGE"
        ? fare * (promo.discountValue / 100)
        : promo.discountValue;
      discount = Math.min(discount, fare);
      discount = Math.round(discount * 100) / 100;

      promoDiscount = discount;
      appliedPromoCode = promo.code;
      promoRecord = promo;
      fare = Math.round((fare - discount) * 100) / 100;
    }

    // Apply loyalty credits if provided
    const loyaltyCredits = body.loyaltyCredits;
    if (loyaltyCredits && typeof loyaltyCredits === "number" && loyaltyCredits > 0) {
      const loyalty = await prisma.riderLoyalty.findUnique({
        where: { riderId: session.user.id },
      });
      if (loyalty && loyalty.credits >= loyaltyCredits) {
        const creditsDollars = Math.floor(loyaltyCredits) / 100;
        loyaltyDiscount = Math.min(creditsDollars, fare);
        fare = Math.round((fare - loyaltyDiscount) * 100) / 100;
        
        await prisma.$transaction([
          prisma.riderLoyalty.update({
            where: { riderId: session.user.id },
            data: { credits: { decrement: loyaltyCredits } },
          }),
          prisma.loyaltyTransaction.create({
            data: {
              riderId: session.user.id,
              amount: -loyaltyCredits,
              reason: "ride_discount",
            },
          }),
        ]);
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
        promoDiscount,
        promoCode: appliedPromoCode,
        isKinRide,
        riderNote: riderNote ?? null,
        rideType: rideType ?? "regular",
        stops: stops && stops.length > 0 ? stops : null,
        pickupLat: typeof riderLat === "number" ? riderLat : null,
        pickupLng: typeof riderLng === "number" ? riderLng : null,
        dropoffLat: typeof dropoffLat === "number" ? dropoffLat : null,
        dropoffLng: typeof dropoffLng === "number" ? dropoffLng : null,
      },
    });

    if (promoRecord && promoDiscount) {
      await prisma.$transaction([
        prisma.promoCode.update({
          where: { code: appliedPromoCode! },
          data: { usesCount: { increment: 1 } },
        }),
        prisma.promoRedemption.create({
          data: {
            promoCodeId: promoRecord.id,
            userId,
            rideRequestId: ride.id,
            discount: promoDiscount,
          },
        }),
      ]);
    }

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
