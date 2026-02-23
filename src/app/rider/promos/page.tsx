"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/Avatar";

type Tab = "promos" | "referrals";

interface Redemption {
  id: string;
  discount: number;
  createdAt: string;
  promoCode: {
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    expiresAt: string | null;
    isActive: boolean;
  };
}

interface ReferralEntry {
  id: string;
  referralCode: string;
  refereeName: string | null;
  isRedeemed: boolean;
  rewardAmount: number;
  createdAt: string;
}

export default function PromosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("promos");

  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState("");
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  const [referralCode, setReferralCode] = useState("");
  const [rewardAmount, setRewardAmount] = useState(5);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralInput, setReferralInput] = useState("");
  const [redeemingReferral, setRedeemingReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [referralError, setReferralError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/promo")
      .then((r) => r.json())
      .then((data) => setRedemptions(data.redemptions || []))
      .catch(() => {});

    fetch("/api/referral")
      .then((r) => r.json())
      .then((data) => {
        if (data.referralCode) setReferralCode(data.referralCode);
        if (data.rewardAmount) setRewardAmount(data.rewardAmount);
        if (data.referrals) setReferrals(data.referrals);
      })
      .catch(() => {});
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoMessage("");
    setPromoError("");
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Failed to apply promo");
      } else {
        setPromoMessage(data.message);
        setPromoCode("");
        if (data.redemption) {
          setRedemptions((prev) => [data.redemption, ...prev]);
        }
      }
    } catch {
      setPromoError("Something went wrong");
    }
    setApplyingPromo(false);
  };

  const handleRedeemReferral = async () => {
    if (!referralInput.trim()) return;
    setRedeemingReferral(true);
    setReferralMessage("");
    setReferralError("");
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReferralError(data.error || "Failed to redeem");
      } else {
        setReferralMessage(data.message);
        setReferralInput("");
      }
    } catch {
      setReferralError("Something went wrong");
    }
    setRedeemingReferral(false);
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "RIDER") {
    return <div className="text-center py-20 text-foreground/60">This page is for riders only.</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="safe-top bg-card border-b border-card-border px-5 pb-4 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/rider/request" className="p-1 text-foreground/50 hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Promos & Referrals</h1>
          <div className="ml-auto">
            <Avatar name={session?.user?.name || "U"} size="sm" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 bg-subtle rounded-xl p-1">
          <button
            onClick={() => setTab("promos")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === "promos"
                ? "bg-card text-foreground shadow-sm"
                : "text-foreground/50 hover:text-foreground/70"
            }`}
          >
            Promo Codes
          </button>
          <button
            onClick={() => setTab("referrals")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === "referrals"
                ? "bg-card text-foreground shadow-sm"
                : "text-foreground/50 hover:text-foreground/70"
            }`}
          >
            Refer & Earn
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Promo Codes Tab */}
        {tab === "promos" && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-3">
              <p className="text-sm text-foreground/60">Enter a promo code to get a discount on your next ride.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="flex-1 bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono tracking-wider"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={applyingPromo || !promoCode.trim()}
                  className="bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 active:scale-[0.98] shrink-0"
                >
                  {applyingPromo ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>

              {promoMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
                  {promoMessage}
                </div>
              )}
              {promoError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
                  {promoError}
                </div>
              )}
            </div>

            {/* Applied promos */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wide">
                Applied Promos ({redemptions.length})
              </h3>
              {redemptions.length === 0 ? (
                <div className="text-center py-8 text-foreground/30">
                  <svg className="w-10 h-10 mx-auto mb-2 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm">No promo codes applied yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div key={r.id} className="bg-card border border-card-border rounded-xl p-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary tracking-wider">{r.promoCode.code}</span>
                            {r.promoCode.isActive ? (
                              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">Active</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-foreground/40 px-1.5 py-0.5 rounded-full font-medium">Expired</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/50 mt-1">{r.promoCode.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {r.promoCode.discountType === "percentage"
                              ? `${r.promoCode.discountValue}%`
                              : `$${r.promoCode.discountValue.toFixed(2)}`}
                          </span>
                          <p className="text-[10px] text-foreground/40">off</p>
                        </div>
                      </div>
                      {r.promoCode.expiresAt && (
                        <p className="text-[10px] text-foreground/30 mt-2">
                          Expires {new Date(r.promoCode.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {tab === "referrals" && (
          <div className="space-y-5 animate-fade-in">
            {/* Referral code card */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-foreground">Share your code, earn rewards</h3>
                <p className="text-sm text-foreground/50">
                  You and your friend both get <span className="font-semibold text-primary">${rewardAmount.toFixed(2)}</span> in ride credits
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="bg-card border-2 border-dashed border-primary/30 rounded-xl px-6 py-3">
                  <span className="font-mono text-xl font-bold text-primary tracking-[0.2em]">
                    {referralCode || "..."}
                  </span>
                </div>
                <button
                  onClick={copyReferralCode}
                  disabled={!referralCode}
                  className={`p-3 rounded-xl transition-all active:scale-95 ${
                    copied
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {copied ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 bg-card/50 rounded-xl p-3 text-xs text-foreground/50">
                <svg className="w-4 h-4 shrink-0 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Share your code with friends. When they sign up and use it, you both receive ride credits.
              </div>
            </div>

            {/* Redeem someone else's code */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wide">Have a friend&apos;s code?</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="flex-1 bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono tracking-wider"
                  onKeyDown={(e) => e.key === "Enter" && handleRedeemReferral()}
                />
                <button
                  onClick={handleRedeemReferral}
                  disabled={redeemingReferral || !referralInput.trim()}
                  className="bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 active:scale-[0.98] shrink-0"
                >
                  {redeemingReferral ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Redeem"
                  )}
                </button>
              </div>

              {referralMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
                  {referralMessage}
                </div>
              )}
              {referralError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
                  {referralError}
                </div>
              )}
            </div>

            {/* Referrals list */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wide">
                Your Referrals ({referrals.filter((r) => r.isRedeemed).length} redeemed)
              </h3>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-foreground/30">
                  <svg className="w-10 h-10 mx-auto mb-2 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm">No referrals yet — share your code!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        r.isRedeemed
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-foreground/5 text-foreground/30"
                      }`}>
                        {r.isRedeemed ? (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {r.isRedeemed ? (r.refereeName || "Friend") : "Pending"}
                        </p>
                        <p className="text-[11px] text-foreground/40">
                          {r.isRedeemed
                            ? `Earned $${r.rewardAmount.toFixed(2)} · ${new Date(r.createdAt).toLocaleDateString()}`
                            : "Waiting for someone to use this code"}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${r.isRedeemed ? "text-green-500" : "text-foreground/20"}`}>
                        +${r.rewardAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
