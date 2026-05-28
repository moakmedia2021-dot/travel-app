// Rate limiting via Upstash Redis. Gracefully no-ops when env vars
// aren't configured — safe to deploy without setup, just no limits enforced.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limit = {
  check: (identifier: string) => Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }>;
};

function makeLimit(requests: number, windowSeconds: number, prefix: string): Limit {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // No-op limiter
    return {
      async check() {
        return { success: true };
      },
    };
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix: `rl:${prefix}`,
    analytics: true,
  });

  return {
    async check(identifier: string) {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    },
  };
}

// 10 requests per minute (auth / sensitive)
export const strictLimit = makeLimit(10, 60, "strict");

// 60 requests per minute (default API)
export const standardLimit = makeLimit(60, 60, "standard");

/**
 * Get the requester's IP from common headers (Vercel sets these).
 * Falls back to "anonymous" if nothing is present.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "anonymous"
  );
}

/**
 * Helper: enforce a rate limit on a Request. Returns a 429 Response
 * if exceeded, or null if the request should proceed.
 */
export async function enforceRateLimit(
  req: Request,
  limit: Limit
): Promise<Response | null> {
  const ip = getClientIp(req);
  const { success, limit: max, remaining, reset } = await limit.check(ip);
  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retry_after: reset ? Math.max(0, Math.ceil((reset - Date.now()) / 1000)) : 60,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(max ?? ""),
          "X-RateLimit-Remaining": String(remaining ?? 0),
          "X-RateLimit-Reset": String(reset ?? ""),
          "Retry-After": "60",
        },
      }
    );
  }
  return null;
}
