import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db, generationHistory } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { getConnectionWithCredentials } from '@/lib/services/wordpress/connection-service'
import { wpFetch } from '@/lib/services/wordpress/wp-fetch'
import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback } from '@/lib/ai/providers'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

// Schema for AI suggestion output
const TaxonomySuggestionSchema = z.object({
  articles: z.array(z.object({
    historyId: z.string(),
    categories: z.array(z.string()).describe('Category names from the existing site taxonomy that fit this article'),
    tags: z.array(z.string()).describe('Tag names from the existing site taxonomy that fit this article'),
    newCategories: z.array(z.string()).describe('New category names to create if nothing existing fits well. Only suggest if truly needed.'),
    newTags: z.array(z.string()).describe('New tag names to create if nothing existing fits well. Only suggest if truly needed.'),
  })),
})

export interface TaxonomySuggestion {
  categories: string[]
  tags: string[]
  newCategories: string[]
  newTags: string[]
}

/**
 * POST /api/wordpress/suggest-taxonomy
 * AI-powered taxonomy suggestions for articles based on their classification hints.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json()
  const { connectionId, historyIds } = body as { connectionId: string; historyIds: string[] }

  if (!connectionId || !historyIds?.length) {
    return NextResponse.json({ error: 'connectionId and historyIds are required' }, { status: 400 })
  }

  try {
    // Load connection credentials
    const connData = await getConnectionWithCredentials(connectionId, userId)
    if (!connData) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { connection, username, password } = connData

    // Fetch site taxonomy + article metadata in parallel
    const [categories, tags, articles] = await Promise.all([
      wpFetch<Array<{ id: number; name: string }>>({
        siteUrl: connection.siteUrl,
        username,
        password,
        path: '/wp/v2/categories?per_page=100&orderby=count&order=desc',
      }),
      wpFetch<Array<{ id: number; name: string }>>({
        siteUrl: connection.siteUrl,
        username,
        password,
        path: '/wp/v2/tags?per_page=100&orderby=count&order=desc',
      }),
      db
        .select({
          id: generationHistory.id,
          keyword: generationHistory.keyword,
          articleType: generationHistory.articleType,
          metadata: generationHistory.metadata,
        })
        .from(generationHistory)
        .where(
          and(
            eq(generationHistory.userId, userId),
            inArray(generationHistory.id, historyIds)
          )
        ),
    ])

    const categoryNames = categories.map(c => c.name)
    const tagNames = tags.map(t => t.name)

    // Build article descriptions for AI
    const articleDescriptions = articles.map(article => {
      let hint: { summary?: string; suggestedCategories?: string[]; suggestedTags?: string[] } | null = null
      try {
        if (article.metadata) {
          const meta = JSON.parse(article.metadata)
          hint = meta.classificationHint || null
        }
      } catch { /* ignore */ }

      if (hint) {
        return {
          historyId: article.id,
          description: `Topic: "${article.keyword}" | Type: ${article.articleType} | Summary: ${hint.summary} | Suggested categories: ${hint.suggestedCategories?.join(', ')} | Suggested tags: ${hint.suggestedTags?.join(', ')}`,
        }
      }

      // Fallback for older articles without classification hint
      return {
        historyId: article.id,
        description: `Topic: "${article.keyword}" | Type: ${article.articleType}`,
      }
    })

    // AI call to match articles to site taxonomy
    const prompt = `You are a content categorization expert. Match each article to the most appropriate categories and tags from the site's existing taxonomy.

SITE'S EXISTING CATEGORIES:
${categoryNames.length > 0 ? categoryNames.join(', ') : '(none)'}

SITE'S EXISTING TAGS:
${tagNames.length > 0 ? tagNames.join(', ') : '(none)'}

ARTICLES TO CATEGORIZE:
${articleDescriptions.map((a, i) => `${i + 1}. [${a.historyId}] ${a.description}`).join('\n')}

RULES:
1. Pick 1-3 existing categories per article. Use EXACT names from the list above.
2. Pick 1-5 existing tags per article. Use EXACT names from the list above.
3. Only suggest NEW categories/tags if none of the existing ones fit at all. Keep new suggestions minimal.
4. New category names should be broad and reusable (e.g. "Technology", "Health"). New tags should be specific (e.g. "meal prep", "home office").
5. Consider the article type: reviews → "Reviews" category, how-tos → "Guides"/"Tutorials", etc.`

    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: TaxonomySuggestionSchema,
          prompt,
          temperature: 0.2,
        })
      },
      {
        preferredProvider: 'gemini',
        tier: 'fast',
        operationName: 'suggestTaxonomy',
        maxRetries: 2,
      }
    )

    // Build response map
    const suggestions: Record<string, TaxonomySuggestion> = {}
    for (const article of result.object.articles) {
      suggestions[article.historyId] = {
        categories: article.categories,
        tags: article.tags,
        newCategories: article.newCategories,
        newTags: article.newTags,
      }
    }

    // Fill in any missing articles with empty suggestions
    for (const id of historyIds) {
      if (!suggestions[id]) {
        suggestions[id] = { categories: [], tags: [], newCategories: [], newTags: [] }
      }
    }

    return NextResponse.json({ success: true, data: { suggestions } })
  } catch (error) {
    console.error('[wp-suggest-taxonomy] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to suggest taxonomy: ${msg}` }, { status: 500 })
  }
}
