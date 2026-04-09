/**
 * Article Classification Service
 *
 * Generates a lightweight "classification hint" during article generation.
 * This hint is stored in the article's metadata and later used at export time
 * to match against a CMS site's real taxonomy — without re-reading full HTML.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback, type AIProvider } from '@/lib/ai/providers'
import type { CostTrackingContext } from '@/lib/services/cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationHint {
  summary: string
  suggestedCategories: string[]
  suggestedTags: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const ClassificationHintSchema = z.object({
  summary: z.string().describe(
    'A 1-2 sentence description of the article topic, intent, and target audience. This will be used later to match the article to CMS categories.'
  ),
  suggestedCategories: z.array(z.string()).min(1).max(5).describe(
    'Broad, theme-level category names that fit this article (e.g. "Technology", "Health & Wellness", "How-To Guides", "Product Reviews"). Use common blog/CMS category conventions.'
  ),
  suggestedTags: z.array(z.string()).min(2).max(10).describe(
    'Specific, lowercase tags for the article (e.g. "seo", "on-page optimization", "beginners guide", "meta tags"). These should be granular keywords or phrases.'
  ),
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildClassificationPrompt(
  keyword: string,
  articleType: string,
  h1: string,
  h2Titles: string[]
): string {
  return `You are an expert content classifier. Based on the article details below, generate a classification hint that can later be used to assign CMS categories and tags.

ARTICLE DETAILS:
- Keyword: "${keyword}"
- Article type: ${articleType}
- H1 (title): "${h1}"
- H2 sections: ${h2Titles.map(h => `"${h}"`).join(', ')}

RULES:
1. The "summary" should capture the article's core topic and purpose in 1-2 sentences.
2. "suggestedCategories" should be broad, universally common blog categories (e.g. "Technology", "Health", "Finance", "Tutorials"). Pick 1-3 that best fit.
3. "suggestedTags" should be specific, lowercase keywords or short phrases relevant to the article content. Pick 3-7 tags.
4. Do NOT use the article type itself as a category (e.g. don't use "affiliate" or "listicle" as categories).
5. Think about what a WordPress or CMS site would typically use as their taxonomy.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a classification hint for an article based on its structure.
 * Uses a fast model tier to keep cost and latency minimal.
 *
 * @param keyword - The article's target keyword
 * @param articleType - The type of article (e.g. 'how-to', 'affiliate', 'review')
 * @param h1 - The article's H1 title
 * @param h2Titles - Array of H2 section titles
 * @param provider - Preferred AI provider
 * @param costTracking - Optional cost tracking context
 */
export async function generateClassificationHint(
  keyword: string,
  articleType: string,
  h1: string,
  h2Titles: string[],
  provider: AIProvider = 'gemini',
  costTracking?: CostTrackingContext
): Promise<ClassificationHint> {
  const { result } = await executeWithFallback(
    async (model) => {
      return generateObject({
        model,
        schema: ClassificationHintSchema,
        prompt: buildClassificationPrompt(keyword, articleType, h1, h2Titles),
        temperature: 0.3,
      })
    },
    {
      preferredProvider: provider,
      tier: 'fast',
      operationName: 'classifyArticle',
      maxRetries: 2,
      costTracking,
    }
  )

  const hint = result.object

  console.log(`[ClassifyArticle] Summary: ${hint.summary.substring(0, 80)}...`)
  console.log(`[ClassifyArticle] Categories: ${hint.suggestedCategories.join(', ')}`)
  console.log(`[ClassifyArticle] Tags: ${hint.suggestedTags.join(', ')}`)

  return hint
}
