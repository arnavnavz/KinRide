import webpush from "web-push";
import { prisma } from "./prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@kayu.app";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured — push notifications disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent, failed };
}

export async function notifyRideEvent(
  userId: string,
  event: string,
  rideId: string,
  extra?: Record<string, string>
) {
  const messages: Record<string, PushPayload> = {
    ride_accepted: {
      title: "Driver found!",
      body: extra?.driverName
        ? `${extra.driverName} accepted your ride`
        : "A driver has accepted your ride",
      url: `/rider/ride/${rideId}`,
    },
    ride_arriving: {
      title: "Driver is arriving",
      body: extra?.driverName
        ? `${extra.driverName} is almost at your pickup`
        : "Your driver is almost there",
      url: `/rider/ride/${rideId}`,
    },
    ride_started: {
      title: "Ride started",
      body: "Enjoy your ride!",
      url: `/rider/ride/${rideId}`,
    },
    ride_completed: {
      title: "You've arrived!",
      body: extra?.fare
        ? `Ride complete — $${extra.fare}`
        : "Your ride is complete",
      url: `/rider/ride/${rideId}`,
    },
    ride_canceled: {
      title: "Ride canceled",
      body: extra?.reason || "Your ride has been canceled",
      url: `/rider/ride/${rideId}`,
    },
    new_ride_offer: {
      title: "New ride request!",
      body: extra?.pickup
        ? `Pickup at ${extra.pickup}`
        : "A rider needs a ride",
      url: `/driver/dashboard`,
    },
    tip_received: {
      title: "You got a tip!",
      body: extra?.amount
        ? `$${extra.amount} tip received`
        : "A rider tipped you",
      url: `/driver/dashboard`,
    },
    chat_message: {
      title: extra?.senderName || "New message",
      body: extra?.preview || "You have a new message",
      url: `/rider/ride/${rideId}`,
    },
    scheduled_reminder: {
      title: "Upcoming ride in 30 min",
      body: extra?.pickup
        ? `Your ride from ${extra.pickup} is coming up`
        : "Your scheduled ride is coming up soon",
      url: `/rider/ride/${rideId}`,
    },
  };

  const payload = messages[event];
  if (!payload) return;

  // Also save as in-app notification
  try {
    await prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: event.startsWith("ride_") ? "ride_update" : event === "chat_message" ? "message" : "system",
        linkUrl: payload.url,
      },
    });
  } catch {
    // Non-critical
  }

  return sendPushToUser(userId, payload);
}
