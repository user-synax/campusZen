// In-memory rate limiter (fixed-window with periodic sweep).
//
// Good enough for a single Render instance; swap for a Redis-backed
// implementation (e.g. Upstash) if the backend ever scales horizontally.
// The key choice here is simplicity — each bucket is a {count, resetAt}
// pair that resets after `windowMs`. A true token-bucket (leaky bucket)
// would be smoother under bursts but adds complexity with no measurable
// benefit at this scale.

const buckets = new Map(); // key -> { count, resetAt }

// Periodically sweep expired buckets so the Map doesn't grow forever.
// Runs every 5 minutes; unref() so it doesn't keep the process alive.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt < now) buckets.delete(key);
    }
}, 5 * 60 * 1000).unref();

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Fixed-window: max `limit` events per `windowMs`.
 */
function tryConsume(key, limit, windowMs) {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }

    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
}

/** Guard for the internal /api/emit endpoint (called by the Next.js app). */
export function internalRateLimit(req, res, next) {
    // Generous: normal traffic is a handful of emits per user action.
    if (tryConsume("internal-emit", 2000, 60 * 1000)) return next();
    res.status(429).json({ ok: false, error: "rate limited" });
}

/** Per-user limits for socket event handlers. */
export const socketLimits = {
    // Messages: 30 per minute per user
    messageSend: (userId) => tryConsume(`msg:${userId}`, 30, 60 * 1000),
    // Typing indicators: 20 per 5 seconds per user (rapid-fire by design)
    typing: (userId) => tryConsume(`typing:${userId}`, 20, 5 * 1000),
    // Read receipts: 30 per minute per user
    readMark: (userId) => tryConsume(`read:${userId}`, 30, 60 * 1000),
};
