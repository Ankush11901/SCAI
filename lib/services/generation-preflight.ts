/**
 * Generation Preflight
 *
 * Shared auth/credits/quota/history logic extracted from the API route.
 * Used by both the SSE streaming path and the backgroundTask (Trigger.dev) path.
 */

import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, generationHistory } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkGenerationAccess, canUseImageProvider } from '@/lib/services/access-service'
import { estimateArticleCredits, calculateImageCount, type CreditEstimate } from '@/lib/services/credit-estimator'
import { deductCredits, getCreditInfo, InsufficientCreditsError } from '@/lib/services/credit-service'
import { formatTimeUntil } from '@/lib/utils/time'
import { incrementQuotaUsage, QuotaExceededError } from '@/lib/services/quota-service'
import { createHistoryEntry } from '@/lib/services/history-service'
import { createCostTrackingContext, type CostTrackingContext } from '@/lib/services/cost-tracking-service'
import type { TitleVariation } from '@/lib/types/generation'
import type { AIProvider } from '@/lib/ai/providers'
import type { ImageProvider } from '@/lib/services/imagen'
import type { BaseVariationName } from '@/lib/services/template-hydrator'
import type { LocalBusinessInfo, ArticleTypeContext } from '@/lib/services/content-generators'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export class PreflightError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'PreflightError'
  }
}

export interface PreflightRequestBody {
  articleType: string
  topic: string
  variation?: string
  targetWordCount?: number
  componentColor?: string
  provider?: string
  variationName?: string
  enableKeywordExpansion?: boolean
  enableAutoCorrection?: boolean
  skipImages?: boolean
  imageProvider?: string
  backgroundImages?: boolean
  generationRequestId?: string
  localBusinessInfo?: LocalBusinessInfo
  articleContext?: ArticleTypeContext
  selectedComponents?: string[]
}

export interface PreflightResult {
  userId: string
  amazonAffiliateTag?: string
  historyId: string
  costTracking?: CostTrackingContext
  creditDeduction: { success: boolean; creditsUsed?: number; source?: string } | null
  estimatedCredits: CreditEstimate
  validatedParams: {
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
    backgroundImages: boolean
    imageProvider?: string
    localBusinessInfo?: LocalBusinessInfo
    articleContext?: ArticleTypeContext
    selectedComponents?: string[]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Runs all preflight checks for article generation:
 * auth, credits, quota, validation, history entry creation.
 *
 * @throws PreflightError with appropriate status codes
 */
export async function runGenerationPreflight(
  body: PreflightRequestBody,
): Promise<PreflightResult> {
  // ─── 1. Authentication ─────────────────────────────────────────────────────
  let userId: string | null = null
  let amazonAffiliateTag: string | undefined = undefined

  try {
    const authSession = await getAuthSession()
    userId = authSession?.user?.id || null

    if (userId) {
      const userProfile = await db.select().from(users).where(eq(users.id, userId)).get()
      amazonAffiliateTag = userProfile?.amazonAffiliateTag || undefined
    }
  } catch (error) {
    console.error('[preflight] Auth error:', error)
  }

  if (!userId) {
    throw new PreflightError('Invalid session', 401)
  }

  // ─── 2. Parse & validate request body ──────────────────────────────────────
  const {
    articleType,
    topic,
    variation = 'statement',
    targetWordCount = 1000,
    componentColor = 'default',
    provider = 'openai',
    variationName = 'Clean Studio',
    enableKeywordExpansion = false,
    enableAutoCorrection = true,
    skipImages = false,
    imageProvider,
    backgroundImages = false,
    generationRequestId,
    localBusinessInfo: legacyLocalBusinessInfo,
    articleContext: rawArticleContext,
    selectedComponents,
  } = body

  // Merge legacy localBusinessInfo into articleContext for backwards compatibility
  const articleContext: ArticleTypeContext | undefined = rawArticleContext
    ?? (legacyLocalBusinessInfo ? { localBusinessInfo: legacyLocalBusinessInfo } : undefined)
  // Also derive localBusinessInfo from articleContext for legacy callers
  const localBusinessInfo = articleContext?.localBusinessInfo ?? legacyLocalBusinessInfo

  if (!articleType || !topic) {
    throw new PreflightError('Missing articleType or topic', 400)
  }

  // ─── 3. Image provider access ──────────────────────────────────────────────
  if (imageProvider) {
    const providerAccess = await canUseImageProvider(userId, imageProvider as ImageProvider)
    if (!providerAccess.allowed) {
      throw new PreflightError('Upgrade required', 403, {
        message: providerAccess.reason || `Your current plan does not include access to ${imageProvider}. Please upgrade to ${providerAccess.requiredTier || 'Pro'} plan.`,
        imageProvider,
        upgradeRequired: providerAccess.upgradeRequired,
        requiredTier: providerAccess.requiredTier,
      })
    }
  }

  // ─── 4. Generation access ──────────────────────────────────────────────────
  const accessCheck = await checkGenerationAccess(userId)
  if (!accessCheck.allowed) {
    throw new PreflightError(accessCheck.reason || 'Insufficient credits or quota', 403, {
      details: accessCheck,
    })
  }

  // ─── 5. Validate params ────────────────────────────────────────────────────
  const validVariation: TitleVariation =
    variation === 'question' ? 'question' :
      variation === 'listicle' ? 'listicle' :
        'statement'

  const validProvider: AIProvider =
    provider === 'claude' ? 'claude' :
      provider === 'openai' ? 'openai' :
        'gemini'

  const validVariationName = variationName as BaseVariationName | 'random'
  const validTargetWordCount = Math.max(800, Math.min(targetWordCount, 4000))

  // ─── 6. Estimate & deduct credits ─────────────────────────────────────────
  const wordCount = validTargetWordCount
  const estimatedImageCount = calculateImageCount(articleType, wordCount, selectedComponents)
  const estimatedCredits = estimateArticleCredits({
    articleType,
    wordCount,
    imageCount: skipImages ? 0 : estimatedImageCount,
    imageProvider: (imageProvider as ImageProvider) || 'flux',
    selectedComponents, // Pass component toggles for accurate credit calculation
  })

  let creditDeduction: { success: boolean; creditsUsed?: number; sources?: Array<{source: 'monthly' | 'daily' | 'payg' | 'overage', amount: number}> } | null = null
  try {
    const result = await deductCredits(userId, estimatedCredits.totalCredits, `generation_${articleType}`, {
      description: `Article generation: ${topic}`,
    })
    creditDeduction = {
      success: result.success,
      creditsUsed: result.amount,
      sources: result.sources,
    }
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      // Fetch credit info to get reset times for paywall
      const creditInfo = await getCreditInfo(userId)
      const resetsIn = formatTimeUntil(creditInfo.monthly?.resetsAt)
      
      throw new PreflightError('Insufficient credits', 402, {
        message: error.message,
        tier: error.tier,
        creditsRequired: error.required,
        creditsAvailable: error.available,
        allowOverage: error.allowOverage,
        resetsIn,
        renewsIn: error.tier === 'pro' ? resetsIn : undefined,
      })
    }
    console.error('[preflight] Credit deduction error:', error)
    // Continue even if credit tracking fails (graceful degradation)
  }

  // ─── 7. Legacy quota (if credit system not enabled) ────────────────────────
  if (!process.env.USE_CREDIT_SYSTEM) {
    try {
      await incrementQuotaUsage(userId)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw new PreflightError('Daily quota exceeded', 429, {
          used: error.used,
          limit: error.limit,
          resetsAt: error.resetsAt.toISOString(),
        })
      }
      console.error('[preflight] Quota error:', error)
    }
  }

  // ─── 8. Idempotency check ─────────────────────────────────────────────────
  // If generationRequestId is provided, check for an existing history entry
  // to prevent double-deduction on double-click
  if (generationRequestId) {
    const existing = await db
      .select({ id: generationHistory.id, metadata: generationHistory.metadata })
      .from(generationHistory)
      .where(and(
        eq(generationHistory.userId, userId),
        eq(generationHistory.status, 'pending'),
      ))
      .all()

    for (const entry of existing) {
      try {
        const meta = entry.metadata ? JSON.parse(entry.metadata) : {}
        if (meta.generationRequestId === generationRequestId) {
          // Found existing entry — return it without re-deducting credits
          // Refund the credits we just deducted since they were already charged
          if (creditDeduction?.creditsUsed && creditDeduction.creditsUsed > 0) {
            try {
              const { refundCredits } = await import('@/lib/services/credit-service')
              // Pass the original source for accurate refund tracking
              const originalSource = creditDeduction.sources?.[0]?.source as 'monthly' | 'payg' | 'overage' | undefined
              await refundCredits(
                userId,
                creditDeduction.creditsUsed,
                entry.id,
                `Duplicate request refund (requestId: ${generationRequestId})`,
                originalSource,
              )
            } catch (refundError) {
              console.error('[preflight] Refund for duplicate failed:', refundError)
            }
          }

          const costTracking = createCostTrackingContext(entry.id, userId)
          return {
            userId,
            amazonAffiliateTag,
            historyId: entry.id,
            costTracking,
            creditDeduction,
            estimatedCredits,
            existingRunId: meta.triggerRunId,
            validatedParams: {
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
              backgroundImages,
              imageProvider,
              localBusinessInfo,
              articleContext,
              selectedComponents,
            },
          } as PreflightResult & { existingRunId?: string }
        }
      } catch {
        // JSON parse error — skip this entry
      }
    }
  }

  // ─── 9. Create history entry ───────────────────────────────────────────────
  console.log('[preflight] Request params:', { articleType, topic, variation, backgroundImages, skipImages, provider, variationName })

  let historyId: string
  try {
    const historyEntry = await createHistoryEntry({
      userId,
      articleType,
      keyword: topic,
      variation: validVariation,
      status: 'pending',
    })
    historyId = historyEntry.id

    // Store generationRequestId in metadata for idempotency
    if (generationRequestId) {
      const { updateHistoryEntry } = await import('@/lib/services/history-service')
      await updateHistoryEntry(historyId, {
        metadata: { generationRequestId },
      })
    }
  } catch (error) {
    console.error('[preflight] History creation error:', error)
    throw new PreflightError('Failed to create history entry', 500)
  }

  // ─── 10. Cost tracking context ─────────────────────────────────────────────
  const costTracking = createCostTrackingContext(historyId, userId)

  return {
    userId,
    amazonAffiliateTag,
    historyId,
    costTracking,
    creditDeduction,
    estimatedCredits,
    validatedParams: {
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
      backgroundImages,
      imageProvider,
      localBusinessInfo,
      articleContext,
      selectedComponents,
    },
  }
}
