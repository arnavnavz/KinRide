import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "No driver profile" }, { status: 404 });
    }

    // Prevent going online if verification was revoked
    if (!profile.isOnline && profile.verificationRevokedAt) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      );
    }

    const updated = await prisma.driverProfile.update({
      where: { userId: session.user.id },
      data: { isOnline: !profile.isOnline },
    });

    return NextResponse.json({ isOnline: updated.isOnline });
  } catch (err) {
    console.error("POST /api/driver/toggle error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
