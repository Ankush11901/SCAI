/**
 * Content Schemas for AI Article Generation
 * 
 * Defines Zod schemas for article content elements (paragraphs, answers, lists).
 * These schemas enforce strict word count requirements from the documentation.
 * 
 * Used with Vercel AI SDK's generateObject() for structured outputs.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count words in text
 */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Check if word count is within range (±10% tolerance)
 */
function isWithinWordRange(text: string, target: number, tolerance = 0.1): boolean {
  const count = wordCount(text)
  const min = Math.floor(target * (1 - tolerance))
  const max = Math.ceil(target * (1 + tolerance))
  return count >= min && count <= max
}

/**
 * Create word count validation message
 */
function wordCountMessage(target: number, tolerance = 0.1): string {
  const min = Math.floor(target * (1 - tolerance))
  const max = Math.ceil(target * (1 + tolerance))
  return `Content must be ${min}-${max} words (target: ${target})`
}

/**
 * Check if character count is within range
 */
function isWithinCharRange(text: string, min: number, max: number): boolean {
  const length = text.trim().length
  return length >= min && length <= max
}

/**
 * Create character count validation message
 */
function charCountMessage(min: number, max: number): string {
  return `Content must be ${min}-${max} characters`
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PARAGRAPH SCHEMA
// Per documentation: 100 words total (2 paragraphs × 250-300 chars each)
// ═══════════════════════════════════════════════════════════════════════════════

export const OverviewParagraphSchema = z.object({
  /** First paragraph (250-300 chars, ~50 words) */
  paragraph1: z.string()
    .refine(
      (text) => isWithinCharRange(text, 250, 300),
      charCountMessage(250, 300)
    )
    .refine(
      (text) => isWithinWordRange(text, 50, 0.2),
      wordCountMessage(50, 0.2)
    ),
  /** Second paragraph (250-300 chars, ~50 words) */
  paragraph2: z.string()
    .refine(
      (text) => isWithinCharRange(text, 250, 300),
      charCountMessage(250, 300)
    )
    .refine(
      (text) => isWithinWordRange(text, 50, 0.2),
      wordCountMessage(50, 0.2)
    ),
})

/** Simplified overview as single text block */
export const OverviewTextSchema = z.string().refine(
  (text) => isWithinWordRange(text, 100, 0.15),
  wordCountMessage(100, 0.15)
)

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD PARAGRAPH SCHEMA
// Per documentation: 150 words (3×50 sub-paragraphs)
// ═══════════════════════════════════════════════════════════════════════════════

export const StandardParagraphSchema = z.object({
  /** First sub-paragraph (~50 words) */
  paragraph1: z.string().refine(
    (text) => isWithinWordRange(text, 50, 0.2),
    wordCountMessage(50, 0.2)
  ),
  /** Second sub-paragraph (~50 words) */
  paragraph2: z.string().refine(
    (text) => isWithinWordRange(text, 50, 0.2),
    wordCountMessage(50, 0.2)
  ),
  /** Third sub-paragraph (~50 words) */
  paragraph3: z.string().refine(
    (text) => isWithinWordRange(text, 50, 0.2),
    wordCountMessage(50, 0.2)
  ),
})

/** Simplified standard paragraph as single text block */
export const StandardTextSchema = z.string().refine(
  (text) => isWithinWordRange(text, 150, 0.15),
  wordCountMessage(150, 0.15)
)

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING PARAGRAPH SCHEMA
// Per documentation: 50 words
// ═══════════════════════════════════════════════════════════════════════════════

export const ClosingParagraphSchema = z.string().refine(
  (text) => isWithinWordRange(text, 50, 0.2),
  wordCountMessage(50, 0.2)
)

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ ANSWER SCHEMA
// Per documentation: 28 words each
// ═══════════════════════════════════════════════════════════════════════════════

export const FaqAnswerSchema = z.string().refine(
  (text) => isWithinWordRange(text, 28, 0.25),
  wordCountMessage(28, 0.25)
)

/** Multiple FAQ answers */
export const FaqAnswersSchema = z.array(FaqAnswerSchema).min(1).max(5)

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC OVERVIEW SCHEMA (Comparison)
// Per documentation: 80 words (2×40: What + Who)
// ═══════════════════════════════════════════════════════════════════════════════

export const TopicOverviewSchema = z.object({
  /** What paragraph (~40 words) */
  what: z.string().refine(
    (text) => isWithinWordRange(text, 40, 0.2),
    wordCountMessage(40, 0.2)
  ),
  /** Who paragraph (~40 words) */
  who: z.string().refine(
    (text) => isWithinWordRange(text, 40, 0.2),
    wordCountMessage(40, 0.2)
  ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONTENT OUTPUT SCHEMA
// Complete content for one H2 section
// ═══════════════════════════════════════════════════════════════════════════════

export const SectionContentSchema = z.object({
  /** The H2 heading this content belongs to */
  h2: z.string().min(15).max(60),
  /** The main paragraph content (~150 words) */
  content: z.string().refine(
    (text) => isWithinWordRange(text, 150, 0.15),
    wordCountMessage(150, 0.15)
  ),
  /** Image alt text for this section */
  imageAlt: z.string().min(80).max(100).nullable(),
})

export type SectionContent = z.infer<typeof SectionContentSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION PARAGRAPH STRUCTURE VALIDATION
// Each H2 section must have exactly 3 paragraphs with 250-300 characters each
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParagraphValidation {
  index: number
  text: string
  charCount: number
  isValid: boolean
  issue?: string
}

export interface SectionParagraphValidation {
  sectionIndex: number
  h2Title: string
  paragraphCount: number
  isValidCount: boolean
  paragraphs: ParagraphValidation[]
  totalCharacters: number
  isValid: boolean
  issues: string[]
}

/**
 * Character count thresholds for section paragraphs
 */
export const SECTION_PARAGRAPH_CHAR_LIMITS = {
  min: 250,
  target: 250,
  max: 300,
  tolerance: 0.2, // 20% tolerance for edge cases
}

/**
 * Validate a single paragraph's character count
 */
export function validateParagraphCharCount(text: string, index: number): ParagraphValidation {
  const charCount = text.length
  const { min, max, tolerance } = SECTION_PARAGRAPH_CHAR_LIMITS

  // Allow some tolerance below min (200 chars)
  const tolerantMin = Math.floor(min * (1 - tolerance))
  // Allow some tolerance above max (360 chars)
  const tolerantMax = Math.ceil(max * (1 + tolerance))

  let isValid = true
  let issue: string | undefined

  if (charCount < tolerantMin) {
    isValid = false
    issue = `Too short: ${charCount} chars (min: ${min})`
  } else if (charCount > tolerantMax) {
    isValid = false
    issue = `Too long: ${charCount} chars (max: ${max})`
  } else if (charCount < min) {
    // Within tolerance but below ideal
    issue = `Below target: ${charCount} chars (target: ${min}-${max})`
  } else if (charCount > max) {
    // Within tolerance but above ideal
    issue = `Above target: ${charCount} chars (target: ${min}-${max})`
  }

  return { index, text, charCount, isValid, issue }
}

/**
 * Validate section content for 3-paragraph structure with character counts
 */
export function validateSectionParagraphStructure(
  sectionContent: string,
  sectionIndex: number,
  h2Title: string
): SectionParagraphValidation {
  // Split by double newlines to get paragraphs
  const paragraphs = sectionContent
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const paragraphCount = paragraphs.length
  const isValidCount = paragraphCount === 3

  // Validate each paragraph
  const validatedParagraphs = paragraphs.map((text, i) =>
    validateParagraphCharCount(text, i)
  )

  const totalCharacters = validatedParagraphs.reduce((sum, p) => sum + p.charCount, 0)

  // Collect issues
  const issues: string[] = []
  if (!isValidCount) {
    issues.push(`Expected 3 paragraphs, found ${paragraphCount}`)
  }
  validatedParagraphs.forEach((p) => {
    if (p.issue) {
      issues.push(`Paragraph ${p.index + 1}: ${p.issue}`)
    }
  })

  const isValid = isValidCount && validatedParagraphs.every(p => p.isValid)

  return {
    sectionIndex,
    h2Title,
    paragraphCount,
    isValidCount,
    paragraphs: validatedParagraphs,
    totalCharacters,
    isValid,
    issues,
  }
}

/**
 * Validate all sections in an article for paragraph structure
 */
export function validateAllSectionsParagraphStructure(
  sections: Array<{ h2: string; content: string }>
): {
  allValid: boolean
  sectionValidations: SectionParagraphValidation[]
  totalIssues: number
  summary: string
} {
  const sectionValidations = sections.map((section, index) =>
    validateSectionParagraphStructure(section.content, index, section.h2)
  )

  const allValid = sectionValidations.every(v => v.isValid)
  const totalIssues = sectionValidations.reduce((sum, v) => sum + v.issues.length, 0)

  const validCount = sectionValidations.filter(v => v.isValid).length
  const summary = allValid
    ? `All ${sections.length} sections have valid 3-paragraph structure`
    : `${validCount}/${sections.length} sections valid, ${totalIssues} issues found`

  return { allValid, sectionValidations, totalIssues, summary }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK VERDICT SCHEMA (Comparison)
// Per documentation: 50 words with decision guidance
// ═══════════════════════════════════════════════════════════════════════════════

export const QuickVerdictSchema = z.object({
  /** Quick Verdict H2 */
  h2: z.string().min(5).max(100).nullable(),
  /** Names of items being compared (e.g., product names) */
  itemNames: z.array(z.string().min(3).max(50)).length(2).nullable(),
  /** "Choose A if..." statement */
  chooseA: z.string().refine(
    (text) => isWithinWordRange(text, 25, 0.3),
    'Each verdict statement should be ~25 words'
  ),
  /** "Choose B if..." statement */
  chooseB: z.string().refine(
    (text) => isWithinWordRange(text, 25, 0.3),
    'Each verdict statement should be ~25 words'
  ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS SCHEMA (Informational)
// Per documentation: 50-75 words TL;DR box
// ═══════════════════════════════════════════════════════════════════════════════

export const KeyTakeawaysSchema = z.object({
  /** Array of 3-5 key takeaway bullets */
  items: z.array(z.string().min(10).max(50)).min(3).max(5),
})

// ═══════════════════════════════════════════════════════════════════════════════
// RATING PARAGRAPH SCHEMA (Review)
// Per documentation: 100 words with score justification
// ═══════════════════════════════════════════════════════════════════════════════

export const RatingParagraphSchema = z.object({
  /** Rating score (e.g., 8.5/10) */
  score: z.number().min(1).max(10),
  /** Score justification (~100 words) */
  justification: z.string().refine(
    (text) => isWithinWordRange(text, 100, 0.15),
    wordCountMessage(100, 0.15)
  ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// HONORABLE MENTION SCHEMA (Listicle)
// Per documentation: H3 + paragraph (40-50w each) × 3-4
// ═══════════════════════════════════════════════════════════════════════════════

export const HonorableMentionItemSchema = z.object({
  /** H3 heading for the mention */
  h3: z.string().min(15).max(50),
  /** Description paragraph (40-50 words) */
  description: z.string().refine(
    (text) => isWithinWordRange(text, 45, 0.2),
    wordCountMessage(45, 0.2)
  ),
})

export const HonorableMentionsSchema = z.object({
  /** Section H2 (40-50 chars) */
  h2: z.string().min(40).max(50),
  /** Array of 3-4 mentions */
  items: z.array(HonorableMentionItemSchema).min(3).max(4),
})

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE CONTENT OUTPUT SCHEMA
// Full article content (text only, no HTML)
// ═══════════════════════════════════════════════════════════════════════════════

export const ArticleContentSchema = z.object({
  /** Overview paragraph (~100 words) */
  overview: z.string(),

  /** Array of section contents */
  sections: z.array(SectionContentSchema),

  /** FAQ answers (one per question in structure) */
  faqAnswers: z.array(z.string()),

  /** Closing paragraph (~50 words) */
  closing: z.string(),
})

export type ArticleContent = z.infer<typeof ArticleContentSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING CONTENT SCHEMA
// For streaming individual content pieces
// ═══════════════════════════════════════════════════════════════════════════════

export const StreamingContentSchema = z.object({
  /** Type of content being streamed */
  type: z.enum([
    'overview',
    'section',
    'faq-answer',
    'closing',
    'product-card',
    'feature-list',
    'pros-cons',
    'ingredients',
    'instructions',
  ]),
  /** Index for ordered content (e.g., section #2) */
  index: z.number().nullable(),
  /** The actual content */
  content: z.string(),
})

export type StreamingContent = z.infer<typeof StreamingContentSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate content and return word counts
 */
export function analyzeContentWordCounts(content: ArticleContent): {
  overview: number
  sections: number[]
  faqAnswers: number[]
  closing: number
  total: number
} {
  const overview = wordCount(content.overview)
  const sections = content.sections.map((s) => wordCount(s.content))
  const faqAnswers = content.faqAnswers.map((a) => wordCount(a))
  const closing = wordCount(content.closing)

  const total = overview +
    sections.reduce((a, b) => a + b, 0) +
    faqAnswers.reduce((a, b) => a + b, 0) +
    closing

  return { overview, sections, faqAnswers, closing, total }
}

/**
 * Check if content meets word count targets
 */
export function validateContentWordCounts(
  content: ArticleContent,
  targetWordCount: number
): {
  valid: boolean
  actualCount: number
  deviation: number
  deviationPercent: number
} {
  const analysis = analyzeContentWordCounts(content)
  const deviation = analysis.total - targetWordCount
  const deviationPercent = (Math.abs(deviation) / targetWordCount) * 100

  return {
    valid: deviationPercent <= 15, // Allow 15% deviation
    actualCount: analysis.total,
    deviation,
    deviationPercent,
  }
}
