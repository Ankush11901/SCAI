import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db, exportJobs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk'
import type { wpExportTask } from '@/lib/jobs/wp-export'
import { canExportWordPress, canBulkExportWordPress } from '@/lib/services/access-service'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * POST /api/wordpress/export
 * Trigger a background export job for one or more articles.
 *
 * Body: {
 *   connectionId: string,
 *   postStatus?: 'draft' | 'publish',
 *   articles: Array<{
 *     historyId: string,
 *     keyword: string,
 *     categories: string[],
 *     tags: string[],
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      connectionId,
      postStatus = 'draft',
      articles,
    } = body as {
      connectionId: string
      postStatus?: 'draft' | 'publish'
      articles: Array<{
        historyId: string
        keyword: string
        categories: string[]
        tags: string[]
      }>
    }

    if (!connectionId || !articles?.length) {
      return NextResponse.json(
        { error: 'connectionId and articles are required' },
        { status: 400 }
      )
    }

    // Check access permissions based on export type
    if (articles.length > 1) {
      // Bulk export - check bulk permission
      const bulkAccess = await canBulkExportWordPress(userId)
      if (!bulkAccess.allowed) {
        return NextResponse.json(
          {
            error: bulkAccess.reason || 'Bulk WordPress export requires a Pro subscription',
            upgradeRequired: bulkAccess.upgradeRequired,
            requiredTier: bulkAccess.requiredTier,
          },
          { status: 403 }
        )
      }
    } else {
      // Single export - check basic export permission
      const exportAccess = await canExportWordPress(userId)
      if (!exportAccess.allowed) {
        return NextResponse.json(
          {
            error: exportAccess.reason || 'WordPress export requires a subscription',
            upgradeRequired: exportAccess.upgradeRequired,
            requiredTier: exportAccess.requiredTier,
          },
          { status: 403 }
        )
      }
    }

    // Generate job ID
    const jobId = `export_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`

    // Build initial articles state
    const articlesState = articles.map((a) => ({
      historyId: a.historyId,
      keyword: a.keyword,
      categories: a.categories,
      tags: a.tags,
      status: 'pending' as const,
    }))

    // Create export job record
    await db.insert(exportJobs).values({
      id: jobId,
      userId,
      connectionId,
      postStatus,
      totalArticles: articles.length,
      articles: JSON.stringify(articlesState),
    })

    // Trigger the background task
    const handle = await tasks.trigger<typeof wpExportTask>('wp-export', {
      jobId,
      userId,
      connectionId,
      postStatus,
      articles: articles.map((a) => ({
        historyId: a.historyId,
        keyword: a.keyword,
        categories: a.categories,
        tags: a.tags,
      })),
    })

    // Update job with trigger run ID
    await db
      .update(exportJobs)
      .set({
        triggerJobId: handle.id,
        updatedAt: new Date(),
      })
      .where(eq(exportJobs.id, jobId))

    return NextResponse.json({
      success: true,
      jobId,
      channelName: `private-export-${jobId}`,
      totalArticles: articles.length,
    })
  } catch (error) {
    console.error('[wp-export] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
