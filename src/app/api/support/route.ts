import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    const categoryMap: Record<string, string> = {
      general: "other",
      ride: "fare_dispute",
      payment: "fare_dispute",
      safety: "safety",
      account: "app_issue",
      driver: "driver_issue",
    };

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session?.user?.id || "",
        subject: `[${subject || "general"}] ${name.trim()}: ${message.trim().substring(0, 80)}`,
        description: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`,
        category: categoryMap[subject] || "other",
        status: "open",
      },
    });

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/support error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(tickets);
  } catch (err) {
    console.error("GET /api/support error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
