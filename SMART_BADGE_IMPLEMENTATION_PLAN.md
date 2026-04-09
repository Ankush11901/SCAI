# Implementation Plan: Smart Affiliate Badge System

This document outlines the steps to replace repetitive, hardcoded affiliate badges (e.g., "Best Overall", "Best Value") with a dynamic, context-aware system.

## Strategy: The "Hybrid Smart-Badge" Approach
We will combine three methods to determine the perfect badge for a product:
1.  **AI Override (High Priority):** If the AI suggests a specific strength (e.g., "Best for Pet Hair"), we use it.
2.  **Data-Driven (Medium Priority):** If the product is the cheapest, highest-rated, or most popular based on real Amazon data, we assign a matching badge.
3.  **Synonym Pools (Fallback):** If neither of the above apply, we rotate through fresh synonyms for standard positions (Winner, Value, Premium) to avoid repetition.

---

## Step 1: Create the Badge Service
**File:** `lib/services/badge-service.ts` (New File)

This service holds the synonym pools and the logic to resolve conflicts between AI suggestions and data.

```typescript
import { type AmazonProduct } from './amazon-product-api'

const POOLS = {
  winner: ['Best Overall', 'Top Pick', 'Editor\'s Choice', '#1 Rated', 'The Gold Standard', 'Best in Class'],
  value: ['Best Value', 'Budget Pick', 'Wallet Saver', 'Bang for Buck', 'Smart Choice', 'Cost Effective'],
  premium: ['Premium Pick', 'Luxury Choice', 'Pro Grade', 'Ultimate Performance', 'Splurge Worthy', 'Elite Choice'],
  popular: ['Most Popular', 'Fan Favorite', 'Best Seller', 'Crowd Pleaser', 'Community Pick'],
  beginner: ['Best for Beginners', 'Easy to Use', 'Entry Level', 'User Friendly']
}

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === 'Check price') return 0
  const match = priceStr.match(/[\d,]+\.?\d*/)
  return match ? parseFloat(match[0].replace(/,/g, '')) : 0
}

export function resolveSmartBadge(
  product: AmazonProduct,
  allProducts: AmazonProduct[],
  suggestedBadge?: string,
  index: number = 0
): string {
  // 1. AI Override: Use specific AI suggestions (e.g., "Best for Stairs")
  if (suggestedBadge && !isGeneric(suggestedBadge)) {
    return toTitleCase(suggestedBadge)
  }

  // 2. Data-Driven Analysis
  const metrics = getMetrics(product)
  const allMetrics = allProducts.map(getMetrics)
  
  const isCheapest = metrics.price > 0 && metrics.price === Math.min(...allMetrics.map(m => m.price).filter(p => p > 0))
  const isMostExpensive = metrics.price > 0 && metrics.price === Math.max(...allMetrics.map(m => m.price))
  const hasMostReviews = metrics.reviews === Math.max(...allMetrics.map(m => m.reviews))
  
  if (isCheapest && metrics.rating >= 4.0) return getRandom(POOLS.value, product.asin)
  if (isMostExpensive && metrics.rating >= 4.0) return getRandom(POOLS.premium, product.asin)
  if (hasMostReviews && metrics.reviews > 1000) return getRandom(POOLS.popular, product.asin)

  // 3. Positional Fallback
  if (index === 0) return getRandom(POOLS.winner, product.asin)
  if (index === 1) return 'Runner Up'
  
  return `Top Pick #${index + 1}`
}

// ... helper functions (getMetrics, getRandom, isGeneric, toTitleCase)
```

---

## Step 2: Update Product Types
**File:** `lib/services/amazon-product-api.ts`

Add the `suggestedBadge` field to the interface so the AI's idea can travel from the inference step to the badge resolver.

```typescript
export interface AmazonProduct {
  // ... existing fields
  badge: string 
  suggestedBadge?: string; // <--- NEW FIELD
}
```

---

## Step 3: Update AI Inference Logic
**File:** `lib/services/product-inference.ts`

Modify the Zod schema and prompt to ask the AI for a specific badge. This file already uses `executeWithFallback` to switch between Gemini/OpenAI/Claude, so we just need to update the definition.

1.  **Update Schema:**
    ```typescript
    const ProductCategorySchema = z.object({
      // ... existing fields
      suggestedBadge: z.string().describe('A specific 2-4 word badge describing the MAIN STRENGTH of this category (e.g., "Best for Gaming", "Most Durable"). Do NOT use generic terms like "Best Overall".'),
    })
    ```

2.  **Update Prompt:**
    Add instructions to the `buildProductInferencePrompt` function:
    > "For each category, provide a `suggestedBadge`. This should highlight the specific use case or strength (e.g., 'Best for Pet Owners', 'Quietest Operation'). Avoid generic terms if possible."

---

## Step 4: Integrate into Orchestrator
**File:** `lib/services/unified-orchestrator.ts`

Update the `orchestrateUnifiedGeneration` function to call our new service once products are found.

```typescript
import { resolveSmartBadge } from './badge-service'

// ... inside the affiliate logic block, after fetching products ...

// 5. Enrich the final selection
if (affiliateProducts.length > 0) {
  await enrichProductsWithDetails(affiliateProducts, process.env.RAPIDAPI_KEY || '')
  
  // NEW: Smart Badge Resolution
  // Re-assign badges based on the full context of data + AI suggestions
  affiliateProducts.forEach((product, index) => {
    // Find the original inference suggestion for this product (if any)
    const inferenceCategory = affiliateInference?.categories.find(c => c.searchQuery === product.searchQuery)
    const aiSuggestion = inferenceCategory?.suggestedBadge // We need to ensure we map this back
    
    product.badge = resolveSmartBadge(product, affiliateProducts!, aiSuggestion, index)
  })
}
```

---

## Summary of Benefits
*   **No More Repetition:** Synonym pools ensure "Best Overall" doesn't appear 100 times.
*   **Context Aware:** If the AI knows a product is "Best for Gaming", the badge will say that.
*   **Factually Correct:** The cheapest item gets the "Best Value" badge automatically.
*   **Resilient:** Leverages the existing multi-provider fallback system in `product-inference.ts`.

```