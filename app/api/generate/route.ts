import { NextRequest } from 'next/server'
import { generateImage, type ArticleType, type ImageType, type ImageProvider } from '@/lib/services/imagen'
import { generateProductImage } from '@/lib/services/product-image-generator'
import { orchestrateUnifiedGeneration, type EnhancedImageCallback } from '@/lib/services/unified-orchestrator'
import { updateHistoryEntry } from '@/lib/services/history-service'
import { runGenerationPreflight, PreflightError } from '@/lib/services/generation-preflight'
import { tasks, auth } from '@trigger.dev/sdk/v3'
import type { generateArticleTask } from '@/lib/jobs/generate-article'
import type { StreamEvent } from '@/lib/types/generation'
import type { ClassificationHint } from '@/lib/ai/classify-article'

/**
 * POST /api/generate
 * Generate an article using the parallel orchestration system
 * Phases: Structure → Parallel Content → Assembly → Images
 *
 * Two modes:
 * - backgroundTask: true → Trigger.dev task with realtime streaming (recommended)
 * - stream: true → SSE streaming (legacy fallback)
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { stream = false, backgroundTask = false, backgroundImages = false, imageProvider } = body

  // ─── Shared preflight (auth, credits, quota, history) ──────────────────────
  let preflight
  try {
    preflight = await runGenerationPreflight(body)
  } catch (error) {
    if (error instanceof PreflightError) {
      return new Response(
        JSON.stringify({ error: error.message, ...error.details }),
        { status: error.statusCode, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const {
    userId,
    amazonAffiliateTag,
    historyId,
    costTracking,
    creditDeduction,
    estimatedCredits,
    validatedParams,
  } = preflight

  // Check if this was an idempotent duplicate (preflight found existing entry)
  const existingRunId = (preflight as { existingRunId?: string }).existingRunId
  if (backgroundTask && existingRunId) {
    // Return existing run info without re-triggering
    try {
      const publicToken = await auth.createPublicToken({
        scopes: { read: { runs: [existingRunId] } },
        expirationTime: '30m',
      })
      return Response.json({ runId: existingRunId, publicToken, historyId })
    } catch {
      // Token creation failed for existing run — fall through to create new
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND TASK MODE (Trigger.dev)
  // ═══════════════════════════════════════════════════════════════════════════
  if (backgroundTask) {
    try {
      const handle = await tasks.trigger<typeof generateArticleTask>('generate-article', {
        historyId,
        userId,
        articleType: validatedParams.articleType,
        topic: validatedParams.topic,
        variation: validatedParams.variation,
        targetWordCount: validatedParams.targetWordCount,
        componentColor: validatedParams.componentColor,
        provider: validatedParams.provider,
        variationName: validatedParams.variationName,
        enableKeywordExpansion: validatedParams.enableKeywordExpansion,
        enableAutoCorrection: validatedParams.enableAutoCorrection,
        skipImages: validatedParams.skipImages,
        imageProvider: validatedParams.imageProvider,
        amazonAffiliateTag,
        estimatedCredits: estimatedCredits.totalCredits,
        creditDeduction: creditDeduction ? {
          creditsUsed: creditDeduction.creditsUsed,
          source: creditDeduction.source,
        } : null,
        localBusinessInfo: validatedParams.localBusinessInfo,
        articleContext: validatedParams.articleContext,
        selectedComponents: validatedParams.selectedComponents,
      })

      // Store runId, form state for reconnection, and local business data on history entry
      try {
        await updateHistoryEntry(historyId, {
          metadata: {
            triggerRunId: handle.id,
            // Store form state for reconnection when sessionStorage is cleared
            formState: {
              topic: validatedParams.topic,
              articleType: validatedParams.articleType,
              variation: validatedParams.variation,
              variationName: validatedParams.variationName,
              provider: validatedParams.provider,
              targetWordCount: validatedParams.targetWordCount,
              componentColor: validatedParams.componentColor,
              skipImages: validatedParams.skipImages,
              imageProvider: validatedParams.imageProvider,
              enableKeywordExpansion: validatedParams.enableKeywordExpansion,
              enableAutoCorrection: validatedParams.enableAutoCorrection,
            },
            ...(validatedParams.localBusinessInfo ? { localBusinessInfo: validatedParams.localBusinessInfo } : {}),
            ...(validatedParams.articleContext ? { articleContext: validatedParams.articleContext } : {}),
          },
        })
      } catch (error) {
        console.error('[generate] Failed to store triggerRunId:', error)
      }

      // Create short-lived public token for frontend subscription
      const publicToken = await auth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        expirationTime: '30m',
      })

      return Response.json({ runId: handle.id, publicToken, historyId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[generate] Failed to trigger background task:', error)
      return new Response(
        JSON.stringify({ error: `Failed to start generation: ${message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SSE STREAMING MODE (legacy fallback)
  // ═══════════════════════════════════════════════════════════════════════════
  if (stream) {
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        let finalHtml = ''
        let finalWordCount = 0
        let finalImageCount = 0
        let hasError = false
        let classificationHint: ClassificationHint | null = null

        // Collect image placeholders when backgroundImages mode is enabled
        const collectedPlaceholders: Array<{
          imageId: string
          placeholder: string
          description: string
          imageType: ImageType
          componentType?: string
          context?: string
          stepNumber?: number
          sourceImageUrl?: string
        }> = []
        let imageCounter = 0

        try {
          // Enhanced image callback with full context and article-type awareness
          const imageCallback: EnhancedImageCallback = async (params) => {
            // BACKGROUND MODE: Return placeholder URL and collect metadata for Trigger.dev
            console.log('[generate] Image callback called, backgroundImages:', backgroundImages, 'description:', params.description?.substring(0, 50))

            if (backgroundImages) {
              const imageId = `img_${Date.now()}_${++imageCounter}_${Math.random().toString(36).substring(2, 7)}`
              const isProductCard = params.componentType === 'product-card'
              const placeholderUrl = isProductCard
                ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`
                : `https://placehold.co/800x450/e5e7eb/6b7280?text=Loading+Image+${imageCounter}`

              console.log('[generate] BACKGROUND MODE - returning placeholder:', placeholderUrl)

              collectedPlaceholders.push({
                imageId,
                placeholder: placeholderUrl,
                description: params.description,
                imageType: params.imageType,
                componentType: params.componentType,
                context: params.context,
                stepNumber: params.stepNumber,
                sourceImageUrl: params.sourceImageUrl,
              })

              // Return placeholder that will be replaced by Trigger.dev job
              return { url: placeholderUrl }
            }

            // DIRECT MODE: Generate images inline (original behavior)
            // Handle product card images: transform Amazon images using Gemini
            if (params.componentType === 'product-card' && params.sourceImageUrl) {
              console.log('[generate] Transforming product card image:', params.description)
              const result = await generateProductImage({
                productName: params.description,
                sourceImageUrl: params.sourceImageUrl,
                productCategory: params.context?.split('.')[0] || 'product',
                index: 0,
                costTracking,
              })
              if (result.success && result.imageUrl) {
                return { url: result.imageUrl }
              }
              // Fallback to source image if transformation fails
              console.log('[generate] Product image transform failed, using source image')
              return { url: params.sourceImageUrl }
            }

            // Regular image generation for all other image types
            return await generateImage(
              params.description,
              params.context,
              2, // 2K resolution
              params.imageType,
              params.articleType,
              params.stepNumber,
              params.sourceImageUrl,
              costTracking,
              imageProvider,
              params.sourceProductName,
            )
          }

          // Use the new UNIFIED orchestrator with AI SDK + template hydration
          const generator = orchestrateUnifiedGeneration(
            validatedParams.articleType as ArticleType,
            validatedParams.topic,
            validatedParams.variation,
            validatedParams.targetWordCount,
            imageCallback,
            validatedParams.componentColor,
            validatedParams.provider,
            validatedParams.variationName,
            validatedParams.enableKeywordExpansion,
            validatedParams.enableAutoCorrection,
            backgroundImages, // Skip alt text validation in background mode - will validate in Trigger.dev
            amazonAffiliateTag,
            undefined, // clusterContext
            costTracking ? { historyId, userId } : undefined, // costTrackingInfo
            validatedParams.articleContext, // article-type-specific context
            undefined, // previousH1s
            validatedParams.selectedComponents, // optional component toggles
          )

          // Stream events from the orchestrator
          for await (const event of generator) {
            // Track final values
            if (event.type === 'classification_complete') {
              classificationHint = event.hint
            }
            if (event.type === 'complete') {
              finalHtml = event.html
              finalWordCount = event.wordCount
              finalImageCount = event.imageCount
            }

            // Map orchestrator events to SSE format
            const sseData = mapEventToSSE(event)
            if (!sseData) continue // Internal events (e.g. classification_complete)

            // Add credit info to complete events
            const creditInfo = creditDeduction ? {
              credits: {
                used: creditDeduction.creditsUsed,
                source: creditDeduction.source,
                estimated: estimatedCredits.totalCredits,
              },
            } : {}

            // In background mode, enhance the complete event with placeholder info
            if (backgroundImages && event.type === 'complete') {
              console.log('[generate] COMPLETE with backgroundImages, placeholders:', collectedPlaceholders.length)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  ...sseData,
                  ...creditInfo,
                  backgroundImages: true,
                  historyId,
                  imagePlaceholders: collectedPlaceholders,
                  skipImages: validatedParams.skipImages, // Pass skipImages flag to frontend
                  imageProvider, // Pass imageProvider to frontend for trigger
                })}\n\n`)
              )
            } else if (event.type === 'complete') {
              // Add credit info to non-background complete events
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  ...sseData,
                  ...creditInfo,
                })}\n\n`)
              )
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`)
              )
            }
          }
        } catch (error) {
          hasError = true
          const message = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
          )
        } finally {
          // Update history entry with final result
          if (historyId) {
            try {
              await updateHistoryEntry(historyId, {
                status: hasError ? 'failed' : 'completed',
                wordCount: finalWordCount,
                htmlContent: finalHtml,
                ...(classificationHint ? { metadata: { classificationHint } } : {}),
              })
            } catch (error) {
              console.error('[generate] History update error:', error)
            }
          }
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } else {
    // Non-streaming response
    try {
      let finalHtml = ''
      let wordCount = 0
      let imageCount = 0

      // Use unified orchestrator with enhanced image callback
      const imageCallback: EnhancedImageCallback = async (params) => {
        // Handle product card images: transform Amazon images using Gemini
        if (params.componentType === 'product-card' && params.sourceImageUrl) {
          console.log('[generate] Transforming product card image:', params.description)
          const result = await generateProductImage({
            productName: params.description,
            sourceImageUrl: params.sourceImageUrl,
            productCategory: params.context?.split('.')[0] || 'product',
            index: 0
          })
          if (result.success && result.imageUrl) {
            return { url: result.imageUrl }
          }
          // Fallback to source image if transformation fails
          console.log('[generate] Product image transform failed, using source image')
          return { url: params.sourceImageUrl }
        }

        // Regular image generation for all other image types
        return await generateImage(
          params.description,
          params.context,
          2, // 2K resolution
          params.imageType,
          params.articleType,
          params.stepNumber,
          params.sourceImageUrl,
          undefined,
          imageProvider,
          params.sourceProductName,
        )
      }

      const generator = orchestrateUnifiedGeneration(
        validatedParams.articleType as ArticleType,
        validatedParams.topic,
        validatedParams.variation,
        validatedParams.targetWordCount,
        imageCallback,
        validatedParams.componentColor,
        validatedParams.provider,
        validatedParams.variationName,
        validatedParams.enableKeywordExpansion,
        validatedParams.enableAutoCorrection,
        false, // skipAltTextValidation
        amazonAffiliateTag,
        undefined, // clusterContext
        undefined, // costTrackingInfo - not available in non-streaming mode
        validatedParams.articleContext, // article-type-specific context
        undefined, // previousH1s
        validatedParams.selectedComponents, // optional component toggles
      )

      for await (const event of generator) {
        if (event.type === 'complete') {
          finalHtml = event.html
          wordCount = event.wordCount
          imageCount = event.imageCount
        } else if (event.type === 'error') {
          throw new Error(event.error)
        }
      }

      return new Response(JSON.stringify({
        html: finalHtml,
        wordCount,
        imageCount,
        credits: creditDeduction ? {
          used: creditDeduction.creditsUsed,
          source: creditDeduction.source,
        } : undefined,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}

/**
 * Map orchestrator events to frontend-compatible SSE format
 * Maintains backwards compatibility with existing frontend
 */
function mapEventToSSE(event: StreamEvent): Record<string, unknown> | null {
  switch (event.type) {
    case 'start':
      console.log(`[API] Event: start - ${event.articleType} about "${event.topic}"`)
      return { type: 'start', articleType: event.articleType, topic: event.topic }

    case 'phase':
      console.log(`[API] Event: phase - ${event.phase}: ${event.message}`)
      return { type: 'phase', phase: event.phase, message: event.message }

    case 'structure_complete':
      console.log(`[API] Event: structure_complete - H1: "${event.structure.h1}", ${event.structure.h2Titles.length} H2s`)
      // Send structure info for potential UI updates
      return {
        type: 'structure',
        h1: event.structure.h1,
        h2Count: event.structure.h2Titles.length,
        faqCount: event.structure.faqQuestions.length,
        coreKeywords: event.structure.coreKeywords,
        primaryKeyword: event.structure.primaryKeyword
      }

    case 'header_ready':
      console.log('[API] Event: header_ready - H1 + featured image ready')
      // Send H1 and featured image immediately so they show first during streaming
      return {
        type: 'text_chunk',
        chunk: event.h1Html + event.featuredImageHtml,
        accumulated: event.h1Html + event.featuredImageHtml,
        wordCount: countWords(event.h1Html)
      }

    case 'component_start':
      console.log(`[API] Event: component_start - ${event.componentId} (${event.index}/${event.total})`)
      return {
        type: 'status',
        message: `Generating ${event.componentId} (${event.index}/${event.total})...`
      }

    case 'component_chunk':
      // Token-by-token streaming - this is the key for live typing effect!
      const chunkWordCount = countWords(event.accumulated)
      return {
        type: 'text_chunk',
        componentId: event.componentId,
        chunk: event.chunk,
        accumulated: event.accumulated,
        wordCount: chunkWordCount
      }

    case 'component_complete':
      console.log(`[API] Event: component_complete - ${event.componentId}`)
      // Status only - actual content will be streamed in order via incremental_content
      return {
        type: 'component_complete',
        componentId: event.componentId,
        wordCount: countWords(event.html)
      }

    case 'incremental_content':
      // Stream content chunks in document order
      return {
        type: 'text_chunk',
        chunk: event.chunk,
        accumulated: event.accumulated,
        wordCount: countWords(event.accumulated)
      }

    case 'assembly_complete':
      console.log(`[API] Event: assembly_complete - ${countWords(event.html)} words`)
      return {
        type: 'content_complete',
        content: event.html,
        wordCount: countWords(event.html)
      }

    case 'image_start':
      console.log(`[API] Event: image_start - ${event.index}/${event.total}`)
      return {
        type: 'image_start',
        index: event.index,
        total: event.total,
        description: event.description
      }

    case 'image_complete':
      console.log(`[API] Event: image_complete - ${event.index}/${event.total}`)
      return {
        type: 'image_complete',
        index: event.index,
        total: event.total,
        url: event.url,
        placeholder: event.placeholder
      }

    case 'classification_complete':
      // Internal event — not sent to frontend
      return null

    case 'complete':
      console.log(`[API] Event: complete - ${event.wordCount} words, ${event.imageCount} images`)
      return {
        type: 'complete',
        html: event.html,
        wordCount: event.wordCount,
        imageCount: event.imageCount,
        usedVariations: event.usedVariations
      }

    case 'error':
      console.error(`[API] Event: error - ${event.error}`)
      return { type: 'error', error: event.error }

    default:
      return { type: 'unknown' }
  }
}

// Keep utility function for word counting
function countWords(html: string): number {
  return html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter((w) => w.length > 0).length
}
