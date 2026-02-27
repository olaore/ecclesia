import { Context, Next } from "hono";

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store keyed by IP. Resets on worker restart which is acceptable for Workers.
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter middleware.
 * Uses the client IP (via CF-Connecting-IP header or fallback) as the key.
 *
 * NOTE: In a multi-isolate Workers deployment each isolate has its own map,
 * so this is a best-effort limiter. For stricter guarantees consider
 * Cloudflare Rate Limiting rules or a Durable Object–backed store.
 */
export const rateLimit = (opts: RateLimitOptions) => {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= opts.limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        return c.json(
          { success: false, error: "Too many requests. Please try again later." },
          429
        );
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
    }

    await next();
  };
};

/** Clear rate limit state (used in tests) */
export const resetRateLimitStore = () => store.clear();
