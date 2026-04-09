/**
 * Credit Estimator Service
 *
 * Calculates credit costs for article generation using the ACTUAL article
 * structure — same H2 formula as the orchestrator, precise image counts
 * from the known flow, and per-type overhead for extra AI calls.
 *
 * @module lib/services/credit-estimator
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Base credit rate per 1000 words of text generation
 */
export const TEXT_CREDIT_RATES: Record<string, number> = {
  base: 5, // 5 credits per 1000 words baseline
};

/**
 * Credit cost per image by provider
 */
export const IMAGE_CREDIT_RATES = {
  flux: 2,
  gemini: 13,
  none: 0,
} as const;

/**
 * Article structure config — mirrors the orchestrator's word budget calculation
 * (unified-orchestrator.ts lines 1115-1146)
 *
 * Keep in sync with: uniqueComponentBudget + fixedH2Sections in unified-orchestrator.ts
 */
const ARTICLE_STRUCTURE: Record<string, {
  uniqueBudget: number;
  fixedH2s: number;
  fixedWords: number;
  wordsPerSection: number;
  mode: 'floor' | 'round';
}> = {
  affiliate:     { uniqueBudget: 200, fixedH2s: 0, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  commercial:    { uniqueBudget: 250, fixedH2s: 1, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  comparison:    { uniqueBudget: 350, fixedH2s: 0, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  'how-to':      { uniqueBudget: 180, fixedH2s: 2, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  informational: { uniqueBudget: 180, fixedH2s: 1, fixedWords: 300, wordsPerSection: 180, mode: 'round' },
  listicle:      { uniqueBudget: 120, fixedH2s: 1, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  local:         { uniqueBudget: 120, fixedH2s: 1, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  recipe:        { uniqueBudget: 550, fixedH2s: 4, fixedWords: 300, wordsPerSection: 180, mode: 'floor' },
  review:        { uniqueBudget: 380, fixedH2s: 3, fixedWords: 350, wordsPerSection: 160, mode: 'floor' },
};

/**
 * Extra H2s that buildDynamicFlow adds BEYOND the dynamic loop
 * (data/structure-flows.ts buildDynamicFlow)
 *
 * These are H2 entries the flow builder always includes regardless of h2Count.
 * Each H2 in the flow gets an image placeholder generated.
 */
const FIXED_FLOW_H2S: Record<string, number> = {
  affiliate:     0, // Product cards ARE the H2s (count = max(3, dynamic))
  commercial:    1, // Feature list H2
  comparison:    2, // 2 topic H2s
  'how-to':      2, // Materials H2 + Pro Tips H2
  informational: 0, // All dynamic
  listicle:      0, // All dynamic
  local:         0, // All dynamic
  recipe:        1, // Tips H2
  review:        2, // Features H2 + Pros/Cons H2
};

/**
 * Extra images from unique components (not from the H2 content loop)
 */
const COMPONENT_IMAGES: Record<string, number> = {
  local: 1, // why-choose-local creates its own image placeholder
};

/**
 * Default product count for affiliate estimation
 * (actual count depends on Amazon results at runtime)
 */
const DEFAULT_AFFILIATE_PRODUCT_COUNT = 3;

/**
 * Flat credit overhead per article type for AI calls beyond base content generation
 * Covers: Phase 0, pre-generation, unique component generation, classification
 */
const TYPE_OVERHEAD: Record<string, number> = {
  affiliate:     4, // Phase 0: inference + validation + name cleaning + product cards
  commercial:    1, // Feature list generation
  comparison:    2, // Comparison extract + table + verdict
  'how-to':      1, // Materials box + pro tips
  informational: 1, // Key takeaways + quick facts
  listicle:      1, // Honorable mentions
  local:         1, // Why choose local
  recipe:        2, // Pre-gen: ingredients + instructions + nutrition
  review:        2, // Pre-gen: features + pros/cons + rating
};

// =============================================================================
// Types
// =============================================================================

export type ImageProvider = "flux" | "gemini" | "none";

export interface CreditEstimateParams {
  wordCount: number;
  imageProvider: ImageProvider;
  articleType: string;
  imageCount?: number; // Optional override for automatic calculation
  selectedComponents?: string[]; // Component toggles - affects image count and word budget
}

export interface CreditEstimate {
  textCredits: number;
  imageCredits: number;
  totalCredits: number;
  imageCount: number;
  breakdown: {
    baseTextCredits: number;
    overheadCredits: number;
    dynamicH2Count: number;
    creditsPerImage: number;
    imageCredits: number;
  };
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Calculate the dynamic H2 count using the same formula as the orchestrator.
 * (unified-orchestrator.ts lines 1140-1191)
 * 
 * @param articleType - The article type
 * @param wordCount - Target word count
 * @param selectedComponents - Optional array of enabled component IDs. If provided,
 *   adjusts word budget based on which optional components (FAQ, closing) are enabled.
 */
export function calculateDynamicH2Count(
  articleType: string,
  wordCount: number,
  selectedComponents?: string[]
): number {
  const config = ARTICLE_STRUCTURE[articleType];
  if (!config) {
    // Unknown type: fallback to informational
    return calculateDynamicH2Count('informational', wordCount, selectedComponents);
  }

  // Helper: check if component is enabled (defaults to enabled if no selectedComponents)
  const isEnabled = (id: string) => !selectedComponents || selectedComponents.includes(id);

  // Adjust fixed words based on enabled components
  // Base fixedWords (300) includes: H1 (10) + Overview (100) + FAQ (140) + Closing (50)
  // When optional components are disabled, their word budget is freed for more H2 sections
  const faqAdjustment = isEnabled('faq') ? 0 : -140;
  const closingAdjustment = isEnabled('closing-paragraph') ? 0 : -50;
  const adjustedFixedWords = config.fixedWords + faqAdjustment + closingAdjustment;

  const available = wordCount - adjustedFixedWords - config.uniqueBudget;

  let h2Count = config.mode === 'round'
    ? Math.max(0, Math.round(available / config.wordsPerSection))
    : Math.max(0, Math.floor(available / config.wordsPerSection));

  // Ensure minimum of 2 total H2s
  const totalH2s = config.fixedH2s + h2Count;
  if (totalH2s < 2) {
    h2Count = Math.max(0, 2 - config.fixedH2s);
  }

  // Cap at 6
  h2Count = Math.min(6, h2Count);

  // Listicle: force odd, min 5
  if (articleType === 'listicle') {
    if (h2Count % 2 === 0) h2Count += 1;
    if (h2Count < 5) h2Count = 5;
  }

  return h2Count;
}

/**
 * Calculate the precise image count based on the known article flow structure.
 *
 * Images come from:
 * 1. Featured image (1, if enabled)
 * 2. H2 section images (1 per H2 in the flow — both fixed and dynamic, only if h2-image enabled)
 * 3. Product card images (affiliate only — each product gets a card image IN ADDITION to H2 image)
 * 4. Component images (local's why-choose-local, only if that component enabled)
 * 
 * @param articleType - The article type
 * @param wordCount - Target word count
 * @param selectedComponents - Optional array of enabled component IDs. If not provided,
 *   assumes ALL components are enabled (backwards compatibility).
 */
export function calculateImageCount(
  articleType: string,
  wordCount: number,
  selectedComponents?: string[]
): number {
  // Helper: check if component is enabled (defaults to enabled if no selectedComponents)
  const isEnabled = (id: string) => !selectedComponents || selectedComponents.includes(id);

  const dynamicH2Count = calculateDynamicH2Count(articleType, wordCount, selectedComponents);

  // Featured image (1) - only if enabled (though typically required)
  const featuredCount = isEnabled('featured-image') ? 1 : 0;

  // H2 section images - only counted if h2-image component is enabled
  let h2ImageCount = 0;
  if (isEnabled('h2-image')) {
    let totalH2sInFlow: number;
    if (articleType === 'affiliate') {
      // Affiliate: product cards replace dynamic H2 loop, capped to product count
      totalH2sInFlow = Math.max(DEFAULT_AFFILIATE_PRODUCT_COUNT, dynamicH2Count);
    } else {
      totalH2sInFlow = (FIXED_FLOW_H2S[articleType] ?? 0) + dynamicH2Count;
    }
    h2ImageCount = totalH2sInFlow;
  }

  // Product card images (affiliate only — each product gets an EXTRA image beyond H2 image)
  // Product card images are always generated for affiliate articles regardless of h2-image toggle
  const productCardImages = articleType === 'affiliate'
    ? Math.max(DEFAULT_AFFILIATE_PRODUCT_COUNT, dynamicH2Count)
    : 0;

  // Component images (e.g., local's why-choose-local creates its own image)
  // Only count if the specific component is enabled
  let componentImageCount = 0;
  if (articleType === 'local' && isEnabled('why-choose-local')) {
    componentImageCount = COMPONENT_IMAGES[articleType] ?? 0;
  } else if (articleType !== 'local') {
    componentImageCount = COMPONENT_IMAGES[articleType] ?? 0;
  }

  return featuredCount + h2ImageCount + productCardImages + componentImageCount;
}

/**
 * Estimate the total credits required for an article
 *
 * Formula: baseTextCredits + imageCredits + overheadCredits
 *
 * @example
 * ```typescript
 * const estimate = estimateArticleCredits({
 *   wordCount: 1000,
 *   imageProvider: 'flux',
 *   articleType: 'affiliate',
 * });
 * // estimate.totalCredits = 30 (text: 5, images: 7×3=21, overhead: 4)
 * ```
 */
export function estimateArticleCredits(
  params: CreditEstimateParams
): CreditEstimate {
  const { wordCount, imageProvider, articleType, imageCount: explicitImageCount, selectedComponents } = params;

  // Base text credits (same for all types)
  const baseTextCredits = Math.ceil((wordCount / 1000) * TEXT_CREDIT_RATES.base);

  // Image count (use explicit if provided, otherwise calculate from structure)
  // Pass selectedComponents to respect component toggles
  const imageCount = explicitImageCount ??
    (imageProvider === "none" ? 0 : calculateImageCount(articleType, wordCount, selectedComponents));

  // Image credits
  const creditsPerImage = IMAGE_CREDIT_RATES[imageProvider] ?? 0;
  const imageCredits = imageCount * creditsPerImage;

  // Overhead credits for type-specific AI calls
  const overheadCredits = TYPE_OVERHEAD[articleType] ?? 1;

  // Total
  const totalCredits = baseTextCredits + imageCredits + overheadCredits;

  return {
    textCredits: baseTextCredits + overheadCredits,
    imageCredits,
    totalCredits,
    imageCount,
    breakdown: {
      baseTextCredits,
      overheadCredits,
      dynamicH2Count: calculateDynamicH2Count(articleType, wordCount, selectedComponents),
      creditsPerImage,
      imageCredits,
    },
  };
}

/**
 * Calculate the estimated USD cost for credits
 * Based on PAYG rate of $0.05 per credit
 */
export function creditsToCost(
  credits: number,
  ratePerCredit: number = 0.05
): string {
  const cost = credits * ratePerCredit;
  return cost.toFixed(2);
}

/**
 * Format credit estimate for display
 */
export function formatCreditEstimate(estimate: CreditEstimate): string {
  const cost = creditsToCost(estimate.totalCredits);
  return `${estimate.totalCredits} credits (~$${cost})`;
}

/**
 * Validate that an estimate is within reasonable bounds
 */
export function validateEstimate(estimate: CreditEstimate): {
  valid: boolean;
  reason?: string;
} {
  if (estimate.totalCredits < 0) {
    return { valid: false, reason: "Credits cannot be negative" };
  }

  if (estimate.totalCredits > 1000) {
    return {
      valid: false,
      reason: "Estimate exceeds maximum single article cost (1000 credits)",
    };
  }

  if (estimate.imageCount > 50) {
    return {
      valid: false,
      reason: "Image count exceeds maximum (50 images)",
    };
  }

  return { valid: true };
}

/**
 * Estimate credits for a bulk generation job
 */
export function estimateBulkCredits(
  articles: Array<Omit<CreditEstimateParams, "imageCount">>
): {
  totalCredits: number;
  perArticle: CreditEstimate[];
  averageCredits: number;
} {
  const estimates = articles.map((params) => estimateArticleCredits({
    ...params,
    // selectedComponents is passed through from params if provided
  }));
  const totalCredits = estimates.reduce((sum, e) => sum + e.totalCredits, 0);
  const averageCredits = articles.length > 0 ? Math.ceil(totalCredits / articles.length) : 0;

  return {
    totalCredits,
    perArticle: estimates,
    averageCredits,
  };
}
