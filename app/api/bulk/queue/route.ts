import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';

/**
 * GET /api/bulk/queue
 *
 * Get the user's bulk job queue (running + queued jobs)
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

  try {
    // Get running + queued jobs ordered by queue position
    const jobs = await db
      .select({
        id: bulkJobs.id,
        mode: bulkJobs.mode,
        keyword: bulkJobs.keyword,
        variation: bulkJobs.variation,
        status: bulkJobs.status,
        queuePosition: bulkJobs.queuePosition,
        quotaReserved: bulkJobs.quotaReserved,
        totalArticles: bulkJobs.totalArticles,
        completedArticles: bulkJobs.completedArticles,
        failedArticles: bulkJobs.failedArticles,
        createdAt: bulkJobs.createdAt,
        startedAt: bulkJobs.startedAt,
      })
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.userId, userId),
          inArray(bulkJobs.status, ['running', 'queued'])
        )
      )
      .orderBy(asc(bulkJobs.queuePosition));

    // Get article counts for each job
    const jobsWithArticles = await Promise.all(
      jobs.map(async (job) => {
        const articles = await db
          .select({
            id: bulkJobArticles.id,
            articleType: bulkJobArticles.articleType,
            keyword: bulkJobArticles.keyword,
            status: bulkJobArticles.status,
            progress: bulkJobArticles.progress,
          })
          .from(bulkJobArticles)
          .where(eq(bulkJobArticles.bulkJobId, job.id));

        return {
          ...job,
          articles,
        };
      })
    );

    return new Response(
      JSON.stringify({
        jobs: jobsWithArticles,
        runningJob: jobsWithArticles.find((j) => j.status === 'running') || null,
        queuedJobs: jobsWithArticles.filter((j) => j.status === 'queued'),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/queue] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to get queue: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
