import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  prefix?: string;
}

function getClientKey(req: NextRequest, prefix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `rl:${prefix}:${ip}`;
}

function buildResponse(retryAfter: number, limit: number, resetAt: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}

// ─── Redis-backed rate limiter ──────────────────────────────────────

async function checkRateLimitRedis(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const redis = getRedis();
  if (!redis) return checkRateLimitMemory(req, config);

  const key = getClientKey(req, config.prefix || "global");

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    if (count > config.limit) {
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : config.windowSeconds;
      return buildResponse(retryAfter, config.limit, Date.now() + retryAfter * 1000);
    }

    return null;
  } catch (err) {
    console.error("[rate-limit] Redis error, falling back to memory:", err);
    return checkRateLimitMemory(req, config);
  }
}

// ─── In-memory fallback ─────────────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

function checkRateLimitMemory(
  req: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  cleanupMemory();

  const key = getClientKey(req, config.prefix || "global");
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return buildResponse(retryAfter, config.limit, entry.resetAt);
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────

export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  // Synchronous check first for compatibility — if Redis is available,
  // we return the memory result immediately and the Redis call runs
  // in background to update counts. For simplicity, use memory-based
  // when called synchronously.
  return checkRateLimitMemory(req, config);
}

export async function checkRateLimitAsync(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  return checkRateLimitRedis(req, config);
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 60, prefix: "auth" } as RateLimitConfig,
  aiChat: { limit: 20, windowSeconds: 60, prefix: "ai" } as RateLimitConfig,
  rideRequest: { limit: 10, windowSeconds: 60, prefix: "ride" } as RateLimitConfig,
  upload: { limit: 20, windowSeconds: 300, prefix: "upload" } as RateLimitConfig,
  general: { limit: 100, windowSeconds: 60, prefix: "api" } as RateLimitConfig,
  pushSubscribe: { limit: 5, windowSeconds: 60, prefix: "push" } as RateLimitConfig,
} as const;
