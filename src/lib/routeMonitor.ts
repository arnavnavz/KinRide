import { getSocketIO } from "./socket-server";
import { notifyRideEvent } from "./push";

// Driver must be > 1 mile off the actual road route to trigger an alert.
// (We use the stored OSRM polyline when available; straight-line as fallback.)
const DEVIATION_THRESHOLD_MILES = 1.0;

// Driver must move < 50 meters between location pings to be considered stopped
const STOP_THRESHOLD_MILES = 50 / 1609.34; // ~0.031 miles

// Alert after the driver has been stationary for 5 minutes
const STOP_DURATION_MS = 5 * 60 * 1000;

// Minimum time between repeat alerts of the same type
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

/** Haversine distance in miles between two lat/lng points. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Perpendicular distance (miles) from point P to a single line segment A→B.
 * Projects P onto AB and clamps to the segment endpoints.
 */
function pointToSegmentMiles(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistance(pLat, pLng, aLat, aLng);
  }

  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return haversineDistance(pLat, pLng, aLat + t * dy, aLng + t * dx);
}

/**
 * Minimum distance (miles) from point P to the nearest segment of a polyline.
 * This is the correct check when the route curves around obstacles — a driver
 * can be far from the straight line between pickup and dropoff but still be
 * perfectly on the right road.
 */
function distanceToPolylineMiles(
  pLat: number,
  pLng: number,
  polyline: [number, number][]
): number {
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i];
    const [bLat, bLng] = polyline[i + 1];
    const d = pointToSegmentMiles(pLat, pLng, aLat, aLng, bLat, bLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export interface MonitorInput {
  rideId: string;
  riderId: string;
  driverLat: number;
  driverLng: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  /** Stored OSRM polyline as [[lat, lng], …]. When present, deviation is
   *  checked against the nearest road segment instead of the straight line. */
  routePolyline: [number, number][] | null;
  prevLat: number | null;
  prevLng: number | null;
  speed: number | null;
  stoppedSince: Date | null;
  lastDeviationAlertAt: Date | null;
  lastStopAlertAt: Date | null;
}

export interface MonitorResult {
  stoppedSince: Date | null;
  lastDeviationAlertAt: Date | null;
  lastStopAlertAt: Date | null;
}

export async function runRouteMonitor(input: MonitorInput): Promise<MonitorResult> {
  const now = new Date();
  let { stoppedSince, lastDeviationAlertAt, lastStopAlertAt } = input;

  // ── Route deviation ──────────────────────────────────────────────────────
  // Prefer the stored road-network polyline. Fall back to the straight-line
  // corridor only when the polyline hasn't been fetched yet (e.g. the very
  // first location ping after the ride started).
  const deviationMiles =
    input.routePolyline && input.routePolyline.length >= 2
      ? distanceToPolylineMiles(input.driverLat, input.driverLng, input.routePolyline)
      : pointToSegmentMiles(
          input.driverLat,
          input.driverLng,
          input.pickupLat,
          input.pickupLng,
          input.dropoffLat,
          input.dropoffLng
        );

  const deviationCooldownOk =
    !lastDeviationAlertAt ||
    now.getTime() - lastDeviationAlertAt.getTime() > ALERT_COOLDOWN_MS;

  if (deviationMiles > DEVIATION_THRESHOLD_MILES && deviationCooldownOk) {
    lastDeviationAlertAt = now;
    await emitSafetyAlert({
      type: "deviation",
      rideId: input.rideId,
      riderId: input.riderId,
      deviationMiles,
    });
  }

  // ── Stopped vehicle ──────────────────────────────────────────────────────
  const distanceMoved =
    input.prevLat !== null && input.prevLng !== null
      ? haversineDistance(input.prevLat, input.prevLng, input.driverLat, input.driverLng)
      : Infinity;

  // Treat driver as stationary when speed is < 2 mph OR movement between
  // pings is under the threshold (covers cases where speed is not reported)
  const isStationary =
    distanceMoved < STOP_THRESHOLD_MILES ||
    (input.speed !== null && input.speed < 2);

  if (isStationary) {
    if (!stoppedSince) {
      stoppedSince = now;
    } else {
      const stoppedMs = now.getTime() - stoppedSince.getTime();
      const stopCooldownOk =
        !lastStopAlertAt ||
        now.getTime() - lastStopAlertAt.getTime() > ALERT_COOLDOWN_MS;

      if (stoppedMs > STOP_DURATION_MS && stopCooldownOk) {
        lastStopAlertAt = now;
        await emitSafetyAlert({
          type: "stopped",
          rideId: input.rideId,
          riderId: input.riderId,
          stoppedMinutes: Math.round(stoppedMs / 60000),
        });
      }
    }
  } else {
    // Driver is moving — reset the stopped timer
    stoppedSince = null;
  }

  return { stoppedSince, lastDeviationAlertAt, lastStopAlertAt };
}

type AlertPayload =
  | { type: "deviation"; rideId: string; riderId: string; deviationMiles: number }
  | { type: "stopped"; rideId: string; riderId: string; stoppedMinutes: number };

async function emitSafetyAlert(payload: AlertPayload) {
  const message =
    payload.type === "deviation"
      ? `Your driver appears to be ${(payload as { deviationMiles: number }).deviationMiles.toFixed(1)} miles off the expected route.`
      : `Your driver has been stopped for ${(payload as { stoppedMinutes: number }).stoppedMinutes} minutes.`;

  const socketData = {
    type: payload.type,
    message,
    rideId: payload.rideId,
  };

  // Real-time in-app alert via Socket.IO
  const io = getSocketIO();
  if (io) {
    io.to(`ride:${payload.rideId}`).emit("safety:check", socketData);
  }

  // Background push notification for when the app is not open
  await notifyRideEvent(payload.riderId, "safety_check", payload.rideId, {
    safetyMessage: message,
  }).catch(() => {});
}
