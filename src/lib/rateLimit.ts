// Cycle 37: in-memory rate limiter. Key by characterId or IP+route;
// burst window of N requests per W ms. Single-process — when we move
// to multi-node + Redis (DEFERRED, public release), swap the Map for
// a Redis sliding-window counter.
//
// Designed for soft enforcement: callers get a boolean, route handlers
// translate to 429. Not a security boundary — the server-authoritative
// validation in battle/forge/auction stays the real defense.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export function rateLimit(key: string, cfg: RateLimitConfig): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return true;
  }
  if (b.count >= cfg.max) return false;
  b.count++;
  return true;
}

// Periodic GC to keep the Map from growing unbounded under long uptime.
// Called opportunistically — every 1000 keys we sweep expired entries.
let sinceSweep = 0;
function maybeSweep() {
  sinceSweep++;
  if (sinceSweep < 1000) return;
  sinceSweep = 0;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }
}

export function checkRateLimit(key: string, cfg: RateLimitConfig): boolean {
  maybeSweep();
  return rateLimit(key, cfg);
}

// Common presets used across endpoints.
export const RATE_LIMITS = {
  CHAT_SEND: { windowMs: 1000, max: 1 } satisfies RateLimitConfig,
  ATTACK_SUBMIT: { windowMs: 1000, max: 3 } satisfies RateLimitConfig,
  AUCTION_BID: { windowMs: 1000, max: 2 } satisfies RateLimitConfig,
  CHARACTER_CREATE: { windowMs: 60_000, max: 5 } satisfies RateLimitConfig,
  GENERIC_API: { windowMs: 1000, max: 10 } satisfies RateLimitConfig,
};
