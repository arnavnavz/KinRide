import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_CATEGORIES = [
  "fare_dispute",
  "safety",
  "lost_item",
  "driver_issue",
  "app_issue",
  "other",
] as const;

const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(VALID_CATEGORIES),
  rideRequestId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (err) {
    console.error("GET /api/support error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { subject, description, category, rideRequestId } = parsed.data;

    if (rideRequestId) {
      const ride = await prisma.rideRequest.findFirst({
        where: { id: rideRequestId, riderId: session.user.id },
      });
      if (!ride) {
        return NextResponse.json({ error: "Ride not found" }, { status: 404 });
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        description,
        category,
        rideRequestId: rideRequestId ?? null,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error("POST /api/support error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
