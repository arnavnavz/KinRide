"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";

const HeatMapView = dynamic(() => import("@/components/HeatMapView").then(m => m.HeatMapView), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] bg-subtle rounded-xl flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface HeatZone {
  lat: number;
  lng: number;
  intensity: number;
  requestCount: number;
  driverCount: number;
}

interface HeatMapData {
  zones: HeatZone[];
  stats: {
    totalRequests: number;
    totalDrivers: number;
    surgeActive: boolean;
    updatedAt: string;
  };
}

export default function DriverHeatMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [data, setData] = useState<HeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 42.36, lng: -71.06 }) // Default to Boston
      );
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/heatmap");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to load heatmap:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-subtle rounded-lg w-48" />
        <div className="h-[60vh] bg-subtle rounded-xl" />
      </div>
    );
  }

  if (session?.user?.role !== "DRIVER") {
    return <div className="text-center py-20 text-foreground/50">This page is for drivers only.</div>;
  }

  const stats = data?.stats;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Demand Map</h1>
        <button
          onClick={loadData}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-card-border p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalRequests}</p>
            <p className="text-xs text-foreground/50">Active Requests</p>
          </div>
          <div className="bg-card rounded-xl border border-card-border p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalDrivers}</p>
            <p className="text-xs text-foreground/50">Drivers Online</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${
            stats.surgeActive
              ? "bg-red-50 border-red-200"
              : "bg-card border-card-border"
          }`}>
            <p className={`text-lg font-bold ${stats.surgeActive ? "text-red-600" : "text-green-600"}`}>
              {stats.surgeActive ? "Surge" : "Normal"}
            </p>
            <p className="text-xs text-foreground/50">Pricing</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-card-border shadow-sm">
        <HeatMapView
          zones={data?.zones || []}
          center={userLocation || { lat: 42.36, lng: -71.06 }}
        />
      </div>

      {/* Legend */}
      <div className="bg-card rounded-xl border border-card-border p-4">
        <p className="text-xs font-semibold text-foreground/70 mb-3">Demand Legend</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-400 opacity-60" />
            <span className="text-xs text-foreground/60">Low demand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-400 opacity-60" />
            <span className="text-xs text-foreground/60">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 opacity-60" />
            <span className="text-xs text-foreground/60">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 opacity-70" />
            <span className="text-xs text-foreground/60">Surge</span>
          </div>
        </div>
        <p className="text-[10px] text-foreground/40 mt-3">
          Drive towards warmer zones to find more ride requests. Data refreshes every 30 seconds.
        </p>
      </div>
    </div>
  );
}
