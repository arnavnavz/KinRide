import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = req.nextUrl.searchParams;
    const search = url.get("search") || "";
    const status = url.get("status") || "all";
    const page = Math.max(1, parseInt(url.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    let profileFilter = {};
    if (status === "verified") {
      profileFilter = { driverProfile: { isVerified: true, verificationRevokedAt: null } };
    } else if (status === "pending") {
      profileFilter = { driverProfile: { isVerified: false, verificationRevokedAt: null } };
    } else if (status === "revoked") {
      profileFilter = { driverProfile: { verificationRevokedAt: { not: null } } };
    }

    const where = {
      role: "DRIVER" as const,
      ...searchFilter,
      ...profileFilter,
    };

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          driverProfile: {
            select: {
              id: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleYear: true,
              vehicleColor: true,
              licensePlate: true,
              isVerified: true,
              isOnline: true,
              kinCode: true,
              stripeVerificationStatus: true,
              checkrStatus: true,
              verificationRevokedAt: true,
              revocationReason: true,
            },
          },
          _count: {
            select: {
              ridesAsDriver: { where: { status: "COMPLETED" } },
              driverDocuments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/drivers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { driverId, action, reason } = await req.json();

    if (!driverId || !action) {
      return NextResponse.json({ error: "driverId and action required" }, { status: 400 });
    }

    if (!["approve", "suspend", "reinstate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    if (action === "approve") {
      updateData = {
        isVerified: true,
        verificationRevokedAt: null,
        revocationReason: null,
      };
    } else if (action === "suspend") {
      updateData = {
        isVerified: false,
        isOnline: false,
        verificationRevokedAt: new Date(),
        revocationReason: reason || "Suspended by admin",
      };
    } else if (action === "reinstate") {
      updateData = {
        isVerified: true,
        verificationRevokedAt: null,
        revocationReason: null,
      };
    }

    const updated = await prisma.driverProfile.update({
      where: { userId: driverId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/admin/drivers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
