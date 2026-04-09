/**
 * Cost Tracking Service
 *
 * Tracks AI usage across all providers and calculates costs based on token/image pricing.
 * Stores data in SQLite via Drizzle ORM.
 *
 * Key design decisions:
 * - Costs stored in micro-dollars (USD * 1,000,000) for integer precision
 * - Non-blocking logging via fire-and-forget pattern
 * - Context object passed through generation pipeline
 */

import { db } from '@/lib/db'
import { aiUsageLogs, generationCostSummaries } from '@/lib/db/schema'
import { eq, gte, sql, desc } from 'drizzle-orm'
import { MODEL_SPECS, IMAGE_PRICING, type ModelSpec } from '@/lib/ai/models'
import crypto from 'crypto'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'flux'
export type OperationType = 'text' | 'object' | 'stream' | 'image'

/**
 * Cost tracking context - passed through generation pipeline
 */
export interface CostTrackingContext {
  historyId: string
  userId: string
  bulkJobId?: string
  startTime: number
}

/**
 * Input for logging a single AI usage event
 */
export interface UsageLogInput {
  historyId?: string
  userId: string
  bulkJobId?: string
  provider: AIProvider
  modelId: string
  operationType: OperationType
  operationName?: string
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * Cost calculation result (all values in micro-dollars)
 */
export interface CostCalculation {
  inputCostUsd: number
  outputCostUsd: number
  imageCostUsd: number
  totalCostUsd: number
}

/**
 * Generation cost summary for display
 */
export interface GenerationCostDisplay {
  totalCost: string
  totalCostMicro: number
  totalInputTokens: number
  totalOutputTokens: number
  totalImages: number
  apiCallCount: number
  durationMs: number
  byProvider: {
    gemini: string
    claude: string
    openai: string
    flux: string
    images: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert USD to micro-dollars for integer storage
 */
function toMicroDollars(usd: number): number {
  return Math.round(usd * 1_000_000)
}

/**
 * Convert micro-dollars to USD for display
 */
function fromMicroDollars(microDollars: number): number {
  return microDollars / 1_000_000
}

/**
 * Calculate cost for an AI operation
 * Returns costs in micro-dollars (USD * 1,000,000) for precision
 */
export function calculateCost(
  modelId: string,
  inputTokens: number = 0,
  outputTokens: number = 0,
  imageCount: number = 0
): CostCalculation {
  let inputCostUsd = 0
  let outputCostUsd = 0
  let imageCostUsd = 0

  // Get model spec for token pricing
  const spec = MODEL_SPECS[modelId]
  if (spec) {
    // Text token costs: (tokens / 1000) * costPer1kTokens
    inputCostUsd = (inputTokens / 1000) * spec.costPer1kInputTokens
    outputCostUsd = (outputTokens / 1000) * spec.costPer1kOutputTokens
  }

  // Image generation cost (per-image pricing)
  if (imageCount > 0 && modelId in IMAGE_PRICING) {
    imageCostUsd = imageCount * IMAGE_PRICING[modelId]
  }

  return {
    inputCostUsd: toMicroDollars(inputCostUsd),
    outputCostUsd: toMicroDollars(outputCostUsd),
    imageCostUsd: toMicroDollars(imageCostUsd),
    totalCostUsd: toMicroDollars(inputCostUsd + outputCostUsd + imageCostUsd),
  }
}

/**
 * Format micro-dollars as a readable currency string
 */
export function formatCost(microDollars: number): string {
  const dollars = fromMicroDollars(microDollars)
  if (dollars === 0) {
    return '$0.00'
  }
  if (dollars < 0.0001) {
    return `$${dollars.toFixed(6)}`
  }
  if (dollars < 0.01) {
    return `$${dollars.toFixed(4)}`
  }
  return `$${dollars.toFixed(2)}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new cost tracking context for a generation
 */
export function createCostTrackingContext(
  historyId: string,
  userId: string,
  bulkJobId?: string
): CostTrackingContext {
  return {
    historyId,
    userId,
    bulkJobId,
    startTime: Date.now(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log an AI usage event to the database
 * Returns the log ID for reference
 */
export async function logAiUsage(input: UsageLogInput): Promise<string> {
  const id = crypto.randomUUID()

  const cost = calculateCost(
    input.modelId,
    input.inputTokens || 0,
    input.outputTokens || 0,
    input.imageCount || 0
  )

  try {
    await db.insert(aiUsageLogs).values({
      id,
      historyId: input.historyId || null,
      userId: input.userId,
      bulkJobId: input.bulkJobId || null,
      provider: input.provider,
      modelId: input.modelId,
      operationType: input.operationType,
      operationName: input.operationName || null,
      inputTokens: input.inputTokens || 0,
      outputTokens: input.outputTokens || 0,
      totalTokens: (input.inputTokens || 0) + (input.outputTokens || 0),
      imageCount: input.imageCount || 0,
      inputCostUsd: cost.inputCostUsd,
      outputCostUsd: cost.outputCostUsd,
      imageCostUsd: cost.imageCostUsd,
      totalCostUsd: cost.totalCostUsd,
      durationMs: input.durationMs || null,
      success: input.success !== false,
      errorMessage: input.errorMessage || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
  } catch (error) {
    console.error('[CostTracking] Failed to log AI usage:', error)
    // Don't throw - logging failures shouldn't break generation
  }

  return id
}

/**
 * Log AI usage without waiting (fire-and-forget)
 * Use this for non-critical logging to avoid slowing down generation
 */
export function logAiUsageAsync(input: UsageLogInput): void {
  logAiUsage(input).catch((error) => {
    console.error('[CostTracking] Async log failed:', error)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update or create a generation cost summary by aggregating all usage logs
 */
export async function updateGenerationCostSummary(
  historyId: string,
  userId: string
): Promise<void> {
  try {
    // Fetch all usage logs for this generation
    const logs = await db
      .select()
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.historyId, historyId))

    if (logs.length === 0) {
      return // No logs to aggregate
    }

    // Calculate aggregates
    const summary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalImageCount: 0,
      geminiCostUsd: 0,
      claudeCostUsd: 0,
      openaiCostUsd: 0,
      fluxCostUsd: 0,
      imageCostUsd: 0,
      totalCostUsd: 0,
      apiCallCount: logs.length,
      durationMs: 0,
    }

    for (const log of logs) {
      summary.totalInputTokens += log.inputTokens || 0
      summary.totalOutputTokens += log.outputTokens || 0
      summary.totalImageCount += log.imageCount || 0
      summary.totalCostUsd += log.totalCostUsd || 0
      summary.imageCostUsd += log.imageCostUsd || 0
      summary.durationMs += log.durationMs || 0

      // Provider-specific text costs (input + output, excluding image cost)
      const textCost = (log.inputCostUsd || 0) + (log.outputCostUsd || 0)
      switch (log.provider) {
        case 'gemini':
          summary.geminiCostUsd += textCost
          break
        case 'claude':
          summary.claudeCostUsd += textCost
          break
        case 'openai':
          summary.openaiCostUsd += textCost
          break
        case 'flux':
          summary.fluxCostUsd += textCost
          break
      }
    }

    // Check if summary exists
    const existing = await db
      .select()
      .from(generationCostSummaries)
      .where(eq(generationCostSummaries.historyId, historyId))
      .limit(1)

    if (existing.length > 0) {
      // Update existing summary
      await db
        .update(generationCostSummaries)
        .set({
          ...summary,
          updatedAt: new Date(),
        })
        .where(eq(generationCostSummaries.historyId, historyId))
    } else {
      // Create new summary
      await db.insert(generationCostSummaries).values({
        id: crypto.randomUUID(),
        historyId,
        userId,
        ...summary,
      })
    }
  } catch (error) {
    console.error('[CostTracking] Failed to update cost summary:', error)
    // Don't throw - summary failures shouldn't break generation
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cost summary for a specific generation
 */
export async function getGenerationCost(
  historyId: string
): Promise<GenerationCostDisplay | null> {
  const [summary] = await db
    .select()
    .from(generationCostSummaries)
    .where(eq(generationCostSummaries.historyId, historyId))
    .limit(1)

  if (!summary) {
    return null
  }

  return {
    totalCost: formatCost(summary.totalCostUsd || 0),
    totalCostMicro: summary.totalCostUsd || 0,
    totalInputTokens: summary.totalInputTokens || 0,
    totalOutputTokens: summary.totalOutputTokens || 0,
    totalImages: summary.totalImageCount || 0,
    apiCallCount: summary.apiCallCount || 0,
    durationMs: summary.durationMs || 0,
    byProvider: {
      gemini: formatCost(summary.geminiCostUsd || 0),
      claude: formatCost(summary.claudeCostUsd || 0),
      openai: formatCost(summary.openaiCostUsd || 0),
      flux: formatCost(summary.fluxCostUsd || 0),
      images: formatCost(summary.imageCostUsd || 0),
    },
  }
}

/**
 * Get detailed usage logs for a specific generation
 */
export async function getGenerationLogs(historyId: string) {
  const logs = await db
    .select()
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.historyId, historyId))
    .orderBy(aiUsageLogs.createdAt)

  return logs.map((log) => ({
    id: log.id,
    provider: log.provider,
    modelId: log.modelId,
    operationType: log.operationType,
    operationName: log.operationName,
    inputTokens: log.inputTokens || 0,
    outputTokens: log.outputTokens || 0,
    imageCount: log.imageCount || 0,
    cost: formatCost(log.totalCostUsd || 0),
    costMicro: log.totalCostUsd || 0,
    durationMs: log.durationMs || 0,
    success: log.success,
    createdAt: log.createdAt,
  }))
}

/**
 * Get aggregated cost statistics for admin dashboard
 */
export async function getCostStatistics(options: {
  startDate?: Date
  groupBy?: 'provider' | 'model' | 'operation'
}) {
  const { startDate, groupBy = 'provider' } = options

  // Build base query with optional date filter
  let query = db.select().from(aiUsageLogs)
  if (startDate) {
    query = query.where(gte(aiUsageLogs.createdAt, startDate)) as typeof query
  }

  const logs = await query

  // Calculate totals
  const totals = {
    totalCostMicro: 0,
    totalCalls: logs.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalImages: 0,
  }

  // Group by specified dimension
  const groups: Record<string, { totalCost: number; callCount: number }> = {}

  for (const log of logs) {
    totals.totalCostMicro += log.totalCostUsd || 0
    totals.totalInputTokens += log.inputTokens || 0
    totals.totalOutputTokens += log.outputTokens || 0
    totals.totalImages += log.imageCount || 0

    // Determine group key
    let groupKey: string
    switch (groupBy) {
      case 'model':
        groupKey = log.modelId
        break
      case 'operation':
        groupKey = log.operationName || 'unknown'
        break
      case 'provider':
      default:
        groupKey = log.provider
        break
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { totalCost: 0, callCount: 0 }
    }
    groups[groupKey].totalCost += log.totalCostUsd || 0
    groups[groupKey].callCount += 1
  }

  // Convert to array and sort by cost
  const breakdown = Object.entries(groups)
    .map(([group, data]) => ({
      group,
      totalCost: data.totalCost,
      totalCostFormatted: formatCost(data.totalCost),
      callCount: data.callCount,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)

  return {
    totals: {
      ...totals,
      totalCost: formatCost(totals.totalCostMicro),
    },
    breakdown,
  }
}
