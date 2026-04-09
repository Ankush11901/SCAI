/**
 * Image Generation Service
 * 
 * Modern image generation using Gemini 3 with:
 * - gemini-3-pro-image-preview for high-quality 2K image generation
 * - gemini-3-flash-preview for prompt orchestration and fact-checking
 * - Multi-step prompt orchestration (simple → detailed JSON → narrative)
 * - Fact-checking with Google Search grounding
 * - Product detection with Google Image Search for accurate product references
 * - Product image verification to ensure fetched images match the product
 * - Native imageConfig API for aspect ratio and 2K resolution
 * - Article-optimized prompts (no humans, no text)
 * 
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { GoogleGenAI } from "@google/genai"
import { getVerifiedProductReferenceImage } from "./google-image-search"
import { logAiUsageAsync, type CostTrackingContext } from "./cost-tracking-service"
import { generateFluxImage } from "./flux-image-generator"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Initialize the Google Gen AI client
const genai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
})

// Set to true to skip AI image generation and use placeholders
const SKIP_IMAGE_GENERATION = false

// Valid Gemini aspect ratios
// Reference: https://ai.google.dev/gemini-api/docs/image-generation#aspect-ratios-and-image-size
const VALID_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] as const
type ValidAspectRatio = typeof VALID_ASPECT_RATIOS[number]

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURED HERO IMAGE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Higher retry budget for featured/hero images (they're the article's face) */
const FEATURED_IMAGE_MAX_RETRIES = 4

/** Standard retry budget for H2/section images */
const STANDARD_IMAGE_MAX_RETRIES = 2

/** Negative prompts specifically for featured/hero images (stricter than H2) */
const FEATURED_HERO_NEGATIVE_PROMPTS = [
  'no text overlays',
  'no watermarks',
  'no logos',
  'no captions',
  'no labels',
  'no UI elements',
  'no poster-style typography',
  'no cluttered backgrounds',
  'no multiple competing subjects',
  'no cropped subjects at edges',
  'no abstract patterns as main subject',
] as const

// Aspect ratio to 2K dimensions mapping
const ASPECT_RATIO_2K_DIMENSIONS: Record<ValidAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 2048, height: 2048 },
  "2:3": { width: 1696, height: 2528 },
  "3:2": { width: 2528, height: 1696 },
  "3:4": { width: 1792, height: 2400 },
  "4:3": { width: 2400, height: 1792 },
  "4:5": { width: 1856, height: 2304 },
  "5:4": { width: 2304, height: 1856 },
  "9:16": { width: 1536, height: 2752 },
  "16:9": { width: 2752, height: 1536 },
  "21:9": { width: 3168, height: 1344 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTOREALISTIC IMPERFECTION SETTINGS (Anti-AI-Glow)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Photorealistic imperfection presets to combat the "AI glow" problem
 * These add organic qualities that make images feel less synthetic
 */
const PHOTOREALISTIC_IMPERFECTIONS = {
  // Subtle film/sensor characteristics
  filmGrain: 'subtle fine film grain visible in shadows and midtones, like ISO 400 film',
  sensorNoise: 'natural sensor noise in shadow areas, authentic digital camera feel',

  // Lens characteristics
  chromaticAberration: 'very slight chromatic aberration at frame edges',
  naturalVignette: 'subtle natural light falloff toward edges',
  lensCharacter: 'authentic lens rendering with natural micro-contrast',
  bokehImperfections: 'organic bokeh with slight edge fringing, not perfectly circular',

  // Surface/texture qualities
  microTexture: 'visible micro-texture variations on all surfaces',
  naturalWear: 'subtle signs of real-world use and natural wear patterns',
  organicImperfections: 'minor organic imperfections that exist in real photography',

  // Environmental authenticity
  dustMotes: 'occasional dust motes in light beams where appropriate',
  atmosphericHaze: 'subtle atmospheric haze for depth',
  naturalReflections: 'realistic reflections with slight imperfections',

  // Anti-AI specific
  avoidPerfection: 'avoid mathematically perfect symmetry and uniformity',
  avoidOverSmoothing: 'never over-smooth surfaces - maintain natural texture',
  avoidPlasticLook: 'avoid plastic or waxy appearance on any surface',
  avoidHyperSaturation: 'avoid hyper-saturated colors - keep natural color depth',
} as const

/**
 * Article-type-specific realism configurations
 * Different article types need different levels and types of organic imperfections
 */
interface RealismConfig {
  /** Overall realism approach description */
  approach: string
  /** Specific imperfections to emphasize */
  emphasize: string[]
  /** Rendering style (replaces "clean crisp") */
  renderingStyle: string
  /** Additional anti-AI instructions */
  antiAiNotes: string
}

const ARTICLE_REALISM_CONFIGS: Record<ArticleType, RealismConfig> = {
  affiliate: {
    approach: 'Lifestyle authenticity - images should feel like real photos taken in homes/environments, not studio catalog shots',
    emphasize: ['filmGrain', 'naturalVignette', 'microTexture', 'naturalWear', 'organicImperfections'],
    renderingStyle: 'organic textured with subtle film grain and natural light falloff',
    antiAiNotes: 'Products should look used/loved, not factory-fresh. Natural wear patterns. Authentic home lighting with warmth variations.'
  },
  commercial: {
    approach: 'Premium but authentic - high-end look without synthetic perfection',
    emphasize: ['lensCharacter', 'naturalVignette', 'microTexture', 'atmosphericHaze'],
    renderingStyle: 'refined with subtle lens character and natural depth',
    antiAiNotes: 'Premium feel through authentic quality, not artificial perfection. Natural material textures. Sophisticated but real.'
  },
  comparison: {
    approach: 'Clean but not sterile - consistent presentation with authentic product textures',
    emphasize: ['microTexture', 'sensorNoise', 'lensCharacter'],
    renderingStyle: 'neutral with visible surface textures and natural sensor characteristics',
    antiAiNotes: 'Even lighting should still show real material properties. Products look like actual photographs, not 3D renders.'
  },
  'how-to': {
    approach: 'Documentary authenticity - like real instructional photos taken during the process',
    emphasize: ['filmGrain', 'naturalReflections', 'microTexture', 'naturalWear', 'organicImperfections'],
    renderingStyle: 'documentary-style with natural grain and authentic workspace feel',
    antiAiNotes: 'Show real tools with wear marks. Workspaces should feel used. Natural hand-tool marks and material imperfections.'
  },
  informational: {
    approach: 'Editorial photography feel - professional but with photojournalistic authenticity',
    emphasize: ['filmGrain', 'naturalVignette', 'atmosphericHaze', 'lensCharacter'],
    renderingStyle: 'editorial with subtle film grain and journalistic quality',
    antiAiNotes: 'Like photos from a quality magazine - professional but clearly real photographs with natural depth and character.'
  },
  listicle: {
    approach: 'Consistent series with individual character - unified style but each image feels uniquely photographed',
    emphasize: ['filmGrain', 'microTexture', 'naturalVignette', 'bokehImperfections'],
    renderingStyle: 'cohesive series-style with subtle grain and natural bokeh variations',
    antiAiNotes: 'Each item should feel like a separate photo session. Slight variations in lighting warmth and grain between shots.'
  },
  local: {
    approach: 'Community authenticity - warm, real-world feel like local business photography',
    emphasize: ['filmGrain', 'naturalVignette', 'atmosphericHaze', 'dustMotes', 'naturalWear'],
    renderingStyle: 'warm authentic with visible grain and golden-hour natural falloff',
    antiAiNotes: 'Feel like a local photographer captured it. Natural environmental elements. Authentic regional character.'
  },
  recipe: {
    approach: 'Food photography realism - appetizing but authentic, not over-styled perfection',
    emphasize: ['microTexture', 'naturalReflections', 'lensCharacter', 'bokehImperfections'],
    renderingStyle: 'appetizing with natural food textures and soft authentic bokeh',
    antiAiNotes: 'Food should have natural surface variations - not plastic-perfect. Steam and moisture look real. Natural ingredient imperfections.'
  },
  review: {
    approach: 'Hands-on authenticity - products look examined and tested, not showroom-fresh',
    emphasize: ['filmGrain', 'microTexture', 'naturalWear', 'naturalReflections', 'organicImperfections'],
    renderingStyle: 'detailed with natural grain and authentic material rendering',
    antiAiNotes: 'Products look like they\'ve been handled and tested. Natural fingerprint-level detail. Real material wear patterns visible.'
  }
}

/**
 * Get the realism configuration for an article type
 */
export function getArticleRealismConfig(articleType: ArticleType): RealismConfig {
  return ARTICLE_REALISM_CONFIGS[articleType]
}

/**
 * Build the photorealistic imperfection clause for prompts
 */
function buildRealismClause(articleType?: ArticleType): string {
  const config = articleType ? ARTICLE_REALISM_CONFIGS[articleType] : null

  const baseClause = `
=== PHOTOREALISTIC AUTHENTICITY (Anti-AI-Glow) ===
This image MUST look like a real photograph, not AI-generated:

• TEXTURE: All surfaces must have visible micro-texture and natural material properties. No over-smoothed or plastic-looking surfaces.
• GRAIN: Include subtle film grain or sensor noise, especially visible in shadows and midtones (like ISO 400-800 film).
• LENS CHARACTER: Natural lens rendering with authentic depth - slight vignetting, organic bokeh, micro-contrast variations.
• IMPERFECTIONS: Include minor organic imperfections that exist in real photography - dust motes in light, slight reflections, natural wear.
• COLOR: Natural color depth and saturation - avoid hyper-saturated or artificially vibrant colors.
• LIGHTING: Natural light falloff and transitions - avoid perfectly uniform lighting.
• AVOID: Over-smoothing, plastic textures, mathematical perfection, synthetic glow, waxy surfaces, hyper-sharpness.`

  if (config) {
    return `${baseClause}

ARTICLE-SPECIFIC REALISM (${articleType}):
• Approach: ${config.approach}
• Rendering: ${config.renderingStyle}
• Key authenticity notes: ${config.antiAiNotes}`
  }

  return baseClause
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All supported article types in the system
 */
export type ArticleType =
  | 'affiliate'
  | 'commercial'
  | 'comparison'
  | 'how-to'
  | 'informational'
  | 'listicle'
  | 'local'
  | 'recipe'
  | 'review'

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended image types including article-specific specialized types
 * 
 * Base types:
 * - featured: Hero/banner image at top of article
 * - h2: Section images for standard H2 headings
 * - product: Product shots for e-commerce/affiliate
 * 
 * Specialized types:
 * - ingredient-flat-lay: Recipe ingredients overhead shot
 * - dish-hero: Recipe finished dish at 45° angle
 * - step-process: How-to step close-up (numbered)
 * - comparison-neutral: Side-by-side comparison ready
 * - local-service: Geographic/community context
 * - review-detail: Product detail/quality emphasis
 */
export type ImageType =
  | 'featured'
  | 'featured-hero'  // Hero image with stricter quality rules (for all article types)
  | 'h2'
  | 'product'
  // Recipe-specific
  | 'ingredient-flat-lay'
  | 'dish-hero'
  // How-To specific
  | 'step-process'
  // Comparison specific
  | 'comparison-neutral'
  // Local specific
  | 'local-service'
  // Review specific
  | 'review-detail'

interface ImageTypeConfig {
  geminiAspectRatio: ValidAspectRatio
  placeholderSize: string
  style: string
  subject: string
  description: string
}

// Map our image types to valid Gemini aspect ratios
// Note: All images use 16:9 landscape format for consistency
const IMAGE_TYPE_CONFIGS: Record<ImageType, ImageTypeConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // BASE TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  featured: {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Professional editorial photography, wide establishing shot that captures the essence of the topic',
    subject: 'The main subject of the article (animals, objects, food, etc.) in their natural environment or context. If the article is about cats, show cats. If about gardening, show the garden scene.',
    description: 'widescreen landscape'
  },
  // HERO IMAGE: Stricter quality rules for the article's primary visual
  'featured-hero': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Premium hero photography with clear subject hierarchy. Center-weighted composition that survives 16:9, 1.91:1, and 1:1 crops. High readability at small sizes with strong silhouette and uncluttered background.',
    subject: 'The EXACT main subject of the article prominently displayed. 1 primary subject + 0-2 supporting elements max. For reviews: the product MUST be unmistakably present and primary. For recipes: the finished dish. For how-to: the end result or key tool.',
    description: 'widescreen landscape hero'
  },
  h2: {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Editorial photography, focused composition showing the subject interacting with the topic',
    subject: 'Specific aspect of the topic with relevant subjects present. Show animals using products, objects in use, food being prepared, etc.',
    description: 'widescreen landscape'
  },
  product: {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Lifestyle product photography showing the product being used by the intended subject',
    subject: 'Product in active use by the relevant subject (e.g., cat using scratch post, dog playing with toy, plant in a pot). Show the product fulfilling its purpose.',
    description: 'widescreen landscape'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RECIPE-SPECIFIC TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  'ingredient-flat-lay': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Food photography flat-lay, bright natural lighting, organized mise en place',
    subject: 'Ingredients arranged aesthetically, prep bowls, measuring tools, wide composition',
    description: 'widescreen landscape'
  },
  'dish-hero': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Professional food photography, 45-degree hero angle, warm appetizing lighting',
    subject: 'Finished dish plated beautifully, garnishes visible, steam/freshness cues',
    description: 'widescreen landscape'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HOW-TO SPECIFIC TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  'step-process': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Instructional photography, close-up detail, clear visibility of action/technique',
    subject: 'Tools, materials, or result of the step in progress, educational angle',
    description: 'widescreen landscape'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPARISON SPECIFIC TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  'comparison-neutral': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Neutral product photography, identical lighting, unbiased presentation',
    subject: 'Single item on neutral background, consistent framing for side-by-side use',
    description: 'widescreen landscape'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOCAL SPECIFIC TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  'local-service': {
    geminiAspectRatio: '1:1',
    placeholderSize: '400x400',
    style: 'Local business photography, warm community feel, geographic context',
    subject: 'Service-related imagery, local landmarks, equipment/tools of the trade',
    description: 'square'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REVIEW SPECIFIC TYPES
  // ─────────────────────────────────────────────────────────────────────────────
  'review-detail': {
    geminiAspectRatio: '16:9',
    placeholderSize: '800x450',
    style: 'Product review photography showing THE EXACT PRODUCT being reviewed. The product must be clearly identifiable and the main focus.',
    subject: 'The specific product under review - its body, components, accessories, or interface. Must show recognizable product features. NO unrelated objects.',
    description: 'widescreen landscape'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE-TYPE-SPECIFIC STYLE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Style configuration for article-type-specific image generation
 * These presets are injected into the orchestration prompt to guide
 * the AI toward appropriate visual styles for each article type
 */
interface ArticleImageStyle {
  /** Primary visual style description */
  visualStyle: string
  /** Lighting recommendations */
  lighting: string
  /** Composition guidelines */
  composition: string
  /** Color/mood guidance */
  colorMood: string
  /** Default image type for H2 sections */
  defaultH2Type: ImageType
  /** Default image type for featured/hero */
  defaultFeaturedType: ImageType
  /** Special image types available for this article type */
  specialTypes: ImageType[]
  /** Step-specific guidance (for how-to) */
  stepGuidance?: string
  /** Additional constraints or notes */
  additionalNotes: string
  /** Photorealistic imperfection guidance to avoid AI-glow */
  realismGuidance: string
}

/**
 * Article-type-specific image style presets
 * Each article type has distinct visual needs based on its purpose
 */
export const ARTICLE_IMAGE_STYLES: Record<ArticleType, ArticleImageStyle> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // AFFILIATE: E-commerce product focus
  // ─────────────────────────────────────────────────────────────────────────────
  affiliate: {
    visualStyle: 'Lifestyle product photography showing products being actively used by the intended subject. If the product is for cats, show a cat using it. If for dogs, show a dog enjoying it. Products should feel aspirational and demonstrate real-world value.',
    lighting: 'Natural, warm lighting that feels authentic. Indoor scenes with window light, outdoor golden hour, or cozy ambient lighting. Avoid harsh studio lighting.',
    composition: 'Products shown in active use - animals interacting with pet products, items being utilized in their intended environment. Environmental storytelling with the subject as the focus.',
    colorMood: 'Warm, inviting color palettes. Natural environments with wood, plants, textiles. Aspirational but achievable lifestyle aesthetic.',
    defaultH2Type: 'product',
    defaultFeaturedType: 'featured',
    specialTypes: ['product'],
    additionalNotes: 'CRITICAL: Show products being USED by the relevant subject (animals, etc.). A cat scratch post should show a cat scratching it. A dog bed should show a dog sleeping in it. Help users visualize the product in action. Exception: No humans - use animals, objects, or environment only. Note: Product card images are from Amazon; this affects only AI-generated H2 images.',
    realismGuidance: 'Lifestyle authenticity with subtle film grain, natural light falloff, and visible product wear. Products should look used/loved in real homes, not factory-fresh catalog shots. Include natural environmental imperfections.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL: Brand/business focus
  // ─────────────────────────────────────────────────────────────────────────────
  commercial: {
    visualStyle: 'Corporate/brand photography that conveys professionalism, trust, and value. Aspirational imagery that supports business messaging.',
    lighting: 'Professional, balanced lighting. Can be more dramatic for premium feel. Golden hour or studio lighting for aspirational shots.',
    composition: 'Dynamic compositions that convey forward momentum and success. Use leading lines toward focal points. Balance between minimalism and visual interest.',
    colorMood: 'Brand-appropriate colors. Professional blues, greens for trust. Can use bolder accent colors. Confident, premium, aspirational mood.',
    defaultH2Type: 'h2',
    defaultFeaturedType: 'featured',
    specialTypes: ['h2', 'featured'],
    additionalNotes: 'Support the value proposition visually. Imagery should feel premium and trustworthy. Avoid generic stock photo feel.',
    realismGuidance: 'Premium but authentic - refined lens character with natural atmospheric depth. High-end look achieved through authentic quality, not artificial perfection. Subtle natural vignetting and sophisticated micro-textures.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPARISON: Neutral, consistent presentation
  // ─────────────────────────────────────────────────────────────────────────────
  comparison: {
    visualStyle: 'Neutral, unbiased product photography optimized for side-by-side comparison. Identical treatment across all items being compared.',
    lighting: 'Absolutely consistent lighting across all comparison images. Neutral white balance. Even, shadowless illumination.',
    composition: 'Identical framing, angle, and positioning for all items. Center-focused, consistent distance from camera. Same background throughout.',
    colorMood: 'Strictly neutral backgrounds (white or light gray). No color bias. Objective, analytical, fair presentation.',
    defaultH2Type: 'comparison-neutral',
    defaultFeaturedType: 'featured',
    specialTypes: ['comparison-neutral', 'product'],
    additionalNotes: 'CRITICAL: All comparison items must have identical visual treatment. No item should appear more favorable due to photography.',
    realismGuidance: 'Clean but not sterile - consistent presentation with authentic product textures and natural sensor characteristics. Products should look like actual photographs, not 3D renders. Real material properties must be visible.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HOW-TO: Instructional, step-by-step
  // ─────────────────────────────────────────────────────────────────────────────
  'how-to': {
    visualStyle: 'Instructional photography focused on clarity and education. Each image should teach something specific about the step.',
    lighting: 'Bright, even lighting with no harsh shadows obscuring details. Ensure all relevant elements are clearly visible.',
    composition: 'Close-up detail shots showing the action or technique. Overhead flat-lay for materials/tools. Eye-level for process shots.',
    colorMood: 'Clean, uncluttered backgrounds that don\'t distract from the instruction. Warm, approachable, helpful mood.',
    defaultH2Type: 'step-process',
    defaultFeaturedType: 'featured',
    specialTypes: ['step-process', 'h2'],
    stepGuidance: 'Each step image should clearly show: (1) the tools/materials being used, (2) the action being performed, (3) the result of that step. Progress should be visually evident.',
    additionalNotes: 'Images are teaching tools. Clarity trumps artistic style. Show the "how" not just the "what".',
    realismGuidance: 'Documentary authenticity like real instructional photos. Show tools with natural wear marks, workspaces that feel used. Film grain and authentic workspace feel. Natural hand-tool marks and material imperfections visible.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // INFORMATIONAL: Editorial, authoritative
  // ─────────────────────────────────────────────────────────────────────────────
  informational: {
    visualStyle: 'Editorial/documentary photography that supports comprehension. Authoritative, informative imagery that complements educational content.',
    lighting: 'Natural or balanced studio lighting. Professional but not overly stylized. Clarity and readability prioritized.',
    composition: 'Classic editorial compositions using rule of thirds. Balanced, professional framing. Can include conceptual/abstract elements.',
    colorMood: 'Professional, trustworthy color palette. Can vary based on topic. Informative, authoritative, accessible mood.',
    defaultH2Type: 'h2',
    defaultFeaturedType: 'featured',
    specialTypes: ['h2', 'featured'],
    additionalNotes: 'Images should support understanding of the topic. Avoid overly artistic interpretations that might confuse.',
    realismGuidance: 'Editorial photography feel with subtle film grain and journalistic quality. Like photos from a quality magazine - professional but clearly real photographs with natural depth, atmospheric haze, and authentic lens character.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LISTICLE: Varied but consistent series
  // ─────────────────────────────────────────────────────────────────────────────
  listicle: {
    visualStyle: 'Series photography with variety within a unified style. Each item gets individual attention while maintaining visual cohesion across the article.',
    lighting: 'Consistent lighting approach across all items. Can vary slightly to match individual item needs while keeping overall uniformity.',
    composition: 'Each item framed individually as a "mini hero shot". Consistent positioning and framing style throughout the series.',
    colorMood: 'Cohesive color treatment across the series. Can use accent colors per item while maintaining overall harmony. Engaging, scannable mood.',
    defaultH2Type: 'h2',
    defaultFeaturedType: 'featured',
    specialTypes: ['h2', 'product'],
    additionalNotes: 'Balance variety with consistency. Reader should recognize images as part of the same article/series.',
    realismGuidance: 'Consistent series with individual character - subtle grain and natural bokeh variations. Each item should feel like a separate photo session with slight variations in lighting warmth. Cohesive but authentically photographed.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOCAL: Geographic/community context
  // ─────────────────────────────────────────────────────────────────────────────
  local: {
    visualStyle: 'Local business/service photography with geographic context. Warm, trustworthy, community-oriented imagery.',
    lighting: 'Natural lighting preferred. Warm, inviting tones. Golden hour for outdoor service shots.',
    composition: 'Include geographic context clues when possible. Service equipment/tools prominently featured. Welcoming, approachable framing.',
    colorMood: 'Warm, earthy tones. Local/regional color associations when relevant. Trustworthy, approachable, community-focused mood.',
    defaultH2Type: 'h2',
    defaultFeaturedType: 'featured',
    specialTypes: ['local-service', 'h2'],
    additionalNotes: 'Convey "local presence" and trustworthiness. Service imagery should feel authentic, not generic stock.',
    realismGuidance: 'Community authenticity with warm film grain, golden-hour natural falloff, and dust motes in light beams. Feel like a local photographer captured it. Natural environmental elements, authentic regional character, and visible natural wear.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RECIPE: Food photography
  // ─────────────────────────────────────────────────────────────────────────────
  recipe: {
    visualStyle: 'Professional food photography following industry conventions. Appetizing, fresh, and instructional where needed.',
    lighting: 'Natural light or soft diffused lighting. Warm tones for finished dishes. Bright, even lighting for ingredients. Avoid harsh shadows on food.',
    composition: 'Overhead flat-lay for ingredients (mise en place). 45-degree hero angle for finished dishes. Close-ups for texture. Styled props (napkins, utensils) acceptable.',
    colorMood: 'Warm, appetizing colors. Fresh greens for vegetables. Rich browns for baked goods. Food should look delicious and fresh.',
    defaultH2Type: 'dish-hero',
    defaultFeaturedType: 'dish-hero',
    specialTypes: ['ingredient-flat-lay', 'dish-hero', 'step-process'],
    stepGuidance: 'For recipe steps: show ingredients being combined, cooking in progress, or technique being applied. Make it instructional.',
    additionalNotes: 'Food must look appetizing and fresh. Steam, garnishes, and freshness cues encouraged. Follow food photography best practices.',
    realismGuidance: 'Appetizing but authentic - natural food textures with soft authentic bokeh. Food should have natural surface variations, not plastic-perfect. Real steam and moisture. Natural ingredient imperfections like slight bruising on fruit or uneven edges.'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REVIEW: Product detail/quality focus
  // ─────────────────────────────────────────────────────────────────────────────
  review: {
    visualStyle: 'Product review photography emphasizing the EXACT PRODUCT being reviewed. The product MUST be clearly visible and recognizable in every image. Show detail, quality, and craftsmanship specific to that product.',
    lighting: 'Lighting that reveals textures, materials, and build quality. Can be more dramatic to highlight premium features.',
    composition: 'Mix of full product shots and detail close-ups. THE PRODUCT MUST BE THE CLEAR FOCUS. Show unique features, craftsmanship, and quality indicators of the specific product being reviewed.',
    colorMood: 'Lifestyle context acceptable for "in-use" shots. Studio shots for detail emphasis. Analytical, thorough, authentic mood.',
    defaultH2Type: 'review-detail',
    defaultFeaturedType: 'featured',
    specialTypes: ['review-detail', 'product', 'h2'],
    additionalNotes: 'CRITICAL FOR REVIEW IMAGES: The EXACT product being reviewed MUST be prominently visible in every H2 image. Do NOT show random objects, instruments, or unrelated items. If reviewing a PlayStation 5, show the PS5 console or its components (controller, interface, etc.). If reviewing headphones, show those headphones. ABSOLUTE NEGATIVES: no guitars, no musical instruments (unless reviewing one), no random electronics, no placeholder objects. The product identity must be unmistakable.',
    realismGuidance: 'Hands-on authenticity with film grain and authentic material rendering. Products should look examined and tested, not showroom-fresh. Natural fingerprint-level detail and real material wear patterns visible. Authentic reflections with slight imperfections.'
  }
}

/**
 * Get the recommended image type for a specific component within an article type
 */
export function getRecommendedImageType(
  articleType: ArticleType,
  componentType: 'featured' | 'h2' | 'step' | 'ingredient' | 'dish' | 'product' | 'comparison' | 'detail'
): ImageType {
  const style = ARTICLE_IMAGE_STYLES[articleType]

  switch (componentType) {
    case 'featured':
      return style.defaultFeaturedType
    case 'h2':
      return style.defaultH2Type
    case 'step':
      return articleType === 'how-to' || articleType === 'recipe' ? 'step-process' : 'h2'
    case 'ingredient':
      return 'ingredient-flat-lay'
    case 'dish':
      return 'dish-hero'
    case 'product':
      return 'product'
    case 'comparison':
      return 'comparison-neutral'
    case 'detail':
      return 'review-detail'
    default:
      return style.defaultH2Type
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Image generation provider selection
 * - gemini: Google Gemini 3 Pro Image (high quality, $0.13/image)
 * - flux: Flux 2 Dev via fal.ai (fast, ~$0.012/image)
 */
export type ImageProvider = 'gemini' | 'flux'

export interface ImageGenerationResult {
  url: string
  base64?: string
  mimeType?: string
  width?: number
  height?: number
}

/**
 * Detailed structured prompt for orchestration
 * Based on Gemini best practices for image generation
 */
interface DetailedImagePrompt {
  scene: {
    description: string
    environment: string
    timeOfDay: string
  }
  subject: {
    main: string
    details: string[]
    position: string
  }
  lighting: {
    type: string
    direction: string
    intensity: string
    color: string
  }
  composition: {
    style: string
    cameraAngle: string
    focusPoint: string
    depthOfField: string
  }
  colors: {
    palette: string[]
    dominantColor: string
    mood: string
  }
  style: {
    artistic: string
    quality: string
    rendering: string
  }
  technical: {
    resolution: string
    format: string
    additionalDetails: string
  }
  negative: {
    avoid: string[]
  }
}

/**
 * Fact-check result for internal use
 */
interface FactCheckResult {
  corrected: boolean
  corrections: {
    field: string
    original: string
    corrected: string
    reason: string
  }[]
  enrichments: string[]
  confidence: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT DETECTION TYPES & CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of product detection analysis
 */
interface ProductDetectionResult {
  /** Whether the prompt references a real, identifiable product */
  isRealProduct: boolean
  /** The specific product name/model identified (e.g., "iPhone 15 Pro Max") */
  productName: string
  /** Brand name if identified */
  brandName: string
  /** Optimized search query for finding reference images */
  searchQuery: string
  /** Confidence score 0-1 */
  confidence: number
  /** Reason for the classification */
  reason: string
}

/**
 * Product reference image data for image editing mode
 */
interface ProductReferenceData {
  base64: string
  mimeType: string
  sourceUrl: string
  width: number
  height: number
  productName: string
  /** Structured analysis of the product image from Gemini Flash */
  imageAnalysis?: ProductImageAnalysis
}

// In-memory cache for product detection results
const productDetectionCache = new Map<string, { result: ProductDetectionResult; timestamp: number }>()
const PRODUCT_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

/**
 * Get cache key for product detection
 */
function getProductCacheKey(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, '-').substring(0, 100)
}

/**
 * Check if we have a cached product detection result
 */
function getCachedProductDetection(prompt: string): ProductDetectionResult | null {
  const key = getProductCacheKey(prompt)
  const cached = productDetectionCache.get(key)

  if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
    console.log(`[ProductDetection] Cache hit for prompt`)
    return cached.result
  }

  return null
}

/**
 * Cache a product detection result
 */
function setCachedProductDetection(prompt: string, result: ProductDetectionResult): void {
  const key = getProductCacheKey(prompt)
  productDetectionCache.set(key, { result, timestamp: Date.now() })
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ORCHESTRATION CACHE
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory cache for orchestrated prompts
const promptOrchestrationCache = new Map<string, { result: DetailedImagePrompt; timestamp: number }>()
const PROMPT_CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * Get cache key for prompt orchestration
 */
function getPromptCacheKey(prompt: string, imageType: ImageType, articleType?: ArticleType): string {
  return `${imageType}:${articleType || 'generic'}:${prompt.toLowerCase().trim().replace(/\s+/g, '-').substring(0, 80)}`
}

/**
 * Check if we have a cached orchestrated prompt
 */
function getCachedOrchestration(prompt: string, imageType: ImageType, articleType?: ArticleType): DetailedImagePrompt | null {
  const key = getPromptCacheKey(prompt, imageType, articleType)
  const cached = promptOrchestrationCache.get(key)

  if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL) {
    console.log(`[PromptCache] Cache hit for orchestrated prompt`)
    return cached.result
  }

  return null
}

/**
 * Cache an orchestrated prompt
 */
function setCachedOrchestration(prompt: string, imageType: ImageType, articleType: ArticleType | undefined, result: DetailedImagePrompt): void {
  const key = getPromptCacheKey(prompt, imageType, articleType)
  promptOrchestrationCache.set(key, { result, timestamp: Date.now() })
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: PROMPT ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expand a simple user prompt into a detailed JSON structure
 * Uses gemini-3-flash-preview for fast orchestration
 * Following Gemini best practices: narrative descriptions > keyword lists
 * 
 * @param userPrompt - Simple description from user
 * @param context - Additional context (surrounding text)
 * @param imageType - Type of image (featured, h2, product, etc.)
 * @param articleType - Optional article type for style customization
 * @param stepNumber - Optional step number for how-to articles
 */
async function orchestratePrompt(
  userPrompt: string,
  context: string,
  imageType: ImageType,
  articleType?: ArticleType,
  stepNumber?: number,
  costTracking?: CostTrackingContext
): Promise<DetailedImagePrompt> {
  const config = IMAGE_TYPE_CONFIGS[imageType]

  // Get article-specific style guidance if available
  const articleStyle = articleType ? ARTICLE_IMAGE_STYLES[articleType] : null

  // Build article-specific guidance section
  const articleGuidance = articleStyle ? `
═══════════════════════════════════════════════════════════════════════════════
ARTICLE TYPE: ${articleType?.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

Visual Style: ${articleStyle.visualStyle}

Lighting Guidelines: ${articleStyle.lighting}

Composition Guidelines: ${articleStyle.composition}

Color & Mood: ${articleStyle.colorMood}

${articleStyle.stepGuidance && stepNumber ? `
Step-Specific Guidance (Step ${stepNumber}): ${articleStyle.stepGuidance}
` : ''}

Additional Notes: ${articleStyle.additionalNotes}

═══ PHOTOREALISTIC AUTHENTICITY (Anti-AI-Glow) ═══
Realism Guidance: ${articleStyle.realismGuidance}
═════════════════════════════════════════════════════════════════════════════
` : ''

  const systemPrompt = `You are an expert prompt engineer for Gemini image generation.

Your task: Take the user's simple prompt and expand it into a detailed, structured prompt that produces high-quality, professional images for blog articles.

Key guidelines (based on Google's best practices):
1. DESCRIBE THE SCENE, don't just list keywords - narrative descriptions produce better results
2. Be hyper-specific about lighting, camera angles, and composition
3. Include photography terms: lens types, shot types, lighting setups
4. Use "semantic negatives" (describe what you WANT, not just what you don't want)
5. For ${config.geminiAspectRatio} aspect ratio (${config.description}), optimize composition accordingly

Context:
- Image purpose: ${config.style}
- Subject focus: ${config.subject}
- Aspect ratio: ${config.geminiAspectRatio} (${config.description})
${articleGuidance}
⚠️ CRITICAL CONSTRAINTS FOR BLOG IMAGES:
- ABSOLUTELY NO HUMANS - no people, hands, faces, body parts, silhouettes
- ABSOLUTELY NO TEXT - no words, letters, signs, labels, logos, watermarks
- ABSOLUTELY NO AI GLOW - no over smoothing, no unnatural lighting effects
- INCLUDE RELEVANT SUBJECTS - if the article is about pets, show the animals. If about cats, show cats using/interacting with products. If about dogs, show dogs. Animals and objects are encouraged!
- Focus on objects, scenery, food close-ups, products, nature, architecture, and ANIMALS when relevant

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "scene": {
    "description": "detailed narrative scene description WITHOUT any humans but WITH relevant subjects (animals, objects, etc.)",
    "environment": "indoor/outdoor/studio/abstract",
    "timeOfDay": "morning/afternoon/golden hour/blue hour/night"
  },
  "subject": {
    "main": "main subject with specific details - INCLUDE animals if relevant (cats, dogs, etc.) but NO PEOPLE. If about cat products, show a cat. If about dog toys, show a dog.",
    "details": ["specific detail 1", "specific detail 2", "specific detail 3"],
    "position": "center/rule-of-thirds/golden ratio/leading lines",
    "interaction": "how the subject interacts with the product/topic (e.g., cat scratching post, dog playing with toy)"
  },
  "lighting": {
    "type": "natural/studio softbox/dramatic rim/diffused/golden hour/etc",
    "direction": "front/side/back/overhead/45-degree key",
    "intensity": "bright high-key/soft diffused/moody low-key/balanced",
    "color": "warm golden/cool blue/neutral daylight/warm tungsten"
  },
  "composition": {
    "style": "minimalist/dynamic/balanced/asymmetric/layered",
    "cameraAngle": "eye-level/slight low-angle/overhead flat-lay/dutch angle/worm's eye",
    "focusPoint": "where the viewer's eye should go first",
    "depthOfField": "shallow f/1.8/medium f/4/deep f/11"
  },
  "colors": {
    "palette": ["#hex1", "#hex2", "#hex3"],
    "dominantColor": "main color name",
    "mood": "warm/cool/vibrant/muted/earthy/pastel"
  },
  "style": {
    "artistic": "photorealistic/editorial/lifestyle/commercial/artistic/cinematic",
    "quality": "2K professional quality",
    "rendering": "organic textured with subtle film grain/soft with natural noise/authentic with lens character/warm with natural falloff - NEVER 'clean crisp' which looks AI-generated"
  },
  "technical": {
    "resolution": "2K with natural texture detail and subtle sensor grain",
    "format": "${config.description}",
    "additionalDetails": "photorealistic imperfections: film grain, natural vignette, micro-texture variations, authentic lens rendering"
  },
  "negative": {
    "avoid": ["humans", "people", "hands", "faces", "body parts", "text", "words", "letters", "signs", "logos", "watermarks", "labels", "ai glow", "over-smoothed surfaces", "plastic textures", "hyper-saturated colors", "mathematically perfect symmetry", "synthetic lighting", "waxy skin", "unnaturally clean surfaces"]
  }
}`

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3-flash-preview", // Fast model for orchestration
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser's prompt: "${userPrompt}"${context ? `\nContext: ${context}` : ""}` }],
        },
      ],
      config: {
        responseModalities: ["TEXT"],
        temperature: 0.7,
      },
    })

    // Log cost tracking for orchestration
    if (costTracking && response.usageMetadata) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: 'gemini',
        modelId: 'gemini-3-flash-preview',
        operationType: 'text',
        operationName: 'orchestratePrompt',
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
        success: true,
      })
    }

    const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Parse the JSON response
    let cleanedResponse = textResponse.trim()
    if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7)
    if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3)
    if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3)
    cleanedResponse = cleanedResponse.trim()

    return JSON.parse(cleanedResponse) as DetailedImagePrompt
  } catch (error) {
    console.error("[Orchestration] Failed to parse orchestrated prompt:", error)
    // Return a default structure if parsing fails
    return getDefaultPromptStructure(userPrompt, context, imageType)
  }
}

/**
 * Get default prompt structure when orchestration fails
 */
function getDefaultPromptStructure(
  userPrompt: string,
  context: string | undefined,
  imageType: ImageType
): DetailedImagePrompt {
  const config = IMAGE_TYPE_CONFIGS[imageType]
  return {
    scene: {
      description: context ? `${userPrompt}. ${context}` : userPrompt,
      environment: "studio",
      timeOfDay: "afternoon",
    },
    subject: {
      main: userPrompt,
      details: [],
      position: "center",
    },
    lighting: {
      type: "soft studio",
      direction: "front",
      intensity: "bright",
      color: "neutral",
    },
    composition: {
      style: "minimalist",
      cameraAngle: "eye-level",
      focusPoint: "center",
      depthOfField: "shallow",
    },
    colors: {
      palette: ["#FFFFFF", "#1A1A1A"],
      dominantColor: "neutral",
      mood: "professional",
    },
    style: {
      artistic: "photorealistic",
      quality: "2K",
      rendering: "organic textured with subtle film grain and natural imperfections",
    },
    technical: {
      resolution: "2K with natural texture detail",
      format: config.description,
      additionalDetails: "subtle film grain, natural vignette, authentic lens character",
    },
    negative: {
      avoid: ["humans", "people", "hands", "faces", "text", "words", "letters", "signs", "logos", "watermarks", "ai glow", "over-smoothed surfaces", "plastic textures", "hyper-saturated colors"],
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: FACT-CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fact-check and auto-correct the orchestrated prompt
 * Uses Google Search grounding to verify factual claims about:
 * - Tools & equipment (correct tool for the job)
 * - Procedures & techniques (proper methods, positioning)
 * - Products & objects (accurate appearances)
 * - Technical details (industry terminology)
 */
async function factCheckAndCorrect(
  prompt: DetailedImagePrompt,
  userPrompt: string,
  costTracking?: CostTrackingContext
): Promise<{ correctedPrompt: DetailedImagePrompt; factCheckResult: FactCheckResult }> {
  const systemPrompt = `You are a fact-checking expert for image generation prompts. Your job is to verify factual accuracy and correct any errors BEFORE an image is generated.

TASK: Analyze the image prompt below and verify ALL factual claims using your knowledge and Google Search. Look for:

1. TOOLS & EQUIPMENT
   - Is the right tool being used for the job?
   - Are tools depicted correctly? (correct shape, size, how they're held)
   - Safety equipment appropriate for the task?

2. PROCEDURES & TECHNIQUES  
   - Is the technique shown actually how professionals do it?
   - Are safety protocols being followed?

3. PRODUCTS & OBJECTS
   - Do real products/brands look as described?
   - Are materials depicted correctly? (wood grain, metal finish, fabric texture)
   - Are proportions realistic?

4. TECHNICAL ACCURACY
   - Industry-specific terminology correct?
   - Measurements/scales realistic?
   - Physical laws respected? (gravity, reflections, shadows)

USER'S ORIGINAL REQUEST: "${userPrompt}"

CURRENT PROMPT TO CHECK:
Scene: ${prompt.scene.description}
Environment: ${prompt.scene.environment}
Subject: ${prompt.subject.main}
Details: ${prompt.subject.details.join(", ")}
Additional: ${prompt.technical.additionalDetails}

Respond with a JSON object (no markdown):
{
  "needsCorrection": true/false,
  "corrections": [
    {
      "field": "scene.description" or "subject.main" or "subject.details" or "technical.additionalDetails",
      "original": "the original text",
      "corrected": "the factually accurate replacement",
      "reason": "brief explanation of why this is more accurate"
    }
  ],
  "enrichments": [
    "Additional verified facts that should be included for accuracy"
  ],
  "confidence": 0.0-1.0
}

If everything is factually accurate, return: {"needsCorrection": false, "corrections": [], "enrichments": [], "confidence": 1.0}

Be conservative - only correct clear factual errors, not stylistic choices.`

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3-flash-preview", // Fast model with search grounding
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: {
        responseModalities: ["TEXT"],
        temperature: 0.3, // Low temperature for factual accuracy
        tools: [{ googleSearch: {} }], // Enable Google Search grounding
      },
    })

    // Log cost tracking for fact-checking
    if (costTracking && response.usageMetadata) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: 'gemini',
        modelId: 'gemini-3-flash-preview',
        operationType: 'text',
        operationName: 'factCheckAndCorrect',
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
        success: true,
      })
    }

    const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Parse the JSON response
    let cleanedResponse = textResponse.trim()
    if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7)
    if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3)
    if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3)
    cleanedResponse = cleanedResponse.trim()

    const factCheck = JSON.parse(cleanedResponse) as {
      needsCorrection: boolean
      corrections: { field: string; original: string; corrected: string; reason: string }[]
      enrichments: string[]
      confidence: number
    }

    // Apply corrections to the prompt
    const correctedPrompt = JSON.parse(JSON.stringify(prompt)) as DetailedImagePrompt

    if (factCheck.needsCorrection && factCheck.corrections.length > 0) {
      for (const correction of factCheck.corrections) {
        if (correction.field === "scene.description") {
          correctedPrompt.scene.description = correction.corrected
        } else if (correction.field === "subject.main") {
          correctedPrompt.subject.main = correction.corrected
        } else if (correction.field === "subject.details") {
          if (correction.corrected.includes(",")) {
            correctedPrompt.subject.details = correction.corrected.split(",").map(s => s.trim())
          } else {
            correctedPrompt.subject.details = correctedPrompt.subject.details.map(d =>
              d.toLowerCase().includes(correction.original.toLowerCase()) ? correction.corrected : d
            )
          }
        } else if (correction.field === "technical.additionalDetails") {
          correctedPrompt.technical.additionalDetails = correction.corrected
        }

        console.log(`[FactCheck] Corrected ${correction.field}: "${correction.original}" → "${correction.corrected}" (${correction.reason})`)
      }
    }

    // Apply enrichments to additionalDetails
    if (factCheck.enrichments.length > 0) {
      const existingDetails = correctedPrompt.technical.additionalDetails || ""
      const enrichmentText = factCheck.enrichments.join(". ")
      correctedPrompt.technical.additionalDetails = existingDetails
        ? `${existingDetails}. ${enrichmentText}`
        : enrichmentText
      console.log(`[FactCheck] Added enrichments: ${enrichmentText}`)
    }

    return {
      correctedPrompt,
      factCheckResult: {
        corrected: factCheck.needsCorrection,
        corrections: factCheck.corrections,
        enrichments: factCheck.enrichments,
        confidence: factCheck.confidence,
      },
    }
  } catch (error) {
    // If fact-checking fails, return original prompt unchanged
    console.warn("[FactCheck] Fact-check failed, using original prompt:", error)
    return {
      correctedPrompt: prompt,
      factCheckResult: {
        corrected: false,
        corrections: [],
        enrichments: [],
        confidence: 0,
      },
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2.5: PRODUCT DETECTION & REFERENCE IMAGE FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if the prompt references a real-world product that requires
 * a reference image for accurate visual representation.
 * 
 * Uses Gemini with Google Search grounding to identify:
 * - Specific branded products (iPhone 15 Pro, Samsung Galaxy S24, etc.)
 * - Named tech gadgets with distinct appearances
 * - Identifiable consumer products with specific designs
 * 
 * Does NOT match:
 * - Generic product categories ("a smartphone", "a laptop")
 * - Fictional/conceptual products
 * - Products the AI can accurately imagine (common tools, food, etc.)
 */
async function detectRealProduct(
  prompt: string,
  context?: string,
  costTracking?: CostTrackingContext
): Promise<ProductDetectionResult> {
  // Check cache first
  const cached = getCachedProductDetection(prompt)
  if (cached) {
    return cached
  }

  // Get current date for context - so Gemini knows what "now" is
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const systemPrompt = `You are a product identification expert with access to Google Search. Analyze the following prompt to determine if it references a SPECIFIC, REAL-WORLD PRODUCT that has a distinct, recognizable visual appearance.

CURRENT DATE: ${currentDate}

TASK: Determine if the image prompt requires a reference image of a real product for accurate generation.

PROMPT TO ANALYZE: "${prompt}"
${context ? `ADDITIONAL CONTEXT: "${context}"` : ''}

IMPORTANT: Use Google Search to verify:
1. Whether this product EXISTS and is RELEASED (not just announced/rumored)
2. What the product actually looks like (to generate an accurate search query)
3. The official product name

CRITERIA FOR "IS A REAL PRODUCT" (all must be true):
1. It's a SPECIFIC branded product with a model name/number (e.g., "iPhone 16 Pro Max", "MacBook Pro M3", "Tesla Model Y")
2. The product has been OFFICIALLY RELEASED and is available (use Google Search to verify!)
3. The product has a DISTINCT visual design that requires accurate representation
4. Visual accuracy is IMPORTANT to the image quality

SEARCH QUERY GUIDELINES:
- For RELEASED products: Use "[product name] official product photo" or "[product name] press image"
- NEVER use terms like "leak", "render", "concept", "rumor", "expected", "upcoming"
- Include the brand name for better results
- Example good queries:
  - "iPhone 16 Pro official product photo"
  - "Samsung Galaxy S24 Ultra press image"
  - "MacBook Air M3 official Apple photo"

EXAMPLES OF REAL PRODUCTS (should detect):
- "iPhone 16" → YES if released, search: "iPhone 16 official Apple product photo"
- "Samsung Galaxy S24 Ultra" → YES, search: "Samsung Galaxy S24 Ultra official press image"
- "PS5 DualSense controller" → YES, search: "PS5 DualSense controller official Sony photo"

EXAMPLES OF NON-PRODUCTS (should NOT detect):
- "a smartphone on a desk" → NO (generic, not specific model)
- "laptop showing code" → NO (any laptop works)
- "wireless headphones" → NO (generic category)
- Products that are only ANNOUNCED but not RELEASED → NO (wait until release)

Respond with ONLY a valid JSON object (no markdown):
{
  "isRealProduct": true/false,
  "productName": "exact official product name if identified, empty string if not",
  "brandName": "brand name if identified, empty string if not",
  "searchQuery": "optimized Google image search query for finding OFFICIAL product photos (never leaks/renders), empty if not a real product",
  "confidence": 0.0-1.0,
  "reason": "brief explanation including whether product is released based on Google Search"
}

Be CONSERVATIVE - only return isRealProduct: true for products that are actually released and available.`

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: {
        responseModalities: ["TEXT"],
        temperature: 0.2, // Low temperature for consistent classification
        tools: [{ googleSearch: {} }], // Enable Google Search for product verification
      },
    })

    // Log cost tracking for product detection
    if (costTracking && response.usageMetadata) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: 'gemini',
        modelId: 'gemini-3-flash-preview',
        operationType: 'text',
        operationName: 'detectRealProduct',
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
        success: true,
      })
    }

    const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Parse the JSON response
    let cleanedResponse = textResponse.trim()
    if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7)
    if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3)
    if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3)
    cleanedResponse = cleanedResponse.trim()

    const result = JSON.parse(cleanedResponse) as ProductDetectionResult

    console.log(`[ProductDetection] Result for "${prompt.substring(0, 50)}...":`, {
      isRealProduct: result.isRealProduct,
      productName: result.productName,
      confidence: result.confidence,
      reason: result.reason
    })

    // Cache the result
    setCachedProductDetection(prompt, result)

    return result
  } catch (error) {
    console.warn("[ProductDetection] Detection failed:", error)
    // Default to not a real product if detection fails
    return {
      isRealProduct: false,
      productName: "",
      brandName: "",
      searchQuery: "",
      confidence: 0,
      reason: "Detection failed, falling back to standard generation"
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT IMAGE ANALYSIS (Gemini Flash Vision)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze a product reference image using Gemini Flash to describe its
 * pose, orientation, size, background, and key visual features.
 * This gives the image generation model concrete instructions on how to
 * adapt the product for a lifestyle scene.
 *
 * Cost: ~$0.00008 per call (560 input tokens + ~50 output tokens)
 */
interface ProductImageAnalysis {
  /** The main product to focus on (ignoring accessories/attachments in composite images) */
  mainSubject: string
  /** Key visual features: color, shape, material, distinguishing details */
  appearance: string
  /** Current pose/orientation in the reference image */
  pose: string
  /** Approximate real-world size */
  size: string
  /** Whether image is a composite (multiple angles/views) or single product shot */
  isComposite: boolean
  /** If composite, which part of the image shows the main product */
  compositeHint?: string
  /** Specific pose/orientation the product should have in the target scene */
  suggestedPose: string
}

async function analyzeProductImage(
  base64: string,
  mimeType: string,
  productName: string,
  sceneDescription: string,
  costTracking?: CostTrackingContext,
): Promise<ProductImageAnalysis | null> {
  if (!GEMINI_API_KEY) return null

  try {
    console.log(`[ImageGen] 🔍 Analyzing product reference image for "${productName}"...`)

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `Analyze this product image and return JSON. Product name: ${productName}

TARGET SCENE: ${sceneDescription}

Return ONLY valid JSON with these fields:
{
  "mainSubject": "Brief description of the MAIN product only (ignore accessories, attachments, extra angles)",
  "appearance": "Key visual features: color, shape, material, distinguishing details",
  "pose": "Current orientation in this image (e.g. standing upright, angled 45 degrees, front-facing, laying flat)",
  "size": "Approximate real-world dimensions (e.g. 20cm tall, fits in one hand)",
  "isComposite": true/false,
  "compositeHint": "If composite: describe where the main product is (e.g. 'center of image', 'largest item on the right'). Omit if not composite.",
  "suggestedPose": "How this product should be positioned/oriented in the target scene to look natural. Be VERY specific about angle, rotation, and placement. Example: 'Lay the headphones flat on their left side on the table, earcups facing up, headband curving away from camera' or 'Standing upright on the countertop with the control panel facing the camera at a slight 15-degree angle'"
}

IMPORTANT:
- Many Amazon product images are composites showing the product from multiple angles with accessories. Identify the MAIN PRODUCT only.
- For suggestedPose: consider how a real person would place this product in the target scene. Products should NOT stay in their Amazon product-photo pose. Be explicit about rotation, tilt, and which side faces the camera.`,
          },
        ],
      }],
      config: {
        responseModalities: ["TEXT"],
        temperature: 0.1,
        maxOutputTokens: 350,
      },
    })

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (rawText && rawText.length > 20) {
      // Parse JSON from response (handle markdown code blocks)
      const jsonStr = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      try {
        const analysis = JSON.parse(jsonStr) as ProductImageAnalysis
        console.log(`[ImageGen] ✅ Product image analysis: main="${analysis.mainSubject}", composite=${analysis.isComposite}`)

        if (costTracking) {
          const usage = (response as any).usageMetadata
          logAiUsageAsync({
            historyId: costTracking.historyId,
            userId: costTracking.userId,
            bulkJobId: costTracking.bulkJobId,
            provider: 'gemini',
            modelId: 'gemini-2.0-flash',
            operationType: 'text',
            operationName: 'analyzeProductImage',
            inputTokens: usage?.promptTokenCount || 560,
            outputTokens: usage?.candidatesTokenCount || 80,
            success: true,
          })
        }

        return analysis
      } catch {
        console.warn(`[ImageGen] Failed to parse product image analysis JSON: ${rawText.substring(0, 100)}`)
        return null
      }
    }

    console.warn(`[ImageGen] Product image analysis returned empty/short response`)
    return null
  } catch (error) {
    console.error(`[ImageGen] Product image analysis failed:`, error)
    return null
  }
}

/**
 * Build a product placement prompt that uses a reference image
 * to accurately render the product in a new scene/context.
 *
 * This follows Gemini's image editing pattern:
 * - Reference image provides accurate product appearance
 * - Prompt describes the new scene/context
 * - AI places the product in the new scene while preserving its visual identity
 */
function buildProductPlacementPrompt(
  productReference: ProductReferenceData,
  detailedPrompt: DetailedImagePrompt,
  imageType: ImageType,
  articleType?: ArticleType
): string {
  const config = IMAGE_TYPE_CONFIGS[imageType]
  const articleStyle = articleType ? ARTICLE_IMAGE_STYLES[articleType] : null

  const analysis = productReference.imageAnalysis

  // Build subject identification block for composite Amazon images
  const subjectBlock = analysis ? `
"subject_identification": {
  "main_product": "${analysis.mainSubject}",
  "appearance": "${analysis.appearance}",
  "current_pose_in_reference": "${analysis.pose}",
  "real_world_size": "${analysis.size}",
  "is_composite_image": ${analysis.isComposite},
  ${analysis.isComposite && analysis.compositeHint ? `"focus_on": "${analysis.compositeHint}",` : ''}
  "instruction": "The reference image may show multiple angles, accessories, or attachments. Focus ONLY on the main product described above. Ignore all other items, secondary views, and accessories."
},` : `
"subject_identification": {
  "main_product": "${productReference.productName}",
  "instruction": "Use only the main product from the reference image. Ignore any accessories or secondary items."
},`

  // Explicit pose instruction from Gemini's scene-aware analysis
  const poseInstruction = analysis?.suggestedPose
    ? `"CRITICAL_pose_instruction": "DO NOT keep the product in its Amazon photo pose. Instead: ${analysis.suggestedPose.replace(/"/g, '\\"')}",`
    : ''

  return `{
"task": "product_placement",
"reference_image": "attached above",
${subjectBlock}
${poseInstruction}
"product_rules": {
  "match_design": "Match the reference product's design, colors, proportions, and details exactly",
  "repose": "${analysis?.suggestedPose ? analysis.suggestedPose.replace(/"/g, '\\"') : 'REPOSE the product naturally for the scene — change orientation, angle, and position so it looks naturally placed, NOT copy-pasted in its reference pose'}",
  "integrate": "Seamlessly integrate with scene lighting, shadows, and perspective — must look like a real photograph",
  "scale": "Show at REALISTIC real-world size relative to other objects"
},
"scene": {
  "description": "${detailedPrompt.scene.description.replace(/"/g, '\\"')}",
  "environment": "${detailedPrompt.scene.environment.replace(/"/g, '\\"')}",
  "time_of_day": "${detailedPrompt.scene.timeOfDay.replace(/"/g, '\\"')}",
  "product_position": "${detailedPrompt.subject.position.replace(/"/g, '\\"')}",
  "details": ${JSON.stringify(detailedPrompt.subject.details)}
},
"lighting": {
  "type": "${detailedPrompt.lighting.type}",
  "direction": "${detailedPrompt.lighting.direction}",
  "intensity": "${detailedPrompt.lighting.intensity}",
  "color": "${detailedPrompt.lighting.color}"
},
"composition": {
  "style": "${detailedPrompt.composition.style}",
  "camera_angle": "${detailedPrompt.composition.cameraAngle}",
  "focus_point": "${detailedPrompt.composition.focusPoint}",
  "depth_of_field": "${detailedPrompt.composition.depthOfField}"
},
"style": {
  "artistic": "${detailedPrompt.style.artistic}",
  "quality": "${detailedPrompt.style.quality}",
  "rendering": "${detailedPrompt.style.rendering}",
  "color_palette": ${JSON.stringify(detailedPrompt.colors.palette)},
  "color_mood": "${detailedPrompt.colors.mood}",
  "format": "${config.description} (${config.geminiAspectRatio})"${articleStyle ? `,\n  "article_style": "${articleStyle.visualStyle}"` : ''}
},
"do_not": [
  "Do not include humans, hands, faces, or body parts",
  "Do not add new text, watermarks, or overlays not on the original product",
  "Do not remove or alter text, logos, or labels that are part of the product's design",
  "Do not generate a generic or different version of the product",
  "Do not reproduce multiple angles or accessories from a composite reference — show only ONE product in ONE natural pose"${detailedPrompt.negative.avoid.length > 0 ? `,\n  ${detailedPrompt.negative.avoid.map(a => `"Avoid: ${a.replace(/"/g, '\\"')}"`).join(',\n  ')}` : ''}
]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: BUILD NARRATIVE PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert the detailed JSON into a rich, descriptive prompt for image generation
 * Following Gemini best practices: narrative descriptions > keyword lists
 * Now includes photorealistic imperfection guidance to combat AI-glow
 * Enhanced for featured-hero images with stricter quality requirements
 */
function buildNarrativePrompt(detailed: DetailedImagePrompt, imageType: ImageType, articleType?: ArticleType): string {
  const config = IMAGE_TYPE_CONFIGS[imageType]
  const realismClause = buildRealismClause(articleType)

  // Check if this is a featured/hero image (needs stricter constraints)
  const isFeaturedHero = imageType === 'featured' || imageType === 'featured-hero'

  // Build featured hero constraints if applicable
  const featuredHeroConstraints = isFeaturedHero ? `
═══ FEATURED HERO IMAGE REQUIREMENTS ═══
This is the article's HERO image - the single most important visual. Apply these strict rules:

COMPOSITION REQUIREMENTS:
• Clear subject hierarchy: 1 primary subject + 0-2 supporting elements maximum
• Center-weighted composition that survives 16:9, 1.91:1, and 1:1 crops
• High readability at small sizes with strong silhouette
• Uncluttered background with moderate contrast
• Primary subject must occupy significant frame space (not a tiny element in a vast scene)

QUALITY REQUIREMENTS:
• Photoreal by default (unless article type requests illustration)
• No abstract/surreal styles for review or product-focused articles
• Clean, professional look suitable for social sharing and OG images

HERO-SPECIFIC NEGATIVES (STRICTLY ENFORCED):
${FEATURED_HERO_NEGATIVE_PROMPTS.map(neg => `• ${neg}`).join('\n')}
` : ''

  const prompt = `A ${detailed.style.artistic} ${detailed.style.quality} photograph in ${config.geminiAspectRatio} (${config.description}) format.

${detailed.scene.description}. The scene takes place in a ${detailed.scene.environment} setting during ${detailed.scene.timeOfDay}, creating a ${detailed.colors.mood} atmosphere.

The main subject is ${detailed.subject.main}, captured using ${detailed.subject.position} composition.${detailed.subject.details.length > 0 ? ` Notable details include ${detailed.subject.details.join(", ")}.` : ""}

The lighting is ${detailed.lighting.type}, coming from the ${detailed.lighting.direction} with ${detailed.lighting.intensity} intensity. The ${detailed.lighting.color} color temperature adds warmth and dimension to the scene.

Shot with a ${detailed.composition.cameraAngle} angle, the composition is ${detailed.composition.style}. The focus draws attention to ${detailed.composition.focusPoint} with ${detailed.composition.depthOfField} depth of field.

Color palette: ${detailed.colors.palette.join(", ")} with ${detailed.colors.dominantColor} as the dominant tone. The overall rendering is ${detailed.style.rendering} with ${detailed.technical.resolution} detail.

${detailed.technical.additionalDetails ? `Additional details: ${detailed.technical.additionalDetails}` : ""}

${realismClause}
${featuredHeroConstraints}
=== CRITICAL CONSTRAINTS ===
⚠️ ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, arms, legs, body parts, silhouettes, or shadows of humans. If the subject involves human activities (cooking, crafting, etc.), show ONLY the objects, tools, ingredients, or finished product.

⚠️ ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, captions, titles, brand names, or any form of writing anywhere in the image.

${detailed.negative.avoid.length > 0 ? `Explicitly avoid: ${detailed.negative.avoid.join(", ")}.` : ""}

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.`

  return prompt
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for image generation
 */
export interface GenerateImageOptions {
  /** Simple description of what to generate */
  prompt: string
  /** Additional context (e.g., surrounding text) */
  context?: string
  /** Number of retry attempts (default: 2) */
  maxRetries?: number
  /** Type of image: 'featured', 'h2', 'product', or specialized types */
  imageType?: ImageType
  /** Article type for style customization */
  articleType?: ArticleType
  /** Step number for how-to/recipe articles */
  stepNumber?: number
  /** Cost tracking context for logging AI usage */
  costTracking?: CostTrackingContext
  /** Image generation provider: 'gemini' or 'flux' (default: 'flux') */
  imageProvider?: ImageProvider
}

/**
 * Fetch an image from URL and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    let mimeType = 'image/jpeg'
    if (contentType.includes('png')) mimeType = 'image/png'
    else if (contentType.includes('webp')) mimeType = 'image/webp'
    else if (contentType.includes('gif')) mimeType = 'image/gif'

    return { base64, mimeType }
  } catch (error) {
    console.error(`[ImageGen] Error fetching source image:`, error)
    return null
  }
}

/**
 * Generate an image using Gemini 3 Pro with multi-step prompt orchestration
 * 
 * Pipeline:
 * 1. Orchestrate: Expand simple prompt → detailed JSON structure (with article-type style guidance)
 * 2. Fact-check: Verify and correct factual accuracy
 * 3. Build: Convert JSON → rich narrative prompt
 * 4. Generate: Call Gemini 3 Pro Image with native imageConfig
 * 
 * @param prompt - Simple description of what to generate
 * @param context - Additional context (e.g., surrounding text)
 * @param maxRetries - Number of retry attempts (default: 2)
 * @param imageType - Type of image: 'featured', 'h2', 'product', or specialized types
 * @param articleType - Optional article type for style customization
 * @param stepNumber - Optional step number for how-to/recipe articles
 */
export async function generateImage(
  prompt: string,
  context?: string,
  maxRetries: number = 2,
  imageType: ImageType = 'h2',
  articleType?: ArticleType,
  stepNumber?: number,
  sourceImageUrl?: string,
  costTracking?: CostTrackingContext,
  imageProvider: ImageProvider = 'flux',
  sourceProductName?: string,
): Promise<ImageGenerationResult> {
  const imageGenStartTime = Date.now()

  // If using Flux and no Gemini key, we can still proceed (Flux uses FAL_KEY)
  const needsGeminiKey = imageProvider === 'gemini' || !process.env.FAL_KEY

  // Skip AI generation if disabled - use placeholders directly
  if (SKIP_IMAGE_GENERATION || (needsGeminiKey && !GEMINI_API_KEY)) {
    if (needsGeminiKey && !GEMINI_API_KEY) {
      console.warn('GOOGLE_GENERATIVE_AI_API_KEY not set, using placeholder')
    }
    return { url: getPlaceholderUrl(prompt, imageType) }
  }

  // Check if this is a featured/hero image - use higher retry budget
  const isFeaturedHero = imageType === 'featured' || imageType === 'featured-hero'
  const effectiveMaxRetries = isFeaturedHero ? FEATURED_IMAGE_MAX_RETRIES : (maxRetries || STANDARD_IMAGE_MAX_RETRIES)

  if (isFeaturedHero) {
    console.log(`[ImageGen] 🌟 FEATURED HERO IMAGE: Using higher quality settings (${effectiveMaxRetries} retries)`)
  }

  // Auto-select image type based on article type if not specified or using default 'h2'
  let effectiveImageType = imageType
  if (articleType && imageType === 'h2') {
    const articleStyle = ARTICLE_IMAGE_STYLES[articleType as ArticleType]
    if (articleStyle?.defaultH2Type) {
      effectiveImageType = articleStyle.defaultH2Type
      console.log(`[ImageGen] Auto-selected image type '${effectiveImageType}' for article type '${articleType}'`)
    } else {
      console.log(`[ImageGen] No style found for article type '${articleType}', using default 'h2'`)
    }
  }

  const config = IMAGE_TYPE_CONFIGS[effectiveImageType]
  let lastError: Error | null = null

  try {
    let detailedPrompt: DetailedImagePrompt
    let correctedPrompt: DetailedImagePrompt
    let productReference: ProductReferenceData | null = null

    {
      // ─────────────────────────────────────────────────────────────────────────
      // STEP 1: Orchestrate the prompt (with caching)
      // ─────────────────────────────────────────────────────────────────────────
      console.log(`[ImageGen] Step 1: Orchestrating prompt for "${prompt.substring(0, 50)}..."`)
      if (articleType) {
        console.log(`[ImageGen] Using article-type style guidance: ${articleType}`)
      }

      // Check cache first
      const cachedPrompt = getCachedOrchestration(prompt, effectiveImageType, articleType)
      if (cachedPrompt) {
        detailedPrompt = cachedPrompt
        console.log(`[ImageGen] Using cached orchestrated prompt`)
      } else {
        detailedPrompt = await orchestratePrompt(prompt, context || "", effectiveImageType, articleType, stepNumber, costTracking)
        // Cache the result
        setCachedOrchestration(prompt, effectiveImageType, articleType, detailedPrompt)
        console.log(`[ImageGen] Orchestrated prompt structure:`, JSON.stringify(detailedPrompt, null, 2).substring(0, 500) + "...")
      }

      // ─────────────────────────────────────────────────────────────────────────
      // STEP 2 & 2.5: Fact-check AND Product detection IN PARALLEL
      // ─────────────────────────────────────────────────────────────────────────
      console.log(`[ImageGen] Step 2: Running fact-check and product detection...`)

      // If source image provided, use it directly (bypass detection)
      if (sourceImageUrl) {
        console.log(`[ImageGen] Using provided source image URL: ${sourceImageUrl.substring(0, 50)}...`)
        const imageData = await fetchImageAsBase64(sourceImageUrl)
        if (imageData) {
          productReference = {
            base64: imageData.base64,
            mimeType: imageData.mimeType,
            sourceUrl: sourceImageUrl,
            width: 1024,
            height: 1024,
            productName: sourceProductName || prompt
          }
          console.log(`[ImageGen] ✅ Converted source image to reference data`)
        } else {
          console.warn(`[ImageGen] Failed to fetch source image, falling back to detection`)
        }
      }

      const [factCheckRes, productDetection, imageAnalysis] = await Promise.all([
        factCheckAndCorrect(detailedPrompt, prompt, costTracking),
        !productReference ? detectRealProduct(prompt, context, costTracking) : Promise.resolve({
          isRealProduct: false,
          productName: "",
          brandName: "",
          searchQuery: "",
          confidence: 0,
          reason: "Skipped - source image provided"
        } as ProductDetectionResult),
        // Analyze the product reference image to understand pose/orientation/size + suggest natural pose for scene
        productReference
          ? analyzeProductImage(productReference.base64, productReference.mimeType, productReference.productName, detailedPrompt.scene.description, costTracking)
          : Promise.resolve(null),
      ])

      // Attach image analysis to product reference for use in prompt building
      if (productReference && imageAnalysis) {
        productReference.imageAnalysis = imageAnalysis
      }

      correctedPrompt = factCheckRes.correctedPrompt
      const factCheckResult = factCheckRes.factCheckResult

      if (factCheckResult.corrected) {
        console.log(`[ImageGen] Applied ${factCheckResult.corrections.length} correction(s), confidence: ${factCheckResult.confidence}`)
      } else {
        console.log(`[ImageGen] No corrections needed, confidence: ${factCheckResult.confidence}`)
      }

      // Handle product detection result
      // For review articles, use lower confidence threshold (0.5) since product accuracy is critical
      const confidenceThreshold = articleType === 'review' ? 0.5 : 0.7
      const isReviewArticle = articleType === 'review'

      if (productDetection.isRealProduct && productDetection.confidence >= confidenceThreshold) {
        console.log(`[ImageGen] Real product detected: "${productDetection.productName}" (confidence: ${productDetection.confidence})`)
        console.log(`[ImageGen] Searching for VERIFIED reference image: "${productDetection.searchQuery}"`)

        // Fetch and VERIFY reference image from Google Image Search
        // This ensures the image actually shows the product (prevents "guitar for PS5" issues)
        const referenceImage = await getVerifiedProductReferenceImage(
          productDetection.searchQuery,
          3 // Try up to 3 images before giving up
        )

        if (referenceImage) {
          productReference = {
            ...referenceImage,
            productName: productDetection.productName
          }
          console.log(`[ImageGen] ✅ VERIFIED product reference image from: ${referenceImage.sourceUrl.substring(0, 50)}...`)
        } else {
          console.log(`[ImageGen] No verified reference image found, falling back to standard generation`)
          // For review articles without reference, add explicit product anchoring to the prompt
          if (isReviewArticle && productDetection.productName) {
            console.log(`[ImageGen] Review article: Adding explicit product anchoring for "${productDetection.productName}"`)
            correctedPrompt.subject.main = `${productDetection.productName} - ${correctedPrompt.subject.main}`
            correctedPrompt.subject.details = [
              `The ${productDetection.productName} must be clearly visible and recognizable`,
              ...correctedPrompt.subject.details
            ]
            correctedPrompt.negative.avoid = [
              ...correctedPrompt.negative.avoid,
              'guitars', 'musical instruments (unless reviewing one)', 'random electronics', 'unrelated products', 'placeholder objects'
            ]
          }
        }
      } else {
        console.log(`[ImageGen] No real product detected (or low confidence), using standard generation`)
        // For review articles, still try to anchor to the topic even without product detection
        if (isReviewArticle) {
          console.log(`[ImageGen] Review article: Adding topic anchoring to prevent drift`)
          // Extract potential product name from prompt/context
          const topicMatch = context?.match(/about\s+(.+?)(?:\.|,|$)/i) || prompt.match(/^(.+?)(?:\s+review|\s+performance|\s+design|\s+features)/i)
          const inferredProduct = topicMatch?.[1]?.trim()
          if (inferredProduct) {
            correctedPrompt.subject.main = `${inferredProduct} - ${correctedPrompt.subject.main}`
            console.log(`[ImageGen] Inferred product for anchoring: "${inferredProduct}"`)
          }
          correctedPrompt.negative.avoid = [
            ...correctedPrompt.negative.avoid,
            'guitars', 'musical instruments (unless reviewing one)', 'random electronics', 'unrelated products', 'placeholder objects'
          ]
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Build prompt (narrative or product-placement)
    // ─────────────────────────────────────────────────────────────────────────
    let finalPrompt: string
    let useProductReferenceMode = false

    if (productReference) {
      console.log(`[ImageGen] Step 3: Building product placement prompt with reference image...`)
      finalPrompt = buildProductPlacementPrompt(productReference, correctedPrompt, effectiveImageType, articleType)
      useProductReferenceMode = true
    } else {
      console.log(`[ImageGen] Step 3: Building narrative prompt...`)
      finalPrompt = buildNarrativePrompt(correctedPrompt, effectiveImageType, articleType)
    }
    console.log(`[ImageGen] Prompt built (${useProductReferenceMode ? 'product-reference' : 'narrative'} mode):`, finalPrompt.substring(0, 300) + "...")

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Generate image with selected provider
    // ─────────────────────────────────────────────────────────────────────────

    // ═══ FLUX DEV PATH ═══
    if (imageProvider === 'flux') {
      console.log(`[ImageGen] Step 4: Generating image with Flux 2 (via fal.ai)...`)

      // Build Flux generation options
      const fluxOptions: Parameters<typeof generateFluxImage>[0] = {
        prompt: finalPrompt,
        aspectRatio: config.geminiAspectRatio,
        maxRetries: effectiveMaxRetries,
        costTracking,
        imageType: effectiveImageType,
        articleType,
      }

      // Pass reference image for product placement (image-to-image via Flux 2 Edit)
      if (useProductReferenceMode && productReference) {
        console.log(`[ImageGen] Flux Edit mode: Using reference image for "${productReference.productName}"`)
        fluxOptions.referenceImageBase64 = productReference.base64
        fluxOptions.editIntent = 'placement'
      }

      const fluxResult = await generateFluxImage(fluxOptions)

      return fluxResult
    }

    // ═══ GEMINI PATH ═══
    console.log(`[ImageGen] Step 4: Generating image with Gemini 3 Pro...`)
    for (let attempt = 1; attempt <= effectiveMaxRetries; attempt++) {
      try {
        let promptForAttempt = finalPrompt
        if (attempt > 1) {
          promptForAttempt = `IMPORTANT: Previous attempt may have included text or humans. Ensure ABSOLUTELY NO TEXT AND NO HUMANS.\n\n${finalPrompt}`
        }

        console.log(`[ImageGen] Step 4: Generating image (attempt ${attempt}/${effectiveMaxRetries}) with gemini-3-pro-image-preview...`)
        console.log(`[ImageGen] Mode: ${useProductReferenceMode ? 'Product Reference (image editing)' : 'Standard Generation'}`)

        // Build content parts based on mode
        type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } }
        const contentParts: ContentPart[] = []

        if (useProductReferenceMode && productReference) {
          // Product reference mode: [prompt, reference image] per Gemini docs
          // TEXT FIRST, then IMAGE for image editing
          contentParts.push({ text: promptForAttempt })
          contentParts.push({
            inlineData: {
              mimeType: productReference.mimeType,
              data: productReference.base64,
            },
          })
        } else {
          // Standard mode: just text prompt
          contentParts.push({ text: promptForAttempt })
        }

        // Use Gemini 3 Pro Image with native imageConfig for aspect ratio and 2K resolution
        const response = await genai.models.generateContent({
          model: "gemini-3-pro-image-preview", // Gemini 3 Pro for best quality
          contents: [{ role: "user", parts: contentParts }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            // Native image configuration for aspect ratio and 2K resolution
            imageConfig: {
              aspectRatio: config.geminiAspectRatio,
              imageSize: "1K",
            },
          },
        })

        // Extract image from response
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const base64 = part.inlineData.data
              const mimeType = part.inlineData.mimeType || "image/png"

              // Validate base64
              const base64Length = base64.length || 0
              const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(base64)

              console.log(`[ImageGen] Image generated on attempt ${attempt}:`)
              console.log(`  - MIME type: ${mimeType}`)
              console.log(`  - Base64 length: ${base64Length} characters`)
              console.log(`  - Is valid base64: ${isValidBase64}`)

              if (!isValidBase64 || base64Length < 100) {
                console.error(`[ImageGen] WARNING: Base64 appears invalid or too short!`)
                lastError = new Error('Invalid base64 data')
                continue
              }

              // Get dimensions from aspect ratio
              const dimensions = ASPECT_RATIO_2K_DIMENSIONS[config.geminiAspectRatio]

              // Log successful image generation cost
              if (costTracking) {
                logAiUsageAsync({
                  historyId: costTracking.historyId,
                  userId: costTracking.userId,
                  bulkJobId: costTracking.bulkJobId,
                  provider: 'gemini',
                  modelId: 'gemini-3-pro-image-preview',
                  operationType: 'image',
                  operationName: 'generateImage',
                  imageCount: 1,
                  durationMs: Date.now() - imageGenStartTime,
                  success: true,
                  metadata: { imageType: effectiveImageType, articleType, attempt },
                })
              }

              return {
                url: `data:${mimeType};base64,${base64}`,
                base64,
                mimeType,
                width: dimensions.width,
                height: dimensions.height,
              }
            }
          }
        }

        // No image in response, try again
        console.warn(`[ImageGen] No image in response on attempt ${attempt}, retrying...`)
        lastError = new Error('No image in response')
      } catch (error) {
        console.error(`[ImageGen] Generation failed on attempt ${attempt}:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
      }

      // Wait before retrying (exponential backoff)
      if (attempt < effectiveMaxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  } catch (error) {
    console.error(`[ImageGen] Pipeline failed:`, error)
    lastError = error instanceof Error ? error : new Error('Unknown error')
  }

  // All retries failed, return placeholder
  console.error(`[ImageGen] Image generation failed after ${effectiveMaxRetries} attempts:`, lastError)
  return { url: getPlaceholderUrl(prompt, effectiveImageType) }
}

/**
 * Generate an image using the options object pattern
 * More convenient for complex configurations
 */
export async function generateImageWithOptions(options: GenerateImageOptions): Promise<ImageGenerationResult> {
  return generateImage(
    options.prompt,
    options.context,
    options.maxRetries ?? 2,
    options.imageType ?? 'h2',
    options.articleType,
    options.stepNumber,
    undefined, // sourceImageUrl
    options.costTracking,
    options.imageProvider ?? 'flux'
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a placeholder URL based on image type
 */
function getPlaceholderUrl(prompt: string, imageType: ImageType = 'h2'): string {
  const config = IMAGE_TYPE_CONFIGS[imageType]
  const cleanPrompt = prompt
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .substring(0, 30)
    .trim()
    .replace(/\s+/g, '+')

  return `https://placehold.co/${config.placeholderSize}/e5e7eb/6b7280?text=${cleanPrompt || 'Image'}`
}

/**
 * Generate multiple images for an article with article-type awareness
 */
export async function generateArticleImages(
  sections: Array<{
    heading: string
    content?: string
    imageType?: ImageType
    stepNumber?: number
  }>,
  articleType?: ArticleType
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  // Generate images sequentially to avoid rate limits
  for (const section of sections) {
    const result = await generateImage(
      section.heading,
      section.content,
      2,
      section.imageType,
      articleType,
      section.stepNumber
    )
    imageMap.set(section.heading, result.url)
  }

  return imageMap
}

/**
 * Generate a complete set of images for a specific article type
 * Automatically uses the recommended image types for each component
 */
export async function generateArticleTypeImages(
  articleType: ArticleType,
  components: Array<{
    componentType: 'featured' | 'h2' | 'step' | 'ingredient' | 'dish' | 'product' | 'comparison' | 'detail'
    prompt: string
    context?: string
    stepNumber?: number
  }>
): Promise<Map<string, ImageGenerationResult>> {
  const imageMap = new Map<string, ImageGenerationResult>()

  for (const component of components) {
    const recommendedType = getRecommendedImageType(articleType, component.componentType)

    const result = await generateImage(
      component.prompt,
      component.context,
      2,
      recommendedType,
      articleType,
      component.stepNumber
    )

    imageMap.set(component.prompt, result)
  }

  return imageMap
}
