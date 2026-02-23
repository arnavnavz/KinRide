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

    const rides = await prisma.rideRequest.findMany({
      where: {
        driverId: session.user.id,
        status: { in: ["ACCEPTED", "ARRIVING", "IN_PROGRESS"] },
      },
      include: {
        rider: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(rides);
  } catch (err) {
    console.error("GET /api/driver/rides error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
