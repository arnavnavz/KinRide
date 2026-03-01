import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unratedRide = await prisma.rideRequest.findFirst({
      where: {
        riderId: session.user.id,
        status: "COMPLETED",
        ratings: { none: { riderId: session.user.id } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        estimatedFare: true,
        driver: { select: { name: true } },
        updatedAt: true,
      },
    });

    return NextResponse.json({ pendingRating: unratedRide });
  } catch (err) {
    console.error("Pending rating check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
