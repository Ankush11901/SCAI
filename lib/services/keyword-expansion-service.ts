/**
 * Enhanced Article Generation Service
 * 
 * Combines keyword expansion with structure generation for improved SEO.
 * This service orchestrates the full article planning workflow:
 * 
 * 1. Keyword Expansion - Generate semantically related keywords
 * 2. Structure Generation - Create H1, H2s, FAQ with keyword optimization
 * 3. Content Planning - Plan content sections with keyword density tracking
 */

import {
  generateKeywordCluster,
  deduplicateKeywords,
  sortKeywordsByRelevance,
  categorizeKeywords,
  generateLocalKeywordVariations,
  parseLocalKeyword,
  type GenerateKeywordsParams,
  type GenerateKeywordsResult,
} from '@/lib/ai/generate-keywords'
import type { ArticleTypeId } from '@/lib/ai/prompts/keyword-prompts'
import type { AIProvider, ModelTier } from '@/lib/ai/providers'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface KeywordExpansionOptions {
  seedKeyword: string
  articleType: ArticleTypeId
  language?: string
  location?: string  // For local articles
  provider?: AIProvider
  modelTier?: ModelTier
}

export interface ExpandedKeywordSet {
  primary: string
  expanded: string[]
  categorized: {
    transactional: string[]
    informational: string[]
    navigational: string[]
    commercial: string[]
  }
  localVariations?: string[]  // Only for local articles
  generationInfo: {
    provider: AIProvider
    model: string
    duration: number
  }
}

export interface KeywordDensityTarget {
  keyword: string
  targetLocations: ('h1' | 'h2' | 'intro' | 'body' | 'faq' | 'meta')[]
  minOccurrences: number
  maxOccurrences: number
}

export interface ContentPlanWithKeywords {
  keywords: ExpandedKeywordSet
  densityTargets: KeywordDensityTarget[]
  h1Suggestions: string[]
  h2Suggestions: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD EXPANSION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expand a seed keyword into a comprehensive keyword set for article generation.
 * 
 * @example
 * ```typescript
 * const keywords = await expandKeywordsForArticle({
 *   seedKeyword: 'wireless headphones',
 *   articleType: 'affiliate',
 * })
 * 
 * // Use expanded keywords in content planning
 * console.log(keywords.primary)  // 'wireless headphones'
 * console.log(keywords.expanded) // ['best wireless headphones', 'wireless headphones review', ...]
 * ```
 */
export async function expandKeywordsForArticle(
  options: KeywordExpansionOptions
): Promise<ExpandedKeywordSet | null> {
  const {
    seedKeyword,
    articleType,
    language = 'en-US',
    location,
    provider = 'openai',
    modelTier = 'default',
  } = options

  // Generate keywords via AI
  const result = await generateKeywordCluster({
    seedKeyword,
    articleType,
    language,
    location,
    provider,
    modelTier,
  })

  if (!result.success || !result.keywords) {
    console.error('[KeywordExpansion] Failed:', result.error)
    return null
  }

  // Process and organize keywords
  const deduplicated = deduplicateKeywords(result.keywords)
  const sorted = sortKeywordsByRelevance(deduplicated, seedKeyword)
  const categorized = categorizeKeywords(sorted)

  // For local articles, generate additional location-qualified variations
  let localVariations: string[] | undefined
  if (articleType === 'local' && location) {
    // Parse the keyword to extract service component
    const { service } = parseLocalKeyword(seedKeyword)
    localVariations = generateLocalKeywordVariations(service || seedKeyword, location)
  }

  return {
    primary: seedKeyword,
    expanded: sorted,
    categorized,
    localVariations,
    generationInfo: {
      provider: result.provider,
      model: result.model,
      duration: result.duration,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD DENSITY PLANNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create keyword density targets for an article.
 * 
 * Reference spec targets:
 * - Primary keyword: H1 (1x), 60-70% of H2s, intro, meta title, meta description
 * - Secondary keywords: Distributed across body content, FAQ
 * - Long-tail keywords: Body content, image alts
 */
export function createKeywordDensityTargets(
  keywords: ExpandedKeywordSet,
  articleType: ArticleTypeId
): KeywordDensityTarget[] {
  const targets: KeywordDensityTarget[] = []

  // Primary keyword - highest priority
  targets.push({
    keyword: keywords.primary,
    targetLocations: ['h1', 'h2', 'intro', 'meta'],
    minOccurrences: 5,
    maxOccurrences: 15,
  })

  // Top 3-5 expanded keywords - medium priority
  const topExpanded = keywords.expanded.slice(0, 5)
  for (const keyword of topExpanded) {
    targets.push({
      keyword,
      targetLocations: ['h2', 'body', 'faq'],
      minOccurrences: 2,
      maxOccurrences: 5,
    })
  }

  // Transactional keywords for commercial article types
  if (['affiliate', 'commercial', 'review'].includes(articleType)) {
    for (const keyword of keywords.categorized.transactional.slice(0, 3)) {
      targets.push({
        keyword,
        targetLocations: ['body'],
        minOccurrences: 1,
        maxOccurrences: 3,
      })
    }
  }

  // Informational keywords
  for (const keyword of keywords.categorized.informational.slice(0, 3)) {
    targets.push({
      keyword,
      targetLocations: ['body', 'faq'],
      minOccurrences: 1,
      maxOccurrences: 3,
    })
  }

  // Location keywords for local articles
  if (articleType === 'local' && keywords.localVariations) {
    for (const keyword of keywords.localVariations.slice(0, 5)) {
      targets.push({
        keyword,
        targetLocations: ['h2', 'body'],
        minOccurrences: 1,
        maxOccurrences: 3,
      })
    }
  }

  return targets
}

// ═══════════════════════════════════════════════════════════════════════════════
// H1/H2 SUGGESTIONS WITH KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate H1 title suggestions incorporating expanded keywords.
 * These can be used to seed the AI structure generator.
 */
export function generateH1Suggestions(
  keywords: ExpandedKeywordSet,
  articleType: ArticleTypeId,
  variation: 'question' | 'statement' | 'listicle'
): string[] {
  const { primary, expanded, categorized } = keywords
  const suggestions: string[] = []

  // Get a relevant secondary keyword
  const secondary = expanded[0] || primary

  switch (articleType) {
    case 'affiliate':
      if (variation === 'question') {
        suggestions.push(`What Are the Best ${primary} to Buy?`)
        suggestions.push(`Which ${primary} Should You Choose?`)
      } else if (variation === 'listicle') {
        suggestions.push(`7 Best ${primary} Worth Buying`)
        suggestions.push(`5 Top ${primary} for Your Money`)
      } else {
        suggestions.push(`Best ${primary} Worth Your Money`)
        suggestions.push(`Top ${primary} Buyers Guide`)
      }
      break

    case 'review':
      if (variation === 'question') {
        suggestions.push(`Is ${primary} Worth the Investment?`)
        suggestions.push(`Does ${primary} Live Up to the Hype?`)
      } else if (variation === 'listicle') {
        suggestions.push(`5 Things to Know About ${primary}`)
      } else {
        suggestions.push(`${primary} Honest Review`)
        suggestions.push(`${primary} Deep Dive Review`)
      }
      break

    case 'how-to':
      if (variation === 'question') {
        suggestions.push(`How Do You ${primary} Effectively?`)
        suggestions.push(`What Is the Best Way to ${primary}?`)
      } else if (variation === 'listicle') {
        suggestions.push(`7 Steps to Master ${primary}`)
      } else {
        suggestions.push(`Step by Step Guide to ${primary}`)
        suggestions.push(`Complete Guide to ${primary}`)
      }
      break

    case 'local':
      const location = keywords.localVariations?.[0]?.split(' in ')[1] || 'Your Area'
      if (variation === 'question') {
        suggestions.push(`Where to Find ${primary} in ${location}?`)
      } else if (variation === 'listicle') {
        suggestions.push(`5 Best ${primary} in ${location}`)
      } else {
        suggestions.push(`${primary} in ${location} Guide`)
      }
      break

    default:
      if (variation === 'question') {
        suggestions.push(`What You Need to Know About ${primary}`)
      } else if (variation === 'listicle') {
        suggestions.push(`7 Essential Facts About ${primary}`)
      } else {
        suggestions.push(`Everything About ${primary}`)
      }
  }

  // Truncate to 60 chars max
  return suggestions.map(s => s.length > 60 ? s.substring(0, 57) + '...' : s)
}

/**
 * Generate H2 heading suggestions incorporating expanded keywords.
 */
export function generateH2Suggestions(
  keywords: ExpandedKeywordSet,
  articleType: ArticleTypeId,
  variation: 'question' | 'statement' | 'listicle',
  count: number = 5
): string[] {
  const { primary, expanded, categorized } = keywords
  const suggestions: string[] = []

  // Use commercial/transactional keywords for commercial articles
  const relevantKeywords = ['affiliate', 'commercial', 'review'].includes(articleType)
    ? [...categorized.commercial, ...categorized.transactional].slice(0, count)
    : [...categorized.informational, ...expanded].slice(0, count)

  for (let i = 0; i < Math.min(count, relevantKeywords.length); i++) {
    const kw = relevantKeywords[i] || primary

    if (variation === 'question') {
      suggestions.push(`What Makes ${kw} Stand Out?`)
    } else if (variation === 'listicle') {
      suggestions.push(`${i + 1}. ${kw}`)
    } else {
      suggestions.push(`Understanding ${kw}`)
    }
  }

  // Truncate to 60 chars max
  return suggestions.map(s => s.length > 60 ? s.substring(0, 57) + '...' : s)
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL CONTENT PLANNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a full content plan with keyword expansion.
 * 
 * This combines keyword expansion, density targets, and heading suggestions
 * into a comprehensive plan for article generation.
 */
export async function createContentPlanWithKeywords(
  options: KeywordExpansionOptions & {
    variation: 'question' | 'statement' | 'listicle'
    h2Count?: number
  }
): Promise<ContentPlanWithKeywords | null> {
  const { variation, h2Count = 5, ...keywordOptions } = options

  // Step 1: Expand keywords
  const keywords = await expandKeywordsForArticle(keywordOptions)
  if (!keywords) {
    return null
  }

  // Step 2: Create density targets
  const densityTargets = createKeywordDensityTargets(keywords, keywordOptions.articleType)

  // Step 3: Generate heading suggestions
  const h1Suggestions = generateH1Suggestions(keywords, keywordOptions.articleType, variation)
  const h2Suggestions = generateH2Suggestions(keywords, keywordOptions.articleType, variation, h2Count)

  return {
    keywords,
    densityTargets,
    h1Suggestions,
    h2Suggestions,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD TRACKING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count keyword occurrences in text (case-insensitive)
 */
export function countKeywordOccurrences(text: string, keyword: string): number {
  const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi')
  const matches = text.match(regex)
  return matches ? matches.length : 0
}

/**
 * Calculate keyword density percentage
 */
export function calculateKeywordDensity(text: string, keyword: string): number {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  if (wordCount === 0) return 0

  const occurrences = countKeywordOccurrences(text, keyword)
  return (occurrences / wordCount) * 100
}

/**
 * Check if keyword density is within acceptable range (0.5% - 2.5%)
 */
export function isKeywordDensityOptimal(density: number): boolean {
  return density >= 0.5 && density <= 2.5
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
