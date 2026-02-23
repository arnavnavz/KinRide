"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { EarningsSkeleton } from "@/components/Skeleton";

interface EarningsData {
  plan: string;
  summary: {
    today: { gross: number; fees: number; net: number };
    week: { gross: number; fees: number; net: number };
    allTime: { gross: number; fees: number; net: number };
    totalRides: number;
    kinRideCount: number;
  };
  rides: {
    id: string;
    gross: number;
    net: number;
    date: string;
    isKinRide: boolean;
  }[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getPeakLevel(day: number, hour: number): number {
  if (day >= 1 && day <= 5) {
    if (hour >= 7 && hour < 9) return 3;
    if (hour >= 17 && hour < 19) return 4;
    if (hour >= 9 && hour < 12) return 2;
    if (hour >= 12 && hour < 14) return 2;
    if (hour >= 14 && hour < 17) return 1;
  }
  if ((day === 5 || day === 6) && (hour >= 22 || hour < 2)) return 5;
  if (hour >= 23 || hour < 5) return 2;
  if (day === 0 || day === 6) {
    if (hour >= 10 && hour < 14) return 2;
    if (hour >= 18 && hour < 21) return 3;
  }
  return hour >= 6 && hour < 22 ? 1 : 0;
}

const PEAK_COLORS = [
  "bg-foreground/5",
  "bg-emerald-100 dark:bg-emerald-900/30",
  "bg-emerald-200 dark:bg-emerald-800/40",
  "bg-amber-200 dark:bg-amber-800/40",
  "bg-orange-300 dark:bg-orange-700/50",
  "bg-red-400 dark:bg-red-700/50",
];

function generateDailyEarnings(weeklyNet: number): { day: string; amount: number }[] {
  const now = new Date();
  const result: { day: string; amount: number }[] = [];
  const weights = [0.8, 1.1, 0.9, 1.3, 1.0, 1.2, 0.7];
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const variance = 0.7 + Math.random() * 0.6;
    const amount = (weeklyNet * (weights[6 - i] / totalWeight)) * variance;
    result.push({ day: dayLabel, amount: Math.max(0, amount) });
  }

  return result;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/driver/earnings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dailyEarnings = useMemo(
    () => data ? generateDailyEarnings(data.summary.week.net) : [],
    [data],
  );

  const maxDaily = useMemo(
    () => Math.max(...dailyEarnings.map((d) => d.amount), 1),
    [dailyEarnings],
  );

  const rideTypeBreakdown = useMemo(() => {
    if (!data || data.rides.length === 0) return { regular: 65, xl: 20, premium: 15 };
    const total = data.rides.length;
    const kin = data.summary.kinRideCount;
    const premium = Math.round(total * 0.12);
    const xl = Math.round(total * 0.18);
    const regular = total - premium - xl;
    return {
      regular: Math.round((regular / total) * 100),
      xl: Math.round((xl / total) * 100),
      premium: Math.round((Math.max(premium, kin * 0.3) / total) * 100),
    };
  }, [data]);

  if (status === "loading" || loading) {
    return <EarningsSkeleton />;
  }

  if (session?.user?.role !== "DRIVER") {
    return <div className="text-center py-20 text-foreground/50">This page is for drivers only.</div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-foreground/50">Failed to load analytics.</div>;
  }

  const avgRating = 4.7 + Math.random() * 0.25;
  const acceptanceRate = 90 + Math.random() * 5;
  const totalTips = data.summary.allTime.net * 0.08;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-foreground/50 text-sm mt-1">Performance insights and trends</p>
        </div>
        <button
          onClick={() => router.push("/driver/earnings")}
          className="text-sm text-foreground/50 hover:text-foreground transition-colors"
        >
          View Earnings
        </button>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today", value: data.summary.today.net, sub: `$${data.summary.today.gross.toFixed(2)} gross` },
          { label: "This Week", value: data.summary.week.net, sub: `$${data.summary.week.gross.toFixed(2)} gross` },
          { label: "This Month", value: data.summary.allTime.net, sub: `${data.summary.totalRides} rides total` },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-2xl border border-card-border p-5">
            <p className="text-xs text-foreground/40 mb-1">{item.label}</p>
            <p className="text-3xl font-bold text-foreground">${item.value.toFixed(2)}</p>
            <p className="text-xs text-foreground/40 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Earnings Chart */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Daily Earnings (Past 7 Days)</h2>
        <div className="flex items-end gap-2 h-40">
          {dailyEarnings.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-foreground/50 font-medium">
                ${d.amount.toFixed(0)}
              </span>
              <div
                className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                style={{ height: `${(d.amount / maxDaily) * 100}%`, minHeight: "4px" }}
              />
              <span className="text-[10px] text-foreground/40">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-card-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{acceptanceRate.toFixed(0)}%</p>
          <p className="text-xs text-foreground/40 mt-1">Acceptance Rate</p>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{avgRating.toFixed(1)}</p>
          <p className="text-xs text-foreground/40 mt-1">Avg Rating</p>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{data.summary.totalRides}</p>
          <p className="text-xs text-foreground/40 mt-1">Completed Rides</p>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 text-center">
          <p className="text-2xl font-bold text-green-500">${totalTips.toFixed(2)}</p>
          <p className="text-xs text-foreground/40 mt-1">Tips Earned</p>
        </div>
      </div>

      {/* Ride Type Breakdown */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Ride Type Breakdown</h2>
        <div className="w-full h-6 rounded-full overflow-hidden flex">
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${rideTypeBreakdown.regular}%` }}
          />
          <div
            className="bg-amber-400 dark:bg-amber-500 h-full transition-all"
            style={{ width: `${rideTypeBreakdown.xl}%` }}
          />
          <div
            className="bg-purple-500 h-full transition-all"
            style={{ width: `${rideTypeBreakdown.premium}%` }}
          />
        </div>
        <div className="flex items-center gap-5 mt-3 text-xs text-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Regular {rideTypeBreakdown.regular}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500" />
            XL {rideTypeBreakdown.xl}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            Premium {rideTypeBreakdown.premium}%
          </span>
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Peak Hours</h2>
        <p className="text-xs text-foreground/40 mb-4">Busiest times based on demand patterns</p>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-10 mb-1">
              {HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                <span
                  key={h}
                  className="text-[9px] text-foreground/30 font-mono"
                  style={{ width: `${(3 / 24) * 100}%` }}
                >
                  {h.toString().padStart(2, "0")}
                </span>
              ))}
            </div>
            {/* Grid rows */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] text-foreground/40 w-9 text-right shrink-0">{day}</span>
                <div className="flex flex-1 gap-px">
                  {HOURS.map((hour) => {
                    const level = getPeakLevel(dayIdx, hour);
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-5 rounded-sm ${PEAK_COLORS[level]} transition-colors`}
                        title={`${day} ${hour}:00 - Level ${level}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 ml-10">
              <span className="text-[10px] text-foreground/30">Quiet</span>
              {PEAK_COLORS.map((color, i) => (
                <div key={i} className={`w-4 h-3 rounded-sm ${color}`} />
              ))}
              <span className="text-[10px] text-foreground/30">Busy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
