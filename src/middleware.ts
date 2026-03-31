import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// ─── In-memory fallback (used when Redis unavailable) ───────────────

interface MemoryEntry { count: number; resetAt: number; }
const memStore = new Map<string, MemoryEntry>();
let lastCleanup = Date.now();

function memoryCheck(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    for (const [k, v] of memStore) { if (v.resetAt < now) memStore.delete(k); }
  }
  const entry = memStore.get(key);
  if (!entry || entry.resetAt < now) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

// ─── Redis-backed check ─────────────────────────────────────────────

async function redisCheck(key: string, limit: number, windowSec: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return memoryCheck(key, limit, windowSec * 1000);

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return count > limit;
  } catch {
    return memoryCheck(key, limit, windowSec * 1000);
  }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  return response;
}

function rateLimitResponse(msg: string, retryAfter: number) {
  return withSecurityHeaders(
    NextResponse.json(
      { error: msg },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  );
}

// ─── Middleware ──────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  if (pathname.startsWith("/api/auth/") && req.method === "POST") {
    if (await redisCheck(`mw:auth:${ip}`, 10, 60)) {
      return rateLimitResponse("Too many login attempts. Please try again in a minute.", 60);
    }
  }

  if (pathname.match(/^\/api\/rides\/[^/]+\/status$/) && req.method === "POST") {
    if (await redisCheck(`mw:status:${ip}`, 30, 60)) {
      return rateLimitResponse("Too many requests. Please try again later.", 60);
    }
  }

  if ((pathname.startsWith("/api/wallet") || pathname.startsWith("/api/payments")) && req.method === "POST") {
    if (await redisCheck(`mw:pay:${ip}`, 15, 60)) {
      return rateLimitResponse("Too many requests. Please try again later.", 60);
    }
  }

  if (pathname === "/api/support" && req.method === "POST") {
    if (await redisCheck(`mw:support:${ip}`, 5, 300)) {
      return rateLimitResponse("Too many support requests. Please wait a few minutes.", 300);
    }
  }

  if (pathname.startsWith("/api/admin") && req.method !== "GET") {
    if (await redisCheck(`mw:admin:${ip}`, 30, 60)) {
      return withSecurityHeaders(rateLimitResponse("Too many admin requests. Please try again later.", 60));
    }
  }

  if (pathname === "/api/profile" && req.method === "PATCH") {
    if (await redisCheck(`mw:profile:${ip}`, 10, 60)) {
      return withSecurityHeaders(rateLimitResponse("Too many requests. Please try again later.", 60));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|monitoring).*)"],
};
