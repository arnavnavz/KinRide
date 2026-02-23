import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isParticipant =
      conversation.user1Id === session.user.id ||
      conversation.user2Id === session.user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error("GET /api/chats/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isParticipant =
      conversation.user1Id === session.user.id ||
      conversation.user2Id === session.user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const [message] = await prisma.$transaction([
      prisma.directMessage.create({
        data: {
          conversationId: id,
          senderId: session.user.id,
          content: content.trim(),
        },
        include: {
          sender: { select: { id: true, name: true } },
        },
      }),
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("POST /api/chats/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
