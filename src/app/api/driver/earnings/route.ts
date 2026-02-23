import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = session.user.id;

    const subscription = await prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    const completedRides = await prisma.rideRequest.findMany({
      where: { driverId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        estimatedFare: true,
        platformFee: true,
        isKinRide: true,
        updatedAt: true,
        rider: { select: { name: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    let todayGross = 0;
    let todayFees = 0;
    let weekGross = 0;
    let weekFees = 0;
    let totalGross = 0;
    let totalFees = 0;
    let kinRideCount = 0;

    const rides = completedRides.map((r) => {
      const gross = r.estimatedFare ?? 0;
      const fee = r.platformFee ?? 0;
      const net = gross - fee;
      const rideDate = new Date(r.updatedAt);

      totalGross += gross;
      totalFees += fee;
      if (r.isKinRide) kinRideCount++;

      if (rideDate >= today) {
        todayGross += gross;
        todayFees += fee;
      }
      if (rideDate >= weekStart) {
        weekGross += gross;
        weekFees += fee;
      }

      return {
        id: r.id,
        pickup: r.pickupAddress,
        dropoff: r.dropoffAddress,
        riderName: r.rider.name,
        gross: Math.round(gross * 100) / 100,
        fee: Math.round(fee * 100) / 100,
        net: Math.round(net * 100) / 100,
        isKinRide: r.isKinRide,
        commissionRate: gross > 0 ? Math.round((fee / gross) * 100) : 0,
        date: r.updatedAt,
      };
    });

    return NextResponse.json({
      plan: subscription?.plan ?? "FREE",
      summary: {
        today: {
          gross: Math.round(todayGross * 100) / 100,
          fees: Math.round(todayFees * 100) / 100,
          net: Math.round((todayGross - todayFees) * 100) / 100,
        },
        week: {
          gross: Math.round(weekGross * 100) / 100,
          fees: Math.round(weekFees * 100) / 100,
          net: Math.round((weekGross - weekFees) * 100) / 100,
        },
        allTime: {
          gross: Math.round(totalGross * 100) / 100,
          fees: Math.round(totalFees * 100) / 100,
          net: Math.round((totalGross - totalFees) * 100) / 100,
        },
        totalRides: completedRides.length,
        kinRideCount,
      },
      rides,
    });
  } catch (err) {
    console.error("GET /api/driver/earnings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
