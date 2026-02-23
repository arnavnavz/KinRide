import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id } });
    if (!ride) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isParticipant =
      ride.riderId === session.user.id || ride.driverId === session.user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedStatuses = ["OFFERED", "ACCEPTED", "ARRIVING", "IN_PROGRESS"];
    if (!allowedStatuses.includes(ride.status)) {
      return NextResponse.json(
        { error: "Messaging not available in this ride state" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        rideRequestId: id,
        senderId: session.user.id,
        receiverId: parsed.data.receiverId,
        content: parsed.data.content,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("POST /api/rides/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id } });
    if (!ride) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isParticipant =
      ride.riderId === session.user.id || ride.driverId === session.user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { rideRequestId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error("GET /api/rides/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
