interface RateEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateEntry>();
const MAX_BUCKETS = 10_000;

function cleanup(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
  if (buckets.size >= MAX_BUCKETS) {
    const excess = buckets.size - MAX_BUCKETS + 1000;
    let i = 0;
    for (const k of buckets.keys()) {
      if (i++ >= excess) break;
      buckets.delete(k);
    }
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now();
  cleanup(now);

  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSecs: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    const retryAfterSecs = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000)
    );
    return { allowed: false, retryAfterSecs };
  }

  return { allowed: true, retryAfterSecs: 0 };
}
