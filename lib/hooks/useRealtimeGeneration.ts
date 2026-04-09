"use client"

import { useRef, useMemo } from "react"
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks"
import type { AnyTask } from "@trigger.dev/sdk/v3"
import type { GenerateArticleOutput } from "@/lib/jobs/generate-article"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RealtimeGenerationState {
  /** Accumulated HTML (incremental buffer — not re-joined every render) */
  html: string
  /** Current generation phase */
  phase: string
  /** Human-readable status message */
  statusMessage: string
  /** Incremental word count (official count comes from output on complete) */
  wordCount: number
  /** Article structure metadata */
  structure?: {
    h1: string
    h2Count: number
    faqCount: number
    coreKeywords: string[]
    primaryKeyword: string
  }
  /** Which design variation was used */
  usedVariation?: string
  /** Which AI provider was used */
  usedProvider?: string
  /** Validation result summary */
  validationResult?: {
    isValid: boolean
    score: number
    errorCount: number
    warningCount: number
  }
  /** Image generation progress */
  imageProgress?: {
    completed: number
    total: number
  }
  /** Post-processed HTML (available after content phase, before images complete) */
  processedHtml?: string
  /** Map of imageId → R2 URL for completed images (from child task metadata updates) */
  completedImageUrls: Map<string, string>
  /** Error message if generation failed */
  error?: string | null

  /** Run status flags */
  isComplete: boolean
  isFailed: boolean
  isRunning: boolean

  /** Task output (available when complete) */
  output: GenerateArticleOutput | null

  /** Connection error from realtime hooks */
  connectionError?: Error | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook that wraps Trigger.dev realtime primitives for article generation.
 *
 * Uses `useRealtimeRun` for status/metadata/output and `useRealtimeStream`
 * for HTML content chunks. Maintains an incremental buffer to avoid
 * re-joining all parts on every render.
 *
 * @param runId - The Trigger.dev run ID (null to disable)
 * @param accessToken - Public access token for the run (null to disable)
 */
export function useRealtimeGeneration(
  runId: string | null,
  accessToken: string | null,
): RealtimeGenerationState {
  // ─── Incremental buffer ────────────────────────────────────────────────
  // Track how many parts we've already processed to avoid re-joining all
  const bufferRef = useRef("")
  const lastPartsLengthRef = useRef(0)
  const waitingForStreamResetRef = useRef(false)

  // ─── Realtime hooks ────────────────────────────────────────────────────
  // Use useRealtimeRunWithStreams to subscribe to run + streams in one hook
  type StreamTypes = { "article-content": string }

  const { run, streams, error: runError } = useRealtimeRunWithStreams<AnyTask, StreamTypes>(
    runId ?? undefined,
    {
      accessToken: accessToken ?? undefined,
      enabled: !!runId && !!accessToken,
    },
  )

  // Extract the article-content stream parts
  const parts = streams?.["article-content"] ?? null
  const streamError: Error | null = null // errors handled via runError

  // ─── Buffer reset on runId change (BEFORE accumulation) ────────────────
  // Must happen before accumulation to prevent stale stream data from the
  // old run being re-accumulated after lastPartsLengthRef resets to 0.
  const prevRunIdRef = useRef(runId)
  if (runId !== prevRunIdRef.current) {
    bufferRef.current = ""
    lastPartsLengthRef.current = 0
    waitingForStreamResetRef.current = true
    prevRunIdRef.current = runId
  }

  // ─── Incremental HTML accumulation ─────────────────────────────────────
  // After a runId change, wait for the stream to clear (parts becomes
  // null/empty) before accumulating again. This prevents old stream data
  // from being re-accumulated while useRealtimeRunWithStreams transitions
  // its internal subscription to the new run.
  if (waitingForStreamResetRef.current) {
    if (!parts || parts.length === 0) {
      // Stream subscription has reset — safe to accumulate new data
      waitingForStreamResetRef.current = false
      lastPartsLengthRef.current = 0
    }
  } else if (parts && parts.length > lastPartsLengthRef.current) {
    const newParts = parts.slice(lastPartsLengthRef.current)
    bufferRef.current += newParts.join("")
    lastPartsLengthRef.current = parts.length
  }

  // ─── Extract metadata ──────────────────────────────────────────────────
  // Guard against stale run data: if the hook's run object belongs to a
  // different run than the one we requested, treat it as empty. This
  // prevents a completed run A from leaking into a newly started run B.
  const isStaleRun = !!(run && runId && run.id !== runId)
  const safeRun = isStaleRun ? undefined : run
  const meta = safeRun?.metadata as Record<string, unknown> | undefined

  // ─── Derive state ──────────────────────────────────────────────────────
  return useMemo<RealtimeGenerationState>(() => {
    const isComplete = safeRun?.status === "COMPLETED"
    const isFailed = safeRun?.status === "FAILED" || safeRun?.status === "CRASHED" || safeRun?.status === "SYSTEM_FAILURE"
    const isRunning = safeRun?.status === "EXECUTING"

    // Extract completed image URLs from metadata (imageUrl_<imageId> → url)
    const completedImageUrls = new Map<string, string>()
    if (meta) {
      for (const [key, value] of Object.entries(meta)) {
        if (key.startsWith("imageUrl_") && typeof value === "string") {
          completedImageUrls.set(key.slice("imageUrl_".length), value)
        }
      }
    }

    return {
      html: bufferRef.current,
      phase: (meta?.phase as string) ?? "content",
      statusMessage: (meta?.statusMessage as string) ?? "",
      wordCount: (meta?.wordCount as number) ?? 0,
      structure: meta?.structure as RealtimeGenerationState["structure"] | undefined,
      usedVariation: meta?.usedVariation as string | undefined,
      usedProvider: meta?.usedProvider as string | undefined,
      validationResult: meta?.validationResult as RealtimeGenerationState["validationResult"] | undefined,
      imageProgress: meta?.imageProgress as RealtimeGenerationState["imageProgress"] | undefined,
      processedHtml: meta?.processedHtml as string | undefined,
      completedImageUrls,
      error: (meta?.error as string) ?? null,
      isComplete,
      isFailed,
      isRunning,
      output: (isComplete && safeRun?.output ? safeRun.output : null) as GenerateArticleOutput | null,
      connectionError: runError ?? streamError ?? null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRun, meta, runError, streamError, parts?.length])
}
