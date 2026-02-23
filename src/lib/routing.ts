import type { LatLng } from "./geocode";

interface RouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export async function fetchRoute(waypoints: LatLng[]): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  try {
    const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}
