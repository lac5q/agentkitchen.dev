interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;
const buckets = new Map<string, Bucket>();

function keyFor(req: Request, scope: string): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function checkAuthRateLimit(req: Request, scope: string, limit = DEFAULT_LIMIT): Response | null {
  const now = Date.now();
  const key = keyFor(req, scope);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return Response.json(
      { error: "too many authentication attempts", code: "AUTH_RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  return null;
}

export function clearAuthRateLimit(): void {
  buckets.clear();
}
