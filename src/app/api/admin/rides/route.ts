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

    const url = req.nextUrl.searchParams;
    const status = url.get("status") || "all";
    const search = url.get("search") || "";
    const page = Math.max(1, parseInt(url.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const activeStatuses = ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"];

    let statusFilter = {};
    if (status === "active") {
      statusFilter = { status: { in: activeStatuses } };
    } else if (status === "completed") {
      statusFilter = { status: "COMPLETED" };
    } else if (status === "canceled") {
      statusFilter = { status: "CANCELED" };
    }

    const searchFilter = search
      ? {
          OR: [
            { rider: { name: { contains: search, mode: "insensitive" as const } } },
            { driver: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const where = { ...statusFilter, ...searchFilter };

    const [rides, total] = await Promise.all([
      prisma.rideRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          estimatedFare: true,
          platformFee: true,
          isKinRide: true,
          rideType: true,
          createdAt: true,
          rider: { select: { id: true, name: true, email: true } },
          driver: { select: { id: true, name: true, email: true } },
          payment: {
            select: {
              status: true,
              amountTotal: true,
              walletAmountUsed: true,
              cardAmountCharged: true,
            },
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
    console.error("GET /api/admin/rides error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rideId, action } = await req.json();
    if (!rideId || !action) {
      return NextResponse.json({ error: "rideId and action required" }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });

    if (action === "cancel") {
      const activeStatuses = ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"];
      if (!activeStatuses.includes(ride.status)) {
        return NextResponse.json({ error: "Can only cancel active rides" }, { status: 400 });
      }
      const updated = await prisma.rideRequest.update({
        where: { id: rideId },
        data: { status: "CANCELED" },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/admin/rides error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
