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

    const offers = await prisma.rideOffer.findMany({
      where: {
        driverId: session.user.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        rideRequest: {
          include: {
            rider: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { offeredAt: "desc" },
    });

    return NextResponse.json(offers);
  } catch (err) {
    console.error("GET /api/driver/offers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
