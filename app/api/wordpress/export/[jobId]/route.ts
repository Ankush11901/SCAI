import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db, exportJobs } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * GET /api/wordpress/export/{jobId}
 * Fetch the status of an export job.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { jobId } = await params

  const [job] = await db
    .select()
    .from(exportJobs)
    .where(and(eq(exportJobs.id, jobId), eq(exportJobs.userId, userId)))
    .limit(1)

  if (!job) {
    return NextResponse.json({ error: 'Export job not found' }, { status: 404 })
  }

  let articles = []
  try {
    articles = JSON.parse(job.articles)
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      postStatus: job.postStatus,
      totalArticles: job.totalArticles,
      completedArticles: job.completedArticles,
      failedArticles: job.failedArticles,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
      createdAt: job.createdAt?.toISOString() || null,
    },
    articles,
  })
}
