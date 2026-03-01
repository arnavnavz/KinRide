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

    const activeStatuses = ["SEARCHING", "ACCEPTED", "ARRIVING", "IN_PROGRESS"] as const;

    const ride = await prisma.rideRequest.findFirst({
      where: {
        riderId: session.user.id,
        status: { in: activeStatuses as any },
      },
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, name: true, driverProfile: true } },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "No active ride" }, { status: 404 });
    }

    return NextResponse.json({
      id: ride.id,
      status: ride.status,
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
      driverName: (ride as any).driver?.name ?? null,
      estimatedFare: ride.estimatedFare,
    });
  } catch (err) {
    console.error("GET /api/rides/active error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
