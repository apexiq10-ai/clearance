/**
 * A small in-memory rate limiter, shared across all three model routes.
 *
 * This is a demo link, not production infrastructure. The store is a Map in
 * the process, so a cold start resets it and two concurrent instances count
 * separately. Both are acceptable here: the job is to stop a shared URL from
 * quietly spending the account's model budget, not to enforce a quota.
 *
 * The cap is five requests per address per ten minutes across /api/ledger,
 * /api/brief and /api/challenge combined, because they draw on the same budget.
 */

export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const RATE_MAX_REQUESTS = 5;

/** Reused by all three routes, so a limited reader sees one consistent line. */
export const RATE_LIMIT_MESSAGE =
  "This link has a request limit and you have reached it. Try again in a few minutes.";

const hits = new Map<string, number[]>();

export interface RateVerdict {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * The address behind the request. Vercel sets x-forwarded-for, and the first
 * entry is the client. Anything unresolvable shares one bucket, which is
 * stricter rather than looser, and that is the right direction to fail.
 */
export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimit(ip: string, now: number = Date.now()): RateVerdict {
  // Keep the map from growing without bound on a long lived instance.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }

  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_REQUESTS) {
    hits.set(ip, recent);
    const oldest = recent[0]!;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  recent.push(now);
  hits.set(ip, recent);
  return {
    allowed: true,
    remaining: RATE_MAX_REQUESTS - recent.length,
    retryAfterSeconds: 0,
  };
}

/** Test only. */
export function resetRateLimit(): void {
  hits.clear();
}

export function rateLimitHeaders(verdict: RateVerdict): Record<string, string> {
  return {
    "Retry-After": String(verdict.retryAfterSeconds),
    "X-RateLimit-Limit": String(RATE_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(verdict.remaining),
  };
}
