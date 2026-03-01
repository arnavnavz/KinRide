"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Avatar } from "@/components/Avatar";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { ListSkeleton } from "@/components/Skeleton";

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  estimatedFare: number | null;
  platformFee: number | null;
  isKinRide: boolean;
  rideType: string;
  createdAt: string;
  rider: { id: string; name: string; email: string };
  driver: { id: string; name: string; email: string } | null;
  payment: {
    status: string;
    amountTotal: number;
    walletAmountUsed: number;
    cardAmountCharged: number;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    succeeded: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function AdminRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRides = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: statusFilter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/rides?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRides(data.rides);
      setPagination(data.pagination);
      setLastRefresh(new Date());
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchRides(false), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchRides]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rides Monitor</h1>
          <p className="text-gray-500 text-sm mt-1">Live view of all rides on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchRides(false)}
            className="p-2 rounded-lg border border-gray-200 dark:border-card-border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            title="Refresh now"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by rider or driver name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-card-border bg-white dark:bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-card-border p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === t.value
                  ? "bg-indigo-500 text-white"
                  : "text-gray-500 hover:text-foreground hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rides list */}
      {loading ? (
        <ListSkeleton rows={6} />
      ) : rides.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0020 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-500 text-sm">No rides found</p>
        </div>
      ) : (
        <>
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
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <>
                    <tr
                      key={ride.id}
                      className={`border-b border-gray-50 dark:border-card-border/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        expandedId === ride.id ? "bg-gray-50/50 dark:bg-white/5" : ""
                      }`}
                      onClick={() => setExpandedId(expandedId === ride.id ? null : ride.id)}
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
                      <td className="px-4 py-3 text-center">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === ride.id ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    {expandedId === ride.id && (
                      <tr key={`${ride.id}-detail`} className="bg-gray-50/50 dark:bg-white/[0.02]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-400 block mb-0.5">Payment Status</span>
                              {ride.payment ? (
                                <PaymentBadge status={ride.payment.status} />
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">Platform Fee</span>
                              <span className="text-foreground font-medium">
                                {ride.platformFee != null ? `$${ride.platformFee.toFixed(2)}` : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">Kin Ride</span>
                              <span className={`font-medium ${ride.isKinRide ? "text-indigo-600" : "text-gray-400"}`}>
                                {ride.isKinRide ? "Yes" : "No"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">Type</span>
                              <span className="text-foreground font-medium capitalize">{ride.rideType}</span>
                            </div>
                            {ride.payment && (
                              <>
                                <div>
                                  <span className="text-gray-400 block mb-0.5">Total Charged</span>
                                  <span className="text-foreground font-medium">${ride.payment.amountTotal.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block mb-0.5">Wallet Used</span>
                                  <span className="text-foreground font-medium">${ride.payment.walletAmountUsed.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block mb-0.5">Card Charged</span>
                                  <span className="text-foreground font-medium">${ride.payment.cardAmountCharged.toFixed(2)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-card-border overflow-hidden"
              >
                <div
                  className="p-4 space-y-2 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === ride.id ? null : ride.id)}
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

                {expandedId === ride.id && (
                  <div className="border-t border-gray-100 dark:border-card-border bg-gray-50/50 dark:bg-white/[0.02] p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Payment</span>
                        {ride.payment ? <PaymentBadge status={ride.payment.status} /> : <span className="text-gray-400">N/A</span>}
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Platform Fee</span>
                        <span className="font-medium text-foreground">
                          {ride.platformFee != null ? `$${ride.platformFee.toFixed(2)}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Kin Ride</span>
                        <span className={`font-medium ${ride.isKinRide ? "text-indigo-600" : "text-gray-400"}`}>
                          {ride.isKinRide ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Type</span>
                        <span className="font-medium text-foreground capitalize">{ride.rideType}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-card-border text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-card-border text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
