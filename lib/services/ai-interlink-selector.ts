/**
 * AI-Powered Interlink Selector
 *
 * Post-generation service that uses AI to read actual article content
 * and select the best anchor text + paragraph for each internal link.
 *
 * This replaces the blind "guess phrases before content exists" approach
 * with context-aware selection from real paragraphs.
 *
 * Falls back to regex-based matching (interlinking-service.ts) on failure.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback, type AIProvider } from '@/lib/ai/providers'
import type { CostTrackingContext } from '@/lib/services/cost-tracking-service'
import { extractParagraphs } from '@/lib/services/interlinking-service'
import type { ClusterArticle, InterlinkTarget } from '@/lib/types/cluster'

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const AiInterlinkSchema = z.object({
  links: z.array(z.object({
    /** The target URL to link to (must match one of the provided sibling URLs) */
    targetUrl: z.string(),
    /** The exact text from the paragraph to use as anchor text (3-60 chars) */
    anchorText: z.string().min(3).max(60),
    /** The paragraph index (0-based) where the anchor text appears */
    paragraphIndex: z.number().int().min(0),
    /** The anchor text type: exact (keyword match), semantic (related phrase), or generic (navigational) */
    anchorType: z.enum(['exact', 'semantic', 'generic']),
  })),
})

type AiInterlinkResult = z.infer<typeof AiInterlinkSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an SEO interlinking expert. Your job is to select the best anchor text and placement for internal links within an article.

RULES:
- The anchor text MUST be an EXACT substring that exists in the specified paragraph (copy it exactly, preserving case)
- Each link MUST be in a different paragraph (one link per paragraph max)
- Use varied anchor text — do NOT use the same phrase for different links
- Anchor text should be 3-8 words, descriptive, and contextually relevant to the target article
- Prefer body paragraphs over the opening paragraph — distribute links throughout the article
- At least one link should appear in the first 3 paragraphs (early placement for SEO)
- Only return links for the provided target URLs

ANCHOR TEXT VARIANCE (CRITICAL — Anti-Spam Requirement):
You MUST vary anchor text types across links using this distribution:
- ~20% "exact": Use the target article's PRIMARY KEYWORD as anchor text (find it in the paragraph verbatim)
  Example: target about "wireless headphones" → anchor text "wireless headphones"
- ~50% "semantic": Use a RELATED but different phrase from the paragraph
  Example: target about "wireless headphones" → anchor text "best audio devices for commuting"
- ~30% "generic": Use a NAVIGATIONAL phrase from the paragraph (NOT "click here" — use natural text like "this comprehensive guide", "these proven methods", "the approach outlined here")
  Example: target about "wireless headphones" → anchor text "this detailed comparison"

Set the anchorType field to "exact", "semantic", or "generic" for each link to match what you chose.`

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelectInterlinksOptions {
  articleHtml: string
  siblingArticles: ClusterArticle[]
  provider?: AIProvider
  costTracking?: CostTrackingContext
}

/**
 * Use AI to select the best anchor text and paragraph for each interlink.
 * Returns InterlinkTarget[] compatible with the existing applyInterlinking() pipeline.
 */
export async function selectInterlinksWithAI(
  options: SelectInterlinksOptions
): Promise<InterlinkTarget[]> {
  const { articleHtml, siblingArticles, provider, costTracking } = options

  // Extract paragraphs from the actual article HTML
  const paragraphs = extractParagraphs(articleHtml)

  if (paragraphs.length === 0) {
    throw new Error('No paragraphs found in article HTML')
  }

  // Build numbered paragraph list for the prompt
  const paragraphList = paragraphs
    .map((p, i) => `[${i}] ${p.text}`)
    .join('\n\n')

  // Build sibling info for the prompt
  const siblingList = siblingArticles
    .map((s) => `- URL: ${s.targetUrl}\n  Title: "${s.title}"\n  Topic: ${s.focus}\n  Keywords: ${s.keywords.slice(0, 3).join(', ')}`)
    .join('\n')

  const userPrompt = `Select the best anchor text and paragraph placement for internal links in this article.

ARTICLE PARAGRAPHS (numbered by index):
${paragraphList}

TARGET ARTICLES TO LINK TO (one link per target):
${siblingList}

For each target article, find a natural phrase in one of the paragraphs that relates to that article's topic. Return the exact text substring, the paragraph index, and the target URL.`

  const { result } = await executeWithFallback(
    async (model) => {
      return generateObject({
        model,
        schema: AiInterlinkSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.3,
      })
    },
    {
      preferredProvider: provider,
      tier: 'fast',
      operationName: 'ai-interlink-selector',
      costTracking,
    }
  )

  const aiLinks = result.object as AiInterlinkResult

  // Validate AI output: ensure anchor text actually exists in the specified paragraph
  const validatedTargets: InterlinkTarget[] = []

  for (const link of aiLinks.links) {
    const sibling = siblingArticles.find((s) => s.targetUrl === link.targetUrl)
    if (!sibling) continue

    const paragraph = paragraphs[link.paragraphIndex]
    if (!paragraph) continue

    // Verify the anchor text exists in the paragraph (case-insensitive check)
    const textLower = paragraph.text.toLowerCase()
    const anchorLower = link.anchorText.toLowerCase()
    if (!textLower.includes(anchorLower)) {
      console.warn(`[AI Interlink] Anchor "${link.anchorText}" not found in paragraph ${link.paragraphIndex}, skipping`)
      continue
    }

    validatedTargets.push({
      targetSlug: sibling.slug,
      targetTitle: sibling.title,
      targetUrl: sibling.targetUrl,
      suggestedAnchorPhrases: [link.anchorText],
      anchorTextType: link.anchorType || 'semantic',
    })
  }

  if (validatedTargets.length === 0) {
    throw new Error('AI interlink selector returned no valid links')
  }

  console.log(`[AI Interlink] Selected ${validatedTargets.length} links from AI pass`)
  for (const t of validatedTargets) {
    console.log(`  → "${t.suggestedAnchorPhrases[0]}" → ${t.targetUrl}`)
  }

  return validatedTargets
}
