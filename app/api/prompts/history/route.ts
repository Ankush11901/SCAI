import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, isWhitelabelUser } from '@/lib/auth'
import { db, promptTestRuns } from '@/lib/db'
import { eq, desc, and, sql } from 'drizzle-orm'

/**
 * Helper to get authenticated admin
 */
async function getAuthenticatedAdmin(): Promise<{ userId: string; email: string } | null> {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id || !authSession?.user?.email) {
    return null
  }

  if (!isWhitelabelUser(authSession.user.email)) {
    return null
  }

  return {
    userId: authSession.user.id,
    email: authSession.user.email,
  }
}

/**
 * GET /api/prompts/history
 * Get prompt test history
 *
 * Query params:
 * - limit: Number of entries (default: 50)
 * - offset: Pagination offset (default: 0)
 * - promptId: Filter by prompt ID
 * - provider: Filter by provider
 * - category: Filter by category
 */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const promptId = searchParams.get('promptId')
    const provider = searchParams.get('provider')
    const category = searchParams.get('category')

    // Build where conditions
    const conditions = [eq(promptTestRuns.userId, admin.userId)]

    if (promptId) {
      conditions.push(eq(promptTestRuns.promptId, promptId))
    }

    if (provider) {
      conditions.push(eq(promptTestRuns.provider, provider))
    }

    if (category) {
      conditions.push(eq(promptTestRuns.category, category))
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(promptTestRuns)
      .where(and(...conditions))

    const total = countResult[0]?.count || 0

    // Get entries
    const entries = await db
      .select({
        id: promptTestRuns.id,
        promptId: promptTestRuns.promptId,
        promptName: promptTestRuns.promptName,
        category: promptTestRuns.category,
        provider: promptTestRuns.provider,
        model: promptTestRuns.model,
        params: promptTestRuns.params,
        overrideUsed: promptTestRuns.overrideUsed,
        tokens: promptTestRuns.tokens,
        duration: promptTestRuns.duration,
        error: promptTestRuns.error,
        createdAt: promptTestRuns.createdAt,
      })
      .from(promptTestRuns)
      .where(and(...conditions))
      .orderBy(desc(promptTestRuns.createdAt))
      .limit(limit)
      .offset(offset)

    // Transform entries
    const transformedEntries = entries.map((entry) => ({
      ...entry,
      params: entry.params ? JSON.parse(entry.params) : null,
      tokens: entry.tokens ? JSON.parse(entry.tokens) : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        entries: transformedEntries,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + entries.length < total,
        },
      },
    })
  } catch (error) {
    console.error('[prompts/history] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to fetch history: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompts/history
 * Delete a history entry
 *
 * Query params:
 * - id: Entry ID to delete
 */
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID required' },
        { status: 400 }
      )
    }

    // Delete only if owned by this user
    const result = await db
      .delete(promptTestRuns)
      .where(
        and(
          eq(promptTestRuns.id, id),
          eq(promptTestRuns.userId, admin.userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
    })
  } catch (error) {
    console.error('[prompts/history] Delete error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to delete entry: ${errorMessage}` },
      { status: 500 }
    )
  }
}
