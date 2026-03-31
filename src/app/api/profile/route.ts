import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        driverProfile: {
          select: {
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleColor: true,
            licensePlate: true,
            kinCode: true,
            isVerified: true,
          },
        },
        riderLoyalty: {
          select: { credits: true, lifetimeRides: true, streakWeeks: true },
        },
        _count: {
          select: {
            rideRequests: true,
            ridesAsDriver: { where: { status: "COMPLETED" } },
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, currentPassword, newPassword } = body;

    const updateData: Record<string, unknown> = {};

    if (name && typeof name === "string" && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (!user.passwordHash) {
        return NextResponse.json({ error: "This account uses social login and has no password" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const vehicleFields = ["vehicleMake", "vehicleModel", "vehicleYear", "vehicleColor", "licensePlate"] as const;
    const hasVehicleUpdate = vehicleFields.some((f) => body[f]);

    if (Object.keys(updateData).length === 0 && !hasVehicleUpdate) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    let updated;
    if (Object.keys(updateData).length > 0) {
      updated = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
    } else {
      updated = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
    }

    let vehicleResult = null;
    if (hasVehicleUpdate && session.user.role === "DRIVER") {
      const vehicleData: Record<string, unknown> = {};
      if (body.vehicleMake) vehicleData.vehicleMake = body.vehicleMake.trim();
      if (body.vehicleModel) vehicleData.vehicleModel = body.vehicleModel.trim();
      if (body.vehicleYear) vehicleData.vehicleYear = parseInt(body.vehicleYear);
      if (body.vehicleColor) vehicleData.vehicleColor = body.vehicleColor.trim();
      if (body.licensePlate) vehicleData.licensePlate = body.licensePlate.trim().toUpperCase();

      if (Object.keys(vehicleData).length > 0) {
        vehicleResult = await prisma.driverProfile.update({
          where: { userId: session.user.id },
          data: vehicleData,
        });
      }
    }

    return NextResponse.json({ ...updated, driverProfile: vehicleResult });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const activeRide = await prisma.rideRequest.findFirst({
      where: {
        OR: [{ riderId: userId }, { driverId: userId }],
        status: { in: ["REQUESTED", "OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"] },
      },
    });

    if (activeRide) {
      return NextResponse.json(
        { error: "Cannot delete account with active rides. Complete or cancel them first." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: "Deleted User",
        email: \`deleted_\${userId}@kinride.local\`,
        passwordHash: null,
        phone: null,
        image: null,
        emailVerified: false,
      },
    });

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("DELETE /api/profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
