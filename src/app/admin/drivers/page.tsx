"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/Avatar";
import { ListSkeleton } from "@/components/Skeleton";

interface DriverProfile {
  id: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  licensePlate: string;
  isVerified: boolean;
  isOnline: boolean;
  kinCode: string;
  stripeVerificationStatus: string | null;
  checkrStatus: string | null;
  verificationRevokedAt: string | null;
  revocationReason: string | null;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  driverProfile: DriverProfile | null;
  _count: { ridesAsDriver: number; driverDocuments: number };
}

interface DriverDocument {
  id: string;
  type: string;
  filename: string;
  url: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "revoked", label: "Revoked" },
];

function VerificationBadge({ profile }: { profile: DriverProfile | null }) {
  if (!profile) return <span className="text-xs text-gray-400">No profile</span>;

  if (profile.verificationRevokedAt) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Revoked
      </span>
    );
  }
  if (profile.isVerified) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Pending
    </span>
  );
}

function CheckBadge({ label, status }: { label: string; status: string | null }) {
  const colors: Record<string, string> = {
    verified: "text-emerald-600",
    clear: "text-emerald-600",
    pending: "text-amber-600",
    requires_input: "text-red-600",
    consider: "text-amber-600",
    suspended: "text-red-600",
  };
  return (
    <span className="text-xs text-gray-500">
      {label}:{" "}
      <span className={`font-medium ${status ? colors[status] || "text-gray-600" : "text-gray-400"}`}>
        {status || "N/A"}
      </span>
    </span>
  );
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, DriverDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendModal, setSuspendModal] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: statusFilter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/drivers?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrivers(data.drivers);
      setPagination(data.pagination);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function loadDocs(driverId: string) {
    if (docs[driverId]) return;
    setDocsLoading(driverId);
    try {
      const res = await fetch(`/api/driver/documents?driverId=${driverId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs((prev) => ({ ...prev, [driverId]: data }));
    } catch {
      setDocs((prev) => ({ ...prev, [driverId]: [] }));
    } finally {
      setDocsLoading(null);
    }
  }

  function toggleExpand(driverId: string) {
    if (expandedId === driverId) {
      setExpandedId(null);
    } else {
      setExpandedId(driverId);
      loadDocs(driverId);
    }
  }

  async function handleAction(driverId: string, action: string, reason?: string) {
    setActionLoading(driverId);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, action, reason }),
      });
      if (!res.ok) throw new Error();
      await fetchDrivers();
      setSuspendModal(null);
      setSuspendReason("");
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Driver Management</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage all drivers on the platform</p>
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
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-card-border bg-white dark:bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-card-border p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-indigo-500 text-white"
                  : "text-gray-500 hover:text-foreground hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers list */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : drivers.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-sm">No drivers found matching your criteria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => {
            const p = driver.driverProfile;
            const isExpanded = expandedId === driver.id;
            const isRevoked = !!p?.verificationRevokedAt;

            return (
              <div
                key={driver.id}
                className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border overflow-hidden"
              >
                {/* Driver card */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={driver.name} size="sm" online={p?.isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{driver.name}</h3>
                        <VerificationBadge profile={p} />
                        {p?.isOnline && (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{driver.email}</p>

                      {p && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-xs text-gray-500">
                            {p.vehicleColor} {p.vehicleYear} {p.vehicleMake} {p.vehicleModel}
                          </span>
                          <span className="text-xs text-gray-400">Plate: {p.licensePlate}</span>
                          <span className="text-xs text-gray-400">Kin: {p.kinCode}</span>
                          <span className="text-xs text-gray-400">
                            {driver._count.ridesAsDriver} ride{driver._count.ridesAsDriver !== 1 ? "s" : ""} completed
                          </span>
                        </div>
                      )}

                      {p && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          <CheckBadge label="ID Verification" status={p.stripeVerificationStatus} />
                          <CheckBadge label="Background" status={p.checkrStatus} />
                        </div>
                      )}

                      {isRevoked && p?.revocationReason && (
                        <p className="text-xs text-red-500 mt-1.5">Reason: {p.revocationReason}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleExpand(driver.id)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        {isExpanded ? "Hide" : "Docs"} ({driver._count.driverDocuments})
                      </button>

                      {p && !p.isVerified && !isRevoked && (
                        <button
                          onClick={() => handleAction(driver.id, "approve")}
                          disabled={actionLoading === driver.id}
                          className="text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}

                      {p && p.isVerified && !isRevoked && (
                        <button
                          onClick={() => setSuspendModal(driver.id)}
                          disabled={actionLoading === driver.id}
                          className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}

                      {isRevoked && (
                        <button
                          onClick={() => handleAction(driver.id, "reinstate")}
                          disabled={actionLoading === driver.id}
                          className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded documents */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-card-border bg-gray-50/50 dark:bg-white/[0.02] p-4 sm:p-5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Uploaded Documents
                    </h4>
                    {docsLoading === driver.id ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                        Loading documents...
                      </div>
                    ) : !docs[driver.id] || docs[driver.id].length === 0 ? (
                      <p className="text-sm text-gray-400">No documents uploaded yet</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {docs[driver.id].map((doc) => (
                          <div
                            key={doc.id}
                            className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-card-border p-3"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-foreground capitalize">
                                {doc.type.replace(/_/g, " ")}
                              </span>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  doc.status === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : doc.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">{doc.filename}</p>
                            {doc.reviewNote && (
                              <p className="text-[11px] text-gray-500 mt-1">Note: {doc.reviewNote}</p>
                            )}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              View Document
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

      {/* Suspend modal */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-card-border p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-1">Suspend Driver</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will revoke verification and take the driver offline.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-card-border bg-white dark:bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspendReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-foreground rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(suspendModal, "suspend", suspendReason)}
                disabled={actionLoading === suspendModal}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === suspendModal ? "Suspending..." : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
