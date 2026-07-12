interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Best-effort in-memory limiter. On serverless platforms with multiple
// instances this is per-instance only — plug in Upstash Redis (env vars are
// already scaffolded in .env.example) for a globally consistent limit at scale.
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

// Periodic cleanup to avoid unbounded memory growth in long-lived processes.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, 60_000).unref?.()
}
