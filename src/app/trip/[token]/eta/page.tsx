"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { geocodeAddress, type LatLng } from "@/lib/geocode";

const RideMap = dynamic(
  () => import("@/components/RideMap").then((m) => m.RideMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] rounded-2xl bg-gray-100 animate-pulse" />
    ),
  }
);

interface EtaRide {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  createdAt: string;
  rider: { name: string };
  driver: {
    name: string;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
    } | null;
  } | null;
}

const STATUS_STEPS = ["ACCEPTED", "ARRIVING", "IN_PROGRESS", "COMPLETED"];

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Driver Assigned",
  ARRIVING: "Arriving",
  IN_PROGRESS: "In Transit",
  COMPLETED: "Arrived",
};

function getStatusMessage(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "Looking for a driver...";
    case "OFFERED":
      return "Connecting with a driver...";
    case "ACCEPTED":
      return "Driver is on the way to pickup";
    case "ARRIVING":
      return "Driver is almost at pickup";
    case "IN_PROGRESS":
      return "Ride is in progress";
    case "COMPLETED":
      return "Ride has been completed";
    case "CANCELED":
      return "This ride was canceled";
    default:
      return "";
  }
}

function getEtaMinutes(status: string): number | null {
  if (status === "ACCEPTED") return 8;
  if (status === "ARRIVING") return 3;
  if (status === "IN_PROGRESS") return 15;
  return null;
}

function CountdownTimer({ minutes }: { minutes: number }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="text-center">
      <div className="text-5xl font-bold tabular-nums tracking-tight text-gray-900">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <p className="text-sm text-gray-500 mt-1">estimated minutes remaining</p>
    </div>
  );
}

function ProgressBar({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, i) => {
        const isActive = i <= currentIdx && currentIdx >= 0;
        const isCurrent = step === status;
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
                isActive ? "bg-primary" : "bg-gray-200"
              }`}
            />
            <span
              className={`text-[10px] font-medium transition-colors ${
                isCurrent
                  ? "text-primary"
                  : isActive
                  ? "text-gray-600"
                  : "text-gray-400"
              }`}
            >
              {STATUS_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SharedEtaPage() {
  const params = useParams();
  const token = params.token as string;
  const [ride, setRide] = useState<EtaRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);

  const fetchRide = useCallback(() => {
    fetch(`/api/rides/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setRide(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 10000);
    return () => clearInterval(interval);
  }, [fetchRide]);

  useEffect(() => {
    if (!ride) return;
    geocodeAddress(ride.pickupAddress).then(setPickupCoords);
    geocodeAddress(ride.dropoffAddress).then(setDropoffCoords);
  }, [ride?.pickupAddress, ride?.dropoffAddress]);

  const etaMinutes = useMemo(
    () => (ride ? getEtaMinutes(ride.status) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ride?.status]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading ETA...</p>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Trip not found or link has expired.</p>
        </div>
      </div>
    );
  }

  const statusMsg = getStatusMessage(ride.status);
  const isTerminal = ["COMPLETED", "CANCELED"].includes(ride.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1 mb-1">
            <span className="text-2xl font-bold text-primary">Kin</span>
            <span className="text-2xl font-light">Ride</span>
          </div>
          <p className="text-xs text-gray-400">Live ETA</p>
        </div>

        {/* ETA card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {etaMinutes && !isTerminal ? (
            <CountdownTimer minutes={etaMinutes} />
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{statusMsg}</p>
            </div>
          )}

          {etaMinutes && !isTerminal && (
            <p className="text-center text-sm text-gray-500">{statusMsg}</p>
          )}

          {!isTerminal && ride.status !== "REQUESTED" && ride.status !== "OFFERED" && (
            <ProgressBar status={ride.status} />
          )}

          {isTerminal && (
            <div className="flex justify-center">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  ride.status === "COMPLETED"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {ride.status === "COMPLETED" ? "Ride Completed" : "Ride Canceled"}
              </span>
            </div>
          )}
        </div>

        {/* Map */}
        {(pickupCoords || dropoffCoords) && (
          <div className="h-[250px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <RideMap
              pickup={pickupCoords}
              dropoff={dropoffCoords}
              className="h-full"
            />
          </div>
        )}

        {/* Route info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full shrink-0" />
              <div className="w-px h-6 bg-gray-200" />
              <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Pickup</p>
                <p className="text-sm text-gray-800">{ride.pickupAddress}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Dropoff</p>
                <p className="text-sm text-gray-800">{ride.dropoffAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver info */}
        {ride.driver && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">Driver</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {ride.driver.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{ride.driver.name}</p>
                {ride.driver.driverProfile && (
                  <p className="text-xs text-gray-400">
                    {ride.driver.driverProfile.vehicleColor}{" "}
                    {ride.driver.driverProfile.vehicleMake}{" "}
                    {ride.driver.driverProfile.vehicleModel}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-gray-400 text-center">
          Auto-refreshes every 10s &middot; Shared via KinRide
        </p>
      </div>
    </div>
  );
}
