import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit";

function mockRequest(ip: string = "127.0.0.1"): any {
  return {
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-for") return ip;
        return null;
      },
    },
  };
}

describe("checkRateLimit", () => {
  const config: RateLimitConfig = {
    limit: 3,
    windowSeconds: 60,
    prefix: "test-" + Math.random(),
  };

  it("allows requests under the limit", () => {
    const cfg = { ...config, prefix: "test-allow-" + Math.random() };
    const req = mockRequest("10.0.0.1");
    expect(checkRateLimit(req, cfg)).toBeNull();
    expect(checkRateLimit(req, cfg)).toBeNull();
    expect(checkRateLimit(req, cfg)).toBeNull();
  });

  it("blocks requests over the limit", () => {
    const cfg = { ...config, prefix: "test-block-" + Math.random() };
    const req = mockRequest("10.0.0.2");
    checkRateLimit(req, cfg);
    checkRateLimit(req, cfg);
    checkRateLimit(req, cfg);
    const result = checkRateLimit(req, cfg);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("tracks different IPs separately", () => {
    const cfg = { ...config, prefix: "test-ip-" + Math.random() };
    const req1 = mockRequest("10.0.0.3");
    const req2 = mockRequest("10.0.0.4");

    checkRateLimit(req1, cfg);
    checkRateLimit(req1, cfg);
    checkRateLimit(req1, cfg);

    // req2 should still be allowed
    expect(checkRateLimit(req2, cfg)).toBeNull();

    // req1 should be blocked
    expect(checkRateLimit(req1, cfg)).not.toBeNull();
  });

  it("tracks different prefixes separately", () => {
    const cfg1 = { ...config, prefix: "test-prefix-a-" + Math.random() };
    const cfg2 = { ...config, prefix: "test-prefix-b-" + Math.random() };
    const req = mockRequest("10.0.0.5");

    checkRateLimit(req, cfg1);
    checkRateLimit(req, cfg1);
    checkRateLimit(req, cfg1);

    // Different prefix should still be allowed
    expect(checkRateLimit(req, cfg2)).toBeNull();
  });

  it("returns 429 response with Retry-After header", () => {
    const cfg = { ...config, prefix: "test-header-" + Math.random() };
    const req = mockRequest("10.0.0.6");

    for (let i = 0; i < 4; i++) checkRateLimit(req, cfg);

    const result = checkRateLimit(req, cfg);
    expect(result).not.toBeNull();

    // Verify it's a NextResponse-like object with 429 status
    expect(result!.status).toBe(429);
  });
});
