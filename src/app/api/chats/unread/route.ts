import { NextResponse } from "next/server";
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

    // Count messages in all conversations where user is participant
    // and message was sent by the *other* user after the conversation's updatedAt
    // For simplicity, count messages not sent by this user in the last 24h
    // that are newer than the conversation's last view
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: { id: true },
    });

    if (conversations.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const convIds = conversations.map((c) => c.id);

    // Count unread = messages not from this user in the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.directMessage.count({
      where: {
        conversationId: { in: convIds },
        senderId: { not: userId },
        createdAt: { gt: since },
      },
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/chats/unread error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
