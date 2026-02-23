"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geocode";

const pickupIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="5"/></svg>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const dropoffIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#6d28d9;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const driverIcon = L.divIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
  </div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const prevBoundsRef = useRef<string>("");

  useEffect(() => {
    if (points.length === 0) return;

    const boundsKey = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
    if (boundsKey === prevBoundsRef.current) return;
    prevBoundsRef.current = boundsKey;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true, maxZoom: 15 });
    }
  }, [points, map]);

  return null;
}

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface RideMapProps {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  driverLocation?: LatLng | null;
  userLocation?: LatLng | null;
  className?: string;
  rounded?: boolean;
}

export function RideMap({ pickup, dropoff, driverLocation, userLocation, className = "", rounded = true }: RideMapProps) {
  const fitPoints = useMemo(() => {
    const pts: LatLng[] = [];
    if (pickup) pts.push(pickup);
    if (dropoff) pts.push(dropoff);
    if (driverLocation) pts.push(driverLocation);
    return pts;
  }, [pickup, dropoff, driverLocation]);

  const center = useMemo<[number, number]>(() => {
    if (pickup) return [pickup.lat, pickup.lng];
    if (dropoff) return [dropoff.lat, dropoff.lng];
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return [37.7749, -122.4194];
  }, [pickup, dropoff, userLocation]);

  const routeLine = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const latDiff = dropoff.lat - pickup.lat;
    const lngDiff = dropoff.lng - pickup.lng;
    const midLat = pickup.lat + latDiff * 0.5;
    const midLng = pickup.lng + lngDiff * 0.5;
    const offset = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 0.1;
    return [
      [pickup.lat, pickup.lng] as [number, number],
      [midLat + offset * (lngDiff > 0 ? 1 : -1), midLng] as [number, number],
      [dropoff.lat, dropoff.lng] as [number, number],
    ];
  }, [pickup, dropoff]);

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className={`overflow-hidden ${rounded ? "rounded-2xl" : ""} ${className}`}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%", minHeight: "300px" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />

        {userLocation && !pickup && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
        )}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        )}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />
        )}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={driverIcon}
          />
        )}
        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: "#8b5cf6",
              weight: 5,
              opacity: 0.8,
              dashArray: "8 12",
            }}
          />
        )}

        <FitBounds points={fitPoints.length > 0 ? fitPoints : (userLocation ? [userLocation] : [])} />
      </MapContainer>
    </div>
  );
}
