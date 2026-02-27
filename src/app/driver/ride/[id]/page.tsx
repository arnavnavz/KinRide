"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n-context";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { ChatPanel } from "@/components/ChatPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useSocket } from "@/hooks/useSocket";
import { geocodeAddress, type LatLng } from "@/lib/geocode";

const RideMap = dynamic(() => import("@/components/RideMap").then((m) => m.RideMap), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-2xl bg-gray-100 animate-pulse" />,
});

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  riderId: string;
  driverId: string | null;
  createdAt: string;
  riderNote: string | null;
  rider: { id: string; name: string; phone: string | null };
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
}

const statusFlow: Record<string, { next: string; label: string }> = {
  ACCEPTED: { next: "ARRIVING", label: t("driver.on_my_way") },
  ARRIVING: { next: "IN_PROGRESS", label: t("driver.start_ride") },
  IN_PROGRESS: { next: "COMPLETED", label: t("driver.complete_ride") },
};

export default function DriverRidePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const params = useParams();
  const { toast } = useToast();
  const rideId = params.id as string;
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [sharingLocation, setSharingLocation] = useState(true);
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const lastEmitRef = useRef(0);
  const lastPersistRef = useRef(0);
  const { joinRide, emitRideStatus, emitDriverLocation, onEvent } = useSocket();

  const loadRide = useCallback(async () => {
    const res = await fetch(`/api/rides/${rideId}`);
    if (res.ok) setRide(await res.json());
    setLoading(false);
  }, [rideId]);

  useEffect(() => {
    loadRide();
    joinRide(rideId);
  }, [rideId, loadRide, joinRide]);

  useEffect(() => {
    const unsub = onEvent("ride:status", () => loadRide());
    return unsub;
  }, [onEvent, loadRide]);

  useEffect(() => {
    if (!ride) return;
    geocodeAddress(ride.pickupAddress).then(setPickupCoords);
    geocodeAddress(ride.dropoffAddress).then(setDropoffCoords);
  }, [ride?.pickupAddress, ride?.dropoffAddress]);

  useEffect(() => {
    const isActive = ["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride?.status ?? "");
    if (!isActive || !sharingLocation) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;
        setDriverLocation({ lat, lng });

        const now = Date.now();
        if (now - lastEmitRef.current >= 3000) {
          lastEmitRef.current = now;
          emitDriverLocation(rideId, lat, lng, heading, speed);
        }
        // Persist to DB every 30s (socket handles real-time; DB is fallback)
        if (now - lastPersistRef.current >= 30000) {
          lastPersistRef.current = now;
          fetch("/api/driver/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, heading, speed }),
          }).catch(() => {});
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ride?.status, sharingLocation, rideId, emitDriverLocation]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRide(updated);
        emitRideStatus(rideId, newStatus, updated);
        if (newStatus === "COMPLETED") toast("Ride completed!", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update status", "error");
      }
    } catch {
      toast("Failed to update status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const cancelRide = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRide(updated);
        emitRideStatus(rideId, "CANCELED", updated);
        toast("Ride canceled", "info");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to cancel ride", "error");
      }
    } catch {
      toast("Failed to cancel ride", "error");
    } finally {
      setUpdating(false);
      setShowCancelConfirm(false);
    }
  };

  const getNavigationUrl = (): string | null => {
    if (["ACCEPTED", "ARRIVING"].includes(ride?.status ?? "") && pickupCoords) {
      return `https://maps.apple.com/?daddr=${pickupCoords.lat},${pickupCoords.lng}`;
    }
    if (ride?.status === "IN_PROGRESS" && dropoffCoords) {
      return `https://maps.apple.com/?daddr=${dropoffCoords.lat},${dropoffCoords.lng}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <CardSkeleton />
        <div className="h-[280px] rounded-2xl bg-gray-100 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <CardSkeleton />
      </div>
    );
  }
  if (!ride) return <div className="text-center py-20 text-gray-500">Ride not found.</div>;

  const nextAction = statusFlow[ride.status];
  const isActive = ["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status);
  const navUrl = getNavigationUrl();

  return (
    <div className="space-y-5 animate-fade-in">
      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Ride?"
        message="Are you sure you want to cancel this ride? The rider will be notified."
        confirmLabel="Cancel Ride"
        variant="danger"
        onConfirm={cancelRide}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("driver.active_ride")}</h1>
          <RideStatusBadge status={ride.status} />
        </div>
        <button
          onClick={() => router.push("/driver/dashboard")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("driver.back_to_dashboard")}
        </button>
      </div>

      {/* Map */}
      {(pickupCoords || dropoffCoords) && (
        <div className="h-[280px]">
          <RideMap
            pickup={pickupCoords}
            dropoff={dropoffCoords}
            driverLocation={isActive ? driverLocation : null}
            className="h-full"
          />
        </div>
      )}

      {/* Share Location Toggle */}
      {isActive && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{t("driver.share_location")}</span>
          </div>
          <button
            onClick={() => setSharingLocation((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${sharingLocation ? "bg-primary" : "bg-gray-300"}`}
            aria-label="Toggle location sharing"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sharingLocation ? "translate-x-5" : ""}`}
            />
          </button>
        </div>
      )}

      {/* Ride Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Pickup</p>
              <p className="text-sm font-medium">{ride.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Dropoff</p>
              <p className="text-sm font-medium">{ride.dropoffAddress}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 mb-2">Rider</p>
          <div className="flex items-center gap-3">
            <Avatar name={ride.rider.name} size="md" />
            <div className="flex-1">
              <p className="font-medium text-sm">{ride.rider.name}</p>
              {ride.rider.phone && (
                <p className="text-xs text-gray-400">{ride.rider.phone}</p>
              )}
            </div>
            {ride.rider.phone && isActive && (
              <a
                href={`tel:${ride.rider.phone}`}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shrink-0"
                aria-label="Call Rider"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
          </div>
          {ride.riderNote && (
            <div className="flex items-start gap-2 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">{ride.riderNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Buttons */}
      {isActive && (
        <div className="flex gap-2">
          {nextAction && (
            <button
              onClick={() => updateStatus(nextAction.next)}
              disabled={updating}
              className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm"
            >
              {updating ? "Updating..." : nextAction.label}
            </button>
          )}
          {navUrl && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-50 text-blue-600 px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Navigate
            </a>
          )}
          {ride.status !== "IN_PROGRESS" && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={updating}
              className="bg-red-50 text-red-600 px-5 py-3 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {ride.status === "COMPLETED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700">
          Ride completed. Great job!
        </div>
      )}

      {ride.status === "CANCELED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-700">
          This ride has been canceled.
        </div>
      )}

      {/* Chat */}
      {["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status) && session?.user && (
        <ChatPanel
          rideId={ride.id}
          currentUserId={session.user.id}
          receiverId={ride.riderId}
        />
      )}
    </div>
  );
}
