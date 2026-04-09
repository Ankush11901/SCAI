# Future Caching Implementation Plan (Upstash Redis)

> **Status:** Saved for later implementation
> **Date:** February 2025

## Goal
Implement Redis caching using Upstash for:
- Database queries (history, quota, bulk jobs, costs)
- Static/computed data (article types, components)

Expected impact: **60-80% reduction in database queries**

---

## Architecture

```
Client Request
      ↓
  API Route
      ↓
Cache Service (lib/cache/index.ts)
      ↓
  ┌─────────┐
  │ Redis?  │──Yes──→ Return cached data
  └─────────┘
      │ No
      ↓
  Database Query
      ↓
  Store in Redis
      ↓
  Return data
```

---

## Implementation Plan

### Phase 1: Setup Upstash Redis

**1. Install package:**
```bash
pnpm add @upstash/redis
```

**2. Environment variables:**
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**3. Create cache service:**
- `lib/cache/index.ts` - Redis client setup
- `lib/cache/keys.ts` - Cache key generators
- `lib/cache/utils.ts` - Helper functions (getOrSet, invalidate)

---

### Phase 2: Cache Service Implementation

**File: `lib/cache/index.ts`**
```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache TTLs (seconds)
export const CACHE_TTL = {
  QUOTA: 180,           // 3 minutes
  HISTORY_LIST: 300,    // 5 minutes
  HISTORY_ENTRY: 600,   // 10 minutes
  USER_STATS: 900,      // 15 minutes
  BULK_JOB: 30,         // 30 seconds
  COST_STATS: 1800,     // 30 minutes
  STATIC_DATA: 86400,   // 24 hours
} as const

// Helper: Get or set with TTL
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await redis.set(key, data, { ex: ttl })
  return data
}

// Helper: Invalidate cache pattern
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

**File: `lib/cache/keys.ts`**
```typescript
export const cacheKeys = {
  // User-specific
  quota: (userId: string) => `quota:${userId}`,
  historyList: (userId: string, page: number) => `history:${userId}:page:${page}`,
  historyEntry: (entryId: string) => `history:entry:${entryId}`,
  userStats: (userId: string) => `stats:${userId}`,

  // Bulk jobs
  bulkJob: (jobId: string) => `bulk:job:${jobId}`,
  bulkHistory: (userId: string) => `bulk:history:${userId}`,

  // Costs
  costStats: (userId: string) => `costs:stats:${userId}`,
  costByArticle: (userId: string, page: number) => `costs:articles:${userId}:${page}`,

  // Static (global)
  articleTypes: () => `static:article-types`,
  components: (articleType?: string) =>
    articleType ? `static:components:${articleType}` : `static:components:all`,
}
```

---

### Phase 3: Integrate Caching

#### 3.1 Quota Service (High Priority)
**File: `lib/services/quota-service.ts`**

```typescript
// In getQuotaInfo()
export async function getQuotaInfo(userId: string) {
  return getOrSet(
    cacheKeys.quota(userId),
    async () => {
      // Existing DB query logic
    },
    CACHE_TTL.QUOTA
  )
}
```

Invalidate on: `incrementQuotaUsage()`, `decrementQuotaUsage()`

#### 3.2 History Service (High Priority)
**File: `lib/services/history-service.ts`**

```typescript
// In getUserHistory()
const cacheKey = cacheKeys.historyList(userId, Math.floor(offset / limit))
return getOrSet(cacheKey, async () => {
  // Existing query
}, CACHE_TTL.HISTORY_LIST)
```

Invalidate on: `createHistoryEntry()`, `updateHistoryEntry()`, `deleteHistoryEntry()`

#### 3.3 Bulk Job Status (High Priority)
**File: `app/api/bulk/[jobId]/route.ts`**

Cache the full job + articles response for 30 seconds.
Invalidate on job status change events.

#### 3.4 Cost Statistics (Medium Priority)
**File: `lib/services/cost-tracking-service.ts`**

Cache `getCostStatistics()` result for 30 minutes.
Invalidate on new AI usage logs (batch invalidation).

#### 3.5 Static Data (Low Priority - HTTP Cache)
**Files:**
- `app/api/article-types/route.ts`
- `app/api/components/route.ts`

Add HTTP cache headers:
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
  },
})
```

---

### Phase 4: Cache Invalidation Points

| Event | Invalidate Keys |
|-------|-----------------|
| Article generated | `history:*`, `stats:userId`, `costs:*` |
| Quota used | `quota:userId` |
| History deleted | `history:*`, `stats:userId` |
| Bulk job progress | `bulk:job:jobId` |
| Bulk job complete | `bulk:job:*`, `bulk:history:userId` |

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `lib/cache/index.ts` | CREATE - Redis client & helpers |
| `lib/cache/keys.ts` | CREATE - Cache key generators |
| `lib/services/quota-service.ts` | MODIFY - Add caching |
| `lib/services/history-service.ts` | MODIFY - Add caching |
| `lib/services/cost-tracking-service.ts` | MODIFY - Add caching |
| `app/api/bulk/[jobId]/route.ts` | MODIFY - Add caching |
| `app/api/bulk/history/route.ts` | MODIFY - Add caching |
| `app/api/article-types/route.ts` | MODIFY - Add HTTP cache headers |
| `app/api/components/route.ts` | MODIFY - Add HTTP cache headers |

---

## Verification

1. **Setup Upstash:**
   - Create free Upstash account
   - Create Redis database
   - Add env vars to `.env.local`

2. **Test caching:**
   - Load history page → Check Redis has `history:*` keys
   - Refresh → Response from cache (faster)
   - Create article → Cache invalidated

3. **Monitor:**
   - Check Upstash dashboard for cache hit rate
   - Target: 60%+ hit rate after warmup

---

## Cost Estimate (Upstash)

- **Free tier:** 10,000 commands/day
- **Pay-as-you-go:** $0.20 per 100K commands
- Expected usage: ~5K-20K commands/day (well within free tier)
