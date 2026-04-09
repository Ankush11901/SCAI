/**
 * Product Image Generator
 *
 * Takes existing product images (e.g., from Amazon) and uses Gemini
 * to transform them into clean product mockup images.
 *
 * Features:
 * - Clean white/neutral backgrounds
 * - Professional product photography style
 * - Removes cluttered backgrounds from source images
 * - Cleans up verbose Amazon product names (via AI SDK with fallback)
 */

import { GoogleGenAI } from "@google/genai"
import { generateText } from 'ai'
import { executeWithFallback } from '@/lib/ai/providers'
import { logAiUsageAsync, type CostTrackingContext } from './cost-tracking-service'
import { generateFluxImage } from './flux-image-generator'
import type { ImageProvider } from './imagen'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Initialize the Google Gen AI client (for image generation only)
const genai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
})

const IMAGE_MODEL = 'gemini-3-pro-image-preview'
const FLASH_MODEL = 'gemini-2.0-flash'

// In-memory caches
const productNameCache = new Map<string, string>()
const productDescriptionCache = new Map<string, string>()

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT NAME CLEANUP (AI-POWERED)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean up verbose Amazon product names using AI SDK with fallback
 */
export async function cleanProductName(name: string, costTracking?: CostTrackingContext): Promise<string> {
  if (!name) return name

  // Check cache first
  const cached = productNameCache.get(name)
  if (cached) {
    return cached
  }

  try {
    const { result: response } = await executeWithFallback(
      async (model) => {
        return generateText({
          model,
          prompt: `Extract the clean product name from this Amazon listing. Return ONLY the brand + model + product type (max 50 chars).
Rules:
1. No colors (Black, Blue, etc.)
2. No specs (128GB, 4000Pa, etc.)
3. No features (Wireless, Bluetooth, etc. unless part of model name)
4. No "Pack of", "Count", "New Version"
5. Fix capitalization (Title Case)

Input: "${name}"

Output:`,
          temperature: 0,
          maxOutputTokens: 50,
        })
      },
      {
        operationName: 'cleanProductName',
        tier: 'fast',
        maxRetries: 3,
        costTracking,
      }
    )

    const cleaned = response.text?.trim() || ''

    // Validate response
    if (cleaned && cleaned.length > 5 && cleaned.length < 80 && !cleaned.includes('\n')) {
      productNameCache.set(name, cleaned)
      return cleaned
    }
  } catch (error: any) {
    console.error(`[ProductImageGenerator] Name cleaning failed:`, error.message)
  }

  // Fallback after failure
  const fallback = cleanProductNameFallback(name)
  productNameCache.set(name, fallback)
  return fallback
}

/**
 * Simple regex-based fallback for name cleaning (used when AI unavailable)
 */
function cleanProductNameFallback(name: string, maxLength: number = 60): string {
  if (!name) return name

  let clean = name

  // Remove trailing SKU codes
  clean = clean.replace(/\s+[A-Z0-9]{6,}$/i, '')

  // Remove parenthetical content
  clean = clean.replace(/\s*\([^)]*\)/g, '')

  // Remove trailing color words
  clean = clean.replace(/,?\s*(Black|White|Silver|Gray|Grey|Blue|Red|Gold|Pink|Green|Brown)$/i, '')

  // Remove "Pack of X", "Count", "New Version"
  clean = clean.replace(/\b(Pack of \d+|Count|New Version|Upgraded)\b/gi, '')

  // Remove common specs
  clean = clean.replace(/\b\d+(?:GB|TB|MB|Hz|Watts|Pa|mAh)\b/gi, '')

  // Cut at first " - " delimiter
  const dashIndex = clean.indexOf(' - ')
  if (dashIndex >= 15) {
    clean = clean.substring(0, dashIndex)
  }

  // Remove "with..." and "for..." 
  clean = clean.replace(/\s+with\s+.+$/i, '')
  clean = clean.replace(/\s+for\s+.+$/i, '')

  // Clean up whitespace
  clean = clean.replace(/\s+/g, ' ').trim()
  
  // Fix ALL CAPS if mostly caps (simple heuristic: > 70% uppercase)
  const upperCount = clean.replace(/[^A-Z]/g, '').length
  if (clean.length > 5 && upperCount / clean.length > 0.7) {
    clean = clean.replace(
      /\w\S*/g,
      text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    )
  }

  if (clean.length > maxLength) {
    const truncated = clean.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    clean = lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated
  }

  return clean
}

// ═══════════════════════════════════════════════════════════════════════════════// PRODUCT DESCRIPTION GENERATION (AI-POWERED)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a natural product description from feature bullets using Gemini Flash
 * Includes retry logic for rate limits
 */
export async function generateProductDescription(
  productName: string,
  features: string[],
  costTracking?: CostTrackingContext
): Promise<string> {
  if (!features || features.length === 0) {
    return `High-quality ${productName} with excellent features.`
  }

  // Create cache key from product name + feature count + first feature hash
  const cacheKey = `${productName}:${features.length}:${features[0].substring(0, 20)}`
  const cached = productDescriptionCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Fallback if no API key
  if (!GEMINI_API_KEY) {
    return generateDescriptionFallback(features)
  }

  // Initialize client with runtime API key if needed (for fallback support)
  const apiKey = GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const client = apiKey !== GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: apiKey! })
    : genai

  const maxRetries = 3
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Take up to 3 features (shorter = better quality)
      const featureList = features.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join('\n')

      const response = await client.models.generateContent({
        model: FLASH_MODEL,
        contents: [{
          role: "user",
          parts: [{
            text: `You are a professional copywriter. Transform these product features into a natural, flowing description.

Product: ${productName}
Features:
${featureList}

Requirements:
- Write in complete sentences with proper grammar
- Make it sound natural, like a human wrote it
- Combine related features smoothly
- Maximum 180 characters
- Be conversational and engaging

Natural description:` }]
        }],
        config: {
          responseModalities: ["TEXT"],
          temperature: 0.8,
          maxOutputTokens: 80,
        }
      })

      const description = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

      // Log cost tracking for direct Gemini API call
      if (costTracking && description) {
        const usage = (response as any).usageMetadata
        logAiUsageAsync({
          historyId: costTracking.historyId,
          userId: costTracking.userId,
          bulkJobId: costTracking.bulkJobId,
          provider: 'gemini',
          modelId: FLASH_MODEL,
          operationType: 'text',
          operationName: 'generateProductDescription',
          inputTokens: usage?.promptTokenCount || 0,
          outputTokens: usage?.candidatesTokenCount || 0,
          success: true,
        })
      }

      // Validate response
      if (description && description.length > 20 && description.length <= 250) {
        productDescriptionCache.set(cacheKey, description)
        return description
      }

      // If valid response but weak, maybe break?
      break

    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429')
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`[ProductImageGenerator] Rate limited (429) generating description, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      console.error(`[ProductImageGenerator] Description generation failed (attempt ${attempt}):`, error.message)
      if (attempt === maxRetries) break
    }
  }

  // Fallback after retries
  const fallback = generateDescriptionFallback(features)
  productDescriptionCache.set(cacheKey, fallback)
  return fallback
}

/**
 * Smart fallback description generator
 * Concatenates features but respects sentence boundaries to avoid mid-sentence cuts
 */
function generateDescriptionFallback(features: string[]): string {
  if (!features || features.length === 0) return ''

  // Take first 1-2 features
  let text = features[0].trim()
  if (text.length < 100 && features.length > 1) {
    const second = features[1].trim()
    // Add period if missing
    if (!text.endsWith('.') && !text.endsWith('!')) text += '.'
    text += ' ' + second
  }

  // Ensure strict length limit
  const MAX_LEN = 200
  if (text.length <= MAX_LEN) return text

  // Smart truncation: cut at the last sentence boundary within limit
  const truncated = text.substring(0, MAX_LEN)
  
  // Try to find the last period, exclamation, or question mark
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )

  if (lastPunctuation > 50) {
    // If we found a good sentence end, use it
    return truncated.substring(0, lastPunctuation + 1)
  }

  // Fallback: Cut at last space and add ellipsis if no punctuation found
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 50 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

// ═══════════════════════════════════════════════════════════════════════════════// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductImageRequest {
  productName: string
  sourceImageUrl: string  // The original Amazon product image URL
  productCategory?: string
  index: number
  costTracking?: CostTrackingContext
  /** Image provider to use: 'gemini' (default) or 'flux' */
  imageProvider?: ImageProvider
}

interface ProductImageResult {
  success: boolean
  imageUrl?: string  // Base64 data URL of transformed image
  error?: string
}

/**
 * Fetch an image from URL and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log(`[ProductImageGenerator] Fetching image from: ${imageUrl}`)

    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`[ProductImageGenerator] Failed to fetch image: ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determine mime type
    let mimeType = 'image/jpeg'
    if (contentType.includes('png')) mimeType = 'image/png'
    else if (contentType.includes('webp')) mimeType = 'image/webp'
    else if (contentType.includes('gif')) mimeType = 'image/gif'

    console.log(`[ProductImageGenerator] Image fetched, size: ${base64.length} chars, type: ${mimeType}`)
    return { base64, mimeType }
  } catch (error) {
    console.error(`[ProductImageGenerator] Error fetching image:`, error)
    return null
  }
}

/**
 * Transform an existing product image into a clean mockup using Gemini
 */
export async function generateProductImage(request: ProductImageRequest): Promise<ProductImageResult> {
  const useFlux = request.imageProvider === 'flux'

  if (!useFlux && !GEMINI_API_KEY) {
    console.log('[ProductImageGenerator] No API key, using original image')
    return { success: false, error: 'No API key available' }
  }

  if (!request.sourceImageUrl) {
    console.log('[ProductImageGenerator] No source image URL provided')
    return { success: false, error: 'No source image URL' }
  }

  const maxRetries = 2
  let lastError: string | null = null

  try {
    // Step 1: Fetch the source image and convert to base64
    const imageData = await fetchImageAsBase64(request.sourceImageUrl)
    if (!imageData) {
      return { success: false, error: 'Failed to fetch source image' }
    }

    // Step 2: Clean the product name and build the transformation prompt
    const cleanedName = await cleanProductName(request.productName, request.costTracking)
    const prompt = buildTransformPrompt(cleanedName, request.productCategory)

    console.log(`[ProductImageGenerator] Transforming image for: ${cleanedName}`)
    console.log(`[ProductImageGenerator] Provider: ${useFlux ? 'Flux 2 Edit' : 'Gemini'}`)
    if (cleanedName !== request.productName) {
      console.log(`[ProductImageGenerator] (cleaned from: ${request.productName.substring(0, 50)}...)`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLUX 2 EDIT PATH: Use Flux 2 Edit with source image as reference
    // ─────────────────────────────────────────────────────────────────────────
    if (useFlux) {
      console.log(`[ProductImageGenerator] Using Flux 2 Edit for product card image...`)

      try {
        const fluxResult = await generateFluxImage({
          prompt,
          aspectRatio: '1:1', // Square for product cards
          maxRetries,
          costTracking: request.costTracking,
          imageType: 'product',
          articleType: 'affiliate',
          // Pass the source image as reference for Flux 2 Edit
          referenceImageBase64: imageData.base64,
          referenceImageMimeType: imageData.mimeType,
          productName: cleanedName,
        })

        // Check if we got a real image or a placeholder
        if (fluxResult.base64 && fluxResult.url.startsWith('data:')) {
          console.log(`[ProductImageGenerator] ✅ Flux 2 Edit product image generated for: ${cleanedName}`)
          return {
            success: true,
            imageUrl: fluxResult.url,
          }
        } else {
          console.warn(`[ProductImageGenerator] Flux 2 Edit returned placeholder, failing...`)
          return { success: false, error: 'Flux returned placeholder image' }
        }
      } catch (error) {
        console.error(`[ProductImageGenerator] Flux 2 Edit failed:`, error)
        return { success: false, error: String(error) }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI PATH: Call Gemini API with retries (matching imagen.ts pattern)
    // ─────────────────────────────────────────────────────────────────────────
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ProductImageGenerator] Attempt ${attempt}/${maxRetries}...`)

        // Using same pattern as imagen.ts - TEXT FIRST, then IMAGE for image editing
        // MUST include both TEXT and IMAGE in responseModalities for image editing to work
        const response = await genai.models.generateContent({
          model: IMAGE_MODEL,
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageData.mimeType,
                  data: imageData.base64
                }
              }
            ]
          }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],  // Both required for image editing mode
            imageConfig: {
              aspectRatio: "1:1",  // Square for product cards
              imageSize: "2K",    // High quality output
            }
          }
        })

        // Extract image from response
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const base64 = part.inlineData.data
              const mimeType = part.inlineData.mimeType || "image/png"

              // Validate base64
              const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(base64)
              if (!isValidBase64 || base64.length < 100) {
                console.error(`[ProductImageGenerator] Invalid base64 data on attempt ${attempt}`)
                lastError = 'Invalid base64 data'
                continue
              }

              console.log(`[ProductImageGenerator] Successfully transformed image for: ${request.productName}`)

              // Log cost tracking for product image transformation
              if (request.costTracking) {
                logAiUsageAsync({
                  historyId: request.costTracking.historyId,
                  userId: request.costTracking.userId,
                  bulkJobId: request.costTracking.bulkJobId,
                  provider: 'gemini',
                  modelId: IMAGE_MODEL,
                  operationType: 'image',
                  operationName: 'transformProductImage',
                  imageCount: 1,
                  success: true,
                })
              }

              return {
                success: true,
                imageUrl: `data:${mimeType};base64,${base64}`
              }
            }
          }
        }

        console.log(`[ProductImageGenerator] No image in response on attempt ${attempt}`)
        lastError = 'No image in response'
      } catch (error) {
        console.error(`[ProductImageGenerator] Attempt ${attempt} failed:`, error)
        lastError = String(error)
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    console.log(`[ProductImageGenerator] All ${maxRetries} attempts failed`)
    return { success: false, error: lastError || 'All attempts failed' }

  } catch (error) {
    console.error('[ProductImageGenerator] Error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Build the transformation prompt for Gemini
 * Uses structured prompt format similar to imagen.ts for better results
 */
function buildTransformPrompt(productName: string, productCategory?: string): string {
  return `PRODUCT REFERENCE IMAGE: [attached above - this is the product to transform]

═══════════════════════════════════════════════════════════════════════════════
PRODUCT IMAGE TRANSFORMATION TASK
═══════════════════════════════════════════════════════════════════════════════

Product: ${productName}
${productCategory ? `Category: ${productCategory}` : ''}

YOUR TASK: Transform this product image into a clean, professional e-commerce product photo.

═══════════════════════════════════════════════════════════════════════════════
REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

BACKGROUND:
- Replace with a clean, pure white background (#FFFFFF)
- No gradients, patterns, or distractions

PRODUCT:
- Keep the product EXACTLY as it appears in the reference
- Do NOT modify, redesign, or reimagine the product
- Maintain original colors, textures, and all details
- Preserve the exact proportions and design

COMPOSITION:
- Center the product in the frame
- Product should fill approximately 70-80% of the image
- Professional studio lighting with soft, even illumination
- Add subtle, realistic shadow beneath the product for depth

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

✅ DO:
- Match the EXACT product from the reference image
- Create clean, professional lighting
- Keep the pure white background
- Make the image look like high-end product photography
- Preserve all text, logos, brand names, and labels that are part of the product's original design

❌ DO NOT:
- Change any aspect of the product's appearance
- Include humans, hands, or body parts
- Add any NEW text, watermarks, or overlays not present in the original image
- Remove, obscure, blur, or cover up any text, logos, or labels that are part of the product itself
- Add props or other objects
- Generate a different version of the product

Output a single clean product photo suitable for an e-commerce website or blog article.
Professional 2K quality, square aspect ratio (1:1).`
}

/**
 * Check if product image generation is available
 */
export function isProductImageGenerationAvailable(): boolean {
  return !!GEMINI_API_KEY
}
