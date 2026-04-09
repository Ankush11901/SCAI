import { NextRequest } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles, articleClusters } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { bulkGenerateTask, BulkGenerationPayload } from '@/lib/jobs/bulk-generate';
import type { TitleVariation } from '@/lib/types/generation';

/**
 * POST /api/bulk/[jobId]/retry
 *
 * Retry failed articles in a bulk generation job.
 *
 * Body:
 * - articleIds?: string[] - Specific articles to retry. If not provided, retries all failed.
 */
export async function POST(
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

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const { articleIds } = body as { articleIds?: string[] };

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

    // If this is a cluster job, fetch the cluster plan for retry context
    let clusterPlan: BulkGenerationPayload['clusterPlan'] | undefined;
    if (job.clusterId) {
      const [cluster] = await db
        .select()
        .from(articleClusters)
        .where(eq(articleClusters.id, job.clusterId))
        .limit(1);

      if (cluster?.clusterPlan) {
        try {
          clusterPlan = JSON.parse(cluster.clusterPlan as string);
        } catch {
          console.warn(`[bulk/[jobId]/retry] Failed to parse clusterPlan for cluster ${job.clusterId}`);
        }
      }
    }

    // Can only retry if job is completed or failed
    if (job.status === 'running' || job.status === 'queued') {
      return new Response(
        JSON.stringify({ error: 'Cannot retry while job is still running' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get failed articles
    let failedArticles;
    if (articleIds && articleIds.length > 0) {
      // Specific articles
      failedArticles = await db
        .select()
        .from(bulkJobArticles)
        .where(
          and(
            eq(bulkJobArticles.bulkJobId, jobId),
            eq(bulkJobArticles.status, 'error'),
            inArray(bulkJobArticles.id, articleIds)
          )
        );
    } else {
      // All failed articles
      failedArticles = await db
        .select()
        .from(bulkJobArticles)
        .where(
          and(
            eq(bulkJobArticles.bulkJobId, jobId),
            eq(bulkJobArticles.status, 'error')
          )
        );
    }

    if (failedArticles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No failed articles to retry' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Reset failed articles to pending (increment retry count)
    const articlesToRetry = failedArticles.map(a => a.id);
    for (const article of failedArticles) {
      await db.update(bulkJobArticles)
        .set({
          status: 'pending',
          phase: 'queued',
          progress: 0,
          errorMessage: null,
          retryCount: (article.retryCount || 0) + 1,
        })
        .where(eq(bulkJobArticles.id, article.id));
    }

    // Parse job settings
    const settings = job.settings ? JSON.parse(job.settings as string) : {};

    // Prepare retry payload (only failed articles)
    const retryPayload: BulkGenerationPayload = {
      jobId,
      userId,
      variation: job.variation as TitleVariation,
      articles: failedArticles.map(a => ({
        id: a.id,
        articleType: a.articleType,
        keyword: a.keyword,
      })),
      settings: {
        targetWordCount: settings.targetWordCount,
        variationName: settings.variationName,
        provider: settings.provider,
        skipImages: settings.skipImages,
        imageProvider: settings.imageProvider || 'flux',
        excludeComponents: settings.excludeComponents,
      },
      // Preserve cluster context so retried articles get interlinking,
      // per-article variations, and isPillar priority
      ...(job.clusterId && clusterPlan ? {
        clusterMode: true,
        clusterId: job.clusterId,
        clusterPlan,
      } : {}),
    };

    // Trigger retry job
    const handle = await tasks.trigger<typeof bulkGenerateTask>("bulk-generate", retryPayload);

    // Update job status with new trigger ID
    const newFailedCount = (job.failedArticles || 0) - failedArticles.length;
    await db.update(bulkJobs)
      .set({
        status: 'queued',
        triggerJobId: handle.id,
        failedArticles: Math.max(0, newFailedCount),
        errorMessage: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bulkJobs.id, jobId));

    console.log(`[bulk/[jobId]/retry] Retrying ${failedArticles.length} articles for job ${jobId}, trigger run: ${handle.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        retriedCount: failedArticles.length,
        articleIds: articlesToRetry,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/[jobId]/retry] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to retry articles: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
