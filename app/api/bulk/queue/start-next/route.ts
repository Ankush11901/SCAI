import { NextRequest } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { bulkGenerateTask, BulkGenerationPayload } from '@/lib/jobs/bulk-generate';

/**
 * POST /api/bulk/queue/start-next
 *
 * Start the next queued job for a user.
 * Called after a job completes or is cancelled.
 *
 * This is an internal endpoint - only called from Trigger.dev jobs
 * or the cancel endpoint.
 */
export async function POST(req: NextRequest) {
  // Verify internal API key for security
  const internalKey = req.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  // For development, allow without key if not set
  if (expectedKey && internalKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if there's already a running job
    const [runningJob] = await db
      .select()
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.userId, userId),
          eq(bulkJobs.status, 'running')
        )
      )
      .limit(1);

    if (runningJob) {
      console.log('[bulk/queue/start-next] Job already running:', runningJob.id);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'A job is already running',
          runningJobId: runningJob.id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Find next queued job
    const [nextJob] = await db
      .select()
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.userId, userId),
          eq(bulkJobs.status, 'queued')
        )
      )
      .orderBy(asc(bulkJobs.queuePosition))
      .limit(1);

    if (!nextJob) {
      console.log('[bulk/queue/start-next] No queued jobs for user:', userId);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No queued jobs to start',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[bulk/queue/start-next] Starting next job:', nextJob.id);

    // Get articles for this job
    const articles = await db
      .select({
        id: bulkJobArticles.id,
        articleType: bulkJobArticles.articleType,
        keyword: bulkJobArticles.keyword,
      })
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.bulkJobId, nextJob.id));

    // Parse settings
    const settings = nextJob.settings ? JSON.parse(nextJob.settings) : {};

    // Prepare the payload for Trigger.dev
    const triggerPayload: BulkGenerationPayload = {
      jobId: nextJob.id,
      userId: nextJob.userId,
      variation: nextJob.variation as 'question' | 'statement' | 'listicle',
      articles: articles.map(a => ({
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
    };

    // Trigger the background job
    const handle = await tasks.trigger<typeof bulkGenerateTask>("bulk-generate", triggerPayload);

    // Update job status to running
    await db.update(bulkJobs)
      .set({
        status: 'running',
        queuePosition: 0,
        triggerJobId: handle.id,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bulkJobs.id, nextJob.id));

    // Reorder remaining queue positions
    const remainingQueued = await db
      .select({ id: bulkJobs.id, queuePosition: bulkJobs.queuePosition })
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.userId, userId),
          eq(bulkJobs.status, 'queued')
        )
      )
      .orderBy(asc(bulkJobs.queuePosition));

    for (let i = 0; i < remainingQueued.length; i++) {
      await db.update(bulkJobs)
        .set({ queuePosition: i + 1 })
        .where(eq(bulkJobs.id, remainingQueued[i].id));
    }

    console.log(`[bulk/queue/start-next] Job started: ${nextJob.id}, trigger run: ${handle.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: nextJob.id,
        triggerId: handle.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/queue/start-next] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to start next job: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
