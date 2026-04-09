/**
 * Keyword Extractor
 * 
 * Extracts core keywords from user-provided phrases to enable natural
 * keyword integration in H2 headings without awkward stuffing.
 * 
 * Problem Solved:
 * - Phrases like "funny aspects of wwe" forced into H2s create broken grammar
 * - Example: "2. Funny Aspects of WWE Botches Mishaps" (grammatically broken)
 * 
 * Solution:
 * - Extract core keywords: "funny aspects of wwe" → ["WWE", "funny"]
 * - Use core keywords for density validation
 * - Keep full phrase for topic context
 * 
 * @example
 * extractCoreKeywords("funny aspects of wwe") // ["WWE", "funny"]
 * extractCoreKeywords("best wireless headphones under $200") // ["wireless headphones"]
 * extractCoreKeywords("how to make italian tacos") // ["italian tacos"]
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback, type AIProvider } from '../providers'
import type { CostTrackingContext } from '@/lib/services/cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of keyword extraction
 */
export interface KeywordExtractionResult {
  /** Original phrase provided by user */
  originalPhrase: string
  /** Extracted core keywords (1-3 keywords) */
  coreKeywords: string[]
  /** Whether extraction used AI or heuristics */
  method: 'heuristic' | 'ai'
  /** Confidence score (0-1) */
  confidence: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILLER WORDS TO REMOVE (Heuristic Extraction)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common filler words that don't add meaning to H2 headings
 * These are removed during heuristic extraction
 */
const FILLER_WORDS = new Set([
  // Article structure fillers
  'aspects', 'ways', 'guide', 'tips', 'best', 'top', 'ultimate', 'complete',
  'comprehensive', 'definitive', 'essential', 'important', 'key', 'main',
  'reasons', 'things', 'facts', 'ideas', 'methods', 'techniques', 'strategies',
  'secrets', 'steps', 'tricks', 'hacks', 'benefits', 'advantages',

  // Question starters (often redundant in H2s)
  'how', 'what', 'why', 'when', 'where', 'which', 'who',

  // Prepositions and articles
  'to', 'of', 'the', 'a', 'an', 'for', 'in', 'on', 'with', 'about',
  'from', 'by', 'at', 'into', 'through', 'during', 'before', 'after',

  // Common verbs (often redundant)
  'make', 'get', 'do', 'use', 'find', 'know', 'need', 'want', 'try',
  'learn', 'understand', 'improve', 'boost', 'increase', 'maximize',

  // Intensifiers
  'very', 'really', 'most', 'more', 'much', 'so', 'too', 'just',

  // Misc
  'your', 'you', 'that', 'this', 'these', 'those', 'every', 'all', 'any',
])

/**
 * Proper nouns and brand names should be preserved
 * These are detected by capitalization patterns or known brands
 */
const KNOWN_BRANDS = new Set([
  'wwe', 'nfl', 'nba', 'mlb', 'nhl', 'ufc', 'fifa', 'espn',
  'google', 'apple', 'amazon', 'microsoft', 'meta', 'facebook', 'instagram',
  'twitter', 'youtube', 'tiktok', 'netflix', 'spotify', 'disney',
  'nike', 'adidas', 'sony', 'samsung', 'lg', 'bose', 'jbl',
  'iphone', 'ipad', 'macbook', 'airpods', 'playstation', 'xbox', 'nintendo',
  'tesla', 'bmw', 'mercedes', 'toyota', 'honda', 'ford',
  'chatgpt', 'openai', 'anthropic', 'gemini', 'claude',
])

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract core keywords from a user-provided phrase
 * 
 * Uses a two-tier approach:
 * 1. Heuristic extraction (fast, no API call) - tries first
 * 2. AI extraction (slower, more accurate) - fallback for complex phrases
 * 
 * @param phrase - The user's input phrase (e.g., "funny aspects of wwe")
 * @param options - Optional configuration
 * @returns Extraction result with core keywords
 * 
 * @example
 * // Simple phrase - heuristic works
 * await extractCoreKeywords("funny aspects of wwe")
 * // → { coreKeywords: ["WWE", "funny"], method: "heuristic" }
 * 
 * // Complex phrase - may need AI
 * await extractCoreKeywords("comprehensive guide to mastering React hooks")
 * // → { coreKeywords: ["React hooks"], method: "heuristic" }
 */
export async function extractCoreKeywords(
  phrase: string,
  options?: {
    /** Force AI extraction even if heuristic works */
    forceAI?: boolean
    /** AI provider to use */
    provider?: AIProvider
    /** Skip AI fallback entirely */
    heuristicOnly?: boolean
    /** Cost tracking context */
    costTracking?: CostTrackingContext
  }
): Promise<KeywordExtractionResult> {
  const { forceAI = false, provider, heuristicOnly = false, costTracking } = options || {}

  const trimmedPhrase = phrase.trim()

  // Short phrases (1-2 words) - use as-is
  const wordCount = trimmedPhrase.split(/\s+/).length
  if (wordCount <= 2) {
    return {
      originalPhrase: trimmedPhrase,
      coreKeywords: [trimmedPhrase],
      method: 'heuristic',
      confidence: 1.0,
    }
  }

  // Try heuristic extraction first (unless forceAI)
  if (!forceAI) {
    const heuristicResult = extractKeywordsHeuristic(trimmedPhrase)

    // If heuristic produced good results, use them
    if (heuristicResult.coreKeywords.length > 0 && heuristicResult.confidence >= 0.7) {
      return heuristicResult
    }

    // If heuristic-only mode, return even low-confidence results
    if (heuristicOnly) {
      return heuristicResult.coreKeywords.length > 0
        ? heuristicResult
        : { ...heuristicResult, coreKeywords: [trimmedPhrase] }
    }
  }

  // Fallback to AI extraction for complex phrases
  try {
    const aiResult = await extractKeywordsAI(trimmedPhrase, provider, costTracking)
    return aiResult
  } catch (error) {
    console.warn(`[KeywordExtractor] AI extraction failed, falling back to heuristic:`, error)
    // Final fallback to heuristic
    const fallback = extractKeywordsHeuristic(trimmedPhrase)
    return fallback.coreKeywords.length > 0
      ? fallback
      : { ...fallback, coreKeywords: [trimmedPhrase] }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEURISTIC EXTRACTION (No API Call)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract keywords using heuristic rules (fast, no API call)
 * 
 * Algorithm:
 * 1. Tokenize phrase into words
 * 2. Identify and preserve proper nouns/brands
 * 3. Remove filler words
 * 4. Identify descriptive adjectives worth keeping
 * 5. Combine remaining meaningful words into 1-3 keywords
 */
export function extractKeywordsHeuristic(phrase: string): KeywordExtractionResult {
  const words = phrase.toLowerCase().split(/\s+/)
  const meaningfulWords: string[] = []
  const preservedProperNouns: string[] = []

  // First pass: identify proper nouns and brands
  const originalWords = phrase.split(/\s+/)
  for (let i = 0; i < originalWords.length; i++) {
    const word = originalWords[i]
    const lowerWord = word.toLowerCase()

    // Check if it's a known brand
    if (KNOWN_BRANDS.has(lowerWord)) {
      preservedProperNouns.push(word.toUpperCase() === lowerWord.toUpperCase()
        ? word.toUpperCase()
        : capitalizeProperNoun(lowerWord))
      continue
    }

    // Check if it looks like a proper noun (capitalized in middle of sentence)
    if (i > 0 && /^[A-Z]/.test(word) && word.length > 2) {
      preservedProperNouns.push(word)
      continue
    }

    // Check if not a filler word
    if (!FILLER_WORDS.has(lowerWord) && lowerWord.length > 2) {
      meaningfulWords.push(lowerWord)
    }
  }

  // Combine proper nouns and meaningful words
  const allKeywords = [...preservedProperNouns]

  // Add meaningful words (adjectives, nouns)
  for (const word of meaningfulWords) {
    // Skip if already captured as proper noun
    if (!allKeywords.some(k => k.toLowerCase() === word)) {
      allKeywords.push(word)
    }
  }

  // Limit to 3 keywords max
  const coreKeywords = allKeywords.slice(0, 3)

  // Calculate confidence based on how much we preserved
  const originalMeaningfulCount = words.filter(w => !FILLER_WORDS.has(w) && w.length > 2).length
  const confidence = originalMeaningfulCount > 0
    ? Math.min(coreKeywords.length / originalMeaningfulCount, 1.0)
    : 0.5

  return {
    originalPhrase: phrase,
    coreKeywords,
    method: 'heuristic',
    confidence: Math.max(confidence, 0.5), // Minimum 0.5 confidence
  }
}

/**
 * Capitalize a proper noun correctly
 */
function capitalizeProperNoun(word: string): string {
  // All-caps for acronyms
  if (word.length <= 4) {
    return word.toUpperCase()
  }
  // Title case for regular words
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI EXTRACTION (Fallback for Complex Phrases)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract keywords using AI (for complex phrases)
 */
async function extractKeywordsAI(
  phrase: string,
  provider?: AIProvider,
  costTracking?: CostTrackingContext
): Promise<KeywordExtractionResult> {
  const prompt = buildKeywordExtractionPrompt(phrase)

  // Define Zod schema for the AI response
  const KeywordExtractionSchema = z.object({
    coreKeywords: z.array(z.string()).min(1).max(3).describe(
      'Core keywords that should naturally appear in article H2 headings'
    ),
    reasoning: z.string().describe(
      'Brief explanation of why these keywords were chosen'
    ),
  })

  console.log(`[extractKeywordsAI] Extracting keywords from: "${phrase}"`)

  const { result, provider: usedProvider } = await executeWithFallback(
    async (model) => {
      return generateObject({
        model,
        schema: KeywordExtractionSchema,
        prompt,
        temperature: 0.3, // Low temperature for consistent extraction
        maxRetries: 1,
      })
    },
    {
      preferredProvider: provider,
      tier: 'fast', // Use fast models for quick keyword extraction
      operationName: 'extractKeywords',
      maxRetries: 2,
      retryDelayMs: 500,
      costTracking,
    }
  )

  const extractedKeywords = result.object

  if (!extractedKeywords.coreKeywords || extractedKeywords.coreKeywords.length === 0) {
    throw new Error('AI returned empty keywords')
  }

  console.log(`[extractKeywordsAI] ✅ Extracted: [${extractedKeywords.coreKeywords.join(', ')}] using ${usedProvider}`)
  if (extractedKeywords.reasoning) {
    console.log(`[extractKeywordsAI] Reasoning: ${extractedKeywords.reasoning}`)
  }

  return {
    originalPhrase: phrase,
    coreKeywords: extractedKeywords.coreKeywords,
    method: 'ai',
    confidence: 0.9, // AI extraction is high confidence
  }
}

/**
 * Build the prompt for AI keyword extraction
 */
function buildKeywordExtractionPrompt(phrase: string): string {
  return `Extract 1-3 core keywords from this phrase that should naturally appear in article H2 headings.

PHRASE: "${phrase}"

RULES:
1. Extract the ESSENTIAL words that convey the topic's meaning
2. Remove filler words like "aspects", "ways", "guide", "tips", "best", "how to", etc.
3. Preserve proper nouns and brand names (WWE, iPhone, Nike, etc.)
4. Keep descriptive adjectives only if they're essential (e.g., "funny" in "funny WWE moments")
5. Return 1-3 keywords that can be naturally embedded in H2 titles

EXAMPLES:
- "funny aspects of wwe" → ["WWE", "funny"]
- "best wireless headphones under $200" → ["wireless headphones"]
- "how to make italian tacos" → ["italian tacos"]
- "complete guide to meditation for beginners" → ["meditation", "beginners"]
- "reasons why the iphone 15 is worth buying" → ["iPhone 15"]

The keywords should be words/phrases that:
- Make sense when used in an H2 like "The Funniest WWE Moments"
- Don't sound forced or create awkward grammar
- Capture the core topic the reader cares about

Return JSON: { "coreKeywords": ["keyword1", "keyword2"], "reasoning": "brief explanation" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if any of the core keywords appear in a heading
 * Used for keyword density validation
 * 
 * @param heading - The H2 heading text
 * @param coreKeywords - Array of core keywords to check
 * @returns Whether at least one keyword appears
 */
export function headingContainsKeyword(heading: string, coreKeywords: string[]): boolean {
  const lowerHeading = heading.toLowerCase()
  return coreKeywords.some(keyword =>
    lowerHeading.includes(keyword.toLowerCase())
  )
}

/**
 * Count how many headings contain at least one core keyword
 * 
 * @param headings - Array of H2 headings
 * @param coreKeywords - Array of core keywords
 * @returns Count of headings containing keywords
 */
export function countKeywordHeadings(headings: string[], coreKeywords: string[]): number {
  return headings.filter(h => headingContainsKeyword(h, coreKeywords)).length
}

/**
 * Calculate keyword density as a percentage
 * 
 * @param headings - Array of H2 headings
 * @param coreKeywords - Array of core keywords
 * @returns Percentage (0-100) of headings containing keywords
 */
export function calculateKeywordDensity(headings: string[], coreKeywords: string[]): number {
  if (headings.length === 0) return 0
  const count = countKeywordHeadings(headings, coreKeywords)
  return Math.round((count / headings.length) * 100)
}

/**
 * Validate keyword density for H2 headings
 * 
 * @param headings - Array of H2 headings
 * @param coreKeywords - Array of core keywords
 * @param minDensity - Minimum percentage (default 30%)
 * @param maxDensity - Maximum percentage (default 70%)
 * @returns Validation result
 */
export function validateKeywordDensity(
  headings: string[],
  coreKeywords: string[],
  minDensity: number = 30,
  maxDensity: number = 70
): { valid: boolean; density: number; message: string } {
  const density = calculateKeywordDensity(headings, coreKeywords)

  if (density < minDensity) {
    return {
      valid: false,
      density,
      message: `Keyword density too low (${density}%). Include keywords in at least ${minDensity}% of H2s.`
    }
  }

  if (density > maxDensity) {
    return {
      valid: false,
      density,
      message: `Keyword density too high (${density}%). Reduce keyword usage to under ${maxDensity}% for natural flow.`
    }
  }

  return {
    valid: true,
    density,
    message: `Keyword density (${density}%) is within acceptable range.`
  }
}
