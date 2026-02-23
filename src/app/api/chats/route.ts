import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: { id: true, name: true, role: true, driverProfile: { select: { kinCode: true, vehicleMake: true, vehicleModel: true, vehicleColor: true, isOnline: true } } },
        },
        user2: {
          select: { id: true, name: true, role: true, driverProfile: { select: { kinCode: true, vehicleMake: true, vehicleModel: true, vehicleColor: true, isOnline: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = conversations.map((c) => {
      const other = c.user1Id === userId ? c.user2 : c.user1;
      const lastMessage = c.messages[0] || null;
      return {
        id: c.id,
        otherUser: other,
        lastMessage,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("GET /api/chats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await req.json();
    if (!otherUserId || typeof otherUserId !== "string") {
      return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
    }

    const userId = session.user.id;

    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isFavorited = await prisma.favoriteDriver.findFirst({
      where: {
        OR: [
          { riderId: userId, driverId: otherUserId },
          { riderId: otherUserId, driverId: userId },
        ],
      },
    });

    if (!isFavorited) {
      return NextResponse.json({ error: "You can only message Kin drivers" }, { status: 403 });
    }

    const [u1, u2] = [userId, otherUserId].sort();

    const existing = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id });
    }

    const conversation = await prisma.conversation.create({
      data: { user1Id: u1, user2Id: u2 },
    });

    return NextResponse.json({ id: conversation.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/chats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
