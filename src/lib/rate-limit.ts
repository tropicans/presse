/**
 * In-memory rate limiter using sliding window counters.
 * Production multi-instance deployments must set RATE_LIMIT_SINGLE_INSTANCE_OK=true
 * or replace this module with a shared store implementation.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const allowProductionSingleInstanceRateLimit = process.env.RATE_LIMIT_SINGLE_INSTANCE_OK === 'true'

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  assertRateLimitStoreAllowed()

  const now = Date.now()
  const entry = store.get(key)

  // No entry or expired window — start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Within window
  entry.count++

  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

function assertRateLimitStoreAllowed() {
  if (process.env.NODE_ENV === 'production' && !allowProductionSingleInstanceRateLimit) {
    throw new Error('RATE_LIMIT_SINGLE_INSTANCE_OK wajib true untuk production single-instance atau gunakan shared rate limiter')
  }
}

/**
 * Extract client IP from request headers.
 * Works behind proxies (X-Forwarded-For) and direct connections.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function clearRateLimitStoreForTest() {
  store.clear()
}
