/**
 * AI Content Streaming Service
 *
 * Uses Vercel AI SDK's streamText() for streaming content generation.
 * Returns StreamTextResult for native streaming support.
 */

import { streamText, type StreamTextResult } from 'ai'
import { getModelWithFallback, executeStreamWithFallback, shouldRetryWithFallback, type AIProvider, type ModelTier } from './providers'
import type { CostTrackingContext } from '@/lib/services/cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENT STREAM CONSUMER - Handles fallback during stream iteration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consume a text stream with automatic retry/fallback on failure.
 * If the stream fails during iteration (e.g., 429 error), retries with fallback provider.
 *
 * @param streamFn - Function that creates the stream (will be called again on retry)
 * @param onChunk - Callback for each chunk received
 * @param options - Configuration options
 * @returns The full accumulated text
 */
export async function consumeStreamWithFallback(
  streamFn: (provider: AIProvider) => Promise<{ result: StreamTextResult<Record<string, never>, never>, provider: AIProvider, modelId: string }>,
  onChunk?: (chunk: string, accumulated: string) => void,
  options: {
    preferredProvider?: AIProvider
    maxRetries?: number
    operationName?: string
    costTracking?: CostTrackingContext
  } = {}
): Promise<string> {
  const {
    preferredProvider = 'openai',
    maxRetries = 3,
    operationName = 'stream',
    costTracking,
  } = options

  const startTime = Date.now()
  const providers: AIProvider[] = ['openai', 'gemini']
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Alternate between providers on retries
    const providerIndex = (attempt - 1) % providers.length
    const currentProvider = attempt === 1 ? preferredProvider : providers[providerIndex]

    try {
      const { result, provider, modelId } = await streamFn(currentProvider)
      let accumulated = ''

      for await (const chunk of result.textStream) {
        accumulated += chunk
        if (onChunk) {
          onChunk(chunk, accumulated)
        }
      }

      // Log usage after stream completes if cost tracking is enabled
      if (costTracking) {
        try {
          const usage = await result.usage
          if (usage && (usage.inputTokens || usage.outputTokens)) {
            const { logAiUsageAsync } = await import('@/lib/services/cost-tracking-service')
            logAiUsageAsync({
              historyId: costTracking.historyId,
              userId: costTracking.userId,
              bulkJobId: costTracking.bulkJobId,
              provider,
              modelId,
              operationType: 'stream',
              operationName,
              inputTokens: usage.inputTokens || 0,
              outputTokens: usage.outputTokens || 0,
              durationMs: Date.now() - startTime,
              success: true,
            })
          }
        } catch (usageError) {
          console.warn(`[${operationName}] Failed to log stream usage:`, usageError)
        }
      }

      // Stream completed successfully
      return accumulated
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.log(`[${operationName}] ❌ Stream failed with ${currentProvider} (attempt ${attempt}): ${lastError.message}`)

      // Check if we should retry with fallback
      if (!shouldRetryWithFallback(lastError)) {
        console.log(`[${operationName}] Non-retriable error, not falling back`)
        throw lastError
      }

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1) // Exponential backoff: 1s, 2s, 4s
        console.log(`[${operationName}] Waiting ${delay}ms before retry with fallback...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.log(`[${operationName}] ❌ All ${maxRetries} stream attempts failed`)
  throw lastError
}
import {
  CONTENT_SYSTEM_PROMPT,
  buildOverviewPrompt,
  buildSectionPrompt,
  buildClosingPrompt,
  buildFaqAnswersPrompt,
  buildStreamContentPrompt,
} from './prompts/content-prompts'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe context for connected content generation
 * When provided, all sections will reference these specifics
 */
export interface RecipeContext {
  /** The full dish name (e.g., "Homemade Chocolate Chip Cookies") */
  dishName: string
  /** List of main ingredients with amounts (e.g., ["2 cups flour", "1 cup butter"]) */
  ingredients: string[]
  /** Key cooking method/technique (e.g., "baking", "grilling", "sautéing") */
  cookingMethod?: string
  /** Approximate cooking time (e.g., "25 minutes") */
  cookTime?: string
  /** Number of servings */
  servings?: number
  /** Key flavor profile or cuisine type (e.g., "Italian", "spicy", "comfort food") */
  cuisineStyle?: string
  /** Timeline notes for prep/soak/ferment/settle/cook (if applicable) */
  timelineNote?: string
  /** Fermentation handling for this recipe */
  fermentation?: 'uses' | 'avoids' | 'unknown'
  /** Ingredient usage notes to avoid ambiguity (e.g., water for soaking vs cooking) */
  ingredientNotes?: string[]
}

/**
 * Review context for connected content generation
 * When provided, all sections will reference these specifics
 */
export interface ReviewContext {
  /** The product/service being reviewed */
  productName: string
  /** Category/type (e.g., "wireless headphones", "project management software") */
  category: string
  /** Rating information */
  rating: {
    score: number             // e.g., 8.5
    verdict: string           // e.g., "Highly Recommended", "Good Value"
  }
  /** Key features to reference (top 3-4) */
  keyFeatures: string[]
  /** Top pros to mention (2-3) */
  topPros: string[]
  /** Top cons to mention (1-2) */
  topCons: string[]
  /** Price positioning */
  pricePoint?: 'budget' | 'mid-range' | 'premium'
  /** Target audience */
  targetAudience?: string
}

/**
 * Comparison context for connected content generation
 * When provided, all sections will reference these specifics
 * Supports comparing ANY two things: products, people, services, events, concepts, etc.
 */
export interface ComparisonContext {
  /** First item being compared (e.g., "iPhone 15", "Elon Musk", "React", "Super Bowl LVII") */
  itemA: string
  /** Second item being compared */
  itemB: string
  /** Category of comparison (e.g., "smartphones", "tech entrepreneurs", "JavaScript frameworks", "sporting events") */
  category: string
  /** Comparison criteria/aspects (e.g., ["Price", "Performance", "User Experience"]) */
  criteria: string[]
  /** Key differences to highlight (top 3-4) */
  keyDifferences: string[]
  /** Similarities to mention (1-2) */
  similarities: string[]
  /** Winner/recommendation (if applicable - not all comparisons have a clear winner) */
  winner?: {
    name: string              // e.g., "iPhone 15" or "Neither - it depends"
    reason: string            // e.g., "better camera and ecosystem"
  }
  /** Target audience for this comparison */
  targetAudience?: string
  /** Use case recommendations */
  useCases?: {
    chooseA: string           // e.g., "if you value ecosystem integration"
    chooseB: string           // e.g., "if you want customization options"
  }
}

/**
 * Commercial context for connected content generation
 * When provided, all sections will reference these specifics
 * Focuses on persuasive, benefits-driven, business-focused content
 */
export interface CommercialContext {
  /** Product or service name */
  productName: string
  /** Category/industry (e.g., "SaaS", "consulting", "e-commerce") */
  category: string
  /** Key benefits/value propositions (3-5) */
  keyBenefits: string[]
  /** Main features that deliver the benefits (3-4) */
  keyFeatures: string[]
  /** Target audience/ideal customer */
  targetAudience: string
  /** Primary pain point the product/service solves */
  painPoint: string
  /** Unique selling proposition */
  uniqueValue: string
  /** Call-to-action suggestion */
  ctaSuggestion?: string
  /** Price positioning */
  pricePosition?: 'budget' | 'mid-range' | 'premium' | 'enterprise'
  /** Social proof element */
  socialProof?: string
}

export interface StreamContentParams {
  topic: string
  primaryKeyword: string
  articleType: string
  provider?: AIProvider
  modelTier?: ModelTier
  clusterKeywords?: string[]  // SEO keywords from keyword expansion
  recipeContext?: RecipeContext  // Optional recipe context for connected content
  reviewContext?: ReviewContext  // Optional review context for connected content
  comparisonContext?: ComparisonContext  // Optional comparison context for connected content
  commercialContext?: CommercialContext  // Optional commercial context for connected content
  titleFormat?: 'question' | 'statement' | 'listicle'  // Title format for consistent content
  costTracking?: CostTrackingContext  // Optional cost tracking context
  h1PromiseContext?: string  // Pre-built writing directive from H1 promise
}

export interface StreamOverviewParams extends StreamContentParams {
  h1: string
  tone?: string
}

export interface StreamSectionParams extends StreamContentParams {
  h2: string
  h2Index: number
  totalH2s: number
  previousH2s?: string[]
  tone?: string
}

export interface StreamClosingParams extends StreamContentParams {
  h1: string
  closingH2: string
  mainPoints?: string[]
  tone?: string
}

export interface StreamFaqAnswersParams extends StreamContentParams {
  questions: string[]
  tone?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW STREAMING (100 words)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream overview paragraph (~100 words)
 */
export async function streamOverview(params: StreamOverviewParams) {
  const {
    topic,
    primaryKeyword,
    articleType,
    h1,
    tone = 'professional',
    provider,
    modelTier = 'fast',
    clusterKeywords = [],
    recipeContext,
    reviewContext,
    titleFormat,
  } = params

  // Build context with optional SEO keywords
  let context = `H1: ${h1}. Article type: ${articleType}. Tone: ${tone}`
  if (clusterKeywords.length > 0) {
    context += `. SEO Keywords to naturally include: ${clusterKeywords.slice(0, 3).join(', ')}`
  }

  // Add recipe-specific context for connected content
  if (recipeContext && articleType === 'recipe') {
    console.log('[streamOverview] 🍳 Recipe context detected!')
    console.log('[streamOverview]   Dish:', recipeContext.dishName)
    console.log('[streamOverview]   Ingredients count:', recipeContext.ingredients.length)
    console.log('[streamOverview]   Cooking method:', recipeContext.cookingMethod)
    console.log('[streamOverview]   Cuisine style:', recipeContext.cuisineStyle)
    console.log('[streamOverview]   Timeline note:', recipeContext.timelineNote)
    console.log('[streamOverview]   Fermentation:', recipeContext.fermentation)

    const ingredientHighlights = recipeContext.ingredients.slice(0, 4).join(', ')
    console.log('[streamOverview]   Highlighting ingredients:', ingredientHighlights)

    context += `. RECIPE CONTEXT (MUST REFERENCE): This is about making ${recipeContext.dishName}`
    context += `. Key ingredients include: ${ingredientHighlights}`
    if (recipeContext.cookingMethod) {
      context += `. Main cooking method: ${recipeContext.cookingMethod}`
    }
    if (recipeContext.cookTime) {
      context += `. Takes about ${recipeContext.cookTime} to prepare`
    }
    if (recipeContext.cuisineStyle) {
      context += `. Style: ${recipeContext.cuisineStyle}`
    }
    if (recipeContext.timelineNote) {
      context += `. Timeline note: ${recipeContext.timelineNote}`
    }
    if (recipeContext.fermentation && recipeContext.fermentation !== 'unknown') {
      context += `. Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}`
      context += `. Do NOT contradict the fermentation handling`
    }
    if (recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0) {
      context += `. Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}`
    }
    context += `. Write an engaging intro that mentions specific ingredients and what makes this dish special`
    console.log('[streamOverview] ✅ Recipe context added to prompt')
  }

  // Add review-specific context for connected content
  if (reviewContext && articleType === 'review') {
    console.log('[streamOverview] ⭐ Review context detected!')
    console.log('[streamOverview]   Product:', reviewContext.productName)
    console.log('[streamOverview]   Category:', reviewContext.category)
    console.log('[streamOverview]   Rating:', reviewContext.rating.score, '-', reviewContext.rating.verdict)
    console.log('[streamOverview]   Key features:', reviewContext.keyFeatures.slice(0, 3).join(', '))
    console.log('[streamOverview]   Top pros:', reviewContext.topPros.slice(0, 2).join(', '))
    console.log('[streamOverview]   Top cons:', reviewContext.topCons.slice(0, 2).join(', '))

    context += `. REVIEW CONTEXT (MUST REFERENCE): Reviewing ${reviewContext.productName}`
    context += `. Category: ${reviewContext.category}`
    context += `. Overall rating: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"`
    context += `. Key features: ${reviewContext.keyFeatures.slice(0, 3).join(', ')}`
    context += `. Main strengths: ${reviewContext.topPros.slice(0, 2).join(', ')}`
    if (reviewContext.topCons.length > 0) {
      context += `. Notable considerations: ${reviewContext.topCons[0]}`
    }
    if (reviewContext.pricePoint) {
      context += `. Price positioning: ${reviewContext.pricePoint}`
    }
    if (reviewContext.targetAudience) {
      context += `. Target audience: ${reviewContext.targetAudience}`
    }
    context += `. Write an engaging intro that teases the rating, mentions key features, and sets expectations`
    console.log('[streamOverview] ✅ Review context added to prompt')
  }

  // Add comparison-specific context for connected content
  const comparisonContext = params.comparisonContext
  if (comparisonContext && articleType === 'comparison') {
    console.log('[streamOverview] ⚖️ Comparison context detected!')
    console.log('[streamOverview]   Comparing:', comparisonContext.itemA, 'vs', comparisonContext.itemB)
    console.log('[streamOverview]   Category:', comparisonContext.category)
    console.log('[streamOverview]   Criteria:', comparisonContext.criteria.slice(0, 4).join(', '))
    console.log('[streamOverview]   Key differences:', comparisonContext.keyDifferences.slice(0, 2).join(', '))
    console.log('[streamOverview]   Similarities:', comparisonContext.similarities.slice(0, 2).join(', '))
    if (comparisonContext.winner) {
      console.log('[streamOverview]   Winner:', comparisonContext.winner.name, '-', comparisonContext.winner.reason)
    }

    context += `. COMPARISON CONTEXT (MUST REFERENCE): Comparing ${comparisonContext.itemA} vs ${comparisonContext.itemB}`
    context += `. Category: ${comparisonContext.category}`
    context += `. Key comparison criteria: ${comparisonContext.criteria.slice(0, 3).join(', ')}`
    context += `. Main differences: ${comparisonContext.keyDifferences.slice(0, 2).join(', ')}`
    if (comparisonContext.similarities.length > 0) {
      context += `. Shared traits: ${comparisonContext.similarities[0]}`
    }
    if (comparisonContext.winner) {
      context += `. Our recommendation: ${comparisonContext.winner.name} - ${comparisonContext.winner.reason}`
    }
    if (comparisonContext.useCases) {
      context += `. Choose ${comparisonContext.itemA} ${comparisonContext.useCases.chooseA}, choose ${comparisonContext.itemB} ${comparisonContext.useCases.chooseB}`
    }
    context += `. Write an engaging intro that sets up the comparison, hints at key differences, and what readers will learn`
    console.log('[streamOverview] ✅ Comparison context added to prompt')
  }

  // Add commercial-specific context for connected content
  const commercialContext = params.commercialContext
  if (commercialContext && articleType === 'commercial') {
    console.log('[streamOverview] 💼 Commercial context detected!')
    console.log('[streamOverview]   Product/Service:', commercialContext.productName)
    console.log('[streamOverview]   Category:', commercialContext.category)
    console.log('[streamOverview]   Target Audience:', commercialContext.targetAudience)
    console.log('[streamOverview]   Pain Point:', commercialContext.painPoint)
    console.log('[streamOverview]   Key Benefits:', commercialContext.keyBenefits.slice(0, 3).join(', '))
    console.log('[streamOverview]   Unique Value:', commercialContext.uniqueValue)

    context += `. COMMERCIAL CONTEXT (MUST REFERENCE): Promoting ${commercialContext.productName}`
    context += `. Category: ${commercialContext.category}`
    context += `. Target audience: ${commercialContext.targetAudience}`
    context += `. Pain point we solve: ${commercialContext.painPoint}`
    context += `. Key benefits: ${commercialContext.keyBenefits.slice(0, 3).join(', ')}`
    context += `. Unique value proposition: ${commercialContext.uniqueValue}`
    if (commercialContext.pricePosition) {
      context += `. Positioned as: ${commercialContext.pricePosition}`
    }
    if (commercialContext.socialProof) {
      context += `. Social proof: ${commercialContext.socialProof}`
    }
    context += `. Write a compelling intro that speaks to the target audience's pain point and hints at the solution`
    console.log('[streamOverview] ✅ Commercial context added to prompt')
  }

  const { result } = await executeStreamWithFallback(
    async (model) => {
      return streamText({
        model,
        system: CONTENT_SYSTEM_PROMPT,
        prompt: buildStreamContentPrompt({
          contentType: 'overview',
          topic,
          primaryKeyword,
          targetWords: 100,
          context,
          articleType,
          recipeContext,
          reviewContext,
          comparisonContext,
          commercialContext,
          titleFormat,
          h1PromiseContext: params.h1PromiseContext,
        }),
        temperature: 0.8,  // Slightly higher for more variation
      })
    },
    { preferredProvider: provider, tier: modelTier, operationName: 'streamOverview', costTracking: params.costTracking }
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONTENT STREAMING (150 words)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream section content (~150 words)
 */
export async function streamSectionContent(params: StreamSectionParams) {
  const {
    topic,
    primaryKeyword,
    articleType,
    h2,
    h2Index,
    totalH2s,
    previousH2s = [],
    tone = 'professional',
    provider,
    modelTier = 'fast',
    clusterKeywords = [],
    recipeContext,
    reviewContext,
    titleFormat,
  } = params

  const contextParts = [
    `Section ${h2Index + 1} of ${totalH2s}`,
    `Article type: ${articleType}`,
    `Tone: ${tone}`,
  ]

  if (previousH2s.length > 0) {
    contextParts.push(`Previous sections: ${previousH2s.join(', ')}`)
  }

  // Add SEO keywords if available (rotate through for variety)
  if (clusterKeywords.length > 0) {
    const keywordIndex = h2Index % clusterKeywords.length
    contextParts.push(`Naturally include keyword: "${clusterKeywords[keywordIndex]}"`)
  }

  // Add recipe-specific context for connected content
  if (recipeContext && articleType === 'recipe') {
    // Select different ingredients to highlight based on section index for variety
    const ingredientStartIdx = (h2Index * 2) % Math.max(1, recipeContext.ingredients.length - 2)
    const relevantIngredients = recipeContext.ingredients.slice(ingredientStartIdx, ingredientStartIdx + 3)

    console.log(`[streamSection-${h2Index}] 🍳 Recipe context for section "${h2}"`)
    console.log(`[streamSection-${h2Index}]   Highlighting ingredients:`, relevantIngredients.join(', '))
    console.log(`[streamSection-${h2Index}]   Timeline note:`, recipeContext.timelineNote)
    console.log(`[streamSection-${h2Index}]   Fermentation:`, recipeContext.fermentation)

    contextParts.push(`RECIPE CONTEXT (MUST REFERENCE): Writing about ${recipeContext.dishName}`)
    contextParts.push(`Reference these ingredients naturally: ${relevantIngredients.join(', ')}`)

    if (recipeContext.cookingMethod) {
      contextParts.push(`Cooking method: ${recipeContext.cookingMethod}`)
    }
    if (recipeContext.cuisineStyle) {
      contextParts.push(`Style: ${recipeContext.cuisineStyle}`)
    }
    if (recipeContext.timelineNote) {
      contextParts.push(`Timeline note: ${recipeContext.timelineNote}`)
    }
    if (recipeContext.fermentation && recipeContext.fermentation !== 'unknown') {
      contextParts.push(`Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}`)
      contextParts.push(`Do NOT contradict the fermentation handling`)
    }
    if (recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0) {
      contextParts.push(`Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}`)
    }
    contextParts.push(`Connect this section to the actual recipe - mention specific ingredients, techniques, or timing`)
    console.log(`[streamSection-${h2Index}] ✅ Recipe context added to section prompt`)
  }

  // Add review-specific context for connected content
  if (reviewContext && articleType === 'review') {
    // Rotate through features/pros/cons based on section index for variety
    const featureIdx = h2Index % reviewContext.keyFeatures.length
    const relevantFeature = reviewContext.keyFeatures[featureIdx]
    const prosIdx = h2Index % reviewContext.topPros.length
    const relevantPro = reviewContext.topPros[prosIdx]

    console.log(`[streamSection-${h2Index}] ⭐ Review context for section "${h2}"`)
    console.log(`[streamSection-${h2Index}]   Highlighting feature:`, relevantFeature)
    console.log(`[streamSection-${h2Index}]   Highlighting pro:`, relevantPro)
    console.log(`[streamSection-${h2Index}]   Rating:`, reviewContext.rating.score, '-', reviewContext.rating.verdict)

    contextParts.push(`REVIEW CONTEXT (MUST REFERENCE): Writing about ${reviewContext.productName}`)
    contextParts.push(`Category: ${reviewContext.category}`)
    contextParts.push(`Overall rating: ${reviewContext.rating.score}/10`)
    contextParts.push(`Feature to highlight in this section: ${relevantFeature}`)
    contextParts.push(`Strength to reference: ${relevantPro}`)
    if (reviewContext.topCons.length > 0 && h2Index === totalH2s - 1) {
      // Mention cons in later sections for balance
      contextParts.push(`Balance with consideration: ${reviewContext.topCons[0]}`)
    }
    if (reviewContext.pricePoint) {
      contextParts.push(`Price positioning: ${reviewContext.pricePoint}`)
    }
    if (reviewContext.targetAudience) {
      contextParts.push(`Target audience: ${reviewContext.targetAudience}`)
    }
    contextParts.push(`Connect this section to actual product features and evaluation - be specific`)
    console.log(`[streamSection-${h2Index}] ✅ Review context added to section prompt`)
  }

  // Add comparison-specific context for connected content
  const comparisonContext = params.comparisonContext
  if (comparisonContext && articleType === 'comparison') {
    // Rotate through criteria based on section index for variety
    const criteriaIdx = h2Index % comparisonContext.criteria.length
    const relevantCriterion = comparisonContext.criteria[criteriaIdx]
    const diffIdx = h2Index % Math.max(1, comparisonContext.keyDifferences.length)
    const relevantDiff = comparisonContext.keyDifferences[diffIdx]

    console.log(`[streamSection-${h2Index}] ⚖️ Comparison context for section "${h2}"`)
    console.log(`[streamSection-${h2Index}]   Comparing: ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
    console.log(`[streamSection-${h2Index}]   Highlighting criterion:`, relevantCriterion)
    console.log(`[streamSection-${h2Index}]   Highlighting difference:`, relevantDiff)

    contextParts.push(`COMPARISON CONTEXT (MUST REFERENCE): Comparing ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
    contextParts.push(`Category: ${comparisonContext.category}`)
    contextParts.push(`Criterion to highlight in this section: ${relevantCriterion}`)
    contextParts.push(`Key difference to reference: ${relevantDiff}`)
    if (comparisonContext.similarities.length > 0 && h2Index % 2 === 0) {
      // Mention similarities in some sections for balance
      contextParts.push(`Also acknowledge similarity: ${comparisonContext.similarities[0]}`)
    }
    if (comparisonContext.winner && h2Index === totalH2s - 1) {
      // Hint at recommendation in later sections
      contextParts.push(`Our recommendation leans toward: ${comparisonContext.winner.name}`)
    }
    if (comparisonContext.targetAudience) {
      contextParts.push(`Target audience: ${comparisonContext.targetAudience}`)
    }
    contextParts.push(`Compare the two options fairly on this aspect - be specific and balanced`)
    console.log(`[streamSection-${h2Index}] ✅ Comparison context added to section prompt`)
  }

  // Add commercial-specific context for connected content
  const commercialContext = params.commercialContext
  if (commercialContext && articleType === 'commercial') {
    // Rotate through benefits/features based on section index for variety
    const benefitIdx = h2Index % commercialContext.keyBenefits.length
    const relevantBenefit = commercialContext.keyBenefits[benefitIdx]
    const featureIdx = h2Index % commercialContext.keyFeatures.length
    const relevantFeature = commercialContext.keyFeatures[featureIdx]

    console.log(`[streamSection-${h2Index}] 💼 Commercial context for section "${h2}"`)
    console.log(`[streamSection-${h2Index}]   Product/Service: ${commercialContext.productName}`)
    console.log(`[streamSection-${h2Index}]   Highlighting benefit:`, relevantBenefit)
    console.log(`[streamSection-${h2Index}]   Highlighting feature:`, relevantFeature)

    contextParts.push(`COMMERCIAL CONTEXT (MUST REFERENCE): Promoting ${commercialContext.productName}`)
    contextParts.push(`Category: ${commercialContext.category}`)
    contextParts.push(`Benefit to highlight in this section: ${relevantBenefit}`)
    contextParts.push(`Feature that delivers this benefit: ${relevantFeature}`)
    contextParts.push(`Target audience: ${commercialContext.targetAudience}`)
    contextParts.push(`Pain point we address: ${commercialContext.painPoint}`)
    if (commercialContext.socialProof && h2Index === 0) {
      // Include social proof in first section
      contextParts.push(`Social proof to reference: ${commercialContext.socialProof}`)
    }
    if (commercialContext.pricePosition) {
      contextParts.push(`Price positioning: ${commercialContext.pricePosition}`)
    }
    contextParts.push(`Write persuasive content that sells the benefit - focus on outcomes, not just features`)
    console.log(`[streamSection-${h2Index}] ✅ Commercial context added to section prompt`)
  }

  const { result } = await executeStreamWithFallback(
    async (model) => {
      return streamText({
        model,
        system: CONTENT_SYSTEM_PROMPT,
        prompt: buildStreamContentPrompt({
          contentType: 'section',
          topic,
          primaryKeyword,
          targetWords: 150,
          context: contextParts.join('. '),
          h2,
          articleType,
          recipeContext,
          reviewContext,
          comparisonContext,
          commercialContext,
          titleFormat,
          h2Index,
          totalH2s,
          h1PromiseContext: params.h1PromiseContext,
        }),
        temperature: 0.8,  // Higher temperature for more variation between generations
      })
    },
    { preferredProvider: provider, tier: modelTier, operationName: `streamSection-${h2Index}`, costTracking: params.costTracking }
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING STREAMING (50 words)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream closing paragraph (~50 words)
 */
export async function streamClosing(params: StreamClosingParams) {
  const {
    topic,
    primaryKeyword,
    articleType,
    h1,
    closingH2,
    mainPoints = [],
    tone = 'professional',
    provider,
    modelTier = 'fast',
    clusterKeywords = [],
    recipeContext,
    reviewContext,
    titleFormat,
  } = params

  const contextParts = [
    `H1: ${h1}`,
    `Closing H2: ${closingH2}`,
    `Article type: ${articleType}`,
    `Tone: ${tone}`,
  ]

  if (mainPoints.length > 0) {
    contextParts.push(`Key points covered: ${mainPoints.join(', ')}`)
  }

  // Add primary keyword reinforcement for closing
  if (clusterKeywords.length > 0) {
    contextParts.push(`Reinforce primary keyword naturally: "${clusterKeywords[0]}"`)
  }

  // Add recipe-specific closing context
  if (recipeContext && articleType === 'recipe') {
    console.log('[streamClosing] 🍳 Recipe context for closing')
    console.log('[streamClosing]   Dish:', recipeContext.dishName)
    console.log('[streamClosing]   Key ingredients:', recipeContext.ingredients.slice(0, 2).join(' and '))
    console.log('[streamClosing]   Timeline note:', recipeContext.timelineNote)
    console.log('[streamClosing]   Fermentation:', recipeContext.fermentation)

    contextParts.push(`RECIPE CONTEXT: Closing for ${recipeContext.dishName}`)
    contextParts.push(`Mention enjoying the dish with key ingredients like ${recipeContext.ingredients.slice(0, 2).join(' and ')}`)
    if (recipeContext.servings) {
      contextParts.push(`Serves ${recipeContext.servings} people`)
    }
    if (recipeContext.timelineNote) {
      contextParts.push(`Timeline note: ${recipeContext.timelineNote}`)
    }
    if (recipeContext.fermentation && recipeContext.fermentation !== 'unknown') {
      contextParts.push(`Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}`)
    }
    if (recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0) {
      contextParts.push(`Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}`)
    }
    contextParts.push(`Encourage reader to try making this recipe`)
    console.log('[streamClosing] ✅ Recipe context added to closing prompt')
  }

  // Add review-specific closing context
  if (reviewContext && articleType === 'review') {
    console.log('[streamClosing] ⭐ Review context for closing')
    console.log('[streamClosing]   Product:', reviewContext.productName)
    console.log('[streamClosing]   Rating:', reviewContext.rating.score, '-', reviewContext.rating.verdict)
    console.log('[streamClosing]   Top pro:', reviewContext.topPros[0])

    // Determine closing tone based on rating
    let closingTone = 'balanced'
    if (reviewContext.rating.score >= 8.5) {
      closingTone = 'enthusiastically positive'
    } else if (reviewContext.rating.score >= 7) {
      closingTone = 'positive with reservations'
    } else if (reviewContext.rating.score >= 5) {
      closingTone = 'balanced and measured'
    } else {
      closingTone = 'cautiously reserved'
    }

    contextParts.push(`REVIEW CONTEXT: Closing for ${reviewContext.productName}`)
    contextParts.push(`Final verdict: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"`)
    contextParts.push(`Closing tone should be: ${closingTone}`)
    contextParts.push(`Key strength to emphasize: ${reviewContext.topPros[0]}`)
    if (reviewContext.topCons.length > 0) {
      contextParts.push(`Acknowledge limitation: ${reviewContext.topCons[0]}`)
    }
    if (reviewContext.targetAudience) {
      contextParts.push(`Recommend for: ${reviewContext.targetAudience}`)
    }
    if (reviewContext.pricePoint) {
      contextParts.push(`Value assessment: ${reviewContext.pricePoint} option`)
    }
    contextParts.push(`Write a confident conclusion aligned with the ${reviewContext.rating.score}/10 rating`)
    console.log('[streamClosing] ✅ Review context added to closing prompt')
  }

  // Add comparison-specific closing context
  const comparisonContext = params.comparisonContext
  if (comparisonContext && articleType === 'comparison') {
    console.log('[streamClosing] ⚖️ Comparison context for closing')
    console.log('[streamClosing]   Comparing:', comparisonContext.itemA, 'vs', comparisonContext.itemB)
    console.log('[streamClosing]   Winner:', comparisonContext.winner?.name || 'No clear winner')
    console.log('[streamClosing]   Use cases:', comparisonContext.useCases ? 'Yes' : 'No')

    contextParts.push(`COMPARISON CONTEXT: Closing for ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
    contextParts.push(`Category: ${comparisonContext.category}`)
    if (comparisonContext.winner) {
      contextParts.push(`Our recommendation: ${comparisonContext.winner.name} - ${comparisonContext.winner.reason}`)
    } else {
      contextParts.push(`No clear winner - depends on user needs`)
    }
    if (comparisonContext.useCases) {
      contextParts.push(`Choose ${comparisonContext.itemA} ${comparisonContext.useCases.chooseA}`)
      contextParts.push(`Choose ${comparisonContext.itemB} ${comparisonContext.useCases.chooseB}`)
    }
    if (comparisonContext.targetAudience) {
      contextParts.push(`Ideal for: ${comparisonContext.targetAudience}`)
    }
    contextParts.push(`Write a decisive closing that helps readers make their choice based on their needs`)
    console.log('[streamClosing] ✅ Comparison context added to closing prompt')
  }

  // Add commercial-specific closing context
  const commercialContext = params.commercialContext
  if (commercialContext && articleType === 'commercial') {
    console.log('[streamClosing] 💼 Commercial context for closing')
    console.log('[streamClosing]   Product/Service:', commercialContext.productName)
    console.log('[streamClosing]   CTA Suggestion:', commercialContext.ctaSuggestion || 'Take action today')
    console.log('[streamClosing]   Unique Value:', commercialContext.uniqueValue)

    contextParts.push(`COMMERCIAL CONTEXT: Closing for ${commercialContext.productName}`)
    contextParts.push(`Unique value proposition: ${commercialContext.uniqueValue}`)
    contextParts.push(`Target audience: ${commercialContext.targetAudience}`)
    contextParts.push(`Primary benefit to reinforce: ${commercialContext.keyBenefits[0]}`)
    if (commercialContext.ctaSuggestion) {
      contextParts.push(`Call-to-action direction: ${commercialContext.ctaSuggestion}`)
    }
    if (commercialContext.socialProof) {
      contextParts.push(`Reinforce with: ${commercialContext.socialProof}`)
    }
    if (commercialContext.pricePosition) {
      contextParts.push(`Value positioning: ${commercialContext.pricePosition}`)
    }
    contextParts.push(`Write a compelling closing that drives action - emphasize the transformation and invite the reader to take the next step`)
    console.log('[streamClosing] ✅ Commercial context added to closing prompt')
  }

  const { result } = await executeStreamWithFallback(
    async (model) => {
      return streamText({
        model,
        system: CONTENT_SYSTEM_PROMPT,
        prompt: buildStreamContentPrompt({
          contentType: 'closing',
          topic,
          primaryKeyword,
          targetWords: 50,
          context: contextParts.join('. '),
          articleType,
          recipeContext,
          reviewContext,
          comparisonContext,
          commercialContext,
          titleFormat,
          totalH2s: mainPoints.length,
          h1PromiseContext: params.h1PromiseContext,
        }),
        temperature: 0.8,
      })
    },
    { preferredProvider: provider, tier: modelTier, operationName: 'streamClosing', costTracking: params.costTracking }
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ ANSWER STREAMING (28 words each)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream individual FAQ answer (~28 words)
 */
export async function streamFaqAnswer(params: {
  topic: string
  primaryKeyword: string
  question: string
  questionIndex: number
  provider?: AIProvider
  modelTier?: ModelTier
  costTracking?: CostTrackingContext
}) {
  const {
    topic,
    primaryKeyword,
    question,
    questionIndex,
    provider,
    modelTier = 'fast',
    costTracking,
  } = params

  const { result } = await executeStreamWithFallback(
    async (model) => {
      return streamText({
        model,
        system: CONTENT_SYSTEM_PROMPT,
        prompt: buildStreamContentPrompt({
          contentType: 'faq-answer',
          topic,
          primaryKeyword,
          targetWords: 28,
          context: `Question ${questionIndex + 1}: ${question}`,
        }),
        temperature: 0.7,
      })
    },
    { preferredProvider: provider, tier: modelTier, operationName: `streamFaqAnswer-${questionIndex}`, costTracking }
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CONTENT STREAMING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream all section content for an article (returns async iterator)
 */
export async function* streamAllSections(params: {
  topic: string
  primaryKeyword: string
  articleType: string
  h2s: string[]
  tone?: string
  provider?: AIProvider
  modelTier?: ModelTier
}): AsyncGenerator<{ h2Index: number; content: string; done: boolean }> {
  const { h2s, ...baseParams } = params
  const previousH2s: string[] = []

  for (let i = 0; i < h2s.length; i++) {
    const h2 = h2s[i]
    const stream = await streamSectionContent({
      ...baseParams,
      h2,
      h2Index: i,
      totalH2s: h2s.length,
      previousH2s: [...previousH2s],
    })

    let content = ''

    for await (const chunk of stream.textStream) {
      content += chunk
      yield { h2Index: i, content, done: false }
    }

    yield { h2Index: i, content, done: true }
    previousH2s.push(h2)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert stream to string
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Collect full text from a stream result
 */
export async function collectStreamText(
  stream: Awaited<ReturnType<typeof streamText>>
): Promise<string> {
  let fullText = ''

  for await (const chunk of stream.textStream) {
    fullText += chunk
  }

  return fullText
}

/**
 * Collect text with progress callback
 */
export async function collectStreamTextWithProgress(
  stream: Awaited<ReturnType<typeof streamText>>,
  onProgress: (text: string, delta: string) => void
): Promise<string> {
  let fullText = ''

  for await (const chunk of stream.textStream) {
    fullText += chunk
    onProgress(fullText, chunk)
  }

  return fullText
}
