import { NextRequest, NextResponse } from "next/server";
import {
  expireStaleOffers,
  triggerScheduledRides,
  cleanupStaleLocations,
  cleanupOldDocuments,
  cleanupOldNotifications,
} from "@/lib/jobs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [offers, scheduled, locations, documents, notifications] =
      await Promise.all([
        expireStaleOffers(),
        triggerScheduledRides(),
        cleanupStaleLocations(),
        cleanupOldDocuments(),
        cleanupOldNotifications(),
      ]);

    return NextResponse.json({
      offers,
      scheduled,
      locations,
      documents,
      notifications,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron run-all error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
