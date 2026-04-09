/**
 * Word Budget Calculator Service
 * 
 * Calculates dynamic article structure based on target word count.
 * Determines H2 count, component budgets, and integrates with buildDynamicFlow().
 * 
 * @example
 * // Calculate budget for a 1500-word informational article
 * const budget = calculateWordBudget(1500, 'informational')
 * // Returns: { h2Count: 7, flow: [...], fixedCosts: 388, variableBudget: 1112, ... }
 */

import { buildDynamicFlow } from '@/data/structure-flows'
import {
  WORDS_PER_H2_SECTION,
  WORDS_PER_PRODUCT_CARD,
  WORD_COUNT_LIMITS,
  getFixedCost,
  getH2Limits,
  getComponentWordCount,
} from '@/lib/ai/word-counts'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WordBudget {
  /** Target word count requested by user */
  targetWordCount: number

  /** Calculated number of H2 sections (or product cards for affiliate) */
  h2Count: number

  /** The complete component flow array */
  flow: string[]

  /** Fixed word costs that don't scale with H2 count */
  fixedCosts: number

  /** Remaining budget for variable H2 sections */
  variableBudget: number

  /** Actual estimated word count based on structure */
  estimatedWordCount: number

  /** Word budgets per component type */
  componentBudgets: Record<string, number>

  /** Article type used for calculation */
  articleType: string
}

export interface WordBudgetBreakdown {
  /** Component type */
  component: string
  /** Number of times this component appears */
  count: number
  /** Words per instance */
  wordsEach: number
  /** Total words for this component */
  totalWords: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate word budget and dynamic structure for an article
 * 
 * @param targetWordCount - Target word count (500-3000)
 * @param articleType - One of the 9 article types
 * @returns Complete word budget with flow and component allocations
 */
export function calculateWordBudget(
  targetWordCount: number,
  articleType: string
): WordBudget {
  // Clamp word count to valid range
  const clampedWordCount = Math.max(
    WORD_COUNT_LIMITS.MIN,
    Math.min(WORD_COUNT_LIMITS.MAX, targetWordCount)
  )

  // Get fixed costs for this article type
  const fixedCosts = getFixedCost(articleType)

  // Calculate variable budget (what's left for H2 sections)
  const variableBudget = Math.max(0, clampedWordCount - fixedCosts)

  // Calculate H2 count based on article type
  const h2Count = calculateH2Count(articleType, variableBudget)

  // Build the dynamic flow
  const flow = buildDynamicFlow(articleType, h2Count)

  // Calculate component budgets from the flow
  const componentBudgets = calculateComponentBudgets(flow)

  // Calculate estimated word count
  const estimatedWordCount = calculateEstimatedWordCount(componentBudgets)

  return {
    targetWordCount: clampedWordCount,
    h2Count,
    flow,
    fixedCosts,
    variableBudget,
    estimatedWordCount,
    componentBudgets,
    articleType,
  }
}

/**
 * Calculate the number of H2 sections (or product cards) based on available budget
 */
function calculateH2Count(articleType: string, variableBudget: number): number {
  const limits = getH2Limits(articleType)

  // For affiliate articles, h2Count represents product cards
  const wordsPerSection = articleType === 'affiliate'
    ? WORDS_PER_PRODUCT_CARD
    : WORDS_PER_H2_SECTION

  // Calculate raw H2 count from budget
  const rawH2Count = Math.floor(variableBudget / wordsPerSection)

  // Clamp to article type limits
  let h2Count = Math.max(limits.min, Math.min(limits.max, rawH2Count))

  // Special handling for listicle: prefer odd numbers
  if (articleType === 'listicle' && h2Count % 2 === 0 && h2Count > limits.min) {
    h2Count -= 1 // Make it odd
  }

  return h2Count
}

/**
 * Calculate word budgets for each component in the flow
 */
function calculateComponentBudgets(flow: string[]): Record<string, number> {
  const budgets: Record<string, number> = {}

  for (const component of flow) {
    // Skip structural elements that don't have word counts
    if (isStructuralElement(component)) {
      continue
    }

    const wordCount = getComponentWordCount(component)
    budgets[component] = (budgets[component] || 0) + wordCount
  }

  return budgets
}

/**
 * Check if a component is a structural element (no word count)
 */
function isStructuralElement(component: string): boolean {
  const structuralElements = [
    'h1',
    'h2',
    'featured-image',
    'h2-image',
    'toc',
    'closing-h2',
    'faq-h2',
    'faq-h3',
  ]
  return structuralElements.includes(component)
}

/**
 * Calculate total estimated word count from component budgets
 */
function calculateEstimatedWordCount(componentBudgets: Record<string, number>): number {
  return Object.values(componentBudgets).reduce((sum, count) => sum + count, 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a detailed breakdown of word allocation
 */
export function getWordBudgetBreakdown(budget: WordBudget): WordBudgetBreakdown[] {
  const breakdown: WordBudgetBreakdown[] = []
  const componentCounts: Record<string, number> = {}

  // Count occurrences of each component
  for (const component of budget.flow) {
    if (!isStructuralElement(component)) {
      componentCounts[component] = (componentCounts[component] || 0) + 1
    }
  }

  // Build breakdown
  for (const [component, count] of Object.entries(componentCounts)) {
    const wordsEach = getComponentWordCount(component)
    breakdown.push({
      component,
      count,
      wordsEach,
      totalWords: count * wordsEach,
    })
  }

  // Sort by total words descending
  breakdown.sort((a, b) => b.totalWords - a.totalWords)

  return breakdown
}

/**
 * Validate that a word budget meets minimum requirements
 */
export function validateWordBudget(budget: WordBudget): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const limits = getH2Limits(budget.articleType)

  // Check H2 count meets minimum
  if (budget.h2Count < limits.min) {
    errors.push(
      `H2 count (${budget.h2Count}) is below minimum (${limits.min}) for ${budget.articleType} articles`
    )
  }

  // Check for extremely short articles
  if (budget.targetWordCount < 500) {
    warnings.push('Target word count is below recommended minimum of 500 words')
  }

  // Check for significant deviation from target
  const deviation = Math.abs(budget.estimatedWordCount - budget.targetWordCount)
  const deviationPercent = (deviation / budget.targetWordCount) * 100
  if (deviationPercent > 20) {
    warnings.push(
      `Estimated word count (${budget.estimatedWordCount}) deviates ${deviationPercent.toFixed(0)}% from target`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Suggest optimal word count for a specific H2 count
 */
export function suggestWordCountForH2Count(
  h2Count: number,
  articleType: string
): number {
  const fixedCosts = getFixedCost(articleType)
  const wordsPerSection = articleType === 'affiliate'
    ? WORDS_PER_PRODUCT_CARD
    : WORDS_PER_H2_SECTION

  return fixedCosts + (h2Count * wordsPerSection)
}

/**
 * Get word count range for an article type
 */
export function getRecommendedWordCountRange(articleType: string): {
  min: number
  max: number
  optimal: number
} {
  const limits = getH2Limits(articleType)

  return {
    min: suggestWordCountForH2Count(limits.min, articleType),
    max: Math.min(WORD_COUNT_LIMITS.MAX, suggestWordCountForH2Count(limits.max, articleType)),
    optimal: suggestWordCountForH2Count(Math.ceil((limits.min + limits.max) / 2), articleType),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE CALCULATIONS
// These match the documentation examples
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference: Expected H2 counts at various word targets
 * Based on informational article type with ~388 fixed + 156/H2
 * 
 * 500 words:  (500 - 388) / 156 ≈ 1 H2 (clamped to min 4)
 * 1000 words: (1000 - 388) / 156 ≈ 4 H2
 * 1500 words: (1500 - 388) / 156 ≈ 7 H2
 * 2000 words: (2000 - 388) / 156 ≈ 10 H2
 * 2500 words: (2500 - 388) / 156 ≈ 13 H2
 * 3000 words: (3000 - 388) / 156 ≈ 16 H2
 */
export const REFERENCE_H2_COUNTS = {
  informational: {
    500: 4,   // Clamped to minimum
    1000: 4,
    1500: 7,
    2000: 10,
    2500: 13,
    3000: 16,
  },
} as const
