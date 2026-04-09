/**
 * AI Structured Content Generation Service
 * 
 * Uses Vercel AI SDK's generateObject() for structured content generation.
 * Generates specific components like product cards, feature lists, etc.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelWithFallback, executeWithFallback, type AIProvider, type ModelTier } from './providers'
import { logAiUsageAsync, type CostTrackingContext } from '@/lib/services/cost-tracking-service'
import { correctGrammar, correctGrammarBatch } from './grammar-checker'
import {
  ProductCardSchema,
  FeatureListSchema,
  CtaBoxSchema,
  ComparisonTableSchema,
  ProsConsSchema,
  RatingContentSchema,
  IngredientsSchema,
  InstructionsSchema,
  NutritionTableSchema,
  MaterialsBoxSchema,
  ProTipsSchema,
  KeyTakeawaysSchema,
  QuickFactsSchema,
  WhyChooseLocalSchema,
  HonorableMentionsSchema,
  type ProductCard,
  type FeatureList,
  type ProsCons,
  type Ingredients,
  type Instructions,
  type KeyTakeaways,
} from './schemas'
import {
  COMPONENT_SYSTEM_PROMPT,
  buildProductCardPrompt,
  buildFeatureListPrompt,
  buildCtaBoxPrompt,
  buildComparisonTablePrompt,
  buildProsConsPrompt,
  buildRatingPrompt,
  buildIngredientsPrompt,
  buildInstructionsPrompt,
  buildNutritionPrompt,
  buildMaterialsPrompt,
  buildProTipsPrompt,
  buildQuickFactsPrompt,
  buildWhyChooseLocalPrompt,
  buildHonorableMentionsPrompt,
} from './prompts/component-prompts'
import {
  CONTENT_SYSTEM_PROMPT,
  buildFaqAnswersPrompt,
  buildKeyTakeawaysPrompt,
  buildQuickVerdictPrompt,
  buildTopicOverviewPrompt,
  type RecipeContextForPrompt,
  type ReviewContextForPrompt,
} from './prompts/content-prompts'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateComponentResult<T> {
  success: boolean
  data?: T
  error?: string
  duration: number
}

interface BaseGenerateParams {
  provider?: AIProvider
  modelTier?: ModelTier
  costTracking?: CostTrackingContext
}

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE: PRODUCT CARDS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateProductCardsParams extends BaseGenerateParams {
  topic: string
  primaryKeyword: string
  productCount: number
  priceRange?: string
}

/**
 * Generate product cards for affiliate articles
 */
export async function generateProductCards(
  params: GenerateProductCardsParams
): Promise<GenerateComponentResult<ProductCard[]>> {
  const startTime = Date.now()
  const { topic, primaryKeyword, productCount, priceRange, provider, modelTier = 'default', costTracking } = params

  const badges = ['Best Overall', 'Best Value', 'Premium Pick', 'Editor\'s Choice', 'Budget Pick']
  const cards: ProductCard[] = []

  try {
    for (let i = 0; i < productCount; i++) {
      const { result } = await executeWithFallback(
        async (model) => {
          return generateObject({
            model,
            schema: ProductCardSchema,
            system: COMPONENT_SYSTEM_PROMPT,
            prompt: buildProductCardPrompt({
              topic,
              primaryKeyword,
              productIndex: i,
              totalProducts: productCount,
              badge: badges[i % badges.length],
              priceRange,
            }),
            temperature: 0.7,
          })
        },
        { preferredProvider: provider, tier: modelTier, operationName: `generateProductCard-${i}`, costTracking }
      )

      cards.push(result.object)
    }

    return {
      success: true,
      data: cards,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Product card generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: FEATURE LIST
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateFeatureListParams extends BaseGenerateParams {
  topic: string
  primaryKeyword: string
  productOrService: string
  coreKeywords?: string[]
}

/**
 * Generate feature list for commercial articles
 */
export async function generateFeatureList(
  params: GenerateFeatureListParams
): Promise<GenerateComponentResult<FeatureList>> {
  const startTime = Date.now()
  const { topic, primaryKeyword, productOrService, provider, modelTier = 'fast', coreKeywords, costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: FeatureListSchema,
          system: COMPONENT_SYSTEM_PROMPT,
          prompt: buildFeatureListPrompt({ topic, primaryKeyword, productOrService, coreKeywords }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateFeatureList', costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    console.error('[generateFeatureList] Error:', error)
    // Log more details for debugging schema validation issues
    if (error instanceof Error && error.message.includes('schema')) {
      console.error('[generateFeatureList] Schema validation failed. Check if AI output matches FeatureListSchema.')
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Feature list generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW: PROS & CONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateProsConsParams extends BaseGenerateParams {
  topic: string
  primaryKeyword: string
  productName: string
  titleFormat?: 'question' | 'statement' | 'listicle'
  coreKeywords?: string[]
}

/**
 * Generate pros and cons for review articles
 */
export async function generateProsCons(
  params: GenerateProsConsParams
): Promise<GenerateComponentResult<ProsCons>> {
  const startTime = Date.now()
  const { topic, primaryKeyword, productName, provider, modelTier = 'fast', titleFormat = 'statement', coreKeywords, costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: ProsConsSchema,
          system: COMPONENT_SYSTEM_PROMPT,
          prompt: buildProsConsPrompt({ topic, primaryKeyword, productName, titleFormat, coreKeywords }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateProsCons', costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pros/cons generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INGREDIENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateIngredientsParams extends BaseGenerateParams {
  recipeTopic: string
  primaryKeyword: string
  servings?: number
  titleFormat?: 'question' | 'statement' | 'listicle'
}

/**
 * Generate ingredients list for recipe articles
 */
export async function generateIngredients(
  params: GenerateIngredientsParams
): Promise<GenerateComponentResult<Ingredients>> {
  const startTime = Date.now()
  const { recipeTopic, primaryKeyword, servings = 4, provider, modelTier = 'fast', titleFormat, costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: IngredientsSchema,
          system: COMPONENT_SYSTEM_PROMPT,
          prompt: buildIngredientsPrompt({ recipeTopic, primaryKeyword, servings, titleFormat }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateIngredients', costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ingredients generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateInstructionsParams extends BaseGenerateParams {
  recipeTopic: string
  primaryKeyword: string
  ingredients: string[]
  titleFormat?: 'question' | 'statement' | 'listicle'
}

/**
 * Generate cooking instructions for recipe articles
 */
export async function generateInstructions(
  params: GenerateInstructionsParams
): Promise<GenerateComponentResult<Instructions>> {
  const startTime = Date.now()
  const { recipeTopic, primaryKeyword, ingredients, provider, modelTier = 'fast', titleFormat, costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: InstructionsSchema,
          system: COMPONENT_SYSTEM_PROMPT,
          prompt: buildInstructionsPrompt({ recipeTopic, primaryKeyword, ingredients, titleFormat }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateInstructions', costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Instructions generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ ANSWERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateFaqAnswersParams extends BaseGenerateParams {
  topic: string
  primaryKeyword: string
  questions: string[]
  articleType: string
  tone?: string
  recipeContext?: RecipeContextForPrompt
  reviewContext?: ReviewContextForPrompt
}

/**
 * Generate FAQ answers (28 words each)
 */
export async function generateFaqAnswers(
  params: GenerateFaqAnswersParams
): Promise<GenerateComponentResult<string[]>> {
  const startTime = Date.now()
  const { topic, primaryKeyword, questions, articleType, tone, provider, modelTier = 'fast', recipeContext, reviewContext, costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: z.object({ answers: z.array(z.string()) }),
          system: CONTENT_SYSTEM_PROMPT,
          prompt: buildFaqAnswersPrompt({ topic, primaryKeyword, questions, articleType, tone, recipeContext, reviewContext }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateFaqAnswers', costTracking }
    )

    return {
      success: true,
      data: result.object.answers,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'FAQ answers generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL: KEY TAKEAWAYS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateKeyTakeawaysParams extends BaseGenerateParams {
  topic: string
  primaryKeyword: string
  h1: string
  mainH2s: string[]
}

/**
 * Generate key takeaways for informational articles
 */
export async function generateKeyTakeaways(
  params: GenerateKeyTakeawaysParams
): Promise<GenerateComponentResult<KeyTakeaways>> {
  const startTime = Date.now()
  const { topic, primaryKeyword, h1, mainH2s, provider, modelTier = 'fast', costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: KeyTakeawaysSchema,
          system: CONTENT_SYSTEM_PROMPT,
          prompt: buildKeyTakeawaysPrompt({ topic, primaryKeyword, h1, mainH2s }),
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: 'generateKeyTakeaways', costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Key takeaways generation failed',
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC COMPONENT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate any unique component by type
 */
export async function generateUniqueComponent<T>(params: {
  componentType: string
  schema: z.ZodType<T>
  prompt: string
  provider?: AIProvider
  modelTier?: ModelTier
  costTracking?: CostTrackingContext
}): Promise<GenerateComponentResult<T>> {
  const startTime = Date.now()
  const { componentType, schema, prompt, provider, modelTier = 'fast', costTracking } = params

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema,
          system: COMPONENT_SYSTEM_PROMPT,
          prompt,
          temperature: 0.7,
        })
      },
      { preferredProvider: provider, tier: modelTier, operationName: `generate-${componentType}`, costTracking }
    )

    return {
      success: true,
      data: result.object,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `${componentType} generation failed`,
      duration: Date.now() - startTime,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE CAPTION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an AI-powered caption for an image
 * Captions should be descriptive, contextual, and engaging (40-120 characters)
 */
export async function generateImageCaption(params: {
  imageDescription: string
  articleTopic: string
  sectionContext?: string
  imageType?: 'featured' | 'h2' | 'product' | 'local-service' | 'step-process'
  provider?: AIProvider
  costTracking?: CostTrackingContext
}): Promise<GenerateComponentResult<string>> {
  const startTime = Date.now()
  const { imageDescription, articleTopic, sectionContext, imageType = 'h2', provider, costTracking } = params

  const CaptionSchema = z.object({
    caption: z.string().min(40).max(120).describe('Image caption (40-120 chars)')
  })

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateObject({
          model,
          schema: CaptionSchema,
          system: `You are an expert at writing engaging image captions for blog articles.
Captions should:
- Be descriptive and add context beyond the visible content
- Be concise (40-120 characters)
- Use natural, readable language
- Avoid starting with "A photo of..." or "An image showing..."
- Connect the image to the article topic when relevant`,
          prompt: `Generate a caption for this image in an article about "${articleTopic}".

Image: ${imageDescription}
${sectionContext ? `Section context: ${sectionContext}` : ''}
Image type: ${imageType}

Write a caption that describes what readers see and why it matters to the article.`,
          temperature: 0.8,
        })
      },
      { preferredProvider: provider, tier: 'fast', operationName: 'generateImageCaption', costTracking }
    )

    return {
      success: true,
      data: result.object.caption,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    // Fallback to a simple caption if AI fails
    return {
      success: true,
      data: imageDescription.substring(0, 100),
      duration: Date.now() - startTime,
    }
  }
}
