/**
 * Flux 2 Image Generation Service (via fal.ai)
 *
 * Generates images using Flux 2 models through fal.ai's serverless GPU inference.
 * This service mirrors the interface of the Gemini image generation path,
 * returning ImageGenerationResult with base64 data for R2 upload.
 *
 * Features:
 * - Flux 2 Dev (text-to-image) for standard generation via fal-ai/flux-2
 * - Flux 2 Edit (image-to-image) for product reference editing via fal-ai/flux-2/edit
 * - Product reference image support: passes real product photos to Flux 2 Edit
 *   for accurate product rendering (same capability as Gemini's image editing)
 * - Aspect ratio mapping from Gemini format to fal.ai format
 * - Automatic download and base64 conversion of generated images
 * - Retry logic with exponential backoff
 * - Cost tracking integration
 *
 * @see https://fal.ai/models/fal-ai/flux-2 (text-to-image)
 * @see https://fal.ai/models/fal-ai/flux-2/edit (image-to-image editing)
 */

import { fal } from "@fal-ai/client"
import type { ImageGenerationResult } from "./imagen"
import { logAiUsageAsync, type CostTrackingContext } from "./cost-tracking-service"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FAL_KEY = process.env.FAL_KEY

// Configure fal client with API key
if (FAL_KEY) {
  fal.config({
    credentials: FAL_KEY,
  })
}

/** Flux 2 Dev: text-to-image generation (standard images without reference) */
const FLUX_TEXT_TO_IMAGE_MODEL = "fal-ai/flux-2" as const

/** Flux 2 Edit: image-to-image editing (product references, modifications) */
const FLUX_EDIT_MODEL = "fal-ai/flux-2/edit" as const

/** Model ID for cost tracking (text-to-image) */
const FLUX_MODEL_ID = "flux-2"

/** Model ID for cost tracking (image-to-image edit) */
const FLUX_EDIT_MODEL_ID = "flux-2-edit"

// ═══════════════════════════════════════════════════════════════════════════════
// ASPECT RATIO MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid Gemini aspect ratios (from imagen.ts)
 */
type GeminiAspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"

/**
 * fal.ai Flux Dev supports image_size as either a preset string or { width, height }
 * We map Gemini aspect ratios to explicit dimensions for consistency
 */
interface FluxImageSize {
  width: number
  height: number
}

/**
 * Map Gemini aspect ratios to Flux Dev dimensions
 * Flux Dev supports arbitrary dimensions (multiples of 8)
 * We target ~1 megapixel images (matching Flux Dev's sweet spot)
 */
const ASPECT_RATIO_TO_FLUX_SIZE: Record<GeminiAspectRatio, FluxImageSize> = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 832, height: 1248 },
  "3:2": { width: 1248, height: 832 },
  "3:4": { width: 896, height: 1184 },
  "4:3": { width: 1184, height: 896 },
  "4:5": { width: 912, height: 1136 },
  "5:4": { width: 1136, height: 912 },
  "9:16": { width: 768, height: 1360 },
  "16:9": { width: 1360, height: 768 },
  "21:9": { width: 1456, height: 624 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FluxGenerationOptions {
  /** The text prompt for image generation */
  prompt: string
  /** Gemini-style aspect ratio (will be mapped to Flux dimensions) */
  aspectRatio?: GeminiAspectRatio
  /** Maximum retries on failure */
  maxRetries?: number
  /** Cost tracking context */
  costTracking?: CostTrackingContext
  /** Image type for logging */
  imageType?: string
  /** Article type for logging */
  articleType?: string
  /**
   * Product reference image URLs for image-to-image editing.
   * When provided, Flux 2 Edit endpoint is used instead of Flux 2 Dev.
   * Supports public URLs or data URIs (data:image/png;base64,...).
   * Maximum 4 images per the Flux 2 Edit API.
   */
  imageUrls?: string[]
  /**
   * Product reference as base64 data (alternative to imageUrls).
   * Will be converted to a data URI and passed to Flux 2 Edit.
   */
  referenceImageBase64?: string
  /** MIME type for the reference image base64 data */
  referenceImageMimeType?: string
  /** Product name for logging when using reference images */
  productName?: string
  /**
   * Intent for edit mode when reference images are provided:
   * - 'cleanup': Preserve the image, clean up background (product card photos)
   * - 'placement': Use reference as visual guide, generate a NEW scene with the product in it (H2/section images)
   * Defaults to 'cleanup' for backwards compatibility.
   */
  editIntent?: 'cleanup' | 'placement'
}

/**
 * fal.ai Flux Dev response shape
 */
interface FalFluxResponse {
  images: Array<{
    url: string
    width: number
    height: number
    content_type?: string
  }>
  timings?: {
    inference?: number
  }
  seed?: number
  has_nsfw_concepts?: boolean[]
  prompt?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an image using Flux 2 via fal.ai
 *
 * Automatically selects the appropriate Flux 2 endpoint:
 * - Flux 2 Dev (text-to-image): Standard generation without reference images
 * - Flux 2 Edit (image-to-image): When product reference images are provided
 *
 * @param options - Generation options including prompt, aspect ratio, references, and tracking
 * @returns ImageGenerationResult with base64 data URL for R2 upload pipeline
 */
export async function generateFluxImage(
  options: FluxGenerationOptions
): Promise<ImageGenerationResult> {
  const {
    prompt,
    aspectRatio = "16:9",
    maxRetries = 3,
    costTracking,
    imageType,
    articleType,
    imageUrls,
    referenceImageBase64,
    referenceImageMimeType,
    productName,
    editIntent = 'cleanup',
  } = options

  const startTime = Date.now()

  if (!FAL_KEY) {
    console.warn("[FluxImageGen] FAL_KEY not set, using placeholder")
    return { url: getFluxPlaceholderUrl(prompt, aspectRatio) }
  }

  // Build reference image URLs list (from explicit URLs or base64 data)
  const referenceUrls: string[] = []
  if (imageUrls && imageUrls.length > 0) {
    referenceUrls.push(...imageUrls.slice(0, 4)) // Flux 2 Edit supports max 4 images
  }
  if (referenceImageBase64 && !referenceUrls.length) {
    // Convert base64 to data URI for fal.ai (they accept data URIs per their docs)
    const mime = referenceImageMimeType || 'image/png'
    referenceUrls.push(`data:${mime};base64,${referenceImageBase64}`)
  }

  // Select model based on whether we have reference images
  const useEditMode = referenceUrls.length > 0
  const modelId = useEditMode ? FLUX_EDIT_MODEL : FLUX_TEXT_TO_IMAGE_MODEL
  const modelLabel = useEditMode ? 'Flux 2 Edit (image-to-image)' : 'Flux 2 Dev (text-to-image)'

  if (useEditMode) {
    console.log(`[FluxImageGen] 🖼️ Product reference mode: Using ${modelLabel}`)
    console.log(`[FluxImageGen]   Reference images: ${referenceUrls.length}`)
    if (productName) {
      console.log(`[FluxImageGen]   Product: "${productName}"`)
    }
  }

  const imageSize = ASPECT_RATIO_TO_FLUX_SIZE[aspectRatio] || ASPECT_RATIO_TO_FLUX_SIZE["16:9"]
  let lastError: Error | null = null

  // Flux 2 Dev pays more attention to the START of the prompt.
  // Strip any trailing constraints from the incoming prompt (added by buildNarrativePrompt/imagen.ts)
  // and re-add them at the FRONT where Flux actually respects them.
  const strippedPrompt = prompt
    .replace(/=== CRITICAL CONSTRAINTS ===[\s\S]*$/i, '')
    .replace(/CRITICAL CONSTRAINTS:[\s\S]*$/i, '')
    .replace(/⚠️ ABSOLUTELY NO[\s\S]*$/i, '')
    .trim()

  // Different constraints based on mode:
  // - Text-to-image: strict no-text rules
  // - Edit/cleanup: preserve product text/logos, clean background
  // - Edit/placement: generate a NEW scene, use reference only as visual guide for the product
  let constraintsPrefix: string

  if (useEditMode && editIntent === 'placement') {
    // Scene placement: reference image is just a visual guide for the product's appearance.
    // Flux should generate a completely NEW scene/environment, NOT preserve the reference background.
    constraintsPrefix = `STRICT RULES — APPLY TO THE ENTIRE IMAGE:
1. GENERATE A COMPLETELY NEW SCENE as described in the prompt below. The reference image is ONLY a visual guide showing what the product looks like — do NOT copy-paste it into the scene, do NOT keep its white background or studio setting.
2. REPOSE AND ADAPT the product naturally for the scene. The reference shows the product's design, colors, and shape — but you MUST change its orientation, angle, and position so it looks natural in context. Never just drop the product in its reference pose — adjust it so it looks naturally placed.
3. ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, body parts, silhouettes, or shadows of humans.
4. DO NOT ADD new text, watermarks, or overlays. Preserve any existing text, logos, or labels that are part of the product's design.
5. Create a lifestyle scene — the product should look naturally placed in a real environment with correct lighting, shadows, perspective, and scale. It must look like a real photograph, not a composite.

---

`
  } else if (useEditMode) {
    // Product card cleanup: preserve the product exactly, clean up the background
    constraintsPrefix = `STRICT RULES — APPLY TO THE ENTIRE IMAGE:
1. DO NOT ADD new text, watermarks, or overlays. PRESERVE any existing text, logos, brand names, or labels on the product — they are part of the authentic product design.
2. ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, body parts, silhouettes, or shadows of humans.
3. NO UNRELATED OBJECTS: No earphones, AirPods, headphones, random electronics, or objects not explicitly described below.
4. Preserve screens EXACTLY as they appear in the reference image — do NOT replace, blank out, or alter screen content.
5. Products must retain their original surface details including all logos, labels, and brand markings. Do NOT alter, remove, or replace any part of the product.

---

`
  } else {
    // Text-to-image: strict no-text rules
    constraintsPrefix = `STRICT RULES — APPLY TO THE ENTIRE IMAGE:
1. ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, brand names, captions, UI elements, keyboard characters, or any form of writing on any surface or screen.
2. ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, body parts, silhouettes, or shadows of humans.
3. NO UNRELATED OBJECTS: No earphones, AirPods, headphones, random electronics, or objects not explicitly described below.
4. All screens must show only abstract colors or gradients — NEVER text, dashboards, or UI.
5. All bottles, appliances, and products must have completely blank surfaces — NO labels, NO brand markings.

---

`
  }

  const basePrompt = constraintsPrefix + strippedPrompt

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // On retry, add extra emphasis to avoid text/humans
      let promptForAttempt = basePrompt
      if (attempt > 1) {
        promptForAttempt = `IMPORTANT: Previous attempt included text or humans. Ensure ABSOLUTELY NO TEXT AND NO HUMANS.\n\n${basePrompt}`
      }

      console.log(`[FluxImageGen] Generating image (attempt ${attempt}/${maxRetries}) with ${modelLabel}...`)
      console.log(`[FluxImageGen] Dimensions: ${imageSize.width}x${imageSize.height}`)
      console.log(`[FluxImageGen] Prompt: ${promptForAttempt.substring(0, 100)}...`)

      // Build input payload based on mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputPayload: any = {
        prompt: promptForAttempt,
        image_size: imageSize,
        num_inference_steps: 28,
        guidance_scale: useEditMode ? (editIntent === 'placement' ? 5.5 : 2.5) : 3.5, // Placement needs higher guidance to push away from reference; cleanup stays conservative
        num_images: 1,
        enable_safety_checker: true,
        output_format: "png",
      }

      if (useEditMode) {
        // Flux 2 Edit: include reference images via image_urls
        inputPayload.image_urls = referenceUrls
      } else {
        // Flux 2 Dev: enable built-in prompt expansion for better results
        inputPayload.enable_prompt_expansion = true
      }

      // Call fal.ai with the selected model
      // Using type assertion because fal client has strict per-model generics
      const result = await fal.subscribe(modelId as string, {
        input: inputPayload,
        logs: false,
      }) as { data: FalFluxResponse; requestId: string }

      const response = result.data

      // Validate response
      if (!response.images || response.images.length === 0) {
        console.warn(`[FluxImageGen] No images in response on attempt ${attempt}`)
        lastError = new Error("No images in Flux response")
        continue
      }

      const image = response.images[0]

      // Check for NSFW content
      if (response.has_nsfw_concepts?.[0]) {
        console.warn(`[FluxImageGen] NSFW content detected on attempt ${attempt}, retrying...`)
        lastError = new Error("NSFW content detected")
        continue
      }

      // Download the image and convert to base64
      console.log(`[FluxImageGen] Downloading generated image from fal.ai...`)
      const imageData = await downloadImageAsBase64(image.url)

      if (!imageData) {
        console.warn(`[FluxImageGen] Failed to download image on attempt ${attempt}`)
        lastError = new Error("Failed to download generated image")
        continue
      }

      const durationMs = Date.now() - startTime

      console.log(`[FluxImageGen] ✅ Image generated successfully in ${durationMs}ms`)
      console.log(`[FluxImageGen]   - Model: ${modelLabel}`)
      console.log(`[FluxImageGen]   - Dimensions: ${image.width}x${image.height}`)
      console.log(`[FluxImageGen]   - Base64 length: ${imageData.base64.length}`)
      if (useEditMode && productName) {
        console.log(`[FluxImageGen]   - Product reference: "${productName}"`)
      }

      // Log cost tracking
      if (costTracking) {
        logAiUsageAsync({
          historyId: costTracking.historyId,
          userId: costTracking.userId,
          bulkJobId: costTracking.bulkJobId,
          provider: 'flux',
          modelId: useEditMode ? FLUX_EDIT_MODEL_ID : FLUX_MODEL_ID,
          operationType: 'image',
          operationName: useEditMode ? 'generateFluxEditImage' : 'generateFluxImage',
          imageCount: 1,
          durationMs,
          success: true,
          metadata: { imageType, articleType, attempt, aspectRatio, useEditMode, productName },
        })
      }

      return {
        url: `data:${imageData.mimeType};base64,${imageData.base64}`,
        base64: imageData.base64,
        mimeType: imageData.mimeType,
        width: image.width,
        height: image.height,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error(`[FluxImageGen] Generation failed on attempt ${attempt}:`, errorMessage)
      lastError = error instanceof Error ? error : new Error(errorMessage)

      // Log failed attempt cost tracking
      if (costTracking && attempt === maxRetries) {
        logAiUsageAsync({
          historyId: costTracking.historyId,
          userId: costTracking.userId,
          bulkJobId: costTracking.bulkJobId,
          provider: 'flux',
          modelId: useEditMode ? FLUX_EDIT_MODEL_ID : FLUX_MODEL_ID,
          operationType: 'image',
          operationName: useEditMode ? 'generateFluxEditImage' : 'generateFluxImage',
          imageCount: 0,
          durationMs: Date.now() - startTime,
          success: false,
          errorMessage,
          metadata: { imageType, articleType, attempt, aspectRatio, useEditMode, productName },
        })
      }
    }

    // Exponential backoff before retry
    if (attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt - 1)
      console.log(`[FluxImageGen] Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // All retries exhausted
  console.error(`[FluxImageGen] Image generation failed after ${maxRetries} attempts:`, lastError)
  return { url: getFluxPlaceholderUrl(prompt, aspectRatio) }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Download an image from URL and convert to base64
 */
async function downloadImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[FluxImageGen] Failed to download image: ${response.status} ${response.statusText}`)
      return null
    }

    const contentType = response.headers.get("content-type") || "image/png"
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")

    // Validate base64
    if (base64.length < 100) {
      console.error(`[FluxImageGen] Downloaded image too small: ${base64.length} chars`)
      return null
    }

    return { base64, mimeType: contentType }
  } catch (error) {
    console.error(`[FluxImageGen] Download error:`, error)
    return null
  }
}

/**
 * Generate a placeholder URL for when generation fails
 */
function getFluxPlaceholderUrl(prompt: string, aspectRatio: GeminiAspectRatio = "16:9"): string {
  const size = ASPECT_RATIO_TO_FLUX_SIZE[aspectRatio] || ASPECT_RATIO_TO_FLUX_SIZE["16:9"]
  const cleanPrompt = prompt
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .substring(0, 30)
    .trim()
    .replace(/\s+/g, "+")

  return `https://placehold.co/${size.width}x${size.height}/e5e7eb/6b7280?text=${cleanPrompt || "Image"}`
}
