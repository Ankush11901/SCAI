import { NextRequest } from 'next/server';
import { runs } from "@trigger.dev/sdk";
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { releaseQuota } from '@/lib/services/quota-service';

/**
 * POST /api/bulk/[jobId]/cancel
 *
 * Cancel a running bulk generation job.
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

    // Can only cancel if job is running or queued
    if (job.status !== 'running' && job.status !== 'queued' && job.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Job is not running and cannot be cancelled' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const wasQueued = job.status === 'queued';
    const wasRunning = job.status === 'running';

    // If job was 'queued' (never started), release the reserved quota
    if (wasQueued && job.quotaReserved && job.quotaReserved > 0) {
      try {
        await releaseQuota(userId, job.quotaReserved);
        console.log(`[bulk/[jobId]/cancel] Released ${job.quotaReserved} quota for queued job`);
      } catch (error) {
        console.warn('[bulk/[jobId]/cancel] Could not release quota:', error);
      }
    }

    // Cancel Trigger.dev job if it exists
    if (job.triggerJobId) {
      try {
        await runs.cancel(job.triggerJobId);
        console.log(`[bulk/[jobId]/cancel] Cancelled Trigger.dev run: ${job.triggerJobId}`);
      } catch (error) {
        // Job might already be completed or not exist
        console.warn('[bulk/[jobId]/cancel] Could not cancel Trigger.dev run:', error);
      }
    }

    // Get pending/generating articles
    const pendingArticles = await db
      .select()
      .from(bulkJobArticles)
      .where(
        and(
          eq(bulkJobArticles.bulkJobId, jobId),
          inArray(bulkJobArticles.status, ['pending', 'generating'])
        )
      );

    // Mark pending articles as cancelled (using error status)
    if (pendingArticles.length > 0) {
      await db.update(bulkJobArticles)
        .set({
          status: 'error',
          errorMessage: 'Cancelled by user',
        })
        .where(
          and(
            eq(bulkJobArticles.bulkJobId, jobId),
            inArray(bulkJobArticles.status, ['pending', 'generating'])
          )
        );
    }

    // Update job status
    await db.update(bulkJobs)
      .set({
        status: 'cancelled',
        failedArticles: (job.failedArticles || 0) + pendingArticles.length,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bulkJobs.id, jobId));

    console.log(`[bulk/[jobId]/cancel] Cancelled job ${jobId}, ${pendingArticles.length} articles affected`);

    // If the cancelled job was running, start the next queued job
    if (wasRunning) {
      // Reorder queue positions first
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

      // Trigger start-next endpoint
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${appUrl}/api/bulk/queue/start-next`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': process.env.INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({ userId }),
        });
        console.log(`[bulk/[jobId]/cancel] Triggered start-next for user ${userId}`);
      } catch (error) {
        console.warn('[bulk/[jobId]/cancel] Could not trigger start-next:', error);
      }
    }

    // If cancelled a queued job, reorder remaining queue positions
    if (wasQueued) {
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelledCount: pendingArticles.length,
        completedCount: job.completedArticles || 0,
        quotaReleased: wasQueued ? job.quotaReserved : 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/[jobId]/cancel] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to cancel job: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
