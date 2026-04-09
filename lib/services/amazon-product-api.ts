/**
 * Amazon Product API Service
 * Uses RapidAPI's Real-Time Amazon Data API for fetching actual product information
 * 
 * API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
 * 
 * Strategy:
 * 1. Receive optimized search queries from product-inference.ts
 * 2. Search Amazon for each product category
 * 3. Filter by quality (rating, reviews)
 * 4. Return best product per category
 * 5. Fallback to alternate query if primary fails
 * 
 * Data used per documentation (COMPONENTS.md):
 * - Product image
 * - Product name/title  
 * - Rating (stars + review count)
 * - Price
 * - Amazon link (with affiliate tag)
 */

import type { ProductCategory } from './product-inference'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - Only fields needed per documentation
// ═══════════════════════════════════════════════════════════════════════════════

export interface AmazonProduct {
  asin: string
  title: string
  price: string
  rating: number
  reviewCount: number
  imageUrl: string
  productUrl: string
  badge: string // Badge assigned from product inference (may be overwritten by badge-service)
  searchQuery: string // The query that found this product
  description?: string // Product description from product-details endpoint
  features?: string[] // Bullet point features from about_product field
  aiSuggestedBadge?: string // AI's context-aware badge suggestion (e.g., "Best for Pet Hair")
}

interface RapidAPISearchResponse {
  status: string
  data: {
    products: Array<{
      asin: string
      product_title: string
      product_price: string | null
      product_star_rating: string | null
      product_num_ratings: number
      product_url: string
      product_photo: string
    }>
    total_products: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com'

// Quality thresholds for product filtering
const MIN_RATING = 3.5 // Minimum star rating
const MIN_REVIEWS = 10 // Minimum number of reviews (lowered for niche products)
const PREFERRED_REVIEWS = 50 // Preferred minimum for ranking

// Rate limit handling
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second initial backoff
const MAX_RETRY_DELAY_MS = 8000 // Max 8 seconds between retries

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT DETAILS - Fetch descriptions and features
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductDetailsResponse {
  status: string
  data: {
    asin: string
    product_title?: string
    product_description?: string
    about_product?: string[]
    product_details?: Record<string, string>
    [key: string]: any
  }
}

/**
 * Fetch detailed product information including description and features
 * 
 * @param asin - Amazon Standard Identification Number
 * @param apiKey - RapidAPI key
 * @returns Enriched product details or null if fetch fails
 */
async function fetchProductDetails(
  asin: string,
  apiKey: string
): Promise<{ description?: string; features?: string[] } | null> {
  try {
    const url = `https://${RAPIDAPI_HOST}/product-details?asin=${asin}&country=US`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      console.warn(`[AmazonAPI] Product details fetch failed for ${asin}: ${response.status}`)
      return null
    }

    const data: ProductDetailsResponse = await response.json()

    if (data.status !== 'OK' || !data.data) {
      return null
    }

    const details = data.data
    const result: { description?: string; features?: string[] } = {}

    // Extract description
    if (details.product_description && typeof details.product_description === 'string') {
      result.description = details.product_description.trim()
    }

    // Extract features from about_product array
    if (Array.isArray(details.about_product) && details.about_product.length > 0) {
      result.features = details.about_product
        .filter(f => typeof f === 'string' && f.trim().length > 0)
        .map(f => f.trim())
    }

    console.log(`[AmazonAPI] Enriched ${asin}: description=${!!result.description}, features=${result.features?.length || 0}`)

    return result

  } catch (error) {
    console.error(`[AmazonAPI] Error fetching details for ${asin}:`, error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARGETED SEARCH - One search per product category
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch Amazon product candidates for multiple categories
 * Returns top N candidates per category for validation
 * Does NOT enrich with details (save API calls for validated products)
 * 
 * @param categories - Product categories to search for
 * @param candidatesPerCategory - Number of candidates to fetch (default: 3)
 * @param affiliateTag - User's Amazon Associate Tag (optional)
 * @returns Array of candidate arrays (one array per category), aligned with input categories
 */
export async function fetchCandidatesFromCategories(
  categories: ProductCategory[],
  candidatesPerCategory: number = 3,
  affiliateTag?: string
): Promise<AmazonProduct[][]> {
  const apiKey = process.env.RAPIDAPI_KEY

  if (!apiKey) {
    console.log('[AmazonAPI] RAPIDAPI_KEY not set - returning empty candidates')
    return categories.map(() => [])
  }

  // Execute searches in parallel with concurrency limit
  const SEARCH_CONCURRENCY = 2
  const allCandidates: AmazonProduct[][] = new Array(categories.length).fill([])
  
  for (let i = 0; i < categories.length; i += SEARCH_CONCURRENCY) {
    const batchIndices = categories.slice(i, i + SEARCH_CONCURRENCY).map((_, idx) => i + idx)
    const promises = batchIndices.map(async (index) => {
      const category = categories[index]
      console.log(`[AmazonAPI] Searching for candidates "${category.badge}": ${category.searchQuery}`)

      // Try primary query first
      let candidates = await searchAndSelectCandidates(category.searchQuery, category.badge, apiKey, candidatesPerCategory)

      // If primary yields NO results, try alternate query immediately
      // (If it yields results but they are irrelevant, the caller will handle retry)
      if (candidates.length === 0 && category.alternateQuery) {
        console.log(`[AmazonAPI] Primary query yielded 0 results, trying alternate: ${category.alternateQuery}`)
        candidates = await searchAndSelectCandidates(category.alternateQuery, category.badge, apiKey, candidatesPerCategory)
      }
      
      return { index, candidates }
    })
    
    const results = await Promise.all(promises)
    
    for (const result of results) {
      // Append affiliate tag if provided
      if (affiliateTag) {
        result.candidates.forEach(p => {
          p.productUrl = generateAffiliateLink(p.productUrl, affiliateTag)
        })
      }
      allCandidates[result.index] = result.candidates
      console.log(`[AmazonAPI] Category ${result.index + 1}: Found ${result.candidates.length} candidates`)
    }
    
    // Small delay between batches to respect rate limits
    if (i + SEARCH_CONCURRENCY < categories.length) {
      await sleep(1000)
    }
  }

  return allCandidates
}

/**
 * Fetch Amazon products using targeted searches from product inference
 * 
 * @param categories - Product categories with optimized search queries
 * @param affiliateTag - User's Amazon Associate Tag (optional)
 * @returns Array of best products (one per category), or null if all fail
 */
export async function fetchProductsFromCategories(
  categories: ProductCategory[],
  affiliateTag?: string
): Promise<AmazonProduct[] | null> {
  const apiKey = process.env.RAPIDAPI_KEY

  if (!apiKey) {
    console.log('[AmazonAPI] RAPIDAPI_KEY not set - will use LLM-generated product cards')
    return null
  }

  const products: AmazonProduct[] = []

  // execute searches in parallel with a concurrency limit
  const SEARCH_CONCURRENCY = 2
  
  for (let i = 0; i < categories.length; i += SEARCH_CONCURRENCY) {
    const batch = categories.slice(i, i + SEARCH_CONCURRENCY)
    const promises = batch.map(async (category) => {
      console.log(`[AmazonAPI] Searching for "${category.badge}": ${category.searchQuery}`)

      // Try primary query first
      let product = await searchAndSelectBest(category.searchQuery, category.badge, apiKey)

      // If primary fails, try alternate query
      if (!product && category.alternateQuery) {
        console.log(`[AmazonAPI] Primary query failed, trying alternate: ${category.alternateQuery}`)
        product = await searchAndSelectBest(category.alternateQuery, category.badge, apiKey)
      }
      
      return product
    })
    
    const results = await Promise.all(promises)
    
    for (const product of results) {
      if (product) {
        // Append affiliate tag if provided
        if (affiliateTag) {
          product.productUrl = generateAffiliateLink(product.productUrl, affiliateTag)
        }
        products.push(product)
        console.log(`[AmazonAPI] Found: "${product.title.substring(0, 50)}..." (${product.rating}★, ${product.reviewCount} reviews)`)
      }
    }
    
    // Small delay between batches to respect rate limits
    if (i + SEARCH_CONCURRENCY < categories.length) {
      await sleep(1000)
    }
  }

  if (products.length === 0) {
    console.error('[AmazonAPI] No products found for any category')
    return null
  }

  console.log(`[AmazonAPI] Successfully found ${products.length}/${categories.length} products`)

  // Enrich products with descriptions and features in parallel
  await enrichProductsWithDetails(products, apiKey)

  return products
}

/**
 * Enrich products with descriptions and features from product-details endpoint
 * Uses parallel execution with concurrency control
 * 
 * @param products - Products from search
 * @param apiKey - RapidAPI key
 */
export async function enrichProductsWithDetails(
  products: AmazonProduct[],
  apiKey: string
): Promise<void> {
  console.log(`[AmazonAPI] Enriching ${products.length} products with detailed info...`)
  
  const CONCURRENCY = 3
  
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (product) => {
      const details = await fetchProductDetails(product.asin, apiKey)

      if (details) {
        if (details.description) {
          product.description = details.description
        }
        if (details.features && details.features.length > 0) {
          product.features = details.features
        }
      }
    }))
    
    // Small delay between batches
    if (i + CONCURRENCY < products.length) {
      await sleep(500)
    }
  }

  const enrichedCount = products.filter(p => p.description || p.features).length
  console.log(`[AmazonAPI] Successfully enriched ${enrichedCount}/${products.length} products`)
}

/**
 * Search Amazon and select the best products from results
 * Includes retry logic with exponential backoff for rate limits (429)
 * Returns up to 'limit' products sorted by quality
 */
export async function searchAndSelectCandidates(
  query: string,
  badge: string,
  apiKey: string,
  limit: number = 3
): Promise<AmazonProduct[]> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = new URL(`https://${RAPIDAPI_HOST}/search`)
      url.searchParams.set('query', query)
      url.searchParams.set('country', 'US')
      url.searchParams.set('page', '1')

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': apiKey,
        },
      })

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS)
        console.warn(`[AmazonAPI] Rate limited (429), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`)
        await sleep(delay)
        continue // Retry
      }

      if (!response.ok) {
        console.error(`[AmazonAPI] Search error: ${response.status}`)
        return []
      }

      const data: RapidAPISearchResponse = await response.json()

      if (data.status !== 'OK' || !data.data?.products?.length) {
        return []
      }

      // Filter and rank products by quality
      const rankedProducts = data.data.products
        .map(p => ({
          asin: p.asin,
          title: p.product_title,
          price: p.product_price || 'Check price',
          rating: p.product_star_rating ? parseFloat(p.product_star_rating) : 0,
          reviewCount: p.product_num_ratings || 0,
          imageUrl: p.product_photo,
          productUrl: p.product_url,
          badge,
          searchQuery: query,
        }))
        // Filter by minimum quality
        .filter(p => p.rating >= MIN_RATING || p.reviewCount >= MIN_REVIEWS)
        // Sort by quality score: rating × log(reviews + 1)
        .sort((a, b) => {
          const scoreA = a.rating * Math.log(a.reviewCount + 1)
          const scoreB = b.rating * Math.log(b.reviewCount + 1)
          return scoreB - scoreA
        })

      // Return top N products
      return rankedProducts.slice(0, limit)

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`[AmazonAPI] Search failed for "${query}" (attempt ${attempt}/${MAX_RETRIES}):`, error)

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS)
        await sleep(delay)
        continue
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    console.error(`[AmazonAPI] All ${MAX_RETRIES} attempts failed for "${query}"`)
  }
  return []
}

/**
 * Search Amazon and select the best product from results
 * Includes retry logic with exponential backoff for rate limits (429)
 */
async function searchAndSelectBest(
  query: string,
  badge: string,
  apiKey: string
): Promise<AmazonProduct | null> {
  const candidates = await searchAndSelectCandidates(query, badge, apiKey, 1)
  return candidates[0] || null
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY: Simple search (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch Amazon products for an affiliate article (LEGACY - use fetchProductsFromCategories)
 * 
 * @param topic - The article topic/keyword to search for
 * @param count - Number of products to return (default: 3)
 * @returns Array of products, or null if API unavailable/fails (use LLM fallback)
 */
export async function fetchAmazonProducts(
  topic: string,
  count: number = 3
): Promise<AmazonProduct[] | null> {
  const apiKey = process.env.RAPIDAPI_KEY

  // No API key - signal to use LLM-generated content
  if (!apiKey) {
    console.log('RAPIDAPI_KEY not set - will use LLM-generated product cards')
    return null
  }

  const badges = ['Best Overall', 'Best Value', 'Premium Pick', 'Editor\'s Choice', 'Budget Pick']

  try {
    const url = new URL(`https://${RAPIDAPI_HOST}/search`)
    url.searchParams.set('query', topic)
    url.searchParams.set('country', 'US')
    url.searchParams.set('page', '1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      console.error(`Amazon API error: ${response.status}`)
      return null
    }

    const data: RapidAPISearchResponse = await response.json()

    if (data.status !== 'OK' || !data.data?.products?.length) {
      console.warn('No products found from Amazon API')
      return null
    }

    // Map products with quality filtering
    const products = data.data.products
      .map((p, i): AmazonProduct => ({
        asin: p.asin,
        title: p.product_title,
        price: p.product_price || 'Check price',
        rating: p.product_star_rating ? parseFloat(p.product_star_rating) : 0,
        reviewCount: p.product_num_ratings || 0,
        imageUrl: p.product_photo,
        productUrl: p.product_url,
        badge: badges[i] || 'Top Pick',
        searchQuery: topic,
      }))
      // Filter by minimum quality
      .filter(p => p.rating >= MIN_RATING || p.reviewCount >= MIN_REVIEWS)
      .slice(0, count)

    return products.length > 0 ? products : null

  } catch (error) {
    console.error('Failed to fetch Amazon products:', error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Amazon link with affiliate tag
 * 
 * @param productUrl - Raw Amazon product URL
 * @param tag - Amazon Associate Tag (e.g. "mytag-20")
 * @returns The product URL with affiliate tag
 */
export function generateAffiliateLink(productUrl: string, tag?: string): string {
  if (!tag) return productUrl
  
  const separator = productUrl.includes('?') ? '&' : '?'
  return `${productUrl}${separator}tag=${tag}`
}

/**
 * Generate Amazon search URL for a topic (used in LLM fallback)
 * This links to Amazon search results for the topic
 * 
 * @param topic - The search keyword/topic
 * @returns Amazon search URL
 */
export function generateAmazonSearchLink(topic: string): string {
  const encodedTopic = encodeURIComponent(topic)
  // TODO: Add affiliate tag when users can input their own
  return `https://www.amazon.com/s?k=${encodedTopic}`
}
