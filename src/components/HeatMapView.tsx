"use client";

import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

interface HeatZone {
  lat: number;
  lng: number;
  intensity: number;
  requestCount: number;
  driverCount: number;
}

function getZoneColor(intensity: number): string {
  if (intensity >= 0.8) return "#ef4444"; // red
  if (intensity >= 0.6) return "#f97316"; // orange
  if (intensity >= 0.4) return "#eab308"; // yellow
  if (intensity >= 0.2) return "#84cc16"; // lime
  return "#22c55e"; // green
}

function RecenterMap({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

export function HeatMapView({
  zones,
  center,
}: {
  zones: HeatZone[];
  center: { lat: number; lng: number };
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ height: "55vh", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />

      {zones.map((zone, i) => (
        <Circle
          key={`${zone.lat}-${zone.lng}-${i}`}
          center={[zone.lat, zone.lng]}
          radius={800 + zone.intensity * 400}
          pathOptions={{
            color: getZoneColor(zone.intensity),
            fillColor: getZoneColor(zone.intensity),
            fillOpacity: 0.25 + zone.intensity * 0.25,
            weight: 1,
          }}
        >
          <Popup>
            <div className="text-xs space-y-1">
              <p className="font-semibold">Demand Zone</p>
              <p>Requests nearby: ~{zone.requestCount}</p>
              <p>Drivers here: {zone.driverCount}</p>
              <p>Intensity: {Math.round(zone.intensity * 100)}%</p>
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}
