import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lat, lng, heading, speed } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    await prisma.driverLocation.upsert({
      where: { driverId: session.user.id },
      create: {
        driverId: session.user.id,
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
      },
      update: {
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
      },
    });

    await prisma.driverProfile.updateMany({
      where: { userId: session.user.id },
      data: { lastKnownLat: lat, lastKnownLng: lng },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/driver/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = req.nextUrl.searchParams.get("driverId");
    if (!driverId) {
      return NextResponse.json({ error: "driverId required" }, { status: 400 });
    }

    const location = await prisma.driverLocation.findUnique({
      where: { driverId },
    });

    if (!location) {
      return NextResponse.json({ error: "No location found" }, { status: 404 });
    }

    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      speed: location.speed,
      updatedAt: location.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/driver/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
