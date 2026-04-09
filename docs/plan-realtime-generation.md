# Plan: Move Single Article Generation to Trigger.dev with Realtime Streaming

## Problem

Single article generation currently runs **inline** in the API route (`app/api/generate/route.ts`). The entire content generation pipeline — structure, parallel sections, assembly, validation, correction — streams via SSE directly from a Vercel serverless function to the browser.

**Issues with this approach:**

1. **Timeout risk** — Vercel serverless functions have a 60s timeout (Pro: 300s). Complex articles with keyword expansion + auto-correction routinely take 90-150s.
2. **No durability** — If the browser tab closes or the network drops, all progress is lost. The user must start over.
3. **No retry** — If the AI provider has a transient failure mid-generation, the entire pipeline fails with no recovery.
4. **Resource waste** — A serverless function sits idle during AI API calls (waiting for tokens), consuming billing time.

## Solution

Move the content generation pipeline to a **Trigger.dev background task** and use **Trigger.dev Realtime Streams v2** + **metadata** to bridge live updates back to the frontend.

**Why this works:**

- Trigger.dev tasks have **no timeout** (configurable up to hours), run on dedicated workers, and **auto-retry** on failure.
- Realtime Streams v2 delivers content chunks with WebSocket-like latency (~50ms) — fast enough for a typing effect.
- Metadata updates deliver phase/progress info in real-time via the same connection.
- If the browser closes, the task keeps running. The user can return and **reconnect** to the same `runId` to see accumulated content.

## Architecture Diagram

```
Frontend (React)              API Route (Next.js)          Trigger.dev Worker
  |                                |                              |
  |--- POST /api/generate -------->|                              |
  |    { backgroundTask: true }    |                              |
  |                                |-- 1. Auth check              |
  |                                |-- 2. Credit deduction        |
  |                                |-- 3. Quota check             |
  |                                |-- 4. Create history entry    |
  |                                |-- 5. tasks.trigger(          |
  |                                |      "generate-article",     |
  |                                |       payload)               |
  |                                |-- 6. auth.createPublicToken()|
  |<-- { runId, publicToken,       |                              |
  |      historyId }               |                              |
  |                                |                              |
  |=== useRealtimeStream(articleContentStream, runId) ==========>|
  |=== useRealtimeRun(runId) ====================================>|
  |                                |                              |
  |                                |          Task starts:        |
  |                                |          orchestrateUnifiedGeneration()
  |                                |                              |
  |<-- stream parts[] (HTML chunks) ------------------------------|  stream.append()
  |<-- run.metadata { phase, wordCount, structure } ---------------|  metadata.set()
  |                                |                              |
  |                                |          Content done:       |
  |<-- run.status === "COMPLETED" --------------------------------|
  |    run.output = { html, wordCount, imagePlaceholders, ... }   |
  |                                |                              |
  |--- POST /api/generate/trigger (existing) -------------------->|  (image task)
  |=== Pusher subscription (existing) ===========================>|
  |<-- image:complete events (existing Pusher) -------------------|
```

**Key insight:** The image generation step stays exactly as-is. The frontend triggers it via `POST /api/generate/trigger` after content completes, and Pusher delivers image progress. Only the **content generation** moves to Trigger.dev.

---

## Phases & Tasks

### Phase 1: Dependencies & Stream Definition

> Set up the foundation — install the React hooks package and create the stream type definition.

- [ ] **1.1** Install `@trigger.dev/react-hooks` package
  - Run `npm install @trigger.dev/react-hooks`
  - This provides `useRealtimeRun`, `useRealtimeStream`, `useWaitToken`, etc.

- [ ] **1.2** Create stream definition file: `lib/streams/generation-streams.ts`
  - Define `articleContentStream` using `streams.define<string>({ id: "article-content" })`
  - Each `append()` call sends one HTML fragment (token/chunk)
  - Frontend joins with `parts.join("")` to get accumulated HTML
  - This file is imported by both the Trigger.dev task (to write) and the frontend hook (to read)

---

### Phase 2: Extract Shared Preflight Logic

> The API route currently has ~150 lines of auth, credits, quota, and history-entry logic that will be needed by both the SSE path and the new backgroundTask path. Extract it to avoid duplication.

- [ ] **2.1** Create `lib/services/generation-preflight.ts`
  - Extract from `app/api/generate/route.ts` lines 23-220 into reusable functions:

  **Functions to create:**

  ```typescript
  // Validates session cookie, returns userId + session
  authenticateRequest(cookieStore): Promise<{ userId: string; session: AuthSession }>

  // Fetches user profile for affiliate tag
  fetchUserProfile(userId): Promise<{ amazonAffiliateTag?: string }>

  // Validates request body fields
  validateGenerationParams(body): { articleType, topic, variation, ... }

  // Runs access check, credit estimation, credit deduction, quota increment
  // Returns credit deduction info or throws appropriate HTTP errors
  performPreflight(userId, params): Promise<PreflightResult>

  // Creates history entry and cost tracking context
  createGenerationContext(userId, params): Promise<{ historyId, costTracking }>

  // Factory for the image placeholder callback (background mode)
  createPlaceholderImageCallback(): { callback: EnhancedImageCallback, getPlaceholders: () => ImagePlaceholder[] }
  ```

  **`PreflightResult` type:**
  ```typescript
  interface PreflightResult {
    creditDeduction: { success: boolean; creditsUsed?: number; source?: string } | null
    estimatedCredits: { totalCredits: number; breakdown: {...} }
    accessCheck: { allowed: boolean; reason?: string }
  }
  ```

- [ ] **2.2** Refactor existing SSE path in `app/api/generate/route.ts` to use the extracted functions
  - Replace inline auth/credit/quota/history code with calls to the new functions
  - Verify SSE streaming still works identically after refactor (no behavior change)
  - The non-streaming path also uses these functions

---

### Phase 3: Create the `generate-article` Trigger.dev Task

> The core background task that runs the orchestrator and pipes output to Realtime Streams + metadata.

- [ ] **3.1** Create `lib/jobs/generate-article.ts`

  **Task definition:**
  ```typescript
  export const generateArticleTask = task({
    id: "generate-article",
    maxDuration: 600, // 10 minutes — generous for complex articles
    machine: { preset: "small-2x" }, // 1 vCPU, 1GB RAM — sufficient for AI API calls
    retry: {
      maxAttempts: 2,
      minTimeoutInMs: 5000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
    run: async (payload: GenerateArticlePayload) => { ... }
  })
  ```

  **Payload type:**
  ```typescript
  interface GenerateArticlePayload {
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
    // Credit info for reconciliation
    estimatedCredits: number
    creditDeduction?: { creditsUsed?: number; source?: string }
  }
  ```

  **Task logic (step by step):**

  1. **Set initial metadata:**
     ```typescript
     metadata.set("phase", "starting")
       .set("statusMessage", "Initializing generation...")
       .set("wordCount", 0)
       .set("structure", null)
       .set("historyId", payload.historyId)
     ```

  2. **Create image placeholder callback** (same pattern as bulk-generate):
     - Returns placeholder URLs like `https://placehold.co/800x450/e5e7eb/6b7280?text=Loading+Image+N`
     - Collects `ImagePlaceholder[]` for later use

  3. **Create cost tracking context:**
     ```typescript
     const costTracking = createCostTrackingContext(payload.historyId, payload.userId)
     ```

  4. **Run `orchestrateUnifiedGeneration()`** (the existing async generator — completely unchanged):
     ```typescript
     const generator = orchestrateUnifiedGeneration(
       articleType, topic, variation, targetWordCount,
       imageCallback, componentColor, provider, variationName,
       enableKeywordExpansion, enableAutoCorrection,
       true, // skipAltTextValidation — images handled separately
       amazonAffiliateTag,
       undefined, // clusterContext — single articles don't have clusters
       { historyId, userId } // costTrackingInfo
     )
     ```

  5. **Consume generator events and route them:**

     | Event Type | Action |
     |---|---|
     | `start` | `metadata.set("phase", "starting")` |
     | `phase` | `metadata.set("phase", event.phase).set("statusMessage", event.message)` |
     | `variation_selected` | `metadata.set("usedVariation", event.variationName)` |
     | `provider_selected` | `metadata.set("usedProvider", event.provider)` |
     | `structure_complete` | `metadata.set("structure", { h1, h2Count, faqCount, coreKeywords, primaryKeyword })` |
     | `header_ready` | `articleContentStream.append(event.h1Html + event.featuredImageHtml)` |
     | `component_chunk` | `articleContentStream.append(event.chunk)` — token-by-token streaming |
     | `incremental_content` | `articleContentStream.append(event.chunk)` — document-order content |
     | `component_complete` | `metadata.set("statusMessage", ...)` |
     | `assembly_complete` | `metadata.set("phase", "assembly")` |
     | `validation_result` | `metadata.set("validationResult", { isValid, score, errorCount, warningCount })` |
     | `classification_complete` | Store in local variable (internal, not sent to frontend) |
     | `complete` | Store `finalHtml`, `wordCount`, `imageCount` |
     | `error` | `metadata.set("error", event.error)`, then throw |

     **Word count tracking:** Update `metadata.set("wordCount", countWords(accumulated))` every ~500ms (throttled to avoid metadata spam).

  6. **Finalize:**
     - Update history entry (same as current API route finally block)
     - Update cost summary: `updateGenerationCostSummary(historyId, userId)`
     - Credit reconciliation (same pattern as bulk-generate lines 1019-1060)
     - Set `metadata.set("phase", "complete")`

  7. **Return task output:**
     ```typescript
     return {
       html: finalHtml,
       wordCount,
       imageCount: imagePlaceholders.length,
       imagePlaceholders: collectedPlaceholders,
       historyId: payload.historyId,
       usedVariation: resolvedVariation,
       usedProvider: provider,
       skipImages: payload.skipImages,
       imageProvider: payload.imageProvider,
       credits: {
         estimated: payload.estimatedCredits,
         used: payload.creditDeduction?.creditsUsed,
         source: payload.creditDeduction?.source,
       },
     }
     ```

  **Error handling:**
  - The task's `catchError` handler sets `metadata.set("error", errorMessage)` before the task fails
  - This allows the frontend to show a meaningful error even if the task crashes
  - History entry is updated to `status: "failed"` in a finally block

- [ ] **3.2** Register the task in `trigger.config.ts` `dirs`
  - Already covered — `dirs: ["./lib/jobs"]` includes the new file automatically

---

### Phase 4: Modify the API Route

> Add a `backgroundTask: true` code path that triggers the Trigger.dev task and returns a `runId` + `publicToken` instead of streaming SSE.

- [ ] **4.1** Add backgroundTask mode to `app/api/generate/route.ts`

  **New request body field:** `backgroundTask?: boolean`

  **When `backgroundTask === true`:**

  1. Run shared preflight (auth, credits, quota, history — via `generation-preflight.ts`)
  2. Trigger the task:
     ```typescript
     import { tasks, auth as triggerAuth } from "@trigger.dev/sdk"
     import type { generateArticleTask } from "@/lib/jobs/generate-article"

     const handle = await tasks.trigger<typeof generateArticleTask>("generate-article", {
       historyId,
       userId,
       articleType,
       topic,
       variation: validVariation,
       targetWordCount: validTargetWordCount,
       componentColor,
       provider: validProvider,
       variationName: validVariationName,
       enableKeywordExpansion,
       enableAutoCorrection,
       skipImages,
       imageProvider,
       amazonAffiliateTag,
       estimatedCredits: estimatedCredits.totalCredits,
       creditDeduction: creditDeduction ? {
         creditsUsed: creditDeduction.creditsUsed,
         source: creditDeduction.source,
       } : undefined,
     })
     ```
  3. Create public access token:
     ```typescript
     const publicToken = await triggerAuth.createPublicToken({
       scopes: {
         read: { runs: [handle.id] },
       },
       expirationTime: "1h",
     })
     ```
  4. Return JSON response:
     ```typescript
     return Response.json({
       runId: handle.id,
       publicToken,
       historyId,
     })
     ```

  **Existing SSE path (`stream: true` without `backgroundTask`)** stays exactly as-is as a fallback.

- [ ] **4.2** Handle error responses consistently
  - 401 for auth failures
  - 402 for insufficient credits (with paywall info)
  - 403 for access/provider restrictions
  - 429 for quota exceeded
  - 400 for missing params
  - 500 for unexpected errors

---

### Phase 5: Create the Frontend Hook

> A custom React hook that wraps `useRealtimeRun` + `useRealtimeStream` and outputs data in the same shape the generate page already expects.

- [ ] **5.1** Create `lib/hooks/useRealtimeGeneration.ts`

  **Hook signature:**
  ```typescript
  export function useRealtimeGeneration(
    runId: string | null,
    accessToken: string | null
  ): {
    // Content
    accumulatedHtml: string
    wordCount: number

    // Progress
    phase: string | null
    statusMessage: string | null
    structure: { h1: string; h2Count: number; faqCount: number; coreKeywords: string[]; primaryKeyword: string } | null
    usedVariation: string | null
    usedProvider: string | null
    validationResult: { isValid: boolean; score: number; errorCount: number; warningCount: number } | null

    // Terminal state
    isComplete: boolean
    isFailed: boolean
    output: GenerateArticleOutput | null
    error: string | null

    // Run object (for advanced use)
    run: RealtimeRun | null
  }
  ```

  **Implementation details:**

  1. **`useRealtimeRun`** — subscribes to run status + metadata:
     ```typescript
     const { run, error: runError } = useRealtimeRun(runId!, {
       accessToken: accessToken!,
       enabled: !!runId && !!accessToken,
     })
     ```

  2. **`useRealtimeStream`** — subscribes to content chunks:
     ```typescript
     const { parts } = useRealtimeStream(articleContentStream, runId!, {
       accessToken: accessToken!,
       enabled: !!runId && !!accessToken,
       throttleInMs: 32, // ~30fps for smooth typing
     })
     ```

  3. **Derive accumulated HTML:**
     ```typescript
     const accumulatedHtml = useMemo(() => {
       if (!parts || parts.length === 0) return ""
       return parts.join("")
     }, [parts])
     ```

  4. **Extract metadata from `run.metadata`:**
     ```typescript
     const phase = run?.metadata?.phase ?? null
     const statusMessage = run?.metadata?.statusMessage ?? null
     const structure = run?.metadata?.structure ?? null
     const wordCount = run?.metadata?.wordCount ?? 0
     // ... etc
     ```

  5. **Detect completion:**
     ```typescript
     const isComplete = run?.status === "COMPLETED"
     const isFailed = run?.status === "FAILED" || run?.status === "CRASHED"
     const output = isComplete ? run.output : null
     const error = isFailed ? (run?.metadata?.error || "Task failed") : null
     ```

- [ ] **5.2** Handle edge cases in the hook
  - **Null guard:** When `runId` or `accessToken` is null, return idle state (all nulls/empty)
  - **Error state:** Map `run.status === "FAILED"` or `"CRASHED"` to error state
  - **Reconnection:** If the component remounts with the same `runId`, `useRealtimeStream` picks up from where it left off (Trigger.dev handles this internally)

---

### Phase 6: Update the Generate Page

> Wire the new hook into the existing page, keeping the SSE path as fallback.

- [ ] **6.1** Add realtime state variables to `GeneratePage`
  ```typescript
  const [realtimeRunId, setRealtimeRunId] = useState<string | null>(null)
  const [realtimeToken, setRealtimeToken] = useState<string | null>(null)
  const [useRealtimeMode, setUseRealtimeMode] = useState(true) // default to realtime
  ```

- [ ] **6.2** Use the `useRealtimeGeneration` hook
  ```typescript
  const realtime = useRealtimeGeneration(realtimeRunId, realtimeToken)
  ```

- [ ] **6.3** Modify `handleGenerate` to use backgroundTask mode
  - When `useRealtimeMode` is true:
    1. POST to `/api/generate` with `backgroundTask: true` (instead of `stream: true`)
    2. Parse JSON response: `{ runId, publicToken, historyId }`
    3. Set `realtimeRunId` and `realtimeToken` from response
    4. Set initial state: `status: "generating"`, `phase: "content"`
    5. The hook takes over from here — no SSE parsing needed

  - When `useRealtimeMode` is false:
    1. Existing SSE flow unchanged (fallback)

- [ ] **6.4** Sync realtime hook data into GenerationState
  - Use a `useEffect` that watches `realtime` values and maps them to `setState`:
    ```typescript
    useEffect(() => {
      if (!realtimeRunId) return

      // Map realtime data to GenerationState
      setState(prev => ({
        ...prev,
        phase: mapPhase(realtime.phase),
        statusMessage: realtime.statusMessage || prev.statusMessage,
        wordCount: realtime.wordCount || prev.wordCount,
        html: realtime.accumulatedHtml || prev.html,
        displayedHtml: replaceImagesWithSpinners(
          realtime.accumulatedHtml || prev.html,
          prev.imageProgress?.urls || new Map()
        ),
        usedVariation: realtime.usedVariation || prev.usedVariation,
        usedProvider: realtime.usedProvider || prev.usedProvider,
      }))
    }, [realtime.accumulatedHtml, realtime.phase, realtime.statusMessage, ...])
    ```

- [ ] **6.5** Handle content completion → trigger background images
  - Watch for `realtime.isComplete`:
    ```typescript
    useEffect(() => {
      if (!realtime.isComplete || !realtime.output) return

      const output = realtime.output
      // Set final HTML
      setState(prev => ({
        ...prev,
        html: output.html,
        wordCount: output.wordCount,
        historyId: output.historyId,
      }))

      // Trigger background image generation (existing flow)
      if (output.imagePlaceholders?.length > 0 && !output.skipImages) {
        triggerBackgroundImages(
          output.html,
          output.wordCount,
          output.historyId,
          output.imagePlaceholders,
          output.credits?.estimated,
        )
      } else {
        setState(prev => ({
          ...prev,
          status: "complete",
          phase: "done",
          progress: 100,
        }))
      }
    }, [realtime.isComplete])
    ```

- [ ] **6.6** Handle errors from the realtime hook
  ```typescript
  useEffect(() => {
    if (realtime.isFailed && realtime.error) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: realtime.error,
      }))
    }
  }, [realtime.isFailed])
  ```

- [ ] **6.7** Handle cancellation
  - When user clicks "Stop":
    ```typescript
    const handleStop = useCallback(async () => {
      if (realtimeRunId) {
        // Cancel the Trigger.dev run
        try {
          await fetch(`/api/generate/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: realtimeRunId }),
          })
        } catch (e) {
          console.error("Failed to cancel run:", e)
        }
        setRealtimeRunId(null)
        setRealtimeToken(null)
      }
      // Also abort any SSE connection (fallback mode)
      abortControllerRef.current?.abort()
    }, [realtimeRunId])
    ```

  - Create `app/api/generate/cancel/route.ts`:
    ```typescript
    import { runs } from "@trigger.dev/sdk"
    // POST: { runId } → runs.cancel(runId)
    ```

- [ ] **6.8** Clean up on unmount
  ```typescript
  useEffect(() => {
    return () => {
      // The hook auto-cleans up WebSocket subscriptions
      // But we should cancel the run if still in progress
      if (realtimeRunId) {
        fetch(`/api/generate/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: realtimeRunId }),
        }).catch(() => {}) // Best-effort
      }
    }
  }, [realtimeRunId])
  ```

---

### Phase 7: Edge Cases & Polish

- [ ] **7.1** Credit reconciliation in the task
  - Same pattern as `bulk-generate.ts` lines 1019-1060
  - Compare estimated credits vs actual cost (from `getGenerationCost`)
  - Refund difference if actual < estimated
  - Log warning if actual > estimated (absorb overage)

- [ ] **7.2** History entry updates
  - Task updates history entry on completion (status: "completed", html, wordCount, metadata with classificationHint)
  - Task updates history entry on failure (status: "failed")
  - Use a `finally` block to ensure this always runs

- [ ] **7.3** Graceful degradation
  - If `tasks.trigger()` fails in the API route, fall back to SSE mode automatically
  - If `auth.createPublicToken()` fails, fall back to SSE mode
  - Log the fallback for monitoring

- [ ] **7.4** Reconnection support
  - If user refreshes mid-generation, they lose `realtimeRunId` (it's in React state)
  - Future enhancement: store `runId` in URL search param (`?runId=run_xxx`) so refresh reconnects
  - For now: the task still completes in the background and the history entry is updated

---

## Files Summary

### New Files

| File | Purpose |
|---|---|
| `lib/streams/generation-streams.ts` | Trigger.dev stream definition (`articleContentStream`) |
| `lib/jobs/generate-article.ts` | New Trigger.dev task for single article generation |
| `lib/hooks/useRealtimeGeneration.ts` | Frontend hook wrapping `useRealtimeRun` + `useRealtimeStream` |
| `lib/services/generation-preflight.ts` | Shared auth/credits/quota/history logic extracted from API route |
| `app/api/generate/cancel/route.ts` | API route to cancel a running generation task |

### Modified Files

| File | Change |
|---|---|
| `app/api/generate/route.ts` | Add `backgroundTask` code path; refactor to use shared preflight |
| `app/(protected)/generate/page.tsx` | Add realtime mode with `useRealtimeGeneration` hook |
| `package.json` | Add `@trigger.dev/react-hooks` dependency |

### Unchanged Files

| File | Why |
|---|---|
| `lib/services/unified-orchestrator.ts` | Generator consumed as-is inside the new task |
| `lib/jobs/orchestrate-generation.ts` | Existing image orchestration task, still triggered by frontend |
| `lib/jobs/generate-images.ts` | Existing image generation child task |
| `lib/services/pusher-server.ts` / `pusher-client.ts` | Image progress flow unchanged |
| `trigger.config.ts` | `dirs: ["./lib/jobs"]` already includes new file |

---

## Verification Checklist

- [ ] **Dev mode works:** `npx trigger dev` starts and picks up the new task
- [ ] **Realtime streaming:** Content appears token-by-token with smooth typing effect (~30fps)
- [ ] **Metadata updates:** Phase transitions, word count, structure info update in real-time
- [ ] **Image flow:** After content completes, image orchestration triggers via existing Pusher path
- [ ] **SSE fallback:** Setting `useRealtimeMode = false` still works via the old SSE path
- [ ] **Credits:** Credit deduction happens upfront; reconciliation refunds overage on completion
- [ ] **Error handling:** AI provider failure → task retries → if still fails, shows error in UI
- [ ] **Cancellation:** Clicking "Stop" cancels the Trigger.dev run and resets UI
- [ ] **History:** History entry created at start, updated on completion/failure
- [ ] **No regressions:** Existing bulk generation, image orchestration, Pusher events all unchanged
