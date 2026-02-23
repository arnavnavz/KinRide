"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { ChatPanel } from "@/components/ChatPanel";
import { Avatar } from "@/components/Avatar";
import { haptic } from "@/lib/haptic";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useSocket } from "@/hooks/useSocket";
import { geocodeAddress, type LatLng } from "@/lib/geocode";

const RideMap = dynamic(() => import("@/components/RideMap").then((m) => m.RideMap), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-2xl bg-gray-100 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />,
});

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  riderId: string;
  driverId: string | null;
  shareToken: string;
  preferKin: boolean;
  estimatedFare: number | null;
  platformFee: number | null;
  isKinRide: boolean;
  createdAt: string;
  rider: { id: string; name: string; phone: string | null };
  driver: {
    id: string;
    name: string;
    phone: string | null;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
      kinCode: string;
    } | null;
  } | null;
}

function simulateDriverLocation(pickup: LatLng, status: string): LatLng | null {
  if (!["ACCEPTED", "ARRIVING"].includes(status)) return null;
  const offset = status === "ACCEPTED" ? 0.015 : 0.004;
  return {
    lat: pickup.lat + offset * (Math.random() > 0.5 ? 1 : -1),
    lng: pickup.lng + offset * (Math.random() > 0.5 ? 1 : -1),
  };
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "REQUESTED": return "Looking for a driver nearby...";
    case "OFFERED": return "Sending your request to drivers...";
    case "ACCEPTED": return "Your driver is on the way!";
    case "ARRIVING": return "Driver is almost there";
    case "IN_PROGRESS": return "Enjoy your ride!";
    case "COMPLETED": return "You have arrived";
    case "CANCELED": return "This ride was canceled";
    default: return "";
  }
}

export default function RiderRidePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const rideId = params.id as string;
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSOS, setShowSOS] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [driverCoords, setDriverCoords] = useState<LatLng | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [addingKin, setAddingKin] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const { joinRide, onEvent } = useSocket();

  const loadRide = useCallback(async () => {
    const res = await fetch(`/api/rides/${rideId}`);
    if (res.ok) {
      setRide(await res.json());
    }
    setLoading(false);
  }, [rideId]);

  useEffect(() => {
    loadRide();
    joinRide(rideId);
    const interval = setInterval(loadRide, 5000);
    return () => clearInterval(interval);
  }, [rideId, loadRide, joinRide]);

  useEffect(() => {
    const unsub1 = onEvent("ride:status", () => loadRide());
    const unsub2 = onEvent("ride:accepted", () => loadRide());
    return () => { unsub1(); unsub2(); };
  }, [onEvent, loadRide]);

  useEffect(() => {
    if (!ride) return;
    geocodeAddress(ride.pickupAddress).then((c) => {
      if (c) {
        setPickupCoords(c);
        const sim = simulateDriverLocation(c, ride.status);
        setDriverCoords(sim);
        if (sim) {
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(c.lat - sim.lat);
          const dLng = toRad(c.lng - sim.lng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(sim.lat)) * Math.cos(toRad(c.lat)) * Math.sin(dLng / 2) ** 2;
          const dist = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          setEtaMinutes(Math.max(1, Math.round(dist * 1.3 * 2.5)));
        }
      }
    });
    geocodeAddress(ride.dropoffAddress).then(setDropoffCoords);
  }, [ride?.pickupAddress, ride?.dropoffAddress, ride?.status]);

  useEffect(() => {
    if (!pickupCoords || !ride || ride.status !== "ARRIVING") return;
    const interval = setInterval(() => {
      setDriverCoords((prev) => {
        if (!prev || !pickupCoords) return prev;
        return {
          lat: prev.lat + (pickupCoords.lat - prev.lat) * 0.15,
          lng: prev.lng + (pickupCoords.lng - prev.lng) * 0.15,
        };
      });
      setEtaMinutes((prev) => prev ? Math.max(1, prev - 1) : null);
    }, 3000);
    return () => clearInterval(interval);
  }, [pickupCoords, ride?.status]);

  useEffect(() => {
    if (ride?.status === "COMPLETED" && ride?.driverId) {
      fetch(`/api/ratings?rideRequestId=${ride.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.rating) setHasRated(true);
        })
        .catch(() => {});
    }
  }, [ride?.status, ride?.id, ride?.driverId]);

  const cancelRide = async () => {
    haptic("heavy");
    setCanceling(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      if (res.ok) {
        toast("Ride canceled", "info");
        loadRide();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to cancel ride", "error");
      }
    } catch {
      toast("Failed to cancel ride", "error");
    } finally {
      setCanceling(false);
      setShowCancelModal(false);
      setCancelReason("");
    }
  };

  const addToKin = async () => {
    if (!ride?.driver?.driverProfile?.kinCode) return;
    setAddingKin(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinCode: ride.driver.driverProfile.kinCode }),
      });
      if (res.ok) {
        toast("Driver added to your Kin!", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to add driver", "error");
      }
    } catch {
      toast("Failed to add driver", "error");
    } finally {
      setAddingKin(false);
    }
  };

  const shareTrip = () => {
    if (!ride) return;
    const url = `${window.location.origin}/trip/${ride.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast("Trip link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRating = async () => {
    if (!ride?.driverId) return;
    setSubmittingRating(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideRequestId: ride.id,
          driverId: ride.driverId,
          stars: ratingStars,
          comment: ratingComment || undefined,
        }),
      });
      if (res.ok) {
        toast("Thanks for rating!", "success");
        setShowRating(false);
        setHasRated(true);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to submit rating", "error");
      }
    } catch {
      toast("Failed to submit rating", "error");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <CardSkeleton />
        <div className="h-[300px] rounded-2xl bg-gray-100 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <CardSkeleton />
      </div>
    );
  }
  if (!ride) return <div className="text-center py-20 text-gray-500">Ride not found.</div>;

  const isActive = ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status);
  const showDriverOnMap = ride.driver && ["ACCEPTED", "ARRIVING"].includes(ride.status);
  const statusMsg = getStatusMessage(ride.status);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cancel reason modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-animate flex items-center justify-center z-50"
          onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm mx-4 w-full animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Why are you canceling?
            </h3>
            <div className="space-y-2 mb-5">
              {["Driver too far", "Changed my plans", "Found another ride", "Accidentally requested", "Other"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setCancelReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    cancelReason === reason
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={cancelRide}
                disabled={!cancelReason || canceling}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
              >
                {canceling ? "Canceling..." : "Cancel Ride"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Your Ride</h1>
            <RideStatusBadge status={ride.status} />
          </div>
          {statusMsg && (
            <p className="text-sm text-gray-500 mt-1">{statusMsg}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={shareTrip}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? "Link copied!" : "Share Trip"}
          </button>
          <button
            onClick={() => setShowSOS(true)}
            className="text-xs bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            SOS
          </button>
        </div>
      </div>

      {/* ETA bar */}
      {etaMinutes && ["ACCEPTED", "ARRIVING"].includes(ride.status) && (
        <div className="bg-primary text-white rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in">
          <span className="text-sm font-medium">
            {ride.status === "ARRIVING" ? "Arriving in" : "Driver ETA"}
          </span>
          <span className="text-lg font-bold">
            {etaMinutes} min
          </span>
        </div>
      )}

      {/* Map */}
      {(pickupCoords || dropoffCoords) && (
        <div className="h-[300px]">
          <RideMap
            pickup={pickupCoords}
            dropoff={dropoffCoords}
            driverLocation={showDriverOnMap ? driverCoords : null}
            className="h-full"
          />
        </div>
      )}

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/40 backdrop-animate flex items-center justify-center z-50" onClick={() => setShowSOS(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Emergency SOS</h3>
            <p className="text-sm text-gray-500 mb-4">
              In a real emergency, call 911. This button would alert emergency contacts and KinRide safety team.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSOS(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                Call 911
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ride details card */}
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

        {ride.driver && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-2">Your Driver</p>
            <div className="flex items-center gap-3">
              <Avatar name={ride.driver.name} size="md" />
              <div className="flex-1">
                <p className="font-medium text-sm">{ride.driver.name}</p>
                <p className="text-xs text-gray-400">
                  {ride.driver.driverProfile?.vehicleColor}{" "}
                  {ride.driver.driverProfile?.vehicleMake}{" "}
                  {ride.driver.driverProfile?.vehicleModel}{" · "}
                  {ride.driver.driverProfile?.licensePlate}
                </p>
              </div>
              {ride.driver.phone && ["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status) && (
                <a
                  href={`tel:${ride.driver.phone}`}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shrink-0"
                  aria-label="Call Driver"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fare breakdown */}
      {ride.estimatedFare && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Fare</span>
            <span className="text-lg font-bold text-primary">${ride.estimatedFare.toFixed(2)}</span>
          </div>
          {ride.status === "COMPLETED" && ride.platformFee != null && (
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Driver earnings</span>
                <span className="font-medium text-gray-700">
                  ${(ride.estimatedFare - ride.platformFee).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platform fee ({ride.isKinRide ? "Kin rate" : "Standard"})</span>
                <span>${ride.platformFee.toFixed(2)}</span>
              </div>
              {ride.isKinRide && (
                <p className="text-[11px] text-primary/70 pt-1">
                  Your driver kept {Math.round(((ride.estimatedFare - ride.platformFee) / ride.estimatedFare) * 100)}% of the fare thanks to the Kin discount
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isActive && ride.status !== "IN_PROGRESS" && (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={canceling}
            className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {canceling ? "Canceling..." : "Cancel Ride"}
          </button>
        )}
        {ride.status === "COMPLETED" && ride.driver && !hasRated && (
          <button
            onClick={() => setShowRating(true)}
            className="flex-1 bg-accent/10 text-accent py-2.5 rounded-xl text-sm font-medium hover:bg-accent/20 transition-colors active:scale-[0.98]"
          >
            Rate Driver
          </button>
        )}
        {ride.status === "COMPLETED" && ride.driver && (
          <button
            onClick={addToKin}
            disabled={addingKin}
            className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {addingKin ? "Adding..." : "Add Driver to Kin"}
          </button>
        )}
        <button
          onClick={() => router.push("/rider/request")}
          className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors active:scale-[0.98]"
        >
          Back to Request
        </button>
      </div>

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/40 backdrop-animate flex items-center justify-center z-50" onClick={() => setShowRating(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 w-full animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Rate your driver</h3>
            <p className="text-sm text-gray-500 mb-4">How was your ride with {ride.driver?.name}?</p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => { setRatingStars(star); haptic("light"); }}
                  className="text-3xl transition-transform hover:scale-125 active:scale-95"
                >
                  {star <= ratingStars ? (
                    <span className="text-amber-400">&#9733;</span>
                  ) : (
                    <span className="text-gray-300">&#9733;</span>
                  )}
                </button>
              ))}
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRating(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={submitRating}
                disabled={submittingRating}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors"
              >
                {submittingRating ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      {ride.driver && ["OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(ride.status) && session?.user && (
        <ChatPanel
          rideId={ride.id}
          currentUserId={session.user.id}
          receiverId={ride.driver.id}
        />
      )}
    </div>
  );
}
