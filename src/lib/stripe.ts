import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey && process.env.NODE_ENV === "production") {
  console.warn("STRIPE_SECRET_KEY is not set");
}

export const stripe = secretKey ? new Stripe(secretKey) : null;

export function stripeEnabled(): boolean {
  return !!stripe;
}

/** Amount in dollars to Stripe smallest unit (cents) */
export function toStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Stripe smallest unit to dollars */
export function fromStripeAmount(cents: number): number {
  return cents / 100;
}
