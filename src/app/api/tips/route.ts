import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeEnabled, toStripeAmount } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rideRequestId = searchParams.get("rideRequestId");

    if (!rideRequestId) {
      return NextResponse.json({ error: "rideRequestId required" }, { status: 400 });
    }

    const tip = await prisma.tip.findUnique({
      where: {
        rideRequestId_riderId: {
          rideRequestId,
          riderId: session.user.id,
        },
      },
    });

    return NextResponse.json({ tip });
  } catch (err) {
    console.error("GET /api/tips error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rideRequestId, amount } = await req.json();

    if (!rideRequestId || amount == null) {
      return NextResponse.json({ error: "rideRequestId and amount are required" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount < 1 || amount > 100) {
      return NextResponse.json({ error: "Tip amount must be between $1 and $100" }, { status: 400 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.riderId !== session.user.id) {
      return NextResponse.json({ error: "You can only tip on your own rides" }, { status: 403 });
    }
    if (ride.status !== "COMPLETED") {
      return NextResponse.json({ error: "Can only tip on completed rides" }, { status: 400 });
    }
    if (!ride.driverId) {
      return NextResponse.json({ error: "No driver assigned to this ride" }, { status: 400 });
    }

    const existing = await prisma.tip.findUnique({
      where: {
        rideRequestId_riderId: {
          rideRequestId,
          riderId: session.user.id,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Already tipped on this ride" }, { status: 409 });
    }

    // Charge rider's card if Stripe is enabled
    if (stripeEnabled() && stripe) {
      const rider = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true, defaultPaymentMethodId: true },
      });
      if (rider?.stripeCustomerId && rider?.defaultPaymentMethodId) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: toStripeAmount(amount),
            currency: "usd",
            customer: rider.stripeCustomerId,
            payment_method: rider.defaultPaymentMethodId,
            confirm: true,
            off_session: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
            metadata: { type: "tip", rideRequestId, driverId: ride.driverId },
          });
          if (paymentIntent.status !== "succeeded") {
            return NextResponse.json(
              { error: "Tip charge failed. Try a different payment method." },
              { status: 402 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "Tip charge failed. Update your payment method and try again." },
            { status: 402 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Add a payment method in Profile to tip." },
          { status: 400 }
        );
      }
    }

    const [tip] = await prisma.$transaction([
      prisma.tip.create({
        data: {
          riderId: session.user.id,
          driverId: ride.driverId,
          rideRequestId,
          amount,
        },
      }),
      prisma.wallet.upsert({
        where: { userId: ride.driverId },
        create: {
          userId: ride.driverId,
          balance: amount,
          transactions: {
            create: {
              amount,
              type: "tip_received",
              description: `Tip from ride`,
            },
          },
        },
        update: {
          balance: { increment: amount },
          transactions: {
            create: {
              amount,
              type: "tip_received",
              description: `Tip from ride`,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(tip, { status: 201 });
  } catch (err) {
    console.error("POST /api/tips error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
