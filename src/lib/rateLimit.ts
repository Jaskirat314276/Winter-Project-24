/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in process memory, so it does not coordinate across
 * replicas. Replace with Upstash/Redis if you scale beyond a single node.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterMs = Math.max(0, hits[0] + windowMs - now);
    buckets.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, retryAfterMs: 0 };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
