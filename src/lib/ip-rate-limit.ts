/**
 * Lightweight in-memory IP rate limiter for auth endpoints.
 * Each key tracks a sliding window of request timestamps.
 *
 * Suitable for low-to-medium traffic; for high-concurrency deployments
 * swap the store for an Upstash/Redis backend without changing callers.
 */

type WindowEntry = { timestamps: number[] };
const store = new Map<string, WindowEntry>();

// Prune entries older than 10 minutes to keep memory bounded
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - PRUNE_INTERVAL_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, PRUNE_INTERVAL_MS);

export type IpRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/**
 * Check whether the given key (IP + endpoint) is within the allowed rate.
 * `limit` requests per `windowMs` milliseconds.
 */
export function checkIpRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): IpRateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    store.set(key, entry);
    return { allowed: false, retryAfterSec };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true };
}

/** Extract a best-effort IP from Next.js request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
