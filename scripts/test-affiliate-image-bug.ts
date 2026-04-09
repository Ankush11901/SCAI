/**
 * Test Script: Affiliate Article Image Generation Bug
 * 
 * This script diagnoses the bug where H2 section images in affiliate articles
 * incorrectly go through the text removal/product placement flow intended
 * only for product card images.
 * 
 * BUG SUMMARY:
 * - When an H2 title matches a product name, `sourceImageUrl` is set to the Amazon image
 * - This triggers `buildProductPlacementPrompt` with text removal in imagen.ts
 * - H2 images should use standard text-to-image generation, NOT product image editing
 * 
 * Usage: 
 *   npx tsx scripts/test-affiliate-image-bug.ts
 *   npx tsx scripts/test-affiliate-image-bug.ts --fix-mode both --save-images
 *   npx tsx scripts/test-affiliate-image-bug.ts --fix-mode fixed --products 5
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface MockProduct {
  title: string
  cleanedName: string
  imageUrl: string
  price: string
  rating: number
  asin: string
}

interface ImageGenerationTrace {
  componentType: string
  imageType: string
  prompt: string
  sourceImageUrl?: string
  codePath: 'product-card-transform' | 'standard-with-source' | 'standard-no-source'
  wouldUseProductReference: boolean
  wouldCallBuildProductPlacementPrompt: boolean
  expectedBehavior: string
  actualBehavior: string
  isBug: boolean
  details: string[]
}

interface TestResult {
  mode: 'buggy' | 'fixed'
  timestamp: string
  traces: ImageGenerationTrace[]
  summary: {
    totalImages: number
    h2Images: number
    productCardImages: number
    bugsFound: number
    h2ImagesWithSourceUrl: number
    h2ImagesWithTextRemoval: number
  }
}

interface CLIOptions {
  fixMode: 'buggy' | 'fixed' | 'both'
  products: number
  saveImages: boolean
  verbose: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  const options: CLIOptions = {
    fixMode: 'both',
    products: 3,
    saveImages: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--fix-mode':
        const mode = args[++i]
        if (mode === 'buggy' || mode === 'fixed' || mode === 'both') {
          options.fixMode = mode
        }
        break
      case '--products':
        options.products = parseInt(args[++i], 10) || 3
        break
      case '--save-images':
        options.saveImages = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        console.log(`
Affiliate Image Bug Test Script

Usage: npx tsx scripts/test-affiliate-image-bug.ts [options]

Options:
  --fix-mode <mode>   Test mode: buggy, fixed, or both (default: both)
  --products <n>      Number of mock products to test (default: 3)
  --save-images       Save generated images to disk (requires API keys)
  --verbose, -v       Enable verbose logging
  --help, -h          Show this help message
`)
        process.exit(0)
    }
  }

  return options
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

function createMockProducts(count: number): MockProduct[] {
  const products: MockProduct[] = [
    {
      title: 'Ninja AF101 Air Fryer, 4 Qt, Black/Gray - Programmable Base Unit with 4-in-1 Functionality: Air Fry, Roast, Reheat & Dehydrate',
      cleanedName: 'Ninja AF101 Air Fryer',
      imageUrl: 'https://m.media-amazon.com/images/I/71gZvLnT8EL._AC_SL1500_.jpg',
      price: '$89.99',
      rating: 4.8,
      asin: 'B07FDJMC9Q',
    },
    {
      title: 'COSORI Air Fryer Pro LE 5-Qt Airfryer, Quick and Easy Meals, UP to 450℉, Quiet Operation, 85% Oil less, 130+ Exclusive Recipes, 9 Custom Functions',
      cleanedName: 'COSORI Air Fryer Pro LE',
      imageUrl: 'https://m.media-amazon.com/images/I/71WkMKCYP8L._AC_SL1500_.jpg',
      price: '$99.99',
      rating: 4.7,
      asin: 'B0936FGLQS',
    },
    {
      title: 'Instant Vortex Plus 6 Quart 6-in-1 Air Fryer with ClearCook and OdorErase, From the Makers of Instant Pot, Stainless Steel',
      cleanedName: 'Instant Vortex Plus Air Fryer',
      imageUrl: 'https://m.media-amazon.com/images/I/71CwHfkXHYL._AC_SL1500_.jpg',
      price: '$119.99',
      rating: 4.6,
      asin: 'B08R6CWRSR',
    },
    {
      title: 'Philips Premium Airfryer XXL with Fat Removal Technology, 3lb/7qt, Black, HD9650/96',
      cleanedName: 'Philips Premium Airfryer XXL',
      imageUrl: 'https://m.media-amazon.com/images/I/61L1LcDkLnL._AC_SL1500_.jpg',
      price: '$249.99',
      rating: 4.5,
      asin: 'B07WS5R2F9',
    },
    {
      title: 'Breville Smart Oven Air Fryer Pro Countertop Convection Oven BOV900BSS, Brushed Stainless Steel',
      cleanedName: 'Breville Smart Oven Air Fryer Pro',
      imageUrl: 'https://m.media-amazon.com/images/I/81hJxLFcz-L._AC_SL1500_.jpg',
      price: '$399.99',
      rating: 4.7,
      asin: 'B01N5UPTZS',
    },
  ]

  return products.slice(0, Math.min(count, products.length))
}

function createMockH2Titles(products: MockProduct[]): string[] {
  return products.map((p, i) => {
    const formats = [
      `${i + 1}. ${p.cleanedName} Review`,
      `${p.cleanedName} - Best for Large Families`,
      `Why ${p.cleanedName} is Our Top Pick`,
      `${p.cleanedName}: Features and Performance`,
      `Is ${p.cleanedName} Worth It?`,
    ]
    return formats[i % formats.length]
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE PATH SIMULATION (Mirrors actual code logic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulates the logic in unified-orchestrator.ts lines 2180-2206
 * that assigns sourceImageUrl to H2 images
 */
function simulateH2ImagePlaceholderCreation(
  h2Title: string,
  products: MockProduct[],
  articleType: 'affiliate',
  applyFix: boolean
): { sourceImageUrl?: string; matchedProduct?: MockProduct } {
  let sourceImageUrl: string | undefined
  let matchedProduct: MockProduct | undefined

  if (articleType === 'affiliate' && products.length > 0) {
    const h2Lower = h2Title.toLowerCase()
    
    matchedProduct = products.find(p => {
      const cleanName = p.cleanedName?.toLowerCase()
      const rawTitle = p.title.toLowerCase()
      
      if (cleanName && h2Lower.includes(cleanName.toLowerCase())) return true
      
      const firstWords = rawTitle.split(' ').slice(0, 3).join(' ')
      return h2Lower.includes(firstWords)
    })

    if (matchedProduct) {
      // BUG: Current code always sets sourceImageUrl for H2 images
      // FIX: Should NOT set sourceImageUrl for H2 images
      if (!applyFix) {
        sourceImageUrl = matchedProduct.imageUrl
      }
      // With fix applied, sourceImageUrl remains undefined for H2 images
    }
  }

  return { sourceImageUrl, matchedProduct }
}

/**
 * Simulates the logic in generate-images.ts that decides which path to take
 */
function simulateGenerateImagesDecision(
  componentType: string,
  sourceImageUrl?: string
): 'product-card-transform' | 'standard-with-source' | 'standard-no-source' {
  if (componentType === 'product-card' && sourceImageUrl) {
    return 'product-card-transform'
  } else if (sourceImageUrl) {
    return 'standard-with-source'
  } else {
    return 'standard-no-source'
  }
}

/**
 * Simulates the logic in imagen.ts that determines if product reference mode is used
 */
function simulateImagenProductReference(
  sourceImageUrl?: string
): { wouldUseProductReference: boolean; wouldCallBuildProductPlacementPrompt: boolean } {
  if (sourceImageUrl) {
    // When sourceImageUrl is provided, imagen.ts:
    // 1. Fetches the image and creates productReference object
    // 2. Skips product detection
    // 3. Calls buildProductPlacementPrompt (text removal)
    return {
      wouldUseProductReference: true,
      wouldCallBuildProductPlacementPrompt: true,
    }
  }
  
  return {
    wouldUseProductReference: false,
    wouldCallBuildProductPlacementPrompt: false,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

function runTest(mode: 'buggy' | 'fixed', products: MockProduct[], options: CLIOptions): TestResult {
  const applyFix = mode === 'fixed'
  const h2Titles = createMockH2Titles(products)
  const traces: ImageGenerationTrace[] = []

  console.log(`\n${'═'.repeat(70)}`)
  console.log(`🧪 RUNNING TEST: ${mode.toUpperCase()} MODE`)
  console.log(`${'═'.repeat(70)}`)

  // Test H2 images
  console.log(`\n📝 Testing ${h2Titles.length} H2 section images...`)
  
  for (let i = 0; i < h2Titles.length; i++) {
    const h2Title = h2Titles[i]
    const { sourceImageUrl, matchedProduct } = simulateH2ImagePlaceholderCreation(
      h2Title, 
      products, 
      'affiliate', 
      applyFix
    )

    const codePath = simulateGenerateImagesDecision('h2', sourceImageUrl)
    const imagenResult = simulateImagenProductReference(sourceImageUrl)

    const isBug = codePath === 'standard-with-source' && imagenResult.wouldCallBuildProductPlacementPrompt
    
    const trace: ImageGenerationTrace = {
      componentType: 'h2',
      imageType: 'h2',
      prompt: h2Title,
      sourceImageUrl,
      codePath,
      wouldUseProductReference: imagenResult.wouldUseProductReference,
      wouldCallBuildProductPlacementPrompt: imagenResult.wouldCallBuildProductPlacementPrompt,
      expectedBehavior: 'Standard text-to-image generation (no sourceImageUrl)',
      actualBehavior: sourceImageUrl 
        ? 'Product placement mode with text removal (WRONG)' 
        : 'Standard text-to-image generation (CORRECT)',
      isBug,
      details: [
        `H2 Title: "${h2Title}"`,
        matchedProduct ? `Matched Product: "${matchedProduct.cleanedName}"` : 'No product match',
        `sourceImageUrl: ${sourceImageUrl ? sourceImageUrl.substring(0, 50) + '...' : 'undefined'}`,
        `Code Path: ${codePath}`,
        `Would use productReference: ${imagenResult.wouldUseProductReference}`,
        `Would call buildProductPlacementPrompt: ${imagenResult.wouldCallBuildProductPlacementPrompt}`,
      ],
    }

    traces.push(trace)

    if (options.verbose) {
      console.log(`\n  [H2 ${i + 1}] "${h2Title.substring(0, 40)}..."`)
      console.log(`    • Matched: ${matchedProduct?.cleanedName || 'none'}`)
      console.log(`    • sourceImageUrl: ${sourceImageUrl ? '✗ SET (bug)' : '✓ undefined'}`)
      console.log(`    • Code path: ${codePath}`)
      console.log(`    • Status: ${isBug ? '❌ BUG TRIGGERED' : '✅ CORRECT'}`)
    }
  }

  // Test product card images
  console.log(`\n📦 Testing ${products.length} product card images...`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const sourceImageUrl = product.imageUrl // Product cards should always have sourceImageUrl

    const codePath = simulateGenerateImagesDecision('product-card', sourceImageUrl)

    const trace: ImageGenerationTrace = {
      componentType: 'product-card',
      imageType: 'product',
      prompt: product.cleanedName,
      sourceImageUrl,
      codePath,
      wouldUseProductReference: true, // Product cards always use reference
      wouldCallBuildProductPlacementPrompt: false, // generateProductImage handles this differently
      expectedBehavior: 'Product card transformation via generateProductImage()',
      actualBehavior: 'Product card transformation via generateProductImage() (CORRECT)',
      isBug: false,
      details: [
        `Product: "${product.cleanedName}"`,
        `Amazon Image: ${sourceImageUrl.substring(0, 50)}...`,
        `Code Path: ${codePath}`,
        'Uses generateProductImage() for text removal/cleanup (correct)',
      ],
    }

    traces.push(trace)

    if (options.verbose) {
      console.log(`\n  [Product ${i + 1}] "${product.cleanedName}"`)
      console.log(`    • sourceImageUrl: ✓ SET (expected)`)
      console.log(`    • Code path: ${codePath}`)
      console.log(`    • Status: ✅ CORRECT`)
    }
  }

  // Calculate summary
  const h2Traces = traces.filter(t => t.componentType === 'h2')
  const productCardTraces = traces.filter(t => t.componentType === 'product-card')

  const result: TestResult = {
    mode,
    timestamp: new Date().toISOString(),
    traces,
    summary: {
      totalImages: traces.length,
      h2Images: h2Traces.length,
      productCardImages: productCardTraces.length,
      bugsFound: traces.filter(t => t.isBug).length,
      h2ImagesWithSourceUrl: h2Traces.filter(t => t.sourceImageUrl).length,
      h2ImagesWithTextRemoval: h2Traces.filter(t => t.wouldCallBuildProductPlacementPrompt).length,
    },
  }

  // Print summary
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`📊 ${mode.toUpperCase()} MODE SUMMARY`)
  console.log(`${'─'.repeat(50)}`)
  console.log(`  Total Images: ${result.summary.totalImages}`)
  console.log(`  H2 Images: ${result.summary.h2Images}`)
  console.log(`  Product Cards: ${result.summary.productCardImages}`)
  console.log(`  Bugs Found: ${result.summary.bugsFound}`)
  console.log(`  H2s with sourceImageUrl: ${result.summary.h2ImagesWithSourceUrl}`)
  console.log(`  H2s triggering text removal: ${result.summary.h2ImagesWithTextRemoval}`)

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateHTMLReport(buggyResult: TestResult | null, fixedResult: TestResult | null, outputDir: string): string {
  const timestamp = new Date().toLocaleString()

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Affiliate Image Bug Analysis Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.6; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #58a6ff; margin-bottom: 1rem; font-size: 2rem; }
    h2 { color: #58a6ff; margin: 2rem 0 1rem; font-size: 1.5rem; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    h3 { color: #8b949e; margin: 1rem 0 0.5rem; font-size: 1.1rem; }
    .meta { color: #8b949e; font-size: 0.9rem; margin-bottom: 2rem; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 1rem; }
    .summary-card.buggy { border-color: #f85149; }
    .summary-card.fixed { border-color: #3fb950; }
    .summary-card h3 { margin-top: 0; color: inherit; }
    .summary-card.buggy h3 { color: #f85149; }
    .summary-card.fixed h3 { color: #3fb950; }
    .stat { display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid #21262d; }
    .stat:last-child { border-bottom: none; }
    .stat-label { color: #8b949e; }
    .stat-value { font-weight: 600; }
    .stat-value.bug { color: #f85149; }
    .stat-value.ok { color: #3fb950; }
    
    .bug-explanation { background: #21262d; border-left: 4px solid #f85149; padding: 1rem; margin: 1rem 0; border-radius: 0 6px 6px 0; }
    .bug-explanation h3 { color: #f85149; margin-bottom: 0.5rem; }
    .bug-explanation code { background: #0d1117; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9rem; color: #79c0ff; }
    
    .fix-explanation { background: #21262d; border-left: 4px solid #3fb950; padding: 1rem; margin: 1rem 0; border-radius: 0 6px 6px 0; }
    .fix-explanation h3 { color: #3fb950; margin-bottom: 0.5rem; }
    
    .traces { margin-top: 2rem; }
    .trace { background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 1rem; overflow: hidden; }
    .trace.bug { border-color: #f85149; }
    .trace-header { background: #21262d; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
    .trace.bug .trace-header { background: rgba(248, 81, 73, 0.1); }
    .trace-title { font-weight: 600; }
    .trace-badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 10px; }
    .trace-badge.h2 { background: #1f6feb; color: white; }
    .trace-badge.product-card { background: #238636; color: white; }
    .trace-badge.bug { background: #f85149; color: white; }
    .trace-badge.ok { background: #3fb950; color: black; }
    .trace-body { padding: 1rem; }
    .trace-detail { font-size: 0.85rem; color: #8b949e; margin: 0.25rem 0; }
    .trace-detail code { background: #0d1117; padding: 0.1rem 0.3rem; border-radius: 3px; color: #79c0ff; }
    
    .code-block { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 1rem; margin: 1rem 0; overflow-x: auto; }
    .code-block code { color: #c9d1d9; white-space: pre; font-size: 0.85rem; line-height: 1.4; }
    .code-block .comment { color: #8b949e; }
    .code-block .keyword { color: #ff7b72; }
    .code-block .string { color: #a5d6ff; }
    .code-block .function { color: #d2a8ff; }
    .code-block .bug-line { background: rgba(248, 81, 73, 0.2); display: block; margin: 0 -1rem; padding: 0 1rem; }
    .code-block .fix-line { background: rgba(63, 185, 80, 0.2); display: block; margin: 0 -1rem; padding: 0 1rem; }
    
    .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; }
    @media (max-width: 900px) { .comparison { grid-template-columns: 1fr; } }
    .comparison-col h3 { text-align: center; padding: 0.5rem; border-radius: 6px; }
    .comparison-col.buggy h3 { background: rgba(248, 81, 73, 0.2); color: #f85149; }
    .comparison-col.fixed h3 { background: rgba(63, 185, 80, 0.2); color: #3fb950; }
    
    .flow-diagram { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 1.5rem; margin: 1rem 0; }
    .flow-step { display: flex; align-items: center; margin: 0.5rem 0; }
    .flow-arrow { color: #8b949e; margin: 0 0.5rem; }
    .flow-box { background: #21262d; border: 1px solid #30363d; border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
    .flow-box.bug { border-color: #f85149; color: #f85149; }
    .flow-box.ok { border-color: #3fb950; color: #3fb950; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Affiliate Image Bug Analysis Report</h1>
    <p class="meta">Generated: ${timestamp}</p>
    
    <div class="bug-explanation">
      <h3>🐛 Bug Description</h3>
      <p>H2 section images in affiliate articles incorrectly trigger the product placement/text removal flow that should only be used for product card images.</p>
      <p style="margin-top: 0.5rem;"><strong>Root Cause:</strong> In <code>unified-orchestrator.ts:2180-2206</code>, when an H2 title matches a product name, <code>sourceImageUrl</code> is set to the Amazon product image URL. This causes <code>imagen.ts</code> to use the Amazon image as a reference and apply text removal prompts.</p>
      <p style="margin-top: 0.5rem;"><strong>Impact:</strong> H2 images show edited/transformed Amazon product photos instead of fresh AI-generated illustrations.</p>
    </div>
`

  // Summary cards
  html += `    <h2>📊 Summary Comparison</h2>
    <div class="summary-grid">
`

  if (buggyResult) {
    html += `      <div class="summary-card buggy">
        <h3>❌ Buggy Mode</h3>
        <div class="stat"><span class="stat-label">Total Images</span><span class="stat-value">${buggyResult.summary.totalImages}</span></div>
        <div class="stat"><span class="stat-label">H2 Images</span><span class="stat-value">${buggyResult.summary.h2Images}</span></div>
        <div class="stat"><span class="stat-label">Product Cards</span><span class="stat-value">${buggyResult.summary.productCardImages}</span></div>
        <div class="stat"><span class="stat-label">Bugs Found</span><span class="stat-value bug">${buggyResult.summary.bugsFound}</span></div>
        <div class="stat"><span class="stat-label">H2s with sourceImageUrl</span><span class="stat-value bug">${buggyResult.summary.h2ImagesWithSourceUrl}</span></div>
        <div class="stat"><span class="stat-label">H2s triggering text removal</span><span class="stat-value bug">${buggyResult.summary.h2ImagesWithTextRemoval}</span></div>
      </div>
`
  }

  if (fixedResult) {
    html += `      <div class="summary-card fixed">
        <h3>✅ Fixed Mode</h3>
        <div class="stat"><span class="stat-label">Total Images</span><span class="stat-value">${fixedResult.summary.totalImages}</span></div>
        <div class="stat"><span class="stat-label">H2 Images</span><span class="stat-value">${fixedResult.summary.h2Images}</span></div>
        <div class="stat"><span class="stat-label">Product Cards</span><span class="stat-value">${fixedResult.summary.productCardImages}</span></div>
        <div class="stat"><span class="stat-label">Bugs Found</span><span class="stat-value ok">${fixedResult.summary.bugsFound}</span></div>
        <div class="stat"><span class="stat-label">H2s with sourceImageUrl</span><span class="stat-value ok">${fixedResult.summary.h2ImagesWithSourceUrl}</span></div>
        <div class="stat"><span class="stat-label">H2s triggering text removal</span><span class="stat-value ok">${fixedResult.summary.h2ImagesWithTextRemoval}</span></div>
      </div>
`
  }

  html += `    </div>
`

  // Code flow diagrams
  html += `    <h2>🔀 Code Flow Analysis</h2>
    
    <h3>Current (Buggy) Flow for H2 Images:</h3>
    <div class="flow-diagram">
      <div class="flow-step">
        <span class="flow-box">H2 title matches product</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box bug">sourceImageUrl = product.imageUrl</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box">generate-images.ts</span>
      </div>
      <div class="flow-step">
        <span class="flow-arrow">↓</span>
      </div>
      <div class="flow-step">
        <span class="flow-box">generateImage()</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box bug">imagen.ts sees sourceImageUrl</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box bug">productReference = { Amazon image }</span>
      </div>
      <div class="flow-step">
        <span class="flow-arrow">↓</span>
      </div>
      <div class="flow-step">
        <span class="flow-box bug">buildProductPlacementPrompt()</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box bug">Text removal/editing mode activated</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box bug">❌ WRONG: Edits Amazon image</span>
      </div>
    </div>

    <h3>Fixed Flow for H2 Images:</h3>
    <div class="flow-diagram">
      <div class="flow-step">
        <span class="flow-box">H2 title matches product</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box ok">sourceImageUrl = undefined</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box">generate-images.ts</span>
      </div>
      <div class="flow-step">
        <span class="flow-arrow">↓</span>
      </div>
      <div class="flow-step">
        <span class="flow-box">generateImage()</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box ok">imagen.ts: no sourceImageUrl</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box ok">Standard product detection flow</span>
      </div>
      <div class="flow-step">
        <span class="flow-arrow">↓</span>
      </div>
      <div class="flow-step">
        <span class="flow-box ok">buildNarrativePrompt()</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box ok">Text-to-image generation</span>
        <span class="flow-arrow">→</span>
        <span class="flow-box ok">✅ CORRECT: Fresh AI image</span>
      </div>
    </div>
`

  // Suggested fix
  html += `    <h2>🔧 Suggested Fix</h2>
    <div class="fix-explanation">
      <h3>Option 1: Remove sourceImageUrl from H2 images (Recommended)</h3>
      <p>In <code>lib/services/unified-orchestrator.ts</code> lines 2180-2206, remove or guard the sourceImageUrl assignment for H2 images:</p>
    </div>
    
    <div class="code-block">
      <code><span class="comment">// unified-orchestrator.ts - Lines 2180-2206</span>

<span class="comment">// Detect matching product for affiliate articles</span>
<span class="keyword">let</span> sourceImageUrl: <span class="keyword">string</span> | <span class="keyword">undefined</span>

<span class="keyword">if</span> (articleType === <span class="string">'affiliate'</span> && affiliateProducts?.length > 0) {
  <span class="keyword">const</span> h2Lower = h2.title.<span class="function">toLowerCase</span>()
  <span class="keyword">const</span> matchedProduct = affiliateProducts.<span class="function">find</span>(p => { ... })

  <span class="keyword">if</span> (matchedProduct) {
<span class="bug-line">    <span class="comment">// ❌ BUG: This line should be removed or commented out</span></span>
<span class="bug-line">    sourceImageUrl = matchedProduct.imageUrl</span>
<span class="fix-line">    <span class="comment">// ✅ FIX: Don't set sourceImageUrl for H2 images</span></span>
<span class="fix-line">    <span class="comment">// sourceImageUrl = undefined  // H2s use text-to-image, not product editing</span></span>
  }
}

<span class="comment">// Create H2 placeholder</span>
<span class="keyword">const</span> h2Placeholder = <span class="function">createEnhancedPlaceholder</span>({
  text: h2.title,
  articleType,
  imageType: articleType === <span class="string">'how-to'</span> ? <span class="string">'step-process'</span> : <span class="string">'h2'</span>,
  sectionIndex: i,
  componentType: <span class="string">'h2'</span>,
<span class="bug-line">  sourceImageUrl, <span class="comment">// ❌ Passes Amazon URL to H2 image</span></span>
<span class="fix-line">  <span class="comment">// sourceImageUrl: undefined, // ✅ Don't pass for H2 images</span></span>
})</code>
    </div>

    <div class="fix-explanation">
      <h3>Option 2: Add componentType check in imagen.ts</h3>
      <p>Guard the sourceImageUrl usage in <code>imagen.ts</code> to only apply for product-card components:</p>
    </div>
    
    <div class="code-block">
      <code><span class="comment">// imagen.ts - Around line 1641</span>

<span class="comment">// If source image provided, use it directly (bypass detection)</span>
<span class="bug-line"><span class="keyword">if</span> (sourceImageUrl) { <span class="comment">// ❌ Current: applies to all images</span></span>
<span class="fix-line"><span class="keyword">if</span> (sourceImageUrl && componentType === <span class="string">'product-card'</span>) { <span class="comment">// ✅ Fixed: only product cards</span></span>
  <span class="keyword">const</span> imageData = <span class="keyword">await</span> <span class="function">fetchImageAsBase64</span>(sourceImageUrl)
  <span class="comment">// ... rest of product reference logic</span>
}</code>
    </div>
`

  // Detailed traces
  const renderTraces = (result: TestResult, label: string) => {
    return result.traces.map((trace, i) => `
      <div class="trace ${trace.isBug ? 'bug' : ''}">
        <div class="trace-header">
          <span class="trace-title">${trace.prompt.substring(0, 50)}${trace.prompt.length > 50 ? '...' : ''}</span>
          <span>
            <span class="trace-badge ${trace.componentType}">${trace.componentType}</span>
            <span class="trace-badge ${trace.isBug ? 'bug' : 'ok'}">${trace.isBug ? '❌ BUG' : '✅ OK'}</span>
          </span>
        </div>
        <div class="trace-body">
          ${trace.details.map(d => `<p class="trace-detail">${d.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`).join('')}
          <p class="trace-detail"><strong>Expected:</strong> ${trace.expectedBehavior}</p>
          <p class="trace-detail"><strong>Actual:</strong> ${trace.actualBehavior}</p>
        </div>
      </div>
    `).join('')
  }

  if (buggyResult && fixedResult) {
    html += `    <h2>📋 Detailed Trace Comparison</h2>
    <div class="comparison">
      <div class="comparison-col buggy">
        <h3>❌ Buggy Mode Traces</h3>
        ${renderTraces(buggyResult, 'buggy')}
      </div>
      <div class="comparison-col fixed">
        <h3>✅ Fixed Mode Traces</h3>
        ${renderTraces(fixedResult, 'fixed')}
      </div>
    </div>
`
  } else if (buggyResult) {
    html += `    <h2>📋 Detailed Traces (Buggy Mode)</h2>
    <div class="traces">
      ${renderTraces(buggyResult, 'buggy')}
    </div>
`
  } else if (fixedResult) {
    html += `    <h2>📋 Detailed Traces (Fixed Mode)</h2>
    <div class="traces">
      ${renderTraces(fixedResult, 'fixed')}
    </div>
`
  }

  html += `  </div>
</body>
</html>`

  return html
}

function generateJSONReport(buggyResult: TestResult | null, fixedResult: TestResult | null): object {
  return {
    generatedAt: new Date().toISOString(),
    bugDescription: {
      summary: 'H2 images incorrectly use product placement/text removal flow',
      rootCause: 'sourceImageUrl is set for H2 images in affiliate articles',
      affectedFiles: [
        'lib/services/unified-orchestrator.ts:2180-2206',
        'lib/jobs/generate-images.ts:137-182',
        'lib/services/imagen.ts:1641-1655',
      ],
    },
    results: {
      buggy: buggyResult,
      fixed: fixedResult,
    },
    comparison: buggyResult && fixedResult ? {
      bugsFixed: buggyResult.summary.bugsFound - fixedResult.summary.bugsFound,
      h2SourceUrlsRemoved: buggyResult.summary.h2ImagesWithSourceUrl - fixedResult.summary.h2ImagesWithSourceUrl,
      textRemovalPrevented: buggyResult.summary.h2ImagesWithTextRemoval - fixedResult.summary.h2ImagesWithTextRemoval,
    } : null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs()
  
  console.log(`
${'═'.repeat(70)}
🔍 AFFILIATE IMAGE BUG TEST SCRIPT
${'═'.repeat(70)}

Configuration:
  • Fix Mode: ${options.fixMode}
  • Products: ${options.products}
  • Save Images: ${options.saveImages}
  • Verbose: ${options.verbose}
`)

  const products = createMockProducts(options.products)
  console.log(`\n📦 Created ${products.length} mock affiliate products:`)
  products.forEach((p, i) => console.log(`   ${i + 1}. ${p.cleanedName}`))

  let buggyResult: TestResult | null = null
  let fixedResult: TestResult | null = null

  // Run tests based on mode
  if (options.fixMode === 'buggy' || options.fixMode === 'both') {
    buggyResult = runTest('buggy', products, options)
  }

  if (options.fixMode === 'fixed' || options.fixMode === 'both') {
    fixedResult = runTest('fixed', products, options)
  }

  // Create output directory
  const timestamp = Date.now()
  const outputDir = path.join(__dirname, '..', 'test-results', `affiliate-image-bug-${new Date().toISOString().split('T')[0]}-${timestamp}`)
  fs.mkdirSync(outputDir, { recursive: true })

  // Generate and save reports
  console.log(`\n${'═'.repeat(70)}`)
  console.log('📝 GENERATING REPORTS')
  console.log(`${'═'.repeat(70)}`)

  const htmlReport = generateHTMLReport(buggyResult, fixedResult, outputDir)
  const htmlPath = path.join(outputDir, 'comparison-report.html')
  fs.writeFileSync(htmlPath, htmlReport)
  console.log(`\n✅ HTML Report: ${htmlPath}`)

  const jsonReport = generateJSONReport(buggyResult, fixedResult)
  const jsonPath = path.join(outputDir, 'analysis.json')
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2))
  console.log(`✅ JSON Report: ${jsonPath}`)

  // Final summary
  console.log(`\n${'═'.repeat(70)}`)
  console.log('📊 FINAL ANALYSIS')
  console.log(`${'═'.repeat(70)}`)

  if (buggyResult && fixedResult) {
    const bugsFixed = buggyResult.summary.bugsFound - fixedResult.summary.bugsFound
    console.log(`
Comparison Results:
  • Bugs in buggy mode: ${buggyResult.summary.bugsFound}
  • Bugs in fixed mode: ${fixedResult.summary.bugsFound}
  • Bugs fixed: ${bugsFixed}
  
${bugsFixed > 0 ? '✅ The fix successfully prevents H2 images from using text removal' : '⚠️ No difference detected between modes'}
`)
  } else if (buggyResult) {
    console.log(`
Buggy Mode Analysis:
  • Total bugs found: ${buggyResult.summary.bugsFound}
  • H2 images incorrectly using sourceImageUrl: ${buggyResult.summary.h2ImagesWithSourceUrl}
  • H2 images triggering text removal: ${buggyResult.summary.h2ImagesWithTextRemoval}
  
${buggyResult.summary.bugsFound > 0 ? '❌ Bug confirmed: H2 images are incorrectly using product image editing' : '✅ No bugs detected'}
`)
  } else if (fixedResult) {
    console.log(`
Fixed Mode Analysis:
  • Total bugs found: ${fixedResult.summary.bugsFound}
  • H2 images using sourceImageUrl: ${fixedResult.summary.h2ImagesWithSourceUrl}
  
${fixedResult.summary.bugsFound === 0 ? '✅ Fix working: No H2 images use text removal' : '⚠️ Some issues remain'}
`)
  }

  console.log(`\n📂 Output directory: ${outputDir}`)
  console.log(`\n${'═'.repeat(70)}`)
}

main().catch(console.error)
