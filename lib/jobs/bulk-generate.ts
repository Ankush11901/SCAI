/**
 * Bulk Article Generation Task
 *
 * Trigger.dev task that orchestrates generating multiple articles in PARALLEL.
 * 
 * Flow:
 * 1. Sequential H1 generation (5-10 seconds) - maintains H1 variety
 * 2. Parallel content generation using batchTriggerAndWait
 * 3. Each article: content generation + image generation
 * 4. Database updates and real-time progress via Pusher
 * 5. Cluster interlinking (if in cluster mode)
 *
 * This runs as a background job, allowing users to close the browser.
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@/lib/db";
import {
  bulkJobs,
  bulkJobArticles,
  generationHistory,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { incrementQuotaUsage } from "@/lib/services/quota-service";
import { orchestrateUnifiedGeneration } from "@/lib/services/unified-orchestrator";
import { generateImageTask } from "./generate-images";
import { generateArticleBulkTask, type ArticleBulkPayload, type ArticleBulkResult } from "./generate-article-bulk";
import type { TitleVariation, StreamEvent } from "@/lib/types/generation";
import type { ArticleType, ImageType, ImageProvider } from "@/lib/services/imagen";
import type { AIProvider } from "@/lib/ai/providers";
import type { BaseVariationName } from "@/lib/services/template-hydrator";
import crypto from "crypto";
import Pusher from "pusher";
import { sendBulkCompletionEmail } from "@/lib/services/email-service";
import { applyInterlinking } from "@/lib/services/interlinking-service";
import { selectInterlinksWithAI } from "@/lib/services/ai-interlink-selector";
import { updateGenerationCostSummary } from "@/lib/services/cost-tracking-service";
import { estimateArticleCredits, calculateImageCount } from "@/lib/services/credit-estimator";
import { deductCredits, releaseReservation, refundCredits } from "@/lib/services/credit-service";
import type { ClusterArticle, InterlinkTarget, ClusterContext, LinkStrategy } from "@/lib/types/cluster";
import type { LocalBusinessInfo, ArticleTypeContext } from "@/lib/services/content-generators";
import { generateH1Only } from "@/lib/ai/generate";
import { extractCoreKeywords } from "@/lib/ai/utils/keyword-extractor";

// Initialize Pusher for server-side events
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkGenerationPayload {
  /** Unique bulk job ID */
  jobId: string;
  /** User ID */
  userId: string;
  /** Title variation for all articles (legacy, used as default) */
  variation: TitleVariation;
  /** Articles to generate */
  articles: Array<{
    id: string;
    articleType: string;
    keyword: string;
    /** Optional per-article variation override */
    variation?: TitleVariation;
  }>;
  /** Generation settings */
  settings: {
    targetWordCount?: number;
    variationName?: BaseVariationName | "random";
    provider?: AIProvider;
    skipImages?: boolean;
    imageProvider?: ImageProvider;
    selectedComponents?: string[];
    excludeComponents?: string[];
  };
  /** Local business info for local SEO articles (optional) */
  localBusinessInfo?: LocalBusinessInfo;
  /** Article-type-specific context (commercial, comparison, review, local) */
  articleContext?: ArticleTypeContext;
  /** Total credits reserved for this bulk job (for per-article deduction) */
  reservedCredits?: number;
  /** Cluster mode fields (optional - only for cluster generation) */
  clusterMode?: boolean;
  clusterId?: string;
  clusterPlan?: {
    topic: string;
    primaryKeyword: string;
    urlPattern: string;
    articles: Array<{
      articleType: string;
      title: string;
      slug: string;
      targetUrl: string;
      focus: string;
      keywords: string[];
      isPillar: boolean;
      variation?: TitleVariation; // Per-article variation (when AI chooses)
    }>;
    /** AI-generated interlinking plan with anchor phrases per source→target pair */
    interlinkingPlan?: Array<{
      sourceIndex: number;
      targets: Array<{
        targetIndex: number;
        suggestedAnchorPhrases: string[];
      }>;
    }>;
  };
}

interface ImagePlaceholder {
  imageId: string;
  placeholder: string;
  description: string;
  imageType: ImageType;
  componentType?: string;
  context?: string;
  stepNumber?: number;
  sourceImageUrl?: string;
  sourceProductName?: string;
}

export interface BulkGenerationResult {
  success: boolean;
  jobId: string;
  completedArticles: number;
  failedArticles: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSHER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendBulkEvent(
  jobId: string,
  userId: string,
  event: string,
  data: Record<string, unknown>
) {
  try {
    await pusher.trigger(`private-bulk-${jobId}`, event, {
      ...data,
      timestamp: Date.now(),
    });

    // Also send to user channel for cross-page updates
    await pusher.trigger(`private-user-${userId}`, event, {
      ...data,
      jobId,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.warn("Failed to send Pusher event", { event, error });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK GENERATION TASK
// ═══════════════════════════════════════════════════════════════════════════════

export const bulkGenerateTask = task({
  id: "bulk-generate",
  // Allow up to 10 hours for bulk generation (up to 100 articles × ~5 min each + buffer)
  maxDuration: 36000, // 10 hours in seconds
  machine: {
    preset: "medium-1x", // 2 vCPU, 4GB RAM
  },
  retry: {
    maxAttempts: 1, // Don't retry the whole bulk job, let individual articles retry
  },
  run: async (payload: BulkGenerationPayload): Promise<BulkGenerationResult> => {
    const { jobId, userId, variation, articles, settings, clusterMode, clusterId, clusterPlan, localBusinessInfo, articleContext: bulkArticleContext } = payload;

    const {
      targetWordCount = 1000,
      variationName = "Clean Studio",
      provider = "openai",
      skipImages = false,
      imageProvider,
    } = settings;

    // Track reserved credits for per-article release + deduction
    let remainingReservation = payload.reservedCredits || 0;

    // Track generated articles for cluster mode interlinking
    const generatedArticles: Map<string, { html: string; wordCount: number; historyId: string }> = new Map();

    logger.info("Starting bulk generation", {
      jobId,
      articleCount: articles.length,
      variation,
      targetWordCount,
    });

    let completedArticles = 0;
    let failedArticles = 0;

    try {
      // Update job status to running
      await db
        .update(bulkJobs)
        .set({
          status: "running",
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkJobs.id, jobId));

      // Send bulk start event
      await sendBulkEvent(jobId, userId, "bulk:start", {
        totalArticles: articles.length,
        phase: "h1_generation",
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // PHASE 1: SEQUENTIAL H1 GENERATION (5-10 seconds)
      // Maintains H1 variety across articles by generating H1s sequentially
      // ═══════════════════════════════════════════════════════════════════════════
      
      logger.info(`Phase 1: Pre-generating H1s for ${articles.length} articles...`);
      
      const generatedH1s: string[] = [];
      const articleH1Map: Map<string, { h1: string; metaTitle: string; metaDescription: string }> = new Map();
      
      // Calculate H2 count for listicle alignment (using average settings)
      const baseH2Count = Math.max(3, Math.floor(targetWordCount / 200));
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const articleVariation = article.variation || (clusterMode && clusterPlan ? clusterPlan.articles[i]?.variation : undefined) || variation;
        
        try {
          // Extract core keywords for this article
          const keywordResult = await extractCoreKeywords(article.keyword, {
            heuristicOnly: false,
            provider,
          });
          
          // Generate H1 with previous H1s for variety
          const h1Result = await generateH1Only({
            topic: article.keyword,
            primaryKeyword: article.keyword,
            articleType: article.articleType,
            variation: articleVariation,
            h2Count: articleVariation === 'listicle' ? baseH2Count : undefined,
            targetWordCount,
            provider,
            coreKeywords: keywordResult.coreKeywords,
            previousH1s: generatedH1s.length > 0 ? [...generatedH1s] : undefined,
          });
          
          if (h1Result.error) {
            logger.warn(`H1 generation failed for article ${i + 1}, will use fallback`, {
              keyword: article.keyword,
              error: h1Result.error,
            });
            // Use fallback H1
            const fallbackH1 = `Guide to ${article.keyword}`;
            generatedH1s.push(fallbackH1);
            articleH1Map.set(article.id, {
              h1: fallbackH1,
              metaTitle: fallbackH1.substring(0, 60),
              metaDescription: `Learn about ${article.keyword}. Comprehensive guide covering everything you need to know.`,
            });
          } else {
            generatedH1s.push(h1Result.normalizedH1);
            articleH1Map.set(article.id, {
              h1: h1Result.normalizedH1,
              metaTitle: h1Result.meta.title,
              metaDescription: h1Result.meta.description,
            });
            logger.info(`H1 ${i + 1}/${articles.length}: "${h1Result.normalizedH1}"`);
          }
        } catch (h1Error) {
          logger.error(`H1 generation error for article ${i + 1}`, {
            keyword: article.keyword,
            error: h1Error instanceof Error ? h1Error.message : "Unknown",
          });
          // Use fallback H1
          const fallbackH1 = `Complete Guide to ${article.keyword}`;
          generatedH1s.push(fallbackH1);
          articleH1Map.set(article.id, {
            h1: fallbackH1,
            metaTitle: fallbackH1.substring(0, 60),
            metaDescription: `Discover everything about ${article.keyword}. Expert tips and insights.`,
          });
        }
      }
      
      logger.info(`Phase 1 complete: Generated ${generatedH1s.length} unique H1s`);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PHASE 2: PARALLEL CONTENT GENERATION
      // All articles generate content simultaneously with their pre-assigned H1s
      // ═══════════════════════════════════════════════════════════════════════════
      
      logger.info(`Phase 2: Triggering ${articles.length} articles in parallel...`);
      
      await sendBulkEvent(jobId, userId, "bulk:start", {
        totalArticles: articles.length,
        phase: "content_generation",
      });
      
      // Build payloads for parallel execution
      const articlePayloads: Array<{ payload: ArticleBulkPayload; options: { idempotencyKey: string; tags: string[] } }> = [];
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        // Get pre-generated H1 for this article
        const h1Data = articleH1Map.get(article.id);
        if (!h1Data) {
          logger.error(`No H1 found for article ${article.id}, skipping`);
          failedArticles++;
          continue;
        }
        
        // Calculate estimated credits
        const estimatedImageCount = calculateImageCount(article.articleType, targetWordCount);
        const articleEstimatedCredits = estimateArticleCredits({
          articleType: article.articleType,
          wordCount: targetWordCount,
          imageCount: skipImages ? 0 : estimatedImageCount,
          imageProvider: (imageProvider as import("@/lib/services/credit-estimator").ImageProvider) || "flux",
        });
        
        // Build cluster context if in cluster mode
        let articleClusterContext: ClusterContext | undefined;
        if (clusterMode && clusterPlan) {
          const siblingArticles = clusterPlan.articles
            .filter((_, idx) => idx !== i)
            .map((a) => ({
              title: a.title,
              url: a.targetUrl,
              focus: a.focus,
              articleType: a.articleType,
            }));

          const interlinkKeywords: string[] = [];
          clusterPlan.articles.forEach((a, idx) => {
            if (idx !== i) {
              interlinkKeywords.push(...a.keywords);
            }
          });

          articleClusterContext = {
            siblingArticles,
            interlinkKeywords: [...new Set(interlinkKeywords)],
          };
        }
        
        const clusterArticle = clusterMode && clusterPlan ? clusterPlan.articles[i] : undefined;
        const isPillar = clusterArticle?.isPillar ?? false;
        const articleVariation = article.variation || clusterArticle?.variation || variation;
        
        articlePayloads.push({
          payload: {
            jobId,
            userId,
            articleId: article.id,
            articleType: article.articleType as ArticleType,
            keyword: article.keyword,
            variation: articleVariation,
            targetWordCount,
            variationName,
            provider,
            skipImages,
            clusterContext: articleClusterContext,
            isPillar,
            imageProvider,
            estimatedCredits: articleEstimatedCredits.totalCredits,
            presetH1: h1Data.h1,
            presetMetaTitle: h1Data.metaTitle,
            presetMetaDescription: h1Data.metaDescription,
            localBusinessInfo: article.articleType === "local" ? localBusinessInfo : undefined,
            articleContext: bulkArticleContext ?? (localBusinessInfo ? { localBusinessInfo } : undefined),
            selectedComponents: settings.selectedComponents,
            excludeComponents: settings.excludeComponents,
            index: i + 1,
            total: articles.length,
          },
          options: {
            idempotencyKey: `bulk-${jobId}-article-${article.id}`,
            tags: [`job-${jobId}`, `user-${userId}`, `article-${article.id}`],
          },
        });
      }
      
      // Trigger all articles in parallel
      logger.info(`Batch triggering ${articlePayloads.length} articles...`);
      const batchResult = await generateArticleBulkTask.batchTriggerAndWait(articlePayloads);
      logger.info(`Batch execution complete. Processing ${batchResult.runs.length} results...`);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PHASE 3: PROCESS BATCH RESULTS
      // Handle success/failure for each article, update credits, send events
      // Real-time progress updates after each article (Turso free: 10M writes/month - plenty of headroom)
      // ═══════════════════════════════════════════════════════════════════════════
      
      const PROGRESS_UPDATE_BATCH_SIZE = 1; // Update DB after every article for real-time UX
      let articlesProcessedSinceBatchUpdate = 0;
      
      for (const result of batchResult.runs) {
        // Find the matching payload to get article details
        // Note: Failed results don't have payload, so we match by result.id to find the corresponding trigger
        const matchingPayload = articlePayloads.find(
          p => result.ok ? p.payload.articleId === result.output.articleId : true
        );
        
        if (!matchingPayload) {
          logger.error("Could not find matching payload for batch result");
          continue;
        }
        
        const articleId = matchingPayload.payload.articleId;
        const articleCredits = matchingPayload.payload.estimatedCredits;
        const article = articles.find(a => a.id === articleId);
        
        if (result.ok && result.output.success) {
          // SUCCESS PATH
          const output = result.output;
          
          // Store for interlinking phase (cluster mode only)
          if (clusterMode) {
            generatedArticles.set(articleId, {
              html: output.html,
              wordCount: output.wordCount,
              historyId: output.historyId,
            });
          }
          
          // Update article as complete
          await db
            .update(bulkJobArticles)
            .set({
              status: "complete",
              phase: "complete",
              progress: 100,
              wordCount: output.wordCount,
              imageCount: output.imageCount,
              htmlContent: output.html,
              historyId: output.historyId,
              completedAt: new Date(),
            })
            .where(eq(bulkJobArticles.id, articleId));
          
          completedArticles++;
          
          // Per-article credit: release reservation, then deduct
          if (remainingReservation > 0) {
            try {
              await releaseReservation(userId, articleCredits, jobId);
              remainingReservation = Math.max(0, remainingReservation - articleCredits);
              await deductCredits(userId, articleCredits, `bulk_${articleId}`, {
                historyId: output.historyId,
                bulkJobId: jobId,
                description: `Cluster article: ${matchingPayload.payload.keyword}`,
              });
            } catch (creditError) {
              logger.error(`Credit deduction failed for article`, {
                articleId,
                error: creditError instanceof Error ? creditError.message : "Unknown",
              });
            }
          }
          
          // Send article complete event
          await sendBulkEvent(jobId, userId, "article:complete", {
            articleId,
            wordCount: output.wordCount,
            imageCount: output.imageCount,
            index: matchingPayload.payload.index,
            total: matchingPayload.payload.total,
          });
          
          logger.info(`Article completed`, {
            articleId,
            keyword: matchingPayload.payload.keyword,
            wordCount: output.wordCount,
          });
        } else {
          // ERROR PATH
          const errorMessage = result.ok 
            ? result.output.error || "Unknown error"
            : (typeof result.error === 'string' ? result.error : 
               result.error instanceof Error ? result.error.message : 
               JSON.stringify(result.error) || "Task execution failed");
          
          logger.error(`Article failed`, {
            articleId,
            keyword: matchingPayload.payload.keyword,
            error: errorMessage,
          });
          
          // Update article as error
          await db
            .update(bulkJobArticles)
            .set({
              status: "error",
              progress: 0,
              errorMessage,
              completedAt: new Date(),
            })
            .where(eq(bulkJobArticles.id, articleId));
          
          failedArticles++;
          
          // Per-article credit: release reservation only (no charge for failed articles)
          if (remainingReservation > 0) {
            try {
              await releaseReservation(userId, articleCredits, jobId);
              remainingReservation = Math.max(0, remainingReservation - articleCredits);
            } catch (releaseError) {
              logger.error(`Reservation release failed for failed article`, {
                articleId,
                error: releaseError instanceof Error ? releaseError.message : "Unknown",
              });
            }
          }
          
          // Send article error event
          await sendBulkEvent(jobId, userId, "article:error", {
            articleId,
            error: errorMessage,
            index: matchingPayload.payload.index,
            total: matchingPayload.payload.total,
          });
        }
        
        // Track articles processed since last batch update
        articlesProcessedSinceBatchUpdate++;
        
        // Real-time DB updates: update after every article for immediate progress feedback
        // Turso free tier: 10M writes/month - even 1000 bulk jobs = 50K writes (0.5% of limit)
        if (articlesProcessedSinceBatchUpdate >= PROGRESS_UPDATE_BATCH_SIZE) {
          await db
            .update(bulkJobs)
            .set({
              completedArticles,
              failedArticles,
              updatedAt: new Date(),
            })
            .where(eq(bulkJobs.id, jobId));
          
          // Send progress update
          const processed = completedArticles + failedArticles;
          await sendBulkEvent(jobId, userId, "bulk:progress", {
            completed: completedArticles,
            failed: failedArticles,
            pending: articles.length - processed,
            progress: Math.round((processed / articles.length) * 100),
          });
          
          articlesProcessedSinceBatchUpdate = 0;
        }
      }
      
      // Final batch update for any remaining articles
      if (articlesProcessedSinceBatchUpdate > 0) {
        await db
          .update(bulkJobs)
          .set({
            completedArticles,
            failedArticles,
            updatedAt: new Date(),
          })
          .where(eq(bulkJobs.id, jobId));
        
        const processed = completedArticles + failedArticles;
        await sendBulkEvent(jobId, userId, "bulk:progress", {
          completed: completedArticles,
          failed: failedArticles,
          pending: articles.length - processed,
          progress: Math.round((processed / articles.length) * 100),
        });
      }

      // Safety: release any leftover reservation (rounding differences, skipped articles, etc.)
      if (remainingReservation > 0) {
        try {
          await releaseReservation(userId, remainingReservation, jobId);
          logger.info("Released leftover reservation", { remainingReservation, jobId });
          remainingReservation = 0;
        } catch (releaseError) {
          logger.error("Failed to release leftover reservation", {
            remainingReservation,
            error: releaseError instanceof Error ? releaseError.message : "Unknown",
          });
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // INTERLINKING PHASE (Cluster Mode Only)
      // ─────────────────────────────────────────────────────────────────────────
      if (clusterMode && clusterPlan && generatedArticles.size > 0) {
        logger.info("Starting interlinking phase", {
          articlesToInterlink: generatedArticles.size,
        });

        await sendBulkEvent(jobId, userId, "bulk:interlinking", {
          message: "Applying internal links between articles...",
        });

        // Apply interlinking to each generated article
        for (let i = 0; i < articles.length; i++) {
          const article = articles[i];
          const generated = generatedArticles.get(article.id);

          if (!generated) continue; // Skip failed articles

          const clusterArticle = clusterPlan.articles[i];
          if (!clusterArticle) continue;

          // Build interlink targets from sibling articles, filtered by strategy availability matrix
          const sourceArticleType = clusterArticle.articleType;
          const allSiblings: ClusterArticle[] = clusterPlan.articles
            .filter((_, idx) => idx !== i)
            .map((a) => ({
              articleType: a.articleType,
              title: a.title,
              slug: a.slug,
              targetUrl: a.targetUrl,
              focus: a.focus,
              keywords: a.keywords,
              isPillar: a.isPillar,
            }));

          // Apply silo enforcement: only link to targets allowed by the availability matrix
          const siblingArticles = filterSiblingsByStrategy(sourceArticleType, allSiblings);

          if (siblingArticles.length === 0) {
            logger.info(`No valid interlink targets for ${sourceArticleType} article ${i + 1} (silo filter removed all siblings)`);
            continue;
          }

          logger.info(`Silo filter: ${sourceArticleType} article ${i + 1} — ${allSiblings.length} siblings → ${siblingArticles.length} eligible targets`);

          // Try AI-powered anchor selection first, fall back to regex-based matching
          let interlinkTargets: InterlinkTarget[];
          try {
            interlinkTargets = await selectInterlinksWithAI({
              articleHtml: generated.html,
              siblingArticles,
            });
            logger.info(`AI interlink selector succeeded for article ${i + 1}`, {
              linksSelected: interlinkTargets.length,
            });
          } catch (aiError) {
            logger.warn(`AI interlink selector failed for article ${i + 1}, using regex fallback`, {
              error: aiError instanceof Error ? aiError.message : 'Unknown error',
            });
            interlinkTargets = buildRegexInterlinkTargets(siblingArticles, clusterPlan, i);
          }

          try {
            const interlinkResult = applyInterlinking({
              articleHtml: generated.html,
              wordCount: generated.wordCount,
              siblingArticles,
              interlinkTargets,
            });

            // Update article with interlinked HTML
            await db
              .update(bulkJobArticles)
              .set({
                htmlContent: interlinkResult.modifiedHtml,
              })
              .where(eq(bulkJobArticles.id, article.id));

            // Also update generation history — MERGE metadata to preserve existing fields
            // (variation, classificationHint, imageStats, etc.)
            const [existingEntry] = await db
              .select({ metadata: generationHistory.metadata })
              .from(generationHistory)
              .where(eq(generationHistory.id, generated.historyId))
              .limit(1);

            let existingMeta: Record<string, unknown> = {};
            try {
              if (existingEntry?.metadata) {
                existingMeta = JSON.parse(existingEntry.metadata as string);
              }
            } catch { /* ignore parse errors */ }

            await db
              .update(generationHistory)
              .set({
                htmlContent: interlinkResult.modifiedHtml,
                metadata: JSON.stringify({
                  ...existingMeta,
                  clusterId,
                  slug: clusterArticle.slug,
                  targetUrl: clusterArticle.targetUrl,
                  interlinkingApplied: true,
                  internalLinksInserted: interlinkResult.linksInserted,
                  relatedReadingAdded: interlinkResult.relatedReadingAdded,
                }),
              })
              .where(eq(generationHistory.id, generated.historyId));

            logger.info(`Interlinking applied to article ${i + 1}`, {
              articleId: article.id,
              linksInserted: interlinkResult.linksInserted,
              relatedReadingAdded: interlinkResult.relatedReadingAdded,
            });
          } catch (interlinkError) {
            logger.warn(`Failed to apply interlinking to article ${i + 1}`, {
              articleId: article.id,
              error: interlinkError instanceof Error ? interlinkError.message : 'Unknown error',
            });
            // Continue with other articles even if one fails
          }
        }

        logger.info("Interlinking phase complete");
      }

      // Update job as completed
      const finalStatus =
        failedArticles === articles.length ? "failed" : "completed";

      await db
        .update(bulkJobs)
        .set({
          status: finalStatus,
          completedArticles,
          failedArticles,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkJobs.id, jobId));

      // Send bulk complete event
      await sendBulkEvent(jobId, userId, "bulk:complete", {
        completed: completedArticles,
        failed: failedArticles,
        total: articles.length,
      });

      // Send completion email to user
      try {
        await sendBulkCompletionEmail({
          userId,
          jobId,
          keyword: articles[0]?.keyword, // Use first article's keyword
          completedArticles,
          failedArticles,
          totalArticles: articles.length,
        });
      } catch (emailError) {
        logger.warn("Failed to send completion email", { emailError });
      }

      // Start next job in queue (if any)
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
        logger.info("Triggered start-next for user", { userId });
      } catch (queueError) {
        logger.warn("Failed to trigger start-next", { queueError });
      }

      logger.info("Bulk generation complete", {
        jobId,
        completedArticles,
        failedArticles,
      });

      return {
        success: true,
        jobId,
        completedArticles,
        failedArticles,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Bulk generation failed", { jobId, error: errorMessage });

      // Safety: release any remaining reservation on job-level failure
      if (remainingReservation > 0) {
        try {
          await releaseReservation(userId, remainingReservation, jobId);
          logger.info("Released reservation on job failure", { remainingReservation, jobId });
          remainingReservation = 0;
        } catch (releaseError) {
          logger.error("Failed to release reservation on job failure", {
            error: releaseError instanceof Error ? releaseError.message : "Unknown",
          });
        }
      }

      // Update job as failed
      await db
        .update(bulkJobs)
        .set({
          status: "failed",
          errorMessage,
          completedArticles,
          failedArticles,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkJobs.id, jobId));

      // Send failure event
      await sendBulkEvent(jobId, userId, "bulk:failed", {
        error: errorMessage,
        completed: completedArticles,
        failed: failedArticles,
      });

      // Send failure email to user
      try {
        await sendBulkCompletionEmail({
          userId,
          jobId,
          keyword: articles[0]?.keyword,
          completedArticles,
          failedArticles,
          totalArticles: articles.length,
          error: errorMessage,
        });
      } catch (emailError) {
        logger.warn("Failed to send failure email", { emailError });
      }

      // Start next job in queue (if any)
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
        logger.info("Triggered start-next for user after failure", { userId });
      } catch (queueError) {
        logger.warn("Failed to trigger start-next after failure", { queueError });
      }

      return {
        success: false,
        jobId,
        completedArticles,
        failedArticles,
        error: errorMessage,
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERLINKING STRATEGY AVAILABILITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Per the rules (programmatic_rules.md §10):
 * - Topic Linking:    available to ALL 9 types → targets informational-type content
 * - Service Linking:  available to Commercial & Local ONLY → targets commercial (money) pages
 * - Location Linking: available to Local ONLY → targets local pages
 */

/** Article types that are valid topic link targets (informational content) */
const TOPIC_LINK_TARGET_TYPES = new Set([
  'informational', 'how-to', 'comparison', 'review', 'listicle', 'affiliate', 'recipe',
]);

/** Article types that are valid service link targets (money pages) */
const SERVICE_LINK_TARGET_TYPES = new Set(['commercial']);

/** Article types that are valid location link targets */
const LOCATION_LINK_TARGET_TYPES = new Set(['local']);

/** Get the link strategy for a target based on its article type */
function getLinkStrategy(targetArticleType: string): LinkStrategy {
  if (SERVICE_LINK_TARGET_TYPES.has(targetArticleType)) return 'service';
  if (LOCATION_LINK_TARGET_TYPES.has(targetArticleType)) return 'location';
  return 'topic';
}

/** Get available link strategies for a source article type */
function getAvailableStrategies(sourceArticleType: string): Set<LinkStrategy> {
  const strategies = new Set<LinkStrategy>(['topic']); // All types can do topic linking
  if (sourceArticleType === 'commercial' || sourceArticleType === 'local') {
    strategies.add('service');
  }
  if (sourceArticleType === 'local') {
    strategies.add('location');
  }
  return strategies;
}

/**
 * Filter sibling articles by the availability matrix.
 * Only returns siblings whose link strategy is available to the source article type.
 */
function filterSiblingsByStrategy(
  sourceArticleType: string,
  siblings: ClusterArticle[]
): ClusterArticle[] {
  const available = getAvailableStrategies(sourceArticleType);
  return siblings.filter((sibling) => {
    const strategy = getLinkStrategy(sibling.articleType);
    return available.has(strategy);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGEX-BASED INTERLINK TARGET BUILDER (FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build interlink targets using regex-based phrase matching.
 * Used as fallback when AI-powered anchor selection fails.
 */
function buildRegexInterlinkTargets(
  siblingArticles: ClusterArticle[],
  clusterPlan: BulkGenerationPayload['clusterPlan'],
  sourceIndex: number
): InterlinkTarget[] {
  if (!clusterPlan) return [];

  const aiInterlinkEntry = clusterPlan.interlinkingPlan?.find(
    (entry) => entry.sourceIndex === sourceIndex
  );

  // Calculate how many targets of each anchor type we need (20/50/30 split)
  const total = siblingArticles.length;
  const exactCount = Math.max(1, Math.round(total * 0.2));
  const genericCount = Math.max(1, Math.round(total * 0.3));

  return siblingArticles.map((sibling, idx) => {
    const siblingOriginalIndex = clusterPlan.articles.findIndex(
      (a) => a.slug === sibling.slug
    );

    const aiTarget = aiInterlinkEntry?.targets.find(
      (t) => t.targetIndex === siblingOriginalIndex
    );
    const aiPhrases = aiTarget?.suggestedAnchorPhrases || [];

    const keywordPhrases = sibling.keywords.slice(0, 5);

    const subPhrases: string[] = [];
    for (const kw of keywordPhrases) {
      const words = kw.split(/\s+/);
      if (words.length >= 3) {
        for (let j = 0; j < words.length - 1; j++) {
          subPhrases.push(words.slice(j, j + 2).join(' '));
        }
      }
    }

    const simplifiedTitle = sibling.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 4)
      .join(' ');

    const allPhrases = [
      ...aiPhrases,
      ...keywordPhrases,
      ...subPhrases,
      simplifiedTitle,
    ];
    const seen = new Set<string>();
    const uniquePhrases = allPhrases.filter((p) => {
      const lower = p.toLowerCase().trim();
      if (!lower || seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    // Assign anchor text type using 20/50/30 variance distribution
    let anchorTextType: 'exact' | 'semantic' | 'generic';
    if (idx < exactCount) {
      anchorTextType = 'exact';
    } else if (idx >= total - genericCount) {
      anchorTextType = 'generic';
    } else {
      anchorTextType = 'semantic';
    }

    return {
      targetSlug: sibling.slug,
      targetTitle: sibling.title,
      targetUrl: sibling.targetUrl,
      suggestedAnchorPhrases: uniquePhrases,
      anchorTextType,
      linkStrategy: getLinkStrategy(sibling.articleType),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE ARTICLE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

interface SingleArticleParams {
  jobId: string;
  userId: string;
  articleId: string;
  articleType: ArticleType;
  keyword: string;
  variation: TitleVariation;
  targetWordCount: number;
  variationName: BaseVariationName | "random";
  provider: AIProvider;
  skipImages: boolean;
  /** Cluster context for sibling awareness (optional - only for cluster mode) */
  clusterContext?: ClusterContext;
  /** Whether this is the pillar (parent) article in a cluster */
  isPillar?: boolean;
  /** Image provider to use (gemini or flux) */
  imageProvider?: ImageProvider;
  /** Estimated credits deducted for this article */
  estimatedCredits?: number;
  /** Previously generated H1s to avoid (for H1 variety in bulk) */
  previousH1s?: string[];
  /** Local business info for local SEO articles */
  localBusinessInfo?: LocalBusinessInfo;
  /** Article-type-specific context (commercial, comparison, review, local) */
  articleContext?: ArticleTypeContext;
  /** Optional component toggles (when provided, only listed components are generated) */
  selectedComponents?: string[];
}

interface SingleArticleResult {
  html: string;
  wordCount: number;
  imageCount: number;
  historyId: string;
}

async function generateSingleArticle(
  params: SingleArticleParams
): Promise<SingleArticleResult> {
  const {
    jobId,
    userId,
    articleId,
    articleType,
    keyword,
    variation,
    targetWordCount,
    variationName,
    provider,
    skipImages,
    clusterContext,
    isPillar,
    imageProvider,
    estimatedCredits,
    previousH1s,
    localBusinessInfo,
  } = params;

  // Create history entry
  const historyId = `hist_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  await db.insert(generationHistory).values({
    id: historyId,
    userId,
    articleType,
    keyword,
    status: "pending",
    priority: isPillar ? 1 : 0, // Pillar articles get priority 1
    isBulk: 1,
    metadata: JSON.stringify({
      bulkJobId: jobId,
      bulkArticleId: articleId,
      variation,
      variationName,
      provider,
      isPillar: isPillar ?? false,
    }),
  });

  // Collect image placeholders
  const imagePlaceholders: ImagePlaceholder[] = [];
  let imageCounter = 0;

  // Image callback that collects placeholders
  const imageCallback = async (callbackParams: {
    description: string;
    imageType: ImageType;
    componentType?: string;
    context?: string;
    stepNumber?: number;
    sourceImageUrl?: string;
    sourceProductName?: string;
  }) => {
    const imageId = `img_${Date.now()}_${++imageCounter}_${crypto
      .randomUUID()
      .substring(0, 7)}`;
    const isProductCard = callbackParams.componentType === 'product-card';
    const placeholderUrl = isProductCard
      ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`
      : `https://placehold.co/800x450/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`;

    imagePlaceholders.push({
      imageId,
      placeholder: placeholderUrl,
      description: callbackParams.description,
      imageType: callbackParams.imageType,
      componentType: callbackParams.componentType,
      context: callbackParams.context,
      stepNumber: callbackParams.stepNumber,
      sourceImageUrl: callbackParams.sourceImageUrl,
      sourceProductName: callbackParams.sourceProductName,
    });

    return { url: placeholderUrl };
  };

  // Update progress: content generation starting
  try {
    await db
      .update(bulkJobArticles)
      .set({ phase: "content", progress: 10 })
      .where(eq(bulkJobArticles.id, articleId));
  } catch (progressError) {
    console.warn(`[bulk-generate] Non-critical: failed to update progress for ${articleId}`, progressError);
  }

  await sendBulkEvent(jobId, userId, "article:progress", {
    articleId,
    phase: "content",
    progress: 10,
  });

  // Generate content using the orchestrator
  let finalHtml = "";
  let wordCount = 0;
  let classificationHint: import('@/lib/ai/classify-article').ClassificationHint | null = null;

  const generator = orchestrateUnifiedGeneration(
    articleType,
    keyword,
    variation,
    targetWordCount,
    imageCallback,
    "default", // componentColor
    provider,
    variationName,
    true, // enableKeywordExpansion
    true, // enableAutoCorrection
    true, // skipAltTextValidation - will be done in image phase
    undefined, // affiliateTag
    clusterContext, // Cluster context for sibling awareness (optional)
    undefined, // costTrackingInfo
    // Resolve articleContext: prefer new field, fall back to legacy localBusinessInfo
    params.articleContext ?? (localBusinessInfo ? { localBusinessInfo } : undefined), // article-type context
    previousH1s, // Previously generated H1s for variety
    params.selectedComponents, // Optional component toggles
  );

  // Consume all events from the generator
  let lastProgressUpdate = Date.now();

  for await (const event of generator) {
    // Track progress from incremental content
    if (event.type === "incremental_content" || event.type === "component_chunk") {
      // Update progress periodically (max every 2 seconds to avoid DB spam)
      const now = Date.now();
      if (now - lastProgressUpdate > 2000) {
        lastProgressUpdate = now;
        // Estimate progress based on accumulated content length
        const accumulatedLength = event.accumulated?.length || 0;
        const estimatedWords = Math.round(accumulatedLength / 6); // ~6 chars per word average
        const contentProgress = Math.min(30, 10 + (estimatedWords / targetWordCount) * 20);
        try {
          await db
            .update(bulkJobArticles)
            .set({ progress: Math.round(contentProgress) })
            .where(eq(bulkJobArticles.id, articleId));
        } catch {
          // Non-critical: progress update is cosmetic; don't crash generation
        }
      }
    }

    if (event.type === "classification_complete") {
      classificationHint = event.hint;
    }

    if (event.type === "complete") {
      finalHtml = event.html;
      wordCount = event.wordCount;
    }
  }

  // Update progress: content complete, starting images
  try {
    await db
      .update(bulkJobArticles)
      .set({ phase: "images", progress: 35 })
      .where(eq(bulkJobArticles.id, articleId));
  } catch (progressError) {
    console.warn(`[bulk-generate] Non-critical: failed to update progress for ${articleId}`, progressError);
  }

  await sendBulkEvent(jobId, userId, "article:progress", {
    articleId,
    phase: "images",
    progress: 35,
  });

  // Generate images (if not skipped)
  let successfulImages = 0;
  let failedImages = 0;

  if (!skipImages && imagePlaceholders.length > 0) {
    logger.info(`Generating ${imagePlaceholders.length} images for article`, {
      articleId,
    });

    // Batch trigger image generation
    const imagePayloads = imagePlaceholders.map((placeholder, index) => ({
      payload: {
        imageId: placeholder.imageId,
        historyId,
        userId,
        jobId,
        prompt: placeholder.description,
        context: placeholder.context || keyword,
        imageType: placeholder.imageType,
        articleType,
        componentType: placeholder.componentType,
        stepNumber: placeholder.stepNumber,
        sourceImageUrl: placeholder.sourceImageUrl,
        sourceProductName: placeholder.sourceProductName,
        index: index + 1,
        total: imagePlaceholders.length,
        imageProvider,
      },
    }));

    const batchResult = await generateImageTask.batchTriggerAndWait(imagePayloads);

    // Process results and replace placeholders
    const imageUrlMap = new Map<string, string>();

    for (const result of batchResult.runs) {
      if (result.ok && result.output.success) {
        successfulImages++;
        imageUrlMap.set(result.output.imageId, result.output.url!);
      } else {
        failedImages++;
        const output = result.ok ? result.output : null;
        const matchingPlaceholder = imagePlaceholders.find(p => p.imageId === output?.imageId);
        const isProductCard = matchingPlaceholder?.componentType === 'product-card';
        const fallbackUrl =
          output?.fallbackUrl ||
          (isProductCard
            ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Image+Error`
            : `https://placehold.co/800x450/e5e7eb/6b7280?text=Image+Error`);

        if (output?.imageId) {
          imageUrlMap.set(output.imageId, fallbackUrl);
        }
      }
    }

    // Replace placeholder URLs with actual URLs (multi-strategy, same as generate-article.ts)
    for (const placeholder of imagePlaceholders) {
      const url = imageUrlMap.get(placeholder.imageId);
      if (url) {
        // Strategy 1: Match by data-image-id attribute (exact, most reliable)
        const srcPattern = new RegExp(
          `(<img[^>]*data-image-id="${placeholder.imageId}"[^>]*src=")[^"]*(")`,"gi"
        );
        finalHtml = finalHtml.replace(srcPattern, `$1${url}$2`);

        // Strategy 2: Match by placeholder URL pattern with proper quote boundaries
        // Uses [^"]* to match the full URL up to the closing quote, including apostrophes
        const counterMatch = placeholder.imageId.match(/^img_\d+_(\d+)_/);
        const imageNumber = counterMatch?.[1] || "\\d+";
        const placeholderUrlPattern = new RegExp(
          `https://placehold\\.co/[^"]*Loading[+%20]Image[+%20]${imageNumber}(?!\\d)[^"]*`, "gi"
        );
        finalHtml = finalHtml.replace(placeholderUrlPattern, url);

        // Strategy 3: Legacy {{IMAGE:...}} patterns
        const legacyPattern = new RegExp(`\\{\\{IMAGE:${placeholder.imageId}:[^}]*\\}\\}`, "g");
        if (legacyPattern.test(finalHtml)) {
          finalHtml = finalHtml.replace(legacyPattern,
            `<img src="${url}" alt="${placeholder.description.replace(/"/g, '&quot;')}" loading="lazy" data-image-id="${placeholder.imageId}" />`
          );
        }
      }
    }

    // Safety net: replace any remaining placehold.co URLs sequentially
    if (finalHtml.includes('placehold.co')) {
      console.warn(`[bulk-generate] Found remaining placehold.co URLs after primary replacement, applying sequential fallback`);
      const orderedR2Urls: string[] = [];
      for (const placeholder of imagePlaceholders) {
        const url = imageUrlMap.get(placeholder.imageId);
        if (url && !url.includes('placehold.co')) orderedR2Urls.push(url);
      }
      for (const r2Url of orderedR2Urls) {
        if (!finalHtml.includes('placehold.co')) break;
        finalHtml = finalHtml.replace(
          /https:\/\/placehold\.co\/[^"\s)]+/,
          r2Url
        );
      }
    }
  }

  // Update progress: finalizing
  try {
    await db
      .update(bulkJobArticles)
      .set({ phase: "finalizing", progress: 90 })
      .where(eq(bulkJobArticles.id, articleId));
  } catch (progressError) {
    console.warn(`[bulk-generate] Non-critical: failed to update progress for ${articleId}`, progressError);
  }

  // Update history with final content
  await db
    .update(generationHistory)
    .set({
      htmlContent: finalHtml,
      wordCount,
      status: "completed",
      metadata: JSON.stringify({
        bulkJobId: jobId,
        bulkArticleId: articleId,
        variation,
        variationName,
        provider,
        imageStats: {
          total: imagePlaceholders.length,
          successful: successfulImages,
          failed: failedImages,
        },
        completedAt: new Date().toISOString(),
        ...(classificationHint ? { classificationHint } : {}),
      }),
      updatedAt: new Date(),
    })
    .where(eq(generationHistory.id, historyId));

  // Update cost summary with all AI usage including images
  await updateGenerationCostSummary(historyId, userId);
  logger.info("Cost summary updated for bulk article", { historyId });

  // Failed image refund — refund credits for images the user paid for but didn't receive
  if (failedImages > 0 && imageProvider) {
    try {
      const { IMAGE_CREDIT_RATES } = await import("@/lib/services/credit-estimator");
      const creditsPerImage = IMAGE_CREDIT_RATES[imageProvider as keyof typeof IMAGE_CREDIT_RATES] ?? 0;
      const refundAmount = failedImages * creditsPerImage;
      if (refundAmount > 0) {
        await refundCredits(
          userId,
          refundAmount,
          historyId,
          `Failed image refund: ${failedImages} image(s) failed × ${creditsPerImage} credits`,
          'monthly'
        );
        logger.info("Credits refunded for failed images in bulk article", {
          historyId,
          articleId,
          failedImages,
          creditsPerImage,
          refunded: refundAmount,
        });
      }
    } catch (refundError) {
      logger.error("Failed image refund error in bulk article", {
        historyId,
        error: refundError instanceof Error ? refundError.message : "Unknown error",
      });
    }
  }

  return {
    html: finalHtml,
    wordCount,
    imageCount: successfulImages + failedImages,
    historyId,
  };
}
