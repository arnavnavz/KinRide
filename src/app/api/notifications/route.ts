import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["ride_update", "message", "promo", "system", "loyalty"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const typeFilter = searchParams.get("type");

    const where: { userId: string; type?: string } = { userId };
    if (typeFilter && VALID_TYPES.includes(typeFilter)) {
      where.type = typeFilter;
    }

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: body.ids }, userId },
        data: { read: true },
      });
    } else {
      return NextResponse.json({ error: "Provide ids array or markAllRead" }, { status: 400 });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (err) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
