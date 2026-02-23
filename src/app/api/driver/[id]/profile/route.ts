import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driver = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        driverProfile: {
          select: {
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            licensePlate: true,
            kinCode: true,
            isVerified: true,
            isOnline: true,
          },
        },
        ratingsReceived: {
          select: { stars: true },
        },
        _count: {
          select: {
            ridesAsDriver: { where: { status: "COMPLETED" } },
          },
        },
      },
    });

    if (!driver || !driver.driverProfile) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const avgRating =
      driver.ratingsReceived.length > 0
        ? Math.round(
            (driver.ratingsReceived.reduce((sum, r) => sum + r.stars, 0) /
              driver.ratingsReceived.length) *
              10
          ) / 10
        : null;

    return NextResponse.json({
      id: driver.id,
      name: driver.name,
      memberSince: driver.createdAt,
      profile: driver.driverProfile,
      avgRating,
      totalRatings: driver.ratingsReceived.length,
      completedRides: driver._count.ridesAsDriver,
    });
  } catch (err) {
    console.error("GET /api/driver/[id]/profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
