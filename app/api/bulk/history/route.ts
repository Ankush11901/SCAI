import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles, generationCostSummaries } from '@/lib/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';

/**
 * GET /api/bulk/history
 *
 * Get user's bulk generation job history.
 *
 * Query params:
 * - limit: number (default: 10, max: 50)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobs)
      .where(eq(bulkJobs.userId, userId));

    // Get jobs
    const jobs = await db
      .select()
      .from(bulkJobs)
      .where(eq(bulkJobs.userId, userId))
      .orderBy(desc(bulkJobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get article counts and costs for each job
    const jobsWithArticles = await Promise.all(
      jobs.map(async (job) => {
        const articles = await db
          .select({
            id: bulkJobArticles.id,
            articleType: bulkJobArticles.articleType,
            keyword: bulkJobArticles.keyword,
            status: bulkJobArticles.status,
            wordCount: bulkJobArticles.wordCount,
            historyId: bulkJobArticles.historyId,
          })
          .from(bulkJobArticles)
          .where(eq(bulkJobArticles.bulkJobId, job.id));

        // Get total cost from generation_cost_summaries for this job's articles
        const historyIds = articles
          .map(a => a.historyId)
          .filter((id): id is string => id !== null);

        let totalCostMicroDollars = 0;
        if (historyIds.length > 0) {
          const costResults = await db
            .select({ totalCostUsd: generationCostSummaries.totalCostUsd })
            .from(generationCostSummaries)
            .where(inArray(generationCostSummaries.historyId, historyIds));

          totalCostMicroDollars = costResults.reduce(
            (sum, c) => sum + (c.totalCostUsd || 0),
            0
          );
        }

        const stats = {
          total: articles.length,
          complete: articles.filter(a => a.status === 'complete').length,
          error: articles.filter(a => a.status === 'error').length,
          pending: articles.filter(a => a.status === 'pending' || a.status === 'generating').length,
          totalWords: articles.reduce((sum, a) => sum + (a.wordCount || 0), 0),
          totalCostMicroDollars,
        };

        return {
          id: job.id,
          mode: job.mode,
          keyword: job.keyword,
          variation: job.variation,
          status: job.status,
          totalArticles: job.totalArticles,
          completedArticles: job.completedArticles,
          failedArticles: job.failedArticles,
          stats,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        };
      })
    );

    return new Response(
      JSON.stringify({
        jobs: jobsWithArticles,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/history] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to get history: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
