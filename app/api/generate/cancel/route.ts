import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { runs } from '@trigger.dev/sdk/v3'
import { db } from '@/lib/db'
import { generationHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/generate/cancel
 * Body: { runId: string }
 *
 * Cancels a running Trigger.dev task. Only callable by the user who owns the run.
 * Should only be triggered by an explicit user "Stop" action — NOT on component unmount.
 */
export async function POST(req: NextRequest) {
  const { runId } = await req.json()
  if (!runId) {
    return Response.json({ error: 'Missing runId' }, { status: 400 })
  }

  // Authenticate
  const authSession = await getAuthSession()
  const userId = authSession?.user?.id || null

  if (!userId) {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Verify ownership
  const entries = await db
    .select({ id: generationHistory.id, metadata: generationHistory.metadata })
    .from(generationHistory)
    .where(eq(generationHistory.userId, userId))
    .all()

  let ownsRun = false
  for (const entry of entries) {
    try {
      const meta = entry.metadata ? JSON.parse(entry.metadata) : {}
      if (meta.triggerRunId === runId) {
        ownsRun = true
        break
      }
    } catch {
      // skip
    }
  }

  if (!ownsRun) {
    return Response.json({ error: 'Run not found or access denied' }, { status: 403 })
  }

  // Cancel the run
  try {
    await runs.cancel(runId)
    return Response.json({ success: true, runId })
  } catch (error) {
    console.error('[cancel] Failed to cancel run:', error)
    return Response.json({ error: 'Failed to cancel run' }, { status: 500 })
  }
}
