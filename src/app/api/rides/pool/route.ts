import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pickupLat = parseFloat(searchParams.get("pickupLat") || "0");
    const pickupLng = parseFloat(searchParams.get("pickupLng") || "0");

    if (!pickupLat || !pickupLng) {
      return NextResponse.json(
        { error: "Coordinates required" },
        { status: 400 }
      );
    }

    const poolRides = await prisma.rideRequest.findMany({
      where: {
        rideType: "pool",
        status: { in: ["REQUESTED", "ACCEPTED", "IN_PROGRESS"] },
        riderId: { not: session.user.id },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        estimatedFare: true,
        rider: { select: { name: true } },
      },
    });

    return NextResponse.json({
      availablePools: poolRides.map((r) => ({
        id: r.id,
        pickup: r.pickupAddress,
        dropoff: r.dropoffAddress,
        riderName: r.rider.name.split(" ")[0],
        estimatedSavings: r.estimatedFare
          ? Math.round(r.estimatedFare * 0.3 * 100) / 100
          : null,
      })),
    });
  } catch (err) {
    console.error("GET /api/rides/pool error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { poolRideId, pickupAddress, dropoffAddress } = await req.json();

    if (!poolRideId || !pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { error: "poolRideId, pickupAddress, and dropoffAddress are required" },
        { status: 400 }
      );
    }

    const existingPool = await prisma.rideRequest.findFirst({
      where: {
        id: poolRideId,
        rideType: "pool",
        status: { in: ["REQUESTED", "ACCEPTED", "IN_PROGRESS"] },
      },
    });

    if (!existingPool) {
      return NextResponse.json(
        { error: "Pool ride not found or no longer available" },
        { status: 404 }
      );
    }

    const linkedRide = await prisma.rideRequest.create({
      data: {
        riderId: session.user.id,
        pickupAddress,
        dropoffAddress,
        rideType: "pool",
        driverId: existingPool.driverId,
        estimatedFare: existingPool.estimatedFare
          ? Math.round(existingPool.estimatedFare * 0.7 * 100) / 100
          : null,
        riderNote: `Pool with ride ${poolRideId}`,
      },
    });

    return NextResponse.json(linkedRide, { status: 201 });
  } catch (err) {
    console.error("POST /api/rides/pool error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
