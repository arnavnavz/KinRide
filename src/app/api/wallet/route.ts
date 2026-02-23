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

    const wallet = await prisma.wallet.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, balance: 0 },
      update: {},
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      balance: wallet.balance,
      transactions: wallet.transactions,
    });
  } catch (err) {
    console.error("GET /api/wallet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
