/**
 * Single Article Generation Task
 *
 * Trigger.dev task that runs content generation as a durable background job.
 * Streams HTML chunks via Realtime Streams v2 and progress via metadata.
 *
 * This task handles the entire generation flow:
 * 1. Generates content (with image placeholders)
 * 2. Generates images via batchTriggerAndWait (parallel)
 * 3. Replaces placeholder URLs with R2 URLs
 * 4. Corrects alt texts and finalizes article to DB
 */

import { task, logger, metadata } from "@trigger.dev/sdk/v3"
import { orchestrateUnifiedGeneration, type EnhancedImageCallback } from "@/lib/services/unified-orchestrator"
import { updateHistoryEntry } from "@/lib/services/history-service"
import { createCostTrackingContext } from "@/lib/services/cost-tracking-service"
import { updateGenerationCostSummary } from "@/lib/services/cost-tracking-service"
import { refundCredits } from "@/lib/services/credit-service"
import { correctAltTextsInHtml } from "@/lib/services/content-corrector"
import { generateImageTask } from "./generate-images"
import { articleContentStream } from "@/lib/streams/generation-streams"
import { db } from "@/lib/db"
import { generationHistory } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { TitleVariation } from "@/lib/types/generation"
import { IMAGE_CREDIT_RATES } from "@/lib/services/credit-estimator"
import type { ArticleType, ImageType, ImageProvider } from "@/lib/services/imagen"
import type { AIProvider } from "@/lib/ai/providers"
import type { BaseVariationName } from "@/lib/services/template-hydrator"
import type { ClassificationHint } from "@/lib/ai/classify-article"
import type { LocalBusinessInfo, ArticleTypeContext } from "@/lib/services/content-generators"
import crypto from "crypto"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ImagePlaceholder {
  imageId: string
  placeholder: string
  description: string
  imageType: ImageType
  componentType?: string
  context?: string
  stepNumber?: number
  sourceImageUrl?: string
  sourceProductName?: string
}

export interface GenerateArticlePayload {
  historyId: string
  userId: string
  articleType: string
  topic: string
  variation: TitleVariation
  targetWordCount: number
  componentColor: string
  provider: AIProvider
  variationName: BaseVariationName | "random"
  enableKeywordExpansion: boolean
  enableAutoCorrection: boolean
  skipImages: boolean
  imageProvider?: string
  amazonAffiliateTag?: string
  estimatedCredits: number
  creditDeduction?: { success?: boolean; creditsUsed?: number; source?: string } | null
  localBusinessInfo?: LocalBusinessInfo
  articleContext?: ArticleTypeContext
  selectedComponents?: string[]
}

export interface GenerateArticleOutput {
  html: string
  wordCount: number
  imageCount: number
  imagePlaceholders: ImagePlaceholder[]
  historyId: string
  usedVariation?: string
  usedProvider?: string
  classificationHint?: ClassificationHint
  credits?: { used: number; source: string; estimated: number }
  imageStats?: { total: number; successful: number; failed: number }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK
// ═══════════════════════════════════════════════════════════════════════════════

export const generateArticleTask = task({
  id: "generate-article",
  maxDuration: 900,
  machine: { preset: "small-2x" },
  retry: { maxAttempts: 2 },

  catchError: async ({ error, payload }) => {
    const p = payload as GenerateArticlePayload
    logger.error("generate-article failed", {
      historyId: p.historyId,
      error: error instanceof Error ? error.message : String(error),
    })

    // Attempt credit refund on failure
    if (p.estimatedCredits && p.estimatedCredits > 0) {
      try {
        // Refund to monthly since that's where credits are typically deducted from first
        await refundCredits(
          p.userId,
          p.estimatedCredits,
          p.historyId,
          `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          'monthly',
        )
        logger.info("Credits refunded due to failure", {
          historyId: p.historyId,
          refunded: p.estimatedCredits,
        })
      } catch (refundError) {
        logger.error("Refund on failure failed", {
          historyId: p.historyId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        })
      }
    }

    // Mark history entry as failed
    try {
      await updateHistoryEntry(p.historyId, {
        status: "failed",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      })
      
      // Also update bulkJobArticles if this is a bulk article
      try {
        const [history] = await db
          .select({ metadata: generationHistory.metadata })
          .from(generationHistory)
          .where(eq(generationHistory.id, p.historyId))
          .limit(1)
        
        if (history?.metadata) {
          let meta: Record<string, unknown> = {}
          try {
            meta = JSON.parse(history.metadata)
          } catch { /* ignore */ }
          
          if (meta.bulkArticleId && typeof meta.bulkArticleId === 'string') {
            logger.info('Updating bulk article to error status', {
              bulkArticleId: meta.bulkArticleId,
              historyId: p.historyId,
            })
            
            const { bulkJobArticles } = await import('@/lib/db/schema')
            
            await db.update(bulkJobArticles)
              .set({
                status: 'error',
                phase: 'error',
                progress: 0,
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                completedAt: new Date(),
              })
              .where(eq(bulkJobArticles.id, meta.bulkArticleId as string))
            
            logger.info('Bulk article error status updated', {
              bulkArticleId: meta.bulkArticleId,
            })
          }
        }
      } catch (bulkUpdateError) {
        logger.error('Failed to update bulk article error status', {
          historyId: p.historyId,
          error: bulkUpdateError instanceof Error ? bulkUpdateError.message : String(bulkUpdateError),
        })
      }
    } catch (historyError) {
      logger.error("Failed to update history on error", {
        historyId: p.historyId,
        error: historyError instanceof Error ? historyError.message : String(historyError),
      })
    }
  },

  run: async (payload: GenerateArticlePayload) => {
    const {
      historyId,
      userId,
      articleType,
      topic,
      variation,
      targetWordCount,
      componentColor,
      provider,
      variationName,
      enableKeywordExpansion,
      enableAutoCorrection,
      skipImages,
      imageProvider,
      amazonAffiliateTag,
      estimatedCredits,
      creditDeduction,
      localBusinessInfo,
    } = payload

    // ─── Initial metadata ──────────────────────────────────────────────────
    metadata
      .set("phase", "starting")
      .set("statusMessage", "Starting generation...")
      .set("historyId", historyId)

    // ─── Image callback (collect placeholders) ─────────────────────────────
    const imagePlaceholders: ImagePlaceholder[] = []
    let imageCounter = 0

    const imageCallback: EnhancedImageCallback = async (params) => {
      const imageId = `img_${Date.now()}_${++imageCounter}_${crypto.randomUUID().substring(0, 7)}`
      const isProductCard = params.componentType === "product-card"
      const placeholderUrl = isProductCard
        ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`
        : `https://placehold.co/800x450/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`

      imagePlaceholders.push({
        imageId,
        placeholder: placeholderUrl,
        description: params.description,
        imageType: params.imageType,
        componentType: params.componentType,
        context: params.context,
        stepNumber: params.stepNumber,
        sourceImageUrl: params.sourceImageUrl,
        sourceProductName: params.sourceProductName,
      })

      return { url: placeholderUrl }
    }

    // ─── Cost tracking ─────────────────────────────────────────────────────
    const costTracking = createCostTrackingContext(historyId, userId)

    // ─── Run orchestrator ──────────────────────────────────────────────────
    const generator = orchestrateUnifiedGeneration(
      articleType as ArticleType,
      topic,
      variation,
      targetWordCount,
      imageCallback,
      componentColor,
      provider,
      variationName,
      enableKeywordExpansion,
      enableAutoCorrection,
      true, // skipAltTextValidation — images handled later by frontend
      amazonAffiliateTag,
      undefined, // clusterContext
      { historyId, userId }, // costTrackingInfo
      // Resolve articleContext: prefer new field, fall back to legacy localBusinessInfo
      payload.articleContext ?? (localBusinessInfo ? { localBusinessInfo } : undefined), // article-type context
      undefined, // previousH1s
      payload.selectedComponents, // optional component toggles
    )

    // ─── Event routing loop ────────────────────────────────────────────────
    let finalHtml = ""
    let finalWordCount = 0
    let finalImageCount = 0
    let classificationHint: ClassificationHint | null = null
    let usedVariation: string | undefined
    let usedProvider: string | undefined

    // Incremental word count (avoid recounting full HTML)
    let incrementalWordCount = 0
    let lastMetadataUpdate = Date.now()

    for await (const event of generator) {
      switch (event.type) {
        case "start":
          metadata.set("phase", "content").set("statusMessage", "Generating content...")
          break

        case "variation_selected":
          usedVariation = event.variationName
          metadata.set("usedVariation", event.variationName)
          break

        case "provider_selected":
          usedProvider = event.provider
          metadata.set("usedProvider", event.provider)
          break

        case "phase":
          metadata.set("statusMessage", event.message)
          break

        case "structure_complete":
          metadata.set("structure", JSON.parse(JSON.stringify({
            h1: event.structure.h1,
            h2Count: event.structure.h2Titles.length,
            faqCount: event.structure.faqQuestions.length,
            coreKeywords: event.structure.coreKeywords || [],
            primaryKeyword: event.structure.primaryKeyword || "",
          })))
          break

        case "header_ready":
          articleContentStream.append(event.h1Html + event.featuredImageHtml)
          // Rough word estimate from header
          incrementalWordCount += estimateChunkWords(event.h1Html + event.featuredImageHtml)
          break

        case "component_chunk":
          // Token-by-token streaming — key for live typing effect
          articleContentStream.append(event.chunk)
          incrementalWordCount += estimateChunkWords(event.chunk)
          // Throttle metadata updates to every 2s
          throttledWordCountUpdate(incrementalWordCount, lastMetadataUpdate, (wc) => {
            lastMetadataUpdate = Date.now()
            metadata.set("wordCount", wc)
          })
          break

        case "incremental_content":
          articleContentStream.append(event.chunk)
          incrementalWordCount += estimateChunkWords(event.chunk)
          throttledWordCountUpdate(incrementalWordCount, lastMetadataUpdate, (wc) => {
            lastMetadataUpdate = Date.now()
            metadata.set("wordCount", wc)
          })
          break

        case "assembly_complete":
          metadata.set("phase", "assembly").set("statusMessage", "Assembling article...")
          break

        case "validation_result":
          metadata.set("validationResult", {
            isValid: event.isValid,
            score: event.score,
            errorCount: event.errors.length,
            warningCount: event.warnings.length,
          })
          break

        case "classification_complete":
          classificationHint = event.hint
          break

        case "complete":
          finalHtml = event.html
          finalWordCount = event.wordCount // Official accurate count
          finalImageCount = event.imageCount
          metadata
            .set("phase", "complete")
            .set("wordCount", event.wordCount)
            .set("statusMessage", "Generation complete")
          break

        case "error":
          metadata.set("error", event.error).set("phase", "error")
          throw new Error(event.error)
      }
    }

    // ─── Publish processed HTML for frontend display during image phase ────
    if (finalHtml) {
      metadata.set("processedHtml", finalHtml)
    }

    // ─── IMAGE GENERATION PHASE ────────────────────────────────────────────
    let successfulImages = 0
    let failedImages = 0

    if (!skipImages && imagePlaceholders.length > 0) {
      metadata
        .set("phase", "images")
        .set("statusMessage", `Generating ${imagePlaceholders.length} images...`)
        .set("imageProgress", JSON.parse(JSON.stringify({ completed: 0, total: imagePlaceholders.length })))

      // Build payloads for batch image generation
      const imagePayloads = imagePlaceholders.map((placeholder, index) => ({
        payload: {
          imageId: placeholder.imageId,
          historyId,
          userId,
          jobId: "__inline__", // Signal to skip Pusher events
          prompt: placeholder.description,
          context: placeholder.context || topic,
          imageType: placeholder.imageType,
          articleType: articleType as ArticleType,
          componentType: placeholder.componentType,
          stepNumber: placeholder.stepNumber,
          sourceImageUrl: placeholder.sourceImageUrl,
          sourceProductName: placeholder.sourceProductName,
          index: index + 1, // 1-indexed to match placeholder URLs
          total: imagePlaceholders.length,
          imageProvider: imageProvider as ImageProvider | undefined,
        },
      }))

      // Batch trigger and wait for all images (parallel)
      logger.info(`Triggering ${imagePlaceholders.length} image generation tasks`)
      const batchResult = await generateImageTask.batchTriggerAndWait(imagePayloads)

      // Process results — build imageUrlMap
      const imageUrlMap = new Map<string, string>()

      for (const result of batchResult.runs) {
        if (result.ok && result.output.success) {
          successfulImages++
          imageUrlMap.set(result.output.imageId, result.output.url!)
        } else {
          failedImages++
          const output = result.ok ? result.output : null
          const placeholder = imagePlaceholders.find(p => p.imageId === output?.imageId)
          const isProductCard = placeholder?.componentType === "product-card"
          const fallbackUrl = output?.fallbackUrl ||
            (isProductCard
              ? "https://placehold.co/400x400/e5e7eb/6b7280?text=Image+Error"
              : "https://placehold.co/800x450/e5e7eb/6b7280?text=Image+Error")
          if (output?.imageId) {
            imageUrlMap.set(output.imageId, fallbackUrl)
          }
          logger.warn("Image generation failed", { imageId: output?.imageId, error: output?.error })
        }
      }

      metadata
        .set("imageProgress", JSON.parse(JSON.stringify({ completed: successfulImages + failedImages, total: imagePlaceholders.length })))
        .set("statusMessage", "Assembling final article with images...")

      // ─── Replace placeholder URLs with R2 URLs ──────────────────────────
      for (const placeholder of imagePlaceholders) {
        const url = imageUrlMap.get(placeholder.imageId)
        if (url) {
          // Strategy 1: Match by data-image-id attribute
          const srcPattern = new RegExp(
            `(<img[^>]*data-image-id="${placeholder.imageId}"[^>]*src=")[^"]*(")`, "gi"
          )
          finalHtml = finalHtml.replace(srcPattern, `$1${url}$2`)

          // Strategy 2: Match by placeholder URL pattern (Loading+Image+N)
          const counterMatch = placeholder.imageId.match(/^img_\d+_(\d+)_/)
          const imageNumber = counterMatch?.[1] || "\\d+"
          const placeholderUrlPattern = new RegExp(
            `https://placehold\\.co/[^"]*Loading[+%20]Image[+%20]${imageNumber}(?!\\d)[^"]*`, "gi"
          )
          finalHtml = finalHtml.replace(placeholderUrlPattern, url)

          // Strategy 3: Legacy {{IMAGE:...}} patterns
          const legacyPattern = new RegExp(`\\{\\{IMAGE:${placeholder.imageId}:[^}]*\\}\\}`, "g")
          if (legacyPattern.test(finalHtml)) {
            finalHtml = finalHtml.replace(legacyPattern,
              `<img src="${url}" alt="${placeholder.description.replace(/"/g, "&quot;")}" loading="lazy" data-image-id="${placeholder.imageId}" />`
            )
          }
        }
      }

      // Safety net: replace any remaining placehold.co URLs sequentially
      if (finalHtml.includes("placehold.co")) {
        logger.warn("Found remaining placehold.co URLs, applying sequential fallback")
        const orderedR2Urls: string[] = []
        for (const placeholder of imagePlaceholders) {
          const url = imageUrlMap.get(placeholder.imageId)
          if (url && !url.includes("placehold.co")) orderedR2Urls.push(url)
        }
        for (const r2Url of orderedR2Urls) {
          if (!finalHtml.includes("placehold.co")) break
          finalHtml = finalHtml.replace(/https:\/\/placehold\.co\/[^"\s)]+/, r2Url)
        }
      }

      // ─── Alt text correction ────────────────────────────────────────────
      metadata.set("statusMessage", "Validating alt texts...")
      try {
        const altTextResult = await correctAltTextsInHtml(finalHtml, {
          topic,
          articleType: articleType as ArticleType,
          provider: (provider || "gemini") as AIProvider,
          costTracking,
        })
        if (altTextResult.totalCorrections > 0) {
          logger.info(`Applied ${altTextResult.totalCorrections} alt text corrections`)
          finalHtml = altTextResult.html
        }
      } catch (altError) {
        logger.warn("Alt text validation failed, proceeding with existing alt texts", {
          error: altError instanceof Error ? altError.message : "Unknown error",
        })
      }

      metadata
        .set("phase", "complete")
        .set("wordCount", finalWordCount)
        .set("statusMessage", "Generation complete")
    }

    // ─── Finalize to DB (merged metadata) ────────────────────────────────
    try {
      const [existing] = await db
        .select({ metadata: generationHistory.metadata })
        .from(generationHistory)
        .where(eq(generationHistory.id, historyId))
        .limit(1)

      let existingMeta: Record<string, unknown> = {}
      try {
        if (existing?.metadata) existingMeta = JSON.parse(existing.metadata)
      } catch { /* ignore */ }

      await db.update(generationHistory)
        .set({
          htmlContent: finalHtml,
          wordCount: finalWordCount,
          status: "completed",
          metadata: JSON.stringify({
            ...existingMeta,
            ...(classificationHint ? { classificationHint } : {}),
            ...(usedVariation ? { usedVariation } : {}),
            ...(usedProvider ? { usedProvider } : {}),
            imageStats: {
              total: imagePlaceholders.length,
              successful: successfulImages,
              failed: failedImages,
            },
            completedAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        })
        .where(eq(generationHistory.id, historyId))

      // Update bulkJobArticles if this is a bulk article (for regenerations)
      if (existingMeta.bulkArticleId && typeof existingMeta.bulkArticleId === 'string') {
        logger.info('Updating bulk article status', {
          bulkArticleId: existingMeta.bulkArticleId,
          historyId,
        })
        
        const { bulkJobArticles } = await import('@/lib/db/schema')
        
        try {
          await db.update(bulkJobArticles)
            .set({
              status: 'complete',
              phase: 'complete',
              progress: 100,
              completedAt: new Date(),
              wordCount: finalWordCount,
              errorMessage: null,
            })
            .where(eq(bulkJobArticles.id, existingMeta.bulkArticleId as string))
          
          logger.info('Bulk article status updated successfully', {
            bulkArticleId: existingMeta.bulkArticleId,
          })
        } catch (bulkUpdateError) {
          logger.error('Failed to update bulk article status', {
            bulkArticleId: existingMeta.bulkArticleId,
            error: bulkUpdateError instanceof Error ? bulkUpdateError.message : String(bulkUpdateError),
          })
        }
      }
    } catch (error) {
      logger.error("Failed to finalize history entry", {
        historyId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // ─── Update cost summary (internal analytics) ─────────────────────────
    try {
      await updateGenerationCostSummary(historyId, userId)
    } catch (error) {
      logger.error("Failed to update cost summary", {
        historyId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // ─── Failed image refund ────────────────────────────────────────────────
    // Refund credits for images the user paid for but didn't receive
    if (failedImages > 0 && imageProvider) {
      try {
        const creditsPerImage = IMAGE_CREDIT_RATES[imageProvider as keyof typeof IMAGE_CREDIT_RATES] ?? 0
        const refundAmount = failedImages * creditsPerImage
        if (refundAmount > 0) {
          await refundCredits(
            userId,
            refundAmount,
            historyId,
            `Failed image refund: ${failedImages} image(s) failed × ${creditsPerImage} credits`,
            'monthly',
          )
          logger.info("Credits refunded for failed images", {
            historyId,
            failedImages,
            creditsPerImage,
            refunded: refundAmount,
          })
        }
      } catch (refundError) {
        logger.error("Failed image refund error", {
          historyId,
          error: refundError instanceof Error ? refundError.message : "Unknown error",
        })
      }
    }

    // ─── Return output ─────────────────────────────────────────────────────
    const output: GenerateArticleOutput = {
      html: finalHtml,
      wordCount: finalWordCount,
      imageCount: finalImageCount,
      imagePlaceholders: [], // Empty — images already processed inline
      historyId,
      usedVariation,
      usedProvider,
      ...(classificationHint ? { classificationHint } : {}),
      ...(creditDeduction?.creditsUsed
        ? {
            credits: {
              used: creditDeduction.creditsUsed,
              source: creditDeduction.source || "unknown",
              estimated: estimatedCredits,
            },
          }
        : {}),
      imageStats: {
        total: imagePlaceholders.length,
        successful: successfulImages,
        failed: failedImages,
      },
    }

    return output
  },
})

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Rough word estimate from an HTML chunk (avoid counting the full accumulated HTML) */
function estimateChunkWords(chunk: string): number {
  // Strip HTML tags, then count words
  const text = chunk.replace(/<[^>]*>/g, " ")
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  return words.length
}

/** Only update metadata if at least 2s have passed since last update */
function throttledWordCountUpdate(
  wordCount: number,
  lastUpdate: number,
  update: (wc: number) => void,
): void {
  const now = Date.now()
  if (now - lastUpdate > 2000) {
    update(wordCount)
  }
}
