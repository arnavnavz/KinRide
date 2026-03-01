"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useI18n } from "@/lib/i18n-context";
import Link from "next/link";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MiniMapInner = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { MapContainer, TileLayer, Marker } = mod;
      return function MiniMapComponent({
        pickup,
        dropoff,
      }: {
        pickup: { lat: number; lng: number };
        dropoff: { lat: number; lng: number } | null;
      }) {
        const L = require("leaflet");
        const greenIcon = L.divIcon({
          className: "",
          html: '<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const purpleIcon = L.divIcon({
          className: "",
          html: '<div style="width:20px;height:20px;border-radius:50%;background:#6d28d9;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const bounds =
          dropoff
            ? L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]).pad(0.3)
            : L.latLngBounds(
                [pickup.lat - 0.005, pickup.lng - 0.005],
                [pickup.lat + 0.005, pickup.lng + 0.005]
              );
        return (
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[pickup.lat, pickup.lng]} icon={greenIcon} />
            {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={purpleIcon} />}
          </MapContainer>
        );
      };
    }),
  { ssr: false }
);

function MiniMap({ pickup, dropoff }: { pickup: { lat: number; lng: number }; dropoff: { lat: number; lng: number } | null }) {
  return (
    <div className="h-[140px] w-full bg-gray-100 dark:bg-gray-800">
      <MiniMapInner pickup={pickup} dropoff={dropoff} />
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIResponse {
  intent: string;
  message: string;
  pickup?: string;
  dropoff?: string;
  rideType?: string;
  preferKin?: boolean;
}

const RIDE_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  xl: "XL",
  premium: "Premium",
  pool: "Pool",
};

const RIDE_TYPE_ICONS: Record<string, string> = {
  regular: "\u{1F697}",
  xl: "\u{1F699}",
  premium: "\u2728",
  pool: "\u{1F465}",
};

const SUGGESTIONS = [
  "Book me a ride to the airport",
  "Get me a premium from here to downtown",
  "I need an XL to pick up my friends",
  "Cheapest ride to the mall",
];

function AIChatPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRide, setPendingRide] = useState<AIResponse | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [booking, setBooking] = useState(false);
  const [resolvedPickup, setResolvedPickup] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const bookRide = useCallback(async (ride: AIResponse) => {
    setBooking(true);
    try {
      let pickupAddress = ride.pickup ?? "";
      if (pickupAddress === "current_location" && userLocation) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`,
          { headers: { "User-Agent": "Kayu/1.0" } }
        );
        const geo = await res.json();
        pickupAddress = geo.display_name?.split(",").slice(0, 3).join(",").trim() || `${userLocation.lat}, ${userLocation.lng}`;
      }

      const res = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          dropoffAddress: ride.dropoff,
          rideType: ride.rideType ?? "regular",
          preferKin: ride.preferKin ?? false,
          ...(userLocation ? { riderLat: userLocation.lat, riderLng: userLocation.lng } : {}),
        }),
      });

      if (res.ok) {
        const rideData = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: "Ride booked! Taking you to your ride now..." }]);
        setPendingRide(null);
        setTimeout(() => router.push(`/rider/ride/${rideData.id}`), 1000);
      } else {
        const err = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: `Couldn't book: ${err.error || "Unknown error"}. Try again?` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong booking the ride. Try again?" }]);
    } finally {
      setBooking(false);
      setPendingRide(null);
    }
  }, [userLocation, router]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          userLocation,
        }),
      });

      const data: AIResponse = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.intent === "book_ride" && data.pickup && data.dropoff) {
        setPendingRide(data);
      } else if (data.intent === "confirm" && pendingRide) {
        bookRide(pendingRide);
      } else if (data.intent === "cancel") {
        setPendingRide(null);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again?" }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading, userLocation, pendingRide, bookRide]);

  // Handle deep link query parameter (e.g. from Siri: /rider/ai?q=ride+to+mcdonalds)
  const searchParams = useSearchParams();
  const hasAutoSent = useRef(false);
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !hasAutoSent.current && userLocation) {
      hasAutoSent.current = true;
      sendMessage(q);
    }
  }, [searchParams, userLocation, sendMessage]);


  // Resolve addresses when pending ride is set
  useEffect(() => {
    if (!pendingRide) {
      setResolvedPickup(null);
      setPickupCoords(null);
      setDropoffCoords(null);
      return;
    }

    // Resolve pickup
    if (pendingRide.pickup === "current_location" && userLocation) {
      setPickupCoords(userLocation);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`,
        { headers: { "User-Agent": "Kayu/1.0" } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.display_name) {
            setResolvedPickup(data.display_name.split(",").slice(0, 3).join(",").trim());
          }
        })
        .catch(() => {});
    } else if (pendingRide.pickup && pendingRide.pickup !== "current_location") {
      setResolvedPickup(pendingRide.pickup);
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pendingRide.pickup)}&limit=1`,
        { headers: { "User-Agent": "Kayu/1.0" } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data[0]) setPickupCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        })
        .catch(() => {});
    }

    // Geocode dropoff
    if (pendingRide.dropoff) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pendingRide.dropoff)}&limit=1`,
        { headers: { "User-Agent": "Kayu/1.0" } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data[0]) setDropoffCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        })
        .catch(() => {});
    }
  }, [pendingRide, userLocation]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="safe-top border-b border-card-border bg-card/80 backdrop-blur-xl px-4 pb-3 pt-2 flex items-center gap-3">
        <Link
          href="/rider/request"
          className="p-2 -ml-2 text-foreground/50 hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">{t("ai.title")}</h1>
            <p className="text-[11px] text-foreground/40">{t("ai.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Hey{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!</p>
              <p className="text-sm text-foreground/50 mt-1">Just tell me where you want to go</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); sendMessage(s); }}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-card border border-card-border text-foreground/70 hover:border-primary/30 hover:text-foreground transition-all active:scale-[0.98]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-card border border-card-border text-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card border border-card-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Pending ride card */}
        {pendingRide && !loading && (
          <div className="animate-fade-in">
            <div className="bg-card border border-primary/20 rounded-2xl overflow-hidden shadow-sm">
              {/* Mini map */}
              {pickupCoords && <MiniMap pickup={pickupCoords} dropoff={dropoffCoords} />}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{RIDE_TYPE_ICONS[pendingRide.rideType ?? "regular"]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {RIDE_TYPE_LABELS[pendingRide.rideType ?? "regular"]}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">{t("ai.ready_to_book")}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 shrink-0" />
                    <span className="text-foreground/70">
                      {resolvedPickup || (pendingRide.pickup === "current_location" ? t("ai.locating") : pendingRide.pickup)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    <span className="text-foreground/70">{pendingRide.dropoff}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={booking}
                    onClick={() => bookRide(pendingRide)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {booking ? t("ai.booking") : t("ai.confirm_ride")}
                  </button>
                  <button
                    onClick={() => {
                      setPendingRide(null);
                      setMessages((prev) => [...prev, { role: "assistant", content: "No problem! What else can I help with?" }]);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium text-foreground/60 hover:bg-subtle transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="safe-bottom border-t border-card-border bg-card/80 backdrop-blur-xl px-4 pt-3 pb-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai.placeholder")}
            disabled={loading || booking}
            className="flex-1 bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-60"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || booking}
            className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-40 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className='flex items-center justify-center h-screen'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' /></div>}>
      <AIChatPageInner />
    </Suspense>
  );
}
