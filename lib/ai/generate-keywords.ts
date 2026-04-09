/**
 * Keyword Expansion Generator
 * 
 * Generates semantically related keywords for a given seed keyword
 * based on article type using AI.
 * 
 * Uses Vercel AI SDK's generateObject() for structured output.
 */

import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { getModelWithFallback, type AIProvider, type ModelTier } from './providers'
import { KeywordArraySchema, type KeywordArray } from './schemas/keywords'
import {
  buildKeywordExpansionPrompt,
  getKeywordExpansionSystemPrompt,
  type ArticleTypeId,
  type KeywordPromptParams,
} from './prompts/keyword-prompts'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateKeywordsParams {
  seedKeyword: string
  articleType: ArticleTypeId
  language?: string
  location?: string  // For local article type
  provider?: AIProvider
  modelTier?: ModelTier
}

export interface GenerateKeywordsResult {
  success: boolean
  keywords?: string[]
  error?: string
  provider: AIProvider
  model: string
  duration: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate expanded keywords for a seed keyword based on article type.
 * 
 * @param params - Generation parameters including seed keyword and article type
 * @returns Promise with generated keywords or error
 * 
 * @example
 * ```typescript
 * const result = await generateKeywordCluster({
 *   seedKeyword: 'wireless headphones',
 *   articleType: 'affiliate',
 * })
 * 
 * if (result.success) {
 *   console.log(result.keywords)
 *   // ['best wireless headphones', 'wireless headphones review', ...]
 * }
 * ```
 */
export async function generateKeywordCluster(
  params: GenerateKeywordsParams
): Promise<GenerateKeywordsResult> {
  const {
    seedKeyword,
    articleType,
    language = 'en-US',
    location,
    provider = 'openai',
    modelTier = 'default',
  } = params

  const startTime = Date.now()

  try {
    // Get model with fallback
    const { model, provider: usedProvider, modelId } = await getModelWithFallback(
      provider,
      modelTier
    )

    // Build prompt
    const promptParams: KeywordPromptParams = {
      seedKeyword,
      articleType,
      language,
      location,
    }
    const userPrompt = buildKeywordExpansionPrompt(promptParams)
    const systemPrompt = getKeywordExpansionSystemPrompt()

    // Try structured generation first
    try {
      const result = await generateObject({
        model,
        schema: z.object({ keywords: KeywordArraySchema }),
        system: systemPrompt,
        prompt: userPrompt,
      })

      const duration = Date.now() - startTime

      return {
        success: true,
        keywords: result.object.keywords,
        provider: usedProvider,
        model: modelId,
        duration,
      }
    } catch {
      // Fallback to text generation and parse JSON
      const textResult = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
      })

      // Parse JSON array from text
      const keywords = parseKeywordsFromText(textResult.text)
      const duration = Date.now() - startTime

      // Validate with schema
      const validated = KeywordArraySchema.safeParse(keywords)
      if (!validated.success) {
        return {
          success: false,
          error: `Invalid keyword format: ${validated.error.message}`,
          provider: usedProvider,
          model: modelId,
          duration,
        }
      }

      return {
        success: true,
        keywords: validated.data,
        provider: usedProvider,
        model: modelId,
        duration,
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider,
      model: 'unknown',
      duration,
    }
  }
}

/**
 * Parse keywords from text response (handles various formats)
 */
function parseKeywordsFromText(text: string): string[] {
  // Try to extract JSON array from text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed.filter(k => typeof k === 'string')
      }
    } catch {
      // Continue to line-by-line parsing
    }
  }

  // Fallback: parse line by line
  const lines = text.split('\n')
  const keywords: string[] = []

  for (const line of lines) {
    // Clean up common formats
    let keyword = line
      .replace(/^[-*•\d.)\]]+\s*/, '')  // Remove list markers
      .replace(/^["']|["']$/g, '')       // Remove quotes
      .replace(/,$/g, '')                 // Remove trailing comma
      .trim()

    if (keyword.length >= 2 && keyword.length <= 100) {
      keywords.push(keyword)
    }
  }

  return keywords
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deduplicate keywords while preserving order
 */
export function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  return keywords.filter(keyword => {
    const normalized = keyword.toLowerCase().trim()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

/**
 * Filter keywords by minimum/maximum word count
 */
export function filterKeywordsByWordCount(
  keywords: string[],
  minWords = 1,
  maxWords = 10
): string[] {
  return keywords.filter(keyword => {
    const wordCount = keyword.split(/\s+/).length
    return wordCount >= minWords && wordCount <= maxWords
  })
}

/**
 * Sort keywords by relevance (contains seed keyword first, then by length)
 */
export function sortKeywordsByRelevance(
  keywords: string[],
  seedKeyword: string
): string[] {
  const seedLower = seedKeyword.toLowerCase()

  return [...keywords].sort((a, b) => {
    const aContainsSeed = a.toLowerCase().includes(seedLower)
    const bContainsSeed = b.toLowerCase().includes(seedLower)

    // Keywords containing seed come first
    if (aContainsSeed && !bContainsSeed) return -1
    if (!aContainsSeed && bContainsSeed) return 1

    // Then sort by length (shorter = more focused)
    return a.length - b.length
  })
}

/**
 * Categorize keywords by search intent
 */
export function categorizeKeywords(keywords: string[]): {
  transactional: string[]
  informational: string[]
  navigational: string[]
  commercial: string[]
} {
  const transactional: string[] = []
  const informational: string[] = []
  const navigational: string[] = []
  const commercial: string[] = []

  const transactionalPatterns = /\b(buy|purchase|order|deal|discount|coupon|sale|price|cost|cheap|affordable)\b/i
  const informationalPatterns = /\b(how|what|why|when|where|who|guide|tutorial|learn|tips|facts|explain)\b/i
  const navigationalPatterns = /\b(near me|in \w+|address|location|hours|phone|contact)\b/i
  const commercialPatterns = /\b(best|top|review|compare|vs|versus|rating|recommended)\b/i

  for (const keyword of keywords) {
    if (transactionalPatterns.test(keyword)) {
      transactional.push(keyword)
    } else if (informationalPatterns.test(keyword)) {
      informational.push(keyword)
    } else if (navigationalPatterns.test(keyword)) {
      navigational.push(keyword)
    } else if (commercialPatterns.test(keyword)) {
      commercial.push(keyword)
    } else {
      // Default to informational
      informational.push(keyword)
    }
  }

  return { transactional, informational, navigational, commercial }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL ARTICLE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate location-qualified keywords for local articles
 * 
 * @param service - The service/product being offered
 * @param location - The target location (city, region, etc.)
 * @returns Array of location-qualified keywords
 */
export function generateLocalKeywordVariations(
  service: string,
  location: string
): string[] {
  const variations = [
    `${service} in ${location}`,
    `${service} ${location}`,
    `${location} ${service}`,
    `best ${service} in ${location}`,
    `${service} near me`,
    `local ${service} ${location}`,
    `${service} services ${location}`,
    `${service} company ${location}`,
    `professional ${service} ${location}`,
    `affordable ${service} ${location}`,
    `top ${service} in ${location}`,
    `${service} ${location} reviews`,
  ]

  return variations
}

/**
 * Parse a local keyword into service and location components
 * 
 * @example
 * parseLocalKeyword('plumber in Austin')
 * // { service: 'plumber', location: 'Austin' }
 */
export function parseLocalKeyword(keyword: string): {
  service: string
  location: string | null
} {
  // Common patterns for local keywords
  const patterns = [
    /^(.+?)\s+in\s+(.+)$/i,           // "service in location"
    /^(.+?)\s+near\s+(.+)$/i,         // "service near location"
    /^(.+?)\s+(?:services?\s+)?(\w+(?:\s*,\s*\w+)?)$/i,  // "service location" or "service, location"
    /^(\w+(?:\s*,\s*\w+)?)\s+(.+)$/i,  // "location service"
  ]

  for (const pattern of patterns) {
    const match = keyword.match(pattern)
    if (match) {
      return {
        service: match[1].trim(),
        location: match[2].trim(),
      }
    }
  }

  return { service: keyword, location: null }
}
