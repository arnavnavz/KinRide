"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Avatar } from "@/components/Avatar";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { CardSkeleton } from "@/components/Skeleton";
import { useI18n } from "@/lib/i18n-context";

interface RideHistoryItem {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  estimatedFare: number | null;
  platformFee: number | null;
  isKinRide: boolean;
  rideType: string;
  createdAt: string;
  driver: {
    id: string;
    name: string;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
    } | null;
  } | null;
  payment: {
    amountTotal: number;
    status: string;
  } | null;
  ratings: { stars: number; comment: string | null }[];
  tips: { amount: number }[];
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Canceled", value: "CANCELED" },
  { label: "Active", value: "active" },
];

export default function RiderHistoryPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus, router]);

  const loadRides = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" });
      if (filter === "active") {
        // For active filter we don't send a single status, we'll filter client-side
      } else if (filter) {
        params.set("status", filter);
      }
      const res = await fetch(`/api/rides/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        let filtered = data.rides;
        if (filter === "active") {
          filtered = filtered.filter((r: RideHistoryItem) =>
            ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(r.status)
          );
        }
        setRides(filtered);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (authStatus === "authenticated") loadRides();
  }, [authStatus, loadRides]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString(undefined, { weekday: "long" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const rideTypeLabel = (type: string) => {
    switch (type) {
      case "xl": return "XL";
      case "premium": return "Premium";
      case "pool": return "Pool";
      default: return "Regular";
    }
  };

  const totalSpent = rides
    .filter((r) => r.status === "COMPLETED" && r.estimatedFare)
    .reduce((sum, r) => sum + (r.estimatedFare || 0), 0);

  if (authStatus === "loading") {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ride History</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} {total === 1 ? "ride" : "rides"} total
            </p>
          </div>
        </div>

        {/* Stats */}
        {rides.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-xs text-gray-500">Total Rides</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-primary">${totalSpent.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {rides.filter((r) => r.isKinRide).length}
              </p>
              <p className="text-xs text-gray-500">Kin Rides</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-primary/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ride list */}
        {loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : rides.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white">No rides found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filter ? "Try a different filter" : "Your ride history will appear here"}
            </p>
            <Link
              href="/rider/request"
              className="inline-block mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <Link
                key={ride.id}
                href={`/rider/ride/${ride.id}`}
                className="block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 hover:border-primary/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RideStatusBadge status={ride.status} />
                    {ride.isKinRide && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Kin
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{rideTypeLabel(ride.rideType)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(ride.createdAt)}</span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 shrink-0" />
                    <p className="text-sm text-gray-900 dark:text-white truncate">{ride.pickupAddress}</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    <p className="text-sm text-gray-900 dark:text-white truncate">{ride.dropoffAddress}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {ride.driver ? (
                      <>
                        <Avatar name={ride.driver.name} size="xs" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{ride.driver.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No driver assigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ride.ratings.length > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <span>&#9733;</span>
                        {ride.ratings[0].stars}
                      </span>
                    )}
                    {ride.estimatedFare != null && (
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ${ride.estimatedFare.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
