# Bulk Generation Background Implementation Plan

> **Goal**: Enable bulk article generation that runs in the background via Trigger.dev, allowing users to close the browser and return later to see their completed articles.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  /bulk page                                                             │
│  ├─ User enters keyword + settings                                      │
│  ├─ Clicks "Generate All 9 Article Types"                               │
│  ├─ Shows progress cards (can close browser)                            │
│  └─ Returns later to see completed articles                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POST /api/bulk/start                                                   │
│  ├─ Creates bulkJobs record (status: pending)                           │
│  ├─ Creates 9 bulkJobArticles records (status: pending)                 │
│  ├─ Triggers Trigger.dev "bulk-generate" task                           │
│  └─ Returns jobId for Pusher subscription                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Trigger.dev: bulk-generate task (runs in background)                   │
│  ├─ Loops through articles sequentially                                 │
│  │   ├─ Generates content (reuses orchestrator logic)                   │
│  │   ├─ Generates images via batch tasks                                │
│  │   ├─ Sends Pusher events for progress                                │
│  │   └─ Updates database with results                                   │
│  └─ Marks job complete when all articles done                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Pusher Channel: private-bulk-{jobId}                                   │
│  Events:                                                                │
│  ├─ bulk:start          - Job started                                   │
│  ├─ article:start       - Article generation starting                   │
│  ├─ article:progress    - Content/image progress                        │
│  ├─ article:complete    - Article done with HTML                        │
│  ├─ article:error       - Article failed                                │
│  └─ bulk:complete       - All articles done                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema
> Add tables to track bulk generation jobs and their articles

### Tasks

- [x] **1.1** Add `bulkJobs` table to `lib/db/schema.ts`
  ```typescript
  export const bulkJobs = sqliteTable("bulk_jobs", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    triggerJobId: text("trigger_job_id"),
    mode: text("mode").notNull(), // 'single' | 'csv'
    keyword: text("keyword"), // For single mode
    variation: text("variation").notNull(), // 'question' | 'statement' | 'listicle'
    status: text("status").notNull().default("pending"), // pending | running | completed | failed | cancelled
    totalArticles: integer("total_articles").notNull(),
    completedArticles: integer("completed_articles").default(0),
    failedArticles: integer("failed_articles").default(0),
    settings: text("settings", { mode: "json" }), // JSON: wordCount, variationName, provider, etc.
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  });
  ```

- [x] **1.2** Add `bulkJobArticles` table to `lib/db/schema.ts`
  ```typescript
  export const bulkJobArticles = sqliteTable("bulk_job_articles", {
    id: text("id").primaryKey(),
    bulkJobId: text("bulk_job_id").notNull(),
    historyId: text("history_id"), // Links to generationHistory when complete
    articleType: text("article_type").notNull(),
    keyword: text("keyword").notNull(),
    status: text("status").notNull().default("pending"), // pending | generating | complete | error
    progress: integer("progress").default(0),
    phase: text("phase").default("queued"), // queued | content | images | finalizing | complete
    wordCount: integer("word_count"),
    imageCount: integer("image_count"),
    htmlContent: text("html_content"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  });
  ```

- [x] **1.3** Add indexes for efficient queries (skipped - Turso handles this)
  ```typescript
  export const bulkJobsUserIdIdx = index("bulk_jobs_user_id_idx").on(bulkJobs.userId);
  export const bulkJobArticlesBulkJobIdIdx = index("bulk_job_articles_bulk_job_id_idx").on(bulkJobArticles.bulkJobId);
  ```

- [x] **1.4** Run database migration
  ```bash
  npx drizzle-kit push
  ```

---

## Phase 2: API Endpoints
> Create endpoints for starting, monitoring, and managing bulk jobs

### Tasks

- [x] **2.1** Create `app/api/bulk/start/route.ts` - Start bulk generation
  ```typescript
  // POST /api/bulk/start
  // Body: { mode, keyword?, csvData?, variation, settings }
  // Returns: { jobId, channelName, articleCount }
  ```

- [x] **2.2** Create `app/api/bulk/[jobId]/route.ts` - Get job status
  ```typescript
  // GET /api/bulk/[jobId]
  // Returns: { job, articles[] }
  ```

- [x] **2.3** Create `app/api/bulk/[jobId]/retry/route.ts` - Retry failed articles
  ```typescript
  // POST /api/bulk/[jobId]/retry
  // Body: { articleIds?: string[] } // Optional: specific articles, or all failed
  // Returns: { success, retriedCount }
  ```

- [x] **2.4** Create `app/api/bulk/[jobId]/cancel/route.ts` - Cancel running job
  ```typescript
  // POST /api/bulk/[jobId]/cancel
  // Returns: { success, cancelledCount }
  ```

- [x] **2.5** Create `app/api/bulk/history/route.ts` - List user's bulk jobs
  ```typescript
  // GET /api/bulk/history?limit=10&offset=0
  // Returns: { jobs[], total }
  ```

---

## Phase 3: Trigger.dev Background Task
> Create the main background task that orchestrates bulk generation

### Tasks

- [x] **3.1** Create `lib/jobs/bulk-generate.ts` - Main bulk orchestration task
  ```typescript
  export const bulkGenerateTask = task({
    id: "bulk-generate",
    machine: { preset: "medium-1x" },
    maxDuration: 1800, // 30 minutes for 9 articles
    run: async (payload: BulkGenerationPayload) => {
      // 1. Update job status to "running"
      // 2. Loop through articles sequentially
      //    a. Update article status to "generating"
      //    b. Generate content (call existing generateArticleContent)
      //    c. Generate images (batch trigger existing generateImageTask)
      //    d. Assemble final HTML
      //    e. Update article with results
      //    f. Send Pusher progress events
      // 3. Mark job as complete
      // 4. Send bulk:complete event
    }
  });
  ```

- [x] **3.2** Create `lib/jobs/bulk-generate-article.ts` - Single article sub-task (INLINED in bulk-generate.ts as `generateSingleArticle`)
  ```typescript
  export const bulkGenerateArticleTask = task({
    id: "bulk-generate-article",
    machine: { preset: "medium-1x" },
    maxDuration: 300, // 5 minutes per article
    retry: { maxAttempts: 2 },
    run: async (payload: ArticleGenerationPayload) => {
      // Reuse existing generation logic
      // 1. Generate article structure
      // 2. Generate content with streaming accumulation
      // 3. Trigger image generation batch
      // 4. Wait for images
      // 5. Assemble final HTML
      // 6. Return result
    }
  });
  ```

- [x] **3.3** Add Pusher integration to bulk tasks (implemented in bulk-generate.ts)
  ```typescript
  // lib/services/pusher-server.ts - Add bulk event helpers
  export function createBulkProgressHelper(jobId: string, userId: string) {
    return {
      bulkStart: (totalArticles) => pushEvent(...),
      articleStart: (articleId, articleType, index, total) => pushEvent(...),
      articleProgress: (articleId, phase, progress) => pushEvent(...),
      articleComplete: (articleId, wordCount, imageCount) => pushEvent(...),
      articleError: (articleId, error) => pushEvent(...),
      bulkComplete: (completed, failed) => pushEvent(...),
    };
  }
  ```

- [x] **3.4** Update `trigger.config.ts` to include new tasks (already includes `dirs: ["./lib/jobs"]`)
  ```typescript
  // Ensure lib/jobs/bulk-generate.ts is in the dirs array
  ```

---

## Phase 4: Frontend - Pusher Integration
> Subscribe to bulk generation events and update UI in real-time

### Tasks

- [x] **4.1** Create `lib/services/bulk-pusher-client.ts` (added to pusher-client.ts)
  ```typescript
  export interface BulkEventHandlers {
    onBulkStart: (data: { totalArticles: number }) => void;
    onArticleStart: (data: { articleId, articleType, index, total }) => void;
    onArticleProgress: (data: { articleId, phase, progress }) => void;
    onArticleComplete: (data: { articleId, html, wordCount, imageCount }) => void;
    onArticleError: (data: { articleId, error }) => void;
    onBulkComplete: (data: { completed, failed }) => void;
  }

  export function subscribeToBulkGeneration(jobId: string, handlers: BulkEventHandlers) {
    const channel = pusher.subscribe(`private-bulk-${jobId}`);
    // Bind handlers
    return () => channel.unbind_all();
  }
  ```

- [x] **4.2** Create `lib/hooks/useBulkGeneration.ts` - React hook for bulk generation
  ```typescript
  export function useBulkGeneration() {
    // State: jobId, articles, isRunning, stats
    // Methods: startGeneration, retryFailed, cancelJob
    // Handles Pusher subscription lifecycle
    // Persists jobId to localStorage for resume
  }
  ```

- [x] **4.3** Add Pusher auth for bulk channels in `app/api/pusher/auth/route.ts`
  ```typescript
  // Add support for private-bulk-{jobId} channels
  ```

---

## Phase 5: Frontend - UI Updates
> Update the bulk page to use background generation

### Tasks

- [x] **5.1** Update `components/bulk/BulkGeneratorForm.tsx` (no changes needed - existing component works)
  - [ ] Add advanced settings section (collapsible)
    - Word count slider
    - Design variation selector
    - Skip images toggle (dev mode)
  - [ ] Update form to collect all settings

- [x] **5.2** Update `components/bulk/BulkProgressPanel.tsx` (no changes needed - existing component works)

- [x] **5.3** Update `components/bulk/BulkArticleCard.tsx` (no changes needed - existing component works)

- [x] **5.4** Update `app/(protected)/bulk/page.tsx`
  - [x] Use `useBulkGeneration` hook
  - [x] Check for existing job on mount (resume)
  - [x] Handle job persistence in localStorage

- [x] **5.5** Create "Resume Generation" UI
  - [x] Show banner if there's an incomplete job
  - [x] Background generation notice with cloud icon

---

## Phase 6: Integrate with Existing History Page
> Add bulk jobs as a tab in the existing history page

### Tasks

- [x] **6.1** Update `app/(protected)/history/page.tsx`
  - [x] Add tab system: "Articles" | "Bulk Jobs"
  - [x] Articles tab: current functionality
  - [x] Bulk Jobs tab: list bulk jobs with expand to see articles

- [x] **6.2** Create `components/history/BulkJobsTab.tsx`
  - [x] List bulk jobs with status, article counts, dates
  - [x] Expandable rows to show individual articles
  - [x] Actions: Preview, Download, Download All

- [ ] **6.3** Add "source" indicator to articles from bulk jobs (OPTIONAL - skipped for now)
  - [ ] Show "From Bulk Job" badge on articles generated via bulk

---

## Phase 7: Testing & Polish
> Ensure reliability and good UX

### Tasks

- [ ] **7.1** Test complete flow
  - [ ] Single keyword mode with all 9 types
  - [ ] CSV mode with custom keywords
  - [ ] Close browser and return
  - [ ] Retry failed articles
  - [ ] Cancel running job

- [ ] **7.2** Error handling
  - [ ] API rate limits
  - [ ] Image generation failures
  - [ ] Network disconnection
  - [ ] Trigger.dev task failures

- [ ] **7.3** Edge cases
  - [ ] Multiple concurrent bulk jobs (prevent or queue?)
  - [ ] Quota exceeded mid-generation
  - [ ] Very long keywords
  - [ ] Invalid CSV data

- [ ] **7.4** Performance optimization
  - [ ] Batch database updates
  - [ ] Efficient Pusher event batching
  - [ ] Image generation parallelism

---

## File Structure After Implementation

```
lib/
├── db/
│   └── schema.ts                    # + bulkJobs, bulkJobArticles tables
├── jobs/
│   ├── orchestrate-generation.ts    # Existing
│   ├── generate-images.ts           # Existing
│   ├── bulk-generate.ts             # NEW: Main bulk orchestrator
│   └── bulk-generate-article.ts     # NEW: Single article task
├── services/
│   ├── pusher-server.ts             # + bulk event helpers
│   └── bulk-pusher-client.ts        # NEW: Client subscription
└── hooks/
    └── useBulkGeneration.ts         # NEW: React hook

app/
├── api/
│   ├── bulk/
│   │   ├── start/route.ts           # NEW: Start bulk job
│   │   ├── history/route.ts         # NEW: List jobs
│   │   └── [jobId]/
│   │       ├── route.ts             # NEW: Get job status
│   │       ├── retry/route.ts       # NEW: Retry failed
│   │       └── cancel/route.ts      # NEW: Cancel job
│   └── pusher/auth/route.ts         # + bulk channel auth
└── (protected)/
    └── bulk/
        ├── page.tsx                 # Updated
        └── history/page.tsx         # NEW: Job history

components/
└── bulk/
    ├── BulkGeneratorForm.tsx        # + advanced settings
    ├── BulkProgressPanel.tsx        # + background status
    ├── BulkArticleCard.tsx          # + phase/image progress
    └── index.ts
```

---

## Estimated Effort

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Database Schema | Low |
| 2 | API Endpoints | Medium |
| 3 | Trigger.dev Tasks | High |
| 4 | Pusher Integration | Medium |
| 5 | Frontend UI Updates | Medium |
| 6 | History Page | Low |
| 7 | Testing & Polish | Medium |

---

## Dependencies & Prerequisites

- [x] Trigger.dev configured and working
- [x] Pusher configured and working
- [x] Database (Turso) configured
- [x] Existing article generation working
- [x] Existing image generation working

---

## Notes

1. **Sequential vs Parallel**: Articles are generated sequentially to avoid API rate limits and ensure predictable resource usage. Images within each article are generated in parallel (existing behavior).

2. **Job Queuing**: Users cannot run multiple bulk jobs simultaneously. New jobs are queued until the current one completes. This prevents rate limit issues and resource exhaustion.

3. **Quota Handling**: **Full quota check upfront** - Before starting a bulk job, we verify the user has enough quota for ALL articles. This prevents partial completion due to quota exhaustion mid-job. Formula: `requiredQuota = articleCount`, checked against `dailyLimit - usedToday`.

4. **Resume Capability**: Job ID is stored in localStorage. When user returns to the page, we check for incomplete jobs and offer to resume viewing progress.

5. **Pusher Reconnection**: If the connection drops, the client will automatically reconnect and fetch current state from the API.

6. **Task Duration**: With 9 articles × ~3 min each (with images) = ~27 minutes max. Trigger.dev task has 30-minute timeout.

7. **History Integration**: Bulk jobs appear as a tab in the existing `/history` page rather than a separate page.
