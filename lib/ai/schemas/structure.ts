/**
 * Structure Schemas for AI Article Generation
 * 
 * Defines Zod schemas for article structure elements (H1, H2, H3, FAQ, Meta).
 * These schemas enforce strict formatting rules from the documentation:
 * - Character limits
 * - Forbidden patterns (and/or, colons)
 * - Keyword requirements
 * 
 * Used with Vercel AI SDK's generateObject() for structured outputs.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if text contains forbidden patterns
 */
function hasForbiddenPatterns(text: string): boolean {
  const lowerText = text.toLowerCase()
  // Forbidden: "and", "or", ":", "?"
  return /\band\b|\bor\b|:|[?]/i.test(lowerText)
}

/**
 * Check if text contains the primary keyword (case-insensitive)
 */
function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword) return true // No keyword requirement
  return text.toLowerCase().includes(keyword.toLowerCase())
}

/**
 * Count words in text
 */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ═══════════════════════════════════════════════════════════════════════════════
// H1 SCHEMA
// Per documentation: Max 60 chars, must include primary keyword, no "and"/"or"
// ═══════════════════════════════════════════════════════════════════════════════

export const H1Schema = z.object({
  text: z
    .string()
    .min(20, 'H1 must be at least 20 characters')
    .max(60, 'H1 must not exceed 60 characters')
    .refine(
      (text) => !hasForbiddenPatterns(text),
      'H1 must not contain "and", "or", colons, or question marks'
    ),
})

/**
 * Create H1 schema with keyword validation
 */
export function createH1SchemaWithKeyword(primaryKeyword: string) {
  return z.object({
    text: z
      .string()
      .min(20, 'H1 must be at least 20 characters')
      .max(60, 'H1 must not exceed 60 characters')
      .refine(
        (text) => !hasForbiddenPatterns(text),
        'H1 must not contain "and", "or", colons, or question marks'
      )
      .refine(
        (text) => containsKeyword(text, primaryKeyword),
        `H1 must include the primary keyword: "${primaryKeyword}"`
      ),
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// H2 SCHEMA
// Per documentation: Max 60 chars, no "and"/"or", no colons, format matches H1
// ═══════════════════════════════════════════════════════════════════════════════

export const H2Schema = z.object({
  text: z
    .string()
    .min(15, 'H2 must be at least 15 characters')
    .max(60, 'H2 must not exceed 60 characters')
    .refine(
      (text) => !hasForbiddenPatterns(text),
      'H2 must not contain "and", "or", colons, or question marks'
    ),
  /** Index in the flow (e.g., H2 #1, H2 #2) for ordering */
  index: z.number().int().min(0).nullable(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ SCHEMAS
// Per documentation: H2 (30 chars), H3 questions (30-60 chars)
// ═══════════════════════════════════════════════════════════════════════════════

export const FaqH2Schema = z.object({
  text: z
    .string()
    .min(10, 'FAQ H2 must be at least 10 characters')
    .max(30, 'FAQ H2 must not exceed 30 characters'),
})

export const FaqQuestionSchema = z.object({
  text: z
    .string()
    .min(30, 'FAQ question must be at least 30 characters')
    .max(60, 'FAQ question must not exceed 60 characters')
    .refine(
      (text) => text.endsWith('?'),
      'FAQ question must end with a question mark'
    ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING H2 SCHEMA
// Per documentation: Uses same format as other H2s
// ═══════════════════════════════════════════════════════════════════════════════

const FORBIDDEN_CLOSING_WORDS = /\b(conclusion|summary|final thoughts|wrapping up|in closing|to conclude|summing up)\b/i

export const ClosingH2Schema = z.object({
  text: z
    .string()
    .min(15, 'Closing H2 must be at least 15 characters')
    .max(50, 'Closing H2 must not exceed 50 characters')
    .refine(
      (text) => !hasForbiddenPatterns(text),
      'Closing H2 must not contain "and", "or", colons, or question marks'
    )
    .refine(
      (text) => !FORBIDDEN_CLOSING_WORDS.test(text),
      'Closing H2 must not contain "Conclusion", "Summary", "Final Thoughts", "Wrapping Up", etc.'
    ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// UNIQUE COMPONENT H2 SCHEMAS
// Components that create their own H2s have specific requirements
// ═══════════════════════════════════════════════════════════════════════════════

/** Honorable Mentions H2: 40-50 chars */
export const HonorableMentionsH2Schema = z.object({
  text: z
    .string()
    .min(40, 'Honorable Mentions H2 must be at least 40 characters')
    .max(50, 'Honorable Mentions H2 must not exceed 50 characters'),
})

/** Why Choose Local H2: 40-50 chars */
export const WhyChooseLocalH2Schema = z.object({
  text: z
    .string()
    .min(40, 'Why Choose Local H2 must be at least 40 characters')
    .max(50, 'Why Choose Local H2 must not exceed 50 characters'),
})

/** Quick Facts H2: 40-50 chars */
export const QuickFactsH2Schema = z.object({
  text: z
    .string()
    .min(40, 'Quick Facts H2 must be at least 40 characters')
    .max(50, 'Quick Facts H2 must not exceed 50 characters'),
})

/** Rating H2 (Review): Max 30 chars */
export const RatingH2Schema = z.object({
  text: z
    .string()
    .min(10, 'Rating H2 must be at least 10 characters')
    .max(30, 'Rating H2 must not exceed 30 characters'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// META SCHEMAS
// Per documentation: Title (50-60 chars), Description (140-160 chars)
// ═══════════════════════════════════════════════════════════════════════════════

export const MetaTitleSchema = z.object({
  text: z
    .string()
    .min(50, 'Meta title must be at least 50 characters')
    .max(60, 'Meta title must not exceed 60 characters')
    .refine(
      (text) => !text.includes(':'),
      'Meta title must not contain colons'
    ),
})

export const MetaDescriptionSchema = z.object({
  text: z
    .string()
    .min(140, 'Meta description must be at least 140 characters')
    .max(160, 'Meta description must not exceed 160 characters'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE ALT SCHEMAS
// Per documentation: Featured (100-125 chars), H2 (80-100 chars)
// ═══════════════════════════════════════════════════════════════════════════════

export const FeaturedImageAltSchema = z.object({
  text: z
    .string()
    .min(100, 'Featured image alt must be at least 100 characters')
    .max(125, 'Featured image alt must not exceed 125 characters')
    .refine(
      (text) => !/^(image of|picture of|photo of)/i.test(text.trim()),
      'Alt text must not start with "Image of", "Picture of", or "Photo of"'
    ),
})

export const H2ImageAltSchema = z.object({
  text: z
    .string()
    .min(80, 'H2 image alt must be at least 80 characters')
    .max(100, 'H2 image alt must not exceed 100 characters')
    .refine(
      (text) => !/^(image of|picture of|photo of)/i.test(text.trim()),
      'Alt text must not start with "Image of", "Picture of", or "Photo of"'
    ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE STRUCTURE OUTPUT SCHEMA
// The full structure object returned by AI for article skeleton
// Uses relaxed constraints for AI generation, then post-processes to fix limits
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truncate string to max length, trying to break at word boundary
 */
function smartTruncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str

  // Try to break at last space before maxLength
  const truncated = str.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  // If we found a space in the last 20 chars, break there
  if (lastSpace > maxLength - 20) {
    return truncated.substring(0, lastSpace)
  }

  return truncated
}

/**
 * Extend string to meet minimum length by adding descriptive suffixes
 */
function smartExtend(str: string, minLength: number): string {
  if (str.length >= minLength) return str

  // Add descriptive suffixes to reach minimum length
  const suffixes = [
    ' with detailed visual representation',
    ' showing key concepts clearly',
    ' for better understanding',
    ' with practical examples',
    ' in professional context',
  ]

  let result = str
  for (const suffix of suffixes) {
    if (result.length >= minLength) break
    // Only add if it doesn't make it too long
    if (result.length + suffix.length <= minLength + 25) {
      result = result + suffix
    }
  }

  return result
}

/**
 * Relaxed schema for AI generation - allows longer strings that will be truncated
 */
export const StructureOutputSchemaRelaxed = z.object({
  /** Primary H1 title */
  h1: z.string().min(10).max(80),

  /** Array of H2 headings in order */
  h2s: z.array(z.string().min(10).max(80)),

  /** FAQ section - requires exactly 5 questions */
  faq: z.object({
    h2: z.string().min(3).max(50),
    questions: z.array(z.string().min(15).max(80)).min(5, 'FAQ must have at least 5 questions'),
  }),

  /** Closing section */
  closing: z.object({
    h2: z.string().min(10).max(60),
  }),

  /** Meta information */
  meta: z.object({
    title: z.string().min(20).max(70),
    description: z.string().min(80).max(180),
  }),

  /** Image alt texts - RELAXED limits for AI, will be truncated post-generation */
  imageAlts: z.object({
    featured: z.string().min(50).max(200), // Relaxed: AI often exceeds 125
    h2s: z.array(z.string().min(30).max(200)), // Relaxed: AI often exceeds 100
  }),
})

/**
 * Post-process AI output to fix image alt lengths
 * - Featured: 100-125 chars (extend if too short, truncate if too long)
 * - H2: 80-100 chars (extend if too short, truncate if too long)
 */
export function fixStructureImageAlts<T extends z.infer<typeof StructureOutputSchemaRelaxed>>(structure: T): T {
  return {
    ...structure,
    imageAlts: {
      // Featured: min 100, max 125
      featured: smartTruncate(smartExtend(structure.imageAlts.featured, 100), 125),
      // H2s: min 80, max 100
      h2s: structure.imageAlts.h2s.map(alt => smartTruncate(smartExtend(alt, 80), 100)),
    },
  }
}

/**
 * Strict schema for final validation (after post-processing)
 */
export const StructureOutputSchema = z.object({
  /** Primary H1 title */
  h1: z.string().min(10).max(80),

  /** Array of H2 headings in order */
  h2s: z.array(z.string().min(10).max(80)),

  /** FAQ section - requires exactly 5 questions */
  faq: z.object({
    h2: z.string().min(3).max(50),
    questions: z.array(z.string().min(15).max(80)).min(5, 'FAQ must have at least 5 questions'),
  }),

  /** Closing section */
  closing: z.object({
    h2: z.string().min(10).max(60),
  }),

  /** Meta information */
  meta: z.object({
    title: z.string().min(20).max(70),
    description: z.string().min(80).max(180),
  }),

  /** Image alt texts - strict limits after post-processing (extend/truncate) */
  imageAlts: z.object({
    featured: z.string().min(100).max(125),  // Per programmatic_rules.md: 100-125 chars
    h2s: z.array(z.string().min(80).max(100)),  // Per programmatic_rules.md: 80-100 chars
  }),
})

export type StructureOutput = z.infer<typeof StructureOutputSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// PARTIAL STRUCTURE SCHEMA (for progressive generation)
// ═══════════════════════════════════════════════════════════════════════════════

export const PartialStructureSchema = StructureOutputSchema.partial()

export type PartialStructure = z.infer<typeof PartialStructureSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a complete structure output
 */
export function validateStructure(data: unknown): {
  success: boolean
  data?: StructureOutput
  errors?: z.ZodError
} {
  const result = StructureOutputSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Get human-readable validation errors
 */
export function formatStructureErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue) => {
    const path = issue.path.join('.')
    return `${path}: ${issue.message}`
  })
}
