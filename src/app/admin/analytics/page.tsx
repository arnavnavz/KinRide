"use client";

import { useEffect, useState, useCallback } from "react";
import { PageSkeleton } from "@/components/Skeleton";

type Period = "7d" | "30d" | "90d";

interface DailyRide {
  date: string;
  completed: number;
  canceled: number;
  total: number;
}

interface DailyRevenue {
  date: string;
  fares: number;
  platformFees: number;
}

interface DailySignup {
  date: string;
  riders: number;
  drivers: number;
}

interface Summary {
  totalRides: number;
  totalRevenue: number;
  totalFares: number;
  totalUsers: number;
  avgFare: number;
  completionRate: number;
  avgRating: number | null;
  kinRidePercentage: number;
}

interface AnalyticsData {
  dailyRides: DailyRide[];
  dailyRevenue: DailyRevenue[];
  dailySignups: DailySignup[];
  summary: Summary;
  period: string;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BarChart({
  title,
  data,
  bars,
  maxOverride,
}: {
  title: string;
  data: { date: string; values: { label: string; value: number; color: string }[] }[];
  bars: { label: string; color: string }[];
  maxOverride?: number;
}) {
  const maxVal =
    maxOverride ??
    Math.max(
      1,
      ...data.map((d) => d.values.reduce((s, v) => s + v.value, 0))
    );

  const showEveryN = data.length > 14 ? (data.length > 45 ? 7 : 3) : 1;

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-gray-400">max: {maxVal % 1 === 0 ? maxVal : maxVal.toFixed(2)}</span>
      </div>
      <div className="flex gap-3 mb-3">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
            {b.label}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="flex items-end gap-[2px] min-w-0"
          style={{ minWidth: data.length > 14 ? `${data.length * 20}px` : undefined, height: "180px" }}
        >
          {data.map((d, i) => {
            const stackTotal = d.values.reduce((s, v) => s + v.value, 0);
            const heightPct = maxVal > 0 ? (stackTotal / maxVal) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center min-w-[12px] h-full justify-end group">
                <div className="relative w-full flex flex-col justify-end" style={{ height: "156px" }}>
                  <div
                    className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-300"
                    style={{ height: `${heightPct}%`, minHeight: stackTotal > 0 ? "2px" : "0" }}
                  >
                    {d.values.map((v) => {
                      const segPct = stackTotal > 0 ? (v.value / stackTotal) * 100 : 0;
                      return (
                        <div
                          key={v.label}
                          className={`w-full ${v.color} transition-all duration-300`}
                          style={{ height: `${segPct}%`, minHeight: v.value > 0 ? "1px" : "0" }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                      <p className="font-medium">{formatDateLabel(d.date)}</p>
                      {d.values.map((v) => (
                        <p key={v.label}>
                          {v.label}: {v.value % 1 === 0 ? v.value : `$${v.value.toFixed(2)}`}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-gray-400 mt-1 whitespace-nowrap leading-none">
                  {i % showEveryN === 0 ? formatDateLabel(d.date) : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-danger font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Platform performance over time</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 self-start">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-gray-500 hover:text-foreground"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <PageSkeleton />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0020 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              }
              value={data.summary.totalRides.toLocaleString()}
              label="Total Rides"
              sub={`${data.summary.completionRate}% completion rate`}
              accent="bg-blue-100 dark:bg-blue-900/30"
            />
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={`$${data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              label="Platform Revenue"
              sub={`$${data.summary.totalFares.toLocaleString(undefined, { minimumFractionDigits: 2 })} total fares`}
              accent="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              value={data.summary.totalUsers.toLocaleString()}
              label="Total Users"
              accent="bg-violet-100 dark:bg-violet-900/30"
            />
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-amber-500 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              }
              value={data.summary.avgRating !== null ? data.summary.avgRating.toFixed(1) : "—"}
              label="Avg Rating"
              sub={data.summary.avgRating !== null ? "out of 5 stars" : "No ratings yet"}
              accent="bg-amber-100 dark:bg-amber-900/30"
            />
          </div>

          {/* Rides Chart */}
          <BarChart
            title="Daily Rides"
            data={data.dailyRides.map((d) => ({
              date: d.date,
              values: [
                { label: "Completed", value: d.completed, color: "bg-emerald-500" },
                { label: "Canceled", value: d.canceled, color: "bg-red-400" },
              ],
            }))}
            bars={[
              { label: "Completed", color: "bg-emerald-500" },
              { label: "Canceled", color: "bg-red-400" },
            ]}
          />

          {/* Revenue Chart */}
          <BarChart
            title="Daily Platform Revenue"
            data={data.dailyRevenue.map((d) => ({
              date: d.date,
              values: [
                { label: "Revenue", value: d.platformFees, color: "bg-indigo-500" },
              ],
            }))}
            bars={[{ label: "Platform Fees", color: "bg-indigo-500" }]}
          />

          {/* Signups Chart */}
          <BarChart
            title="Daily Signups"
            data={data.dailySignups.map((d) => ({
              date: d.date,
              values: [
                { label: "Riders", value: d.riders, color: "bg-blue-500" },
                { label: "Drivers", value: d.drivers, color: "bg-teal-500" },
              ],
            }))}
            bars={[
              { label: "Riders", color: "bg-blue-500" },
              { label: "Drivers", color: "bg-teal-500" },
            ]}
          />

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              value={`$${data.summary.avgFare.toFixed(2)}`}
              label="Avg Fare"
              sub="per completed ride"
              accent="bg-indigo-100 dark:bg-indigo-900/30"
            />
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
              value={`${data.summary.kinRidePercentage}%`}
              label="Kin Ride %"
              sub="rides via Kin code"
              accent="bg-pink-100 dark:bg-pink-900/30"
            />
            <SummaryCard
              icon={
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              value={`$${data.summary.totalFares.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              label="Total Fares Collected"
              sub="across all completed rides"
              accent="bg-teal-100 dark:bg-teal-900/30"
            />
          </div>
        </>
      )}
    </div>
  );
}
