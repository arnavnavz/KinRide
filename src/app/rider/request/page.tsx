"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { AddressInput } from "@/components/AddressInput";
import { Avatar } from "@/components/Avatar";
import type { LatLng } from "@/lib/geocode";
import { haptic } from "@/lib/haptic";

const RideMap = dynamic(() => import("@/components/RideMap").then((m) => m.RideMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%]" />,
});

type BookingStep = "search" | "select-type" | "confirm";

interface RideType {
  id: string;
  label: string;
  desc: string;
  icon: string;
  multiplier: number;
  eta: string;
}

const RIDE_TYPES: RideType[] = [
  { id: "regular", label: "KinRide", desc: "Affordable everyday rides", icon: "🚗", multiplier: 1.0, eta: "3-5 min" },
  { id: "xl", label: "KinRide XL", desc: "Extra space for groups", icon: "🚙", multiplier: 1.5, eta: "5-8 min" },
  { id: "premium", label: "KinRide Premium", desc: "Top-rated drivers, luxury feel", icon: "✨", multiplier: 2.0, eta: "5-10 min" },
];

interface SavedPlace {
  label: string;
  address: string;
  coords: LatLng;
}

interface RecentSearch {
  address: string;
  coords: LatLng;
  timestamp: number;
}

interface Favorite {
  id: string;
  driver: {
    id: string;
    name: string;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      isOnline: boolean;
      kinCode: string;
    } | null;
  };
}

export default function RequestRidePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<BookingStep>("search");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [selectedType, setSelectedType] = useState("regular");
  const [preferKin, setPreferKin] = useState(false);
  const [specificDriverId, setSpecificDriverId] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [baseFare, setBaseFare] = useState<number | null>(null);
  const [estimatingFare, setEstimatingFare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Auto-detect location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setPickupCoords(loc);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`,
            { headers: { "User-Agent": "KinRide/1.0" } }
          );
          const data = await res.json();
          if (data.display_name) {
            setPickup(data.display_name.split(",").slice(0, 3).join(",").trim());
          }
        } catch { /* ignore */ }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    fetch("/api/favorites").then((r) => r.json()).then(setFavorites).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const sp = localStorage.getItem("kinride-saved-places");
      if (sp) setSavedPlaces(JSON.parse(sp));
      const rs = localStorage.getItem("kinride-recent-searches");
      if (rs) setRecentSearches(JSON.parse(rs));
    } catch { /* corrupted data */ }
  }, []);

  const savePlace = (label: string) => {
    if (!dropoff || !dropoffCoords) return;
    const updated = savedPlaces.filter((p) => p.label !== label);
    updated.push({ label, address: dropoff, coords: dropoffCoords });
    setSavedPlaces(updated);
    localStorage.setItem("kinride-saved-places", JSON.stringify(updated));
    setShowSaveDropdown(false);
  };

  const removePlace = (label: string) => {
    const updated = savedPlaces.filter((p) => p.label !== label);
    setSavedPlaces(updated);
    localStorage.setItem("kinride-saved-places", JSON.stringify(updated));
  };

  const applyPlace = (place: SavedPlace) => {
    setDropoff(place.address);
    setDropoffCoords(place.coords);
  };

  const applyRecentSearch = (search: RecentSearch) => {
    setDropoff(search.address);
    setDropoffCoords(search.coords);
  };

  const addRecentSearch = (address: string, coords: LatLng) => {
    const filtered = recentSearches.filter((r) => r.address !== address);
    const updated = [{ address, coords, timestamp: Date.now() }, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("kinride-recent-searches", JSON.stringify(updated));
  };

  const fetchFareEstimate = useCallback(async () => {
    if (!pickup || !dropoff || pickup.length < 3 || dropoff.length < 3) return;
    setEstimatingFare(true);
    try {
      const res = await fetch("/api/rides/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupAddress: pickup, dropoffAddress: dropoff }),
      });
      if (res.ok) {
        const data = await res.json();
        setBaseFare(data.estimatedFare);
        if (pickupCoords && dropoffCoords) {
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(dropoffCoords.lat - pickupCoords.lat);
          const dLng = toRad(dropoffCoords.lng - pickupCoords.lng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pickupCoords.lat)) * Math.cos(toRad(dropoffCoords.lat)) * Math.sin(dLng / 2) ** 2;
          const straight = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          setDistanceMiles(Math.round(straight * 1.3 * 10) / 10);
          setDurationMinutes(Math.round(straight * 1.3 * 2.5));
        }
      }
    } catch { /* ignore */ }
    setEstimatingFare(false);
  }, [pickup, dropoff, pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      fetchFareEstimate();
    } else {
      setBaseFare(null);
      setDistanceMiles(null);
      setDurationMinutes(null);
    }
  }, [pickupCoords, dropoffCoords, fetchFareEstimate]);

  const proceedToTypeSelect = () => {
    if (!pickupCoords || !dropoffCoords) return;
    setStep("select-type");
    setSheetExpanded(true);
  };

  const proceedToConfirm = () => {
    setStep("confirm");
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    haptic("heavy");
    try {
      const res = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: pickup,
          dropoffAddress: dropoff,
          preferKin,
          specificDriverId: specificDriverId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.toString() || "Failed to create ride");
        return;
      }
      const ride = await res.json();
      if (dropoff && dropoffCoords) addRecentSearch(dropoff, dropoffCoords);
      router.push(`/rider/ride/${ride.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="fixed inset-0 bg-background flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (session?.user?.role !== "RIDER") {
    return <div className="text-center py-20 text-foreground/60">This page is for riders only.</div>;
  }

  const selectedRide = RIDE_TYPES.find((r) => r.id === selectedType)!;
  const fareForType = baseFare ? Math.round(baseFare * selectedRide.multiplier * 100) / 100 : null;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden relative">
      {/* Top bar — always visible, above everything */}
      <div className="absolute top-0 left-0 right-0 z-[60] safe-top px-4 pb-3 flex items-end justify-between">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-card shadow-lg rounded-full w-11 h-11 flex items-center justify-center border border-card-border active:scale-95 transition-transform"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[59]" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-48 bg-card rounded-xl shadow-xl border border-card-border overflow-hidden animate-slide-down z-[61]">
                <Link
                  href="/rider/chats"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chats
                </Link>
                <Link
                  href="/rider/history"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ride History
                </Link>
                <Link
                  href="/rider/kin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  My Kin
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-card shadow-lg rounded-full px-5 py-2.5 border border-card-border">
          <span className="text-base font-bold text-primary">Kin</span>
          <span className="text-base font-light text-foreground">Ride</span>
        </div>
        {session?.user && (
          <Link href="/rider/kin" className="active:scale-95 transition-transform">
            <Avatar name={session.user.name || "U"} size="sm" />
          </Link>
        )}
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative min-h-0">
        <RideMap
          pickup={pickupCoords}
          dropoff={dropoffCoords}
          userLocation={userLocation}
          className="absolute inset-0"
          rounded={false}
        />

        {/* Recenter button */}
        {userLocation && (
          <button
            onClick={() => {
              setPickupCoords(userLocation);
            }}
            className="absolute bottom-4 right-4 z-10 bg-card shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-card-border"
            aria-label="Center on my location"
          >
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2M2 12h2m16 0h2" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={`relative z-30 bg-card border-t border-card-border rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ${
          sheetExpanded ? "max-h-[80vh]" : "max-h-[45vh]"
        } overflow-hidden flex flex-col`}
        style={{ ["--sheet-height" as string]: sheetExpanded ? "80%" : "45%" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab" onClick={() => setSheetExpanded(!sheetExpanded)}>
          <div className="w-10 h-1 bg-foreground/15 rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* STEP: Search */}
          {step === "search" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-foreground">Where to?</h2>

              {/* Saved places */}
              <div className="flex gap-2">
                {(() => {
                  const home = savedPlaces.find((p) => p.label === "Home");
                  return home ? (
                    <button
                      onClick={() => applyPlace(home)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-all active:scale-95 group"
                    >
                      <span>🏠</span>
                      <span className="truncate max-w-[100px]">Home</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); removePlace("Home"); }}
                        className="ml-0.5 opacity-0 group-hover:opacity-100 text-primary/50 hover:text-primary transition-opacity"
                      >×</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (dropoff && dropoffCoords) savePlace("Home");
                      }}
                      disabled={!dropoff || !dropoffCoords}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-foreground/20 text-foreground/40 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>🏠</span>
                      Set Home
                    </button>
                  );
                })()}
                {(() => {
                  const work = savedPlaces.find((p) => p.label === "Work");
                  return work ? (
                    <button
                      onClick={() => applyPlace(work)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-all active:scale-95 group"
                    >
                      <span>🏢</span>
                      <span className="truncate max-w-[100px]">Work</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); removePlace("Work"); }}
                        className="ml-0.5 opacity-0 group-hover:opacity-100 text-primary/50 hover:text-primary transition-opacity"
                      >×</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (dropoff && dropoffCoords) savePlace("Work");
                      }}
                      disabled={!dropoff || !dropoffCoords}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-foreground/20 text-foreground/40 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>🏢</span>
                      Set Work
                    </button>
                  );
                })()}
              </div>

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-foreground/40 uppercase tracking-wide">Recent</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {recentSearches.map((r) => (
                      <button
                        key={r.timestamp}
                        onClick={() => applyRecentSearch(r)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-subtle border border-card-border text-xs text-foreground/70 font-medium transition-all active:scale-95 hover:border-primary/30 hover:text-foreground"
                      >
                        <svg className="w-3 h-3 text-foreground/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate max-w-[140px]">{r.address.split(",").slice(0, 2).join(",")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <AddressInput
                  value={pickup}
                  onChange={setPickup}
                  onLocationSelect={setPickupCoords}
                  placeholder="Pickup location"
                  label="Pickup"
                  dotColor="bg-green-400"
                  showCurrentLocation
                />
                <AddressInput
                  value={dropoff}
                  onChange={(v) => { setDropoff(v); setShowSaveDropdown(false); }}
                  onLocationSelect={(c) => { setDropoffCoords(c); setShowSaveDropdown(false); }}
                  placeholder="Where are you going?"
                  label="Dropoff"
                  dotColor="bg-primary"
                />
              </div>

              {/* Save dropoff as Home/Work */}
              {dropoff && dropoffCoords && (
                <div className="relative">
                  <button
                    onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save as…
                  </button>
                  {showSaveDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSaveDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-card-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
                        <button
                          onClick={() => savePlace("Home")}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors w-full text-left"
                        >
                          <span>🏠</span> Home
                        </button>
                        <button
                          onClick={() => savePlace("Work")}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors w-full text-left border-t border-card-border"
                        >
                          <span>🏢</span> Work
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Trip info */}
              {estimatingFare && (
                <div className="flex items-center justify-center py-3">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {baseFare && distanceMiles && durationMinutes && (
                <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 animate-fade-in">
                  <div className="flex items-center gap-4 text-sm text-foreground/70">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      {distanceMiles} mi
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ~{durationMinutes} min
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">${baseFare.toFixed(2)}</span>
                </div>
              )}

              <button
                onClick={proceedToTypeSelect}
                disabled={!pickupCoords || !dropoffCoords || estimatingFare}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 shadow-sm active:scale-[0.98]"
              >
                Choose Ride
              </button>
            </div>
          )}

          {/* STEP: Select ride type */}
          {step === "select-type" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => { setStep("search"); setSheetExpanded(false); }} className="p-1 text-foreground/50 hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-bold text-foreground">Choose a ride</h2>
              </div>

              {/* Trip summary */}
              <div className="flex items-center gap-2 text-xs text-foreground/50 bg-subtle rounded-lg px-3 py-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="truncate flex-1">{pickup}</span>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="w-2 h-2 bg-primary rounded-full" />
                <span className="truncate flex-1">{dropoff}</span>
              </div>

              {/* Ride type cards */}
              <div className="space-y-2">
                {RIDE_TYPES.map((type) => {
                  const price = baseFare ? Math.round(baseFare * type.multiplier * 100) / 100 : null;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedType(type.id); haptic(); }}
                      className={`w-full text-left rounded-xl p-4 flex items-center gap-4 transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-card-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-3xl">{type.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{type.label}</span>
                          <span className="text-[10px] text-foreground/40">{type.eta}</span>
                        </div>
                        <p className="text-xs text-foreground/50">{type.desc}</p>
                      </div>
                      {price && (
                        <span className={`text-sm font-bold shrink-0 ${isSelected ? "text-primary" : "text-foreground/70"}`}>
                          ${price.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={proceedToConfirm}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm active:scale-[0.98]"
              >
                {fareForType ? `Continue · $${fareForType.toFixed(2)}` : "Continue"}
              </button>
            </div>
          )}

          {/* STEP: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("select-type")} className="p-1 text-foreground/50 hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-bold text-foreground">Confirm ride</h2>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg animate-fade-in">{error}</div>
              )}

              {/* Ride summary card */}
              <div className="bg-subtle rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedRide.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{selectedRide.label}</p>
                    <p className="text-xs text-foreground/50">{selectedRide.eta} · {distanceMiles} mi · ~{durationMinutes} min</p>
                  </div>
                  {fareForType && (
                    <span className="ml-auto text-lg font-bold text-primary">${fareForType.toFixed(2)}</span>
                  )}
                </div>

                <div className="border-t border-card-border pt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground/70">{pickup}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground/70">{dropoff}</span>
                  </div>
                </div>
              </div>

              {/* Kin preferences */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferKin}
                    onChange={(e) => {
                      setPreferKin(e.target.checked);
                      if (!e.target.checked) setSpecificDriverId("");
                    }}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm text-foreground">Prefer Kin drivers</span>
                    <p className="text-[11px] text-foreground/40">Lower commission — your driver keeps more</p>
                  </div>
                </label>

                {preferKin && favorites.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-foreground/50">Request a specific driver</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => setSpecificDriverId("")}
                        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                          !specificDriverId ? "bg-primary text-white border-primary" : "bg-card text-foreground/60 border-card-border"
                        }`}
                      >
                        Any Kin
                      </button>
                      {favorites.map((f) => (
                        <button
                          key={f.driver.id}
                          onClick={() => setSpecificDriverId(f.driver.id)}
                          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                            specificDriverId === f.driver.id ? "bg-primary text-white border-primary" : "bg-card text-foreground/60 border-card-border"
                          }`}
                        >
                          <Avatar name={f.driver.name} size="xs" online={f.driver.driverProfile?.isOnline} />
                          {f.driver.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Finding a driver...
                  </span>
                ) : fareForType ? (
                  `Confirm ${selectedRide.label} · $${fareForType.toFixed(2)}`
                ) : (
                  `Confirm ${selectedRide.label}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
