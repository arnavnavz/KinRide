import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStripeVerificationSession, getVerificationStatus } from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    if (profile.stripeVerificationStatus === "verified") {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    const result = await createStripeVerificationSession(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/driver/verify error:", err);
    return NextResponse.json({ error: "Failed to start verification" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        stripeVerificationStatus: true,
        checkrStatus: true,
        isVerified: true,
        verificationRevokedAt: true,
        revocationReason: true,
        idVerifiedAt: true,
        backgroundCheckAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const status = getVerificationStatus(profile);

    return NextResponse.json({
      ...status,
      idVerifiedAt: profile.idVerifiedAt,
      backgroundCheckAt: profile.backgroundCheckAt,
    });
  } catch (err) {
    console.error("GET /api/driver/verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
