import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estimateFare } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pickupAddress, dropoffAddress } = await req.json();
    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json({ error: "Both addresses required" }, { status: 400 });
    }

    const fare = await estimateFare(pickupAddress, dropoffAddress);
    return NextResponse.json({ estimatedFare: fare });
  } catch (err) {
    console.error("POST /api/rides/estimate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
