"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { PageSkeleton } from "@/components/Skeleton";

interface ScheduledRide {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  scheduledAt: string;
  estimatedFare?: number | null;
  driver?: { name: string } | null;
}

function getCountdown(scheduledAt: string): string {
  const now = Date.now();
  const target = new Date(scheduledAt).getTime();
  const diff = target - now;
  if (diff <= 0) return "now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

export default function ScheduledRidesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/rides/request")
      .then((r) => r.json())
      .then((data: ScheduledRide[]) => {
        const upcoming = (Array.isArray(data) ? data : []).filter(
          (r) =>
            r.scheduledAt &&
            new Date(r.scheduledAt).getTime() > Date.now() &&
            r.status !== "COMPLETED" &&
            r.status !== "CANCELED"
        );
        upcoming.sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
        setRides(upcoming);
      })
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [status]);

  // Tick every minute to keep countdowns fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (rideId: string) => {
    setCanceling(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/cancel`, { method: "POST" });
      if (res.ok) {
        setRides((prev) => prev.filter((r) => r.id !== rideId));
      }
    } catch {
      /* ignore */
    } finally {
      setCanceling(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-foreground">Scheduled Rides</h1>
        </div>

        {rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">No upcoming rides</p>
            <p className="text-xs mt-1 text-foreground/30">
              Schedule a ride to see it here
            </p>
            <Link
              href="/rider/request"
              className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-all active:scale-[0.98]"
            >
              Book a ride
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => {
              const dt = new Date(ride.scheduledAt);
              return (
                <div
                  key={ride.id}
                  className="bg-card border border-card-border rounded-xl p-4 animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {dt.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {dt.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        {getCountdown(ride.scheduledAt)}
                      </p>
                    </div>
                    <RideStatusBadge status={ride.status} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-foreground/60 mb-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                    <span className="truncate">{ride.pickupAddress}</span>
                    <svg className="w-3 h-3 shrink-0 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                    <span className="truncate">{ride.dropoffAddress}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    {ride.estimatedFare != null && (
                      <span className="text-sm font-semibold text-foreground">
                        ${ride.estimatedFare.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => handleCancel(ride.id)}
                      disabled={canceling === ride.id}
                      className="ml-auto px-3.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50"
                    >
                      {canceling === ride.id ? "Canceling…" : "Cancel ride"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
