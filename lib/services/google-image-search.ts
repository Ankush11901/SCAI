/**
 * Google Custom Search API Integration for Product Reference Images
 * 
 * Uses Google Custom Search JSON API to find high-quality product images
 * that can be used as references for AI image generation.
 * 
 * Setup:
 * 1. Create a Custom Search Engine at https://programmablesearchengine.google.com/
 * 2. Enable "Image search" in the CSE settings
 * 3. Enable "Search the entire web"
 * 4. Get API key from Google Cloud Console
 * 5. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID in .env.local
 */

import { GoogleGenAI } from "@google/genai"

// Initialize the Google Gen AI client for image verification
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const genai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
})

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GoogleImageResult {
  url: string
  thumbnailUrl: string
  width: number
  height: number
  title: string
  contextLink: string // Source page URL
}

export interface ImageSearchResult {
  success: boolean
  images: GoogleImageResult[]
  query: string
  error?: string
}

export interface ImageVerificationResult {
  isCorrectProduct: boolean
  confidence: number
  reason: string
  detectedProduct?: string
}

interface CSEImageItem {
  link: string
  image: {
    contextLink: string
    height: number
    width: number
    thumbnailLink: string
  }
  title: string
}

interface CSEResponse {
  items?: CSEImageItem[]
  error?: {
    message: string
    code: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory cache for image search results
const imageSearchCache = new Map<string, { result: ImageSearchResult; timestamp: number }>()
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hour TTL for image searches

/**
 * Generate a cache key from search query
 */
function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, '-')
}

/**
 * Check if we have a valid cached result
 */
function getCachedResult(query: string): ImageSearchResult | null {
  const key = getCacheKey(query)
  const cached = imageSearchCache.get(key)

  if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL) {
    console.log(`[GoogleImageSearch] Cache hit for: ${query}`)
    return cached.result
  }

  return null
}

/**
 * Store result in cache
 */
function setCachedResult(query: string, result: ImageSearchResult): void {
  const key = getCacheKey(query)
  imageSearchCache.set(key, { result, timestamp: Date.now() })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search for product images using Google Custom Search API
 * 
 * @param query - The product search query (e.g., "iPhone 15 Pro Max")
 * @param numResults - Number of results to fetch (max 10 per API call)
 * @returns ImageSearchResult with array of image URLs and metadata
 */
export async function searchProductImages(
  query: string,
  numResults: number = 5
): Promise<ImageSearchResult> {
  // Check cache first
  const cached = getCachedResult(query)
  if (cached) {
    return cached
  }

  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const searchEngineId = process.env.GOOGLE_CSE_ID

  // Validate environment variables
  if (!apiKey || !searchEngineId) {
    console.warn('[GoogleImageSearch] Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID')
    return {
      success: false,
      images: [],
      query,
      error: 'Google Custom Search API not configured'
    }
  }

  try {
    // Build search URL with image-specific parameters
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: `${query} product photo official`, // Optimize for official product images
      searchType: 'image',
      num: Math.min(numResults, 10).toString(), // API max is 10
      imgSize: 'large', // Prefer high-resolution images
      imgType: 'photo', // Photo type (not clipart/line art)
      safe: 'active', // Safe search
      rights: 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial', // Prefer licensed images
    })

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`

    console.log(`[GoogleImageSearch] Searching for: ${query}`)

    const response = await fetch(url)
    const data = await response.json() as CSEResponse

    if (data.error) {
      console.error('[GoogleImageSearch] API error:', data.error.message)
      return {
        success: false,
        images: [],
        query,
        error: data.error.message
      }
    }

    if (!data.items || data.items.length === 0) {
      console.log('[GoogleImageSearch] No images found')
      const result: ImageSearchResult = {
        success: true,
        images: [],
        query
      }
      setCachedResult(query, result)
      return result
    }

    // Transform API response to our format
    const images: GoogleImageResult[] = data.items.map(item => ({
      url: item.link,
      thumbnailUrl: item.image.thumbnailLink,
      width: item.image.width,
      height: item.image.height,
      title: item.title,
      contextLink: item.image.contextLink
    }))

    console.log(`[GoogleImageSearch] Found ${images.length} images for: ${query}`)

    const result: ImageSearchResult = {
      success: true,
      images,
      query
    }

    // Cache the result
    setCachedResult(query, result)

    return result
  } catch (error) {
    console.error('[GoogleImageSearch] Search failed:', error)
    return {
      success: false,
      images: [],
      query,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get the best product reference image from search results
 * Prefers larger images with better aspect ratios for product shots
 * 
 * @param query - Product search query
 * @returns The best image URL or null if none found
 */
export async function getBestProductImage(query: string): Promise<GoogleImageResult | null> {
  const result = await searchProductImages(query, 5)

  if (!result.success || result.images.length === 0) {
    return null
  }

  // Score and rank images by quality indicators
  const scoredImages = result.images.map(img => {
    let score = 0

    // Prefer larger images (more detail for reference)
    if (img.width >= 1000) score += 3
    else if (img.width >= 500) score += 2
    else if (img.width >= 300) score += 1

    // Prefer images from official/trusted sources
    const trustedDomains = ['amazon.com', 'apple.com', 'samsung.com', 'microsoft.com', 'google.com', 'bestbuy.com', 'target.com', 'walmart.com']
    if (trustedDomains.some(domain => img.contextLink.includes(domain))) {
      score += 5
    }

    // Prefer square-ish aspect ratios (typical product shots)
    const aspectRatio = img.width / img.height
    if (aspectRatio >= 0.8 && aspectRatio <= 1.25) score += 2

    // Penalize very wide or very tall images
    if (aspectRatio < 0.5 || aspectRatio > 2) score -= 2

    return { image: img, score }
  })

  // Sort by score descending
  scoredImages.sort((a, b) => b.score - a.score)

  return scoredImages[0]?.image || null
}

/**
 * Fetch an image and convert to base64 for Gemini API
 * 
 * @param imageUrl - URL of the image to fetch
 * @returns Base64 encoded image and mime type, or null if fetch fails
 */
export async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Some servers require a user agent
        'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)'
      }
    })

    if (!response.ok) {
      console.warn(`[GoogleImageSearch] Failed to fetch image: ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/jpeg'

    return { base64, mimeType }
  } catch (error) {
    console.error('[GoogleImageSearch] Failed to fetch image:', error)
    return null
  }
}

/**
 * Search for and fetch the best product reference image as base64
 * Combines search + fetch in one convenient function
 * 
 * @param productQuery - Product search query
 * @returns Base64 image data ready for Gemini, or null if not found
 */
export async function getProductReferenceImage(
  productQuery: string
): Promise<{ base64: string; mimeType: string; sourceUrl: string; width: number; height: number } | null> {
  const bestImage = await getBestProductImage(productQuery)

  if (!bestImage) {
    console.log(`[GoogleImageSearch] No product image found for: ${productQuery}`)
    return null
  }

  const imageData = await fetchImageAsBase64(bestImage.url)

  if (!imageData) {
    // Try thumbnail as fallback
    console.log('[GoogleImageSearch] Trying thumbnail as fallback...')
    const thumbnailData = await fetchImageAsBase64(bestImage.thumbnailUrl)

    if (thumbnailData) {
      return {
        ...thumbnailData,
        sourceUrl: bestImage.url,
        width: bestImage.width,
        height: bestImage.height
      }
    }

    return null
  }

  return {
    ...imageData,
    sourceUrl: bestImage.url,
    width: bestImage.width,
    height: bestImage.height
  }
}

/**
 * Clear the image search cache (useful for testing)
 */
export function clearImageSearchCache(): void {
  imageSearchCache.clear()
  console.log('[GoogleImageSearch] Cache cleared')
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE CONTENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that a fetched image actually shows the expected product.
 * Uses Gemini Vision to analyze the image content and confirm it matches.
 * 
 * This prevents the "guitar for PS5" problem where Google returns
 * an image with the right filename/metadata but wrong content.
 * 
 * @param imageBase64 - Base64 encoded image to verify
 * @param mimeType - MIME type of the image
 * @param expectedProduct - The product name we expect to see (e.g., "PlayStation 5")
 * @returns Verification result with confidence and reason
 */
export async function verifyProductImage(
  imageBase64: string,
  mimeType: string,
  expectedProduct: string
): Promise<ImageVerificationResult> {
  if (!GEMINI_API_KEY) {
    console.warn('[ImageVerification] No Gemini API key, skipping verification')
    return {
      isCorrectProduct: true, // Assume correct if we can't verify
      confidence: 0,
      reason: 'Verification skipped - no API key'
    }
  }

  try {
    console.log(`[ImageVerification] 🔍 Starting verification...`)
    console.log(`[ImageVerification]   Expected product: "${expectedProduct}"`)
    console.log(`[ImageVerification]   Sending image to Gemini Vision for analysis...`)

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash", // Fast model for quick verification
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a product identification expert. Analyze this image and determine if it shows the following product:

EXPECTED PRODUCT: "${expectedProduct}"

TASK: Determine if this image actually shows the expected product.

RESPOND WITH ONLY A JSON OBJECT (no markdown, no explanation):
{
  "isCorrectProduct": true/false,
  "confidence": 0.0-1.0,
  "detectedProduct": "what the image actually shows",
  "reason": "brief explanation"
}

GUIDELINES:
- isCorrectProduct: true ONLY if the image clearly shows the expected product
- confidence: 0.9+ for clear matches, 0.7-0.9 for likely matches, below 0.7 for uncertain
- detectedProduct: describe what you actually see in the image
- Common false positives to watch for:
  * Wrong product with similar name
  * Accessories instead of main product
  * Competitor products
  * Random unrelated items that got indexed with wrong metadata
  * Guitars/instruments appearing for tech products`
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ["TEXT"],
        temperature: 0.1, // Low temperature for consistent results
      }
    })

    const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Parse the JSON response
    let cleanedResponse = textResponse.trim()
    if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7)
    if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3)
    if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3)
    cleanedResponse = cleanedResponse.trim()

    const result = JSON.parse(cleanedResponse) as ImageVerificationResult

    console.log(`[ImageVerification] Result: ${result.isCorrectProduct ? '✅ VERIFIED' : '❌ REJECTED'}`)
    console.log(`[ImageVerification]   Confidence: ${result.confidence}`)
    console.log(`[ImageVerification]   Detected: "${result.detectedProduct}"`)
    console.log(`[ImageVerification]   Reason: ${result.reason}`)

    return result
  } catch (error) {
    console.error('[ImageVerification] Verification failed:', error)
    // On error, be conservative - reject the image
    return {
      isCorrectProduct: false,
      confidence: 0,
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get a verified product reference image.
 * Searches for the product image, verifies it's correct, and returns it.
 * If verification fails, tries the next best image up to maxAttempts times.
 * 
 * @param productQuery - Product search query
 * @param maxAttempts - Maximum images to try before giving up (default: 3)
 * @returns Verified base64 image data, or null if none found/verified
 */
export async function getVerifiedProductReferenceImage(
  productQuery: string,
  maxAttempts: number = 3
): Promise<{ base64: string; mimeType: string; sourceUrl: string; width: number; height: number } | null> {
  // Get search results
  const searchResult = await searchProductImages(productQuery, maxAttempts + 2) // Get a few extra

  if (!searchResult.success || searchResult.images.length === 0) {
    console.log(`[GoogleImageSearch] No images found for: ${productQuery}`)
    return null
  }

  // Score images like getBestProductImage does
  const scoredImages = searchResult.images.map(img => {
    let score = 0
    if (img.width >= 1000) score += 3
    else if (img.width >= 500) score += 2
    else if (img.width >= 300) score += 1

    const trustedDomains = ['amazon.com', 'apple.com', 'samsung.com', 'microsoft.com', 'google.com', 'bestbuy.com', 'target.com', 'walmart.com', 'sony.com', 'playstation.com']
    if (trustedDomains.some(domain => img.contextLink.includes(domain))) {
      score += 5
    }

    const aspectRatio = img.width / img.height
    if (aspectRatio >= 0.8 && aspectRatio <= 1.25) score += 2
    if (aspectRatio < 0.5 || aspectRatio > 2) score -= 2

    return { image: img, score }
  })

  // Sort by score descending
  scoredImages.sort((a, b) => b.score - a.score)

  console.log(`[GoogleImageSearch] 🔎 Starting verified image search for: "${productQuery}"`)
  console.log(`[GoogleImageSearch]   Found ${scoredImages.length} candidate images, will try up to ${maxAttempts}`)

  // Try each image until we find a verified one
  for (let i = 0; i < Math.min(maxAttempts, scoredImages.length); i++) {
    const candidate = scoredImages[i].image
    console.log(`[GoogleImageSearch] ─────────────────────────────────────────`)
    console.log(`[GoogleImageSearch] 📷 Candidate ${i + 1}/${maxAttempts}`)
    console.log(`[GoogleImageSearch]   URL: ${candidate.url.substring(0, 80)}...`)
    console.log(`[GoogleImageSearch]   Source: ${candidate.contextLink.substring(0, 60)}...`)
    console.log(`[GoogleImageSearch]   Size: ${candidate.width}x${candidate.height}`)

    // Fetch the image
    console.log(`[GoogleImageSearch]   Fetching image...`)
    const imageData = await fetchImageAsBase64(candidate.url)
    if (!imageData) {
      console.log(`[GoogleImageSearch]   ⚠️ Failed to fetch, trying next candidate...`)
      continue
    }
    console.log(`[GoogleImageSearch]   ✓ Image fetched (${Math.round(imageData.base64.length / 1024)}KB)`)

    // Verify the image content
    console.log(`[GoogleImageSearch]   🔍 Verifying image content with Gemini Vision...`)
    const verification = await verifyProductImage(
      imageData.base64,
      imageData.mimeType,
      productQuery
    )

    if (verification.isCorrectProduct && verification.confidence >= 0.7) {
      console.log(`[GoogleImageSearch] ─────────────────────────────────────────`)
      console.log(`[GoogleImageSearch] ✅ VERIFIED! Image ${i + 1} confirmed as "${productQuery}"`)
      console.log(`[GoogleImageSearch]   Confidence: ${(verification.confidence * 100).toFixed(0)}%`)
      console.log(`[GoogleImageSearch]   Detected: ${verification.detectedProduct}`)
      return {
        ...imageData,
        sourceUrl: candidate.url,
        width: candidate.width,
        height: candidate.height
      }
    } else {
      console.log(`[GoogleImageSearch]   ❌ REJECTED: ${verification.reason}`)
      console.log(`[GoogleImageSearch]   Detected instead: ${verification.detectedProduct || 'unknown'}`)
      console.log(`[GoogleImageSearch]   Confidence: ${(verification.confidence * 100).toFixed(0)}%`)
    }
  }

  console.log(`[GoogleImageSearch] ─────────────────────────────────────────`)
  console.log(`[GoogleImageSearch] ⚠️ No verified image found after ${maxAttempts} attempts`)
  console.log(`[GoogleImageSearch]   Falling back to text-only generation`)
  return null
}