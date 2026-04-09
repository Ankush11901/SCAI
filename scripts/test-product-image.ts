/**
 * Test script for product image transformation and Amazon API integration
 * 
 * Tests:
 * 1. RapidAPI Amazon product details endpoint (descriptions, features)
 * 2. Product name cleaning (AI-powered)
 * 3. Product image transformation (Gemini)
 * 
 * Usage: npx tsx scripts/test-product-image.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { GoogleGenAI } from "@google/genai"
import { cleanProductName, generateProductDescription } from '../lib/services/product-image-generator'
import { fetchProductsFromCategories } from '../lib/services/amazon-product-api'
import type { ProductCategory } from '../lib/services/product-inference'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!GEMINI_API_KEY) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in .env.local')
  process.exit(1)
}

if (!RAPIDAPI_KEY) {
  console.warn('⚠️ RAPIDAPI_KEY not found - Amazon API tests will be skipped')
}

console.log('✅ Gemini API key found')
if (RAPIDAPI_KEY) console.log('✅ RapidAPI key found')

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

// ═══════════════════════════════════════════════════════════════════════════════
// AMAZON API TEST - Product Details Endpoint
// ═══════════════════════════════════════════════════════════════════════════════

interface AmazonProductDetails {
  asin: string
  product_title: string
  product_price: string
  product_star_rating: string
  product_num_ratings: number
  product_url: string
  product_photo: string
  product_description?: string
  about_product?: string[]
  product_details?: Record<string, string>
  product_information?: Record<string, string>
}

/**
 * Test RapidAPI's product-details endpoint to get full product info including descriptions
 */
async function testAmazonProductDetails(asin: string): Promise<AmazonProductDetails | null> {
  if (!RAPIDAPI_KEY) {
    console.log('\n⚠️ Skipping Amazon API test - no RAPIDAPI_KEY')
    return null
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log('🛒 TESTING AMAZON PRODUCT DETAILS API')
  console.log(`${'═'.repeat(60)}`)
  console.log(`\n📦 Fetching ASIN: ${asin}`)

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${asin}&country=US`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY!
      }
    })

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.data) {
      console.error('❌ Invalid response format')
      return null
    }

    const product = data.data

    console.log('\n✅ Product details received:')
    console.log(`   Title: ${product.product_title?.substring(0, 60)}...`)
    console.log(`   Price: ${product.product_price || 'N/A'}`)
    console.log(`   Rating: ${product.product_star_rating || 'N/A'} (${product.product_num_ratings || 0} reviews)`)

    if (product.product_description) {
      console.log(`\n📝 Description (${product.product_description.length} chars):`)
      console.log(`   ${product.product_description.substring(0, 200)}...`)
    } else {
      console.log('\n⚠️ No product_description field')
    }

    if (product.about_product && Array.isArray(product.about_product)) {
      console.log(`\n✨ About Product (${product.about_product.length} features):`)
      product.about_product.slice(0, 3).forEach((feature: string, i: number) => {
        console.log(`   ${i + 1}. ${feature.substring(0, 80)}...`)
      })
    } else {
      console.log('\n⚠️ No about_product field')
    }

    if (product.product_details) {
      console.log(`\n📋 Product Details: ${Object.keys(product.product_details).length} fields`)
      const keys = Object.keys(product.product_details).slice(0, 5)
      keys.forEach(key => {
        console.log(`   - ${key}: ${product.product_details[key]}`)
      })
    }

    console.log(`\n${'═'.repeat(60)}`)

    return product

  } catch (error) {
    console.error('❌ Error fetching product details:', error)
    return null
  }
}

// Test Amazon product ASINs (real products with good data)
const testASINs = [
  { asin: 'B07ZPKBL9V', name: 'Amazon Echo Dot (3rd Gen)' },
  { asin: 'B09B8RRSZK', name: 'Apple AirPods Pro (2nd Gen)' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING TESTS - Product Name Cleaning & Image Transformation
// ═══════════════════════════════════════════════════════════════════════════════

// Test Amazon product images with REAL verbose Amazon names
const testProducts = [
  {
    name: 'Creative Pebble 2.0 USB-Powered Desktop Speakers with Far-Field Drivers and Passive Radiators for PCs and Laptops (Black)',
    imageUrl: 'https://m.media-amazon.com/images/I/51uD9NEttxL._AC_UY654_FMwebp_QL65_.jpg',
    category: 'Speakers'
  },
  {
    name: 'Edifier R1280T Powered Bookshelf Speakers - 2.0 Active Near Field Studio Monitor Speaker - Wooden Enclosure - 42 Watts RMS Power',
    imageUrl: 'https://m.media-amazon.com/images/I/71o5w0ZfptL._AC_UY654_FMwebp_QL65_.jpg',
    category: 'Speakers'
  }
]

// Test name cleaning first (AI-powered)
async function testNameCleaning() {
  console.log('\n' + '═'.repeat(60))
  console.log('🧹 TESTING PRODUCT NAME CLEANING (AI-POWERED)')
  console.log('═'.repeat(60))

  for (const product of testProducts) {
    const cleaned = await cleanProductName(product.name)
    console.log(`\n📦 Original (${product.name.length} chars):`)
    console.log(`   "${product.name}"`)
    console.log(`\n✨ Cleaned (${cleaned.length} chars):`)
    console.log(`   "${cleaned}"`)
  }

  console.log('\n' + '═'.repeat(60))
}

// Test description generation from features (AI-powered)
async function testDescriptionGeneration() {
  console.log('\n' + '═'.repeat(60))
  console.log('🤖 TESTING DESCRIPTION GENERATION (AI-POWERED)')
  console.log('═'.repeat(60))

  const testCases = [
    {
      name: 'Logitech MX Master 3S Wireless Mouse',  // Changed to avoid cache
      features: [
        'Advanced 8K DPI sensor for precise tracking',
        'MagSpeed electromagnetic scrolling for ultra-fast navigation',
        'Ergonomic design with thumb rest for all-day comfort'
      ]
    },
    {
      name: 'Anker PowerCore 20000mAh Power Bank',  // Changed to avoid cache
      features: [
        'High-capacity 20000mAh battery charges phones multiple times',
        'PowerIQ technology for optimized charging speeds',
        'Compact portable design with LED power indicator'
      ]
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n📦 Product: ${testCase.name}`)
    console.log(`   Features (${testCase.features.length}):`)
    testCase.features.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.substring(0, 60)}...`)
    })

    const description = await generateProductDescription(testCase.name, testCase.features)

    console.log(`\n✨ Generated Description (${description.length} chars):`)
    console.log(`   "${description}"`)
  }

  console.log('\n' + '═'.repeat(60))
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log(`\n📥 Fetching image from: ${imageUrl}`)

    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`❌ Failed to fetch image: ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    let mimeType = 'image/jpeg'
    if (contentType.includes('png')) mimeType = 'image/png'
    else if (contentType.includes('webp')) mimeType = 'image/webp'
    else if (contentType.includes('gif')) mimeType = 'image/gif'

    console.log(`✅ Image fetched: ${base64.length} chars, type: ${mimeType}`)
    return { base64, mimeType }
  } catch (error) {
    console.error(`❌ Error fetching image:`, error)
    return null
  }
}

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

❌ DO NOT:
- Change any aspect of the product's appearance
- Include humans, hands, or body parts
- Add any text, logos, watermarks, or labels
- Add props or other objects
- Generate a different version of the product

Output a single clean product photo suitable for an e-commerce website or blog article.
Professional 2K quality, square aspect ratio (1:1).`
}

async function transformProductImage(product: typeof testProducts[0]): Promise<boolean> {
  // Clean the product name first
  const cleanedName = await cleanProductName(product.name)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`🎨 Testing: ${cleanedName}`)
  console.log(`   (Original: ${product.name.substring(0, 50)}...)`)
  console.log(`${'═'.repeat(60)}`)

  // Step 1: Fetch the image
  const imageData = await fetchImageAsBase64(product.imageUrl)
  if (!imageData) {
    console.error('❌ Failed to fetch image')
    return false
  }

  // Step 2: Build prompt with CLEANED name
  const prompt = buildTransformPrompt(cleanedName, product.category)
  console.log(`\n📝 Prompt built (${prompt.length} chars)`)

  // Step 3: Call Gemini
  console.log(`\n🤖 Calling Gemini API (gemini-3-pro-image-preview)...`)

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3-pro-image-preview",
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
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K",
        }
      }
    })

    // Check response
    console.log(`\n📊 Response received`)
    console.log(`   - Candidates: ${response.candidates?.length || 0}`)

    if (response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts
      console.log(`   - Parts: ${parts.length}`)

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (part.text) {
          console.log(`   - Part ${i}: TEXT (${part.text.length} chars)`)
          console.log(`     Preview: "${part.text.substring(0, 100)}..."`)
        }
        if (part.inlineData?.data) {
          const base64 = part.inlineData.data
          const mimeType = part.inlineData.mimeType || 'unknown'
          console.log(`   - Part ${i}: IMAGE`)
          console.log(`     MIME Type: ${mimeType}`)
          console.log(`     Base64 Length: ${base64.length} chars`)
          console.log(`     Valid Base64: ${/^[A-Za-z0-9+/=]+$/.test(base64)}`)

          // Save the image to a file for inspection
          const fs = await import('fs')
          const outputPath = resolve(__dirname, `../test-output-${Date.now()}.png`)
          const imageBuffer = Buffer.from(base64, 'base64')
          fs.writeFileSync(outputPath, imageBuffer)
          console.log(`\n✅ SUCCESS! Image saved to: ${outputPath}`)
          return true
        }
      }
    }

    // If we got here, no image was found
    console.log(`\n❌ No image found in response`)

    // Log the full response for debugging
    console.log(`\nFull response structure:`)
    console.log(JSON.stringify(response, null, 2).substring(0, 2000))

    return false

  } catch (error) {
    console.error(`\n❌ API Error:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 Product API & Image Transformation Test Suite')
  console.log(`   Date: ${new Date().toISOString()}`)
  console.log(`   Gemini API Key: ${GEMINI_API_KEY?.substring(0, 10)}...`)
  console.log(`   RapidAPI Key: ${RAPIDAPI_KEY ? RAPIDAPI_KEY.substring(0, 10) + '...' : 'Not set'}`)

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Amazon Product Details API (Descriptions & Features)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '█'.repeat(60))
  console.log('TEST 1: AMAZON PRODUCT DETAILS API')
  console.log('█'.repeat(60))

  if (RAPIDAPI_KEY) {
    // Test 1A: Direct product details endpoint
    console.log('\n📋 TEST 1A: Direct Product Details Endpoint\n')
    for (const testProduct of testASINs) {
      const details = await testAmazonProductDetails(testProduct.asin)
      if (details) {
        console.log(`\n✅ Successfully fetched details for: ${testProduct.name}`)
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Test 1B: Integrated search + enrichment flow
    console.log('\n\n📋 TEST 1B: Integrated Search + Enrichment Flow\n')
    console.log('═'.repeat(60))

    const testCategories: ProductCategory[] = [
      {
        badge: 'Best Speakers',
        searchQuery: 'bookshelf speakers powered',
        alternateQuery: 'desktop speakers',
        reason: 'Best overall sound quality',
        expectedPriceRange: '$100-$200'
      },
      {
        badge: 'Budget Pick',
        searchQuery: 'affordable wireless earbuds',
        alternateQuery: 'cheap bluetooth earbuds',
        reason: 'Best value for money',
        expectedPriceRange: '$20-$50'
      }
    ]

    const enrichedProducts = await fetchProductsFromCategories(testCategories)

    if (enrichedProducts && enrichedProducts.length > 0) {
      console.log(`\n✅ Retrieved ${enrichedProducts.length} products with enrichment:\n`)

      enrichedProducts.forEach((product, i) => {
        console.log(`\n${i + 1}. ${product.badge}`)
        console.log(`   Title: ${product.title.substring(0, 60)}...`)
        console.log(`   Rating: ${product.rating}★ (${product.reviewCount} reviews)`)
        console.log(`   Price: $${product.price}`)

        if (product.description) {
          console.log(`   ✅ Description: ${product.description.substring(0, 100)}...`)
        } else {
          console.log(`   ❌ No description`)
        }

        if (product.features && product.features.length > 0) {
          console.log(`   ✅ Features (${product.features.length}):`)
          product.features.slice(0, 2).forEach((f, idx) => {
            console.log(`      ${idx + 1}. ${f.substring(0, 70)}...`)
          })
        } else {
          console.log(`   ❌ No features`)
        }
      })
    } else {
      console.log('\n❌ No products retrieved')
    }

    console.log('\n' + '═'.repeat(60))

  } else {
    console.log('\n⚠️ Skipping - RAPIDAPI_KEY not configured')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: AI-Powered Product Name Cleaning
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '█'.repeat(60))
  console.log('TEST 2: AI-POWERED PRODUCT NAME CLEANING')
  console.log('█'.repeat(60))

  await testNameCleaning()

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: AI-Powered Description Generation
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '█'.repeat(60))
  console.log('TEST 3: AI-POWERED DESCRIPTION GENERATION')
  console.log('█'.repeat(60))

  await testDescriptionGeneration()

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Product Image Transformation (Optional - costs API credits)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '█'.repeat(60))
  console.log('TEST 4: PRODUCT IMAGE TRANSFORMATION')
  console.log('█'.repeat(60))
  console.log('\n⚠️ Skipping image transformation to save API credits')
  console.log('   To test, uncomment the code below in the script')

  // Uncomment to test image transformation:
  /*
  let successCount = 0
  const product = testProducts[0]
  const success = await transformProductImage(product)
  if (success) successCount++

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📊 IMAGE TRANSFORMATION RESULTS: ${successCount}/1 successful`)
  console.log(`${'═'.repeat(60)}`)
  */

  console.log('\n\n' + '█'.repeat(60))
  console.log('✅ ALL TESTS COMPLETE')
  console.log('█'.repeat(60))
}

main().catch(console.error)
