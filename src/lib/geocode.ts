export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(
  address: string,
  nearLocation?: LatLng
): Promise<LatLng | null> {
  if (!address || address.length < 3) return null;

  try {
    let url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    if (nearLocation) {
      const delta = 2;
      url += `&viewbox=${nearLocation.lng - delta},${nearLocation.lat + delta},${nearLocation.lng + delta},${nearLocation.lat - delta}&bounded=0`;
    }
    const res = await fetch(url, { headers: { "User-Agent": "KinRide/1.0" } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Geocoding failure is non-critical
  }
  return null;
}

export async function searchAddresses(
  query: string
): Promise<GeocodeSuggestion[]> {
  if (!query || query.length < 3) return [];

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      { headers: { "User-Agent": "KinRide/1.0" } }
    );
    const data = await res.json();
    return data.map(
      (item: { display_name: string; lat: string; lon: string }) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      })
    );
  } catch {
    return [];
  }
}
