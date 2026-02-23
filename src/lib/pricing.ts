import { geocodeAddress } from "./geocode";
import type { DriverPlan } from "@prisma/client";

const BASE_FEE = 3.0;
const PER_MILE_RATE = 2.0;
const EARTH_RADIUS_MILES = 3958.8;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function estimateFare(
  pickupAddress: string,
  dropoffAddress: string
): Promise<number | null> {
  const [pickup, dropoff] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(dropoffAddress),
  ]);

  if (!pickup || !dropoff) return null;

  const miles = haversineDistance(
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng
  );

  // Road distance is ~1.3x straight-line
  const roadMiles = miles * 1.3;
  const fare = BASE_FEE + roadMiles * PER_MILE_RATE;

  return Math.round(fare * 100) / 100;
}

const COMMISSION_RATES = {
  standard: 0.2,
  kin_free: 0.1,
  kin_pro: 0.0,
} as const;

export function computeCommission(
  fare: number,
  isKinRide: boolean,
  driverPlan: DriverPlan
): { rate: number; fee: number } {
  let rate: number;

  if (!isKinRide) {
    rate = COMMISSION_RATES.standard;
  } else if (driverPlan === "KIN_PRO") {
    rate = COMMISSION_RATES.kin_pro;
  } else {
    rate = COMMISSION_RATES.kin_free;
  }

  const fee = Math.round(fare * rate * 100) / 100;
  return { rate, fee };
}

export function getCommissionLabel(isKinRide: boolean, driverPlan?: DriverPlan): string {
  if (!isKinRide) return "20% commission";
  if (driverPlan === "KIN_PRO") return "0% commission (KinPro)";
  return "10% commission (Kin)";
}

// ISO week string e.g. "2026-W08"
export function getCurrentWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const CREDITS_PER_RIDE = 10;
const STREAK_BONUS = 5;

export function computeLoyaltyCredits(streakWeeks: number): {
  base: number;
  streakBonus: number;
  total: number;
} {
  const streakBonus = streakWeeks > 0 ? STREAK_BONUS : 0;
  return {
    base: CREDITS_PER_RIDE,
    streakBonus,
    total: CREDITS_PER_RIDE + streakBonus,
  };
}
