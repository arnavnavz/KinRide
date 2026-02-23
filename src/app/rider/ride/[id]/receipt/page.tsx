"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  estimatedFare: number | null;
  platformFee: number | null;
  isKinRide: boolean;
  createdAt: string;
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

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rideId = params.id as string;
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rides/${rideId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "COMPLETED") {
          router.replace(`/rider/ride/${rideId}`);
          return;
        }
        setRide(data);
      })
      .catch(() => router.replace(`/rider/ride/${rideId}`))
      .finally(() => setLoading(false));
  }, [rideId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 max-w-lg mx-auto animate-fade-in">
        <CardSkeleton />
        <div className="mt-4"><CardSkeleton /></div>
      </div>
    );
  }

  if (!ride) return null;

  const fare = ride.estimatedFare ?? 0;
  const platformFee = ride.platformFee ?? 0;
  const driverEarnings = fare - platformFee;
  const rideDate = new Date(ride.createdAt);

  const formattedDate = rideDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = rideDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const receiptText = [
    "=== KinRide Trip Receipt ===",
    "",
    `Date: ${formattedDate}`,
    `Time: ${formattedTime}`,
    "",
    `From: ${ride.pickupAddress}`,
    `To:   ${ride.dropoffAddress}`,
    "",
    ride.driver
      ? `Driver: ${ride.driver.name}`
      : "",
    ride.driver?.driverProfile
      ? `Vehicle: ${ride.driver.driverProfile.vehicleColor} ${ride.driver.driverProfile.vehicleMake} ${ride.driver.driverProfile.vehicleModel} (${ride.driver.driverProfile.licensePlate})`
      : "",
    "",
    "--- Fare Breakdown ---",
    `Base fare:       $${fare.toFixed(2)}`,
    `Platform fee:    $${platformFee.toFixed(2)}`,
    `Driver earnings: $${driverEarnings.toFixed(2)}`,
    ride.isKinRide ? "Kin discount applied" : "",
    "",
    `TOTAL: $${fare.toFixed(2)}`,
    "",
    `Trip ID: ${ride.id}`,
    "===========================",
  ]
    .filter(Boolean)
    .join("\n");

  const shareReceipt = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      toast("Receipt copied to clipboard!", "success");
    } catch {
      toast("Could not copy receipt", "error");
    }
  };

  const downloadReceipt = () => {
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinride-receipt-${ride.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Receipt card */}
        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">KinRide</span>
            </div>
            <h1 className="text-white/90 text-sm font-medium">Trip Receipt</h1>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Date & time */}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{formattedDate}</p>
              <p className="text-xs text-foreground/50">{formattedTime}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-card-border" />

            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-foreground/40 uppercase tracking-wider">Pickup</p>
                  <p className="text-sm font-medium text-foreground">{ride.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-foreground/40 uppercase tracking-wider">Dropoff</p>
                  <p className="text-sm font-medium text-foreground">{ride.dropoffAddress}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-card-border" />

            {/* Driver */}
            {ride.driver && (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={ride.driver.name} size="md" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ride.driver.name}</p>
                    {ride.driver.driverProfile && (
                      <p className="text-xs text-foreground/50">
                        {ride.driver.driverProfile.vehicleColor}{" "}
                        {ride.driver.driverProfile.vehicleMake}{" "}
                        {ride.driver.driverProfile.vehicleModel}
                        {" · "}
                        {ride.driver.driverProfile.licensePlate}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-dashed border-card-border" />
              </>
            )}

            {/* Fare breakdown */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Fare Breakdown
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">Base fare</span>
                  <span className="font-medium text-foreground">${fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">
                    Platform fee{ride.isKinRide ? " (Kin rate)" : ""}
                  </span>
                  <span className="font-medium text-foreground">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Driver earnings</span>
                  <span className="font-medium text-foreground">${driverEarnings.toFixed(2)}</span>
                </div>
              </div>

              {ride.isKinRide && (
                <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-xs text-primary font-medium">
                    Kin discount applied — driver kept{" "}
                    {fare > 0 ? Math.round((driverEarnings / fare) * 100) : 0}% of fare
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-card-border" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">${fare.toFixed(2)}</span>
            </div>

            {/* Trip ID */}
            <p className="text-[11px] text-foreground/30 text-center font-mono">
              Trip ID: {ride.id}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={shareReceipt}
                className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Receipt
              </button>
              <button
                onClick={downloadReceipt}
                className="flex-1 flex items-center justify-center gap-2 bg-foreground/5 text-foreground/70 py-2.5 rounded-xl text-sm font-medium hover:bg-foreground/10 transition-colors active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </button>
            </div>

            <Link
              href={`/rider/ride/${ride.id}`}
              className="block text-center text-sm text-foreground/50 hover:text-foreground/70 transition-colors py-2"
            >
              ← Back to ride
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
