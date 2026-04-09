/**
 * Component Definitions
 * Universal and unique components for article generation
 */

export interface ComponentDefinition {
  id: string
  name: string
  type: 'universal' | 'unique'
  required: boolean
  articleTypes?: string[] // Only for unique components
  constraints: {
    maxLength?: number
    minLength?: number
    wordCount?: { min: number; max: number }
  }
  variations: number
  description: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL COMPONENTS (appear in all article types)
// Full list based on new rules-guidelines documentation
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIVERSAL_COMPONENTS: ComponentDefinition[] = [
  // Core Required Components (5)
  {
    id: 'h1',
    name: 'H1 Title',
    type: 'universal',
    required: true,
    constraints: { maxLength: 60 },
    variations: 3, // Question, Statement, Listicle
    description: 'Article title (60 chars max). 3 types: Question, Statement, Listicle. Exactly 1 per article.',
  },
  {
    id: 'featured-image',
    name: 'Featured Image',
    type: 'universal',
    required: true,
    constraints: {},
    variations: 1,
    description: 'Hero image generated from H1. 16:9 aspect ratio (800x450).',
  },
  {
    id: 'overview-paragraph',
    name: 'Overview Paragraph',
    type: 'universal',
    required: true,
    constraints: { wordCount: { min: 100, max: 100 } },
    variations: 1,
    description: '100 words (2×50 sub-paragraphs). Elaborates on H1.',
  },
  {
    id: 'h2',
    name: 'H2 Heading',
    type: 'universal',
    required: true,
    constraints: { maxLength: 60 },
    variations: 3,
    description: 'Section heading (60 chars). Must match H1 type format.',
  },
  {
    id: 'standard-paragraph',
    name: 'Standard Paragraph',
    type: 'universal',
    required: true,
    constraints: { wordCount: { min: 150, max: 150 } },
    variations: 1,
    description: '150 words (3×50 sub-paragraphs). Elaborates on H2.',
  },
  // Optional Toggleable Components (11)
  {
    id: 'h2-image',
    name: 'H2 Section Image',
    type: 'universal',
    required: false,
    constraints: {},
    variations: 1,
    description: 'Optional image after H2 heading. 2:1 aspect ratio (800x400).',
  },
  {
    id: 'closing-h2',
    name: 'Closing H2',
    type: 'universal',
    required: false,
    constraints: { maxLength: 50 },
    variations: 3,
    description: 'Final section heading (50 chars max). Never use "Conclusion" etc.',
  },
  {
    id: 'closing-paragraph',
    name: 'Closing Paragraph',
    type: 'universal',
    required: false,
    constraints: { wordCount: { min: 50, max: 50 } },
    variations: 1,
    description: '50 words. Reinforces main value without summary phrases.',
  },
  {
    id: 'faq',
    name: 'FAQ Section',
    type: 'universal',
    required: false,
    constraints: { wordCount: { min: 140, max: 140 }, maxLength: 30 }, // H2 max 30 chars
    variations: 3,
    description: 'FAQ H2 (30 chars) + 5 H3 questions (30-60 chars) + 28-word answers each = 140 words total.',
  },
  {
    id: 'meta-title',
    name: 'Meta Title',
    type: 'universal',
    required: false,
    constraints: { minLength: 50, maxLength: 60 },
    variations: 1,
    description: '50-60 characters. Contains keyword, no colons. Eye-catching for clicks.',
  },
  {
    id: 'meta-description',
    name: 'Meta Description',
    type: 'universal',
    required: false,
    constraints: { minLength: 140, maxLength: 160 },
    variations: 1,
    description: '140-160 characters. Never identical to H1. Natural keyword integration.',
  },
  {
    id: 'toc',
    name: 'Table of Contents',
    type: 'universal',
    required: false,
    constraints: {},
    variations: 3,
    description: 'Auto-generated from H2s. Jump links to sections.',
  },
  {
    id: 'featured-image-alt',
    name: 'Featured Image Alt Text',
    type: 'universal',
    required: false,
    constraints: { minLength: 100, maxLength: 125 },
    variations: 1,
    description: '100-125 characters. Includes keyword naturally. No "Image of" prefix.',
  },
  {
    id: 'h2-image-alt',
    name: 'H2 Image Alt Text',
    type: 'universal',
    required: false,
    constraints: { minLength: 80, maxLength: 100 },
    variations: 1,
    description: '80-100 characters. Contextual match to H2 topic. Uses LSI keywords.',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// UNIQUE COMPONENTS (specific to certain article types)
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIQUE_COMPONENTS: ComponentDefinition[] = [
  // Affiliate
  {
    id: 'product-card',
    name: 'Product Card',
    type: 'unique',
    required: true,
    articleTypes: ['affiliate'],
    constraints: {},
    variations: 3,
    description: 'Product display with image, details, and Amazon button',
  },

  // Commercial
  {
    id: 'feature-list',
    name: 'Feature List',
    type: 'unique',
    required: true,
    articleTypes: ['commercial'],
    constraints: { wordCount: { min: 100, max: 120 } },
    variations: 3,
    description: 'List of product/service features (5-7 bullets)',
  },
  {
    id: 'cta-box',
    name: 'CTA Box',
    type: 'unique',
    required: true,
    articleTypes: ['commercial'],
    constraints: { wordCount: { min: 20, max: 30 } },
    variations: 3,
    description: 'Call-to-action box with button',
  },

  // Comparison
  {
    id: 'topic-overview',
    name: 'Topic Overview',
    type: 'unique',
    required: true,
    articleTypes: ['comparison'],
    constraints: { wordCount: { min: 80, max: 80 } },
    variations: 1,
    description: '80 words (2×40). Para 1: What + feature. Para 2: Who + benefit.',
  },
  {
    id: 'comparison-table',
    name: 'Comparison Table',
    type: 'unique',
    required: true,
    articleTypes: ['comparison'],
    constraints: { wordCount: { min: 120, max: 150 } },
    variations: 3,
    description: 'Side-by-side feature comparison',
  },
  {
    id: 'quick-verdict',
    name: 'Quick Verdict Box',
    type: 'unique',
    required: false,
    articleTypes: ['comparison'],
    constraints: { wordCount: { min: 50, max: 50 } },
    variations: 3,
    description: 'Quick verdict recommendation',
  },

  // How-To
  {
    id: 'requirements-box',
    name: 'Requirements Box',
    type: 'unique',
    required: true,
    articleTypes: ['how-to'],
    constraints: { wordCount: { min: 20, max: 120 } },
    variations: 3,
    description: 'Required materials or tools list',
  },
  {
    id: 'instructions',
    name: 'Instructions List',
    type: 'unique',
    required: true,
    articleTypes: ['how-to', 'recipe'],
    constraints: { wordCount: { min: 150, max: 400 } },
    variations: 3,
    description: 'Numbered step-by-step instructions (150-400 words, <ol> format)',
  },
  {
    id: 'pro-tips',
    name: 'Pro Tips List',
    type: 'unique',
    required: false,
    articleTypes: ['how-to'],
    constraints: { wordCount: { min: 80, max: 120 } },
    variations: 3,
    description: 'Expert tips for success',
  },

  // Informational
  {
    id: 'key-takeaways',
    name: 'Key Takeaways Box',
    type: 'unique',
    required: true,
    articleTypes: ['informational'],
    constraints: { wordCount: { min: 50, max: 75 } },
    variations: 3,
    description: 'Summary of main points (5-6 bullets)',
  },
  {
    id: 'quick-facts',
    name: 'Quick Facts List',
    type: 'unique',
    required: false,
    articleTypes: ['informational'],
    constraints: { wordCount: { min: 80, max: 100 }, maxLength: 50 },
    variations: 3,
    description: 'H2 (40-50 chars) + interesting facts (5-7 bullets, 80-100 words)',
  },

  // Listicle
  {
    id: 'honorable-mentions',
    name: 'Honorable Mentions',
    type: 'unique',
    required: false,
    articleTypes: ['listicle'],
    constraints: { wordCount: { min: 120, max: 200 }, maxLength: 50 },
    variations: 3,
    description: 'H2 (40-50 chars) + 3-4 H3 sub-headings with 40-50 word descriptions each',
  },

  // Local
  {
    id: 'why-choose-local',
    name: 'Why Choose Local',
    type: 'unique',
    required: false,
    articleTypes: ['local'],
    constraints: { wordCount: { min: 40, max: 60 }, maxLength: 50 },
    variations: 3,
    description: 'H2 (40-50 chars) + image + benefits list (40-60 words)',
  },
  {
    id: 'service-info-box',
    name: 'Service Info Box',
    type: 'unique',
    required: false,
    articleTypes: ['local'],
    constraints: { wordCount: { min: 40, max: 60 } },
    variations: 3,
    description: 'Hours, area, and service details',
  },

  // Recipe
  {
    id: 'ingredients',
    name: 'Ingredients List',
    type: 'unique',
    required: true,
    articleTypes: ['recipe'],
    constraints: { wordCount: { min: 150, max: 150 } },
    variations: 3,
    description: 'Recipe ingredients in bulleted <ul> format (150 words)',
  },

  {
    id: 'recipe-tips',
    name: 'Recipe Tips',
    type: 'unique',
    required: true,
    articleTypes: ['recipe'],
    constraints: { wordCount: { min: 150, max: 150 } },
    variations: 3,
    description: 'Cooking tips and tricks (3x50 words)',
  },
  {
    id: 'nutrition-table',
    name: 'Nutrition Table',
    type: 'unique',
    required: false,
    articleTypes: ['recipe'],
    constraints: { wordCount: { min: 100, max: 100 } },
    variations: 3,
    description: 'Nutritional information table',
  },

  // Review
  {
    id: 'features-list',
    name: 'Features List',
    type: 'unique',
    required: true,
    articleTypes: ['review'],
    constraints: { wordCount: { min: 150, max: 150 } },
    variations: 3,
    description: 'Product features list (7-10 bullets)',
  },
  {
    id: 'pros-cons',
    name: 'Pros & Cons',
    type: 'unique',
    required: true,
    articleTypes: ['review'],
    constraints: { wordCount: { min: 150, max: 150 } },
    variations: 3,
    description: 'Side-by-side pros and cons list',
  },
  {
    id: 'rating',
    name: 'Rating Section',
    type: 'unique',
    required: true,
    articleTypes: ['review'],
    constraints: { wordCount: { min: 100, max: 150 }, maxLength: 30 },
    variations: 3,
    description: 'H2 (30 chars max) + score display + justification (100-150 words)',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENTS: ComponentDefinition[] = [
  ...UNIVERSAL_COMPONENTS,
  ...UNIQUE_COMPONENTS,
]

/**
 * Get component by ID
 */
export function getComponent(id: string): ComponentDefinition | undefined {
  return COMPONENTS.find((c) => c.id === id)
}

/**
 * Get components for a specific article type
 */
export function getComponentsForArticleType(articleTypeId: string): ComponentDefinition[] {
  return COMPONENTS.filter(
    (c) => c.type === 'universal' || c.articleTypes?.includes(articleTypeId)
  )
}

/**
 * Get required components for a specific article type
 */
export function getRequiredComponents(articleTypeId: string): ComponentDefinition[] {
  return getComponentsForArticleType(articleTypeId).filter((c) => c.required)
}

/**
 * Get optional components for a specific article type
 */
export function getOptionalComponents(articleTypeId: string): ComponentDefinition[] {
  return getComponentsForArticleType(articleTypeId).filter((c) => !c.required)
}

