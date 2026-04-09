import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { auth } from '@trigger.dev/sdk/v3'
import { db } from '@/lib/db'
import { generationHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/generate/realtime-token?runId=run_xxx
 *
 * Issues a fresh short-lived public token for an existing Trigger.dev run.
 * Used for reconnection after page refresh or token expiry.
 * Validates that the current user owns the history entry linked to this run.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')
  if (!runId) {
    return Response.json({ error: 'Missing runId parameter' }, { status: 400 })
  }

  // Authenticate
  const authSession = await getAuthSession()
  const userId = authSession?.user?.id || null

  if (!userId) {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Verify ownership: find a history entry owned by this user with this triggerRunId
  const entries = await db
    .select({ id: generationHistory.id, metadata: generationHistory.metadata })
    .from(generationHistory)
    .where(eq(generationHistory.userId, userId))
    .all()

  let ownsRun = false
  let historyId: string | null = null
  for (const entry of entries) {
    try {
      const meta = entry.metadata ? JSON.parse(entry.metadata) : {}
      if (meta.triggerRunId === runId) {
        ownsRun = true
        historyId = entry.id
        break
      }
    } catch {
      // skip unparseable metadata
    }
  }

  if (!ownsRun) {
    return Response.json({ error: 'Run not found or access denied' }, { status: 403 })
  }

  // Issue fresh token
  try {
    const publicToken = await auth.createPublicToken({
      scopes: { read: { runs: [runId] } },
      expirationTime: '30m',
    })

    return Response.json({ publicToken, runId, historyId })
  } catch (error) {
    console.error('[realtime-token] Failed to create token:', error)
    return Response.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
