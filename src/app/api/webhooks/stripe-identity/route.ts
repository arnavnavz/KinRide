import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { handleStripeVerificationResult } from "@/lib/verification";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}
const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    switch (event.type) {
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleStripeVerificationResult(session.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe Identity webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
