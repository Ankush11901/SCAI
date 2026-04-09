/**
 * Test script for affiliate H2 image generation pipeline
 *
 * Replicates the EXACT flow used in real article generation:
 * 1. Fetch products from Amazon via RapidAPI
 * 2. For each product, call generateImage() with sourceImageUrl + sourceProductName
 *    (same as generate-images.ts job does for affiliate H2 images)
 * 3. Save output images to test-output/affiliate-h2/ folder for visual inspection
 *
 * Usage: npx tsx scripts/test-affiliate-h2-images.ts [flux|gemini]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { mkdirSync, writeFileSync } from 'fs'

// Load environment variables BEFORE importing modules that use them at module scope
config({ path: resolve(__dirname, '../.env.local') })

import type { AmazonProduct } from '../lib/services/amazon-product-api'
import type { ImageGenerationResult } from '../lib/services/imagen'
import type { ProductCategory } from '../lib/services/product-inference'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Image provider to test — 'flux' or 'gemini' */
const IMAGE_PROVIDER = (process.argv[2] as 'flux' | 'gemini') || 'flux'

/** Output directory for generated images */
const OUTPUT_DIR = resolve(__dirname, '../test-output/affiliate-h2')

/** Test product categories to search Amazon for */
const TEST_CATEGORIES: ProductCategory[] = [
  {
    badge: 'Best Overall',
    searchQuery: 'Sony WH-1000XM5 wireless headphones',
    alternateQuery: 'noise cancelling headphones',
    reason: 'Testing headphones in scene',
    expectedPriceRange: '$250-$400',
  },
  {
    badge: 'Best Value',
    searchQuery: 'Instant Pot Duo 7-in-1 pressure cooker',
    alternateQuery: 'electric pressure cooker',
    reason: 'Testing kitchen appliance in scene',
    expectedPriceRange: '$60-$120',
  },
  {
    badge: 'Premium Pick',
    searchQuery: 'Dyson V15 Detect cordless vacuum',
    alternateQuery: 'cordless stick vacuum cleaner',
    reason: 'Testing tall appliance in scene',
    expectedPriceRange: '$500-$750',
  },
]

/**
 * Simulated H2 titles that would appear in an affiliate article.
 * In real generation, h2.title is matched to a product and used as the prompt.
 */
const H2_TITLES: Record<string, string> = {
  'Best Overall': 'Best Noise Cancelling Headphones for Travel',
  'Best Value': 'Best Electric Pressure Cooker for Beginners',
  'Premium Pick': 'Best Cordless Vacuum for Deep Cleaning',
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function saveImage(result: ImageGenerationResult, filename: string): string | null {
  let base64 = result.base64
  if (!base64 && result.url.startsWith('data:')) {
    base64 = result.url.split(',')[1]
  }
  if (!base64) {
    console.error(`  No base64 data in result for ${filename}`)
    return null
  }

  const buffer = Buffer.from(base64, 'base64')
  const ext = result.mimeType?.includes('png') ? 'png' : 'jpg'
  const filepath = resolve(OUTPUT_DIR, `${filename}.${ext}`)
  writeFileSync(filepath, buffer)
  console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)}KB)`)
  return filepath
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50)
}

async function downloadAmazonImage(url: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`  Failed to download Amazon image: ${response.status}`)
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const ext = url.includes('.png') ? 'png' : 'jpg'
    const filepath = resolve(OUTPUT_DIR, `${filename}.${ext}`)
    writeFileSync(filepath, buffer)
    console.log(`  Saved Amazon original: ${filepath} (${(buffer.length / 1024).toFixed(0)}KB)`)
    return filepath
  } catch (err) {
    console.error(`  Failed to download Amazon image: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('='.repeat(80))
  console.log('AFFILIATE H2 IMAGE GENERATION TEST')
  console.log(`Provider: ${IMAGE_PROVIDER}`)
  console.log('='.repeat(80))
  console.log()

  // Validate env
  if (IMAGE_PROVIDER === 'flux' && !process.env.FAL_KEY) {
    console.error('FAL_KEY not set in .env.local')
    process.exit(1)
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('GOOGLE_GENERATIVE_AI_API_KEY not set in .env.local (needed for prompt orchestration)')
    process.exit(1)
  }
  if (!process.env.RAPIDAPI_KEY) {
    console.error('RAPIDAPI_KEY not set in .env.local')
    process.exit(1)
  }

  // Dynamic imports — ensures env vars are loaded before modules init their clients
  const { fetchProductsFromCategories } = await import('../lib/services/amazon-product-api')
  const { generateImage } = await import('../lib/services/imagen')

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`Output directory: ${OUTPUT_DIR}\n`)

  // --- Step 1: Fetch products from Amazon ---
  console.log('-'.repeat(80))
  console.log('STEP 1: Fetching products from Amazon...')
  console.log('-'.repeat(80))

  const products = await fetchProductsFromCategories(TEST_CATEGORIES)

  if (!products || products.length === 0) {
    console.error('No products returned from Amazon')
    process.exit(1)
  }

  console.log(`\nFound ${products.length} products:\n`)
  for (const p of products) {
    console.log(`  [${p.badge}] ${p.title.substring(0, 60)}...`)
    console.log(`    Image: ${p.imageUrl.substring(0, 80)}...`)
    console.log(`    Price: ${p.price} | Rating: ${p.rating} (${p.reviewCount} reviews)`)
    console.log()
  }

  // --- Step 2: Generate H2 images ---
  console.log('-'.repeat(80))
  console.log('STEP 2: Generating H2 images (same flow as real article generation)...')
  console.log('-'.repeat(80))
  console.log()

  const results: Array<{
    product: AmazonProduct
    h2Title: string
    imagePath: string | null
    amazonImagePath: string | null
    durationMs: number
    success: boolean
    error?: string
  }> = []

  for (const product of products) {
    const h2Title = H2_TITLES[product.badge] || `Best ${product.searchQuery}`
    const context = `Article about the best products in the ${product.searchQuery} category. This section reviews ${product.title}.`
    const baseName = sanitizeFilename(product.badge)

    console.log(`\n${'-'.repeat(60)}`)
    console.log(`Product: ${product.title.substring(0, 60)}...`)
    console.log(`H2 Title (prompt): "${h2Title}"`)
    console.log(`Source Image: ${product.imageUrl.substring(0, 80)}...`)
    console.log(`Provider: ${IMAGE_PROVIDER}`)
    console.log(`${'-'.repeat(60)}`)

    // Save original Amazon product image for comparison
    const amazonImagePath = await downloadAmazonImage(
      product.imageUrl,
      `AMAZON_ORIGINAL_${baseName}_${sanitizeFilename(product.title.substring(0, 30))}`
    )

    const startTime = Date.now()

    try {
      // *** THIS IS THE EXACT SAME CALL that generate-images.ts makes ***
      // See generate-images.ts line 180-192
      const result = await generateImage(
        h2Title,              // prompt — same as placeholder.text (h2.title)
        context,              // context — article context
        2,                    // maxRetries
        'h2',                 // imageType — H2 section image
        'affiliate',          // articleType — affiliate article
        undefined,            // stepNumber — not a how-to
        product.imageUrl,     // sourceImageUrl — Amazon product image
        undefined,            // costTracking — skip for test
        IMAGE_PROVIDER,       // imageProvider — flux or gemini
        product.title,        // sourceProductName — the matched product name
      )

      const durationMs = Date.now() - startTime
      const filename = `${IMAGE_PROVIDER}_${sanitizeFilename(product.badge)}_${sanitizeFilename(product.title.substring(0, 30))}`
      const imagePath = saveImage(result, filename)

      results.push({
        product,
        h2Title,
        imagePath,
        amazonImagePath,
        durationMs,
        success: !!imagePath,
      })

      console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`)
      console.log(`  ${imagePath ? 'SUCCESS' : 'FAILED (placeholder returned)'}`)

    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`  ERROR: ${errorMsg}`)
      results.push({
        product,
        h2Title,
        imagePath: null,
        amazonImagePath,
        durationMs,
        success: false,
        error: errorMsg,
      })
    }
  }

  // --- Summary ---
  console.log('\n')
  console.log('='.repeat(80))
  console.log('RESULTS SUMMARY')
  console.log('='.repeat(80))
  console.log(`Provider: ${IMAGE_PROVIDER}`)
  console.log(`Total: ${results.length} | Success: ${results.filter(r => r.success).length} | Failed: ${results.filter(r => !r.success).length}`)
  console.log()

  for (const r of results) {
    console.log(`  [${r.product.badge}] ${r.success ? 'OK' : 'FAIL'} ${r.h2Title}`)
    console.log(`    Product: ${r.product.title.substring(0, 50)}...`)
    console.log(`    Duration: ${(r.durationMs / 1000).toFixed(1)}s`)
    if (r.amazonImagePath) console.log(`    Amazon Original: ${r.amazonImagePath}`)
    if (r.imagePath) console.log(`    Generated Image: ${r.imagePath}`)
    if (r.error) console.log(`    Error: ${r.error}`)
    console.log()
  }

  console.log(`\nImages saved to: ${OUTPUT_DIR}`)
  console.log('Compare AMAZON_ORIGINAL_* files with generated images to assess product similarity.')
  console.log('The generated images should show recognizable products in natural lifestyle scenes.')
}

main().catch(console.error)
