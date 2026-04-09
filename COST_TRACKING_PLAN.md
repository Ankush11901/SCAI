# Cost Tracking Feature Implementation Plan

## Overview
Add comprehensive cost tracking for all AI operations (text and image generation), with per-generation cost display and an admin dashboard for cost analytics.

**Estimated Scope:** ~10 files modified/created

---

## Phase 1: Database Schema Updates

### Tasks
- [x] Add `ai_usage_logs` table to `lib/db/schema.ts`
- [x] Add `generation_cost_summaries` table to `lib/db/schema.ts`
- [x] Add type exports for new tables
- [x] Run database migration

### Details

**`ai_usage_logs` table** - Tracks every AI API call:
```typescript
export const aiUsageLogs = sqliteTable('ai_usage_logs', {
  id: text('id').primaryKey(),
  historyId: text('history_id'),           // Links to generation_history
  userId: text('user_id').notNull(),
  bulkJobId: text('bulk_job_id'),          // For bulk generation tracking
  provider: text('provider').notNull(),     // 'gemini', 'openai', 'claude'
  modelId: text('model_id').notNull(),      // 'gpt-4o', 'gemini-2.0-flash', etc.
  operationType: text('operation_type').notNull(), // 'text', 'object', 'stream', 'image'
  operationName: text('operation_name'),    // 'generateStructure', 'streamSection', etc.
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  imageCount: integer('image_count').default(0),
  // Costs in micro-dollars (USD * 1,000,000) for precision
  inputCostUsd: integer('input_cost_usd').default(0),
  outputCostUsd: integer('output_cost_usd').default(0),
  imageCostUsd: integer('image_cost_usd').default(0),
  totalCostUsd: integer('total_cost_usd').default(0),
  durationMs: integer('duration_ms'),
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  metadata: text('metadata'),               // JSON for additional context
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

**`generation_cost_summaries` table** - Aggregated per-generation:
```typescript
export const generationCostSummaries = sqliteTable('generation_cost_summaries', {
  id: text('id').primaryKey(),
  historyId: text('history_id').notNull().unique(),
  userId: text('user_id').notNull(),
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalImageCount: integer('total_image_count').default(0),
  // Provider-specific costs (micro-dollars)
  geminiCostUsd: integer('gemini_cost_usd').default(0),
  claudeCostUsd: integer('claude_cost_usd').default(0),
  openaiCostUsd: integer('openai_cost_usd').default(0),
  imageCostUsd: integer('image_cost_usd').default(0),
  totalCostUsd: integer('total_cost_usd').default(0),
  apiCallCount: integer('api_call_count').default(0),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

---

## Phase 2: Update Model Pricing

### Tasks
- [x] Update Gemini 2.0 Flash pricing in `lib/ai/models.ts` (prices have increased)
- [x] Add `gemini-3-flash-preview` model spec (used for orchestration)
- [x] Add `IMAGE_PRICING` constant for per-image costs
- [x] Add `getModelSpec()` helper if not exists (already exists)

### Pricing Updates Required

| Model | Field | Current | Updated |
|-------|-------|---------|---------|
| Gemini 2.0 Flash | costPer1kInputTokens | $0.0000188 | $0.0001 |
| Gemini 2.0 Flash | costPer1kOutputTokens | $0.000075 | $0.0004 |

### New Constants to Add
```typescript
// Image generation pricing (per image, not per token)
export const IMAGE_PRICING: Record<string, number> = {
  'gemini-3-pro-image-preview': 0.04,  // $0.04 per image at 1K-2K resolution
}

// Orchestration model (used for prompt engineering, fact-checking)
'gemini-3-flash-preview': {
  id: 'gemini-3-flash-preview',
  name: 'Gemini 3 Flash Preview',
  provider: 'gemini',
  tier: 'fast',
  maxInputTokens: 1000000,
  maxOutputTokens: 8192,
  costPer1kInputTokens: 0.0005,
  costPer1kOutputTokens: 0.003,
  supportsStreaming: true,
  supportsStructuredOutput: true,
}
```

---

## Phase 3: Cost Tracking Service

### Tasks
- [x] Create new file `lib/services/cost-tracking-service.ts`
- [x] Implement `calculateCost()` function
- [x] Implement `logAiUsage()` function
- [x] Implement `updateGenerationCostSummary()` function
- [x] Implement `createCostTrackingContext()` function
- [x] Implement `formatCost()` helper
- [x] Implement `getGenerationCost()` for fetching costs
- [x] Add cost aggregation queries (`getCostStatistics()`)

### Function Signatures
```typescript
// Types
export interface CostTrackingContext {
  historyId: string
  userId: string
  bulkJobId?: string
  startTime: number
}

export interface UsageLogInput {
  historyId?: string
  userId: string
  bulkJobId?: string
  provider: 'gemini' | 'openai' | 'claude'
  modelId: string
  operationType: 'text' | 'object' | 'stream' | 'image'
  operationName?: string
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

// Functions
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  imageCount: number
): { inputCostUsd: number; outputCostUsd: number; imageCostUsd: number; totalCostUsd: number }

export async function logAiUsage(input: UsageLogInput): Promise<string>

export async function updateGenerationCostSummary(historyId: string, userId: string): Promise<void>

export function createCostTrackingContext(
  historyId: string,
  userId: string,
  bulkJobId?: string
): CostTrackingContext

export function formatCost(microDollars: number): string  // e.g., "$0.0234"

export async function getGenerationCost(historyId: string): Promise<GenerationCostSummary | null>
```

### Key Design Decisions
- **Micro-dollars**: Store costs as integers (USD * 1,000,000) to avoid floating-point precision issues
- **Non-blocking logging**: Use fire-and-forget for logging where possible
- **Context passing**: Use a context object passed through the pipeline rather than globals

---

## Phase 4: Integration with AI Adapter

### Tasks
- [x] Add `costTracking?: CostTrackingContext` to `GenerateTextOptions` interface
- [x] Add `costTracking?: CostTrackingContext` to `GenerateObjectOptions` interface
- [x] Add `costTracking?: CostTrackingContext` to `StreamTextOptions` interface
- [x] Modify `generateTextWithFallback()` to log usage after successful generation
- [x] Modify `generateObjectWithFallback()` to log usage after successful generation
- [x] Add timing tracking (startTime before call, duration after)

### File: `lib/ai/adapter.ts`

**Key insight**: The Vercel AI SDK already returns `result.usage` with `{ inputTokens, outputTokens }` - we just need to capture it.

**Example modification to `generateTextWithFallback()`:**
```typescript
export async function generateTextWithFallback(
  options: GenerateTextOptions & { costTracking?: CostTrackingContext }
): Promise<GenerationResult> {
  const { costTracking, ...restOptions } = options
  const startTime = Date.now()

  // ... existing logic ...

  const result = await generateText({ /* ... */ })

  // Log usage if tracking context provided
  if (costTracking && result.usage) {
    // Fire-and-forget logging
    logAiUsage({
      historyId: costTracking.historyId,
      userId: costTracking.userId,
      bulkJobId: costTracking.bulkJobId,
      provider: usedProvider,
      modelId,
      operationType: 'text',
      operationName: 'generateTextWithFallback',
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      durationMs: Date.now() - startTime,
      success: true,
    }).catch(console.error)
  }

  return { text: result.text, provider: usedProvider, modelId, usage: result.usage }
}
```

---

## Phase 5: Integration with Image Generation

### Tasks
- [x] Add `costTracking?: CostTrackingContext` parameter to `generateImage()` function
- [ ] Log orchestration calls (gemini-3-flash-preview) - these use tokens (deferred - complex)
- [x] Log image generation calls (gemini-3-pro-image-preview) - per-image pricing
- [ ] Log product image transformation calls if applicable (deferred)
- [ ] Estimate orchestration tokens from prompt length (deferred)

### File: `lib/services/imagen.ts`

**Note**: Each image generation involves TWO cost components:
1. **Orchestration** (gemini-3-flash-preview): Token-based cost for prompt engineering/fact-checking
2. **Image Generation** (gemini-3-pro-image-preview): Per-image cost (~$0.04)

**Orchestration token estimation:**
```typescript
// Estimate orchestration tokens (prompt length / 4 characters per token)
const orchestrationInputTokens = Math.ceil((userPrompt.length + (context?.length || 0)) / 4)
const orchestrationOutputTokens = 500 // Typical JSON response size
```

---

## Phase 6: Integration with Orchestrator

### Tasks
- [x] Import cost tracking context creator
- [x] Create `CostTrackingContext` at start of `orchestrateUnifiedGeneration()`
- [ ] Pass `costTracking` to all `generateTextWithFallback()` calls (future - requires refactoring generate modules)
- [ ] Pass `costTracking` to all `generateObjectWithFallback()` calls (future - requires refactoring generate modules)
- [ ] Pass `costTracking` to all `generateImage()` calls (future - via callback modification)
- [x] Call `updateGenerationCostSummary()` at generation completion

### File: `lib/services/unified-orchestrator.ts`

**Integration point at orchestration start:**
```typescript
export async function* orchestrateUnifiedGeneration(config: OrchestrationConfig) {
  const costTracking = config.historyId && config.userId
    ? createCostTrackingContext(config.historyId, config.userId, config.bulkJobId)
    : undefined

  // Pass costTracking to all AI calls...

  // At the end:
  if (costTracking) {
    await updateGenerationCostSummary(costTracking.historyId, costTracking.userId)
  }
}
```

---

## Phase 7: API Endpoints

### Tasks
- [x] Create `app/api/costs/route.ts` - Admin cost dashboard API
- [x] Create `app/api/costs/generation/[historyId]/route.ts` - Per-generation cost API
- [x] Add authentication checks (admin-only for dashboard)
- [x] Add user ownership check for per-generation endpoint

### Endpoint: `GET /api/costs`

**Query parameters:**
- `period`: 'day' | 'week' | 'month' | 'all' (default: 'week')
- `groupBy`: 'provider' | 'model' | 'operation' (default: 'provider')

**Response:**
```typescript
{
  period: string,
  groupBy: string,
  startDate: string,
  endDate: string,
  totals: {
    totalCost: string,        // Formatted, e.g., "$12.34"
    totalCostMicro: number,   // Raw micro-dollars
    totalCalls: number,
    totalInputTokens: number,
    totalOutputTokens: number,
    totalImages: number,
  },
  breakdown: Array<{
    group: string,            // Provider name, model ID, or operation name
    totalCost: number,        // Micro-dollars
    totalCostFormatted: string,
    callCount: number,
  }>
}
```

### Endpoint: `GET /api/costs/generation/{historyId}`

**Response:**
```typescript
{
  historyId: string,
  summary: {
    totalCost: string,
    totalCostMicro: number,
    totalInputTokens: number,
    totalOutputTokens: number,
    totalImages: number,
    apiCallCount: number,
    durationMs: number,
    byProvider: {
      gemini: string,
      claude: string,
      openai: string,
      images: string,
    }
  },
  logs: Array<{
    id: string,
    provider: string,
    modelId: string,
    operationType: string,
    operationName: string,
    inputTokens: number,
    outputTokens: number,
    imageCount: number,
    cost: string,
    costMicro: number,
    durationMs: number,
    success: boolean,
    createdAt: string,
  }>
}
```

---

## Phase 8: UI Components

### Tasks
- [x] Create `components/costs/generation-cost-badge.tsx` - Cost display badge
- [x] Create `app/(protected)/costs/page.tsx` - Admin cost dashboard
- [x] Integrate cost badge into history page (`app/(protected)/history/page.tsx`)
- [ ] Add cost display to generation completion message (optional - requires UI changes)
- [x] Add navigation link to costs page (admin only)

### Component: `GenerationCostBadge`

```tsx
interface GenerationCostBadgeProps {
  historyId: string
  className?: string
}

// Displays: Badge with "$0.0234"
// Tooltip: "Input: 1,234 tokens | Output: 567 tokens | Images: 3"
```

### Page: `/costs` (Admin Dashboard)

**Features:**
- Period selector dropdown (24h, 7d, 30d, all time)
- Group by selector (provider, model, operation)
- Summary cards:
  - Total Cost
  - API Calls
  - Tokens Used (input/output breakdown)
  - Images Generated
- Bar chart: Cost by selected group
- Pie chart: Cost distribution

**Libraries needed:**
- `recharts` for charts (already likely installed, check package.json)

---

## Phase 9: Testing & Verification

### Tasks
- [ ] Test: Generate single article, verify logs created
- [ ] Test: Generate article with images, verify both text and image costs tracked
- [ ] Test: Bulk generation, verify costs tracked per article
- [ ] Test: Cost summary aggregation is correct
- [ ] Test: API endpoints return expected data
- [ ] Test: Cost badge displays correctly on history page
- [ ] Test: Admin dashboard charts render with real data
- [ ] Test: Non-admin users cannot access /costs page

---

## Implementation Status

**Completed:**
- Phase 1: Database schema with `ai_usage_logs` and `generation_cost_summaries` tables
- Phase 2: Updated Gemini 2.0 Flash pricing, added image pricing constants
- Phase 3: Full cost tracking service with logging, calculation, and query functions
- Phase 4: AI adapter integration with cost logging for text/object/stream generation
- Phase 5: Image generation cost tracking (per-image pricing)
- Phase 6: Orchestrator integration with context creation and summary finalization
- Phase 7: API endpoints for admin dashboard and per-generation costs
- Phase 8: UI components - cost badge, admin dashboard, history integration, sidebar link
- API route integration: `/api/generate` now passes costTrackingInfo to orchestrator

**Remaining (future iterations):**
- Pass cost tracking through generate modules to individual AI calls (requires deeper refactoring)
- Add cost display to generation completion message in UI
- Full end-to-end testing with actual generations

### Verification Queries

**Check if logs are being created:**
```sql
SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 10;
```

**Check summary aggregation:**
```sql
SELECT * FROM generation_cost_summaries WHERE history_id = 'xxx';
```

**Verify cost calculation (example):**
- 1000 input tokens at Gemini 2.0 Flash ($0.0001/1K) = $0.0001 = 100 micro-dollars
- 500 output tokens at Gemini 2.0 Flash ($0.0004/1K) = $0.0002 = 200 micro-dollars
- 1 image at $0.04 = $0.04 = 40,000 micro-dollars
- Total: 40,300 micro-dollars = $0.0403

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `lib/db/schema.ts` | Modify - Add 2 tables | 1 |
| `lib/ai/models.ts` | Modify - Update prices, add constants | 2 |
| `lib/services/cost-tracking-service.ts` | **Create** | 3 |
| `lib/ai/adapter.ts` | Modify - Add cost logging | 4 |
| `lib/services/imagen.ts` | Modify - Add cost tracking | 5 |
| `lib/services/unified-orchestrator.ts` | Modify - Pass context | 6 |
| `app/api/costs/route.ts` | **Create** | 7 |
| `app/api/costs/generation/[historyId]/route.ts` | **Create** | 7 |
| `components/costs/generation-cost-badge.tsx` | **Create** | 8 |
| `app/(protected)/costs/page.tsx` | **Create** | 8 |
| `app/(protected)/history/page.tsx` | Modify - Add badge | 8 |

---

## Notes & Considerations

### Why Micro-dollars?
JavaScript floating-point math can cause precision issues:
```javascript
0.1 + 0.2 = 0.30000000000000004  // Wrong!
```
Storing as integers (micro-dollars) and converting only for display avoids this.

### Image vs Token Pricing
- **Text generation**: Charged per token (input and output separately)
- **Image generation**: Charged per image (~$0.04), NOT per token
- **Image orchestration**: The prompt engineering step DOES use tokens (gemini-3-flash-preview)

### Async Logging
Use fire-and-forget pattern to avoid slowing down generation:
```typescript
logAiUsage({ ... }).catch(console.error)  // Don't await
```

### Admin Access
Cost dashboard should only be accessible to admin/whitelabel users. Use existing `isWhitelabelUser()` check.
