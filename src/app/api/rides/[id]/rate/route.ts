import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { stars, comment } = await req.json();

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Rating must be 1-5 stars" }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({
      where: { id },
      select: { riderId: true, driverId: true, status: true },
    });

    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.riderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (ride.status !== "COMPLETED") return NextResponse.json({ error: "Can only rate completed rides" }, { status: 400 });
    if (!ride.driverId) return NextResponse.json({ error: "No driver to rate" }, { status: 400 });

    const existing = await prisma.rating.findUnique({
      where: { rideRequestId_riderId: { rideRequestId: id, riderId: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: "Already rated" }, { status: 409 });

    const rating = await prisma.rating.create({
      data: {
        rideRequestId: id,
        riderId: session.user.id,
        driverId: ride.driverId,
        stars: Math.round(stars),
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (err) {
    console.error("Rate ride error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
