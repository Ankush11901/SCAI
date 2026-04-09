# Plan: Move Single Article Generation to Trigger.dev with Realtime Streaming

## Problem

Single article generation currently runs **inline** in the API route (`app/api/generate/route.ts`). The entire content generation (30s–2min+) ties up a Vercel serverless function, streams content via SSE directly to the browser, and:

- **Risks timeout** on Vercel's function duration limits
- **Loses all progress** if the browser tab closes or network drops
- **Cannot retry** — a failed generation means starting over from scratch
- **No durability** — if the serverless function crashes, the article is lost

## Solution

Move content generation into a **Trigger.dev background task** that:
- Runs with no timeout (up to 5+ minutes)
- Survives browser disconnects
- Can retry on failure
- Tracks progress via **metadata** (phase, word count, structure)
- Streams HTML chunks via **Trigger.dev Realtime Streams v2** for live typing effect

The existing **two-step pattern is preserved**: content generates first (with image placeholders), then the frontend triggers the existing image orchestration task via `POST /api/generate/trigger` + Pusher. Nothing about images changes.

## Architecture Diagram

```
Frontend (generate page)         API Route (/api/generate)         Trigger.dev Worker
  |                                    |                                    |
  |--- POST /api/generate ----------->|                                    |
  |    { backgroundTask: true }        |                                    |
  |                                    |-- 1. Auth check (session cookie)   |
  |                                    |-- 2. Fetch user profile            |
  |                                    |-- 3. Check generation access       |
  |                                    |-- 4. Estimate + deduct credits     |
  |                                    |-- 5. Check quota (legacy)          |
  |                                    |-- 6. Create history entry          |
  |                                    |-- 7. tasks.trigger("generate-article", payload)
  |                                    |-- 8. auth.createPublicToken()      |
  |<-- JSON { runId, token, historyId }|                                    |
  |                                    |                                    |
  |=== useRealtimeRun(runId) =========================================>|
  |=== useRealtimeStream(contentStream, runId) ========================>|
  |                                    |                                    |
  |                                    |        Task runs orchestrateUnifiedGeneration()
  |                                    |        For each StreamEvent:
  |<-- run.metadata updates (phase, structure, wordCount) --------------|  metadata.set()
  |<-- parts[] (HTML chunks for typing effect) -------------------------|  contentStream.append()
  |                                    |                                    |
  |                                    |        On complete:
  |<-- run.status=COMPLETED, run.output={html, placeholders, ...} ------|
  |                                    |                                    |
  |--- POST /api/generate/trigger ---->|  (existing image task, unchanged) |
  |=== Pusher subscription ============>|  (existing Pusher flow, unchanged)|
  |<-- image:complete events -----------|----------------------------------|
```

## What Changes vs What Stays the Same

### Changes
| Area | What changes |
|------|-------------|
| **API route** (`app/api/generate/route.ts`) | New `backgroundTask: true` code path that triggers the Trigger.dev task and returns `{ runId, publicToken, historyId }` instead of opening an SSE stream. Existing SSE path stays as fallback. |
| **Generate page** (`app/(protected)/generate/page.tsx`) | `handleGenerate` sends `backgroundTask: true`, receives `runId`/`publicToken`, uses new `useRealtimeGeneration` hook for live updates instead of SSE parsing. All existing UI components receive the same state shape. |
| **New Trigger.dev task** (`lib/jobs/generate-article.ts`) | Runs `orchestrateUnifiedGeneration()`, routes events to stream + metadata. Returns final HTML + placeholders as task output. |
| **New hook** (`lib/hooks/useRealtimeGeneration.ts`) | Wraps `useRealtimeRun` + `useRealtimeStream` from `@trigger.dev/react-hooks`, maps to `GenerationState`-compatible shape. |
| **New stream definition** (`lib/streams/generation-streams.ts`) | Defines `articleContentStream` for HTML chunk streaming. |
| **New shared preflight** (`lib/services/generation-preflight.ts`) | Extracts auth/credits/quota/history logic from API route so both SSE and backgroundTask paths can reuse it. |

### Stays the Same (Unchanged)
| Area | Why unchanged |
|------|--------------|
| `lib/services/unified-orchestrator.ts` | The async generator is consumed as-is inside the new task. No modifications needed. |
| `lib/jobs/orchestrate-generation.ts` | Existing image orchestration task, still triggered by frontend after content completes. |
| `lib/jobs/generate-images.ts` | Existing image generation child task. |
| `lib/services/pusher-server.ts` / `pusher-client.ts` | Image progress flow uses Pusher and is completely unchanged. |
| `app/api/generate/trigger/route.ts` | Image trigger route stays exactly as-is. |
| All UI components (`GeneratorForm`, `ArticlePreview`, etc.) | They receive the same `GenerationState` shape — the data source changes (hook vs SSE parser) but the interface is identical. |

---

## Phases & Tasks

### Phase 1: Dependencies & Stream Definition
> Foundation work — install the React hooks package and define the realtime stream.

- [ ] **1.1** Install `@trigger.dev/react-hooks` package
  - Run `npm install @trigger.dev/react-hooks`
  - This provides `useRealtimeRun`, `useRealtimeStream`, `useRealtimeTaskTrigger`, etc.
  - Verify it's compatible with our `@trigger.dev/sdk` version

- [ ] **1.2** Create stream definition file: `lib/streams/generation-streams.ts`
  - Define `articleContentStream` using `streams.define<string>({ id: "article-content" })`
  - Each `append()` call sends one HTML fragment (token-level chunk)
  - Frontend joins them with `parts.join("")` to build the accumulated HTML
  - Export the stream and its inferred type for use in both the task and the hook

---

### Phase 2: Extract Shared Preflight Logic
> The API route currently does auth, credit check, quota check, and history entry creation inline. Both the SSE path and the new backgroundTask path need this logic, so extract it into a shared utility.

- [ ] **2.1** Create `lib/services/generation-preflight.ts` with a `runGenerationPreflight()` function
  - **Inputs**: `sessionCookie: string`, `requestBody: GenerationRequestBody`
  - **Steps performed** (in order, matching current API route lines 23–201):
    1. Validate session via `auth.api.getSession()`
    2. Fetch user profile from DB (for `amazonAffiliateTag`)
    3. Validate `imageProvider` access via `canUseImageProvider()`
    4. Check generation access via `checkGenerationAccess()`
    5. Estimate credits via `estimateArticleCredits()`
    6. Deduct credits via `deductCredits()`
    7. Check legacy quota via `incrementQuotaUsage()` (if `USE_CREDIT_SYSTEM` not set)
    8. Validate required fields (`articleType`, `topic`)
    9. Normalize `variation`, `provider`, `variationName`, `targetWordCount`
    10. Create history entry via `createHistoryEntry()`
    11. Create cost tracking context
  - **Returns**: `{ userId, amazonAffiliateTag, historyId, costTracking, creditDeduction, estimatedCredits, validatedParams }` on success
  - **Throws**: typed error objects for each failure case (401, 402, 403, 429, 400) so the API route can map them to HTTP responses
  - **Why extract**: Avoids duplicating ~150 lines of auth/credits/quota logic between SSE and backgroundTask code paths

- [ ] **2.2** Refactor existing SSE path in `app/api/generate/route.ts` to use `runGenerationPreflight()`
  - Replace lines 23–225 with a call to `runGenerationPreflight()`
  - Map thrown errors to the same HTTP responses as before
  - **Verify**: Existing SSE generation still works identically after refactor (this is a pure refactor, no behavior change)

---

### Phase 3: Create the `generate-article` Trigger.dev Task
> The core background task that replaces inline generation.

- [ ] **3.1** Create `lib/jobs/generate-article.ts`
  - **Task definition**: `task({ id: "generate-article", maxDuration: 600, machine: { preset: "small-2x" }, retry: { maxAttempts: 2 } })`
  - **Payload type** (`GenerateArticlePayload`):
    ```typescript
    {
      historyId: string
      userId: string
      articleType: string
      topic: string
      variation: TitleVariation
      targetWordCount: number
      componentColor: string
      provider: AIProvider
      variationName: BaseVariationName | 'random'
      enableKeywordExpansion: boolean
      enableAutoCorrection: boolean
      skipImages: boolean
      imageProvider?: string
      amazonAffiliateTag?: string
      estimatedCredits: number
      creditDeduction?: { creditsUsed?: number; source?: string }
    }
    ```
  - **Task run function** (step by step):
    1. Set initial metadata: `metadata.set("phase", "starting").set("statusMessage", "Starting generation...").set("historyId", payload.historyId)`
    2. Create image callback (same pattern as bulk-generate: collect placeholders, return placeholder URLs)
    3. Call `orchestrateUnifiedGeneration()` with all params (same signature as API route lines 312-327)
    4. **Loop over generator events** and route each one:
       - `start` → `metadata.set("phase", "content")`
       - `variation_selected` → `metadata.set("usedVariation", event.variationName)`
       - `provider_selected` → `metadata.set("usedProvider", event.provider)`
       - `phase` → `metadata.set("phase", mapPhase(event.phase)).set("statusMessage", event.message)`
       - `structure_complete` → `metadata.set("structure", { h1, h2Count, faqCount, coreKeywords, primaryKeyword })`
       - `header_ready` → `articleContentStream.append(event.h1Html + event.featuredImageHtml)`
       - `component_chunk` → `articleContentStream.append(event.chunk)` (this is the key token-by-token streaming)
       - `incremental_content` → `articleContentStream.append(event.chunk)`
       - `assembly_complete` → `metadata.set("phase", "assembly")`
       - `validation_result` → `metadata.set("validationResult", { isValid, score, errorCount, warningCount })`
       - `classification_complete` → store `classificationHint` locally (internal, not streamed)
       - `complete` → `metadata.set("phase", "complete").set("wordCount", event.wordCount)`, store finalHtml
       - `error` → `metadata.set("error", event.error)`, throw to fail the task
    5. **After generator completes**, call `articleContentStream.pipe()` waitUntilComplete (or just let it end naturally)
    6. Update history entry in DB (same as API route lines 392-401)
    7. Update cost summary + credit reconciliation (same pattern as bulk-generate lines 1019-1060)
    8. **Return task output**:
       ```typescript
       {
         html: finalHtml,
         wordCount: number,
         imageCount: number,
         imagePlaceholders: ImagePlaceholder[],
         historyId: string,
         usedVariation?: string,
         usedProvider?: string,
         classificationHint?: ClassificationHint,
         credits?: { used: number, source: string, estimated: number }
       }
       ```

  - **Error handling**: Wrap in try/catch. On error:
    - Set `metadata.set("error", errorMessage).set("phase", "error")`
    - Update history entry to `status: "failed"`
    - Attempt credit refund (if credits were deducted pre-flight)
    - Re-throw so Trigger.dev marks the run as FAILED

- [ ] **3.2** Register the task in `trigger.config.ts`
  - The task file is in `lib/jobs/` which is already in the `dirs` array, so it auto-registers
  - Verify with `npx trigger dev` that the task shows up

---

### Phase 4: Add `backgroundTask` Code Path to the API Route
> The API route gets a new branch: when `backgroundTask: true`, trigger the Trigger.dev task and return JSON instead of SSE.

- [ ] **4.1** Add the `backgroundTask` code path in `app/api/generate/route.ts`
  - After `runGenerationPreflight()` returns successfully:
  - Check if `backgroundTask === true` in request body
  - If yes:
    1. `const handle = await tasks.trigger<typeof generateArticleTask>("generate-article", { ...payload })`
    2. `const publicToken = await auth.createPublicToken({ scopes: { read: { runs: [handle.id] } }, expirationTime: "1h" })`
    3. Return JSON: `{ runId: handle.id, publicToken, historyId }`
  - If no: fall through to existing SSE streaming logic (unchanged)
  - **Import**: `import { tasks, auth } from "@trigger.dev/sdk"` (these are the server-side SDK imports)
  - **Import**: `import type { generateArticleTask } from "@/lib/jobs/generate-article"` (for type safety)

---

### Phase 5: Create the Frontend Hook
> A React hook that wraps Trigger.dev's realtime primitives and outputs the same state shape the generate page already expects.

- [ ] **5.1** Create `lib/hooks/useRealtimeGeneration.ts`
  - **Inputs**: `runId: string | null`, `accessToken: string | null`
  - **Internal hooks used**:
    - `useRealtimeRun(runId, { accessToken })` → provides `run.status`, `run.metadata`, `run.output`
    - `useRealtimeStream(articleContentStream, runId, { accessToken, throttleInMs: 32 })` → provides `parts[]`
  - **Returned state** (mapped to be compatible with existing `GenerationState`):
    ```typescript
    {
      // From useRealtimeStream
      accumulatedHtml: string            // parts.join("")

      // From useRealtimeRun metadata
      phase: string                      // run.metadata.phase
      statusMessage: string              // run.metadata.statusMessage
      wordCount: number                  // run.metadata.wordCount
      structure: { h1, h2Count, ... }    // run.metadata.structure
      usedVariation: string              // run.metadata.usedVariation
      usedProvider: string               // run.metadata.usedProvider
      validationResult: { ... }          // run.metadata.validationResult
      error: string | null               // run.metadata.error

      // From useRealtimeRun status
      isComplete: boolean                // run.status === "COMPLETED"
      isFailed: boolean                  // run.status === "FAILED"
      isRunning: boolean                 // run.status === "EXECUTING"

      // From useRealtimeRun output (available when complete)
      output: {
        html: string
        wordCount: number
        imageCount: number
        imagePlaceholders: ImagePlaceholder[]
        historyId: string
        usedVariation?: string
        usedProvider?: string
        credits?: { used: number, source: string, estimated: number }
      } | null
    }
    ```
  - **Key detail**: `throttleInMs: 32` on the stream gives ~30fps re-renders for smooth typing. Without throttle, every single token fires a re-render which is too frequent.
  - **Null safety**: When `runId` is null, all hooks return idle/empty state. The hooks from `@trigger.dev/react-hooks` accept `undefined` to disable subscription.

---

### Phase 6: Update the Generate Page
> Wire the new hook into the existing page, keeping SSE as a fallback.

- [ ] **6.1** Add new state variables to `GeneratePage`
  - `const [runId, setRunId] = useState<string | null>(null)`
  - `const [publicToken, setPublicToken] = useState<string | null>(null)`
  - `const [useRealtimeMode, setUseRealtimeMode] = useState(true)` — toggle between realtime (Trigger.dev) and SSE (legacy)

- [ ] **6.2** Modify `handleGenerate` to use backgroundTask mode
  - When `useRealtimeMode` is true:
    1. POST to `/api/generate` with `{ ...existingParams, backgroundTask: true }` (NOT `stream: true`)
    2. Parse JSON response: `{ runId, publicToken, historyId }`
    3. `setRunId(runId)`, `setPublicToken(publicToken)`
    4. Set initial state: `setState({ status: "generating", phase: "content", ... })`
    5. Do NOT open an SSE reader — the hook handles everything
  - When `useRealtimeMode` is false:
    - Existing SSE logic remains unchanged (fallback)

- [ ] **6.3** Wire `useRealtimeGeneration` hook into state updates
  - Call `useRealtimeGeneration(runId, publicToken)` at top of component
  - Use `useEffect` watching the hook's return values to update `GenerationState`:
    - Map `accumulatedHtml` → `state.html` + `state.displayedHtml` (with `replaceImagesWithSpinners`)
    - Map `phase` → `state.phase`
    - Map `statusMessage` → `state.statusMessage`
    - Map `wordCount` → `state.wordCount`
    - Map `isComplete` → trigger image flow (same as current `data.type === 'complete'` handler)
    - Map `isFailed` → `state.status = "error"`
  - **Critical**: When `output` becomes available (task complete):
    - Extract `imagePlaceholders` from `output`
    - Call existing `triggerBackgroundImages()` (unchanged) to start image generation
    - Set `state.historyId = output.historyId`

- [ ] **6.4** Handle cancellation
  - On unmount or user clicking "Stop": call `fetch('/api/generate/cancel', { method: 'POST', body: { runId } })`
  - Create a small API route `app/api/generate/cancel/route.ts` that calls `runs.cancel(runId)` from the SDK
  - Alternatively, use the `tasks` SDK directly — but this requires server-side auth, so an API route is cleaner

- [ ] **6.5** Handle reconnection (optional, nice-to-have)
  - If user refreshes mid-generation, `runId` is lost from React state
  - Could store `runId` in URL search params (`?runId=run_xxx`) or `sessionStorage`
  - On page load, check for existing `runId` and re-subscribe
  - `useRealtimeStream` supports `startIndex` to resume from a specific chunk (no data loss)

---

### Phase 7: Edge Cases & Reconciliation
> Handle error states, credit reconciliation, and cleanup.

- [ ] **7.1** Credit reconciliation in the task
  - Same pattern as bulk-generate (lines 1019-1060): compare estimated vs actual credits, refund difference
  - Extract `reconcileCredits()` from bulk-generate into `lib/services/credit-service.ts` for reuse
  - Call it at the end of `generate-article` task

- [ ] **7.2** Error → credit refund
  - If the task fails completely (throws), attempt to refund the full estimated credits
  - Use `catchError` hook on the task to handle this before the error propagates

- [ ] **7.3** History entry consistency
  - The preflight creates the history entry as `status: "pending"`
  - The task updates it to `status: "completed"` on success or `status: "failed"` on error
  - If the task never runs (trigger fails), the entry stays as "pending" — add a cleanup check or let users see it as "in progress"

---

## File-by-File Summary

### New Files (4)

| # | File | Lines (est.) | Purpose |
|---|------|-------------|---------|
| 1 | `lib/streams/generation-streams.ts` | ~10 | Stream definition for `articleContentStream` |
| 2 | `lib/services/generation-preflight.ts` | ~200 | Shared auth/credits/quota/history logic extracted from API route |
| 3 | `lib/jobs/generate-article.ts` | ~250 | Trigger.dev task that runs the orchestrator and pipes to stream + metadata |
| 4 | `lib/hooks/useRealtimeGeneration.ts` | ~100 | React hook wrapping `useRealtimeRun` + `useRealtimeStream` |

### Modified Files (2)

| # | File | What changes |
|---|------|-------------|
| 1 | `app/api/generate/route.ts` | Replace inline preflight with `runGenerationPreflight()` call. Add `backgroundTask: true` code path that triggers the task and returns JSON. SSE path remains as fallback. |
| 2 | `app/(protected)/generate/page.tsx` | Add `runId`/`publicToken` state. Modify `handleGenerate` to use backgroundTask mode. Wire `useRealtimeGeneration` hook. Add `useEffect` to map hook state → `GenerationState`. Trigger image flow from task output. |

### Unchanged Files

| File | Why |
|------|-----|
| `lib/services/unified-orchestrator.ts` | Consumed as-is by the new task |
| `lib/jobs/orchestrate-generation.ts` | Image orchestration, triggered by frontend after content |
| `lib/jobs/generate-images.ts` | Image generation child task |
| `lib/services/pusher-server.ts` / `pusher-client.ts` | Image progress via Pusher, unchanged |
| `app/api/generate/trigger/route.ts` | Image trigger route, unchanged |
| `components/generate/*` | All UI components receive same `GenerationState` shape |

---

## Verification Checklist

After implementation, verify each of these:

- [ ] `npx trigger dev` shows the `generate-article` task registered
- [ ] Single article generation works end-to-end with backgroundTask mode
- [ ] Content appears token-by-token with smooth typing effect (~30fps)
- [ ] Phase transitions (starting → structure → content → assembly → validation → complete) reflect in UI
- [ ] Structure info (H1, H2 count, keywords) updates in real-time
- [ ] Word count updates progressively during generation
- [ ] After content completes, image orchestration triggers as before via Pusher
- [ ] Images appear one-by-one replacing spinners (existing flow, unchanged)
- [ ] Refreshing browser mid-generation can resume (if reconnection implemented)
- [ ] Clicking "Stop" cancels the task gracefully
- [ ] Credit deduction happens before generation starts
- [ ] Credit reconciliation (refund overage) happens after generation ends
- [ ] Failed generation refunds credits
- [ ] History entry shows correct status (`completed` / `failed`)
- [ ] Existing SSE mode still works when `useRealtimeMode` is false (fallback)
- [ ] Side-by-side latency comparison: typing effect feels equally smooth vs SSE
- [ ] No regressions in bulk generation (completely separate code path)
