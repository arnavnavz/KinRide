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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const status = url.searchParams.get("status");
    const skip = (page - 1) * limit;

    const isDriver = session.user.role === "DRIVER";

    const where: Record<string, unknown> = isDriver
      ? { driverId: session.user.id }
      : { riderId: session.user.id };

    if (status) {
      where.status = status;
    }

    const [rides, total] = await Promise.all([
      prisma.rideRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          rider: { select: { id: true, name: true, phone: true } },
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              driverProfile: {
                select: {
                  vehicleMake: true,
                  vehicleModel: true,
                  vehicleColor: true,
                  licensePlate: true,
                  kinCode: true,
                },
              },
            },
          },
          payment: {
            select: {
              amountTotal: true,
              walletAmountUsed: true,
              cardAmountCharged: true,
              status: true,
            },
          },
          ratings: {
            select: { stars: true, comment: true, riderId: true, driverId: true },
          },
          tips: {
            select: { amount: true, riderId: true },
          },
        },
      }),
      prisma.rideRequest.count({ where }),
    ]);

    return NextResponse.json({
      rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/rides/history error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
