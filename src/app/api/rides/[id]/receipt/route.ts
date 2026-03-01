import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ride = await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        rider: { select: { name: true, email: true } },
        driver: {
          select: {
            name: true,
            driverProfile: {
              select: { vehicleMake: true, vehicleModel: true, vehicleColor: true, licensePlate: true },
            },
          },
        },
        payment: true,
        ratings: { where: { riderId: session.user.id }, select: { stars: true } },
        tips: { where: { riderId: session.user.id }, select: { amount: true } },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    if (ride.riderId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: ride.id,
      date: ride.createdAt,
      status: ride.status,
      pickup: ride.pickupAddress,
      dropoff: ride.dropoffAddress,
      fare: ride.estimatedFare,
      platformFee: ride.platformFee,
      isKinRide: ride.isKinRide,
      rideType: ride.rideType,
      rider: ride.rider,
      driver: ride.driver,
      payment: ride.payment ? {
        total: ride.payment.amountTotal,
        walletUsed: ride.payment.walletAmountUsed,
        cardCharged: ride.payment.cardAmountCharged,
        status: ride.payment.status,
      } : null,
      rating: ride.ratings[0]?.stars ?? null,
      tip: ride.tips[0]?.amount ?? null,
    });
  } catch (err) {
    console.error("Receipt error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
