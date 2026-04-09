/**
 * Generator Orchestrator
 * Main coordination layer for the parallel article generation system
 * Coordinates: Structure → Parallel Content → Assembly → Images
 * 
 * Enhanced with:
 * - Parallel image generation (2-3 concurrent with batch delays)
 * - Rich context extraction from assembled HTML
 * - Article-type-aware image generation
 * - AI-powered product inference for affiliate articles
 * - Multi-provider support with automatic failover (Gemini → Claude → OpenAI)
 * - Design variation selection from COMPONENT_VARIATIONS
 */

import { buildDynamicFlow } from '@/data/structure-flows'
import { generateStructure, generateAffiliateStructure } from './structure-generator'
import {
    generateOverview,
    generateSection,
    generateFAQ,
    generateClosing,
    generateKeyTakeaways,
    generateProsCons,
    generateComparisonTable,
    generateIngredientsList,
    generateInstructions,
    generateProductCard,
    generateMetaTags,
    // Commercial
    generateFeatureList,
    generateCTABox,
    // Comparison
    generateTopicOverview,
    generateQuickVerdict,
    // How-To
    generateMaterialsBox,
    generateProTips,
    // Informational
    generateQuickFacts,
    // Listicle
    generateHonorableMentions,
    // Local
    generateWhyChooseLocal,
    generateServiceInfo,
    // Recipe
    generateNutritionTable,
    generateTipsParagraph,
    // Review
    generateRatingParagraph,
    type MetaTags
} from './content-generators'
import { assembleArticle, countTotalWords, type AssemblyInput } from './article-assembler'
import { fetchAmazonProducts, fetchProductsFromCategories, type AmazonProduct } from './amazon-product-api'
import { inferProductCategories, extractProductFocusFromPrompt, type ProductInferenceResult } from './product-inference'
import { getRandomPositionalBadge } from './badge-service'
import type {
    TitleVariation,
    ArticleStructure,
    GeneratedContent,
    FAQContent,
    StreamEvent,
    ArticleContext
} from '@/lib/types/generation'
import type { ArticleType, ImageType } from './imagen'
import { buildArticleContext } from '@/lib/types/generation'
import { clearSelectedVariations, getSelectedVariations } from '@/lib/utils/variation-picker'
import { type AIProvider } from '@/lib/ai/providers'
import { type BaseVariationName, ALL_VARIATIONS } from '@/lib/services/template-hydrator'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a deterministic random variation name based on a seed string
 * Uses simple hash function to ensure same seed always returns same variation
 */
function getRandomVariationName(seed: string): BaseVariationName {
    // Simple string hash for deterministic pseudo-random selection
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % ALL_VARIATIONS.length;
    return ALL_VARIATIONS[index];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface OrchestrationConfig {
    articleType: string
    topic: string
    variation: TitleVariation
    maxRetries: number
    parallelBatchSize: number
    /** Number of concurrent image generation requests */
    imageBatchSize: number
    /** Delay between image batches (ms) */
    imageBatchDelayMs: number
    /** AI provider to use (gemini, claude, openai) */
    provider: AIProvider
    /** Design variation name from COMPONENT_VARIATIONS */
    variationName: BaseVariationName | 'random'
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED PLACEHOLDER FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Image placeholder metadata for rich context during image generation
 */
/**
 * Image placeholder metadata for rich context during image generation
 */
export interface ImagePlaceholderMeta {
    /** Display text for the image (H2 title) */
    text: string
    /** Article type for style customization */
    articleType: string
    /** Image type (featured, h2, product, step-process, etc.) */
    imageType: ImageType
    /** Section index for ordering */
    sectionIndex: number
    /** Component type (h2, featured, step, ingredient, dish, product, etc.) */
    componentType: string
    /** Step number for how-to/recipe articles */
    stepNumber?: number
}

/**
 * Encode image metadata into a placeholder URL
 * Format: https://placehold.co/800x400/e5e7eb/6b7280?text=TITLE&meta=BASE64_JSON
 * @public - Exported for use by content generators
 */
export function createEnhancedPlaceholder(meta: ImagePlaceholderMeta): string {
    const encodedText = encodeURIComponent(meta.text.replace(/\s+/g, '+'))
    const metaJson = JSON.stringify({
        at: meta.articleType,        // articleType
        it: meta.imageType,          // imageType
        si: meta.sectionIndex,       // sectionIndex
        ct: meta.componentType,      // componentType
        sn: meta.stepNumber,         // stepNumber (optional)
    })
    const encodedMeta = Buffer.from(metaJson).toString('base64url')
    return `https://placehold.co/800x400/e5e7eb/6b7280?text=${encodedText}&meta=${encodedMeta}`
}

/**
 * Parse enhanced placeholder URL to extract metadata
 */
function parseEnhancedPlaceholder(url: string): { text: string; meta: ImagePlaceholderMeta | null } {
    try {
        const urlObj = new URL(url)
        const text = decodeURIComponent(urlObj.searchParams.get('text') || '').replace(/\+/g, ' ')
        const metaParam = urlObj.searchParams.get('meta')

        if (!metaParam) {
            return { text, meta: null }
        }

        const metaJson = JSON.parse(Buffer.from(metaParam, 'base64url').toString())
        return {
            text,
            meta: {
                text,
                articleType: metaJson.at || 'informational',
                imageType: metaJson.it || 'h2',
                sectionIndex: metaJson.si || 0,
                componentType: metaJson.ct || 'h2',
                stepNumber: metaJson.sn,
            }
        }
    } catch (error) {
        // Fallback for legacy placeholder format
        const match = url.match(/\?text=([^&"'\s)]+)/)
        const text = match ? decodeURIComponent(match[1]).replace(/\+/g, ' ') : 'Image'
        return { text, meta: null }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONTENT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the full content of a section from assembled HTML for image context
 */
function extractSectionContent(html: string, sectionIndex: number): string {
    // Try to find section by data attribute or id
    const sectionRegex = new RegExp(
        `<section[^>]*(?:id="section-${sectionIndex}"|data-component="scai-section")[^>]*>([\\s\\S]*?)</section>`,
        'i'
    )
    const match = html.match(sectionRegex)

    if (match) {
        // Extract text content, removing HTML tags
        return match[1]
            .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim()
            .substring(0, 500)          // Limit to 500 chars for context
    }

    return ''
}

/**
 * Extract all paragraph content from HTML for overall article context
 */
function extractArticleContext(html: string): string {
    // Extract H1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const h1 = h1Match ? h1Match[1] : ''

    // Extract all H2 titles
    const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)]
    const h2s = h2Matches.map(m => m[1]).join(', ')

    // Extract first few paragraphs for overview context
    const pMatches = [...html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi)]
    const overview = pMatches.slice(0, 3).map(m => m[1]).join(' ').substring(0, 300)

    return `Title: ${h1}. Sections: ${h2s}. Overview: ${overview}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARALLEL IMAGE GENERATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run image generation in parallel batches with rate limiting
 */
async function* generateImagesInParallel(
    placeholders: Array<{ match: string; text: string; meta: ImagePlaceholderMeta | null; sectionContent: string }>,
    onImageGenerate: EnhancedImageCallback,
    articleContext: string,
    batchSize: number,
    batchDelayMs: number
): AsyncGenerator<{ index: number; placeholder: string; url: string; success: boolean }, void, unknown> {
    const total = placeholders.length

    for (let batchStart = 0; batchStart < total; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, total)
        const batch = placeholders.slice(batchStart, batchEnd)

        // Generate all images in this batch concurrently
        const batchPromises = batch.map(async (placeholder, batchIndex) => {
            const globalIndex = batchStart + batchIndex

            try {
                // Build rich context from section content + article context
                const richContext = placeholder.sectionContent
                    ? `${placeholder.sectionContent}. ${articleContext}`
                    : articleContext

                const result = await onImageGenerate({
                    description: placeholder.text,
                    context: richContext,
                    articleType: (placeholder.meta?.articleType || 'informational') as ArticleType,
                    imageType: placeholder.meta?.imageType || 'h2',
                    stepNumber: placeholder.meta?.stepNumber,
                })

                return {
                    index: globalIndex,
                    placeholder: placeholder.match,
                    url: result.url,
                    success: true,
                }
            } catch (error) {
                console.error(`[ImageGen] Failed to generate image ${globalIndex + 1}:`, error)
                return {
                    index: globalIndex,
                    placeholder: placeholder.match,
                    url: placeholder.match, // Keep original placeholder on failure
                    success: false,
                }
            }
        })

        // Wait for all images in batch to complete
        const results = await Promise.all(batchPromises)

        // Yield results one by one for streaming
        for (const result of results) {
            yield result
        }

        // Delay between batches to respect rate limits
        if (batchEnd < total) {
            await new Promise(resolve => setTimeout(resolve, batchDelayMs))
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED IMAGE CALLBACK TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enhanced callback for image generation with full context
 */
export interface EnhancedImageCallback {
    (params: {
        description: string
        context: string
        articleType: ArticleType
        imageType: ImageType
        stepNumber?: number
    }): Promise<{ url: string }>
}

/**
 * Legacy callback for backwards compatibility
 */
export interface LegacyImageCallback {
    (description: string, topic: string): Promise<{ url: string }>
    useRealAmazonData?: boolean  // Enable real Amazon product data for affiliate articles
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main orchestration function for article generation
 * 
 * @param articleType - Type of article (affiliate, commercial, how-to, etc.)
 * @param topic - Article topic/keyword
 * @param variation - Title variation style (statement, question, listicle)
 * @param targetWordCount - Target word count (500-3000)
 * @param onImageGenerate - Callback for image generation
 * @param componentColor - Color scheme for components (default: 'default')
 * @param provider - AI provider to use (default: 'gemini')
 * @param variationName - Design variation from COMPONENT_VARIATIONS (default: 'random')
 */
export async function* orchestrateGeneration(
    articleType: string,
    topic: string,
    variation: TitleVariation,
    targetWordCount: number = 1000,
    onImageGenerate: EnhancedImageCallback | LegacyImageCallback,
    componentColor: string = 'default',
    provider: AIProvider = 'openai',
    variationName: BaseVariationName | 'random' = 'random'
): AsyncGenerator<StreamEvent, void, unknown> {
    const config: OrchestrationConfig = {
        articleType,
        topic,
        variation,
        maxRetries: 2,
        parallelBatchSize: 2,   // Reduced from 5 to prevent rate limiting
        imageBatchSize: 2,      // Reduced from 3 to prevent rate limiting
        imageBatchDelayMs: 1000, // Increased from 500ms for safer rate limiting
        provider,
        variationName,
    }

    // Resolve 'random' to an actual variation name using seeded random
    const resolvedVariation = variationName === 'random'
        ? getRandomVariationName(topic + articleType)
        : variationName

    // Detect if using legacy or enhanced callback
    const isEnhancedCallback = onImageGenerate.length === 1
    const enhancedCallback: EnhancedImageCallback = isEnhancedCallback
        ? onImageGenerate as EnhancedImageCallback
        : async (params) => (onImageGenerate as LegacyImageCallback)(params.description, topic)

    // Track which provider was actually used (may change on fallback)
    let usedProvider: AIProvider = provider

    // Storage for affiliate-specific data that spans phases
    let affiliateProducts: AmazonProduct[] | null = null
    let affiliateInference: ProductInferenceResult | null = null

    try {
        // ─────────────────────────────────────────────────────────────────────────
        // PHASE 0 (AFFILIATE ONLY): PRODUCT INFERENCE + AMAZON SEARCH
        // AI infers best product categories → Searches Amazon → Products drive structure
        // ─────────────────────────────────────────────────────────────────────────
        if (articleType === 'affiliate') {
            yield { type: 'start', articleType, topic }

            // Emit variation_selected event
            yield {
                type: 'variation_selected',
                variationName: resolvedVariation,
                wasRandom: variationName === 'random'
            } as StreamEvent

            // Phase 0a: AI Product Inference
            yield { type: 'phase', phase: 'inference', message: 'Analyzing topic for product recommendations...' }

            const productCount = 3 // Standard affiliate article has 3 products
            affiliateInference = await inferProductCategories(topic, productCount, variation)

            yield {
                type: 'component_complete',
                componentId: 'inference',
                html: `<!-- AI inferred ${affiliateInference.categories.length} product categories: ${affiliateInference.categories.map(c => c.badge).join(', ')} -->`
            }

            // Phase 0b: Targeted Amazon Searches (one per category)
            yield { type: 'phase', phase: 'amazon', message: 'Searching Amazon for products...' }

            affiliateProducts = await fetchProductsFromCategories(affiliateInference.categories)

            if (affiliateProducts && affiliateProducts.length > 0) {
                yield {
                    type: 'component_complete',
                    componentId: 'amazon-data',
                    html: `<!-- Found ${affiliateProducts.length} real Amazon products: ${affiliateProducts.map(p => p.title.substring(0, 30)).join(', ')} -->`
                }
            } else {
                yield {
                    type: 'component_complete',
                    componentId: 'amazon-data',
                    html: `<!-- No Amazon products found, using LLM-generated content -->`
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PHASE 1: STRUCTURE GENERATION
        // For affiliate: Uses products to build TOC from actual product names
        // For other types: Standard AI structure generation
        // ─────────────────────────────────────────────────────────────────────────
        if (articleType !== 'affiliate') {
            yield { type: 'start', articleType, topic }

            // Emit variation_selected event for non-affiliate articles
            yield {
                type: 'variation_selected',
                variationName: resolvedVariation,
                wasRandom: variationName === 'random'
            } as StreamEvent
        }

        // Emit provider info
        yield {
            type: 'provider_selected',
            provider: usedProvider
        } as StreamEvent

        yield { type: 'phase', phase: 'structure', message: 'Generating article structure...' }

        // Affiliate uses product-aware structure generation
        const structure = articleType === 'affiliate' && (affiliateProducts || affiliateInference)
            ? await generateAffiliateStructure(topic, variation, affiliateProducts, affiliateInference)
            : await generateStructure(topic, articleType, variation, targetWordCount, config.maxRetries)

        yield { type: 'structure_complete', structure }

        // Send H1 and featured image immediately so user sees header first
        // Use enhanced placeholder with articleType metadata for proper AI image generation
        // NOTE: AI-generated alt text is handled in unified-orchestrator.ts which is the primary orchestrator
        const h1Html = `<header data-component="scai-h1"><h1 class="scai-h1">${structure.h1}</h1></header>`
        const featuredPlaceholder = createEnhancedPlaceholder({
            text: `Featured ${topic.substring(0, 40)}`,
            articleType: articleType,
            imageType: 'featured',
            sectionIndex: 0,
            componentType: 'featured-image'
        })
        const featuredAltFallback = `Comprehensive visual guide about ${topic} showing key concepts and practical applications for better understanding`
        const featuredImageHtml = `<figure data-component="scai-featured-image" class="scai-featured-image"><img src="${featuredPlaceholder}" alt="${featuredAltFallback}" /></figure>`

        yield { type: 'header_ready', h1Html, featuredImageHtml }
        yield { type: 'phase', phase: 'content', message: 'Writing article content...' }

        // IMPORTANT: Clear variation state for new article generation
        clearSelectedVariations()

        // Build ArticleContext for all generators (includes resolved variation and componentColor)
        const articleContext = buildArticleContext(structure, resolvedVariation, undefined, undefined, componentColor)

        // ─────────────────────────────────────────────────────────────────────────
        // PHASE 2: PARALLEL CONTENT GENERATION
        // ─────────────────────────────────────────────────────────────────────────

        // Determine default image type for this article type
        const defaultImageType = getDefaultImageType(articleType)

        // For affiliate articles, we already have products from Phase 0
        // For other types, amazonProducts will be null (not used)
        // Note: affiliateProducts was set in Phase 0 for affiliate articles

        // Prepare all content generation tasks
        const contentTasks: Array<{
            id: string
            task: () => Promise<GeneratedContent | FAQContent>
        }> = []

        // Overview
        contentTasks.push({
            id: 'overview',
            task: () => generateOverview(topic, structure.h1, 100)
        })

        // Standard sections (one for each H2) with enhanced placeholders
        for (let i = 0; i < structure.h2Titles.length; i++) {
            const h2 = structure.h2Titles[i]

            // Determine if this is a step (for how-to articles)
            const isStep = articleType === 'how-to' && h2.title.toLowerCase().includes('step')
            const stepNumber = isStep ? i + 1 : undefined
            const imageType: ImageType = isStep ? 'step-process' : defaultImageType

            const placeholder = createEnhancedPlaceholder({
                text: h2.title,
                articleType,
                imageType,
                sectionIndex: i,
                componentType: isStep ? 'step' : 'h2',
                stepNumber,
            })

            contentTasks.push({
                id: `section-${i}`,
                task: () => generateSection(topic, h2.title, h2.index, 150, placeholder)
            })
        }

        // FAQ (pass articleContext for template mode support)
        contentTasks.push({
            id: 'faq',
            task: () => generateFAQ(topic, structure.faqQuestions, 25, articleContext)
        })

        // Closing
        contentTasks.push({
            id: 'closing',
            task: () => generateClosing(topic, structure.closingH2, 50, articleType, structure.h2Titles.map(h => h.title), structure.h1)
        })

        // Meta tags (SEO)
        contentTasks.push({
            id: 'meta',
            task: async () => {
                const metaTags = await generateMetaTags(topic, structure.h1, articleType)
                return {
                    componentId: 'meta',
                    html: '', // Will be inserted into <head>
                    wordCount: 0,
                    metaTags // Store for later use
                } as GeneratedContent & { metaTags: MetaTags }
            }
        })

        // Article-type specific unique components with enhanced placeholders
        // Pass ArticleContext and products (affiliateProducts for affiliate, null for others)
        const uniqueTasks = getUniqueComponentTasks(articleType, articleContext, affiliateProducts)
        contentTasks.push(...uniqueTasks)

        // Execute in parallel batches
        const results: Map<string, GeneratedContent | FAQContent> = new Map()
        const totalTasks = contentTasks.length

        for (let i = 0; i < contentTasks.length; i += config.parallelBatchSize) {
            const batch = contentTasks.slice(i, i + config.parallelBatchSize)

            // Execute batch sequentially with streaming progress
            // Note: True parallel execution would require collecting results and yielding after
            for (const { id, task } of batch) {
                yield {
                    type: 'component_start',
                    componentId: id,
                    index: contentTasks.findIndex(t => t.id === id) + 1,
                    total: totalTasks
                }

                try {
                    const result = await task()
                    results.set(id, result)

                    if ('html' in result && result.html) {
                        yield { type: 'component_complete', componentId: id, html: result.html }
                    }
                } catch (error) {
                    console.error(`Failed to generate ${id}:`, error)
                    // Continue with other components
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PHASE 3: ASSEMBLY
        // ─────────────────────────────────────────────────────────────────────────
        yield { type: 'phase', phase: 'assembly', message: 'Assembling article...' }

        // Extract results by type
        const overview = results.get('overview') as GeneratedContent
        const sections: GeneratedContent[] = []
        for (let i = 0; i < structure.h2Titles.length; i++) {
            const section = results.get(`section-${i}`) as GeneratedContent
            if (section) sections.push(section)
        }
        const faq = results.get('faq') as FAQContent
        const closing = results.get('closing') as GeneratedContent
        const metaResult = results.get('meta') as any
        const metaTags = metaResult?.metaTags as MetaTags | undefined

        // Ensure closing has valid content - generate fallback if needed
        let finalClosing = closing
        if (!finalClosing || !finalClosing.html || finalClosing.html.trim() === '') {
            console.warn('Closing section missing or empty, generating fallback')
            finalClosing = {
                componentId: 'closing',
                html: `
<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${structure.closingH2}</h2>
  <p class="scai-paragraph">Taking the first step toward mastering ${topic} can transform your experience. With the knowledge you've gained here, you're now equipped to make informed decisions and achieve your goals. Start applying these insights today and discover how ${topic} can enhance your life in meaningful ways.</p>
</section>`.trim(),
                wordCount: 50
            }
        }

        // Get unique components
        const uniqueComponents: GeneratedContent[] = []
        for (const { id } of uniqueTasks) {
            const component = results.get(id) as GeneratedContent
            if (component) uniqueComponents.push(component)
        }

        // Assemble the article
        const assemblyInput: AssemblyInput = {
            structure,
            overview: overview || { componentId: 'overview', html: '<p class="scai-paragraph">Overview content.</p>', wordCount: 10 },
            sections,
            faq: faq || { h2Html: '', items: [] },
            closing: finalClosing,
            uniqueComponents,
            metaTitle: metaTags?.title,
            metaDescription: metaTags?.description,
            componentColor
        }

        let finalHtml = assembleArticle(assemblyInput)

        // ─────────────────────────────────────────────────────────────────────────
        // INCREMENTAL ORDERED STREAMING
        // Stream assembled content in document order for smooth top-to-bottom UX
        // Note: h1 and featured-image are already sent via header_ready event
        // ─────────────────────────────────────────────────────────────────────────
        yield { type: 'phase', phase: 'assembly', message: 'Streaming content...' }

        // Stream content incrementally by parsing the assembled HTML into sections
        // Start with header HTML since it was already sent via header_ready
        let accumulatedHtml = h1Html + featuredImageHtml

        // Split assembled HTML into streamable sections based on data-component attributes
        // This preserves document order since assembleArticle already orders correctly
        const sectionRegex = /<(?:header|section|figure|div|nav|aside)[^>]*data-component="([^"]+)"[^>]*>[\s\S]*?<\/(?:header|section|figure|div|nav|aside)>/gi
        const matches = [...finalHtml.matchAll(sectionRegex)]

        if (matches.length > 0) {
            // Stream each major section in order, skipping h1 and featured-image (already sent)
            for (const match of matches) {
                const sectionHtml = match[0]
                const sectionId = match[1]

                // Skip h1 and featured-image - they were already sent via header_ready
                if (sectionId === 'h1' || sectionId === 'featured-image') {
                    continue
                }

                accumulatedHtml += sectionHtml

                yield {
                    type: 'incremental_content',
                    chunk: sectionHtml,
                    accumulated: accumulatedHtml,
                    sectionId
                }

                // Small delay between sections for visual streaming effect
                await new Promise(resolve => setTimeout(resolve, 50))
            }
        } else {
            // Fallback: stream entire HTML at once if no sections found
            yield {
                type: 'incremental_content',
                chunk: finalHtml,
                accumulated: finalHtml,
                sectionId: 'full-article'
            }
        }

        yield { type: 'assembly_complete', html: finalHtml }

        // ─────────────────────────────────────────────────────────────────────────
        // PHASE 4: PARALLEL IMAGE GENERATION
        // ─────────────────────────────────────────────────────────────────────────
        yield { type: 'phase', phase: 'images', message: 'Generating images in parallel...' }

        // Extract rich article context from final HTML for image prompts
        const imageArticleContext = extractArticleContext(finalHtml)

        // Find all image placeholders with enhanced regex to capture full URL including meta param
        const placeholderRegex = /https:\/\/(?:via\.placeholder\.com|placehold\.co)\/[^\s"'<>]+/g
        const placeholderMatches: Array<{ match: string; text: string; meta: ImagePlaceholderMeta | null; sectionContent: string }> = []
        let match

        while ((match = placeholderRegex.exec(finalHtml)) !== null) {
            const parsed = parseEnhancedPlaceholder(match[0])
            const sectionContent = parsed.meta
                ? extractSectionContent(finalHtml, parsed.meta.sectionIndex)
                : ''

            placeholderMatches.push({
                match: match[0],
                text: parsed.text,
                meta: parsed.meta,
                sectionContent,
            })
        }

        console.log(`[Orchestrator] Found ${placeholderMatches.length} images to generate`)
        console.log(`[Orchestrator] Generating in parallel batches of ${config.imageBatchSize}`)

        // Generate images in parallel batches
        let completedImages = 0
        const totalImages = placeholderMatches.length

        for await (const result of generateImagesInParallel(
            placeholderMatches,
            enhancedCallback,
            imageArticleContext,
            config.imageBatchSize,
            config.imageBatchDelayMs
        )) {
            completedImages++

            // Replace placeholder in HTML
            if (result.success) {
                finalHtml = finalHtml.split(result.placeholder).join(result.url)
            }

            yield {
                type: 'image_complete',
                index: completedImages,
                total: totalImages,
                url: result.url,
                placeholder: result.placeholder
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // COMPLETE
        // ─────────────────────────────────────────────────────────────────────────
        const wordCount = countTotalWords(finalHtml)

        // Get selected variations for API response
        const { getSelectedVariationsForApi } = await import('@/lib/utils/variation-picker')
        const usedVariations = getSelectedVariationsForApi()

        yield {
            type: 'complete',
            html: finalHtml,
            wordCount,
            imageCount: placeholderMatches.length,
            usedVariations,
            usedVariation: resolvedVariation,
            usedProvider
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        yield { type: 'error', error: message }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: GET DEFAULT IMAGE TYPE FOR ARTICLE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultImageType(articleType: string): ImageType {
    const defaults: Record<string, ImageType> = {
        'affiliate': 'product',
        'commercial': 'h2',
        'comparison': 'comparison-neutral',
        'how-to': 'step-process',
        'informational': 'h2',
        'listicle': 'h2',
        'local': 'local-service',
        'recipe': 'dish-hero',
        'review': 'review-detail',
    }
    return defaults[articleType] || 'h2'
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE-TYPE SPECIFIC COMPONENT TASKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get unique component generation tasks for each article type
 * 
 * CRITICAL: This function must generate ALL unique components for each article type
 * as defined in the documentation and structure-flows.ts
 * 
 * Component IDs MUST match the flow entries in structure-flows.ts for proper assembly
 */
function getUniqueComponentTasks(
    articleType: string,
    context: ArticleContext,
    amazonProducts: AmazonProduct[] | null = null
): Array<{ id: string; task: () => Promise<GeneratedContent> }> {
    const tasks: Array<{ id: string; task: () => Promise<GeneratedContent> }> = []

    switch (articleType) {
        // ═══════════════════════════════════════════════════════════════════════
        // AFFILIATE: Product Cards (dynamic count based on products found)
        // Flow: product-card → h2 → h2-image → standard-paragraph (×N)
        // Uses real Amazon data with badges from AI inference
        // Falls back to LLM-generated content if no products found
        // ═══════════════════════════════════════════════════════════════════════
        case 'affiliate': {
            // Uses smart badge resolution (badge-service) for variety
            const productCount = amazonProducts?.length || 3

            for (let i = 0; i < productCount; i++) {
                const realProduct = amazonProducts?.[i]
                // Use badge from product (resolved by badge-service) or generate random positional badge
                const badge = realProduct?.badge || getRandomPositionalBadge(i)

                tasks.push({
                    id: `product-card-${i}`,
                    task: () => generateProductCard(context, i + 1, badge, realProduct)
                })
            }
            break
        }

        // ═══════════════════════════════════════════════════════════════════════
        // COMMERCIAL: Feature List + CTA Box
        // Flow: h2 → feature-list → cta-box → [h2 → standard-paragraph] loop
        // ═══════════════════════════════════════════════════════════════════════
        case 'commercial':
            tasks.push(
                {
                    id: 'feature-list',
                    task: () => generateFeatureList(context, 110)
                },
                {
                    id: 'cta-box',
                    task: () => generateCTABox(context, 'Get Started Today')
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // COMPARISON: Topic Overviews (2) + Comparison Table + Quick Verdict
        // Flow: [h2 → topic-overview] ×2 → comparison-table → h2 → quick-verdict
        // ═══════════════════════════════════════════════════════════════════════
        case 'comparison':
            tasks.push(
                {
                    id: 'topic-overview-0',
                    task: () => generateTopicOverview(context, 'Option A', 80)
                },
                {
                    id: 'topic-overview-1',
                    task: () => generateTopicOverview(context, 'Option B', 80)
                },
                {
                    id: 'comparison-table',
                    task: () => generateComparisonTable(context, 135)
                },
                {
                    id: 'quick-verdict',
                    task: () => generateQuickVerdict(context)
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // HOW-TO: Materials Box + Pro Tips
        // Flow: h2 → materials-box → [step h2 → standard-paragraph] ×4 → h2 → pro-tips
        // ═══════════════════════════════════════════════════════════════════════
        case 'how-to':
            tasks.push(
                {
                    id: 'materials-box',
                    task: () => generateMaterialsBox(context, 70)
                },
                {
                    id: 'pro-tips',
                    task: () => generateProTips(context, 100)
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // INFORMATIONAL: Key Takeaways (REQUIRED) + Quick Facts
        // Flow: key-takeaways → [h2 → standard-paragraph] ×4 → h2 → quick-facts
        // ═══════════════════════════════════════════════════════════════════════
        case 'informational':
            tasks.push(
                {
                    id: 'key-takeaways',
                    task: () => generateKeyTakeaways(context, 65)
                },
                {
                    id: 'quick-facts',
                    task: () => generateQuickFacts(context, 90)
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // LISTICLE: Honorable Mentions (H2 + 3-4 H3 items)
        // Flow: [h2 item → standard-paragraph] ×5 → honorable-mentions
        // ═══════════════════════════════════════════════════════════════════════
        case 'listicle':
            tasks.push({
                id: 'honorable-mentions',
                task: () => generateHonorableMentions(context)
            })
            break

        // ═══════════════════════════════════════════════════════════════════════
        // LOCAL: Why Choose Local + Service Info
        // Flow: [h2 → standard-paragraph] ×3 → h2 → why-choose-local → service-info
        // ═══════════════════════════════════════════════════════════════════════
        case 'local':
            tasks.push(
                {
                    id: 'why-choose-local',
                    task: () => generateWhyChooseLocal(context)
                },
                {
                    id: 'service-info',
                    task: async () => generateServiceInfo(context, {
                        // Default placeholder data - should come from user settings
                        businessName: `Local ${context.topic} Services`,
                        hours: 'Monday-Friday: 8AM-6PM, Saturday: 9AM-3PM',
                        serviceArea: 'Local area and surrounding regions',
                        phone: '(555) 123-4567'
                    })
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // RECIPE: Ingredients + Instructions + Tips + Nutrition
        // Flow: ingredients → instructions → tips-paragraph → nutrition-table
        // ═══════════════════════════════════════════════════════════════════════
        case 'recipe':
            tasks.push(
                {
                    id: 'ingredients',
                    task: () => generateIngredientsList(context, 150)
                },
                {
                    id: 'instructions',
                    task: () => generateInstructions(context, 275)
                },
                {
                    id: 'tips-paragraph',
                    task: () => generateTipsParagraph(context, 150)
                },
                {
                    id: 'nutrition-table',
                    task: () => generateNutritionTable(context, 4)
                }
            )
            break

        // ═══════════════════════════════════════════════════════════════════════
        // REVIEW: Features List + Pros/Cons + Rating
        // Flow: h2 → feature-list → h2 → pros-cons → [h2 → para] ×3 → rating-paragraph
        // ═══════════════════════════════════════════════════════════════════════
        case 'review':
            tasks.push(
                {
                    id: 'feature-list',
                    task: () => generateFeatureList(context, 150)
                },
                {
                    id: 'pros-cons',
                    task: () => generateProsCons(context, 150)
                },
                {
                    id: 'rating-paragraph',
                    task: () => generateRatingParagraph(context, 8.5)
                }
            )
            break
    }

    return tasks
}

// ═══════════════════════════════════════════════════════════════════════════════
// NON-STREAMING ORCHESTRATOR (for simpler use cases)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateArticle(
    articleType: string,
    topic: string,
    variation: TitleVariation,
    onImageGenerate: EnhancedImageCallback | LegacyImageCallback,
    targetWordCount: number = 1000,
    componentColor: string = 'default',
    provider: AIProvider = 'openai',
    variationName: BaseVariationName | 'random' = 'random'
): Promise<{ html: string; wordCount: number; imageCount: number; usedVariation?: BaseVariationName; usedProvider?: string }> {
    let finalHtml = ''
    let wordCount = 0
    let imageCount = 0
    let usedVariation: BaseVariationName | undefined
    let usedProvider: string | undefined

    for await (const event of orchestrateGeneration(articleType, topic, variation, targetWordCount, onImageGenerate, componentColor, provider, variationName)) {
        if (event.type === 'complete') {
            finalHtml = event.html
            wordCount = event.wordCount
            imageCount = event.imageCount
            usedVariation = event.usedVariation
            usedProvider = event.usedProvider
        } else if (event.type === 'error') {
            throw new Error(event.error)
        }
    }

    return { html: finalHtml, wordCount, imageCount, usedVariation, usedProvider }
}
