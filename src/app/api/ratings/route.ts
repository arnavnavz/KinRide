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
    const rideRequestId = searchParams.get("rideRequestId");
    const driverId = searchParams.get("driverId");

    if (rideRequestId) {
      const rating = await prisma.rating.findUnique({
        where: {
          rideRequestId_riderId: {
            rideRequestId,
            riderId: session.user.id,
          },
        },
      });
      return NextResponse.json({ rating });
    }

    if (driverId) {
      const ratings = await prisma.rating.findMany({
        where: { driverId },
        orderBy: { createdAt: "desc" },
        include: {
          rider: { select: { name: true } },
        },
      });
      const avg =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
          : null;
      return NextResponse.json({ ratings, averageStars: avg, count: ratings.length });
    }

    return NextResponse.json({ error: "rideRequestId or driverId required" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/ratings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rideRequestId, driverId, stars, comment } = await req.json();

    if (!rideRequestId || !driverId || !stars) {
      return NextResponse.json({ error: "rideRequestId, driverId, and stars are required" }, { status: 400 });
    }

    if (typeof stars !== "number" || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Stars must be 1-5" }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.riderId !== session.user.id) {
      return NextResponse.json({ error: "You can only rate your own rides" }, { status: 403 });
    }
    if (ride.status !== "COMPLETED") {
      return NextResponse.json({ error: "Can only rate completed rides" }, { status: 400 });
    }
    if (ride.driverId !== driverId) {
      return NextResponse.json({ error: "Driver mismatch" }, { status: 400 });
    }

    const existing = await prisma.rating.findUnique({
      where: {
        rideRequestId_riderId: {
          rideRequestId,
          riderId: session.user.id,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Already rated this ride" }, { status: 409 });
    }

    const rating = await prisma.rating.create({
      data: {
        rideRequestId,
        riderId: session.user.id,
        driverId,
        stars,
        comment: comment || null,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (err) {
    console.error("POST /api/ratings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
