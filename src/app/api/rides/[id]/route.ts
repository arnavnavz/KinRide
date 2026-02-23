import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ride = await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        rider: { select: { id: true, name: true, phone: true } },
        driver: {
          select: { id: true, name: true, phone: true, driverProfile: true },
        },
        offers: {
          include: {
            driver: {
              select: { id: true, name: true, driverProfile: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const isParticipant =
      ride.riderId === userId ||
      ride.driverId === userId ||
      ride.offers.some((o) => o.driverId === userId);

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(ride);
  } catch (err) {
    console.error("GET /api/rides/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
