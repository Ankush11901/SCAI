/**
 * Unique Component Schemas for AI Article Generation
 * 
 * Defines Zod schemas for article-type-specific components:
 * - Product Cards (Affiliate)
 * - Feature Lists (Commercial/Review)
 * - Comparison Tables (Comparison)
 * - Pros & Cons (Review)
 * - Ingredients, Instructions, Nutrition (Recipe)
 * - Materials, Pro Tips (How-To)
 * - And more...
 * 
 * Used with Vercel AI SDK's generateObject() for structured outputs.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isWithinWordRange(text: string, target: number, tolerance = 0.15): boolean {
  const count = wordCount(text)
  const min = Math.floor(target * (1 - tolerance))
  const max = Math.ceil(target * (1 + tolerance))
  return count >= min && count <= max
}

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE: PRODUCT CARD SCHEMA
// Per documentation: H2 + card + description (~275 words total)
// ═══════════════════════════════════════════════════════════════════════════════

export const ProductCardSchema = z.object({
  /** Product H2 title (max 60 chars) */
  h2: z.string().min(15).max(60),

  /** Product name */
  name: z.string().min(5).max(80),

  /** Short product description for card (~30-50 words) */
  shortDescription: z.string().refine(
    (text) => isWithinWordRange(text, 40, 0.3),
    'Short description should be 30-50 words'
  ),

  /** Product features/highlights (5-7 bullet points) */
  features: z.array(z.string().min(10).max(80)).min(5).max(7),

  /** Price display text (e.g., "$49.99", "From $29/mo") */
  price: z.string().min(1).max(30),

  /** Badge text (e.g., "Best Overall", "Best Value", "Premium Pick") */
  badge: z.string().min(5).max(25).nullable(),

  /** Detailed description paragraph (~150 words) */
  description: z.string().refine(
    (text) => isWithinWordRange(text, 150, 0.15),
    'Description should be ~150 words'
  ),

  /** Affiliate link placeholder */
  affiliateLink: z.string().url().nullable(),
})

export type ProductCard = z.infer<typeof ProductCardSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: FEATURE LIST SCHEMA
// Per documentation: H2 (40-50 chars) + 100-120 words (5-7 bullets)
// ═══════════════════════════════════════════════════════════════════════════════

export const FeatureListSchema = z.object({
  /** Feature List H2 (optional for backward compatibility) */
  h2: z.string().min(5).max(150),
  /** Feature bullets (3-10 items) */
  features: z.array(
    z.object({
      /** Feature title/name */
      title: z.string().min(2).max(100),
      /** Feature description - generous limit for AI variability */
      description: z.string().min(3).max(500),
    })
  ).min(3).max(12),
})

export type FeatureList = z.infer<typeof FeatureListSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: CTA BOX SCHEMA
// Per documentation: 20-30 words
// ═══════════════════════════════════════════════════════════════════════════════

export const CtaBoxSchema = z.object({
  /** CTA headline */
  headline: z.string().min(10).max(60),
  /** CTA body text (~20-30 words) */
  body: z.string().refine(
    (text) => isWithinWordRange(text, 25, 0.3),
    'CTA body should be 20-30 words'
  ),
  /** Button text */
  buttonText: z.string().min(5).max(25),
  /** Button link placeholder */
  buttonLink: z.string().nullable(),
})

export type CtaBox = z.infer<typeof CtaBoxSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON: COMPARISON TABLE SCHEMA
// Per documentation: H2 (40-50 chars) + 120-150 words side-by-side
// ═══════════════════════════════════════════════════════════════════════════════

export const ComparisonTableSchema = z.object({
  /** Comparison Table H2 (optional) */
  h2: z.string().min(5).max(100),
  /** Names of items being compared (exactly 2 items) */
  itemNames: z.array(z.string().min(2).max(80)).length(2),

  /** Comparison criteria with values */
  criteria: z.array(
    z.object({
      /** Criterion name (e.g., "Price", "Features", "Support") */
      name: z.string().min(2).max(50),
      /** Value for item A */
      valueA: z.string().min(1).max(100),
      /** Value for item B */
      valueB: z.string().min(1).max(100),
    })
  ).min(3).max(10),
})

export type ComparisonTable = z.infer<typeof ComparisonTableSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW: PROS & CONS SCHEMA
// Per documentation: H2 (40-50 chars) + 150 words total (75 pros + 75 cons, 5-7 items each)
// ═══════════════════════════════════════════════════════════════════════════════

export const ProsConsSchema = z.object({
  /** Pros & Cons H2 (optional) */
  h2: z.string().min(5).max(100),
  /** Pros list (3-10 items) */
  pros: z.array(z.string().min(5).max(100)).min(3).max(10),
  /** Cons list (3-10 items) */
  cons: z.array(z.string().min(5).max(100)).min(3).max(10),
})

export type ProsCons = z.infer<typeof ProsConsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW: RATING PARAGRAPH SCHEMA
// Per documentation: H2 (30 chars max) + 100 words with score
// ═══════════════════════════════════════════════════════════════════════════════

export const RatingContentSchema = z.object({
  /** Rating H2 (optional) */
  h2: z.string().min(5).max(60),
  /** Rating score (1-10) */
  score: z.number().min(1).max(10),
  /** Score display (e.g., "8.5/10" or "8.5") */
  scoreDisplay: z.string().min(1).max(20),
  /** Rating title label (e.g., "Excellent", "Good Value", "Highly Recommended") */
  title: z.string().min(3).max(50),
  /** Rating justification (~100 words) */
  justification: z.string().min(20).max(1000),
})

export type RatingContent = z.infer<typeof RatingContentSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON: EXTRACTION SCHEMA
// Used for pre-generation to extract items being compared, criteria, differences
// Supports comparing ANY two things: products, people, services, events, etc.
// ═══════════════════════════════════════════════════════════════════════════════

export const ComparisonExtractSchema = z.object({
  /** First item being compared */
  itemA: z.string().min(1).max(100),
  /** Second item being compared */
  itemB: z.string().min(1).max(100),
  /** Category of comparison (e.g., smartphones, frameworks, celebrities, sports events) */
  category: z.string().min(1).max(50),
  /** 4-6 comparison criteria relevant to what's being compared */
  criteria: z.array(z.string().min(1).max(100)).min(3).max(8),
  /** 3-5 key differences between the two items */
  keyDifferences: z.array(z.string().min(1).max(150)).min(2).max(6),
  /** 1-3 similarities between the items */
  similarities: z.array(z.string().min(1).max(150)).min(0).max(4).nullable(),
  /** Recommended option or "depends on needs" if no clear winner */
  winnerName: z.string().min(1).max(100).nullable(),
  /** Why this option is recommended (if applicable) */
  winnerReason: z.string().max(200).nullable(),
  /** When to choose the first option (e.g., "if you value portability") */
  chooseA: z.string().max(150).nullable(),
  /** When to choose the second option */
  chooseB: z.string().max(150).nullable(),
  /** Who this comparison is for */
  targetAudience: z.string().max(100).nullable(),
})

export type ComparisonExtract = z.infer<typeof ComparisonExtractSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: EXTRACTION SCHEMA
// Used for pre-generation to extract product/service info, benefits, value props
// Focuses on persuasive, business-focused content generation
// ═══════════════════════════════════════════════════════════════════════════════

export const CommercialExtractSchema = z.object({
  /** Product or service name */
  productName: z.string().min(1).max(150),
  /** Category/industry (e.g., "SaaS", "consulting", "e-commerce", "fitness equipment") */
  category: z.string().min(1).max(100),
  /** 4-6 key benefits/value propositions */
  keyBenefits: z.array(z.string().min(1).max(150)).min(3).max(8),
  /** 3-5 main features that deliver the benefits */
  keyFeatures: z.array(z.string().min(1).max(150)).min(2).max(6),
  /** Target audience/ideal customer */
  targetAudience: z.string().min(1).max(150),
  /** Primary pain point the product/service solves */
  painPoint: z.string().min(1).max(200),
  /** Unique selling proposition - what makes it different */
  uniqueValue: z.string().min(1).max(200),
  /** Call-to-action suggestion (e.g., "Get started free", "Book a demo") */
  ctaSuggestion: z.string().max(100).nullable(),
  /** Price positioning (nullable) */
  pricePosition: z.enum(['budget', 'mid-range', 'premium', 'enterprise']).nullable(),
  /** Social proof element (nullable) */
  socialProof: z.string().max(150).nullable(),
})

export type CommercialExtract = z.infer<typeof CommercialExtractSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INGREDIENTS SCHEMA
// Per documentation: H2 + 150 words bulleted list
// More lenient validation to handle AI response variability
// ═══════════════════════════════════════════════════════════════════════════════

export const IngredientsSchema = z.object({
  /** Ingredients H2 - REQUIRED */
  h2: z.string().min(3).max(100),
  /** List of ingredients with quantities */
  items: z.array(
    z.object({
      /** Quantity (e.g., "2 cups", "1 tbsp") */
      quantity: z.string().min(1).max(50),
      /** Ingredient name */
      name: z.string().min(1).max(100),
      /** Notes (e.g., "finely chopped") - use empty string if none */
      notes: z.string().max(80),
    })
  ).min(3).max(30),
})

export type Ingredients = z.infer<typeof IngredientsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INSTRUCTIONS SCHEMA
// Per documentation: H2 + 150-400 words numbered list
// More lenient validation to handle AI response variability
// ═══════════════════════════════════════════════════════════════════════════════

export const InstructionsSchema = z.object({
  /** Instructions H2 - REQUIRED */
  h2: z.string().min(3).max(100),
  /** Numbered steps */
  steps: z.array(
    z.object({
      /** Step number */
      number: z.number().int().min(1),
      /** Step instruction text - lenient to handle AI variability */
      text: z.string().min(5).max(800),
    })
  ).min(2).max(25),
})

export type Instructions = z.infer<typeof InstructionsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: NUTRITION TABLE SCHEMA
// Per documentation: H2 + 100 words table
// Made flexible with coerce for numbers to handle AI returning strings
// ═══════════════════════════════════════════════════════════════════════════════

export const NutritionTableSchema = z.object({
  /** Nutrition H2 - REQUIRED (relaxed to 60 chars for flexibility) */
  h2: z.string().min(3).max(60),
  /** Serving size */
  servingSize: z.string().min(1).max(100),
  /** Servings per recipe - coerce handles string numbers from AI */
  servings: z.coerce.number().int().min(1).max(100),
  /** Disclaimer - use empty string if none */
  disclaimer: z.string(),
  /** Nutrition facts - all values required for OpenAI structured output */
  facts: z.object({
    calories: z.coerce.number().min(0),
    totalFat: z.string(),
    saturatedFat: z.string(),
    cholesterol: z.string(),
    sodium: z.string(),
    carbohydrates: z.string(),
    fiber: z.string(),
    sugar: z.string(),
    protein: z.string(),
  }),
})

export type NutritionTable = z.infer<typeof NutritionTableSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: TIPS PARAGRAPH SCHEMA
// Per documentation: 150 words
// ═══════════════════════════════════════════════════════════════════════════════

export const TipsParagraphSchema = z.string().refine(
  (text) => isWithinWordRange(text, 150, 0.15),
  'Tips paragraph should be ~150 words'
)

// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO: MATERIALS BOX SCHEMA
// Per documentation: H2 (40-50 chars) + 20-120 words (5-15 bullets)
// ═══════════════════════════════════════════════════════════════════════════════

export const MaterialsBoxSchema = z.object({
  /** Materials/Requirements H2 (optional) */
  h2: z.string().min(3).max(150),
  /** Materials/Requirements list */
  items: z.array(
    z.object({
      /** Item name */
      name: z.string().min(1).max(150),
      /** Quantity or specs - use empty string if none */
      specs: z.string().max(150),
      /** Is this optional? */
      optional: z.boolean(),
    })
  ).min(2).max(25),
})

export type MaterialsBox = z.infer<typeof MaterialsBoxSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO: PRO TIPS SCHEMA
// Per documentation: 80-120 words (5-7 bullets)
// ═══════════════════════════════════════════════════════════════════════════════

export const ProTipsSchema = z.object({
  /** Section heading */
  h2: z.string().min(3).max(100).nullable(),
  /** Tips list */
  tips: z.array(z.string().min(5).max(200)).min(3).max(12),
})

export type ProTips = z.infer<typeof ProTipsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL: KEY TAKEAWAYS SCHEMA
// Per documentation: H2 (40-50 chars) + 50-75 words TL;DR box
// ═══════════════════════════════════════════════════════════════════════════════

export const KeyTakeawaysSchema = z.object({
  /** Key Takeaways H2 (optional) */
  h2: z.string().min(3).max(100),
  /** Takeaway bullets (3-7 items) */
  items: z.array(z.string().min(3).max(200)).min(2).max(10),
})

export type KeyTakeaways = z.infer<typeof KeyTakeawaysSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL: QUICK FACTS SCHEMA
// Per documentation: H2 (40-50 chars) + 80-100 words (5-7 bullets)
// ═══════════════════════════════════════════════════════════════════════════════

export const QuickFactsSchema = z.object({
  /** Quick Facts H2 (optional) */
  h2: z.string().min(3).max(100),
  /** Facts list */
  facts: z.array(
    z.object({
      /** Fact label */
      label: z.string().min(1).max(80),
      /** Fact value */
      value: z.string().min(1).max(200),
    })
  ).min(2).max(15),
})

export type QuickFacts = z.infer<typeof QuickFactsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL: WHY CHOOSE LOCAL SCHEMA
// Per documentation: H2 (40-50 chars) + 40-60 words list
// ═══════════════════════════════════════════════════════════════════════════════

export const WhyChooseLocalSchema = z.object({
  /** Why Choose Local H2 - REQUIRED */
  h2: z.string().min(5).max(100),
  /** Reasons list (3-8 reasons) */
  reasons: z.array(z.string().min(5).max(150)).min(2).max(10),
})

export type WhyChooseLocal = z.infer<typeof WhyChooseLocalSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL: SERVICE INFO SCHEMA
// Per documentation: H2 (40-50 chars) + 40-60 words from user settings
// ═══════════════════════════════════════════════════════════════════════════════

export const ServiceInfoSchema = z.object({
  /** Service Info H2 (optional) */
  h2: z.string().min(3).max(100),
  /** Service info rows - label/value pairs */
  rows: z.array(
    z.object({
      /** Row label (e.g., "Working Hours", "Phone") */
      label: z.string().min(1).max(50),
      /** Row value (e.g., "Monday-Friday 9AM-5PM") */
      value: z.string().min(1).max(200),
    })
  ).min(3).max(8),
})

export type ServiceInfo = z.infer<typeof ServiceInfoSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// LISTICLE: HONORABLE MENTIONS SCHEMA
// Per documentation: H2 (40-50 chars) + [H3 + 40-50w paragraph] × 3-4
// ═══════════════════════════════════════════════════════════════════════════════

export const HonorableMentionsSchema = z.object({
  /** Honorable Mentions H2 (optional) */
  h2: z.string().min(3).max(100),
  /** Mentions (2-6 items) */
  items: z.array(
    z.object({
      /** H3 heading */
      h3: z.string().min(3).max(80),
      /** Description (40-100 words) */
      description: z.string().min(20).max(600),
    })
  ).min(2).max(6),
})

export type HonorableMentions = z.infer<typeof HonorableMentionsSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL SCHEMAS AS UNION TYPE
// For generic component handling
// ═══════════════════════════════════════════════════════════════════════════════

export const UniqueComponentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('product-card'), data: ProductCardSchema }),
  z.object({ type: z.literal('feature-list'), data: FeatureListSchema }),
  z.object({ type: z.literal('cta-box'), data: CtaBoxSchema }),
  z.object({ type: z.literal('comparison-table'), data: ComparisonTableSchema }),
  z.object({ type: z.literal('pros-cons'), data: ProsConsSchema }),
  z.object({ type: z.literal('rating'), data: RatingContentSchema }),
  z.object({ type: z.literal('ingredients'), data: IngredientsSchema }),
  z.object({ type: z.literal('instructions'), data: InstructionsSchema }),
  z.object({ type: z.literal('nutrition-table'), data: NutritionTableSchema }),
  z.object({ type: z.literal('materials-box'), data: MaterialsBoxSchema }),
  z.object({ type: z.literal('pro-tips'), data: ProTipsSchema }),
  z.object({ type: z.literal('key-takeaways'), data: KeyTakeawaysSchema }),
  z.object({ type: z.literal('quick-facts'), data: QuickFactsSchema }),
  z.object({ type: z.literal('why-choose-local'), data: WhyChooseLocalSchema }),
  z.object({ type: z.literal('service-info'), data: ServiceInfoSchema }),
  z.object({ type: z.literal('honorable-mentions'), data: HonorableMentionsSchema }),
])

export type UniqueComponent = z.infer<typeof UniqueComponentSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA REGISTRY
// Map component types to their schemas for dynamic validation
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_SCHEMAS: Record<string, z.ZodType> = {
  'product-card': ProductCardSchema,
  'feature-list': FeatureListSchema,
  'cta-box': CtaBoxSchema,
  'comparison-table': ComparisonTableSchema,
  'pros-cons': ProsConsSchema,
  'rating-paragraph': RatingContentSchema,
  'ingredients': IngredientsSchema,
  'instructions': InstructionsSchema,
  'nutrition-table': NutritionTableSchema,
  'materials-box': MaterialsBoxSchema,
  'pro-tips': ProTipsSchema,
  'key-takeaways': KeyTakeawaysSchema,
  'quick-facts': QuickFactsSchema,
  'why-choose-local': WhyChooseLocalSchema,
  'service-info': ServiceInfoSchema,
  'honorable-mentions': HonorableMentionsSchema,
}

/**
 * Get the Zod schema for a component type
 */
export function getComponentSchema(componentType: string): z.ZodType | undefined {
  return COMPONENT_SCHEMAS[componentType]
}

/**
 * Validate component data against its schema
 */
export function validateComponentData(
  componentType: string,
  data: unknown
): { success: boolean; data?: unknown; errors?: z.ZodError } {
  const schema = getComponentSchema(componentType)
  if (!schema) {
    return {
      success: false, errors: new z.ZodError([{
        code: 'custom',
        message: `Unknown component type: ${componentType}`,
        path: ['type'],
      }])
    }
  }

  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
