import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { getHistoryEntry } from '@/lib/services/history-service'

/**
 * GET /api/generate/history-status?historyId=xxx
 *
 * Returns the current status and HTML of a generation history entry.
 * Used for reconnection: when the user returns to the page after navigating
 * away, this endpoint lets the frontend check if images completed in the background.
 */
export async function GET(req: NextRequest) {
  const historyId = req.nextUrl.searchParams.get('historyId')
  if (!historyId) {
    return Response.json({ error: 'Missing historyId parameter' }, { status: 400 })
  }

  // Authenticate
  const authSession = await getAuthSession()
  const userId = authSession?.user?.id || null

  if (!userId) {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Fetch history entry (validates ownership via userId)
  const entry = await getHistoryEntry(historyId, userId)
  if (!entry) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  let metadata: Record<string, unknown> = {}
  try {
    if (entry.metadata) metadata = JSON.parse(entry.metadata)
  } catch { /* ignore */ }

  return Response.json({
    historyId: entry.id,
    status: entry.status,
    htmlContent: entry.htmlContent,
    wordCount: entry.wordCount,
    metadata,
    // Include form inputs for reconnection (database fallback)
    articleType: entry.articleType,
    keyword: entry.keyword,
  })
}
