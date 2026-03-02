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

    return NextResponse.json(ride, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("GET /api/rides/share/[token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
