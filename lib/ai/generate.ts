/**
 * AI Article Structure Generation Service
 * 
 * Uses Vercel AI SDK's generateObject() to create article structures
 * with strict validation via Zod schemas.
 */

import { generateObject } from 'ai'
import { getModelWithFallback, executeWithFallback, isProviderAvailable, type AIProvider, type ModelTier } from './providers'
import { StructureOutputSchemaRelaxed, fixStructureImageAlts, type StructureOutput } from './schemas'
import { logAiUsageAsync, type CostTrackingContext } from '@/lib/services/cost-tracking-service'
import { correctGrammar, correctGrammarBatch } from './grammar-checker'
import {
  STRUCTURE_SYSTEM_PROMPT,
  buildFullStructurePrompt,
  buildH1Prompt,
  buildH2Prompt,
  buildFaqPrompt,
  buildMetaPrompt,
  buildImageAltPrompt,
  getH2Purposes,
  type FullStructurePromptParams,
} from './prompts/structure-prompts'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateStructureParams {
  topic: string
  primaryKeyword: string
  articleType: string
  h2Count: number
  tone?: string
  provider?: AIProvider
  modelTier?: ModelTier
  titleFormat?: 'question' | 'statement' | 'listicle'
  /** For affiliate articles: cleaned product names with badges for product-aware H2 generation */
  affiliateProducts?: Array<{ name: string; badge: string }>
  /** Core keywords extracted from primaryKeyword for natural H2 integration */
  coreKeywords?: string[]
  /** Cost tracking context for logging AI usage */
  costTracking?: CostTrackingContext
}

export interface GenerateStructureResult {
  success: boolean
  structure?: StructureOutput
  error?: string
  provider: AIProvider
  model: string
  duration: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number): number {
  return RETRY_DELAY_MS * Math.pow(2, attempt)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete article structure using AI
 * 
 * @param params - Generation parameters
 * @returns Structure output with all headings, meta, and image alts
 */
export async function generateStructure(
  params: GenerateStructureParams
): Promise<GenerateStructureResult> {
  const startTime = Date.now()
  const {
    topic,
    primaryKeyword,
    articleType,
    h2Count,
    tone = 'professional',
    provider,
    modelTier = 'fast',
    titleFormat,
    affiliateProducts,
    coreKeywords,
    costTracking,
  } = params

  // Build the prompt
  const promptParams: FullStructurePromptParams = {
    topic,
    primaryKeyword,
    articleType,
    h2Count,
    tone,
    titleFormat,
    affiliateProducts,
    coreKeywords,
  }
  const userPrompt = buildFullStructurePrompt(promptParams)

  console.log(`[generateStructure] Topic: "${topic}", H2 count: ${h2Count}`)

  try {
    const { result, provider: usedProvider, modelId, usedFallback, attempts } = await executeWithFallback(
      async (model) => {
        // Use relaxed schema for AI generation (allows longer image alts)
        return generateObject({
          model,
          schema: StructureOutputSchemaRelaxed,
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.7,
          maxRetries: 1, // executeWithFallback handles retries
        })
      },
      {
        preferredProvider: provider,
        tier: modelTier,
        operationName: 'generateStructure',
        maxRetries: 2, // Retry same provider before falling back
        retryDelayMs: 1000,
        costTracking,
      }
    )

    // Post-process to fix image alt lengths (truncate if needed)
    const fixedStructure = fixStructureImageAlts(result.object)

    // Apply grammar checking to H1 and H2 titles
    console.log(`[generateStructure] Applying grammar check to titles...`)
    try {
      // Correct H1
      fixedStructure.h1 = await correctGrammar(fixedStructure.h1, {
        type: 'h1',
        provider: usedProvider,
        logCorrections: true,
      })

      // Correct all H2 titles in batch
      const correctedH2Titles = await correctGrammarBatch(fixedStructure.h2s, {
        type: 'h2',
        provider: usedProvider,
        logCorrections: true,
      })
      fixedStructure.h2s = correctedH2Titles

      // Correct closing H2
      fixedStructure.closing.h2 = await correctGrammar(fixedStructure.closing.h2, {
        type: 'h2',
        provider: usedProvider,
        logCorrections: true,
      })

      console.log(`[generateStructure] ✅ Grammar check complete`)
    } catch (grammarError) {
      console.warn(`[generateStructure] ⚠️ Grammar check failed, using original titles:`, grammarError)
      // Continue with original titles if grammar check fails
    }

    console.log(`[generateStructure] ✅ Success with ${usedProvider}/${modelId} (attempts: ${attempts}, fallback: ${usedFallback})`)
    console.log(`[generateStructure] Generated structure with ${fixedStructure.h2s.length} H2s`)

    return {
      success: true,
      structure: fixedStructure as StructureOutput,
      provider: usedProvider,
      model: modelId,
      duration: Date.now() - startTime,
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`[generateStructure] ❌ All attempts failed: ${errorMessage}`)

    // Log detailed error info for debugging
    if (error.cause) {
      console.log(`[generateStructure] Cause:`, error.cause)
    }

    // Check if this is a schema validation error
    const isSchemaError = errorMessage.includes('did not match schema') ||
      errorMessage.includes('validation') ||
      errorMessage.includes('too_big')

    if (isSchemaError && error.cause?.issues) {
      const errorDetails = error.cause.issues.map((i: any) =>
        `${i.path?.join('.')}: ${i.message}`
      ).join(', ')
      console.log(`[generateStructure] Schema validation failed: ${errorDetails}`)
    }

    // Get the provider that was attempted (for error reporting)
    const { provider: attemptedProvider, modelId } = getModelWithFallback(provider, modelTier)

    return {
      success: false,
      error: errorMessage,
      provider: attemptedProvider,
      model: modelId,
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTIAL STRUCTURE GENERATION (for step-by-step approach)
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

/**
 * Generate just the H1 title
 */
export async function generateH1(params: {
  topic: string
  primaryKeyword: string
  articleType: string
  tone?: string
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<{ h1: string; error?: string }> {
  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({ text: z.string().min(50).max(60) }),
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: buildH1Prompt({
            topic: params.topic,
            primaryKeyword: params.primaryKeyword,
            articleType: params.articleType,
            tone: params.tone,
          }),
          temperature: 0.7,
        })
      },
      { preferredProvider: params.provider, tier: 'fast', operationName: 'generateH1', costTracking: params.costTracking }
    )

    return { h1: result.object.text }
  } catch (error) {
    return {
      h1: '',
      error: error instanceof Error ? error.message : 'H1 generation failed'
    }
  }
}

/**
 * Generate H2 headings for the article
 */
export async function generateH2s(params: {
  topic: string
  primaryKeyword: string
  articleType: string
  h1: string
  h2Count: number
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<{ h2s: string[]; error?: string }> {
  const purposes = getH2Purposes(params.articleType)

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({ h2s: z.array(z.string().min(50).max(60)) }),
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: buildH2Prompt({
            topic: params.topic,
            primaryKeyword: params.primaryKeyword,
            articleType: params.articleType,
            h1: params.h1,
            h2Count: params.h2Count,
            sectionPurposes: purposes.slice(0, params.h2Count),
          }),
          temperature: 0.7,
        })
      },
      { preferredProvider: params.provider, tier: 'fast', operationName: 'generateH2s', costTracking: params.costTracking }
    )

    return { h2s: result.object.h2s }
  } catch (error) {
    return {
      h2s: [],
      error: error instanceof Error ? error.message : 'H2 generation failed'
    }
  }
}

/**
 * Generate FAQ section
 */
export async function generateFaq(params: {
  topic: string
  primaryKeyword: string
  articleType: string
  faqCount?: number
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<{ faq: { h2: string; questions: string[] }; error?: string }> {
  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({
            h2: z.string().min(10).max(30),
            questions: z.array(z.string().min(30).max(60)),
          }),
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: buildFaqPrompt({
            topic: params.topic,
            primaryKeyword: params.primaryKeyword,
            articleType: params.articleType,
            faqCount: params.faqCount,
          }),
          temperature: 0.7,
        })
      },
      { preferredProvider: params.provider, tier: 'fast', operationName: 'generateFaq', costTracking: params.costTracking }
    )

    return { faq: result.object }
  } catch (error) {
    return {
      faq: { h2: '', questions: [] },
      error: error instanceof Error ? error.message : 'FAQ generation failed'
    }
  }
}

/**
 * Generate meta information
 */
export async function generateMeta(params: {
  topic: string
  primaryKeyword: string
  h1: string
  articleType: string
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<{ meta: { title: string; description: string }; error?: string }> {
  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({
            title: z.string().min(50).max(60),
            description: z.string().min(150).max(160),  // Per validator: 150-160 chars
          }),
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: buildMetaPrompt({
            topic: params.topic,
            primaryKeyword: params.primaryKeyword,
            h1: params.h1,
            articleType: params.articleType,
          }),
          temperature: 0.7,
        })
      },
      { preferredProvider: params.provider, tier: 'fast', operationName: 'generateMeta', costTracking: params.costTracking }
    )

    return { meta: result.object }
  } catch (error) {
    return {
      meta: { title: '', description: '' },
      error: error instanceof Error ? error.message : 'Meta generation failed'
    }
  }
}

/**
 * Generate image alt texts
 */
export async function generateImageAlts(params: {
  topic: string
  primaryKeyword: string
  h1: string
  h2s: string[]
  articleType?: string
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<{ imageAlts: { featured: string; h2s: string[] }; error?: string }> {
  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({
            featured: z.string().min(100).max(125),
            h2s: z.array(z.string().min(80).max(100)),
          }),
          system: STRUCTURE_SYSTEM_PROMPT,
          prompt: buildImageAltPrompt({
            topic: params.topic,
            primaryKeyword: params.primaryKeyword,
            h1: params.h1,
            h2s: params.h2s,
            articleType: params.articleType,
          }),
          temperature: 0.7,
        })
      },
      { preferredProvider: params.provider, tier: 'fast', operationName: 'generateImageAlts', costTracking: params.costTracking }
    )

    return { imageAlts: result.object }
  } catch (error) {
    return {
      imageAlts: { featured: '', h2s: [] },
      error: error instanceof Error ? error.message : 'Image alt generation failed'
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE-AWARE H1 GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

import {
  extractH1Promise,
  extractListicleCount,
  type ExtractedPromise
} from './utils/h1-promise-extractor'
import { buildH1OnlyPrompt } from './prompts/structure-prompts'

export interface GenerateH1OnlyParams {
  topic: string
  primaryKeyword: string
  articleType: string
  variation: 'statement' | 'question' | 'listicle'
  h2Count?: number  // For listicle number matching (required for listicle variation)
  targetWordCount?: number  // Article word budget — calibrates H1 promise scope
  tone?: string
  affiliateProducts?: Array<{ name: string; badge: string }>
  provider?: AIProvider
  coreKeywords?: string[]  // Extracted keywords for natural phrasing
  costTracking?: CostTrackingContext
  previousH1s?: string[]  // Previously generated H1s to avoid (bulk generation)
}

export interface GenerateH1OnlyResult {
  h1: string
  normalizedH1: string
  promise: ExtractedPromise
  meta: { title: string; description: string }
  error?: string
}

/**
 * Generate H1 independently with promise-aware normalization
 * 
 * For listicle variation:
 * - Ensures H1 contains the correct number matching h2Count
 * - Normalizes H1 if number is missing or wrong
 * 
 * Returns the H1, normalized version, and extracted promise for H2 generation.
 */
export async function generateH1Only(
  params: GenerateH1OnlyParams
): Promise<GenerateH1OnlyResult> {
  const {
    topic,
    primaryKeyword,
    articleType,
    variation,
    h2Count,
    tone = 'professional',
    affiliateProducts,
    provider,
    coreKeywords,
  } = params

  const maxAttempts = 3
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[generateH1Only] Attempt ${attempt}/${maxAttempts} for "${topic}"`)

      if (coreKeywords && coreKeywords.length > 0) {
        console.log(`[generateH1Only] ✅ Using extracted keywords: [${coreKeywords.join(', ')}]`)
        console.log(`[generateH1Only] Original phrase: "${primaryKeyword}"`)
      } else {
        console.log(`[generateH1Only] ⚠️ No extracted keywords - using full phrase: "${primaryKeyword}"`)
      }

      // Build the H1-only prompt with h2Count for listicle alignment
      const prompt = buildH1OnlyPrompt({
        topic,
        primaryKeyword,
        articleType,
        tone,
        titleFormat: variation,
        h2Count: variation === 'listicle' ? h2Count : undefined,
        targetWordCount: params.targetWordCount,
        affiliateProducts,
        coreKeywords,
        previousH1s: params.previousH1s,
      })

      const { result } = await executeWithFallback(
        async (model) => {
          return generateObject({
            model,
            // Relaxed schema for AI generation (matching StructureOutputSchemaRelaxed pattern)
            // Exact CHARACTER_LIMITS (50-60, 150-160) enforced by content corrector post-generation
            schema: z.object({
              h1: z.string().min(10).max(80),
              meta: z.object({
                title: z.string().min(20).max(70),
                description: z.string().min(80).max(180),
              }),
            }),
            system: STRUCTURE_SYSTEM_PROMPT,
            prompt,
            temperature: 0.9,
          })
        },
        { preferredProvider: provider, tier: 'fast', operationName: 'generateH1Only', costTracking: params.costTracking }
      )

      // Strip markdown heading syntax (AI sometimes includes # in heading text)
      let h1 = result.object.h1.replace(/#{1,6}\s*/g, '').trim()
      let normalizedH1 = h1

      // Listicle normalization: ensure H1 has the correct number
      // Check both variation and articleType — listicle articles always need numbered H1s
      if (variation === 'listicle' || articleType === 'listicle') {
        const extractedCount = extractListicleCount(h1)

        if (extractedCount === null) {
          // H1 doesn't have a number, prepend it
          console.log(`[generateH1Only] H1 missing number, adding ${h2Count}`)
          normalizedH1 = `${h2Count} ${h1}`
        } else if (extractedCount !== h2Count) {
          // H1 has wrong number, correct it — also handle word numbers (e.g., "Seven")
          console.log(`[generateH1Only] H1 has ${extractedCount}, normalizing to ${h2Count}`)
          // Replace leading digit or word number
          const wordNumberPattern = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\b/i
          if (wordNumberPattern.test(h1)) {
            normalizedH1 = h1.replace(wordNumberPattern, String(h2Count))
          } else {
            normalizedH1 = h1.replace(/^\d+/, String(h2Count))
          }
        }
      }

      // Extract promise from normalized H1
      const promise = extractH1Promise(normalizedH1)

      // Apply grammar checking to H1
      try {
        normalizedH1 = await correctGrammar(normalizedH1, {
          type: 'h1',
          logCorrections: true,
        })
      } catch (grammarError) {
        console.warn(`[generateH1Only] ⚠️ Grammar check failed for H1, using original`)
      }

      // Statement H1s must NOT end with question marks (grammar checker sometimes adds them)
      if (variation === 'statement' && normalizedH1.endsWith('?')) {
        normalizedH1 = normalizedH1.slice(0, -1).trim()
        console.log(`[generateH1Only] Stripped trailing "?" from statement H1`)
      }

      console.log(`[generateH1Only] ✅ H1: "${normalizedH1}"`)
      console.log(`[generateH1Only] Promise: ${promise.promiseType}, count: ${promise.count}, subject: "${promise.subject}"`)

      if (coreKeywords && coreKeywords.length > 0) {
        const hasFullPhrase = normalizedH1.toLowerCase().includes(primaryKeyword.toLowerCase())
        const hasNaturalKeywords = coreKeywords.some(kw => normalizedH1.toLowerCase().includes(kw.toLowerCase()))
        console.log(`[generateH1Only] Keyword check - Full phrase: ${hasFullPhrase ? '❌ PRESENT' : '✅ ABSENT'}, Natural keywords: ${hasNaturalKeywords ? '✅ PRESENT' : '❌ ABSENT'}`)
      }

      // Hard rejection: ban gerund-starting H1s (model often ignores prompt instructions)
      const bannedGerundStarters = /^(understanding|addressing|exploring|examining|tracing|discovering|navigating|unlocking|unraveling|demystifying|decoding|unpacking|dissecting|embracing|harnessing|leveraging|mastering)\b/i
      const bannedWordsAnywhere = /\bunderstanding\b/i
      if (bannedGerundStarters.test(normalizedH1.trim())) {
        lastError = `H1 starts with banned gerund pattern: "${normalizedH1.split(' ')[0]}"`
        console.log(`[generateH1Only] ⚠️ ${lastError}, retrying...`)
        continue
      }
      if (bannedWordsAnywhere.test(normalizedH1)) {
        lastError = `H1 contains banned word "understanding": "${normalizedH1}"`
        console.log(`[generateH1Only] ⚠️ ${lastError}, retrying...`)
        continue
      }

      // Validate promise extraction succeeded
      if (variation === 'listicle' && promise.count !== h2Count) {
        lastError = `H1 count mismatch after normalization: expected ${h2Count}, got ${promise.count}`
        console.log(`[generateH1Only] ⚠️ ${lastError}, retrying...`)
        continue
      }

      return {
        h1,
        normalizedH1,
        promise,
        meta: {
          title: result.object.meta.title.replace(/#{1,6}\s*/g, '').trim(),
          description: result.object.meta.description.replace(/#{1,6}\s*/g, '').trim(),
        },
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'H1 generation failed'
      console.log(`[generateH1Only] ❌ Attempt ${attempt} failed: ${lastError}`)

      if (attempt < maxAttempts) {
        await sleep(getRetryDelay(attempt))
      }
    }
  }

  // All attempts failed, return error
  return {
    h1: '',
    normalizedH1: '',
    promise: {
      h1: '',
      count: null,
      promiseType: 'generic',
      subject: topic,
      action: '',
      isListicle: false,
      isQuestion: false,
      confidence: 0,
    },
    meta: { title: '', description: '' },
    error: lastError,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE-AWARE H2 GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getPromiseFulfillmentInstructions,
  validatePromiseFulfillment,
  type PromiseFulfillmentValidation,
} from './utils/promise-fulfillment-rules'
import { buildH2FromH1Prompt } from './prompts/structure-prompts'

export interface GenerateH2sFromH1Params {
  normalizedH1: string
  h1Promise: ExtractedPromise
  topic: string
  primaryKeyword: string
  articleType: string
  variation: 'statement' | 'question' | 'listicle'
  h2Count: number
  existingH2s?: string[]  // For regeneration attempts
  affiliateProducts?: Array<{ name: string; badge: string }>
  provider?: AIProvider
  /** Core keywords extracted from primaryKeyword for natural H2 integration */
  coreKeywords?: string[]
  costTracking?: CostTrackingContext
}

export interface GenerateH2sFromH1Result {
  h2s: string[]
  closingH2: string
  validation: PromiseFulfillmentValidation
  attempts: number
  error?: string
}

/**
 * Split merged H2s that the AI concatenated into single strings.
 * Detects patterns like: `"First H2 Question?","Second H2 Question?"` in one array element.
 * Also handles H2s over 60 chars that likely contain multiple headings.
 */
function splitMergedH2s(h2s: string[], expectedCount: number): string[] {
  const result: string[] = []

  for (const h2 of h2s) {
    // Pattern 1: Contains `","` or `", "` — AI literally merged JSON-like entries
    if (h2.includes('","') || h2.includes('", "')) {
      const parts = h2.split(/"\s*,\s*"/).map(s => s.replace(/^["']|["']$/g, '').trim()).filter(Boolean)
      if (parts.length > 1) {
        result.push(...parts)
        continue
      }
    }

    // Pattern 2: Contains `?` followed by a capital letter (merged questions)
    // e.g. "How Do Flowers Grow?Why Are Some Flowers Red?"
    if ((h2.match(/\?/g) || []).length > 1) {
      const parts = h2.split(/\?(?=[A-Z])/).map(s => s.trim() + '?').filter(s => s.length > 5)
      if (parts.length > 1) {
        result.push(...parts)
        continue
      }
    }

    // Pattern 3: Over 70 chars and contains a comma followed by a capital letter
    // (likely two statements merged)
    if (h2.length > 70 && /,\s*[A-Z]/.test(h2)) {
      const splitIndex = h2.search(/,\s*[A-Z]/)
      const part1 = h2.substring(0, splitIndex).trim()
      const part2 = h2.substring(splitIndex + 1).trim()
      if (part1.length >= 30 && part2.length >= 30) {
        result.push(part1, part2)
        continue
      }
    }

    result.push(h2)
  }

  // If we got more than expected, trim to expectedCount
  if (result.length > expectedCount) {
    return result.slice(0, expectedCount)
  }

  return result
}

/**
 * Generate H2s that fulfill the promise made by the H1
 *
 * This function:
 * 1. Builds a prompt that explicitly references the H1 and its promise
 * 2. Validates generated H2s against promise fulfillment rules
 * 3. Re-prompts up to 3 times if H2s don't fulfill the promise
 */
export async function generateH2sFromH1(
  params: GenerateH2sFromH1Params
): Promise<GenerateH2sFromH1Result> {
  const {
    normalizedH1,
    h1Promise,
    topic,
    primaryKeyword,
    articleType,
    variation,
    h2Count,
    existingH2s = [],
    affiliateProducts,
    provider,
    coreKeywords,
  } = params

  const maxAttempts = 3
  let bestResult: GenerateH2sFromH1Result | null = null
  let bestScore = 0
  let previousH2s: string[] = []
  let previousIssues: string[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[generateH2sFromH1] Attempt ${attempt}/${maxAttempts}`)
      if (coreKeywords && coreKeywords.length > 0) {
        console.log(`[generateH2sFromH1] Using core keywords: ${coreKeywords.join(', ')}`)
      }

      // Build promise-aware H2 prompt
      const prompt = buildH2FromH1Prompt({
        normalizedH1,
        h1Promise,
        topic,
        primaryKeyword,
        articleType,
        variation,
        h2Count,
        previousH2s: attempt > 1 ? previousH2s : undefined,
        previousIssues: attempt > 1 ? previousIssues : undefined,
        affiliateProducts,
        coreKeywords,
      })

      const { result } = await executeWithFallback(
        async (model) => {
          return generateObject({
            model,
            // Relaxed schema for AI generation (matching StructureOutputSchemaRelaxed pattern)
            // Exact CHARACTER_LIMITS (50-60) enforced by validateH2s and content corrector
            schema: z.object({
              h2s: z.array(z.string().min(10).max(80)),
              closingH2: z.string().min(10).max(80),
            }),
            system: STRUCTURE_SYSTEM_PROMPT,
            prompt,
            temperature: 0.7,
          })
        },
        { preferredProvider: provider, tier: 'fast', operationName: 'generateH2sFromH1', costTracking: params.costTracking }
      )

      // Post-process: strip markdown heading syntax (AI sometimes includes ## in H2 text)
      const rawH2s = result.object.h2s.map(h2 => h2.replace(/#{1,6}\s*/g, '').trim())
      const closingH2 = result.object.closingH2.replace(/#{1,6}\s*/g, '').trim()

      // Post-process: split merged H2s (AI sometimes concatenates multiple H2s into one string)
      const h2s = splitMergedH2s(rawH2s, h2Count)
      if (h2s.length !== rawH2s.length) {
        console.log(`[generateH2sFromH1] Split merged H2s: ${rawH2s.length} → ${h2s.length} items`)
      }

      // Validate H2s fulfill the H1 promise
      // Pass affiliateProducts for special affiliate article handling
      // Pass coreKeywords for keyword density validation
      const validation = validatePromiseFulfillment(
        h1Promise,
        h2s,
        articleType as any,
        variation,
        affiliateProducts,
        coreKeywords
      )

      // Check H2 count matches expected
      if (h2s.length < h2Count) {
        validation.issues.push(`Expected ${h2Count} H2s but got ${h2s.length}`)
        validation.score = Math.max(0, validation.score - 25)
        validation.fulfilled = false
      }

      console.log(`[generateH2sFromH1] Generated ${h2s.length}/${h2Count} H2s, validation score: ${validation.score}/100`)

      if (validation.issues.length > 0) {
        console.log(`[generateH2sFromH1] Issues: ${validation.issues.join(', ')}`)
      }

      // Track best result
      if (validation.score > bestScore) {
        bestScore = validation.score
        bestResult = {
          h2s,
          closingH2,
          validation,
          attempts: attempt,
        }
      }

      // If validation passes, return immediately
      if (validation.fulfilled || validation.score >= 85) {
        console.log(`[generateH2sFromH1] ✅ H2s validated successfully (score: ${validation.score})`)
        return {
          h2s,
          closingH2,
          validation,
          attempts: attempt,
        }
      }

      // Store for next attempt's feedback
      previousH2s = h2s
      previousIssues = validation.issues

      if (attempt < maxAttempts) {
        console.log(`[generateH2sFromH1] ⚠️ Validation failed (score: ${validation.score}), retrying...`)
        await sleep(getRetryDelay(attempt))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'H2 generation failed'
      console.log(`[generateH2sFromH1] ❌ Attempt ${attempt} failed: ${errorMsg}`)

      if (attempt === maxAttempts && !bestResult) {
        return {
          h2s: [],
          closingH2: '',
          validation: {
            fulfilled: false,
            score: 0,
            issues: [errorMsg],
            suggestions: [],
          },
          attempts: attempt,
          error: errorMsg,
        }
      }
    }
  }

  // Return best result if all attempts failed validation
  if (bestResult) {
    console.log(`[generateH2sFromH1] ⚠️ Using best attempt (score: ${bestScore}) after ${maxAttempts} attempts`)
    return bestResult
  }

  // Should not reach here, but handle gracefully
  return {
    h2s: [],
    closingH2: '',
    validation: {
      fulfilled: false,
      score: 0,
      issues: ['All generation attempts failed'],
      suggestions: [],
    },
    attempts: maxAttempts,
    error: 'All generation attempts failed',
  }
}
