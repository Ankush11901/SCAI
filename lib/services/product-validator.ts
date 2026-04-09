/**
 * Product Relevance Validator
 * 
 * Ensures that products fetched from Amazon actually match the user's search intent.
 * This prevents issues where a search for "human hair clippers" returns "dog clippers"
 * simply because they rank high for similar keywords.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { executeWithFallback, type AIProvider } from '@/lib/ai/providers'
import type { AmazonProduct } from './amazon-product-api'
import type { CostTrackingContext } from './cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const ProductValidationSchema = z.object({
  products: z.array(z.object({
    asin: z.string(),
    isRelevant: z.boolean().describe('True if the product matches the user intent, false if it deviates (e.g., dog clipper for human search)'),
    reason: z.string().describe('Brief reason for acceptance or rejection'),
    correctedCategory: z.string().nullable().describe('If irrelevant, what is this product actually? (e.g., "Pet Grooming Tool"). Null if relevant.'),
  }))
})

export interface ProductValidationResult {
  validProducts: AmazonProduct[]
  invalidProducts: Array<{ product: AmazonProduct; reason: string }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that fetched Amazon products align with the article topic
 * 
 * @param products - List of fetched Amazon products
 * @param topic - Original user topic/keyword
 * @param provider - AI provider to use
 */
export async function validateProductRelevance(
  products: AmazonProduct[],
  topic: string,
  provider: AIProvider = 'openai',
  costTracking?: CostTrackingContext
): Promise<ProductValidationResult> {
  if (products.length === 0) {
    return { validProducts: [], invalidProducts: [] }
  }

  console.log(`[ProductValidator] Validating ${products.length} products for topic: "${topic}"`)

  const productsContext = products.map((p, i) => 
    `Product ${i + 1} (ASIN: ${p.asin}):
- Title: ${p.title}
- Features: ${p.features?.slice(0, 2).join('; ') || 'N/A'}
- Price: ${p.price}`
  ).join('\n\n')

  try {
    const prompt = `You are a strict product relevance auditor for an affiliate article.    
ARTICLE TOPIC: "${topic}"

Your job is to double-check that the fetched Amazon products matches the USER INTENT for this topic.
Reject any product that is:
1. The wrong category (e.g., "dog clippers" when topic is "barber clippers")
2. An accessory/part instead of the main item (e.g., "phone case" when topic is "best smartphone", "controller charger" when topic is "best ps5 games")
3. A book about the topic instead of the product itself
4. Clearly irrelevant or a joke item

STRICT NOUN CHECK:
- If topic is "Games", reject "Consoles", "Headsets", "Chargers".
- If topic is "Shoes", reject "Socks", "Insoles", "Shoe Polish".

Analyze these products:`

    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: ProductValidationSchema,
          prompt: `${prompt}\n\n${productsContext}`,
          temperature: 0.1, // Low temperature for strict logic
        })
      },
      { preferredProvider: provider, tier: 'fast', operationName: 'validateProducts', costTracking }
    )

    const validProducts: AmazonProduct[] = []
    const invalidProducts: Array<{ product: AmazonProduct; reason: string }> = []

    // Map validation results back to original products
    for (const validation of result.object.products) {
      const originalProduct = products.find(p => p.asin === validation.asin)
      if (!originalProduct) continue

      if (validation.isRelevant) {
        validProducts.push(originalProduct)
      } else {
        console.log(`[ProductValidator] ❌ Rejected: "${originalProduct.title.substring(0, 40)}"...`)
        console.log(`[ProductValidator]    Reason: ${validation.reason}`)
        invalidProducts.push({
          product: originalProduct,
          reason: validation.reason
        })
      }
    }

    console.log(`[ProductValidator] Result: ${validProducts.length} valid, ${invalidProducts.length} rejected`)
    return { validProducts, invalidProducts }

  } catch (error) {
    console.error('[ProductValidator] Validation failed:', error)
    // Fail safe: return all products if validation fails to avoid empty results
    return { validProducts: products, invalidProducts: [] }
  }
}
