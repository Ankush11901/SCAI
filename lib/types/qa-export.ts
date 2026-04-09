/**
 * QA Export Types
 * 
 * Types for the QA Matrix Export feature that generates a complete
 * HTML comparison of all article types and variations.
 */

export type TitleVariation = 'question' | 'statement' | 'listicle';

/**
 * Data for a single article in the QA export
 */
export interface QAArticleData {
  /** Word count of the article */
  wordCount: number;
  /** List of detected component names */
  components: string[];
  /** Full HTML content of the article */
  htmlContent: string;
  /** Article status (for visual indication in export) */
  status?: 'complete' | 'error' | 'pending';
  /** Error message if article failed */
  errorMessage?: string;
}

/**
 * All variations for a single article type
 */
export interface QAArticleTypeData {
  question?: QAArticleData;
  statement?: QAArticleData;
  listicle?: QAArticleData;
}

/**
 * Complete export data structure - all article types with their variations
 */
export type QAExportData = Record<string, QAArticleTypeData>;

/**
 * Article types supported in the QA matrix
 */
export const ARTICLE_TYPES = [
  'affiliate',
  'commercial', 
  'comparison',
  'how-to',
  'informational',
  'listicle',
  'local',
  'recipe',
  'review'
] as const;

export type ArticleType = typeof ARTICLE_TYPES[number];

/**
 * Variations supported in the QA matrix
 */
export const VARIATIONS = ['question', 'statement', 'listicle'] as const;
