/**
 * Product Inference Service
 * Uses AI to intelligently determine what products to recommend for affiliate articles
 *
 * Flow:
 * 1. Takes user topic (e.g., "cats", "home office setup", "camping gear")
 * 2. AI infers the best product CATEGORIES to recommend
 * 3. Returns optimized Amazon search queries for each category
 * 4. Each query is designed for maximum relevance and quality results
 *
 * This service runs BEFORE structure generation so:
 * - Products drive the article structure
 * - TOC can be built from actual product names
 * - H2s match real products
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback, type AIProvider } from '@/lib/ai/providers'
import type { CostTrackingContext } from './cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductCategory {
  badge: string // "Best Overall", "Best Value", "Premium Pick", etc.
  suggestedBadge?: string // AI-suggested specific badge (e.g., "Best for Pet Hair")
  searchQuery: string // Optimized Amazon search query
  alternateQuery: string // Fallback query if primary returns no results
  reason: string // Why this category was chosen
  expectedPriceRange: string // e.g., "$20-$50"
}

export interface ProductInferenceResult {
  categories: ProductCategory[]
  articleFocus: string // The angle/focus for the article
  targetAudience: string // Who the article is for
  h1Suggestion: string // Suggested H1 based on products
}

// Badge assignments based on product position
const BADGE_SEQUENCE = [
  'Best Overall',
  'Best Value',
  'Premium Pick',
  'Editor\'s Choice',
  'Budget Pick',
  'Most Popular',
  'Best for Beginners',
]

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA FOR STRUCTURED OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

const ProductCategorySchema = z.object({
  badge: z.string().describe('Badge like "Best Overall", "Best Value", etc.'),
  suggestedBadge: z.string().describe('A SPECIFIC 2-4 word badge highlighting this product\'s unique strength. Examples: "Best for Pet Hair", "Quietest Option", "Fastest Brewing", "Most Compact". Must NOT be generic like "Best Overall" or "Top Pick".'),
  searchQuery: z.string().describe('Optimized Amazon search query for this product'),
  alternateQuery: z.string().describe('Simpler fallback query if primary fails'),
  reason: z.string().describe('Why this product category was chosen'),
  expectedPriceRange: z.string().describe('Expected price range like "$20-$50"'),
})

const ProductInferenceSchema = z.object({
  targetEntity: z.string().describe('The core noun entity requested (e.g., "Video Game Software", "Running Shoe", "Blender"). NOT "Accessories" or "Related Items".'),
  categories: z.array(ProductCategorySchema).describe('Product categories to recommend'),
  articleFocus: z.string().describe('The main angle/focus for the article'),
  targetAudience: z.string().describe('Who this article is written for'),
  h1Suggestion: z.string().describe('Suggested H1 title (60 chars max)'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildProductInferencePrompt(
  topic: string,
  count: number,
  badges: string[],
  h1Variation: 'question' | 'statement' | 'listicle',
  focusItems?: string[] | null
): string {
  const focusContext = focusItems && focusItems.length > 0
    ? `\nUSER REQUESTED FOCUS:\nThe user explicitly requested to cover these specific items/brands: ${focusItems.join(', ')}. You MUST prioritize these in your recommendations if relevant.`
    : ''

  return `You are an expert affiliate marketing strategist. Analyze the topic "${topic}" and determine the ${count} BEST product categories to recommend in an affiliate article.

IMPORTANT CONTEXT:
- This is for an AFFILIATE article - we're recommending PRODUCTS people can buy
- The article H1 will be in ${h1Variation} format
- Products will be sourced from Amazon${focusContext}

STRICT RULE: ENTITY MATCHING
1. Identify the CORE NOUN the user is asking for (targetEntity).
   - "Best PS5 Games" -> targetEntity = "Video Game Software" (NOT consoles, NOT headsets, NOT chargers)
   - "Best Running Shoes" -> targetEntity = "Footwear" (NOT socks, NOT insoles)
   - "Best Coffee Makers" -> targetEntity = "Coffee Appliance" (NOT beans, NOT mugs)
2. Your recommended categories MUST be subtypes of this targetEntity.
3. DO NOT suggest accessories, peripherals, or "must-have add-ons" unless the topic specifically asks for "accessories".
   - If user asks for "Games", give me "RPG Games", "Action Games", "Indie Games".
   - DO NOT give me "Headsets" or "Controllers" for a "Games" request.

YOUR TASK:
1. Identify the targetEntity (Core Noun).
2. Create optimized Amazon search queries for ${count} categories of that entity.
3. Ensure variety - don't recommend the same type of product twice.
4. Consider different price points (budget, mid-range, premium).

BADGES TO USE (in order):
${badges.map((badge, i) => `${i + 1}. "${badge}"`).join('\n')}

IMPORTANT - suggestedBadge INSTRUCTIONS:
For EACH category, also provide a "suggestedBadge" that highlights the product's UNIQUE strength.
- GOOD examples: "Best for Small Spaces", "Quietest Option", "Most Durable", "Easiest to Clean", "Best Battery Life"
- BAD examples: "Best Overall", "Top Pick", "Editor's Choice" (these are too generic)
The suggestedBadge should describe WHY this specific product category stands out.

CRITICAL RULES for searchQuery:
1. Be SPECIFIC - "best cat water fountain stainless steel" NOT "cat products"
2. Include key attributes buyers care about - material, size, features
3. Avoid brand names unless universally known
4. Use terms Amazon search understands - "for home", "professional grade", etc.
5. alternateQuery should be simpler/broader in case primary returns no results

EXAMPLE for topic "cats":
- Product 1: "best automatic cat feeder programmable" (alt: "automatic cat feeder")
- Product 2: "cat water fountain stainless steel" (alt: "cat water fountain")
- Product 3: "large cat tree for big cats" (alt: "cat tree")

Now analyze "${topic}" and return the structured data.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION - AI Product Inference
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer the best product categories to recommend for an affiliate article
 *
 * Uses AI SDK with automatic fallback from Gemini to OpenAI on failure.
 *
 * @param topic - User's topic/keyword (e.g., "cats", "gaming setup")
 * @param productCount - Number of products to recommend (3-7)
 * @param h1Variation - The H1 variation type for consistency
 * @param provider - Preferred AI provider (default: 'gemini')
 * @returns Inferred product categories with optimized search queries
 */
export async function inferProductCategories(
  topic: string,
  productCount: number = 3,
  h1Variation: 'question' | 'statement' | 'listicle' = 'statement',
  provider: AIProvider = 'openai',
  costTracking?: CostTrackingContext
): Promise<ProductInferenceResult> {
  // Ensure product count is within bounds
  const count = Math.max(3, Math.min(productCount, 7))
  const badges = BADGE_SEQUENCE.slice(0, count)

  // Check for specific user focus in the topic string
  const focusItems = extractProductFocusFromPrompt(topic)
  if (focusItems) {
    console.log(`[ProductInference] User requested focus on: ${focusItems.join(', ')}`)
  }

  try {
    const { result, provider: usedProvider, usedFallback } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: ProductInferenceSchema,
          prompt: buildProductInferencePrompt(topic, count, badges, h1Variation, focusItems),
          temperature: 0.7,
        })
      },
      {
        preferredProvider: provider,
        tier: 'default',
        operationName: 'inferProductCategories',
        maxRetries: 3,
        costTracking,
      }
    )

    // Preserve AI-generated suggestedBadge for smart badge resolution later
    // The badge field gets a fallback value, but the real badge will be resolved by badge-service
    const categories = result.object.categories.slice(0, count).map((cat, i) => ({
      ...cat,
      badge: badges[i], // Fallback badge (will be overwritten by badge-service)
      suggestedBadge: cat.suggestedBadge, // AI's context-aware suggestion
    }))

    console.log(`[ProductInference] Inferred ${categories.length} product categories for "${topic}"`)
    console.log(`[ProductInference] Provider: ${usedProvider}${usedFallback ? ' (fallback)' : ''}`)
    console.log(`[ProductInference] Focus: ${result.object.articleFocus}`)
    console.log(`[ProductInference] Categories: ${categories.map(c => c.searchQuery).join(', ')}`)

    return {
      categories,
      articleFocus: result.object.articleFocus,
      targetAudience: result.object.targetAudience,
      h1Suggestion: result.object.h1Suggestion,
    }
  } catch (error) {
    console.error('[ProductInference] AI inference failed, using fallback:', error)

    // Fallback: Generate generic product categories based on topic
    return generateFallbackCategories(topic, count, badges, h1Variation)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK - When AI inference fails
// ═══════════════════════════════════════════════════════════════════════════════

function generateFallbackCategories(
  topic: string,
  count: number,
  badges: string[],
  h1Variation: string
): ProductInferenceResult {
  // Generate simple search queries based on topic
  const categories: ProductCategory[] = badges.slice(0, count).map((badge, i) => {
    const modifiers = [
      'best',
      'top rated',
      'popular',
      'highly rated',
      'premium',
      'professional',
      'budget'
    ]

    return {
      badge,
      searchQuery: `${modifiers[i] || 'best'} ${topic} ${new Date().getFullYear()}`,
      alternateQuery: `${topic}`,
      reason: `Top ${badge.toLowerCase()} option for ${topic}`,
      expectedPriceRange: i === count - 1 ? '$100+' : i === 1 ? '$20-$50' : '$50-$100'
    }
  })

  const h1Formats = {
    question: `What Are the Best ${topic.charAt(0).toUpperCase() + topic.slice(1)} to Buy?`,
    statement: `Best ${topic.charAt(0).toUpperCase() + topic.slice(1)} of ${new Date().getFullYear()}`,
    listicle: `${count} Best ${topic.charAt(0).toUpperCase() + topic.slice(1)} Worth Buying`
  }

  return {
    categories,
    articleFocus: `Comprehensive guide to the best ${topic} options`,
    targetAudience: `Anyone looking to purchase ${topic}`,
    h1Suggestion: h1Formats[h1Variation as keyof typeof h1Formats] || h1Formats.statement
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT PRODUCT INTENT FROM USER PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract specific product categories if the user specifies them in their prompt
 * e.g., "Write about cats - focus on toys, beds, and feeders"
 * 
 * @param userPrompt - The full user prompt/topic
 * @returns Extracted focus areas or null if none specified
 */
export function extractProductFocusFromPrompt(userPrompt: string): string[] | null {
  // Common patterns for product specification
  const patterns = [
    /focus(?:ing)? on[:\s]+([^.]+)/i,
    /specifically[:\s]+([^.]+)/i,
    /include[:\s]+([^.]+)/i,
    /cover(?:ing)?[:\s]+([^.]+)/i,
    /about[:\s]+([^.]+?)(?:\s+products?|\s+items?)?$/i,
  ]

  for (const pattern of patterns) {
    const match = userPrompt.match(pattern)
    if (match && match[1]) {
      // Split by common delimiters
      const items = match[1]
        .split(/[,&]|\band\b/)
        .map(s => s.trim())
        .filter(s => s.length > 2)

      if (items.length >= 2) {
        return items
      }
    }
  }

  return null
}
