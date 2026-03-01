import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rideRequestId, amount, reason } = await req.json();

    if (!rideRequestId || !amount || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: { payment: true },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    if (ride.status !== "COMPLETED" && ride.status !== "CANCELED") {
      return NextResponse.json({ error: "Can only refund completed or canceled rides" }, { status: 400 });
    }

    const existingRefunds = await prisma.refund.findMany({
      where: { rideRequestId, status: "completed" },
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

    const maxRefundable = ride.estimatedFare || 0;
    if (totalRefunded + amount > maxRefundable) {
      return NextResponse.json({
        error: `Refund amount exceeds maximum. Already refunded: $${totalRefunded.toFixed(2)}, max: $${maxRefundable.toFixed(2)}`,
      }, { status: 400 });
    }

    let stripeRefundId: string | null = null;
    let status = "completed";

    const paymentIntentId = ride.payment?.stripePaymentIntentId;
    if (paymentIntentId) {
      try {
        const stripe = getStripe();
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(amount * 100),
          reason: "requested_by_customer",
        });
        stripeRefundId = refund.id;
      } catch (err) {
        console.error("Stripe refund error:", err);
        status = "failed";
      }
    }

    const refund = await prisma.refund.create({
      data: {
        rideRequestId,
        amount,
        reason,
        stripeRefundId,
        status,
        issuedById: session.user.id,
      },
      include: {
        issuedBy: { select: { name: true, email: true } },
        rideRequest: { select: { pickupAddress: true, dropoffAddress: true, estimatedFare: true } },
      },
    });

    return NextResponse.json(refund, { status: 201 });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          issuedBy: { select: { name: true } },
          rideRequest: {
            select: {
              pickupAddress: true,
              dropoffAddress: true,
              estimatedFare: true,
              rider: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.refund.count(),
    ]);

    return NextResponse.json({ refunds, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Get refunds error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
