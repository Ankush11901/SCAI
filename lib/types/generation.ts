/**
 * Generation Types
 * TypeScript interfaces for the parallel article generation system
 */

import type { BaseVariationName } from '@/lib/services/template-hydrator'
import type { ClassificationHint } from '@/lib/ai/classify-article'

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TitleVariation = 'question' | 'statement' | 'listicle'

/**
 * ArticleContext - Rich context passed to all content generators
 * 
 * This interface ensures all generators receive consistent thematic information
 * to maintain coherence, especially for H2 heading generation.
 * 
 * PURPOSE:
 * - Unique component generators can format H2s to match H1 variation
 * - All content maintains consistent tone and audience targeting
 * - Enables Header Consistency Rule compliance (100%)
 */
export interface ArticleContext {
    /** Main article topic (e.g., "AI Writing Tools") */
    topic: string

    /** The full H1 heading (e.g., "What Are the Best AI Writing Tools?") */
    h1: string

    /** H1 format variation (question/statement/listicle) */
    h1Variation: TitleVariation

    /** Article type (affiliate/review/how-to/etc.) */
    articleType: string

    /** Optional tone (professional/casual/technical) */
    tone?: string

    /** Optional target audience (beginners/experts/small business) */
    targetAudience?: string

    /**
     * Design variation name for component generation
     * Specifies which COMPONENT_VARIATIONS template to use for HTML/CSS
     * AI generates text content only; HTML structure always comes from templates
     */
    variationName: BaseVariationName

    /**
     * Component color theme ID
     * - 'default': Black/white (default)
     * - 'blue': Blue accent colors
     * - 'green': Green accent colors
     * - 'amber': Amber/orange accent colors
     * - 'red': Red accent colors
     * - 'purple': Purple accent colors
     */
    componentColor?: string
}

/**
 * Helper function to build ArticleContext from structure
 * Called by orchestrator after Phase 1 completes
 */
export function buildArticleContext(
    structure: ArticleStructure,
    variationName: BaseVariationName,
    tone?: string,
    targetAudience?: string,
    componentColor: string = 'default'
): ArticleContext {
    return {
        topic: structure.topic,
        h1: structure.h1,
        h1Variation: structure.h1Variation,
        articleType: structure.articleType,
        tone,
        targetAudience,
        variationName,
        componentColor
    }
}

export interface ArticleStructure {
    h1: string
    h1Variation: TitleVariation
    h2Titles: H2Definition[]
    faqQuestions: string[]
    closingH2: string
    tocItems: TocItem[]
    articleType: string
    topic: string

    // ═══════════════════════════════════════════════════════════════════════════
    // KEYWORD EXTRACTION (Natural H2 Integration)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Core keywords extracted from the user's phrase
     * Used for natural keyword integration in H2s instead of forcing the full phrase
     * 
     * Example: "funny aspects of wwe" → ["WWE", "funny"]
     * 
     * These keywords are used for:
     * - Keyword density validation (30-60% of H2s should contain a keyword)
     * - Natural H2 generation (AI uses these instead of the full phrase)
     */
    coreKeywords?: string[]

    /**
     * The original phrase provided by the user
     * Kept for context and topic direction, even when coreKeywords are extracted
     */
    primaryKeyword?: string

    // ═══════════════════════════════════════════════════════════════════════════
    // PROMISE FULFILLMENT METADATA (Phase 5)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Dynamic H2s - These fulfill the H1 promise
     * For listicle: Numbered items (e.g., "1. Classic Italian Taco Recipe")
     * For statement/question: Topic sections
     * 
     * These are what readers expect based on the H1 promise.
     */
    dynamicH2s?: string[]

    /**
     * Component H2s - Structural sections (NOT part of H1 promise)
     * These are fixed sections based on article type, not the promise.
     */
    componentH2s?: {
        /** "Key Features of {product}" - for review articles */
        features?: string
        /** "{product} Benefits Versus Drawbacks" - for review articles */
        prosCons?: string
        /** "Our Verdict" / "Final Rating" - for review articles */
        rating?: string
        /** "Frequently Asked Questions" - all articles */
        faq?: string
        /** "Final Thoughts on {topic}" - all articles */
        closing?: string
        /** "Honorable Mentions" - for affiliate/listicle */
        honorableMentions?: string
        /** "Ingredients" - for recipe articles */
        ingredients?: string
        /** "Instructions" - for recipe articles */
        instructions?: string
        /** "Nutrition Facts" - for recipe articles */
        nutrition?: string
    }

    /**
     * Promise fulfillment validation info
     */
    promiseValidation?: {
        /** Score 0-100 of how well H2s fulfill H1 promise */
        score: number
        /** Whether validation passed */
        fulfilled: boolean
        /** Number of re-prompting attempts */
        attempts: number
        /** Any issues found */
        issues?: string[]
    }
}

/**
 * H2 Category - distinguishes promise-fulfilling H2s from structural ones
 */
export type H2Category = 'dynamic' | 'component'

/**
 * Extended H2Definition with category info
 */
export interface H2DefinitionExtended extends H2Definition {
    /** Whether this H2 is dynamic (promise-fulfilling) or component (structural) */
    category: H2Category
    /** For component H2s, which component it belongs to */
    componentKey?: keyof NonNullable<ArticleStructure['componentH2s']>
}

export interface H2Definition {
    id: string
    title: string
    index: number
    isSpecial?: boolean // For unique components like "Ingredients", "Rating", etc.
    componentType?: string // The associated unique component if any
}

export interface TocItem {
    id: string
    title: string
    href: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT GENERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeneratedContent {
    componentId: string
    html: string
    wordCount: number
    index?: number
    variationCss?: string  // CSS from the selected variation template
}

export interface ContentGeneratorConfig {
    topic: string
    h2Title?: string
    wordTarget: { min: number; max: number }
    articleType: string
    context?: string // Additional context for coherence
}

export interface SectionContent {
    h2Html: string
    imageHtml: string
    paragraphHtml: string
}

export interface FAQContent {
    h2Html: string
    items: FAQItem[]
    html?: string
    variationCss?: string
}

export interface FAQItem {
    question: string
    answer: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerationPlan {
    articleType: string
    topic: string
    variation: TitleVariation
    structureFlow: string[]
    requiredComponents: string[]
    optionalComponents: string[]
    uniqueComponents: string[]
}

export interface GenerationProgress {
    phase: 'keywords' | 'inference' | 'structure' | 'content' | 'amazon' | 'images' | 'assembly' | 'correction' | 'complete'
    currentStep: string
    completedSteps: number
    totalSteps: number
    percentage: number
}

export interface GenerationResult {
    success: boolean
    html?: string
    wordCount?: number
    imageCount?: number
    validationResults?: ValidationResult[]
    error?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
    componentId: string
    passed: boolean
    issues: ValidationIssue[]
}

export interface ValidationIssue {
    rule: string
    expected: string
    actual: string
    severity: 'error' | 'warning'
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsedVariation {
    component: string
    letter: 'a' | 'b' | 'c'
    name: string
    index: number
}

export interface ValidationIssue {
    component: string;
    rule: string;
    message: string;
}

export interface ValidationSummary {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
}

export type StreamEvent =
    | { type: 'start'; articleType: string; topic: string }
    | { type: 'phase'; phase: GenerationProgress['phase']; message: string }
    | { type: 'structure_complete'; structure: ArticleStructure }
    | { type: 'header_ready'; h1Html: string; featuredImageHtml: string }
    | { type: 'component_start'; componentId: string; index: number; total: number }
    | { type: 'component_chunk'; componentId: string; chunk: string; accumulated: string }
    | { type: 'component_complete'; componentId: string; html: string }
    | { type: 'incremental_content'; chunk: string; accumulated: string; sectionId: string }
    | { type: 'image_start'; index: number; total: number; description: string }
    | { type: 'image_complete'; index: number; total: number; url: string; placeholder: string; description?: string }
    | { type: 'assembly_complete'; html: string }
    | { type: 'variation_selected'; variationName: BaseVariationName }
    | { type: 'provider_selected'; provider: string }
    | { type: 'validation_result'; isValid: boolean; score: number; errors: ValidationIssue[]; warnings: ValidationIssue[]; summary: ValidationSummary }
    | { type: 'classification_complete'; hint: ClassificationHint }
    | { type: 'complete'; html: string; wordCount: number; imageCount: number; usedVariations?: UsedVariation[]; usedVariation?: BaseVariationName; usedProvider?: string }
    | { type: 'error'; error: string }

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT CONSTRAINT TYPES (from documentation)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentConstraints {
    wordCount?: { min: number; max: number }
    charLimit?: { min?: number; max: number }
    required: boolean
    forbiddenPatterns?: string[]
}

export const COMPONENT_CONSTRAINTS: Record<string, ComponentConstraints> = {
    // Universal (per programmatic_rules.md)
    h1: { charLimit: { min: 50, max: 60 }, required: true },
    'overview-paragraph': { wordCount: { min: 90, max: 110 }, required: true },
    h2: { charLimit: { min: 50, max: 60 }, required: true, forbiddenPatterns: ['and', 'or', ':'] },
    'standard-paragraph': { wordCount: { min: 140, max: 160 }, required: true },
    'closing-h2': { charLimit: { min: 50, max: 60 }, required: false, forbiddenPatterns: ['Conclusion', 'Summary', 'Final Thoughts', 'Wrapping Up'] },
    'closing-paragraph': { wordCount: { min: 45, max: 55 }, required: false },
    'faq-h2': { charLimit: { min: 25, max: 30 }, required: false },
    'faq-h3': { charLimit: { min: 30, max: 60 }, required: false },
    'faq-answer': { wordCount: { min: 25, max: 32 }, required: false },

    // Unique - Affiliate
    'product-card': { required: true },

    // Unique - Commercial
    'feature-list': { wordCount: { min: 100, max: 120 }, required: true },
    'cta-box': { wordCount: { min: 20, max: 30 }, required: true },

    // Unique - Comparison
    'topic-overview': { wordCount: { min: 75, max: 85 }, required: true },
    'comparison-table': { wordCount: { min: 120, max: 150 }, required: true },
    'quick-verdict': { wordCount: { min: 45, max: 55 }, required: false },

    // Unique - How-To
    'materials-box': { wordCount: { min: 20, max: 120 }, required: true },
    'pro-tips': { wordCount: { min: 80, max: 120 }, required: false },

    // Unique - Informational
    'key-takeaways': { wordCount: { min: 50, max: 75 }, required: true },
    'quick-facts': { wordCount: { min: 80, max: 100 }, required: false },

    // Unique - Listicle
    'honorable-mentions-h2': { charLimit: { min: 35, max: 50 }, required: false },
    'honorable-mentions-paragraph': { wordCount: { min: 40, max: 50 }, required: false },

    // Unique - Recipe
    'ingredients': { wordCount: { min: 140, max: 160 }, required: true },
    'instructions-list': { wordCount: { min: 150, max: 400 }, required: true },
    'tips-paragraph': { wordCount: { min: 140, max: 160 }, required: true },
    'nutrition-table': { wordCount: { min: 90, max: 110 }, required: false },

    // Unique - Review
    'features-list': { wordCount: { min: 140, max: 160 }, required: true },
    'pros-cons': { wordCount: { min: 140, max: 160 }, required: true },
    'rating-h2': { charLimit: { min: 25, max: 30 }, required: true },
    'rating-paragraph': { wordCount: { min: 90, max: 110 }, required: true },
}
