"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Navbar } from "@/components/Navbar";
import { PageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PaymentMethodCard {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setAdding(true);
    try {
      const data = await fetch("/api/payments/setup-intent", { method: "POST" }).then((r) =>
        r.json()
      );
      if (!data?.clientSecret) {
        toast("Could not add card", "error");
        setAdding(false);
        return;
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        toast(error.message ?? "Card declined", "error");
        setAdding(false);
        return;
      }

      const pmId = setupIntent.payment_method;
      if (pmId && typeof pmId === "string") {
        await fetch("/api/payments/methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodId: pmId }),
        });
      }
      toast("Card added", "success");
      elements.getElement(CardElement)?.clear();
      onSuccess();
    } catch {
      toast("Something went wrong", "error");
    }
    setAdding(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl border border-card-border bg-subtle/50">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "var(--foreground)",
                "::placeholder": { color: "var(--foreground-muted)" },
              },
              invalid: { color: "#ef4444" },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || adding}
        className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {adding ? "Adding..." : "Add card"}
      </button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethodCard[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/methods");
      const data = await res.json();
      if (res.ok) {
        setMethods(data.paymentMethods ?? []);
        setDefaultId(data.defaultId ?? null);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchMethods();
  }, [status, fetchMethods]);

  const setDefault = async (paymentMethodId: string) => {
    try {
      const res = await fetch("/api/payments/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });
      if (res.ok) {
        setDefaultId(paymentMethodId);
        toast("Default card updated", "success");
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed", "error");
      }
    } catch {
      toast("Failed to update", "error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-8">
          <PageSkeleton />
        </div>
      </>
    );
  }

  const paymentsConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/profile"
            className="p-1.5 text-foreground/50 hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Payment methods</h1>
        </div>

        {!paymentsConfigured ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-foreground/80">
            Payments are not configured. Add <code className="bg-black/10 dark:bg-white/10 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and{" "}
            <code className="bg-black/10 dark:bg-white/10 px-1 rounded">STRIPE_SECRET_KEY</code> to enable cards.
          </div>
        ) : (
          <>
            {methods.length > 0 && (
              <div className="space-y-3 mb-8">
                <p className="text-sm font-medium text-foreground/70">Your cards</p>
                {methods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-card-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground uppercase">
                        {pm.brand}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          •••• {pm.last4}
                          {pm.isDefault && (
                            <span className="ml-2 text-xs text-primary font-medium">Default</span>
                          )}
                        </p>
                        {pm.expMonth != null && pm.expYear != null && (
                          <p className="text-xs text-foreground/50">
                            Expires {pm.expMonth}/{pm.expYear}
                          </p>
                        )}
                      </div>
                    </div>
                    {!pm.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefault(pm.id)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Set default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {stripePromise && (
              <div className="border-t border-card-border pt-6">
                <p className="text-sm font-medium text-foreground/70 mb-3">Add a card</p>
                <Elements stripe={stripePromise}>
                  <AddCardForm onSuccess={fetchMethods} />
                </Elements>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
