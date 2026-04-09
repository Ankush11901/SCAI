import { NextRequest } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import { getAuthSession } from '@/lib/auth';
import { reserveQuota } from '@/lib/services/quota-service';
import { canUseBulkGeneration } from '@/lib/services/access-service';
import { getCreditInfo, reserveCredits, releaseReservation } from '@/lib/services/credit-service';
import { estimateArticleCredits, calculateImageCount } from '@/lib/services/credit-estimator';
import { formatTimeUntil } from '@/lib/utils/time';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles, articleClusters } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type { bulkGenerateTask, BulkGenerationPayload } from '@/lib/jobs/bulk-generate';
import { expandTopicToCluster } from '@/lib/services/cluster-expansion-service';
import type { TitleVariation } from '@/lib/types/cluster';
import { isValidUrlPattern } from '@/lib/utils/slug-generator';
import type { ImageProvider } from '@/lib/services/imagen';
import type { LocalBusinessInfo, ArticleTypeContext } from '@/lib/services/content-generators';

interface ClusterSettings {
  targetWordCount?: number;
  variationName?: string;
  provider?: string;
  skipImages?: boolean;
  imageProvider?: string;
  allowedArticleTypes?: string[];
  aiChooseVariants?: boolean;
  excludeComponents?: string[];
}

/**
 * POST /api/bulk/cluster
 *
 * Start a cluster mode bulk generation job.
 *
 * This endpoint:
 * 1. Validates authentication
 * 2. Validates input (topic, keyword, urlPattern, articleCount)
 * 3. Checks quota for all articles
 * 4. Calls AI to expand topic into cluster plan
 * 5. Creates cluster, bulk job, and article records
 * 6. Triggers the Trigger.dev bulk-generate task with cluster mode
 * 7. Returns cluster info for client
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
    topic,
    primaryKeyword,
    urlPattern,
    articleCount,
    variation,
    variations,
    settings = {},
    localBusinessInfo,
    articleContext,
  } = body as {
    topic: string;
    primaryKeyword: string;
    urlPattern: string;
    articleCount: number;
    variation: TitleVariation;
    variations?: TitleVariation[];
    settings?: ClusterSettings;
    localBusinessInfo?: LocalBusinessInfo;
    articleContext?: ArticleTypeContext;
  };

  // Validate required fields
  if (!topic?.trim()) {
    return new Response(JSON.stringify({ error: 'Missing topic' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!primaryKeyword?.trim()) {
    return new Response(JSON.stringify({ error: 'Missing primary keyword' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!urlPattern?.trim()) {
    return new Response(JSON.stringify({ error: 'Missing URL pattern' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidUrlPattern(urlPattern)) {
    return new Response(JSON.stringify({ error: 'URL pattern must contain {slug}' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!articleCount || articleCount < 1 || articleCount > 100) {
    return new Response(JSON.stringify({ error: 'Article count must be between 1 and 100' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Variation is required unless AI chooses per article
  if (!settings.aiChooseVariants && (!variation || !['question', 'statement', 'listicle'].includes(variation))) {
    // Also accept if variations array is provided
    const variations = (body as any).variations as string[] | undefined;
    if (!variations || variations.length === 0 || !variations.every((v: string) => ['question', 'statement', 'listicle'].includes(v))) {
      return new Response(JSON.stringify({ error: 'Invalid variation' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Check bulk generation access (Pro subscription required)
  const bulkAccess = await canUseBulkGeneration(userId);
  if (!bulkAccess.allowed) {
    return new Response(
      JSON.stringify({
        error: bulkAccess.reason || 'Bulk generation requires a Pro subscription',
        upgradeRequired: bulkAccess.upgradeRequired,
        requiredTier: bulkAccess.requiredTier,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // ─── Phase 1 Credit Check (before AI expansion — fail fast on obvious shortfall) ───
  // Use the cheapest article type as a floor: if user can't even afford cheapest × N,
  // reject immediately without wasting an AI expansion call.
  const bulkWordCount = settings.targetWordCount || 1000;
  const ALL_TYPE_IDS = ['affiliate', 'commercial', 'comparison', 'how-to', 'informational', 'listicle', 'local', 'recipe', 'review'];
  const candidateTypes = settings.allowedArticleTypes?.length
    ? settings.allowedArticleTypes
    : ALL_TYPE_IDS;

  let cheapestCredits = Infinity;
  for (const aType of candidateTypes) {
    const imgCount = settings.skipImages ? 0 : calculateImageCount(aType, bulkWordCount);
    const est = estimateArticleCredits({
      articleType: aType,
      wordCount: bulkWordCount,
      imageCount: imgCount,
      imageProvider: (settings.imageProvider as ImageProvider) || 'flux',
    });
    if (est.totalCredits < cheapestCredits) {
      cheapestCredits = est.totalCredits;
    }
  }

  const floorEstimate = cheapestCredits * articleCount;

  const creditInfo = await getCreditInfo(userId);

  if (floorEstimate > creditInfo.available) {
    const resetsIn = formatTimeUntil(creditInfo.monthly?.resetsAt);
    return new Response(
      JSON.stringify({
        error: `You need ~${floorEstimate} credits but only have ${creditInfo.available} available`,
        tier: creditInfo.tier,
        creditsRequired: floorEstimate,
        creditsAvailable: creditInfo.available,
        articleCount,
        creditsPerArticle: cheapestCredits,
        resetsIn,
        renewsIn: creditInfo.tier === 'pro' ? resetsIn : undefined,
      }),
      {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check for existing running job
  const [runningJob] = await db
    .select()
    .from(bulkJobs)
    .where(
      and(
        eq(bulkJobs.userId, userId),
        inArray(bulkJobs.status, ['running', 'pending'])
      )
    )
    .limit(1);

  if (runningJob) {
    return new Response(
      JSON.stringify({
        error: 'A bulk job is already running',
        jobId: runningJob.id,
      }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Generate IDs
  const clusterId = `cluster_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  const jobId = `bulk_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  let reservedAmount = 0; // Track for cleanup in catch block

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1: AI CLUSTER EXPANSION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[bulk/cluster] Starting AI cluster expansion...');

    const expansionResult = await expandTopicToCluster({
      topic: topic.trim(),
      primaryKeyword: primaryKeyword.trim(),
      urlPattern: urlPattern.trim(),
      articleCount,
      variation,
      variations,
      provider: (settings.provider as any) || 'openai',
      allowedArticleTypes: settings.allowedArticleTypes,
      aiChooseVariants: settings.aiChooseVariants,
    });

    if (!expansionResult.success || !expansionResult.plan) {
      return new Response(
        JSON.stringify({
          error: 'Failed to generate cluster plan',
          details: expansionResult.error,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const clusterPlan = expansionResult.plan;
    console.log('[bulk/cluster] Cluster plan generated:', {
      articleCount: clusterPlan.articles.length,
      articles: clusterPlan.articles.map((a) => `${a.articleType}: ${a.title}`),
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2 CREDIT CHECK: Exact cost from actual article types
    // ─────────────────────────────────────────────────────────────────────────
    let exactTotalCredits = 0;
    for (const article of clusterPlan.articles) {
      const imgCount = settings.skipImages ? 0 : calculateImageCount(article.articleType, bulkWordCount);
      const est = estimateArticleCredits({
        articleType: article.articleType,
        wordCount: bulkWordCount,
        imageCount: imgCount,
        imageProvider: (settings.imageProvider as ImageProvider) || 'flux',
      });
      exactTotalCredits += est.totalCredits;
    }

    // Re-check credits with exact total (balance may not have changed, but estimate is now precise)
    if (exactTotalCredits > creditInfo.available) {
      const resetsIn = formatTimeUntil(creditInfo.monthly?.resetsAt);
      return new Response(
        JSON.stringify({
          error: `You need ~${exactTotalCredits} credits but only have ${creditInfo.available} available`,
          tier: creditInfo.tier,
          creditsRequired: exactTotalCredits,
          creditsAvailable: creditInfo.available,
          articleCount: clusterPlan.articles.length,
          creditsPerArticle: Math.round(exactTotalCredits / clusterPlan.articles.length),
          resetsIn,
          renewsIn: creditInfo.tier === 'pro' ? resetsIn : undefined,
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[bulk/cluster] Credit check passed:', {
      exactTotalCredits,
      available: creditInfo.available,
      headroom: creditInfo.available - exactTotalCredits,
    });

    // ─── Reserve credits so single-generate cannot consume them ───
    await reserveCredits(userId, exactTotalCredits, jobId);
    reservedAmount = exactTotalCredits;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: RESERVE QUOTA
    // ─────────────────────────────────────────────────────────────────────────
    await reserveQuota(userId, clusterPlan.articles.length);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: CREATE DATABASE RECORDS
    // ─────────────────────────────────────────────────────────────────────────

    // Create cluster record
    await db.insert(articleClusters).values({
      id: clusterId,
      userId,
      bulkJobId: jobId,
      topic: topic.trim(),
      primaryKeyword: primaryKeyword.trim(),
      urlPattern: urlPattern.trim(),
      articleCount: clusterPlan.articles.length,
      clusterPlan: JSON.stringify(clusterPlan),
      status: 'generating',
    });

    // Create bulk job record
    await db.insert(bulkJobs).values({
      id: jobId,
      userId,
      clusterId,
      mode: 'cluster',
      keyword: primaryKeyword.trim(),
      variation,
      status: 'pending',
      queuePosition: 0,
      quotaReserved: clusterPlan.articles.length,
      totalArticles: clusterPlan.articles.length,
      settings: JSON.stringify(settings),
    });

    // Create article records
    const articleRecords = clusterPlan.articles.map((article, index) => ({
      id: `${jobId}_article_${index}`,
      bulkJobId: jobId,
      articleType: article.articleType,
      keyword: article.title, // Use the AI-generated title as the "keyword"
      status: 'pending' as const,
      phase: 'queued' as const,
      progress: 0,
      retryCount: 0,
      priority: article.isPillar ? 1 : 0,
    }));

    await db.insert(bulkJobArticles).values(articleRecords);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: TRIGGER GENERATION TASK
    // ─────────────────────────────────────────────────────────────────────────
    const payload: BulkGenerationPayload = {
      jobId,
      userId,
      variation,
      articles: clusterPlan.articles.map((article, index) => ({
        id: `${jobId}_article_${index}`,
        articleType: article.articleType,
        keyword: article.title,
      })),
      settings: {
        targetWordCount: settings.targetWordCount || 1000,
        variationName: (settings.variationName as any) || 'random',
        provider: (settings.provider as any) || 'openai',
        skipImages: settings.skipImages || false,
        imageProvider: (settings.imageProvider as any) || 'flux',
        excludeComponents: settings.excludeComponents,
      },
      clusterMode: true,
      clusterId,
      clusterPlan,
      reservedCredits: exactTotalCredits,
      ...(localBusinessInfo && Object.values(localBusinessInfo).some(v => v && String(v).trim())
        ? { localBusinessInfo }
        : {}),
      ...(articleContext ? { articleContext } : {}),
    };

    // Import and trigger the task
    const { bulkGenerateTask } = await import('@/lib/jobs/bulk-generate');
    const handle = await tasks.trigger<typeof bulkGenerateTask>(
      'bulk-generate',
      payload
    );

    // Update job with trigger ID
    await db
      .update(bulkJobs)
      .set({ triggerJobId: handle.id })
      .where(eq(bulkJobs.id, jobId));

    console.log('[bulk/cluster] Job triggered successfully:', {
      jobId,
      clusterId,
      triggerId: handle.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        clusterId,
        jobId,
        triggerId: handle.id,
        plan: {
          topic: clusterPlan.topic,
          primaryKeyword: clusterPlan.primaryKeyword,
          urlPattern: clusterPlan.urlPattern,
          articles: clusterPlan.articles.map((a) => ({
            articleType: a.articleType,
            title: a.title,
            slug: a.slug,
            targetUrl: a.targetUrl,
          })),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[bulk/cluster] Error:', error);

    // Cleanup on error — release reserved credits + DB records
    try {
      await releaseReservation(userId, reservedAmount, jobId);
      await db.delete(bulkJobArticles).where(eq(bulkJobArticles.bulkJobId, jobId));
      await db.delete(bulkJobs).where(eq(bulkJobs.id, jobId));
      await db.delete(articleClusters).where(eq(articleClusters.id, clusterId));
    } catch (cleanupError) {
      console.error('[bulk/cluster] Cleanup error:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to start cluster generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
