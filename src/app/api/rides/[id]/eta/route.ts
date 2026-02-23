import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ride = await prisma.rideRequest.findUnique({
      where: { id },
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            name: true,
            driverProfile: {
              select: {
                vehicleMake: true,
                vehicleModel: true,
                vehicleColor: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    let etaMinutes: number | null = null;
    if (ride.status === "ACCEPTED") etaMinutes = 8;
    if (ride.status === "ARRIVING") etaMinutes = 3;
    if (ride.status === "IN_PROGRESS") etaMinutes = 15;

    return NextResponse.json({
      ...ride,
      etaMinutes,
      lastUpdated: ride.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/rides/[id]/eta error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
