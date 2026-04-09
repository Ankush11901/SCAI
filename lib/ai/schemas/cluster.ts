/**
 * Cluster Mode Zod Schemas
 *
 * Schemas for validating AI-generated cluster expansion output.
 * Used exclusively for bulk/cluster generation.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE TYPE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid article type IDs
 */
export const VALID_ARTICLE_TYPES = [
  'affiliate',
  'commercial',
  'comparison',
  'how-to',
  'informational',
  'listicle',
  'local',
  'recipe',
  'review',
] as const;

export type ValidArticleType = (typeof VALID_ARTICLE_TYPES)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER ARTICLE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid title variations
 */
export const VALID_VARIATIONS = ['question', 'statement', 'listicle'] as const;
export type ValidVariation = (typeof VALID_VARIATIONS)[number];

/**
 * Schema for a single article in the cluster plan
 */
export const ClusterArticleOutputSchema = z.object({
  /**
   * One of the 9 valid article types
   */
  articleType: z.enum(VALID_ARTICLE_TYPES),

  /**
   * SEO-optimized title (50-65 characters)
   */
  title: z
    .string()
    .min(30, 'Title must be at least 30 characters')
    .max(70, 'Title must not exceed 70 characters'),

  /**
   * What this article specifically covers (1-2 sentences)
   */
  focus: z
    .string()
    .min(20, 'Focus must be at least 20 characters')
    .max(200, 'Focus must not exceed 200 characters'),

  /**
   * 3-5 semantic keywords for this article (used for interlinking)
   */
  keywords: z
    .array(z.string().min(2).max(50))
    .min(3, 'Must have at least 3 keywords')
    .max(5, 'Must not exceed 5 keywords'),

  /**
   * Whether this is the pillar (parent) article for the cluster.
   * Exactly one article in the cluster should be marked as pillar.
   */
  isPillar: z.boolean(),

  /**
   * Title variation format (optional - only when AI chooses per article)
   */
  variation: z.enum(VALID_VARIATIONS).nullable(),
});

export type ClusterArticleOutput = z.infer<typeof ClusterArticleOutputSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// INTERLINKING PLAN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for interlinking suggestions between articles
 */
export const InterlinkSuggestionSchema = z.object({
  /**
   * Index of the target article in the articles array
   */
  targetIndex: z.number().int().min(0),

  /**
   * Suggested anchor phrases that could link to this article
   */
  suggestedAnchorPhrases: z
    .array(z.string().min(2).max(60))
    .min(1, 'Must have at least 1 anchor phrase')
    .max(3, 'Must not exceed 3 anchor phrases'),
});

export const ArticleInterlinkPlanSchema = z.object({
  /**
   * Index of the source article
   */
  sourceIndex: z.number().int().min(0),

  /**
   * Articles this source should link to
   */
  targets: z.array(InterlinkSuggestionSchema),
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE CLUSTER PLAN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete cluster plan output from AI
 */
export const ClusterPlanOutputSchema = z.object({
  /**
   * Array of articles to generate (1-9)
   */
  articles: z
    .array(ClusterArticleOutputSchema)
    .min(1, 'Must have at least 1 article')
    .max(100, 'Must not exceed 100 articles'),

  /**
   * Interlinking plan between articles
   */
  interlinkingPlan: z.array(ArticleInterlinkPlanSchema),
});

export type ClusterPlanOutput = z.infer<typeof ClusterPlanOutputSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a cluster plan output from AI
 */
export function validateClusterPlan(data: unknown): {
  success: boolean;
  data?: ClusterPlanOutput;
  errors?: z.ZodError;
} {
  const result = ClusterPlanOutputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Get human-readable validation errors
 */
export function formatClusterPlanErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}

/**
 * Check if an article type is valid
 */
export function isValidArticleType(type: string): type is ValidArticleType {
  return VALID_ARTICLE_TYPES.includes(type as ValidArticleType);
}
