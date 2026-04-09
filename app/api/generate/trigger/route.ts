import { NextRequest } from 'next/server';
import { tasks } from "@trigger.dev/sdk";
import { getAuthSession } from '@/lib/auth';
import { incrementQuotaUsage, QuotaExceededError } from '@/lib/services/quota-service';
import { createHistoryEntry } from '@/lib/services/history-service';
import { checkGenerationAccess, canUseImageProvider } from '@/lib/services/access-service';
import { db } from '@/lib/db';
import { generationJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { orchestrateGenerationTask, type OrchestrationPayload, type ImagePlaceholder } from '@/lib/jobs/orchestrate-generation';
import type { ArticleType, ImageType, ImageProvider } from '@/lib/services/imagen';

/**
 * POST /api/generate/trigger
 * 
 * Trigger a background article generation job.
 * 
 * This endpoint:
 * 1. Validates authentication and quota
 * 2. Creates history and job records
 * 3. Triggers the Trigger.dev orchestration task
 * 4. Returns immediately with jobId for client to subscribe via Pusher
 * 
 * The client should:
 * 1. Call this endpoint to start generation
 * 2. Subscribe to Pusher channel `private-generation-{jobId}`
 * 3. Receive real-time updates as content and images are generated
 */
export async function POST(req: NextRequest) {
  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body first to get imageProvider
  const body = await req.json();
  const {
    articleType,
    topic,
    targetWordCount = 1000,
    htmlWithPlaceholders,
    wordCount,
    imagePlaceholders,
    variationName,
    provider,
    historyId, // Passed from /api/generate complete event
    skipImages = false, // Skip image generation in dev mode
    imageProvider, // Image provider (gemini or flux)
    estimatedCredits, // Credits deducted upfront (for failure refund)
  } = body as {
    articleType: ArticleType;
    topic: string;
    targetWordCount?: number;
    htmlWithPlaceholders: string;
    wordCount: number;
    imagePlaceholders: ImagePlaceholder[];
    variationName?: string;
    provider?: string;
    historyId?: string;
    skipImages?: boolean;
    imageProvider?: ImageProvider;
    estimatedCredits?: number;
  };

  // Check if user has access to the requested image provider
  if (imageProvider) {
    const providerAccess = await canUseImageProvider(userId, imageProvider)
    if (!providerAccess.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Upgrade required',
          message: providerAccess.reason || `Your current plan does not include access to ${imageProvider}. Please upgrade to ${providerAccess.requiredTier || 'Pro'} plan.`,
          imageProvider,
          upgradeRequired: providerAccess.upgradeRequired,
          requiredTier: providerAccess.requiredTier,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  // Check generation access and get access details
  const accessCheck = await checkGenerationAccess(userId)
  if (!accessCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: accessCheck.reason || 'Insufficient credits or quota',
        details: accessCheck,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Check and increment quota (legacy system only)
  if (!process.env.USE_CREDIT_SYSTEM) {
    try {
      await incrementQuotaUsage(userId);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return new Response(
          JSON.stringify({
            error: 'Daily quota exceeded',
            used: error.used,
            limit: error.limit,
            resetsAt: error.resetsAt.toISOString(),
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      console.error('[generate/trigger] Quota error:', error);
    }
  }

  // Validate required fields
  if (!articleType || !topic) {
    return new Response(JSON.stringify({ error: 'Missing articleType or topic' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!htmlWithPlaceholders) {
    return new Response(JSON.stringify({ error: 'Missing htmlWithPlaceholders - content must be generated first' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Generate unique IDs
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log('[generate/trigger] Starting job:', {
      jobId,
      articleType,
      topic,
      historyId,
      userId,
      imageCount: imagePlaceholders?.length || 0,
    });

    // Use existing historyId from /api/generate, or create new if not provided
    let finalHistoryId = historyId;
    if (!finalHistoryId) {
      const historyEntry = await createHistoryEntry({
        userId,
        articleType,
        keyword: topic,
        variation: 'statement',
        status: 'pending',
      });
      finalHistoryId = historyEntry.id;
      console.log('[generate/trigger] Created new historyId:', finalHistoryId);
    }

    // Create job record (no FK constraints, so this should always work)
    await db.insert(generationJobs).values({
      id: jobId,
      historyId: finalHistoryId,
      userId,
      status: 'pending',
      phase: 'queued',
      progress: 0,
      totalImages: imagePlaceholders?.length || 0,
      completedImages: 0,
      metadata: JSON.stringify({
        articleType,
        topic,
        targetWordCount,
        variationName,
        provider,
      }),
    });

    // Prepare orchestration payload
    const payload: OrchestrationPayload = {
      jobId,
      userId,
      historyId: finalHistoryId,
      articleType,
      topic,
      targetWordCount,
      htmlWithPlaceholders,
      wordCount,
      imagePlaceholders: imagePlaceholders || [],
      variationName,
      provider,
      skipImages, // Pass skipImages flag to orchestration task
      imageProvider, // Pass image provider to orchestration task
      estimatedCredits, // Pass estimated credits for failure refund
    };

    // Trigger the background job
    const handle = await tasks.trigger<typeof orchestrateGenerationTask>(
      "orchestrate-generation",
      payload
    );

    // Update job with trigger ID
    await db.update(generationJobs)
      .set({
        triggerJobId: handle.id,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    console.log(`[generate/trigger] Job triggered: ${jobId} (trigger: ${handle.id})`);

    // Return immediately with job info
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        historyId: finalHistoryId,
        triggerRunId: handle.id,
        channelName: `private-generation-${jobId}`,
        estimatedImages: imagePlaceholders?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate/trigger] Error:', message);

    return new Response(
      JSON.stringify({ error: `Failed to trigger generation: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
