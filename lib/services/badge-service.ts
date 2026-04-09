/**
 * Badge Service - Hybrid Smart-Badging System
 *
 * Combines three strategies for dynamic badge assignment:
 * 1. Data-Driven - Based on actual product metrics (price, rating, reviews)
 * 2. AI Context-Aware - Specific badges from AI inference
 * 3. Synonym Pools - Randomized wording while maintaining affiliate psychology
 */

import type { AmazonProduct } from './amazon-product-api'

// ═══════════════════════════════════════════════════════════════════════════════
// SYNONYM POOLS - Variations for each badge archetype
// ═══════════════════════════════════════════════════════════════════════════════

const BADGE_POOLS = {
  winner: ['Top Pick', 'Best Overall', "Editor's Choice", '#1 Rated', 'Our Favorite', 'The Gold Standard'],
  value: ['Best Value', 'Budget Friendly', 'Best Bang for Buck', 'Smart Choice', 'Great Deal', 'Wallet Friendly'],
  premium: ['Premium Pick', 'Luxury Choice', 'High-End', 'Pro Grade', 'Top Tier', 'Ultimate Performance'],
  popular: ['Most Popular', 'Fan Favorite', 'Crowd Pleaser', 'Best Seller', 'Top Rated', 'Reader Favorite'],
} as const

// Generic badges that should be replaced with something more specific
const GENERIC_BADGES = new Set([
  'best overall',
  'best value',
  'premium pick',
  'top pick',
  "editor's choice",
  'budget pick',
  'most popular',
  'best for beginners',
  '#1 rated',
  'our favorite',
])

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BadgeCandidate {
  product: AmazonProduct
  aiSuggestedBadge?: string
  position: number // 0, 1, 2, etc.
}

type BadgePoolKey = keyof typeof BADGE_POOLS

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a random badge from a specific pool
 */
function getRandomFromPool(poolKey: BadgePoolKey): string {
  const pool = BADGE_POOLS[poolKey]
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Check if a badge is generic (from our predefined list)
 */
function isGenericBadge(badge: string): boolean {
  return GENERIC_BADGES.has(badge.toLowerCase().trim())
}

/**
 * Check if a badge is specific/contextual (contains use-case indicators)
 */
function isSpecificBadge(badge: string): boolean {
  if (!badge || isGenericBadge(badge)) return false

  const lowerBadge = badge.toLowerCase()

  // Check for use-case indicators
  const specificIndicators = [
    'for ', // "Best for Gaming", "Best for Pet Hair"
    'most ', // "Most Durable", "Most Quiet"
    '-est', // "Fastest", "Quietest", "Lightest"
    'with ', // "With Best Battery"
  ]

  return specificIndicators.some(indicator => lowerBadge.includes(indicator))
}

/**
 * Parse price string to number for comparison
 */
function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === 'Check price') return Infinity
  const match = priceStr.match(/[\d,]+\.?\d*/g)
  if (!match) return Infinity
  return parseFloat(match[0].replace(/,/g, ''))
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA-DRIVEN BADGE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

type DataDrivenResult = {
  badge: string
  reason: string
} | null

/**
 * Determine a data-driven badge based on product metrics compared to peers
 */
function getDataDrivenBadge(
  candidate: BadgeCandidate,
  allCandidates: BadgeCandidate[]
): DataDrivenResult {
  const { product } = candidate

  // Need at least 2 products to compare
  if (allCandidates.length < 2) return null

  const prices = allCandidates.map(c => parsePrice(c.product.price))
  const ratings = allCandidates.map(c => c.product.rating)
  const reviewCounts = allCandidates.map(c => c.product.reviewCount)

  const myPrice = parsePrice(product.price)
  const myRating = product.rating
  const myReviews = product.reviewCount

  const minPrice = Math.min(...prices.filter(p => p !== Infinity))
  const maxPrice = Math.max(...prices.filter(p => p !== Infinity))
  const maxRating = Math.max(...ratings)
  const maxReviews = Math.max(...reviewCounts)
  const avgReviews = reviewCounts.reduce((a, b) => a + b, 0) / reviewCounts.length

  // Is this the cheapest? (with at least 10% price difference)
  if (myPrice === minPrice && myPrice < maxPrice * 0.9 && myPrice !== Infinity) {
    return { badge: getRandomFromPool('value'), reason: 'cheapest' }
  }

  // Is this the most expensive? (premium positioning)
  if (myPrice === maxPrice && myPrice > minPrice * 1.1 && myPrice !== Infinity) {
    return { badge: getRandomFromPool('premium'), reason: 'most expensive' }
  }

  // Has significantly more reviews (2x average = very popular)
  if (myReviews >= avgReviews * 2 && myReviews === maxReviews && myReviews > 100) {
    return { badge: getRandomFromPool('popular'), reason: 'most popular by reviews' }
  }

  // Has highest rating with substantial reviews
  if (myRating === maxRating && myRating >= 4.5 && myReviews >= 50) {
    return { badge: 'Top Rated', reason: 'highest rating with good reviews' }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BADGE RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve the best badge for a single product using priority hierarchy:
 * 1. Data-driven (based on actual metrics)
 * 2. AI context-aware (if specific, not generic)
 * 3. Positional fallback with randomized synonyms
 */
function resolveSmartBadge(
  candidate: BadgeCandidate,
  allCandidates: BadgeCandidate[]
): string {
  // Priority 1: Data-driven badge
  const dataDrivenResult = getDataDrivenBadge(candidate, allCandidates)
  if (dataDrivenResult) {
    console.log(`[BadgeService] Product "${candidate.product.title.slice(0, 40)}..." → Data-driven: "${dataDrivenResult.badge}" (${dataDrivenResult.reason})`)
    return dataDrivenResult.badge
  }

  // Priority 2: AI context-aware badge (if specific)
  if (candidate.aiSuggestedBadge && isSpecificBadge(candidate.aiSuggestedBadge)) {
    console.log(`[BadgeService] Product "${candidate.product.title.slice(0, 40)}..." → AI-specific: "${candidate.aiSuggestedBadge}"`)
    return candidate.aiSuggestedBadge
  }

  // Priority 3: Positional fallback with randomized synonyms
  const positionalBadge = getRandomPositionalBadge(candidate.position)
  console.log(`[BadgeService] Product "${candidate.product.title.slice(0, 40)}..." → Positional: "${positionalBadge}" (position ${candidate.position})`)
  return positionalBadge
}

/**
 * Get a randomized badge based on position (for fallback scenarios)
 */
export function getRandomPositionalBadge(position: number): string {
  switch (position) {
    case 0:
      return getRandomFromPool('winner')
    case 1:
      return getRandomFromPool('value')
    case 2:
      return getRandomFromPool('premium')
    default:
      // For positions 3+, cycle through pools
      const pools: BadgePoolKey[] = ['popular', 'winner', 'value', 'premium']
      return getRandomFromPool(pools[position % pools.length])
  }
}

/**
 * Resolve badges for all products, ensuring no duplicates
 */
export function resolveSmartBadges(candidates: BadgeCandidate[]): AmazonProduct[] {
  console.log(`[BadgeService] Resolving badges for ${candidates.length} products...`)

  const usedBadges = new Set<string>()
  const results: AmazonProduct[] = []

  for (const candidate of candidates) {
    let badge = resolveSmartBadge(candidate, candidates)

    // Ensure no duplicate badges
    let attempts = 0
    while (usedBadges.has(badge) && attempts < 10) {
      // Try getting a different badge from the same position
      badge = getRandomPositionalBadge(candidate.position)
      attempts++
    }

    // Last resort: add position suffix
    if (usedBadges.has(badge)) {
      badge = `${badge} #${candidate.position + 1}`
    }

    usedBadges.add(badge)

    results.push({
      ...candidate.product,
      badge,
    })
  }

  console.log(`[BadgeService] Final badges: ${results.map(p => `"${p.badge}"`).join(', ')}`)
  return results
}
