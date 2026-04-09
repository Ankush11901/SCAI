/**
 * Bulk Article Generation Task (Parallel)
 *
 * Trigger.dev task for generating a single article within a bulk job.
 * This task is designed to run in parallel with other articles in the same bulk job.
 * 
 * Each article receives a pre-generated H1 to maintain variety while allowing
 * parallel content generation.
 * 
 * Flow:
 * 1. Receive pre-generated H1 from bulk orchestrator
 * 2. Generate content using unified orchestrator (with preset H1)
 * 3. Generate images in parallel (using existing batchTriggerAndWait)
 * 4. Update database with results
 * 5. Send real-time progress via Pusher
 * 6. Handle credits (release reservation, deduct actual, refund failures)
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@/lib/db";
import {
  bulkJobArticles,
  generationHistory,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { incrementQuotaUsage } from "@/lib/services/quota-service";
import { orchestrateUnifiedGeneration } from "@/lib/services/unified-orchestrator";
import { generateImageTask } from "./generate-images";
import type { TitleVariation } from "@/lib/types/generation";
import type { ArticleType, ImageType, ImageProvider } from "@/lib/services/imagen";
import type { AIProvider } from "@/lib/ai/providers";
import type { BaseVariationName } from "@/lib/services/template-hydrator";
import crypto from "crypto";
import Pusher from "pusher";
import { updateGenerationCostSummary } from "@/lib/services/cost-tracking-service";
import { deductCredits, releaseReservation, refundCredits } from "@/lib/services/credit-service";
import type { ClusterContext } from "@/lib/types/cluster";
import type { LocalBusinessInfo, ArticleTypeContext } from "@/lib/services/content-generators";

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

export interface ArticleBulkPayload {
  /** Bulk job ID */
  jobId: string;
  /** User ID */
  userId: string;
  /** Article ID within the bulk job */
  articleId: string;
  /** Article type */
  articleType: ArticleType;
  /** Primary keyword/topic */
  keyword: string;
  /** Title variation style */
  variation: TitleVariation;
  /** Target word count */
  targetWordCount: number;
  /** Variation name for styling */
  variationName: BaseVariationName | "random";
  /** AI provider to use */
  provider: AIProvider;
  /** Whether to skip image generation */
  skipImages: boolean;
  /** Cluster context for sibling awareness (cluster mode only) */
  clusterContext?: ClusterContext;
  /** Whether this is the pillar article in a cluster */
  isPillar: boolean;
  /** Image provider (gemini or flux) */
  imageProvider?: ImageProvider;
  /** Estimated credits for this article */
  estimatedCredits: number;
  /** Pre-generated H1 from sequential phase (maintains variety) */
  presetH1: string;
  /** Pre-generated meta title */
  presetMetaTitle?: string;
  /** Pre-generated meta description */
  presetMetaDescription?: string;
  /** Local business info for local SEO articles */
  localBusinessInfo?: LocalBusinessInfo;
  /** Article-type-specific context */
  articleContext?: ArticleTypeContext;
  /** Optional component toggles */
  selectedComponents?: string[];
  /** Components to exclude (e.g., ['closing-h2', 'closing-paragraph']) */
  excludeComponents?: string[];
  /** Index in the bulk job (1-based) */
  index: number;
  /** Total articles in the bulk job */
  total: number;
}

export interface ArticleBulkResult {
  /** Generated history ID */
  historyId: string;
  /** Final HTML content */
  html: string;
  /** Word count */
  wordCount: number;
  /** Image count */
  imageCount: number;
  /** Article ID (passed through for identification) */
  articleId: string;
  /** Success flag */
  success: boolean;
  /** Error message if failed */
  error?: string;
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
// PARALLEL ARTICLE GENERATION TASK
// ═══════════════════════════════════════════════════════════════════════════════

export const generateArticleBulkTask = task({
  id: "generate-article-bulk",
  // Default queue config - will be overridden per-user at trigger time
  // Global limit: 30 concurrent articles across all users (managed by orchestrator)
  // Per-user limit: 5 concurrent articles per user (enforced via queue override)
  queue: {
    name: "bulk-articles-default",
    concurrencyLimit: 5, // Fallback limit if triggered directly
  },
  // Use small-2x machine (optimal per cost analysis: $0.00489/article)
  machine: {
    preset: "small-2x", // 1 vCPU, 1GB RAM
  },
  // 15 minutes max per article (content + images)
  maxDuration: 900,
  // Retry configuration for individual articles
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ArticleBulkPayload): Promise<ArticleBulkResult> => {
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
      presetH1,
      presetMetaTitle,
      presetMetaDescription,
      localBusinessInfo,
      articleContext,
      selectedComponents,
      excludeComponents,
      index,
      total,
    } = payload;

    logger.info(`Starting article ${index}/${total}`, {
      articleId,
      keyword,
      presetH1,
    });

    // Send article start event
    await sendBulkEvent(jobId, userId, "article:start", {
      articleId,
      articleType,
      keyword,
      index,
      total,
    });

    // Update article status to generating
    await db
      .update(bulkJobArticles)
      .set({
        status: "generating",
        phase: "content",
        progress: 5,
        startedAt: new Date(),
      })
      .where(eq(bulkJobArticles.id, articleId));

    try {
      // Increment quota for this article
      await incrementQuotaUsage(userId);

      // Create history entry
      const historyId = `hist_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

      await db.insert(generationHistory).values({
        id: historyId,
        userId,
        articleType,
        keyword,
        status: "pending",
        priority: isPillar ? 1 : 0,
        isBulk: 1,
        metadata: JSON.stringify({
          bulkJobId: jobId,
          bulkArticleId: articleId,
          variation,
          variationName,
          provider,
          isPillar: isPillar ?? false,
          presetH1, // Track that H1 was pre-generated
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
        const isProductCard = callbackParams.componentType === "product-card";
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
        console.warn(
          `[generate-article-bulk] Non-critical: failed to update progress for ${articleId}`,
          progressError
        );
      }

      await sendBulkEvent(jobId, userId, "article:progress", {
        articleId,
        phase: "content",
        progress: 10,
      });

      // Generate content using the orchestrator (with preset H1)
      let finalHtml = "";
      let wordCount = 0;
      let classificationHint: import("@/lib/ai/classify-article").ClassificationHint | null = null;

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
        clusterContext, // Cluster context for sibling awareness
        undefined, // costTrackingInfo - handled separately
        articleContext ?? (localBusinessInfo ? { localBusinessInfo } : undefined),
        undefined, // previousH1s - not needed, using presetH1 instead
        selectedComponents,
        excludeComponents, // Exclude closing components by default
        presetH1, // NEW: Pass pre-generated H1
        presetMetaTitle, // NEW: Pass pre-generated meta title
        presetMetaDescription, // NEW: Pass pre-generated meta description
      );

      // Consume all events from the generator
      let lastProgressUpdate = Date.now();

      for await (const event of generator) {
        // Track progress from incremental content
        if (event.type === "incremental_content" || event.type === "component_chunk") {
          const now = Date.now();
          if (now - lastProgressUpdate > 2000) {
            lastProgressUpdate = now;
            const accumulatedLength = event.accumulated?.length || 0;
            const estimatedWords = Math.round(accumulatedLength / 6);
            const contentProgress = Math.min(
              30,
              10 + (estimatedWords / targetWordCount) * 20
            );
            try {
              await db
                .update(bulkJobArticles)
                .set({ progress: Math.round(contentProgress) })
                .where(eq(bulkJobArticles.id, articleId));
            } catch {
              // Non-critical: progress update is cosmetic
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
        console.warn(
          `[generate-article-bulk] Non-critical: failed to update progress for ${articleId}`,
          progressError
        );
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
        const imagePayloads = imagePlaceholders.map((placeholder, idx) => ({
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
            index: idx + 1,
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
            const matchingPlaceholder = imagePlaceholders.find(
              (p) => p.imageId === output?.imageId
            );
            const isProductCard = matchingPlaceholder?.componentType === "product-card";
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

        // Replace placeholder URLs with actual URLs
        for (const placeholder of imagePlaceholders) {
          const url = imageUrlMap.get(placeholder.imageId);
          if (url) {
            // Strategy 1: Match by data-image-id attribute
            const srcPattern = new RegExp(
              `(<img[^>]*data-image-id="${placeholder.imageId}"[^>]*src=")[^"]*(")`,"gi"
            );
            finalHtml = finalHtml.replace(srcPattern, `$1${url}$2`);

            // Strategy 2: Match by placeholder URL pattern
            const counterMatch = placeholder.imageId.match(/^img_\d+_(\d+)_/);
            const imageNumber = counterMatch?.[1] || "\\d+";
            const placeholderUrlPattern = new RegExp(
              `https://placehold\\.co/[^"]*Loading[+%20]Image[+%20]${imageNumber}(?!\\d)[^"]*`,
              "gi"
            );
            finalHtml = finalHtml.replace(placeholderUrlPattern, url);

            // Strategy 3: Legacy {{IMAGE:...}} patterns
            const legacyPattern = new RegExp(
              `\\{\\{IMAGE:${placeholder.imageId}:[^}]*\\}\\}`,
              "g"
            );
            if (legacyPattern.test(finalHtml)) {
              finalHtml = finalHtml.replace(
                legacyPattern,
                `<img src="${url}" alt="${placeholder.description.replace(
                  /"/g,
                  "&quot;"
                )}" loading="lazy" data-image-id="${placeholder.imageId}" />`
              );
            }
          }
        }

        // Safety net: replace any remaining placehold.co URLs
        if (finalHtml.includes("placehold.co")) {
          console.warn(
            `[generate-article-bulk] Found remaining placehold.co URLs, applying sequential fallback`
          );
          const orderedR2Urls: string[] = [];
          for (const placeholder of imagePlaceholders) {
            const url = imageUrlMap.get(placeholder.imageId);
            if (url && !url.includes("placehold.co")) orderedR2Urls.push(url);
          }
          for (const r2Url of orderedR2Urls) {
            if (!finalHtml.includes("placehold.co")) break;
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
        console.warn(
          `[generate-article-bulk] Non-critical: failed to update progress for ${articleId}`,
          progressError
        );
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
            presetH1,
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

      // Update cost summary
      await updateGenerationCostSummary(historyId, userId);
      logger.info("Cost summary updated for bulk article", { historyId });

      // Failed image refund
      if (failedImages > 0 && imageProvider) {
        try {
          const { IMAGE_CREDIT_RATES } = await import(
            "@/lib/services/credit-estimator"
          );
          const creditsPerImage =
            IMAGE_CREDIT_RATES[imageProvider as keyof typeof IMAGE_CREDIT_RATES] ?? 0;
          const refundAmount = failedImages * creditsPerImage;
          if (refundAmount > 0) {
            await refundCredits(
              userId,
              refundAmount,
              historyId,
              `Failed image refund: ${failedImages} image(s) failed × ${creditsPerImage} credits`,
              "monthly"
            );
            logger.info("Credits refunded for failed images", {
              historyId,
              articleId,
              failedImages,
              refunded: refundAmount,
            });
          }
        } catch (refundError) {
          logger.error("Failed image refund error", {
            historyId,
            error: refundError instanceof Error ? refundError.message : "Unknown error",
          });
        }
      }

      logger.info(`Article ${index}/${total} completed successfully`, {
        articleId,
        wordCount,
        imageCount: successfulImages + failedImages,
      });

      return {
        historyId,
        html: finalHtml,
        wordCount,
        imageCount: successfulImages + failedImages,
        articleId,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      logger.error(`Article ${index}/${total} failed`, {
        articleId,
        error: errorMessage,
      });

      // Send error event
      await sendBulkEvent(jobId, userId, "article:error", {
        articleId,
        articleType,
        keyword,
        error: errorMessage,
      });

      // Update article status to error
      await db
        .update(bulkJobArticles)
        .set({
          status: "error",
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(bulkJobArticles.id, articleId));

      return {
        historyId: "",
        html: "",
        wordCount: 0,
        imageCount: 0,
        articleId,
        success: false,
        error: errorMessage,
      };
    }
  },
});
