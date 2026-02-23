import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.rideOffer.updateMany({
      where: {
        rideRequestId: id,
        driverId: session.user.id,
        status: "PENDING",
      },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/rides/[id]/decline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
