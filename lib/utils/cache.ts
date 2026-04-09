/**
 * Client-side Cache Utilities
 * 
 * Provides in-memory and localStorage caching for API responses
 * and computed data to improve performance.
 */

// Cache entry with expiration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for session data
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000,        // 30 seconds
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  HOUR: 60 * 60 * 1000,    // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Memory Cache - Session-scoped caching
 */
export const memCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return entry.data;
  },

  set<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
    const now = Date.now();
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  },

  delete(key: string): boolean {
    return memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },

  has(key: string): boolean {
    const entry = memoryCache.get(key);
    if (!entry) return false;
    if (Date.now() > (entry as CacheEntry<unknown>).expiresAt) {
      memoryCache.delete(key);
      return false;
    }
    return true;
  },

  // Get cache stats for debugging
  stats() {
    let validCount = 0;
    let expiredCount = 0;
    const now = Date.now();

    memoryCache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    });

    return {
      total: memoryCache.size,
      valid: validCount,
      expired: expiredCount,
    };
  },
};

/**
 * LocalStorage Cache - Persistent caching
 */
export const localCache = {
  prefix: "scai_cache_",

  getKey(key: string): string {
    return `${this.prefix}${key}`;
  },

  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(this.getKey(key));
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, ttl: number = CACHE_TTL.LONG): void {
    if (typeof window === "undefined") return;

    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.warn("LocalStorage cache set failed:", error);
      // Try to clear old cache entries
      this.cleanup();
    }
  },

  delete(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.getKey(key));
  },

  clear(): void {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  // Remove expired entries
  cleanup(): void {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored) as CacheEntry<unknown>;
            if (now > entry.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },
};

/**
 * Cached fetch - wraps fetch with caching
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & {
    cacheTTL?: number;
    cacheType?: "memory" | "local" | "both";
    bypassCache?: boolean;
  }
): Promise<T> {
  const {
    cacheTTL = CACHE_TTL.MEDIUM,
    cacheType = "memory",
    bypassCache = false,
    ...fetchOptions
  } = options || {};

  const cacheKey = `fetch_${url}_${JSON.stringify(fetchOptions)}`;

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    // Check memory cache
    if (cacheType === "memory" || cacheType === "both") {
      const memCached = memCache.get<T>(cacheKey);
      if (memCached) return memCached;
    }

    // Check local cache
    if (cacheType === "local" || cacheType === "both") {
      const localCached = localCache.get<T>(cacheKey);
      if (localCached) {
        // Also populate memory cache
        if (cacheType === "both") {
          memCache.set(cacheKey, localCached, cacheTTL);
        }
        return localCached;
      }
    }
  }

  // Fetch fresh data
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;

  // Cache the result
  if (cacheType === "memory" || cacheType === "both") {
    memCache.set(cacheKey, data, cacheTTL);
  }

  if (cacheType === "local" || cacheType === "both") {
    localCache.set(cacheKey, data, cacheTTL);
  }

  return data;
}

/**
 * Memoize function results
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options?: {
    ttl?: number;
    keyFn?: (...args: TArgs) => string;
  }
): (...args: TArgs) => TResult {
  const { ttl = CACHE_TTL.MEDIUM, keyFn } = options || {};

  return (...args: TArgs): TResult => {
    const key = keyFn
      ? keyFn(...args)
      : `memoize_${fn.name}_${JSON.stringify(args)}`;

    const cached = memCache.get<TResult>(key);
    if (cached !== null) return cached;

    const result = fn(...args);
    memCache.set(key, result, ttl);

    return result;
  };
}

/**
 * Debounced cache cleanup - runs periodically
 */
let cleanupTimeout: NodeJS.Timeout | null = null;

export function scheduleCleanup(delay: number = 60000): void {
  if (cleanupTimeout) return;

  cleanupTimeout = setTimeout(() => {
    localCache.cleanup();
    cleanupTimeout = null;
    // Schedule next cleanup
    scheduleCleanup(delay);
  }, delay);
}

// Auto-schedule cleanup when module loads (client-side only)
if (typeof window !== "undefined") {
  scheduleCleanup();
}
