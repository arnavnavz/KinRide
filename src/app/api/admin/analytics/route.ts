import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const period = req.nextUrl.searchParams.get("period") || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rides = await prisma.rideRequest.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        status: true,
        estimatedFare: true,
        platformFee: true,
        isKinRide: true,
      },
    });

    const dailyMap = new Map<
      string,
      { completed: number; canceled: number; total: number; fares: number; fees: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, { completed: 0, canceled: 0, total: 0, fares: 0, fees: 0 });
    }

    let totalFares = 0,
      totalFees = 0,
      kinCount = 0;
    for (const r of rides) {
      const key = r.createdAt.toISOString().split("T")[0];
      const entry = dailyMap.get(key);
      if (entry) {
        entry.total++;
        if (r.status === "COMPLETED") {
          entry.completed++;
          entry.fares += r.estimatedFare || 0;
          entry.fees += r.platformFee || 0;
          totalFares += r.estimatedFare || 0;
          totalFees += r.platformFee || 0;
        }
        if (r.status === "CANCELED") entry.canceled++;
      }
      if (r.isKinRide) kinCount++;
    }

    const dailyRides = Array.from(dailyMap.entries()).map(([date, d]) => ({
      date,
      completed: d.completed,
      canceled: d.canceled,
      total: d.total,
    }));

    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, d]) => ({
      date,
      fares: Math.round(d.fares * 100) / 100,
      platformFees: Math.round(d.fees * 100) / 100,
    }));

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, role: true },
    });

    const signupMap = new Map<string, { riders: number; drivers: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      signupMap.set(d.toISOString().split("T")[0], { riders: 0, drivers: 0 });
    }

    for (const u of users) {
      const key = u.createdAt.toISOString().split("T")[0];
      const entry = signupMap.get(key);
      if (entry) {
        if (u.role === "RIDER") entry.riders++;
        else if (u.role === "DRIVER") entry.drivers++;
      }
    }

    const dailySignups = Array.from(signupMap.entries()).map(([date, d]) => ({
      date,
      riders: d.riders,
      drivers: d.drivers,
    }));

    const [totalUsers, avgRatingResult] = await Promise.all([
      prisma.user.count(),
      prisma.rating.aggregate({ _avg: { stars: true } }),
    ]);

    const completedCount = rides.filter((r) => r.status === "COMPLETED").length;

    return NextResponse.json({
      dailyRides,
      dailyRevenue,
      dailySignups,
      summary: {
        totalRides: rides.length,
        totalRevenue: Math.round(totalFees * 100) / 100,
        totalFares: Math.round(totalFares * 100) / 100,
        totalUsers,
        avgFare:
          completedCount > 0 ? Math.round((totalFares / completedCount) * 100) / 100 : 0,
        completionRate:
          rides.length > 0 ? Math.round((completedCount / rides.length) * 100) : 0,
        avgRating: avgRatingResult._avg.stars
          ? Math.round(avgRatingResult._avg.stars * 10) / 10
          : null,
        kinRidePercentage:
          rides.length > 0 ? Math.round((kinCount / rides.length) * 100) : 0,
      },
      period,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
