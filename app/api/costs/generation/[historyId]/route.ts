/**
 * Per-Generation Cost API
 *
 * GET /api/costs/generation/[historyId] - Get cost details for a specific generation
 *
 * Returns summary and detailed logs for the generation.
 * Users can only access their own generations (admins can access any).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generationHistory } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getGenerationCost, getGenerationLogs } from '@/lib/services/cost-tracking-service'

// Check if user is admin/whitelabel
function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
  if (allowedDomain && email.endsWith(`@${allowedDomain}`)) {
    return true
  }
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { historyId } = await params
    const isAdmin = isAdminUser(session.user.email)

    // Verify user owns this generation (or is admin)
    const [history] = await db
      .select({ id: generationHistory.id })
      .from(generationHistory)
      .where(
        isAdmin
          ? eq(generationHistory.id, historyId)
          : and(
              eq(generationHistory.id, historyId),
              eq(generationHistory.userId, session.user.id)
            )
      )
      .limit(1)

    if (!history) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    // Get cost summary and logs
    const [summary, logs] = await Promise.all([
      getGenerationCost(historyId),
      getGenerationLogs(historyId),
    ])

    return NextResponse.json({
      historyId,
      summary,
      logs,
    })
  } catch (error) {
    console.error('[API/costs/generation] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generation cost' },
      { status: 500 }
    )
  }
}
