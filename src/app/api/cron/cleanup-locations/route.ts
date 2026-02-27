import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const result = await prisma.driverLocation.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    console.error("Cleanup locations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
