/**
 * In-memory rate limiter for API routes.
 * Enterprise-grade: per-IP sliding window with configurable limits.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  auth:    { limit: 5,   windowSec: 60 * 15 },  // 5 attempts per 15 min
  api:     { limit: 100, windowSec: 60 },        // 100 req/min
  upload:  { limit: 20,  windowSec: 60 },        // 20 uploads/min
  strict:  { limit: 10,  windowSec: 60 },        // 10 req/min for sensitive
};

/**
 * Check rate limit. Returns { limited: true, retryAfter } if exceeded.
 */
export function checkRateLimit(
  ip: string,
  category: keyof typeof DEFAULTS = 'api'
): { limited: boolean; remaining: number; retryAfter?: number } {
  const config = DEFAULTS[category];
  const key = `${category}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + config.windowSec * 1000 });
    return { limited: false, remaining: config.limit - 1 };
  }

  entry.count++;
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { limited: true, remaining: 0, retryAfter };
  }

  return { limited: false, remaining: config.limit - entry.count };
}

/**
 * Helper: get client IP from request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
