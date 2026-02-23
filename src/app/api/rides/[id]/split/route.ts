import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const splitSchema = z.object({
  splitCount: z.number().int().min(2).max(4),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rideId } = await params;

    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      select: { id: true, riderId: true, estimatedFare: true, shareToken: true },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.riderId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!ride.estimatedFare) {
      return NextResponse.json({ error: "No fare to split" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = splitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { splitCount } = parsed.data;
    const perPersonFare = Math.round((ride.estimatedFare / splitCount) * 100) / 100;

    const origin = req.headers.get("origin") || req.headers.get("x-forwarded-host") || "http://localhost:3000";
    const splitLink = `${origin}/trip/${ride.shareToken}/split?amount=${perPersonFare}&count=${splitCount}`;

    return NextResponse.json({
      splitLink,
      perPersonFare,
      splitCount,
      totalFare: ride.estimatedFare,
    });
  } catch (err) {
    console.error("POST /api/rides/[id]/split error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
