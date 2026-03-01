"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { AddressInput } from "@/components/AddressInput";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import type { LatLng } from "@/lib/geocode";
import { haptic } from "@/lib/haptic";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatSurgeLabel } from "@/lib/surge";
import { fetchRoute } from "@/lib/routing";

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
  { id: "regular", label: "ride_type.regular", desc: "ride_type.regular_desc", icon: "🚗", multiplier: 1.0, eta: "3-5 min" },
  { id: "xl", label: "ride_type.xl", desc: "ride_type.xl_desc", icon: "🚙", multiplier: 1.5, eta: "5-8 min" },
  { id: "premium", label: "ride_type.premium", desc: "ride_type.premium_desc", icon: "✨", multiplier: 2.0, eta: "5-10 min" },
  { id: "pool", label: "ride_type.pool", desc: "ride_type.pool_desc", icon: "👥", multiplier: 0.7, eta: "5-12 min" },
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
  const { t } = useI18n();

  const [step, setStep] = useState<BookingStep>("search");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [stops, setStops] = useState<Array<{ address: string; coords: LatLng | null }>>([]);
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
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showScheduledSuccess, setShowScheduledSuccess] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newPlaceLabel, setNewPlaceLabel] = useState("");
  const [surge, setSurge] = useState<{ multiplier: number; label: string; color: string }>({ multiplier: 1.0, label: "", color: "" });
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [riderNote, setRiderNote] = useState("");
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
            { headers: { "User-Agent": "Kayu/1.0" } }
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
    fetch("/api/rides/surge").then((r) => r.json()).then(setSurge).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const sp = localStorage.getItem("kayu-saved-places");
      if (sp) setSavedPlaces(JSON.parse(sp));
      const rs = localStorage.getItem("kayu-recent-searches");
      if (rs) setRecentSearches(JSON.parse(rs));
    } catch { /* corrupted data */ }
  }, []);

  const savePlace = (label: string) => {
    if (!dropoff || !dropoffCoords) return;
    const updated = savedPlaces.filter((p) => p.label !== label);
    if (updated.length >= 8 && !savedPlaces.some((p) => p.label === label)) return;
    updated.push({ label, address: dropoff, coords: dropoffCoords });
    setSavedPlaces(updated);
    localStorage.setItem("kayu-saved-places", JSON.stringify(updated));
    setShowSaveDropdown(false);
    setShowAddPlaceModal(false);
    setNewPlaceLabel("");
  };

  const removePlace = (label: string) => {
    const updated = savedPlaces.filter((p) => p.label !== label);
    setSavedPlaces(updated);
    localStorage.setItem("kayu-saved-places", JSON.stringify(updated));
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
    localStorage.setItem("kayu-recent-searches", JSON.stringify(updated));
  };

  const fetchFareEstimate = useCallback(async () => {
    if (!pickupCoords || !dropoffCoords) return;
    setEstimatingFare(true);
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(dropoffCoords.lat - pickupCoords.lat);
    const dLng = toRad(dropoffCoords.lng - pickupCoords.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pickupCoords.lat)) * Math.cos(toRad(dropoffCoords.lat)) * Math.sin(dLng / 2) ** 2;
    const straightMiles = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const roadMiles = straightMiles * 1.3;
    setDistanceMiles(Math.round(roadMiles * 10) / 10);
    setDurationMinutes(Math.round(roadMiles * 2.5));
    // Client-side fallback: same formula as server (BASE_FEE 3 + PER_MILE 2)
    const clientEstimate = Math.round((3 + roadMiles * 2) * 100) / 100;
    try {
      const res = await fetch("/api/rides/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupAddress: pickup, dropoffAddress: dropoff }),
      });
      if (res.ok) {
        const data = await res.json();
        const serverFare = data?.estimatedFare;
        setBaseFare(typeof serverFare === "number" ? serverFare : clientEstimate);
      } else {
        setBaseFare(clientEstimate);
      }
    } catch {
      setBaseFare(clientEstimate);
    }
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

  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      setRouteCoords(null);
      return;
    }
    const waypoints = [pickupCoords, ...stops.filter((s) => s.coords).map((s) => s.coords!), dropoffCoords];
    fetchRoute(waypoints).then((result) => {
      if (result) {
        setRouteCoords(result.coordinates);
        setDistanceMiles(Math.round(result.distanceMeters / 1609.34 * 10) / 10);
        setDurationMinutes(Math.round(result.durationSeconds / 60));
      }
    });
  }, [pickupCoords, dropoffCoords, stops]);

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
          stops: stops.filter((s) => s.address && s.coords).map((s) => s.address),
          rideType: selectedType,
          preferKin,
          specificDriverId: specificDriverId || undefined,
          scheduledAt: scheduledAt || undefined,
          riderNote: riderNote.trim() || undefined,
          ...(pickupCoords ? { riderLat: pickupCoords.lat, riderLng: pickupCoords.lng } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.toString() || "Failed to create ride");
        return;
      }
      const ride = await res.json();
      if (dropoff && dropoffCoords) addRecentSearch(dropoff, dropoffCoords);
      if (scheduledAt) {
        setShowScheduledSuccess(true);
        setTimeout(() => router.push("/rider/scheduled"), 2000);
      } else {
        router.push(`/rider/ride/${ride.id}`);
      }
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

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Invalid promo code");
      } else {
        setAppliedPromo({
          code: data.redemption.promoCode.code,
          discountType: data.redemption.promoCode.discountType,
          discountValue: data.redemption.promoCode.discountValue,
        });
        setPromoSuccess(data.message);
        setPromoInput("");
      }
    } catch {
      setPromoError("Something went wrong");
    }
    setApplyingPromo(false);
  };

  const selectedRide = RIDE_TYPES.find((r) => r.id === selectedType)!;
  // Show price from API or client-side estimate when we have coords (so price always shows when booking)
  const displayBaseFare =
    baseFare ??
    (pickupCoords && dropoffCoords
      ? (() => {
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(dropoffCoords.lat - pickupCoords.lat);
          const dLng = toRad(dropoffCoords.lng - pickupCoords.lng);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(pickupCoords.lat)) * Math.cos(toRad(dropoffCoords.lat)) * Math.sin(dLng / 2) ** 2;
          const straight = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const roadMiles = straight * 1.3;
          return Math.round((3 + roadMiles * 2) * 100) / 100;
        })()
      : null);
  const fareForType = displayBaseFare ? Math.round(displayBaseFare * selectedRide.multiplier * surge.multiplier * 100) / 100 : null;

  const promoDiscount = fareForType && appliedPromo
    ? appliedPromo.discountType === "percentage"
      ? Math.round(fareForType * (appliedPromo.discountValue / 100) * 100) / 100
      : Math.min(appliedPromo.discountValue, fareForType)
    : 0;
  const finalFare = fareForType ? Math.round((fareForType - promoDiscount) * 100) / 100 : null;

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
              <nav
                role="navigation"
                aria-label="Main menu"
                className="absolute top-full left-0 mt-2 w-48 bg-card rounded-xl shadow-xl border border-card-border overflow-y-auto max-h-[70vh] animate-slide-down z-[61]"
              >
                <Link
                  href="/rider/ai"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t("nav.ai_assistant")}
                </Link>
                <Link
                  href="/rider/chats"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {t("nav.chats")}
                </Link>
                <Link
                  href="/rider/history"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("nav.history")}
                </Link>
                <Link
                  href="/rider/scheduled"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t("nav.scheduled")}
                </Link>
                <Link
                  href="/rider/kin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t("nav.my_kin")}
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
                  href="/rider/wallet"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {t("nav.wallet")}
                </Link>
                <Link
                  href="/rider/promos"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {t("nav.promos")}
                </Link>
                <Link
                  href="/rider/support"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {t("nav.support")}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border"
                >
                  <svg className="w-4.5 h-4.5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t("nav.profile")}
                </Link>
                {isNativeApp && (
                  <button
                    onClick={() => {
                      (window as any).webkit?.messageHandlers?.kayuBridge?.postMessage({ type: "addToSiri" });
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-subtle transition-colors border-t border-card-border w-full"
                  >
                    <svg className="w-4.5 h-4.5 text-foreground/50" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Add to Siri
                  </button>
                )}
                <div className="px-3 py-3 border-t border-card-border">
                  <LanguageSwitcher compact />
                </div>
              </nav>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-card shadow-lg rounded-full px-5 py-2.5 border border-card-border">
          <span className="text-base font-bold text-primary">Ka</span>
          <span className="text-base font-light text-foreground">yu</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {session?.user && (
            <Link href="/rider/kin" className="active:scale-95 transition-transform">
              <Avatar name={session.user.name || "U"} size="sm" />
            </Link>
          )}
        </div>
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative min-h-0">
        <RideMap
          pickup={pickupCoords}
          dropoff={dropoffCoords}
          stops={stops.filter((s) => s.coords).map((s) => ({ lat: s.coords!.lat, lng: s.coords!.lng }))}
          userLocation={userLocation}
          routeCoordinates={routeCoords}
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

      {/* Floating AI assistant button */}
      <Link
        href="/rider/ai"
        className="absolute right-4 z-[35] flex items-center bg-gradient-to-br from-primary to-violet-500 text-white rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-200"
        style={{ bottom: sheetExpanded ? 'calc(80vh + 12px)' : step === 'search' ? 'calc(45vh + 12px)' : 'calc(55vh + 12px)' }}
        aria-label="AI Assistant"
      >
        <div className="w-12 h-12 flex items-center justify-center relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
      </Link>

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={`relative z-30 bg-card border-t border-card-border rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ${
          sheetExpanded ? "max-h-[80vh]" : "max-h-[45vh]"
        } overflow-hidden flex flex-col`}
        style={{ ["--sheet-height" as string]: sheetExpanded ? "80%" : "45%" }}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="flex justify-center pt-3 pb-2 cursor-grab w-full"
          onClick={() => setSheetExpanded(!sheetExpanded)}
          aria-label="Expand or collapse booking panel"
        >
          <div className="w-10 h-1 bg-foreground/15 rounded-full" />
        </button>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* STEP: Search */}
          {step === "search" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-foreground">{t("booking.where_to")}</h2>

              {surge.multiplier > 1.0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-950/40 dark:to-red-950/40 border border-amber-200/60 dark:border-amber-800/40 animate-fade-in">
                  <span className="text-lg">⚡</span>
                  <span className={`text-sm font-medium ${surge.color}`}>{surge.label}</span>
                  <span className="ml-auto text-sm font-bold text-red-500">{formatSurgeLabel(surge.multiplier)}</span>
                </div>
              )}

              {/* Saved places */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {(() => {
                  const home = savedPlaces.find((p) => p.label === "Home");
                  return home ? (
                    <button
                      onClick={() => applyPlace(home)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-all active:scale-95 group"
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
                      onClick={() => { if (dropoff && dropoffCoords) savePlace("Home"); }}
                      disabled={!dropoff || !dropoffCoords}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-foreground/20 text-foreground/40 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-all active:scale-95 group"
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
                      onClick={() => { if (dropoff && dropoffCoords) savePlace("Work"); }}
                      disabled={!dropoff || !dropoffCoords}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-foreground/20 text-foreground/40 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>🏢</span>
                      Set Work
                    </button>
                  );
                })()}
                {savedPlaces.filter((p) => p.label !== "Home" && p.label !== "Work").map((place) => (
                  <button
                    key={place.label}
                    onClick={() => applyPlace(place)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-all active:scale-95 group"
                  >
                    <span>⭐</span>
                    <span className="truncate max-w-[100px]">{place.label}</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); removePlace(place.label); }}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 text-primary/50 hover:text-primary transition-opacity"
                    >×</span>
                  </button>
                ))}
                {savedPlaces.length < 8 && (
                  <button
                    onClick={() => {
                      if (dropoff && dropoffCoords) {
                        setShowAddPlaceModal(true);
                      }
                    }}
                    disabled={!dropoff || !dropoffCoords}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-foreground/20 text-foreground/40 text-sm font-medium transition-all hover:border-primary/40 hover:text-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Add saved place"
                    title="Add a custom saved place"
                  >
                    +
                  </button>
                )}
              </div>

              {/* Add custom place modal */}
              {showAddPlaceModal && (
                <>
                  <div className="fixed inset-0 z-[70] bg-black/40" onClick={() => { setShowAddPlaceModal(false); setNewPlaceLabel(""); }} />
                  <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-card-border shadow-xl w-full max-w-xs p-5 space-y-4 animate-fade-in">
                      <h3 className="text-sm font-semibold text-foreground">Save this place</h3>
                      <p className="text-xs text-foreground/50 truncate">{dropoff}</p>
                      <input
                        type="text"
                        value={newPlaceLabel}
                        onChange={(e) => setNewPlaceLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newPlaceLabel.trim()) savePlace(newPlaceLabel.trim());
                        }}
                        placeholder={`e.g. "Gym", "Mom's house"`}
                        maxLength={20}
                        autoFocus
                        className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowAddPlaceModal(false); setNewPlaceLabel(""); }}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground/60 border border-card-border hover:bg-subtle transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { if (newPlaceLabel.trim()) savePlace(newPlaceLabel.trim()); }}
                          disabled={!newPlaceLabel.trim()}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-all disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

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

              <div className="relative">
                <div className="absolute left-[4px] top-[10px] bottom-[10px] w-0 border-l-2 border-dotted border-foreground/20 z-0 pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <AddressInput
                    value={pickup}
                    onChange={setPickup}
                    onLocationSelect={setPickupCoords}
                    placeholder="Pickup location"
                    label="Pickup"
                    dotColor="bg-green-400"
                    showCurrentLocation
                  />

                  {stops.map((stop, i) => (
                    <div key={i} className="relative">
                      <AddressInput
                        value={stop.address}
                        onChange={(v) => {
                          const next = [...stops];
                          next[i] = { ...next[i], address: v };
                          setStops(next);
                        }}
                        onLocationSelect={(c) => {
                          const next = [...stops];
                          next[i] = { ...next[i], coords: c };
                          setStops(next);
                        }}
                        placeholder={`Stop ${i + 1}`}
                        label={`Stop ${i + 1}`}
                        dotColor="bg-blue-400"
                      />
                      <button
                        onClick={() => setStops(stops.filter((_, j) => j !== i))}
                        className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-foreground/40 hover:text-red-500 transition-colors text-xs font-bold"
                        aria-label={`Remove stop ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {stops.length < 3 && (
                    <button
                      onClick={() => setStops([...stops, { address: "", coords: null }])}
                      className="flex items-center gap-2 text-xs font-medium text-primary/70 hover:text-primary transition-colors pl-1 py-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add stop
                    </button>
                  )}

                  <AddressInput
                    value={dropoff}
                    onChange={(v) => { setDropoff(v); setShowSaveDropdown(false); }}
                    onLocationSelect={(c) => { setDropoffCoords(c); setShowSaveDropdown(false); }}
                    placeholder="Where are you going?"
                    label="Dropoff"
                    dotColor="bg-primary"
                  />
                </div>
              </div>

              {/* Save dropoff as Home/Work/Custom */}
              {dropoff && dropoffCoords && savedPlaces.length < 8 && (
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
                        <button
                          onClick={() => { setShowSaveDropdown(false); setShowAddPlaceModal(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors w-full text-left border-t border-card-border"
                        >
                          <span>⭐</span> Custom…
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

              {(displayBaseFare != null || distanceMiles != null || durationMinutes != null) && (
                <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 animate-fade-in">
                  <div className="flex items-center gap-4 text-sm text-foreground/70">
                    {distanceMiles != null && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        {distanceMiles} mi
                      </span>
                    )}
                    {durationMinutes != null && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ~{durationMinutes} min
                      </span>
                    )}
                  </div>
                  {displayBaseFare != null && (
                    <span className="text-lg font-bold text-primary">${displayBaseFare.toFixed(2)}</span>
                  )}
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
                <h2 className="text-lg font-bold text-foreground">{t("booking.choose_ride")}</h2>
              </div>

              {/* Trip summary */}
              <div className="flex items-center gap-2 text-xs text-foreground/50 bg-subtle rounded-lg px-3 py-2 flex-wrap">
                <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                <span className="truncate max-w-[120px]">{pickup}</span>
                {stops.filter((s) => s.address).map((s, i) => (
                  <span key={i} className="contents">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="w-2 h-2 bg-blue-400 rounded-full shrink-0" />
                    <span className="truncate max-w-[120px]">{s.address}</span>
                  </span>
                ))}
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="truncate max-w-[120px]">{dropoff}</span>
              </div>

              {/* Ride type cards */}
              <div role="radiogroup" aria-label="Ride type" className="space-y-2">
                {RIDE_TYPES.map((type) => {
                  const price = displayBaseFare ? Math.round(displayBaseFare * type.multiplier * surge.multiplier * 100) / 100 : null;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      role="radio"
                      aria-checked={isSelected}
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
                          <span className="font-semibold text-sm text-foreground">{t(type.label)}</span>
                          <span className="text-[10px] text-foreground/40">{type.eta}</span>
                        </div>
                        <p className="text-xs text-foreground/50">{t(type.desc)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {price && (
                          <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground/70"}`}>
                            ${price.toFixed(2)}
                          </span>
                        )}
                        {surge.multiplier > 1.0 && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-full">
                            {formatSurgeLabel(surge.multiplier)}
                          </span>
                        )}
                      </div>
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
              {showScheduledSuccess && (
                <div className="fixed inset-0 z-[100] bg-background/90 flex flex-col items-center justify-center animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-foreground">Ride scheduled!</p>
                  <p className="text-sm text-foreground/50 mt-1">
                    {(() => {
                      const d = new Date(scheduledAt);
                      return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) +
                        " at " +
                        d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                    })()}
                  </p>
                  <p className="text-xs text-foreground/40 mt-3">Redirecting to scheduled rides…</p>
                </div>
              )}

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
                    <p className="font-semibold text-sm text-foreground">{t(selectedRide.label)}</p>
                    <p className="text-xs text-foreground/50">{selectedRide.eta} · {distanceMiles} mi · ~{durationMinutes} min</p>
                  </div>
                  {fareForType && (
                    <span className="ml-auto text-lg font-bold text-primary">${fareForType.toFixed(2)}</span>
                  )}
                </div>

                {surge.multiplier > 1.0 && (
                  <div className="flex items-center justify-between text-sm border-t border-card-border pt-3">
                    <span className="text-foreground/60 flex items-center gap-1.5">
                      <span>⚡</span> Surge pricing ({surge.label})
                    </span>
                    <span className="font-semibold text-red-500">{formatSurgeLabel(surge.multiplier)}</span>
                  </div>
                )}

                <div className="border-t border-card-border pt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground/70">{pickup}</span>
                  </div>
                  {stops.filter((s) => s.address).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                      <span className="text-sm text-foreground/70">{s.address}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground/70">{dropoff}</span>
                  </div>
                </div>
              </div>

              {/* Schedule for later */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const next = !scheduleMode;
                    setScheduleMode(next);
                    if (!next) setScheduledAt("");
                    haptic();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    scheduleMode
                      ? "border-primary bg-primary/5"
                      : "border-card-border bg-card hover:border-primary/30"
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${scheduleMode ? "text-primary" : "text-foreground/40"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-sm font-medium ${scheduleMode ? "text-primary" : "text-foreground"}`}>
                    {t("booking.schedule_later")}
                  </span>
                  <div
                    className={`ml-auto relative w-10 h-6 rounded-full transition-colors ${
                      scheduleMode ? "bg-primary" : "bg-foreground/20"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        scheduleMode ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>

                {scheduleMode && (
                  <div className="animate-fade-in space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={scheduledAt ? scheduledAt.split("T")[0] : ""}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => {
                          const time = scheduledAt ? scheduledAt.split("T")[1] || "" : "";
                          if (e.target.value && time) {
                            setScheduledAt(`${e.target.value}T${time}`);
                          } else if (e.target.value) {
                            const now = new Date();
                            now.setMinutes(now.getMinutes() + 30);
                            const hh = String(now.getHours()).padStart(2, "0");
                            const mm = String(now.getMinutes()).padStart(2, "0");
                            setScheduledAt(`${e.target.value}T${hh}:${mm}`);
                          }
                        }}
                        className="flex-1 bg-subtle border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                      <input
                        type="time"
                        value={scheduledAt ? scheduledAt.split("T")[1] || "" : ""}
                        onChange={(e) => {
                          const date = scheduledAt ? scheduledAt.split("T")[0] : new Date().toISOString().split("T")[0];
                          if (e.target.value) {
                            setScheduledAt(`${date}T${e.target.value}`);
                          }
                        }}
                        className="flex-1 bg-subtle border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    {scheduledAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg animate-fade-in">
                        <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-primary font-medium">
                          {(() => {
                            const d = new Date(scheduledAt);
                            if (isNaN(d.getTime())) return "Pick a date & time";
                            return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) +
                              " at " +
                              d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Promo code */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setPromoExpanded(!promoExpanded);
                    setPromoError("");
                    setPromoSuccess("");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    appliedPromo
                      ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                      : promoExpanded
                        ? "border-primary bg-primary/5"
                        : "border-card-border bg-card hover:border-primary/30"
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${appliedPromo ? "text-green-500" : promoExpanded ? "text-primary" : "text-foreground/40"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={`text-sm font-medium ${appliedPromo ? "text-green-600 dark:text-green-400" : promoExpanded ? "text-primary" : "text-foreground"}`}>
                    {appliedPromo ? `${appliedPromo.code} applied` : "Have a promo code?"}
                  </span>
                  {appliedPromo && promoDiscount > 0 && (
                    <span className="ml-auto text-sm font-bold text-green-500">-${promoDiscount.toFixed(2)}</span>
                  )}
                  {!appliedPromo && (
                    <svg className={`w-4 h-4 ml-auto text-foreground/30 transition-transform ${promoExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {promoExpanded && !appliedPromo && (
                  <div className="animate-fade-in space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 bg-subtle border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono tracking-wider"
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={applyingPromo || !promoInput.trim()}
                        className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 active:scale-[0.98] shrink-0"
                      >
                        {applyingPromo ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-500 px-1">{promoError}</p>
                    )}
                    {promoSuccess && (
                      <p className="text-xs text-green-500 px-1">{promoSuccess}</p>
                    )}
                  </div>
                )}

                {appliedPromo && fareForType && (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg animate-fade-in text-sm">
                    <span className="text-foreground/60">
                      <span className="line-through">${fareForType.toFixed(2)}</span>
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">${finalFare?.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Rider note */}
              <div className="space-y-3">
                <button
                  onClick={() => setNoteExpanded(!noteExpanded)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    riderNote.trim()
                      ? "border-primary bg-primary/5"
                      : noteExpanded
                        ? "border-primary bg-primary/5"
                        : "border-card-border bg-card hover:border-primary/30"
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${noteExpanded || riderNote.trim() ? "text-primary" : "text-foreground/40"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className={`text-sm font-medium ${noteExpanded || riderNote.trim() ? "text-primary" : "text-foreground"}`}>
                    {riderNote.trim() ? "Note added" : "Add a note for your driver"}
                  </span>
                  <svg className={`w-4 h-4 ml-auto text-foreground/30 transition-transform ${noteExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {noteExpanded && (
                  <div className="animate-fade-in space-y-2">
                    <textarea
                      value={riderNote}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) setRiderNote(e.target.value);
                      }}
                      placeholder={`e.g. "I'll be at the back entrance" or "I have a wheelchair"`}
                      rows={3}
                      className="w-full bg-subtle border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                    <div className="flex justify-end">
                      <span className={`text-xs ${riderNote.length >= 180 ? "text-red-400" : "text-foreground/30"}`}>
                        {riderNote.length}/200
                      </span>
                    </div>
                  </div>
                )}
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
                    <span className="text-sm text-foreground">{t("booking.prefer_kin")}</span>
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
                disabled={submitting || (scheduleMode && !scheduledAt)}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {scheduleMode ? t("booking.scheduling") : t("booking.finding_driver")}
                  </span>
                ) : scheduleMode && (finalFare ?? fareForType) ? (
                  `${t("booking.schedule_later")} · ${(finalFare ?? fareForType)!.toFixed(2)}`
                ) : scheduleMode ? (
                  t("booking.schedule_later")
                ) : (finalFare ?? fareForType) ? (
                  `${t("booking.confirm_ride")} · ${(finalFare ?? fareForType)!.toFixed(2)}`
                ) : (
                  t("booking.confirm_ride")
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
