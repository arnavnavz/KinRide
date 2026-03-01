"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { Avatar } from "@/components/Avatar";

interface Stats {
  users: { total: number; drivers: number; riders: number };
  rides: { total: number; completed: number; canceled: number; active: number };
  earnings: { totalFares: number; totalPlatformFees: number };
  recentRides: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    status: string;
    estimatedFare: number | null;
    platformFee: number | null;
    isKinRide: boolean;
    createdAt: string;
    rider: { name: string };
    driver: { name: string } | null;
  }[];
  topDrivers: {
    id: string;
    name: string;
    completedRides: number;
    avgRating: number | null;
  }[];
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
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
    </div>
  );
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-xs">No ratings</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="font-medium text-foreground">{rating}</span>
    </span>
  );
}

function RideBreakdownBar({ rides }: { rides: Stats["rides"] }) {
  const total = rides.total || 1;
  const segments = [
    { label: "Completed", count: rides.completed, color: "bg-emerald-500" },
    { label: "Active", count: rides.active, color: "bg-blue-500" },
    { label: "Canceled", count: rides.canceled, color: "bg-red-400" },
  ];
  const other = total - rides.completed - rides.active - rides.canceled;
  if (other > 0) segments.push({ label: "Other", count: other, color: "bg-gray-300" });

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-4">Ride Status Breakdown</h3>
      <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
        {segments.map(
          (s) =>
            s.count > 0 && (
              <div
                key={s.label}
                className={`${s.color} transition-all duration-500`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            {s.label}: {s.count} ({total > 0 ? Math.round((s.count / total) * 100) : 0}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-danger font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) return <PageSkeleton />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of Kayu platform activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          value={stats.users.total}
          label="Total Users"
          accent="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          value={stats.rides.active}
          label="Active Rides"
          accent="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          value={stats.rides.completed}
          label="Completed Rides"
          accent="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          value={`$${stats.earnings.totalPlatformFees.toFixed(2)}`}
          label="Platform Revenue"
          accent="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>

      {/* Ride Status Breakdown */}
      <RideBreakdownBar rides={stats.rides} />

      {/* Recent Rides */}
      <div className="animate-fade-in">
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Rides</h2>

        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-card-border text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Rider</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">Fare</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRides.map((ride) => (
                <tr
                  key={ride.id}
                  className="border-b border-gray-50 dark:border-card-border/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={ride.rider.name} size="xs" />
                      <span className="text-foreground">{ride.rider.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ride.driver ? ride.driver.name : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 max-w-xs">
                      <span className="truncate">{ride.pickupAddress}</span>
                      <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="truncate">{ride.dropoffAddress}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {ride.estimatedFare != null ? `$${ride.estimatedFare.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RideStatusBadge status={ride.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(ride.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {stats.recentRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-card-border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={ride.rider.name} size="xs" />
                  <span className="text-sm font-medium text-foreground">{ride.rider.name}</span>
                </div>
                <RideStatusBadge status={ride.status} />
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="truncate">{ride.pickupAddress}</span>
                <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="truncate">{ride.dropoffAddress}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Driver: {ride.driver?.name || "—"}</span>
                <span className="font-medium text-foreground">
                  {ride.estimatedFare != null ? `$${ride.estimatedFare.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="text-[11px] text-gray-400">{formatDate(ride.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Drivers */}
      <div className="animate-fade-in">
        <h2 className="text-lg font-semibold text-foreground mb-3">Top Drivers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.topDrivers.map((driver, i) => (
            <div
              key={driver.id}
              className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-card-border p-4 flex items-center gap-3"
            >
              <div className="relative">
                <Avatar name={driver.name} size="sm" />
                {i < 3 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{driver.name}</p>
                <p className="text-xs text-gray-500">{driver.completedRides} rides completed</p>
              </div>
              <StarDisplay rating={driver.avgRating} />
            </div>
          ))}
          {stats.topDrivers.length === 0 && (
            <p className="text-gray-400 text-sm col-span-full">No drivers yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
