import { NextRequest, NextResponse } from "next/server";
import { getSurgeMultiplier, getSurgeLabel } from "@/lib/surge";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const surge = await getSurgeMultiplier(lat, lng);

  return NextResponse.json({
    ...surge,
    label: getSurgeLabel(surge.multiplier),
  });
}
