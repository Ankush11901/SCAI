import { NextRequest } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import { getAuthSession } from '@/lib/auth';
import { getQuotaInfo, reserveQuota } from '@/lib/services/quota-service';
import { checkGenerationAccess, canUseImageProvider, getUserFeatureFlags } from '@/lib/services/access-service';
import { estimateArticleCredits, calculateImageCount } from '@/lib/services/credit-estimator';
import { getCreditInfo, InsufficientCreditsError } from '@/lib/services/credit-service';
import { formatTimeUntil } from '@/lib/utils/time';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { ARTICLE_TYPES } from '@/data/article-types';
import crypto from 'crypto';
import type { bulkGenerateTask, BulkGenerationPayload } from '@/lib/jobs/bulk-generate';
import type { ImageProvider } from '@/lib/services/imagen';
import type { TitleVariation } from '@/lib/types/generation';
import { canStartBulkJob, estimateWaitTime, getSystemLoad } from '@/lib/services/concurrency-manager';

interface CSVRow {
  keyword: string;
  articleType: string;
}

interface BulkSettings {
  targetWordCount?: number;
  variationName?: string;
  provider?: string;
  skipImages?: boolean;
  imageProvider?: string;
  excludeComponents?: string[];
}

/**
 * POST /api/bulk/start
 *
 * Start a bulk article generation job.
 *
 * This endpoint:
 * 1. Validates authentication
 * 2. Checks quota for ALL articles upfront
 * 3. Ensures no other bulk job is running (queue system)
 * 4. Creates bulk job and article records
 * 5. Triggers the Trigger.dev bulk-generate task
 * 6. Returns job info for client to subscribe via Pusher
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

  // Parse request body
  const body = await req.json();
  const {
    mode,
    keyword,
    csvData,
    variation,
    variations: variationsFromBody,
    settings = {},
  } = body as {
    mode: 'single' | 'csv';
    keyword?: string;
    csvData?: CSVRow[];
    variation?: 'question' | 'statement' | 'listicle';
    variations?: Array<'question' | 'statement' | 'listicle'>;
    settings?: BulkSettings;
  };

  // Support both single variation (legacy) and variations array
  const variations: Array<'question' | 'statement' | 'listicle'> = variationsFromBody || (variation ? [variation] : ['statement']);

  // Validate required fields
  if (!mode || variations.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing mode or variation(s)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (mode === 'single' && !keyword?.trim()) {
    return new Response(JSON.stringify({ error: 'Missing keyword for single mode' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (mode === 'csv' && (!csvData || csvData.length === 0)) {
    return new Response(JSON.stringify({ error: 'Missing CSV data for csv mode' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Calculate articles to generate (for each variation)
  const baseArticles = mode === 'single'
    ? ARTICLE_TYPES.map(type => ({ keyword: keyword!.trim(), articleType: type.id }))
    : csvData!.map(row => ({ keyword: row.keyword, articleType: row.articleType }));

  // Expand to include all variations
  const articlesToGenerate: Array<{ keyword: string; articleType: string; variation: string }> = [];
  for (const article of baseArticles) {
    for (const v of variations) {
      articlesToGenerate.push({
        keyword: article.keyword,
        articleType: article.articleType,
        variation: v,
      });
    }
  }

  const totalArticles = articlesToGenerate.length;

  try {
    // 1. Check plan features - bulk generation is paid-only
    const features = await getUserFeatureFlags(userId);
    if (!features.canUseBulkGeneration) {
      return new Response(
        JSON.stringify({
          error: 'Upgrade required',
          message: 'Bulk generation is only available on Pro plan. Please upgrade to access this feature.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Check if user has access to requested image provider
    if (settings.imageProvider) {
      const providerAccess = await canUseImageProvider(userId, settings.imageProvider as ImageProvider);
      if (!providerAccess.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Upgrade required',
            message: providerAccess.reason || `Your current plan does not include access to ${settings.imageProvider}. Please upgrade to ${providerAccess.requiredTier || 'Pro'} plan.`,
            imageProvider: settings.imageProvider,
            upgradeRequired: providerAccess.upgradeRequired,
            requiredTier: providerAccess.requiredTier,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 3. Check generation access 
    const accessCheck = await checkGenerationAccess(userId);
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
      );
    }

    // 4. Estimate total credits needed for bulk generation
    const bulkWordCount = settings.targetWordCount || 1500;
    let totalEstimatedCredits = 0;
    for (const article of articlesToGenerate) {
      const imageCount = settings.skipImages ? 0 : calculateImageCount(article.articleType, bulkWordCount);
      const estimate = estimateArticleCredits({
        articleType: article.articleType,
        wordCount: bulkWordCount,
        imageCount,
        imageProvider: (settings.imageProvider as ImageProvider) || 'flux',
      });
      totalEstimatedCredits += estimate.totalCredits;
    }

    // 5. Check if user has enough credits for the bulk job
    const creditInfo = await getCreditInfo(userId);
    const dailyRemaining = creditInfo.daily?.remaining ?? 0;
    const monthlyRemaining = creditInfo.monthly?.remaining ?? 0;
    const totalAvailable = dailyRemaining + monthlyRemaining + creditInfo.paygBalance;
    const overageRemaining = creditInfo.overage?.remaining ?? 0;
    const totalWithOverage = totalAvailable + overageRemaining;
    
    if (totalEstimatedCredits > totalWithOverage) {
      const resetsIn = formatTimeUntil(creditInfo.monthly?.resetsAt);
      return new Response(
        JSON.stringify({
          error: 'Insufficient credits for bulk generation',
          tier: creditInfo.tier,
          creditsRequired: totalEstimatedCredits,
          creditsAvailable: totalAvailable,
          overageAvailable: creditInfo.overage?.remaining ?? 0,
          articleCount: totalArticles,
          creditsPerArticle: Math.round(totalEstimatedCredits / totalArticles),
          resetsIn,
          renewsIn: creditInfo.tier === 'pro' ? resetsIn : undefined,
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Check quota FIRST (before checking for running job)
    const quotaInfo = await getQuotaInfo(userId);

    if (!quotaInfo.unlimited && quotaInfo.remaining < totalArticles) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient quota for bulk generation',
          required: totalArticles,
          remaining: quotaInfo.remaining,
          limit: quotaInfo.limit,
          resetsAt: quotaInfo.resetsAt,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Reserve quota immediately (deduct from available)
    if (!quotaInfo.unlimited) {
      await reserveQuota(userId, totalArticles);
    }

    // 6. Check for existing running job
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

    // Generate unique job ID
    const jobId = `bulk_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    // 7. Check system-wide capacity (global concurrency limits)
    const capacityCheck = await canStartBulkJob(userId);

    // 8. If running job exists OR system at capacity, queue this job
    if (runningJob || !capacityCheck.allowed) {
      // Get current queue count
      const queuedJobs = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkJobs)
        .where(
          and(
            eq(bulkJobs.userId, userId),
            eq(bulkJobs.status, 'queued')
          )
        );

      const queuePosition = (queuedJobs[0]?.count || 0) + 1;

      console.log('[bulk/start] Queueing job:', {
        jobId,
        userId,
        mode,
        totalArticles,
        variations,
        queuePosition,
        reason: runningJob ? 'user has running job' : 'system capacity',
        systemLoad: capacityCheck.systemLoad,
      });

      // Create queued job record
      await db.insert(bulkJobs).values({
        id: jobId,
        userId,
        mode,
        keyword: mode === 'single' ? keyword!.trim() : null,
        variation: variations.join(','),
        status: 'queued',
        queuePosition,
        quotaReserved: totalArticles,
        totalArticles,
        completedArticles: 0,
        failedArticles: 0,
        settings: JSON.stringify({ ...settings, variations }),
      });

      // Create article records (including variation)
      const articleRecords = articlesToGenerate.map((article, index) => ({
        id: `${jobId}_article_${article.variation}_${index}`,
        bulkJobId: jobId,
        articleType: article.articleType,
        keyword: article.keyword,
        variation: article.variation,
        status: 'pending' as const,
        phase: 'queued' as const,
        progress: 0,
        retryCount: 0,
      }));

      await db.insert(bulkJobArticles).values(articleRecords);

      console.log(`[bulk/start] Job queued: ${jobId}, position: ${queuePosition}`);

      // Calculate estimated wait time
      const waitTime = estimateWaitTime(queuePosition, capacityCheck.systemLoad || 50);

      // Return queued job info
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          status: 'queued',
          queuePosition,
          waitTime,
          systemLoad: capacityCheck.systemLoad,
          reason: runningJob 
            ? 'You have another bulk job running. This job will start when it completes.'
            : capacityCheck.reason || 'System is processing other jobs.',
          channelName: `private-bulk-${jobId}`,
          totalArticles,
          articles: articleRecords.map(a => ({
            id: a.id,
            articleType: a.articleType,
            keyword: a.keyword,
            variation: a.variation,
          })),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 9. No running job AND system has capacity - start immediately
    console.log('[bulk/start] Creating and starting job:', {
      jobId,
      userId,
      mode,
      totalArticles,
      variations,
    });

    // Create bulk job record
    await db.insert(bulkJobs).values({
      id: jobId,
      userId,
      mode,
      keyword: mode === 'single' ? keyword!.trim() : null,
      variation: variations.join(','),
      status: 'pending',
      queuePosition: 0, // Running job has position 0
      quotaReserved: totalArticles,
      totalArticles,
      completedArticles: 0,
      failedArticles: 0,
      settings: JSON.stringify({ ...settings, variations }),
    });

    // Create article records (including variation)
    const articleRecords = articlesToGenerate.map((article, index) => ({
      id: `${jobId}_article_${article.variation}_${index}`,
      bulkJobId: jobId,
      articleType: article.articleType,
      keyword: article.keyword,
      variation: article.variation,
      status: 'pending' as const,
      phase: 'queued' as const,
      progress: 0,
      retryCount: 0,
    }));

    await db.insert(bulkJobArticles).values(articleRecords);

    // Prepare the payload for Trigger.dev
    const triggerPayload: BulkGenerationPayload = {
      jobId,
      userId,
      variation: variations[0], // Primary variation for backwards compat
      articles: articleRecords.map(a => ({
        id: a.id,
        articleType: a.articleType,
        keyword: a.keyword,
        variation: a.variation as TitleVariation, // Include variation per article
      })),
      settings: {
        targetWordCount: settings.targetWordCount,
        variationName: settings.variationName as any,
        provider: settings.provider as any,
        skipImages: settings.skipImages,
        imageProvider: (settings.imageProvider as any) || 'flux',
        excludeComponents: settings.excludeComponents,
      },
    };

    // Trigger the background job
    const handle = await tasks.trigger<typeof bulkGenerateTask>("bulk-generate", triggerPayload);

    // Update job with trigger run ID and status
    await db.update(bulkJobs)
      .set({
        status: 'running',
        triggerJobId: handle.id,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bulkJobs.id, jobId));

    console.log(`[bulk/start] Job started: ${jobId}, trigger run: ${handle.id}`);

    // Return job info
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        status: 'running',
        channelName: `private-bulk-${jobId}`,
        totalArticles,
        articles: articleRecords.map(a => ({
          id: a.id,
          articleType: a.articleType,
          keyword: a.keyword,
          variation: a.variation,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk/start] Error:', message);
    
    // Log full error details for debugging database issues
    if (error instanceof Error) {
      console.error('[bulk/start] Error stack:', error.stack);
      // @ts-ignore - LibsqlError has cause property
      if (error.cause) {
        // @ts-ignore
        console.error('[bulk/start] Error cause:', error.cause);
      }
    }

    return new Response(
      JSON.stringify({ error: `Failed to start bulk generation: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
