/**
 * Word Count Constants
 * 
 * Defines exact word targets for each component type to ensure consistent
 * article generation across all word count targets (500-3000 words).
 * 
 * These values align with the documentation in:
 * - updated_article_component_documentation.md
 * - structure-flows.ts COMPONENT_LABELS
 */

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL COMPONENT WORD COUNTS
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIVERSAL_WORD_COUNTS = {
  /** Overview paragraph: 100 words (2×50 sub-paragraphs) */
  'overview-paragraph': 100,

  /** Standard paragraph: 150 words (3×50 sub-paragraphs) */
  'standard-paragraph': 150,

  /** Closing paragraph: 50 words */
  'closing-paragraph': 50,

  /** FAQ answer: 28 words each */
  'faq-answer': 28,

  /** H1/H2/H3 headings: ~6 words average (counted separately) */
  'heading': 6,
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// UNIQUE COMPONENT WORD COUNTS BY ARTICLE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIQUE_COMPONENT_WORD_COUNTS = {
  // Affiliate Components
  /** Product card: H2 + card content + 150-word description = ~250-300 words total */
  'product-card': 275, // Average of range

  // Commercial Components
  /** Feature list: 100-120 words (5-7 bullets) */
  'feature-list': 110,
  /** CTA box: 20-30 words */
  'cta-box': 25,

  // Comparison Components
  /** Topic overview: 80 words (2×40: What + Who) */
  'topic-overview': 80,
  /** Comparison table: 120-150 words side-by-side */
  'comparison-table': 135,
  /** Quick verdict: 50 words */
  'quick-verdict': 50,

  // How-To Components
  /** Materials/requirements box: 20-120 words (5-15 bullets) */
  'materials-box': 70,
  /** Pro tips list: 80-120 words (5-7 bullets) */
  'pro-tips': 100,

  // Informational Components
  /** Key takeaways: 50-75 words (TL;DR box) */
  'key-takeaways': 65,
  /** Quick facts: 80-100 words (5-7 bullets) + H2 */
  'quick-facts': 95,

  // Listicle Components
  /** Honorable mentions: H2 + 3-4 H3s with paragraphs (40-50w each) = ~160-200 words */
  'honorable-mentions': 180,

  // Local Components
  /** Why choose local: H2 + image + list (40-60 words) */
  'why-choose-local': 55,
  /** Service info box: 40-60 words */
  'service-info': 50,

  // Recipe Components
  /** Ingredients list: 150 words bulleted */
  'ingredients': 150,
  /** Instructions: 150-400 words numbered */
  'instructions': 275,
  /** Tips paragraph: 150 words */
  'tips-paragraph': 150,
  /** Nutrition table: 100 words */
  'nutrition-table': 100,

  // Review Components
  /** Pros & cons: 150 words total (75 pros + 75 cons) */
  'pros-cons': 150,
  /** Rating paragraph: 100 words with score justification + H2 */
  'rating-paragraph': 105,
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED COSTS BY ARTICLE TYPE
// These are the non-H2 sections that always appear regardless of word count
// ═══════════════════════════════════════════════════════════════════════════════

export const FIXED_COSTS_BY_ARTICLE_TYPE: Record<string, number> = {
  /**
   * Affiliate: overview(100) + closing(50) + FAQ(28) + headings(~30)
   * NOTE: For affiliate, h2Count becomes product card count, not standard H2s
   */
  affiliate: 100 + 50 + 28 + 30,

  /**
   * Commercial: overview(100) + feature-list(110) + cta-box(25) + closing(50) + FAQ(28) + headings(~40)
   */
  commercial: 100 + 110 + 25 + 50 + 28 + 40,

  /**
   * Comparison: overview(100) + 2×topic-overview(160) + comparison-table(135) + quick-verdict(50) + closing(50) + FAQ(28) + headings(~50)
   */
  comparison: 100 + 160 + 135 + 50 + 50 + 28 + 50,

  /**
   * How-To: overview(100) + materials-box(70) + pro-tips(100) + closing(50) + FAQ(28) + headings(~50)
   */
  'how-to': 100 + 70 + 100 + 50 + 28 + 50,

  /**
   * Informational: overview(100) + key-takeaways(65) + quick-facts(95) + closing(50) + FAQ(28) + headings(~50)
   */
  informational: 100 + 65 + 95 + 50 + 28 + 50,

  /**
   * Listicle: overview(100) + honorable-mentions(180) + closing(50) + FAQ(28) + headings(~40)
   */
  listicle: 100 + 180 + 50 + 28 + 40,

  /**
   * Local: overview(100) + why-choose-local(55) + service-info(50) + closing(50) + FAQ(28) + headings(~40)
   */
  local: 100 + 55 + 50 + 50 + 28 + 40,

  /**
   * Recipe: overview(100) + ingredients(150) + instructions(275) + tips(150) + nutrition(100) + closing(50) + FAQ(28) + headings(~60)
   * NOTE: Recipe has many fixed components, fewer variable H2s
   */
  recipe: 100 + 150 + 275 + 150 + 100 + 50 + 28 + 60,

  /**
   * Review: overview(100) + feature-list(150) + pros-cons(150) + rating(105) + closing(50) + FAQ(28) + headings(~50)
   */
  review: 100 + 150 + 150 + 105 + 50 + 28 + 50,
}

// ═══════════════════════════════════════════════════════════════════════════════
// H2 SECTION WORD COSTS
// Each H2 section = H2 heading + H2 image alt + standard-paragraph
// ═══════════════════════════════════════════════════════════════════════════════

/** Words per standard H2 section (heading + image + paragraph) */
export const WORDS_PER_H2_SECTION = 150 + 6 // 156 words (150 paragraph + ~6 heading)

/** Words per product card (for affiliate articles) */
export const WORDS_PER_PRODUCT_CARD = UNIQUE_COMPONENT_WORD_COUNTS['product-card']

// ═══════════════════════════════════════════════════════════════════════════════
// WORD COUNT LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export const WORD_COUNT_LIMITS = {
  /** Minimum word count supported */
  MIN: 500,
  /** Maximum word count supported */
  MAX: 3000,
  /** Default word count when not specified */
  DEFAULT: 1000,
} as const

/**
 * Per-article-type default word counts.
 *
 * Some types have heavy unique components (Review: features + pros/cons + rating,
 * How-To: materials + pro tips) that consume most of the budget at 1000 words,
 * leaving too few dynamic H2 sections to meet the guidelines:
 *   - Review: needs 3-5 H2s in loop → requires ~1500w
 *   - How-To: needs 5-10 steps → requires ~1500w
 */
export const DEFAULT_WORD_COUNT_BY_TYPE: Record<string, number> = {
  affiliate: 1000,
  commercial: 1000,
  comparison: 1000,
  'how-to': 1500,
  informational: 1000,
  listicle: 1000,
  local: 1000,
  recipe: 1000,
  review: 1500,
}

// ═══════════════════════════════════════════════════════════════════════════════
// H2 COUNT LIMITS BY ARTICLE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export const H2_COUNT_LIMITS: Record<string, { min: number; max: number }> = {
  affiliate: { min: 3, max: 10 }, // Product cards
  commercial: { min: 2, max: 15 },
  comparison: { min: 3, max: 12 },
  'how-to': { min: 5, max: 15 }, // Minimum 5 steps per documentation
  informational: { min: 4, max: 18 },
  listicle: { min: 5, max: 15 }, // ODD numbers preferred (5,7,9,11,13,15)
  local: { min: 3, max: 12 },
  recipe: { min: 1, max: 8 }, // Most content is fixed
  review: { min: 3, max: 10 },
}

/**
 * Get the word count for a specific component
 */
export function getComponentWordCount(componentType: string): number {
  if (componentType in UNIVERSAL_WORD_COUNTS) {
    return UNIVERSAL_WORD_COUNTS[componentType as keyof typeof UNIVERSAL_WORD_COUNTS]
  }
  if (componentType in UNIQUE_COMPONENT_WORD_COUNTS) {
    return UNIQUE_COMPONENT_WORD_COUNTS[componentType as keyof typeof UNIQUE_COMPONENT_WORD_COUNTS]
  }
  // Default to standard paragraph for unknown components
  return UNIVERSAL_WORD_COUNTS['standard-paragraph']
}

/**
 * Get the fixed cost for an article type
 */
export function getFixedCost(articleType: string): number {
  return FIXED_COSTS_BY_ARTICLE_TYPE[articleType] ?? FIXED_COSTS_BY_ARTICLE_TYPE.informational
}

/**
 * Get H2 count limits for an article type
 */
export function getH2Limits(articleType: string): { min: number; max: number } {
  return H2_COUNT_LIMITS[articleType] ?? H2_COUNT_LIMITS.informational
}
