import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db, generationHistory } from '@/lib/db'
import { eq, and, isNull } from 'drizzle-orm'
import {
  getConnectionWithCredentials,
  exportToCMS,
  extractTitle,
  type CMSPlatform,
} from '@/lib/services/cms'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * POST /api/cms/export
 * Export an article to a CMS platform.
 *
 * Body: {
 *   connectionId: string,
 *   historyId: string,
 *   title?: string,
 *   tags?: string[],
 *   publishStatus?: 'draft' | 'publish'
 * }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { connectionId, historyId, title, tags, publishStatus } = body as {
      connectionId: string
      historyId: string
      title?: string
      tags?: string[]
      publishStatus?: 'draft' | 'publish'
    }

    if (!connectionId || !historyId) {
      return NextResponse.json(
        { error: 'connectionId and historyId are required' },
        { status: 400 }
      )
    }

    // Get the connection with credentials
    const connectionData = await getConnectionWithCredentials(connectionId, userId)
    if (!connectionData) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { connection, credentials } = connectionData

    // Get the article
    const article = await db.query.generationHistory.findFirst({
      where: and(
        eq(generationHistory.id, historyId),
        eq(generationHistory.userId, userId),
        isNull(generationHistory.deletedAt)
      ),
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    if (!article.htmlContent) {
      return NextResponse.json({ error: 'Article has no content' }, { status: 400 })
    }

    // Extract title if not provided
    const articleTitle = title || extractTitle(article.htmlContent) || article.keyword || 'Untitled'

    // Export to CMS
    const result = await exportToCMS(
      connection.platform as CMSPlatform,
      credentials,
      connection.metadata || {},
      article.htmlContent,
      articleTitle,
      tags || [],
      publishStatus || 'draft'
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      postId: result.postId,
      postUrl: result.postUrl,
      editUrl: result.editUrl,
    })
  } catch (error) {
    console.error('[cms-export] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
