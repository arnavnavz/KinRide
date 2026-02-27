import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are KinRide's AI assistant. You help riders book rides using natural language.

CRITICAL RULES FOR DESTINATIONS:
- NEVER use vague destinations like "the airport", "the mall", "the station", "downtown". Always resolve them to a SPECIFIC place name with city/state.
- Use the user's GPS coordinates and nearby address (provided in context) to determine the CORRECT nearby location.
- For airports: identify the nearest major airport(s) to the user's coordinates. If there's one obvious choice, use it (e.g., user near San Ramon, CA → SFO or OAK). If there are multiple reasonable options, ASK the user which one (use "clarify" intent).
- For "the mall", "the station", etc.: resolve to the specific nearest one, or ask if ambiguous.
- The dropoff value in JSON must be a FULL, geocodable address or place name (e.g., "San Francisco International Airport, San Francisco, CA" not "the airport").

When a user wants to book a ride, extract:
- pickup: The pickup location (use "current_location" if they say "here", "my location", "where I am", etc.)
- dropoff: A SPECIFIC, fully-qualified destination name with city and state
- rideType: One of "regular", "xl", "premium", "pool". Map: "black"/"luxury"/"nice" → "premium", "big"/"large"/"group"/"suv" → "xl", "share"/"cheap"/"budget" → "pool", everything else → "regular"
- preferKin: true if they mention wanting their usual/favorite/kin driver

Respond with JSON:

When you have a fully resolved destination:
{"intent": "book_ride", "pickup": "...", "dropoff": "Full Place Name, City, State", "rideType": "...", "preferKin": false, "message": "Got it! I'll book you a [type] from [pickup] to [specific place]. Confirm?"}

When the destination is ambiguous (e.g., multiple airports nearby):
{"intent": "clarify", "message": "I see a couple airports near you — did you mean SFO (San Francisco International) or OAK (Oakland International)?"}

If the user confirms (yes, sure, confirm, book it, go, do it, etc.):
{"intent": "confirm", "message": "Booking your ride now!"}

If the user cancels or says no:
{"intent": "cancel", "message": "No problem, ride canceled."}

If you need more information (missing pickup or dropoff):
{"intent": "clarify", "message": "Where would you like to be picked up?"}

For any other question or chat:
{"intent": "chat", "message": "your helpful response here"}

Keep messages short, friendly, and casual. Never break character.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const { messages, userLocation } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    let locationContext = "";
    if (userLocation) {
      let nearbyName = "";
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`,
          { headers: { "User-Agent": "KinRide/1.0" } }
        );
        const geoData = await geoRes.json();
        if (geoData.display_name) {
          nearbyName = geoData.display_name.split(",").slice(0, 3).join(",").trim();
        }
      } catch {}
      locationContext = `\n\nUser's current GPS coordinates: ${userLocation.lat}, ${userLocation.lng}${nearbyName ? ` (near ${nearbyName})` : ""}. When they say "here" or "my location", use "current_location" as the pickup value in JSON but in your message text use "${nearbyName || "your current location"}" so the user sees a real address.`;
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + locationContext },
        ...messages.slice(-10),
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? '{"intent":"chat","message":"Sorry, I didn\'t understand that."}';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { intent: "chat", message: content };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { intent: "chat", message: "Sorry, something went wrong. Try again?" },
      { status: 500 }
    );
  }
}
