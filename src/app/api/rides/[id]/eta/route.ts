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
        pickupLat: true,
        pickupLng: true,
        dropoffAddress: true,
        dropoffLat: true,
        dropoffLng: true,
        status: true,
        driverId: true,
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

    if (ride.driverId && ["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status)) {
      const driverLocation = await prisma.driverLocation.findUnique({
        where: { driverId: ride.driverId },
      });

      if (driverLocation) {
        let destLat: number | null = null;
        let destLng: number | null = null;

        if (ride.status === "ACCEPTED" || ride.status === "ARRIVING") {
          destLat = ride.pickupLat;
          destLng = ride.pickupLng;
        } else if (ride.status === "IN_PROGRESS") {
          destLat = ride.dropoffLat;
          destLng = ride.dropoffLng;
        }

        if (destLat != null && destLng != null) {
          try {
            const coords = `${driverLocation.lng},${driverLocation.lat};${destLng},${destLat}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const data = await res.json();
            if (data.routes?.[0]?.duration) {
              etaMinutes = Math.max(1, Math.round(data.routes[0].duration / 60));
            }
          } catch {
            // OSRM unavailable — fall back to haversine estimate
            const R = 3958.8;
            const toRad = (d: number) => (d * Math.PI) / 180;
            const dLat = toRad(destLat - driverLocation.lat);
            const dLng = toRad(destLng - driverLocation.lng);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(driverLocation.lat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
            const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            etaMinutes = Math.max(1, Math.round((miles / 30) * 60));
          }
        }
      }
    }

    return NextResponse.json({
      ...ride,
      etaMinutes,
      lastUpdated: ride.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/rides/[id]/eta error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
