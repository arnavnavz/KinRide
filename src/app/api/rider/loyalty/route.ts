import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loyalty = await prisma.riderLoyalty.findUnique({
      where: { riderId: session.user.id },
    });

    if (!loyalty) {
      return NextResponse.json({
        credits: 0,
        lifetimeRides: 0,
        streakWeeks: 0,
        creditsDollars: 0,
      });
    }

    return NextResponse.json({
      credits: loyalty.credits,
      lifetimeRides: loyalty.lifetimeRides,
      streakWeeks: loyalty.streakWeeks,
      creditsDollars: Math.floor(loyalty.credits) / 100,
    });
  } catch (err) {
    console.error("GET /api/rider/loyalty error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { credits } = await req.json();
    if (!credits || typeof credits !== "number" || credits <= 0) {
      return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
    }

    const loyalty = await prisma.riderLoyalty.findUnique({
      where: { riderId: session.user.id },
    });

    if (!loyalty || loyalty.credits < credits) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.riderLoyalty.update({
        where: { riderId: session.user.id },
        data: { credits: { decrement: credits } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          riderId: session.user.id,
          amount: -credits,
          reason: "redeemed",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      remainingCredits: loyalty.credits - credits,
      discount: Math.floor(credits) / 100,
    });
  } catch (err) {
    console.error("POST /api/rider/loyalty error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
