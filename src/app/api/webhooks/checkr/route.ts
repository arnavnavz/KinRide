import { NextRequest, NextResponse } from "next/server";
import { handleCheckrWebhook } from "@/lib/verification";

const CHECKR_WEBHOOK_SECRET = process.env.CHECKR_WEBHOOK_SECRET || "";

function verifyCheckrSignature(body: string, signature: string | null): boolean {
  if (!CHECKR_WEBHOOK_SECRET || !signature) return !CHECKR_WEBHOOK_SECRET;

  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", CHECKR_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-checkr-signature");

    if (CHECKR_WEBHOOK_SECRET && !verifyCheckrSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.type === "report.completed") {
      await handleCheckrWebhook(event);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Checkr webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
