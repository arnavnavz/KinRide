"use client";

import { useEffect, useState } from "react";

interface Refund {
  id: string;
  amount: number;
  reason: string;
  status: string;
  stripeRefundId: string | null;
  createdAt: string;
  issuedBy: { name: string };
  rideRequest: {
    pickupAddress: string;
    dropoffAddress: string;
    estimatedFare: number | null;
    rider: { name: string; email: string };
  };
}

interface RefundsResponse {
  refunds: Refund[];
  total: number;
  page: number;
  totalPages: number;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-5 animate-fade-in">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminRefundsPage() {
  const [data, setData] = useState<RefundsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/refunds?page=${page}&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load refunds");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [page]);

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-danger font-medium">{error}</p>
      </div>
    );
  }

  const refunds = data?.refunds || [];
  const totalRefunded = refunds
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.amount, 0);
  const pendingCount = refunds.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Refunds</h1>
        <p className="text-gray-500 text-sm mt-1">Manage and review issued refunds</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          value={data?.total ?? "—"}
          label="Total Refunds Issued"
          accent="text-foreground"
        />
        <StatCard
          value={`$${totalRefunded.toFixed(2)}`}
          label="Total Refunded (this page)"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          value={pendingCount}
          label="Pending Refunds"
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && refunds.length === 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <p className="text-gray-500 text-sm">No refunds have been issued yet</p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && refunds.length > 0 && (
        <>
          <div className="hidden md:block bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border overflow-hidden animate-fade-in">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-card-border text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Rider</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Issued By</th>
                  <th className="px-4 py-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr
                    key={refund.id}
                    className="border-b border-gray-50 dark:border-card-border/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-foreground font-medium">{refund.rideRequest.rider.name}</span>
                        <p className="text-xs text-gray-400">{refund.rideRequest.rider.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 max-w-xs">
                        <span className="truncate">{refund.rideRequest.pickupAddress}</span>
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="truncate">{refund.rideRequest.dropoffAddress}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      ${refund.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                      {refund.reason}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {refund.issuedBy.name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(refund.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-card-border p-4 space-y-2.5 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{refund.rideRequest.rider.name}</span>
                    <p className="text-xs text-gray-400">{refund.rideRequest.rider.email}</p>
                  </div>
                  <StatusBadge status={refund.status} />
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="truncate">{refund.rideRequest.pickupAddress}</span>
                  <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="truncate">{refund.rideRequest.dropoffAddress}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Reason: {refund.reason}</span>
                  <span className="font-semibold text-foreground">${refund.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>By {refund.issuedBy.name}</span>
                  <span>{formatDate(refund.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-card-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-card-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
