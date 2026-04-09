/**
 * H1 Promise Extractor
 * 
 * Extracts and analyzes the promise made by an H1 heading to determine
 * what H2s should contain to fulfill that promise.
 * 
 * Examples:
 * - "5 Delicious Italian Beef Taco Recipes" → count: 5, type: 'recipes', subject: 'Italian Beef Taco'
 * - "Complete Guide to Making Tacos" → type: 'guide', subject: 'Making Tacos'
 * - "How to Make Perfect Italian Tacos?" → type: 'how-to', subject: 'Perfect Italian Tacos'
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Promise types that H1s can make
 * 
 * LISTICLE PROMISES (specific items expected - STRICT enforcement):
 * - Each H2 must represent ONE distinct item of this type
 * 
 * STATEMENT PROMISES (comprehensive coverage expected - SOFT enforcement):
 * - H2s should cover the topic comprehensively
 * 
 * QUESTION PROMISES (answers expected - SOFT enforcement):
 * - H2s should collectively answer the question
 */
export type PromiseType =
  // Listicle promises - specific items expected
  | 'recipes'      // "5 Delicious Taco Recipes" → 5 specific recipe H2s
  | 'reasons'      // "7 Reasons to Try X" → 7 reason H2s
  | 'ways'         // "10 Ways to Improve X" → 10 method H2s
  | 'tips'         // "5 Tips for Better X" → 5 tip H2s
  | 'benefits'     // "8 Benefits of X" → 8 benefit H2s
  | 'features'     // "6 Features of X" → 6 feature H2s
  | 'examples'     // "5 Examples of X" → 5 example H2s
  | 'products'     // "Best 5 Products" → 5 product H2s
  | 'ideas'        // "10 Ideas for X" → 10 idea H2s
  | 'steps'        // "7 Steps to X" → 7 step H2s
  | 'facts'        // "10 Facts About X" → 10 fact H2s
  | 'mistakes'     // "5 Mistakes to Avoid" → 5 mistake H2s
  | 'secrets'      // "7 Secrets to X" → 7 secret H2s
  | 'strategies'   // "5 Strategies for X" → 5 strategy H2s
  | 'methods'      // "3 Methods for X" → 3 method H2s
  | 'techniques'   // "5 Techniques for X" → 5 technique H2s
  | 'options'      // "5 Options for X" → 5 option H2s
  | 'alternatives' // "5 Alternatives to X" → 5 alternative H2s
  | 'things'       // "10 Things You Need to Know" → 10 item H2s
  | 'moments'      // "5 Wildest Moments" → 5 moment H2s
  | 'items'        // Generic numbered items

  // Statement promises - comprehensive coverage expected
  | 'guide'        // "Complete Guide to X" → comprehensive H2s
  | 'review'       // "X Review" → features, pros/cons, verdict H2s
  | 'analysis'     // "X Analysis" → analytical H2s
  | 'overview'     // "X Overview" → summary H2s
  | 'comparison'   // "X vs Y Comparison" → comparison H2s
  | 'tutorial'     // "X Tutorial" → instructional H2s
  | 'breakdown'    // "X Breakdown" → detailed section H2s
  | 'explained'    // "X Explained" → explanatory H2s

  // Question promises - answers expected
  | 'how-to'       // "How to X?" → process/step H2s
  | 'what-is'      // "What is X?" → definition/explanation H2s
  | 'why-does'     // "Why does X?" → reason/cause H2s
  | 'when-to'      // "When to X?" → timing/situation H2s
  | 'which-is'     // "Which X is Best?" → comparison/recommendation H2s
  | 'can-you'      // "Can You X?" → possibility/method H2s
  | 'should-you'   // "Should You X?" → evaluation/recommendation H2s

  // Curation promises
  | 'selection'    // "Best X", "Top X" → curation/recommendation H2s

  // Fallback
  | 'generic'      // Unknown promise type

/**
 * Article types we support
 * Note: System uses both 'howto' and 'how-to' in different places, so we support both
 */
export type ArticleType = 'review' | 'howto' | 'how-to' | 'recipe' | 'informational' | 'affiliate' | 'listicle' | 'comparison' | 'commercial'

/**
 * Variation/format types
 */
export type VariationType = 'statement' | 'question' | 'listicle'

/**
 * Extracted promise from H1
 */
export interface ExtractedPromise {
  /** Original H1 text */
  h1: string

  /** Number promised (for listicles), null if no number */
  count: number | null

  /** Type of promise being made */
  promiseType: PromiseType

  /** Main subject/topic of the H1 */
  subject: string

  /** What the reader will get/learn (verb phrase) */
  action: string

  /** Whether this is a listicle-style promise (requires specific items) */
  isListicle: boolean

  /** Whether this is a question-style promise (requires answers) */
  isQuestion: boolean

  /** Confidence score 0-1 for extraction accuracy */
  confidence: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns for extracting listicle count from H1
 * Matches: "5 Ways...", "Top 10...", "Best 7...", etc.
 */
const LISTICLE_COUNT_PATTERNS = [
  /^(\d+)\s+/i,                           // "5 Ways to..."
  /^top\s+(\d+)\s+/i,                     // "Top 10 Ways..."
  /^best\s+(\d+)\s+/i,                    // "Best 5 Products..."
  /\s+(\d+)\s+(?:best|top|ways|tips)/i,   // "The 5 Best..."
]

/**
 * Promise type detection patterns
 * Maps regex patterns to promise types
 */
const PROMISE_TYPE_PATTERNS: Array<{ pattern: RegExp; type: PromiseType; isListicle: boolean }> = [
  // Listicle promises (order matters - more specific first)
  { pattern: /\brecipes?\b/i, type: 'recipes', isListicle: true },
  { pattern: /\breasons?\b/i, type: 'reasons', isListicle: true },
  { pattern: /\bways?\s+to\b/i, type: 'ways', isListicle: true },
  { pattern: /\btips?\b/i, type: 'tips', isListicle: true },
  { pattern: /\bbenefits?\b/i, type: 'benefits', isListicle: true },
  { pattern: /\bfeatures?\b/i, type: 'features', isListicle: true },
  { pattern: /\bexamples?\b/i, type: 'examples', isListicle: true },
  { pattern: /\bproducts?\b/i, type: 'products', isListicle: true },
  { pattern: /\bideas?\b/i, type: 'ideas', isListicle: true },
  { pattern: /\bsteps?\b/i, type: 'steps', isListicle: true },
  { pattern: /\bfacts?\b/i, type: 'facts', isListicle: true },
  { pattern: /\bmistakes?\b/i, type: 'mistakes', isListicle: true },
  { pattern: /\bsecrets?\b/i, type: 'secrets', isListicle: true },
  { pattern: /\bstrategies?\b|\bstrategy\b/i, type: 'strategies', isListicle: true },
  { pattern: /\bmethods?\b/i, type: 'methods', isListicle: true },
  { pattern: /\btechniques?\b/i, type: 'techniques', isListicle: true },
  { pattern: /\boptions?\b/i, type: 'options', isListicle: true },
  { pattern: /\balternatives?\b/i, type: 'alternatives', isListicle: true },
  { pattern: /\bthings?\b/i, type: 'things', isListicle: true },
  { pattern: /\bmoments?\b/i, type: 'moments', isListicle: true },
  { pattern: /\bitems?\b/i, type: 'items', isListicle: true },

  // Statement promises
  { pattern: /\bcomplete\s+guide\b|\bultimate\s+guide\b|\bguide\s+to\b/i, type: 'guide', isListicle: false },
  { pattern: /\breview\b/i, type: 'review', isListicle: false },
  { pattern: /\banalysis\b|\banalyze\b/i, type: 'analysis', isListicle: false },
  { pattern: /\boverview\b/i, type: 'overview', isListicle: false },
  { pattern: /\bcomparison\b|\bvs\.?\b|\bversus\b/i, type: 'comparison', isListicle: false },
  { pattern: /\btutorial\b/i, type: 'tutorial', isListicle: false },
  { pattern: /\bbreakdown\b/i, type: 'breakdown', isListicle: false },
  { pattern: /\bexplained\b/i, type: 'explained', isListicle: false },
  { pattern: /\b(best|top|greatest|essential|must-have|recommended)\b/i, type: 'selection', isListicle: false },

  // Question promises
  { pattern: /^how\s+to\b/i, type: 'how-to', isListicle: false },
  { pattern: /^what\s+is\b|^what\s+are\b/i, type: 'what-is', isListicle: false },
  { pattern: /^why\s+/i, type: 'why-does', isListicle: false },
  { pattern: /^when\s+to\b|^when\s+should\b/i, type: 'when-to', isListicle: false },
  { pattern: /^which\s+/i, type: 'which-is', isListicle: false },
  { pattern: /^can\s+you\b|^can\s+i\b/i, type: 'can-you', isListicle: false },
  { pattern: /^should\s+you\b|^should\s+i\b/i, type: 'should-you', isListicle: false },
]

/**
 * Words to strip when extracting subject
 */
const SUBJECT_STRIP_WORDS = [
  'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'with', 'your', 'my', 'our',
  'best', 'top', 'ultimate', 'complete', 'essential', 'amazing', 'incredible',
  'perfect', 'easy', 'simple', 'quick', 'fast', 'delicious', 'healthy',
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the count (number) from a listicle H1
 * 
 * @param h1 - The H1 text
 * @returns The count number or null if not found
 * 
 * @example
 * extractListicleCount("5 Delicious Taco Recipes") // 5
 * extractListicleCount("Top 10 Tips for Success") // 10
 * extractListicleCount("Complete Guide to Cooking") // null
 */
export function extractListicleCount(h1: string): number | null {
  const trimmed = h1.trim()

  for (const pattern of LISTICLE_COUNT_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match && match[1]) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > 0 && num <= 100) {
        return num
      }
    }
  }

  // Fallback: check for word numbers at start of H1 (e.g., "Seven Benefits...")
  const wordNumberMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
  }
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase()
  if (firstWord && wordNumberMap[firstWord]) {
    return wordNumberMap[firstWord]
  }

  return null
}

/**
 * Detect the promise type from H1 text
 * 
 * @param h1 - The H1 text
 * @returns Object with promise type and whether it's a listicle promise
 * 
 * @example
 * extractPromiseType("5 Delicious Taco Recipes") // { type: 'recipes', isListicle: true }
 * extractPromiseType("Complete Guide to Tacos") // { type: 'guide', isListicle: false }
 */
export function extractPromiseType(h1: string): { type: PromiseType; isListicle: boolean } {
  const trimmed = h1.trim()

  // Check for numbered listicle first - if it has a number, it's likely a listicle promise
  const hasNumber = extractListicleCount(trimmed) !== null

  for (const { pattern, type, isListicle } of PROMISE_TYPE_PATTERNS) {
    if (pattern.test(trimmed)) {
      // If H1 has a number but pattern says not listicle, override to listicle
      return { type, isListicle: hasNumber || isListicle }
    }
  }

  // If has number but no specific type found, it's a generic listicle
  if (hasNumber) {
    return { type: 'items', isListicle: true }
  }

  return { type: 'generic', isListicle: false }
}

/**
 * Extract the main subject from H1
 * 
 * @param h1 - The H1 text
 * @returns The extracted subject
 * 
 * @example
 * extractPromiseSubject("5 Delicious Italian-Style Ground Beef Taco Recipes") 
 * // "Italian-Style Ground Beef Taco"
 */
export function extractPromiseSubject(h1: string): string {
  let subject = h1.trim()

  // Remove leading number
  subject = subject.replace(/^\d+\s+/, '')

  // Remove promise type words
  const promiseTypeWords = [
    'recipes?', 'reasons?', 'ways?', 'tips?', 'benefits?', 'features?',
    'examples?', 'products?', 'ideas?', 'steps?', 'facts?', 'mistakes?',
    'secrets?', 'strategies?', 'strategy', 'methods?', 'techniques?',
    'options?', 'alternatives?', 'things?', 'moments?', 'items?',
    'guide', 'review', 'analysis', 'overview', 'comparison', 'tutorial',
    'breakdown', 'explained', 'complete', 'ultimate', 'best', 'top',
  ]

  const promiseTypePattern = new RegExp(`\\b(${promiseTypeWords.join('|')})\\b`, 'gi')
  subject = subject.replace(promiseTypePattern, '')

  // Remove question words at start
  subject = subject.replace(/^(how|what|why|when|which|can|should)\s+(to|is|are|does|do|you|i)\s*/i, '')

  // Remove trailing question mark
  subject = subject.replace(/\?$/, '')

  // Remove common filler words
  const fillerPattern = new RegExp(`\\b(${SUBJECT_STRIP_WORDS.join('|')})\\b`, 'gi')
  subject = subject.replace(fillerPattern, '')

  // Remove "to Try", "to Make", etc. at end
  subject = subject.replace(/\s+to\s+\w+$/, '')

  // Clean up whitespace
  subject = subject.replace(/\s+/g, ' ').trim()

  // Capitalize first letter of each word
  subject = subject
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return subject || 'Topic'
}

/**
 * Extract the action/verb phrase from H1
 * 
 * @param h1 - The H1 text
 * @returns The action phrase (what reader will do/learn)
 * 
 * @example
 * extractPromiseAction("5 Delicious Taco Recipes to Try") // "to Try"
 * extractPromiseAction("How to Make Perfect Tacos") // "Make Perfect Tacos"
 */
export function extractPromiseAction(h1: string): string {
  const trimmed = h1.trim()

  // "to Try", "to Make", "to Cook", etc.
  const toActionMatch = trimmed.match(/\bto\s+(\w+(?:\s+\w+)?)\s*\??$/i)
  if (toActionMatch) {
    return `to ${toActionMatch[1]}`
  }

  // "How to X" - extract the action
  const howToMatch = trimmed.match(/^how\s+to\s+(.+?)\??$/i)
  if (howToMatch) {
    return howToMatch[1]
  }

  // "Guide to X" - extract what the guide covers
  const guideToMatch = trimmed.match(/guide\s+to\s+(.+?)\??$/i)
  if (guideToMatch) {
    return `learn about ${guideToMatch[1]}`
  }

  // For reviews - the action is evaluating
  if (/\breview\b/i.test(trimmed)) {
    return 'evaluate'
  }

  // For comparisons - the action is comparing
  if (/\bcomparison\b|\bvs\.?\b|\bversus\b/i.test(trimmed)) {
    return 'compare'
  }

  // Default based on promise type
  const { type } = extractPromiseType(trimmed)
  switch (type) {
    case 'recipes': return 'cook'
    case 'tips': return 'improve'
    case 'steps': return 'follow'
    case 'facts': return 'learn'
    case 'mistakes': return 'avoid'
    case 'how-to': return 'accomplish'
    default: return 'discover'
  }
}

/**
 * Check if H1 is a question
 */
export function isQuestionH1(h1: string): boolean {
  const trimmed = h1.trim()
  return trimmed.endsWith('?') || /^(how|what|why|when|which|can|should|is|are|do|does)\s+/i.test(trimmed)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the complete promise from an H1 heading
 * 
 * @param h1 - The H1 text to analyze
 * @returns ExtractedPromise object with all promise details
 * 
 * @example
 * extractH1Promise("5 Delicious Italian-Style Ground Beef Taco Recipes to Try")
 * // {
 * //   h1: "5 Delicious Italian-Style Ground Beef Taco Recipes to Try",
 * //   count: 5,
 * //   promiseType: 'recipes',
 * //   subject: "Italian-Style Ground Beef Taco",
 * //   action: "to Try",
 * //   isListicle: true,
 * //   isQuestion: false,
 * //   confidence: 0.95
 * // }
 */
export function extractH1Promise(h1: string): ExtractedPromise {
  const trimmed = h1.trim()

  // Extract components
  const count = extractListicleCount(trimmed)
  const { type: promiseType, isListicle } = extractPromiseType(trimmed)
  const subject = extractPromiseSubject(trimmed)
  const action = extractPromiseAction(trimmed)
  const isQuestion = isQuestionH1(trimmed)

  // Calculate confidence based on how well we could extract
  let confidence = 0.5

  // High confidence if we found a count for listicle
  if (isListicle && count !== null) {
    confidence += 0.25
  }

  // High confidence if we found a specific promise type
  if (promiseType !== 'generic' && promiseType !== 'items') {
    confidence += 0.15
  }

  // Good confidence if subject is meaningful
  if (subject && subject !== 'Topic' && subject.length > 3) {
    confidence += 0.1
  }

  // Cap at 1.0
  confidence = Math.min(1.0, confidence)

  return {
    h1: trimmed,
    count,
    promiseType,
    subject,
    action,
    isListicle,
    isQuestion,
    confidence,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE DESCRIPTION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable description of what the H1 promises
 * Used in prompts to help AI understand what H2s should deliver
 * 
 * @param promise - The extracted promise
 * @returns Human-readable promise description
 */
export function describePromise(promise: ExtractedPromise): string {
  if (promise.isListicle && promise.count !== null) {
    const itemType = getItemTypeLabel(promise.promiseType)
    return `This H1 promises ${promise.count} ${itemType} about "${promise.subject}". Each H2 MUST represent ONE distinct ${itemType.replace(/s$/, '')}.`
  }

  if (promise.isQuestion) {
    return `This H1 asks a question about "${promise.subject}". H2s should collectively provide a comprehensive answer to this question.`
  }

  // Statement
  const coverageType = getCoverageTypeLabel(promise.promiseType)
  return `This H1 promises ${coverageType} of "${promise.subject}". H2s should comprehensively cover all essential aspects.`
}

/**
 * Get the item type label for listicle promises
 */
function getItemTypeLabel(promiseType: PromiseType): string {
  const labels: Record<PromiseType, string> = {
    recipes: 'unique recipes',
    reasons: 'distinct reasons',
    ways: 'different ways/methods',
    tips: 'actionable tips',
    benefits: 'specific benefits',
    features: 'key features',
    examples: 'concrete examples',
    products: 'product options',
    ideas: 'creative ideas',
    steps: 'sequential steps',
    facts: 'interesting facts',
    mistakes: 'common mistakes',
    secrets: 'insider secrets',
    strategies: 'effective strategies',
    methods: 'different methods',
    techniques: 'specific techniques',
    options: 'available options',
    alternatives: 'alternative choices',
    things: 'important things',
    moments: 'notable moments',
    items: 'distinct items',
    guide: 'sections',
    review: 'aspects',
    analysis: 'points',
    overview: 'areas',
    comparison: 'comparisons',
    tutorial: 'lessons',
    breakdown: 'parts',
    explained: 'explanations',
    'how-to': 'steps',
    'what-is': 'aspects',
    'why-does': 'reasons',
    'when-to': 'situations',
    'which-is': 'options',
    'can-you': 'possibilities',
    'should-you': 'considerations',
    'selection': 'selection',
    generic: 'points',
  }
  return labels[promiseType] || 'items'
}

/**
 * Get the coverage type label for statement promises
 */
function getCoverageTypeLabel(promiseType: PromiseType): string {
  const labels: Record<string, string> = {
    guide: 'a complete guide',
    review: 'an in-depth review',
    analysis: 'a thorough analysis',
    overview: 'a comprehensive overview',
    comparison: 'a detailed comparison',
    tutorial: 'a step-by-step tutorial',
    breakdown: 'a detailed breakdown',
    explained: 'a clear explanation',
    generic: 'comprehensive coverage',
  }
  return labels[promiseType] || 'comprehensive coverage'
}

/**
 * Get anti-pattern examples for a promise type
 * These are H2s that would NOT fulfill the promise
 */
export function getAntiPatterns(promise: ExtractedPromise, articleType: ArticleType): string[] {
  const antiPatterns: string[] = []

  if (promise.isListicle) {
    antiPatterns.push(
      `"Introduction to ${promise.subject}" - Generic intro, not a specific ${getItemTypeLabel(promise.promiseType).replace(/s$/, '')}`,
      `"History of ${promise.subject}" - Background info, not fulfilling the list promise`,
      `"Conclusion" - Wrap-up, not a list item`,
      `"Why ${promise.subject} Matters" - Explanation, not a specific item`,
    )

    if (promise.promiseType === 'recipes') {
      antiPatterns.push(
        `"Essential Ingredients" - Ingredient list, not a recipe`,
        `"Cooking Tips" - Tips section, not a specific recipe`,
      )
    }

    if (articleType === 'review') {
      antiPatterns.push(
        `"About ${promise.subject}" - Informational, not evaluative`,
        `"How ${promise.subject} Works" - Explanation, not evaluation`,
      )
    }
  }

  return antiPatterns
}

/**
 * Get good example H2 patterns for a promise type
 */
export function getGoodExamples(promise: ExtractedPromise, articleType: ArticleType): string[] {
  const examples: string[] = []
  const subject = promise.subject || 'Topic'

  if (promise.isListicle && promise.count !== null) {
    switch (promise.promiseType) {
      case 'recipes':
        examples.push(
          `"1. Classic ${subject} with Fresh Herbs"`,
          `"2. Spicy ${subject} Variation"`,
          `"3. Creamy Parmesan ${subject}"`,
        )
        break
      case 'reasons':
        if (articleType === 'review') {
          examples.push(
            `"1. Exceptional Build Quality"`,
            `"2. Outstanding Value for Money"`,
            `"3. Superior Performance Metrics"`,
          )
        } else {
          examples.push(
            `"1. Improved Efficiency"`,
            `"2. Cost Savings"`,
            `"3. Better Results"`,
          )
        }
        break
      case 'tips':
        examples.push(
          `"1. Start with Quality Ingredients"`,
          `"2. Master the Basic Technique"`,
          `"3. Practice Timing and Temperature"`,
        )
        break
      case 'steps':
        examples.push(
          `"1. Gather Your Materials"`,
          `"2. Prepare Your Workspace"`,
          `"3. Begin the Process"`,
        )
        break
      case 'facts':
        examples.push(
          `"1. ${subject} Originated in [Place]"`,
          `"2. Over [Number] People Use ${subject}"`,
          `"3. ${subject} Has [Interesting Property]"`,
        )
        break
      default:
        examples.push(
          `"1. [Specific ${getItemTypeLabel(promise.promiseType).replace(/s$/, '')} about ${subject}]"`,
          `"2. [Another distinct item]"`,
          `"3. [Third unique item]"`,
        )
    }
  }

  return examples
}
