import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generationJobs, generationHistory, articleImages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/generate/status/[jobId]
 * 
 * Get the current status of a generation job.
 * Used for polling fallback if Pusher connection fails.
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
    // Get job record (verify user owns it)
    const jobs = await db.select()
      .from(generationJobs)
      .where(and(
        eq(generationJobs.id, jobId),
        eq(generationJobs.userId, userId)
      ))
      .limit(1);

    if (jobs.length === 0) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const job = jobs[0];

    // Get associated history if exists
    let history = null;
    if (job.historyId) {
      const histories = await db.select()
        .from(generationHistory)
        .where(eq(generationHistory.id, job.historyId))
        .limit(1);
      history = histories[0] || null;
    }

    // Get image statuses if job is in progress or completed
    let images: Array<{
      id: string;
      status: string;
      url: string | null;
      componentType: string | null;
    }> = [];

    if (job.historyId && (job.status === 'running' || job.status === 'completed')) {
      const imageRecords = await db.select({
        id: articleImages.id,
        status: articleImages.status,
        url: articleImages.publicUrl,
        componentType: articleImages.componentType,
      })
        .from(articleImages)
        .where(eq(articleImages.historyId, job.historyId));

      images = imageRecords;
    }

    // Parse metadata
    let metadata = {};
    try {
      metadata = job.metadata ? JSON.parse(job.metadata) : {};
    } catch {
      // Ignore parse errors
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        historyId: job.historyId,
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        totalImages: job.totalImages,
        completedImages: job.completedImages,
        errorMessage: job.errorMessage,
        metadata,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        // Include history data if completed
        article: history && job.status === 'completed' ? {
          htmlContent: history.htmlContent,
          wordCount: history.wordCount,
        } : null,
        // Include image statuses
        images,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Allow caching for 2 seconds to reduce polling load
          'Cache-Control': 'private, max-age=2',
        },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate/status] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to get job status: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
