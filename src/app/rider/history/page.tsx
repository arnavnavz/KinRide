"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { Avatar } from "@/components/Avatar";
import { PageSkeleton } from "@/components/Skeleton";

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  createdAt: string;
  estimatedFare?: number | null;
  driver?: { name: string } | null;
}

type Filter = "all" | "COMPLETED" | "CANCELED";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Canceled", value: "CANCELED" },
];

export default function RideHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/rides/request")
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  const filtered = filter === "all" ? rides : rides.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-foreground/50 hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-foreground">Ride History</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-foreground/60 border border-card-border hover:border-primary/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Ride list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium">No rides found</p>
            <p className="text-xs mt-1 text-foreground/30">
              {filter === "all"
                ? "You haven't taken any rides yet"
                : `No ${filter.toLowerCase()} rides`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ride) => (
              <Link
                key={ride.id}
                href={`/rider/ride/${ride.id}`}
                className="block bg-card border border-card-border rounded-xl p-4 hover:border-primary/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {ride.driver ? (
                      <Avatar name={ride.driver.name} size="sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ride.driver?.name ?? "No driver assigned"}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {new Date(ride.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <RideStatusBadge status={ride.status} />
                </div>

                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                  <span className="truncate">{ride.pickupAddress}</span>
                  <svg className="w-3 h-3 shrink-0 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  <span className="truncate">{ride.dropoffAddress}</span>
                </div>

                {ride.estimatedFare != null && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {ride.status === "COMPLETED" && (
                      <Link
                        href={`/rider/ride/${ride.id}/receipt`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Receipt
                      </Link>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      ${ride.estimatedFare.toFixed(2)}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
