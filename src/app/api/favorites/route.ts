import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kinCodeSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favoriteDriver.findMany({
      where: { riderId: session.user.id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            driverProfile: {
              select: {
                vehicleMake: true,
                vehicleModel: true,
                vehicleColor: true,
                kinCode: true,
                isVerified: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(favorites);
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = kinCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { kinCode: parsed.data.kinCode.toUpperCase() },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Driver not found with that Kin Code" }, { status: 404 });
    }

    const existing = await prisma.favoriteDriver.findUnique({
      where: {
        riderId_driverId: {
          riderId: session.user.id,
          driverId: profile.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already in your Kin list" }, { status: 409 });
    }

    const favorite = await prisma.favoriteDriver.create({
      data: {
        riderId: session.user.id,
        driverId: profile.userId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            driverProfile: {
              select: {
                vehicleMake: true,
                vehicleModel: true,
                vehicleColor: true,
                kinCode: true,
                isVerified: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (err) {
    console.error("POST /api/favorites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");
    if (!driverId) {
      return NextResponse.json({ error: "driverId required" }, { status: 400 });
    }

    await prisma.favoriteDriver.deleteMany({
      where: { riderId: session.user.id, driverId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/favorites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
