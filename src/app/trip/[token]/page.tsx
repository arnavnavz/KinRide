"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { RideStatusBadge } from "@/components/RideStatusBadge";

interface SharedTrip {
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

export default function SharedTripPage() {
  const params = useParams();
  const token = params.token as string;
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rides/share/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setTrip)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetch(`/api/rides/share/${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setTrip(data); });
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-500">Trip not found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1 mb-2">
            <span className="text-2xl font-bold text-primary">Kin</span>
            <span className="text-2xl font-light">Ride</span>
          </div>
          <p className="text-sm text-gray-500">Shared Trip Details</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{trip.rider.name}&apos;s Trip</span>
            <RideStatusBadge status={trip.status} />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">From</p>
                <p className="text-sm">{trip.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">To</p>
                <p className="text-sm">{trip.dropoffAddress}</p>
              </div>
            </div>
          </div>

          {trip.driver && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-1">Driver</p>
              <p className="text-sm font-medium">{trip.driver.name}</p>
              {trip.driver.driverProfile && (
                <p className="text-xs text-gray-400">
                  {trip.driver.driverProfile.vehicleColor}{" "}
                  {trip.driver.driverProfile.vehicleMake}{" "}
                  {trip.driver.driverProfile.vehicleModel}{" · "}
                  {trip.driver.driverProfile.licensePlate}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 pt-2 text-center">
            This page auto-refreshes every 10 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
