"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/Avatar";
import { useI18n } from "@/lib/i18n-context";

interface Referral {
  id: string;
  referralCode: string;
  refereeName: string | null;
  isRedeemed: boolean;
  rewardAmount: number;
  createdAt: string;
}

interface PromoRedemption {
  promoCode: {
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    expiresAt: string | null;
    isActive: boolean;
  };
  discount: number;
  createdAt: string;
}

export default function PromosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [rewardAmount, setRewardAmount] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [promos, setPromos] = useState<PromoRedemption[]>([]);

  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [refRes, promoRes] = await Promise.all([
        fetch("/api/referral"),
        fetch("/api/promo"),
      ]);

      if (refRes.ok) {
        const data = await refRes.json();
        setReferralCode(data.referralCode);
        setRewardAmount(data.rewardAmount);
        setReferrals(data.referrals ?? []);
      }

      if (promoRes.ok) {
        const data = await promoRes.json();
        setPromos(data.redemptions ?? []);
      }
    } catch {
      toast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, loadData]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast("Referral code copied!", "success");
    } catch {
      toast("Could not copy code", "error");
    }
  };

  const shareCode = async () => {
    const text = `Use my Kayu referral code ${referralCode} to get $${rewardAmount.toFixed(2)} off your first ride!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Kayu Referral", text });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyCode();
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;

    setRedeeming(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || data.message || "Invalid code", "error");
      } else {
        toast(data.message || `You earned $${data.rewardAmount?.toFixed(2)} credit!`, "success");
        setRedeemCode("");
        loadData();
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setRedeeming(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 max-w-2xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  const redeemedCount = referrals.filter((r) => r.isRedeemed).length;
  const totalEarned = referrals
    .filter((r) => r.isRedeemed)
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/rider/request"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Promos & Referrals</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Earn credits and save on rides</p>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your Referral Code</h2>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-4">
            <p className="text-2xl font-bold tracking-widest text-primary">{referralCode}</p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            Both you and your friend get <span className="font-semibold text-primary">${rewardAmount.toFixed(2)}</span> credit!
          </p>

          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
            <button
              onClick={shareCode}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>

          {/* Stats row */}
          {referrals.length > 0 && (
            <div className="flex items-center justify-around mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{referrals.length}</p>
                <p className="text-xs text-gray-500">Invited</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{redeemedCount}</p>
                <p className="text-xs text-gray-500">Joined</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">${totalEarned.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Earned</p>
              </div>
            </div>
          )}
        </div>

        {/* Redeem Code Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Redeem a Code</h2>
          </div>

          <form onSubmit={handleRedeem} className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code"
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={redeeming || !redeemCode.trim()}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {redeeming ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "Redeem"
              )}
            </button>
          </form>
        </div>

        {/* Referral History */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Your Referral History</h2>
          {referrals.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">No referrals yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Share your code with friends to earn credits</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3"
                >
                  {r.isRedeemed && r.refereeName ? (
                    <Avatar name={r.refereeName} size="sm" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {r.isRedeemed && r.refereeName ? r.refereeName : "Pending"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      r.isRedeemed
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {r.isRedeemed ? `+$${r.rewardAmount.toFixed(2)}` : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applied Promos */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Applied Promos</h2>
          {promos.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">No promos applied</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Promo discounts will appear here when you use them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {promos.map((p, i) => {
                const isExpired = p.promoCode.expiresAt && new Date(p.promoCode.expiresAt) < new Date();
                const discountLabel =
                  p.promoCode.discountType === "percentage"
                    ? `${p.promoCode.discountValue}% off`
                    : `$${p.promoCode.discountValue.toFixed(2)} off`;

                return (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white tracking-wider">
                            {p.promoCode.code}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.promoCode.description}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                          isExpired
                            ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            : p.promoCode.isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                        }`}
                      >
                        {discountLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-400">
                        Saved <span className="font-medium text-green-600 dark:text-green-400">${p.discount.toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {isExpired ? (
                          <span className="text-red-500">Expired</span>
                        ) : p.promoCode.expiresAt ? (
                          <>Expires {new Date(p.promoCode.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">No expiry</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
