/**
 * Sliding-window limits for the chat API, kept in memory. Each server instance counts on
 * its own, so this curbs bursts and scripted abuse rather than enforcing an exact quota —
 * pair it with a monthly spend limit on the Anthropic Console.
 */
const VISITOR_LIMIT = { max: 20, windowMs: 10 * 60_000 };
const INSTANCE_LIMIT = { max: 400, windowMs: 60 * 60_000 };
/** Past this many tracked visitors, idle ones are swept so the map can't grow without bound. */
const SWEEP_THRESHOLD = 5000;

const visitorHits = new Map<string, number[]>();
let instanceHits: number[] = [];

function recent(hits: number[], now: number, windowMs: number) {
  return hits.filter((time) => now - time < windowMs);
}

/** Records a request and reports whether it may proceed, with seconds to wait when not. */
export function checkRateLimit(visitor: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
  instanceHits = recent(instanceHits, now, INSTANCE_LIMIT.windowMs);
  const hits = recent(visitorHits.get(visitor) ?? [], now, VISITOR_LIMIT.windowMs);

  const blockedBy =
    hits.length >= VISITOR_LIMIT.max
      ? { oldest: hits[0], windowMs: VISITOR_LIMIT.windowMs }
      : instanceHits.length >= INSTANCE_LIMIT.max
        ? { oldest: instanceHits[0], windowMs: INSTANCE_LIMIT.windowMs }
        : null;
  if (blockedBy) {
    visitorHits.set(visitor, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((blockedBy.oldest + blockedBy.windowMs - now) / 1000)) };
  }

  hits.push(now);
  instanceHits.push(now);
  visitorHits.set(visitor, hits);

  if (visitorHits.size > SWEEP_THRESHOLD) {
    for (const [key, times] of visitorHits) {
      if (recent(times, now, VISITOR_LIMIT.windowMs).length === 0) visitorHits.delete(key);
    }
  }
  return { ok: true };
}

/** Vercel puts the caller's address first in x-forwarded-for; locally there may be none. */
export function visitorKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
