import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [
      totalUsers,
      totalDrivers,
      totalRiders,
      totalRides,
      completedRides,
      canceledRides,
      activeRides,
      recentRides,
      totalEarnings,
      topDrivers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.user.count({ where: { role: "RIDER" } }),
      prisma.rideRequest.count(),
      prisma.rideRequest.count({ where: { status: "COMPLETED" } }),
      prisma.rideRequest.count({ where: { status: "CANCELED" } }),
      prisma.rideRequest.count({
        where: { status: { in: ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"] } },
      }),
      prisma.rideRequest.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          estimatedFare: true,
          platformFee: true,
          isKinRide: true,
          createdAt: true,
          rider: { select: { name: true } },
          driver: { select: { name: true } },
        },
      }),
      prisma.rideRequest.aggregate({
        where: { status: "COMPLETED", platformFee: { not: null } },
        _sum: { platformFee: true, estimatedFare: true },
      }),
      prisma.user.findMany({
        where: { role: "DRIVER" },
        take: 10,
        select: {
          id: true,
          name: true,
          _count: { select: { ridesAsDriver: { where: { status: "COMPLETED" } } } },
          ratingsReceived: { select: { stars: true } },
        },
        orderBy: { ridesAsDriver: { _count: "desc" } },
      }),
    ]);

    return NextResponse.json({
      users: { total: totalUsers, drivers: totalDrivers, riders: totalRiders },
      rides: { total: totalRides, completed: completedRides, canceled: canceledRides, active: activeRides },
      earnings: {
        totalFares: totalEarnings._sum.estimatedFare || 0,
        totalPlatformFees: totalEarnings._sum.platformFee || 0,
      },
      recentRides,
      topDrivers: topDrivers.map((d) => ({
        id: d.id,
        name: d.name,
        completedRides: d._count.ridesAsDriver,
        avgRating:
          d.ratingsReceived.length > 0
            ? Math.round(
                (d.ratingsReceived.reduce((s, r) => s + r.stars, 0) / d.ratingsReceived.length) * 10
              ) / 10
            : null,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
