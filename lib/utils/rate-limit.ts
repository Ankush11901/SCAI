/**
 * Simple in-memory rate limiting
 * For production, use Redis or a distributed cache
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store - will reset on server restart
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset
}

/**
 * Check if a request is allowed based on rate limiting
 * @param identifier - Unique identifier for the requester (e.g., user ID, IP)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance on each call
    cleanupExpiredEntries();
  }

  const entry = rateLimitStore.get(identifier);

  // No entry or expired - create new one
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Entry exists and not expired
  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or administrative purposes
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: new Date(now + windowMs),
    };
  }

  const remaining = Math.max(0, config.limit - entry.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: new Date(entry.resetAt),
    retryAfter: remaining <= 0 ? Math.ceil((entry.resetAt - now) / 1000) : undefined,
  };
}

// Pre-configured rate limiters for different use cases
export const RATE_LIMITS = {
  /** Article generation - 10 per hour */
  generation: { limit: 10, windowSeconds: 3600 },
  /** API calls - 100 per minute */
  api: { limit: 100, windowSeconds: 60 },
  /** Auth attempts - 5 per minute */
  auth: { limit: 5, windowSeconds: 60 },
} as const;

/**
 * Create a rate limit key for a user
 */
export function createRateLimitKey(
  userId: string,
  action: keyof typeof RATE_LIMITS
): string {
  return `${action}:${userId}`;
}
