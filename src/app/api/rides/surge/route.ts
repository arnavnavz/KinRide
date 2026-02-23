import { NextResponse } from "next/server";
import { getSurgeMultiplier } from "@/lib/surge";

export async function GET() {
  return NextResponse.json(getSurgeMultiplier());
}
