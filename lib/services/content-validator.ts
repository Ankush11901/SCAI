/**
 * Content Validator
 * 
 * Post-generation validation for AI-generated content.
 * Checks compliance with SCAI production specifications:
 * - Forbidden phrases
 * - Symbol usage
 * - Word counts (±5 tolerance)
 * - Character limits
 * - H1/H2 format consistency
 */

import {
  FORBIDDEN_PHRASES,
  APPROVED_SYMBOLS,
  CHARACTER_LIMITS,
  WORD_COUNT_RULES,
  HEADER_CONSISTENCY_RULES,
  type VariationType,
} from '@/lib/ai/rules/forbidden-content'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  component: string
  rule: string
  message: string
  severity: ValidationSeverity
  suggestion?: string
  location?: {
    field: string
    value?: string
    expected?: string
  }
}

export interface ValidationResult {
  isValid: boolean
  score: number  // 0-100 compliance score
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  info: ValidationIssue[]
  summary: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
}

export interface ArticleContent {
  h1?: string
  h2s?: string[]
  closingH2?: string
  overviewParagraph?: string
  standardParagraphs?: string[]
  closingParagraph?: string
  faqH2?: string
  faqQuestions?: string[]
  faqAnswers?: string[]
  metaTitle?: string
  metaDescription?: string
  featuredImageAlt?: string
  h2ImageAlts?: string[]  // Alt texts for H2 section images
  variation?: VariationType
  articleType?: string
  // Component-specific
  productCards?: Array<{ h2: string; description: string }>
  prosCons?: { pros: string[]; cons: string[] }
  rating?: { h2: string; paragraph: string; score: number }
  ingredients?: string
  instructions?: string
  tips?: string
  nutrition?: { content: string; disclaimer?: string }
  quickFacts?: { h2: string; content: string }
  honorableMentions?: { h2: string; items: Array<{ h3: string; description: string }> }
  whyChooseLocal?: { h2: string; content: string }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Check if word count is within tolerance
 */
export function isWordCountValid(
  actual: number,
  target: number,
  tolerance: number = 5
): { valid: boolean; difference: number } {
  const difference = actual - target
  return {
    valid: Math.abs(difference) <= tolerance,
    difference,
  }
}

/**
 * Check if character count is within limits
 */
export function isCharacterCountValid(
  text: string,
  limits: { min?: number; max: number }
): { valid: boolean; length: number; issue?: string } {
  const length = text.length

  if (limits.min && length < limits.min) {
    return { valid: false, length, issue: `too short (${length} < ${limits.min})` }
  }
  if (length > limits.max) {
    return { valid: false, length, issue: `too long (${length} > ${limits.max})` }
  }

  return { valid: true, length }
}

/**
 * Check for forbidden phrases in text
 */
export function findForbiddenPhrases(
  text: string,
  context: keyof typeof FORBIDDEN_PHRASES
): string[] {
  const phrases = FORBIDDEN_PHRASES[context]
  const found: string[] = []
  const lowerText = text.toLowerCase()

  for (const phrase of phrases) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase)
    }
  }

  return found
}

/**
 * Check if text starts with forbidden phrase
 */
export function startsWithForbidden(text: string): string | null {
  const trimmed = text.trim().toLowerCase()

  for (const phrase of FORBIDDEN_PHRASES.closingParagraphStart) {
    if (trimmed.startsWith(phrase.toLowerCase())) {
      return phrase
    }
  }

  return null
}

/**
 * Find unapproved symbols or emojis
 */
export function findUnapprovedSymbols(text: string): string[] {
  const found: string[] = []

  // Emoji regex (comprehensive)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu
  const emojis = text.match(emojiRegex) || []
  found.push(...emojis)

  return [...new Set(found)]
}

/**
 * Validate H2 format consistency with H1 variation
 */
export function validateH2Format(
  h2: string,
  variation: VariationType,
  isNumbered: boolean = false
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for "and"
  if (/\band\b/i.test(h2)) {
    issues.push('contains "and" - H2s must be single-focused')
  }

  // Check for "or"
  if (/\bor\b/i.test(h2)) {
    issues.push('contains "or" - H2s must be single-focused')
  }

  // Check for colons
  if (h2.includes(':') && !isNumbered) {
    issues.push('contains colon - not allowed in H2')
  }

  // Check format consistency
  if (variation === 'question' && !h2.trim().endsWith('?')) {
    issues.push('must end with "?" for Question format')
  }
  if (variation === 'statement' && h2.includes('?')) {
    issues.push('must not contain "?" for Statement format')
  }
  if (variation === 'listicle' && !/^\d+\.?\s/.test(h2) && isNumbered) {
    issues.push('must start with a number for Listicle format')
  }

  return { valid: issues.length === 0, issues }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate H1 heading
 */
function validateH1(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.h1) return

  const h1 = content.h1
  const variation = content.variation || 'statement'

  // Check character limits
  const charCheck = isCharacterCountValid(h1, CHARACTER_LIMITS.h1)
  if (!charCheck.valid) {
    issues.push({
      component: 'h1',
      rule: 'character_limit',
      message: `H1 ${charCheck.issue}`,
      severity: 'error',
      location: { field: 'h1', value: h1, expected: `${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} chars` },
    })
  }

  // Check for generic filler phrases
  const genericFound = findForbiddenPhrases(h1, 'h1Generic')
  for (const phrase of genericFound) {
    issues.push({
      component: 'h1',
      rule: 'forbidden_phrase',
      message: `H1 contains generic filler phrase: "${phrase}"`,
      severity: 'warning',
      suggestion: 'Use more specific, creative language',
      location: { field: 'h1', value: h1 },
    })
  }

  // Check format consistency
  if (variation === 'question' && !h1.trim().endsWith('?')) {
    issues.push({
      component: 'h1',
      rule: 'format_consistency',
      message: 'H1 should end with "?" for Question variation',
      severity: 'error',
      location: { field: 'h1', value: h1 },
    })
  }
  if (variation === 'statement' && h1.includes('?')) {
    issues.push({
      component: 'h1',
      rule: 'format_consistency',
      message: 'H1 should not contain "?" for Statement variation',
      severity: 'error',
      location: { field: 'h1', value: h1 },
    })
  }
  if (variation === 'listicle' && !/^\d+/.test(h1)) {
    issues.push({
      component: 'h1',
      rule: 'format_consistency',
      message: 'H1 should start with a number for Listicle variation',
      severity: 'error',
      location: { field: 'h1', value: h1 },
    })
  }
}

/**
 * Validate H2 headings
 */
function validateH2s(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.h2s) return

  const variation = content.variation || 'statement'
  const isListicle = variation === 'listicle'

  for (let i = 0; i < content.h2s.length; i++) {
    const h2 = content.h2s[i]
    const componentName = `h2_${i + 1}`

    // Check character limits
    const charCheck = isCharacterCountValid(h2, CHARACTER_LIMITS.h2)
    if (!charCheck.valid) {
      issues.push({
        component: componentName,
        rule: 'character_limit',
        message: `H2 #${i + 1} ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'h2', value: h2, expected: `${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} chars` },
      })
    }

    // Check format consistency
    const formatCheck = validateH2Format(h2, variation, isListicle)
    for (const issue of formatCheck.issues) {
      issues.push({
        component: componentName,
        rule: 'format_consistency',
        message: `H2 #${i + 1} ${issue}`,
        severity: 'error',
        location: { field: 'h2', value: h2 },
      })
    }

    // Check for emojis
    const emojis = findUnapprovedSymbols(h2)
    if (emojis.length > 0) {
      issues.push({
        component: componentName,
        rule: 'symbol_usage',
        message: `H2 #${i + 1} contains unapproved symbols: ${emojis.join(', ')}`,
        severity: 'error',
        location: { field: 'h2', value: h2 },
      })
    }
  }
}

/**
 * Validate closing H2
 */
function validateClosingH2(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.closingH2) return

  const h2 = content.closingH2
  const variation = content.variation || 'statement'

  // Check character limits
  const charCheck = isCharacterCountValid(h2, CHARACTER_LIMITS.closingH2)
  if (!charCheck.valid) {
    issues.push({
      component: 'closingH2',
      rule: 'character_limit',
      message: `Closing H2 ${charCheck.issue}`,
      severity: 'error',
      location: { field: 'closingH2', value: h2, expected: `${CHARACTER_LIMITS.closingH2.min}-${CHARACTER_LIMITS.closingH2.max} chars` },
    })
  }

  // Check for forbidden phrases
  const forbidden = findForbiddenPhrases(h2, 'closingH2')
  for (const phrase of forbidden) {
    issues.push({
      component: 'closingH2',
      rule: 'forbidden_phrase',
      message: `Closing H2 contains forbidden phrase: "${phrase}"`,
      severity: 'error',
      suggestion: 'Use descriptive, elaborative heading that matches H1 type',
      location: { field: 'closingH2', value: h2 },
    })
  }

  // Check format consistency (listicle closing H2 is NOT numbered)
  if (variation === 'question' && !h2.trim().endsWith('?')) {
    issues.push({
      component: 'closingH2',
      rule: 'format_consistency',
      message: 'Closing H2 should end with "?" for Question variation',
      severity: 'error',
      location: { field: 'closingH2', value: h2 },
    })
  }
  if (variation === 'statement' && h2.includes('?')) {
    issues.push({
      component: 'closingH2',
      rule: 'format_consistency',
      message: 'Closing H2 should not contain "?" for Statement variation',
      severity: 'error',
      location: { field: 'closingH2', value: h2 },
    })
  }
  // Listicle closing H2 is NOT numbered (structural section)
  if (variation === 'listicle' && /^\d+\.?\s/.test(h2)) {
    issues.push({
      component: 'closingH2',
      rule: 'format_consistency',
      message: 'Closing H2 should NOT be numbered for Listicle (structural section)',
      severity: 'error',
      location: { field: 'closingH2', value: h2 },
    })
  }
}

/**
 * Validate closing paragraph
 */
function validateClosingParagraph(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.closingParagraph) return

  const para = content.closingParagraph

  // Check word count
  const wordCount = countWords(para)
  const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.closingParagraph.target, WORD_COUNT_RULES.closingParagraph.tolerance)
  if (!wordCheck.valid) {
    issues.push({
      component: 'closingParagraph',
      rule: 'word_count',
      message: `Closing paragraph word count (${wordCount}) differs from target (${WORD_COUNT_RULES.closingParagraph.target}) by ${Math.abs(wordCheck.difference)} words`,
      severity: Math.abs(wordCheck.difference) > 10 ? 'error' : 'warning',
      location: { field: 'closingParagraph', expected: `${WORD_COUNT_RULES.closingParagraph.target} ±${WORD_COUNT_RULES.closingParagraph.tolerance} words` },
    })
  }

  // Check for forbidden starting phrases
  const forbiddenStart = startsWithForbidden(para)
  if (forbiddenStart) {
    issues.push({
      component: 'closingParagraph',
      rule: 'forbidden_phrase',
      message: `Closing paragraph starts with forbidden phrase: "${forbiddenStart}"`,
      severity: 'error',
      suggestion: 'End naturally with value reinforcement, not announcements',
      location: { field: 'closingParagraph' },
    })
  }
}

/**
 * Validate overview paragraph
 */
function validateOverviewParagraph(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.overviewParagraph) return

  const para = content.overviewParagraph
  const wordCount = countWords(para)
  const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.overviewParagraph.target, WORD_COUNT_RULES.overviewParagraph.tolerance)

  if (!wordCheck.valid) {
    issues.push({
      component: 'overviewParagraph',
      rule: 'word_count',
      message: `Overview paragraph word count (${wordCount}) differs from target (${WORD_COUNT_RULES.overviewParagraph.target}) by ${Math.abs(wordCheck.difference)} words`,
      severity: Math.abs(wordCheck.difference) > 10 ? 'error' : 'warning',
      location: { field: 'overviewParagraph', expected: `${WORD_COUNT_RULES.overviewParagraph.target} ±${WORD_COUNT_RULES.overviewParagraph.tolerance} words` },
    })
  }
}

/**
 * Validate standard paragraphs
 */
function validateStandardParagraphs(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.standardParagraphs) return

  for (let i = 0; i < content.standardParagraphs.length; i++) {
    const para = content.standardParagraphs[i]
    const wordCount = countWords(para)
    const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.standardParagraph.target, WORD_COUNT_RULES.standardParagraph.tolerance)

    if (!wordCheck.valid) {
      issues.push({
        component: `paragraph_${i + 1}`,  // Match corrector's expected format
        rule: 'word_count',
        message: `Standard paragraph #${i + 1} word count (${wordCount}) differs from target (${WORD_COUNT_RULES.standardParagraph.target}) by ${Math.abs(wordCheck.difference)} words`,
        severity: Math.abs(wordCheck.difference) > 15 ? 'error' : 'warning',
        location: { field: 'standardParagraph', expected: `${WORD_COUNT_RULES.standardParagraph.target} ±${WORD_COUNT_RULES.standardParagraph.tolerance} words` },
      })
    }
  }
}

/**
 * Validate FAQ section
 */
function validateFAQ(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  // Validate FAQ H2
  if (content.faqH2) {
    const charCheck = isCharacterCountValid(content.faqH2, CHARACTER_LIMITS.faqH2)
    if (!charCheck.valid) {
      issues.push({
        component: 'faqH2',
        rule: 'character_limit',
        message: `FAQ H2 ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'faqH2', value: content.faqH2, expected: `max ${CHARACTER_LIMITS.faqH2.max} chars` },
      })
    }
  }

  // Validate FAQ questions
  if (content.faqQuestions) {
    for (let i = 0; i < content.faqQuestions.length; i++) {
      const question = content.faqQuestions[i]

      // Check character limits
      const charCheck = isCharacterCountValid(question, CHARACTER_LIMITS.faqH3)
      if (!charCheck.valid) {
        issues.push({
          component: `faqQuestion_${i + 1}`,
          rule: 'character_limit',
          message: `FAQ question #${i + 1} ${charCheck.issue}`,
          severity: 'warning',
          location: { field: 'faqQuestion', value: question, expected: `${CHARACTER_LIMITS.faqH3.min}-${CHARACTER_LIMITS.faqH3.max} chars` },
        })
      }

      // Check ends with ?
      if (!question.trim().endsWith('?')) {
        issues.push({
          component: `faqQuestion_${i + 1}`,
          rule: 'format',
          message: `FAQ question #${i + 1} must end with "?"`,
          severity: 'error',
          location: { field: 'faqQuestion', value: question },
        })
      }

      // Check for multiple questions
      if ((question.match(/\?/g) || []).length > 1) {
        issues.push({
          component: `faqQuestion_${i + 1}`,
          rule: 'format',
          message: `FAQ question #${i + 1} contains multiple questions - each FAQ must be single, focused`,
          severity: 'error',
          location: { field: 'faqQuestion', value: question },
        })
      }
    }
  }

  // Validate FAQ answers
  if (content.faqAnswers) {
    for (let i = 0; i < content.faqAnswers.length; i++) {
      const answer = content.faqAnswers[i]
      const wordCount = countWords(answer)
      const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.faqAnswer.target, WORD_COUNT_RULES.faqAnswer.tolerance)

      if (!wordCheck.valid) {
        issues.push({
          component: `faqAnswer_${i + 1}`,
          rule: 'word_count',
          message: `FAQ answer #${i + 1} word count (${wordCount}) differs from target (${WORD_COUNT_RULES.faqAnswer.target}) by ${Math.abs(wordCheck.difference)} words`,
          severity: Math.abs(wordCheck.difference) > 5 ? 'error' : 'warning',
          location: { field: 'faqAnswer', expected: `${WORD_COUNT_RULES.faqAnswer.target} ±${WORD_COUNT_RULES.faqAnswer.tolerance} words` },
        })
      }
    }
  }
}

/**
 * Validate meta content
 */
function validateMeta(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  // Meta title
  if (content.metaTitle) {
    const charCheck = isCharacterCountValid(content.metaTitle, CHARACTER_LIMITS.metaTitle)
    if (!charCheck.valid) {
      issues.push({
        component: 'metaTitle',
        rule: 'character_limit',
        message: `Meta title ${charCheck.issue}`,
        severity: 'warning',
        location: { field: 'metaTitle', value: content.metaTitle, expected: `${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} chars` },
      })
    }

    // Check for colons in meta title (forbidden per SCAI rules)
    if (content.metaTitle.includes(':')) {
      issues.push({
        component: 'metaTitle',
        rule: 'forbidden_content',
        message: `Meta title contains colon - colons are not allowed`,
        severity: 'error',
        location: { field: 'metaTitle', value: content.metaTitle },
      })
    }
  }

  // Meta description
  if (content.metaDescription) {
    const charCheck = isCharacterCountValid(content.metaDescription, CHARACTER_LIMITS.metaDescription)
    if (!charCheck.valid) {
      issues.push({
        component: 'metaDescription',
        rule: 'character_limit',
        message: `Meta description ${charCheck.issue}`,
        severity: 'warning',
        location: { field: 'metaDescription', value: content.metaDescription, expected: `${CHARACTER_LIMITS.metaDescription.min}-${CHARACTER_LIMITS.metaDescription.max} chars` },
      })
    }
  }

  // Featured image alt
  if (content.featuredImageAlt) {
    const charCheck = isCharacterCountValid(content.featuredImageAlt, CHARACTER_LIMITS.featuredImageAlt)
    if (!charCheck.valid) {
      issues.push({
        component: 'featuredImageAlt',
        rule: 'character_limit',
        message: `Featured image alt ${charCheck.issue}`,
        severity: 'info',
        location: { field: 'featuredImageAlt', value: content.featuredImageAlt, expected: `${CHARACTER_LIMITS.featuredImageAlt.min}-${CHARACTER_LIMITS.featuredImageAlt.max} chars` },
      })
    }

    // Check for "Image of" prefix (forbidden)
    if (content.featuredImageAlt.toLowerCase().startsWith('image of')) {
      issues.push({
        component: 'featuredImageAlt',
        rule: 'forbidden_content',
        message: `Featured image alt should not start with "Image of"`,
        severity: 'warning',
        location: { field: 'featuredImageAlt', value: content.featuredImageAlt },
      })
    }
  }

  // H2 section image alts
  if (content.h2ImageAlts && content.h2ImageAlts.length > 0) {
    for (let i = 0; i < content.h2ImageAlts.length; i++) {
      const alt = content.h2ImageAlts[i]
      const componentName = `h2ImageAlt_${i + 1}`

      const charCheck = isCharacterCountValid(alt, CHARACTER_LIMITS.h2ImageAlt)
      if (!charCheck.valid) {
        issues.push({
          component: componentName,
          rule: 'character_limit',
          message: `H2 image #${i + 1} alt ${charCheck.issue}`,
          severity: 'info',
          location: { field: 'h2ImageAlt', value: alt, expected: `${CHARACTER_LIMITS.h2ImageAlt.min}-${CHARACTER_LIMITS.h2ImageAlt.max} chars` },
        })
      }

      // Check for "Image of" prefix
      if (alt.toLowerCase().startsWith('image of')) {
        issues.push({
          component: componentName,
          rule: 'forbidden_content',
          message: `H2 image #${i + 1} alt should not start with "Image of"`,
          severity: 'warning',
          location: { field: 'h2ImageAlt', value: alt },
        })
      }
    }
  }
}

/**
 * Validate special H2s (Rating, Quick Facts, etc.)
 */
function validateSpecialH2s(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  // Rating H2
  if (content.rating?.h2) {
    const charCheck = isCharacterCountValid(content.rating.h2, CHARACTER_LIMITS.ratingH2)
    if (!charCheck.valid) {
      issues.push({
        component: 'ratingH2',
        rule: 'character_limit',
        message: `Rating H2 ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'ratingH2', value: content.rating.h2, expected: `max ${CHARACTER_LIMITS.ratingH2.max} chars` },
      })
    }
  }

  // Quick Facts H2
  if (content.quickFacts?.h2) {
    const charCheck = isCharacterCountValid(content.quickFacts.h2, CHARACTER_LIMITS.quickFactsH2)
    if (!charCheck.valid) {
      issues.push({
        component: 'quickFactsH2',
        rule: 'character_limit',
        message: `Quick Facts H2 ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'quickFactsH2', value: content.quickFacts.h2, expected: `${CHARACTER_LIMITS.quickFactsH2.min}-${CHARACTER_LIMITS.quickFactsH2.max} chars` },
      })
    }
  }

  // Honorable Mentions H2
  if (content.honorableMentions?.h2) {
    const charCheck = isCharacterCountValid(content.honorableMentions.h2, CHARACTER_LIMITS.honorableMentionsH2)
    if (!charCheck.valid) {
      issues.push({
        component: 'honorableMentionsH2',
        rule: 'character_limit',
        message: `Honorable Mentions H2 ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'honorableMentionsH2', value: content.honorableMentions.h2, expected: `${CHARACTER_LIMITS.honorableMentionsH2.min}-${CHARACTER_LIMITS.honorableMentionsH2.max} chars` },
      })
    }
  }

  // Why Choose Local H2
  if (content.whyChooseLocal?.h2) {
    const charCheck = isCharacterCountValid(content.whyChooseLocal.h2, CHARACTER_LIMITS.whyChooseLocalH2)
    if (!charCheck.valid) {
      issues.push({
        component: 'whyChooseLocalH2',
        rule: 'character_limit',
        message: `Why Choose Local H2 ${charCheck.issue}`,
        severity: 'error',
        location: { field: 'whyChooseLocalH2', value: content.whyChooseLocal.h2, expected: `${CHARACTER_LIMITS.whyChooseLocalH2.min}-${CHARACTER_LIMITS.whyChooseLocalH2.max} chars` },
      })
    }
  }
}

/**
 * Validate recipe-specific content
 */
function validateRecipeContent(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  // Ingredients word count
  if (content.ingredients) {
    const wordCount = countWords(content.ingredients)
    const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.ingredientsList.target, WORD_COUNT_RULES.ingredientsList.tolerance)

    if (!wordCheck.valid) {
      issues.push({
        component: 'ingredients',
        rule: 'word_count',
        message: `Ingredients word count (${wordCount}) differs from target (${WORD_COUNT_RULES.ingredientsList.target}) by ${Math.abs(wordCheck.difference)} words`,
        severity: 'warning',
        location: { field: 'ingredients', expected: `${WORD_COUNT_RULES.ingredientsList.target} ±${WORD_COUNT_RULES.ingredientsList.tolerance} words` },
      })
    }
  }

  // Instructions word count
  if (content.instructions) {
    const wordCount = countWords(content.instructions)
    if (wordCount < WORD_COUNT_RULES.instructions.min || wordCount > WORD_COUNT_RULES.instructions.max) {
      issues.push({
        component: 'instructions',
        rule: 'word_count',
        message: `Instructions word count (${wordCount}) outside range`,
        severity: 'warning',
        location: { field: 'instructions', expected: `${WORD_COUNT_RULES.instructions.min}-${WORD_COUNT_RULES.instructions.max} words` },
      })
    }
  }

  // Tips word count
  if (content.tips) {
    const wordCount = countWords(content.tips)
    const wordCheck = isWordCountValid(wordCount, WORD_COUNT_RULES.tipsParagraph.target, WORD_COUNT_RULES.tipsParagraph.tolerance)

    if (!wordCheck.valid) {
      issues.push({
        component: 'tips',
        rule: 'word_count',
        message: `Tips word count (${wordCount}) differs from target (${WORD_COUNT_RULES.tipsParagraph.target}) by ${Math.abs(wordCheck.difference)} words`,
        severity: 'warning',
        location: { field: 'tips', expected: `${WORD_COUNT_RULES.tipsParagraph.target} ±${WORD_COUNT_RULES.tipsParagraph.tolerance} words` },
      })
    }
  }

  // Nutrition disclaimer
  if (content.nutrition && !content.nutrition.disclaimer) {
    issues.push({
      component: 'nutrition',
      rule: 'required_field',
      message: 'Nutrition table missing required disclaimer',
      severity: 'error',
      suggestion: 'Add: "Approximate nutritional values. Actual nutrition may vary."',
      location: { field: 'nutrition.disclaimer' },
    })
  }
}

/**
 * Validate listicle ODD count
 */
function validateListicleCount(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (content.articleType !== 'listicle') return
  if (!content.h2s) return

  const count = content.h2s.length

  // Check if ODD
  if (count % 2 === 0) {
    issues.push({
      component: 'listicle',
      rule: 'item_count',
      message: `Listicle has ${count} items (even number) - must be ODD (5, 7, 9, 11, etc.)`,
      severity: 'error',
      suggestion: 'Add or remove one item to make count odd',
      location: { field: 'h2s', expected: 'ODD number (5, 7, 9, 11, 13, 15, 17, 19, 21, 23)' },
    })
  }

  // Check range
  if (count < 5) {
    issues.push({
      component: 'listicle',
      rule: 'item_count',
      message: `Listicle has ${count} items - minimum is 5`,
      severity: 'error',
      location: { field: 'h2s', expected: 'minimum 5 items' },
    })
  }
  if (count > 23) {
    issues.push({
      component: 'listicle',
      rule: 'item_count',
      message: `Listicle has ${count} items - maximum is 23`,
      severity: 'error',
      location: { field: 'h2s', expected: 'maximum 23 items' },
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE FULFILLMENT VALIDATION (Phase 4.4)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  extractH1Promise,
  extractListicleCount as extractH1ListicleCount,
} from '@/lib/ai/utils/h1-promise-extractor'
import {
  detectDuplicateH2s,
  validatePromiseFulfillment as validateH2sPromise,
} from '@/lib/ai/utils/promise-fulfillment-rules'

/**
 * Validate that H1 promise is fulfilled by H2s
 * For listicle variation: H2 count MUST match H1 number
 */
function validateListiclePromise(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  // Only validate listicle variation
  if (content.variation !== 'listicle') return
  if (!content.h1 || !content.h2s) return

  // Extract promised count from H1
  const promisedCount = extractH1ListicleCount(content.h1)
  const actualCount = content.h2s.length

  if (promisedCount === null) {
    // H1 doesn't have a number - warning for listicle
    issues.push({
      component: 'h1_promise',
      rule: 'listicle_number',
      message: `Listicle H1 "${content.h1}" doesn't contain a number`,
      severity: 'warning',
      suggestion: 'Add a number to the H1 (e.g., "5 Best Ways to...")',
      location: { field: 'h1', value: content.h1 },
    })
    return
  }

  if (actualCount !== promisedCount) {
    issues.push({
      component: 'h1_promise',
      rule: 'promise_count_match',
      message: `H1 promises ${promisedCount} items but article has ${actualCount} H2s`,
      severity: 'error',
      suggestion: `Adjust H2 count to ${promisedCount} or update H1 to match ${actualCount}`,
      location: {
        field: 'h2s',
        value: String(actualCount),
        expected: String(promisedCount)
      },
    })
  }
}

/**
 * Validate H2s are distinct (no duplicates or near-duplicates)
 */
function validateH2Distinctness(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.h2s || content.h2s.length < 2) return

  const duplicates = detectDuplicateH2s(content.h2s)

  for (const duplicate of duplicates) {
    issues.push({
      component: 'h2_distinctness',
      rule: 'no_duplicates',
      message: `Duplicate/similar H2s detected: ${duplicate}`,
      severity: 'error',
      suggestion: 'Each H2 must cover a unique, distinct topic',
      location: { field: 'h2s' },
    })
  }
}

/**
 * Validate H2s are relevant to the H1 subject
 */
function validateH2Relevance(
  content: ArticleContent,
  issues: ValidationIssue[]
): void {
  if (!content.h1 || !content.h2s || content.h2s.length === 0) return

  // Extract promise from H1
  const promise = extractH1Promise(content.h1)

  // Validate H2s fulfill the promise
  const validation = validateH2sPromise(
    promise,
    content.h2s,
    (content.articleType || 'informational') as any,
    (content.variation || 'statement') as any
  )

  // Report issues if score is low
  if (validation.score < 70) {
    for (const issue of validation.issues) {
      issues.push({
        component: 'h2_relevance',
        rule: 'promise_fulfillment',
        message: issue,
        severity: validation.score < 50 ? 'error' : 'warning',
        suggestion: validation.suggestions[0] || 'Ensure H2s fulfill the H1 promise',
        location: { field: 'h2s' },
      })
    }
  }

  // Add info about promise fulfillment score
  if (validation.score < 100) {
    issues.push({
      component: 'h2_relevance',
      rule: 'promise_score',
      message: `H1/H2 promise fulfillment score: ${validation.score}/100`,
      severity: validation.score >= 70 ? 'info' : 'warning',
      location: { field: 'h2s' },
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate generated article content against SCAI specifications
 * 
 * @param content - The generated article content to validate
 * @returns ValidationResult with errors, warnings, and compliance score
 * 
 * @example
 * ```typescript
 * const result = validateGeneratedContent({
 *   h1: 'Best Wireless Headphones for Gaming',
 *   h2s: ['Sony WH-1000XM5 Review', ...],
 *   variation: 'statement',
 *   articleType: 'affiliate',
 * })
 * 
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors)
 * }
 * ```
 */
export function validateGeneratedContent(content: ArticleContent): ValidationResult {
  const allIssues: ValidationIssue[] = []

  // Run all validation checks
  validateH1(content, allIssues)
  validateH2s(content, allIssues)
  validateClosingH2(content, allIssues)
  validateClosingParagraph(content, allIssues)
  validateOverviewParagraph(content, allIssues)
  validateStandardParagraphs(content, allIssues)
  validateFAQ(content, allIssues)
  validateMeta(content, allIssues)
  validateSpecialH2s(content, allIssues)
  validateRecipeContent(content, allIssues)
  validateListicleCount(content, allIssues)

  // Promise fulfillment validation (Phase 4.4)
  validateListiclePromise(content, allIssues)
  validateH2Distinctness(content, allIssues)
  validateH2Relevance(content, allIssues)

  // Categorize issues by severity
  const errors = allIssues.filter(i => i.severity === 'error')
  const warnings = allIssues.filter(i => i.severity === 'warning')
  const info = allIssues.filter(i => i.severity === 'info')

  // Calculate compliance score (100 = perfect, 0 = all failures)
  const maxPenalty = 100
  const errorPenalty = 10
  const warningPenalty = 3
  const infoPenalty = 1

  const totalPenalty = Math.min(
    maxPenalty,
    errors.length * errorPenalty + warnings.length * warningPenalty + info.length * infoPenalty
  )
  const score = Math.max(0, maxPenalty - totalPenalty)

  return {
    isValid: errors.length === 0,
    score,
    errors,
    warnings,
    info,
    summary: {
      totalIssues: allIssues.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: info.length,
    },
  }
}

/**
 * Quick validation check - returns true/false only
 */
export function isContentValid(content: ArticleContent): boolean {
  return validateGeneratedContent(content).isValid
}

/**
 * Get a human-readable validation report
 */
export function getValidationReport(result: ValidationResult): string {
  const lines: string[] = []

  lines.push(`═══════════════════════════════════════════════════════════════`)
  lines.push(`                    CONTENT VALIDATION REPORT`)
  lines.push(`═══════════════════════════════════════════════════════════════`)
  lines.push(`Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`)
  lines.push(`Compliance Score: ${result.score}/100`)
  lines.push(`Total Issues: ${result.summary.totalIssues} (${result.summary.errorCount} errors, ${result.summary.warningCount} warnings, ${result.summary.infoCount} info)`)
  lines.push('')

  if (result.errors.length > 0) {
    lines.push(`ERRORS (${result.errors.length}):`)
    for (const error of result.errors) {
      lines.push(`  ❌ [${error.component}] ${error.message}`)
      if (error.suggestion) lines.push(`     💡 ${error.suggestion}`)
    }
    lines.push('')
  }

  if (result.warnings.length > 0) {
    lines.push(`WARNINGS (${result.warnings.length}):`)
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ [${warning.component}] ${warning.message}`)
      if (warning.suggestion) lines.push(`     💡 ${warning.suggestion}`)
    }
    lines.push('')
  }

  if (result.info.length > 0) {
    lines.push(`INFO (${result.info.length}):`)
    for (const infoItem of result.info) {
      lines.push(`  ℹ️ [${infoItem.component}] ${infoItem.message}`)
    }
  }

  return lines.join('\n')
}
