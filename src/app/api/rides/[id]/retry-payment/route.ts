import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chargeRide } from "@/lib/charge-ride";

export async function POST(
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
      select: { riderId: true, status: true, payment: true },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.riderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (ride.status !== "COMPLETED") {
      return NextResponse.json({ error: "Ride is not completed" }, { status: 400 });
    }
    if (ride.payment?.status === "succeeded") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const result = await chargeRide(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/rides/[id]/retry-payment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
