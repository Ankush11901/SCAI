import { NextResponse } from 'next/server'
import { getAuthSession, isWhitelabelUser } from '@/lib/auth'
import { PROMPT_REGISTRY, CATEGORY_INFO, getPromptsByCategory, getPromptById } from '@/lib/prompts/registry'
import { getAvailableMockTypes } from '@/lib/prompts/mock-data'

/**
 * Helper to get authenticated user and check admin access
 */
async function getAuthenticatedAdmin(): Promise<{ userId: string; email: string } | null> {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id || !authSession?.user?.email) {
    return null
  }

  // Only whitelabel users (admins) can access prompt testing
  if (!isWhitelabelUser(authSession.user.email)) {
    return null
  }

  return {
    userId: authSession.user.id,
    email: authSession.user.email,
  }
}

/**
 * GET /api/prompts
 * List all available prompts with their metadata
 *
 * Query params:
 * - category: Filter by category (structure, content, component, keyword)
 * - articleType: Filter by article type
 * - id: Get a specific prompt by ID
 */
export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const articleType = searchParams.get('articleType')
    const id = searchParams.get('id')

    // Get specific prompt by ID
    if (id) {
      const prompt = getPromptById(id)
      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        data: prompt,
      })
    }

    // Get prompts by category
    let prompts = PROMPT_REGISTRY

    if (category) {
      prompts = getPromptsByCategory(category as 'structure' | 'content' | 'component' | 'keyword')
    }

    // Filter by article type
    if (articleType) {
      prompts = prompts.filter(
        p => !p.articleTypes || p.articleTypes.includes(articleType)
      )
    }

    // Group by category for the response
    const grouped = {
      structure: prompts.filter(p => p.category === 'structure'),
      content: prompts.filter(p => p.category === 'content'),
      component: prompts.filter(p => p.category === 'component'),
      keyword: prompts.filter(p => p.category === 'keyword'),
    }

    return NextResponse.json({
      success: true,
      data: {
        prompts: category ? prompts : grouped,
        categories: CATEGORY_INFO,
        mockTypes: getAvailableMockTypes(),
        total: prompts.length,
      },
    })
  } catch (error) {
    console.error('[prompts] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to fetch prompts: ${errorMessage}` },
      { status: 500 }
    )
  }
}
