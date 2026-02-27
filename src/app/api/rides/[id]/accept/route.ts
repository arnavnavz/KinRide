import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyRideEvent } from "@/lib/push";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pre-check: ride must be in OFFERED status
    const ride = await prisma.rideRequest.findUnique({ where: { id } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.status !== "OFFERED") {
      return NextResponse.json(
        { error: "Ride is no longer available" },
        { status: 409 }
      );
    }

    // Pre-check: offer must be PENDING and not expired
    const offer = await prisma.rideOffer.findFirst({
      where: {
        rideRequestId: id,
        driverId: session.user.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (!offer) {
      return NextResponse.json(
        { error: "No valid pending offer found (may have expired)" },
        { status: 404 }
      );
    }

    // Atomically accept: use conditional update to prevent double-accept
    const accepted = await prisma.rideOffer.updateMany({
      where: { id: offer.id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    if (accepted.count === 0) {
      return NextResponse.json(
        { error: "Offer was already handled" },
        { status: 409 }
      );
    }

    // Expire remaining offers and assign driver
    await prisma.$transaction([
      prisma.rideOffer.updateMany({
        where: {
          rideRequestId: id,
          id: { not: offer.id },
          status: "PENDING",
        },
        data: { status: "EXPIRED" },
      }),
      prisma.rideRequest.update({
        where: { id },
        data: { status: "ACCEPTED", driverId: session.user.id },
      }),
    ]);

    const updatedRide = await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        rider: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, driverProfile: true } },
      },
    });

    // Notify rider that driver accepted
    if (updatedRide) {
      notifyRideEvent(updatedRide.rider.id, 'ride_accepted', id, {
        driverName: session.user.name || '',
      }).catch(() => {});
    }

    return NextResponse.json(updatedRide);
  } catch (err) {
    console.error("POST /api/rides/[id]/accept error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
