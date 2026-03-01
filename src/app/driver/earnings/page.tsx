"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/Avatar";
import { EarningsSkeleton } from "@/components/Skeleton";
import { useI18n } from "@/lib/i18n-context";

interface RideEarning {
  id: string;
  pickup: string;
  dropoff: string;
  riderName: string;
  gross: number;
  fee: number;
  net: number;
  isKinRide: boolean;
  commissionRate: number;
  date: string;
}

interface EarningsData {
  plan: string;
  summary: {
    today: { gross: number; fees: number; net: number };
    week: { gross: number; fees: number; net: number };
    allTime: { gross: number; fees: number; net: number };
    totalRides: number;
    kinRideCount: number;
  };
  rides: RideEarning[];
}

export default function EarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/driver/earnings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const togglePlan = async () => {
    if (!data) return;
    setChangingPlan(true);
    const newPlan = data.plan === "KIN_PRO" ? "FREE" : "KIN_PRO";
    try {
      const res = await fetch("/api/driver/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        const sub = await res.json();
        setData((d) => d ? { ...d, plan: sub.plan } : d);
        toast(newPlan === "KIN_PRO" ? "Upgraded to KinPro!" : "Switched to Free plan", "success");
      } else {
        toast("Failed to change plan", "error");
      }
    } catch {
      toast("Failed to change plan", "error");
    } finally {
      setChangingPlan(false);
    }
  };

  if (status === "loading" || loading) {
    return <EarningsSkeleton />;
  }

  if (session?.user?.role !== "DRIVER") {
    return <div className="text-center py-20 text-foreground/50">This page is for drivers only.</div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-foreground/50">Failed to load earnings.</div>;
  }

  const isKinPro = data.plan === "KIN_PRO";
  const kinPct = data.summary.totalRides > 0
    ? Math.round((data.summary.kinRideCount / data.summary.totalRides) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("driver.earnings")}</h1>
          <p className="text-foreground/50 text-sm mt-1">{t("driver.performance")}</p>
        </div>
        <button
          onClick={() => router.push("/driver/dashboard")}
          className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
        >
          {t("driver.back_to_dashboard")}
        </button>
      </div>

      {/* Plan status */}
      <div className={`rounded-2xl border p-5 transition-colors ${isKinPro ? "bg-primary/5 border-primary/20" : "bg-card border-card-border"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground/80">
                {isKinPro ? t("driver.kinpro_plan") : t("driver.free_plan")}
              </h2>
              {isKinPro && (
                <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-medium">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {isKinPro
                ? "0% commission on Kin rides · 10% on standard rides"
                : "8% commission on Kin rides · 15% on standard rides"}
            </p>
          </div>
          <button
            onClick={togglePlan}
            disabled={changingPlan}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 active:scale-[0.97] ${
              isKinPro
                ? "bg-subtle text-foreground/70 hover:bg-gray-200"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {changingPlan ? (
              <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : isKinPro ? t("driver.downgrade") : t("driver.upgrade_kinpro") + " — $30/month"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { labelKey: "driver.today", ...data.summary.today },
          { labelKey: "driver.this_week", ...data.summary.week },
          { labelKey: "driver.all_time", ...data.summary.allTime },
        ].map((period) => (
          <div key={period.labelKey} className="bg-card rounded-2xl border border-card-border p-5 card-hover">
            <p className="text-xs text-foreground/40 mb-1">{t(period.labelKey)}</p>
            <p className="text-2xl font-bold text-foreground">${period.net.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground/40">
              <span>${period.gross.toFixed(2)} {t("driver.gross")}</span>
              <span>-${period.fees.toFixed(2)} {t("driver.fees")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{data.summary.totalRides}</p>
            <p className="text-xs text-foreground/40">{t("driver.total_rides")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{data.summary.kinRideCount}</p>
            <p className="text-xs text-foreground/40">{t("driver.kin_rides")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{kinPct}%</p>
            <p className="text-xs text-foreground/40">{t("driver.kin_rate")}</p>
          </div>
        </div>
      </div>

      {/* Ride list */}
      {data.rides.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("driver.recent_rides")}</h2>
          <div className="space-y-2">
            {data.rides.map((ride) => (
              <div
                key={ride.id}
                className="bg-card rounded-xl border border-card-border p-4 card-hover"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                    <Avatar name={ride.riderName} size="xs" />
                    <span className="text-sm font-medium text-foreground/80 truncate">
                      {ride.pickup} → {ride.dropoff}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ride.isKinRide && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        Kin
                      </span>
                    )}
                    <span className="text-sm font-bold text-green-600">+${ride.net.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-foreground/40 ml-10">
                  <span>{ride.riderName} · {new Date(ride.date).toLocaleDateString()}</span>
                  <span>
                    ${ride.gross.toFixed(2)} - ${ride.fee.toFixed(2)} fee ({ride.commissionRate}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
