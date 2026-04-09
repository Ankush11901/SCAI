/**
 * Keyword Expansion Schemas
 * 
 * Zod schemas for validating keyword expansion results.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for a single keyword
 * - 2-100 characters
 * - Trimmed, lowercase allowed
 */
export const KeywordSchema = z.string()
  .min(2, 'Keyword must be at least 2 characters')
  .max(100, 'Keyword must be at most 100 characters')
  .transform(s => s.trim())

/**
 * Schema for keyword cluster output from AI
 * - Array of 10-30 keywords
 * - Each keyword validated individually
 */
export const KeywordClusterSchema = z.object({
  keywords: z.array(KeywordSchema)
    .min(10, 'Must generate at least 10 keywords')
    .max(30, 'Must generate at most 30 keywords')
})

/**
 * Simplified array schema for direct array parsing
 */
export const KeywordArraySchema = z.array(KeywordSchema)
  .min(10, 'Must generate at least 10 keywords')
  .max(30, 'Must generate at most 30 keywords')

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD CLUSTER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categorized keyword cluster with intent groupings
 */
export const CategorizedKeywordClusterSchema = z.object({
  primary: z.array(KeywordSchema).describe('Primary/main keywords (3-5)'),
  secondary: z.array(KeywordSchema).describe('Secondary/supporting keywords (5-10)'),
  longtail: z.array(KeywordSchema).describe('Long-tail variations (5-10)'),
  questions: z.array(KeywordSchema).describe('Question-based keywords (3-5)'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD DENSITY TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for tracking keyword usage throughout article
 */
export const KeywordDensitySchema = z.object({
  keyword: KeywordSchema,
  occurrences: z.number().int().min(0),
  locations: z.array(z.enum(['h1', 'h2', 'intro', 'body', 'faq', 'meta_title', 'meta_description', 'image_alt'])),
  density: z.number().min(0).max(10).describe('Keyword density percentage'),
})

/**
 * Schema for full keyword tracking report
 */
export const KeywordTrackingReportSchema = z.object({
  primaryKeyword: z.string(),
  expandedKeywords: z.array(KeywordSchema),
  densityTracking: z.array(KeywordDensitySchema),
  recommendations: z.array(z.string()).nullable(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type Keyword = z.infer<typeof KeywordSchema>
export type KeywordCluster = z.infer<typeof KeywordClusterSchema>
export type KeywordArray = z.infer<typeof KeywordArraySchema>
export type CategorizedKeywordCluster = z.infer<typeof CategorizedKeywordClusterSchema>
export type KeywordDensity = z.infer<typeof KeywordDensitySchema>
export type KeywordTrackingReport = z.infer<typeof KeywordTrackingReportSchema>
