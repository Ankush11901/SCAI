import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, isWhitelabelUser } from '@/lib/auth'
import { db, promptTestRuns } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

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
 * GET /api/prompts/history/[id]
 * Get a specific history entry with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    // Get the entry
    const entries = await db
      .select()
      .from(promptTestRuns)
      .where(
        and(
          eq(promptTestRuns.id, id),
          eq(promptTestRuns.userId, admin.userId)
        )
      )
      .limit(1)

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    const entry = entries[0]

    // Transform the entry
    const transformedEntry = {
      ...entry,
      params: entry.params ? JSON.parse(entry.params) : null,
      prompt: entry.prompt ? JSON.parse(entry.prompt) : null,
      output: entry.output ? JSON.parse(entry.output) : null,
      tokens: entry.tokens ? JSON.parse(entry.tokens) : null,
    }

    return NextResponse.json({
      success: true,
      data: transformedEntry,
    })
  } catch (error) {
    console.error('[prompts/history/[id]] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to fetch entry: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompts/history/[id]
 * Delete a specific history entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    // Delete only if owned by this user
    await db
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
    console.error('[prompts/history/[id]] Delete error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to delete entry: ${errorMessage}` },
      { status: 500 }
    )
  }
}
