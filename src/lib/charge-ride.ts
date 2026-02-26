import { prisma } from "@/lib/prisma";
import { stripe, stripeEnabled, toStripeAmount } from "@/lib/stripe";

export interface ChargeRideResult {
  success: boolean;
  paymentId?: string;
  walletUsed?: number;
  cardCharged?: number;
  error?: string;
}

/**
 * Charge the rider for a completed ride. Applies wallet balance first, then charges remainder to default card.
 * Call this when ride status transitions to COMPLETED.
 */
export async function chargeRide(rideId: string): Promise<ChargeRideResult> {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideId },
    include: {
      rider: {
        select: {
          id: true,
          stripeCustomerId: true,
          defaultPaymentMethodId: true,
        },
      },
    },
  });

  if (!ride || ride.status !== "COMPLETED") {
    return { success: false, error: "Ride not found or not completed" };
  }

  const total = ride.estimatedFare ?? 0;
  if (total <= 0) {
    await prisma.ridePayment.upsert({
      where: { rideRequestId: rideId },
      create: {
        rideRequestId: rideId,
        amountTotal: 0,
        walletAmountUsed: 0,
        cardAmountCharged: 0,
        status: "succeeded",
      },
      update: {},
    });
    return { success: true, walletUsed: 0, cardCharged: 0 };
  }

  // Check for existing payment (idempotent)
  const existing = await prisma.ridePayment.findUnique({
    where: { rideRequestId: rideId },
  });
  if (existing && existing.status === "succeeded") {
    return {
      success: true,
      paymentId: existing.id,
      walletUsed: existing.walletAmountUsed,
      cardCharged: existing.cardAmountCharged,
    };
  }

  let walletUsed = 0;
  let cardCharged = 0;
  let stripePaymentIntentId: string | null = null;

  // Get wallet balance
  const wallet = await prisma.wallet.upsert({
    where: { userId: ride.riderId },
    create: { userId: ride.riderId, balance: 0 },
    update: {},
  });

  walletUsed = Math.min(wallet.balance, total);
  cardCharged = Math.round((total - walletUsed) * 100) / 100;

  // If no Stripe or no card needed, just record wallet deduction
  if (!stripeEnabled() || !stripe) {
    await prisma.$transaction(async (tx) => {
      if (walletUsed > 0) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: walletUsed } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -walletUsed,
            type: "debit",
            description: `Ride ${rideId.slice(-6)}`,
          },
        });
      }
      await tx.ridePayment.upsert({
        where: { rideRequestId: rideId },
        create: {
          rideRequestId: rideId,
          amountTotal: total,
          walletAmountUsed: walletUsed,
          cardAmountCharged: cardCharged,
          status: cardCharged > 0 ? "pending" : "succeeded",
        },
        update: {},
      });
    });
    return {
      success: cardCharged === 0,
      walletUsed,
      cardCharged: cardCharged > 0 ? undefined : 0,
      error: cardCharged > 0 ? "Payments not configured. Add payment method in Profile." : undefined,
    };
  }

  // Charge card if remainder > 0
  if (cardCharged > 0) {
    const customerId = ride.rider.stripeCustomerId;
    const paymentMethodId = ride.rider.defaultPaymentMethodId;

    if (!customerId || !paymentMethodId) {
      await prisma.ridePayment.upsert({
        where: { rideRequestId: rideId },
        create: {
          rideRequestId: rideId,
          amountTotal: total,
          walletAmountUsed: walletUsed,
          cardAmountCharged: cardCharged,
          status: "failed",
        },
        update: {},
      });
      return {
        success: false,
        walletUsed,
        error: "No payment method on file. Add a card in Profile.",
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(cardCharged),
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: { rideRequestId: rideId, userId: ride.riderId },
      });

      if (paymentIntent.status === "succeeded") {
        stripePaymentIntentId = paymentIntent.id;
      } else if (paymentIntent.status === "requires_action") {
        await prisma.ridePayment.upsert({
          where: { rideRequestId: rideId },
          create: {
            rideRequestId: rideId,
            amountTotal: total,
            walletAmountUsed: walletUsed,
            cardAmountCharged: cardCharged,
            stripePaymentIntentId: paymentIntent.id,
            status: "pending",
          },
          update: {},
        });
        return {
          success: false,
          walletUsed,
          cardCharged,
          error: "Card requires authentication. Complete payment in Profile.",
        };
      } else {
        await prisma.ridePayment.upsert({
          where: { rideRequestId: rideId },
          create: {
            rideRequestId: rideId,
            amountTotal: total,
            walletAmountUsed: walletUsed,
            cardAmountCharged: cardCharged,
            stripePaymentIntentId: paymentIntent.id,
            status: "failed",
          },
          update: {},
        });
        return {
          success: false,
          walletUsed,
          error: "Card charge failed. Update payment method and try again.",
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Charge failed";
      console.error("Stripe charge error:", err);
      await prisma.ridePayment.upsert({
        where: { rideRequestId: rideId },
        create: {
          rideRequestId: rideId,
          amountTotal: total,
          walletAmountUsed: walletUsed,
          cardAmountCharged: cardCharged,
          status: "failed",
        },
        update: {},
      });
      return {
        success: false,
        walletUsed,
        error: message,
      };
    }
  }

  // Record successful payment and deduct wallet
  await prisma.$transaction(async (tx) => {
    if (walletUsed > 0) {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: walletUsed } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -walletUsed,
          type: "debit",
          description: `Ride ${rideId.slice(-6)}`,
        },
      });
    }
    await tx.ridePayment.upsert({
      where: { rideRequestId: rideId },
      create: {
        rideRequestId: rideId,
        amountTotal: total,
        walletAmountUsed: walletUsed,
        cardAmountCharged: cardCharged,
        stripePaymentIntentId,
        status: "succeeded",
      },
      update: {
        walletAmountUsed: walletUsed,
        cardAmountCharged: cardCharged,
        stripePaymentIntentId,
        status: "succeeded",
      },
    });
  });

  return {
    success: true,
    walletUsed,
    cardCharged,
  };
}
