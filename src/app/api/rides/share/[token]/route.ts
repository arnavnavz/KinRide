import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const ride = await prisma.rideRequest.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        driverId: true,
        pickupAddress: true,
        dropoffAddress: true,
        status: true,
        createdAt: true,
        rider: { select: { name: true } },
        driver: {
          select: {
            name: true,
            driverProfile: {
              select: { vehicleMake: true, vehicleModel: true, vehicleColor: true, licensePlate: true },
            },
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let driverLocation = null;
    if (ride.driver && ["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status)) {
      const loc = await prisma.driverLocation.findUnique({
        where: { driverId: ride.driverId! },
        select: { lat: true, lng: true, updatedAt: true },
      });
      if (loc) {
        const staleMs = Date.now() - new Date(loc.updatedAt).getTime();
        if (staleMs < 5 * 60 * 1000) {
          driverLocation = { lat: loc.lat, lng: loc.lng };
        }
      }
    }

    return NextResponse.json({ ...ride, driverLocation }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (err) {
    console.error("GET /api/rides/share/[token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
