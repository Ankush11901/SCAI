import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles, generationHistory } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * GET /api/bulk/[jobId]
 *
 * Get status of a bulk generation job and its articles.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the job
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(and(eq(bulkJobs.id, jobId), eq(bulkJobs.userId, userId)))
      .limit(1);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all articles for this job
    const articles = await db
      .select()
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.bulkJobId, jobId));

    // Get priorities from generationHistory for completed articles
    const historyIds = articles
      .map(a => a.historyId)
      .filter((id): id is string => id !== null);

    const priorityMap = new Map<string, number>();
    if (historyIds.length > 0) {
      const priorities = await db
        .select({
          id: generationHistory.id,
          priority: generationHistory.priority,
        })
        .from(generationHistory)
        .where(inArray(generationHistory.id, historyIds));

      priorities.forEach(p => {
        priorityMap.set(p.id, p.priority ?? 0);
      });
    }

    // Calculate stats
    const stats = {
      total: articles.length,
      pending: articles.filter(a => a.status === 'pending').length,
      generating: articles.filter(a => a.status === 'generating').length,
      complete: articles.filter(a => a.status === 'complete').length,
      error: articles.filter(a => a.status === 'error').length,
      avgProgress: articles.length > 0
        ? Math.round(articles.reduce((sum, a) => sum + (a.progress || 0), 0) / articles.length)
        : 0,
      totalWords: articles.reduce((sum, a) => sum + (a.wordCount || 0), 0),
    };

    // Sort articles by priority (pillar first) then by completedAt
    const sortedArticles = [...articles].sort((a, b) => {
      const priorityA = a.priority || (a.historyId ? (priorityMap.get(a.historyId) ?? 0) : 0);
      const priorityB = b.priority || (b.historyId ? (priorityMap.get(b.historyId) ?? 0) : 0);
      if (priorityB !== priorityA) return priorityB - priorityA;
      // Then by completedAt (newest first)
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    return new Response(
      JSON.stringify({
        job: {
          id: job.id,
          mode: job.mode,
          keyword: job.keyword,
          variation: job.variation,
          status: job.status,
          totalArticles: job.totalArticles,
          completedArticles: job.completedArticles,
          failedArticles: job.failedArticles,
          settings: job.settings ? JSON.parse(job.settings) : null,
          errorMessage: job.errorMessage,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        },
        articles: sortedArticles.map(a => ({
          id: a.id,
          articleType: a.articleType,
          keyword: a.keyword,
          status: a.status,
          phase: a.phase,
          progress: a.progress,
          wordCount: a.wordCount,
          imageCount: a.imageCount,
          htmlContent: a.htmlContent,
          historyId: a.historyId,
          priority: a.priority || (a.historyId ? (priorityMap.get(a.historyId) ?? 0) : 0),
          errorMessage: a.errorMessage,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
        })),
        stats,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/[jobId]] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to get job: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
