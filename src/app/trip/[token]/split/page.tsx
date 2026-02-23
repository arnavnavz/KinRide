"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function SplitContent() {
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");
  const count = searchParams.get("count");
  const [showToast, setShowToast] = useState(false);

  const perPerson = amount ? parseFloat(amount) : 0;
  const splitCount = count ? parseInt(count, 10) : 2;
  const totalFare = Math.round(perPerson * splitCount * 100) / 100;

  const handlePay = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center px-4 py-8">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
            Payment coming soon
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-card shadow-lg rounded-full px-6 py-3 border border-card-border">
            <span className="text-lg font-bold text-primary">Kin</span>
            <span className="text-lg font-light text-foreground">Ride</span>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-card rounded-2xl shadow-xl border border-card-border p-6 space-y-6">
          {/* Invite header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              You&apos;ve been invited to split a KinRide fare
            </h1>
            <p className="text-sm text-foreground/50">
              Someone is sharing the cost of their ride with you
            </p>
          </div>

          {/* Fare breakdown */}
          <div className="bg-subtle rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Total fare</span>
              <span className="text-sm font-medium text-foreground">${totalFare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Splitting between</span>
              <span className="text-sm font-medium text-foreground">{splitCount} people</span>
            </div>
            <div className="border-t border-card-border pt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Your share</span>
              <span className="text-2xl font-bold text-primary">${perPerson.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            className="w-full bg-primary text-white py-4 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            Pay Your Share · ${perPerson.toFixed(2)}
          </button>

          <p className="text-center text-xs text-foreground/30">
            Secure payment powered by KinRide
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground/30">
          KinRide — Rides built on trust
        </p>
      </div>
    </div>
  );
}

export default function SplitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <SplitContent />
    </Suspense>
  );
}
