import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { auth, runs } from '@trigger.dev/sdk/v3'
import { db } from '@/lib/db'
import { generationHistory } from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'

/**
 * GET /api/generate/active-run
 *
 * Checks if the user has any in-progress generations.
 * Used for reconnection when sessionStorage is cleared (e.g., browser restart).
 * Returns the active runId and publicToken if found.
 */
export async function GET(req: NextRequest) {
  // Authenticate
  const authSession = await getAuthSession()
  const userId = authSession?.user?.id || null

  if (!userId) {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Find recent history entries with "generating" or "pending" status
  // (pending entries may have just started and not yet updated to generating)
  const recentEntries = await db
    .select({
      id: generationHistory.id,
      status: generationHistory.status,
      metadata: generationHistory.metadata,
      keyword: generationHistory.keyword,
      articleType: generationHistory.articleType,
      createdAt: generationHistory.createdAt,
    })
    .from(generationHistory)
    .where(
      and(
        eq(generationHistory.userId, userId),
        inArray(generationHistory.status, ['generating', 'pending'])
      )
    )
    .orderBy(desc(generationHistory.createdAt))
    .limit(5) // Check recent entries
    .all()

  if (!recentEntries.length) {
    return Response.json({ active: false })
  }

  // Check each entry for an active Trigger.dev run
  for (const entry of recentEntries) {
    try {
      const meta = entry.metadata ? JSON.parse(entry.metadata) : {}
      const triggerRunId = meta.triggerRunId

      if (!triggerRunId) continue

      // Check if the run is still active using Trigger.dev SDK
      try {
        const run = await runs.retrieve(triggerRunId)
        
        // Active statuses that can be reconnected to
        const activeStatuses = ['QUEUED', 'EXECUTING', 'REATTEMPTING', 'FROZEN']
        
        if (activeStatuses.includes(run.status)) {
          // Issue a fresh public token for this run
          const publicToken = await auth.createPublicToken({
            scopes: { read: { runs: [triggerRunId] } },
            expirationTime: '30m',
          })

          return Response.json({
            active: true,
            runId: triggerRunId,
            publicToken,
            historyId: entry.id,
            keyword: entry.keyword,
            articleType: entry.articleType,
            formState: meta.formState || null,
          })
        }
      } catch (triggerError) {
        // Run might not exist or be inaccessible, continue to next
        console.error('[active-run] Failed to retrieve run:', triggerRunId, triggerError)
        continue
      }
    } catch {
      // Skip unparseable metadata
      continue
    }
  }

  return Response.json({ active: false })
}
