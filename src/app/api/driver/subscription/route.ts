import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await prisma.driverSubscription.findUnique({
      where: { driverId: session.user.id },
    });

    return NextResponse.json({
      plan: sub?.plan ?? "FREE",
      expiresAt: sub?.expiresAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/driver/subscription error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan || !["FREE", "KIN_PRO"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const expiresAt = plan === "KIN_PRO"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;

    const sub = await prisma.driverSubscription.upsert({
      where: { driverId: session.user.id },
      create: {
        driverId: session.user.id,
        plan,
        expiresAt,
      },
      update: { plan, expiresAt },
    });

    return NextResponse.json({
      plan: sub.plan,
      expiresAt: sub.expiresAt,
    });
  } catch (err) {
    console.error("POST /api/driver/subscription error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
