import { NextResponse } from "next/server";

export async function GET() {
  let dbHealthy = false;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    // DB not connected yet
  }

  return NextResponse.json({
    status: dbHealthy ? "healthy" : "degraded",
    database: dbHealthy ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
    version: process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7) || "dev",
    uptime: Math.floor(process.uptime()),
  });
}
