/**
 * Unified Article Generation Orchestrator
 * 
 * REFACTORED: Uses Vercel AI SDK for all AI calls + Template Hydration
 * 
 * The flow mirrors the mockup generator:
 * 1. AI generates TEXT content (via lib/ai/generate-content.ts)
 * 2. Template hydrators inject text into HTML templates from variations.ts
 * 3. Assembled article uses EXACT same HTML/CSS as mockups
 * 
 * Key principle: AI generates TEXT ONLY, HTML comes from COMPONENT_VARIATIONS
 */

import { buildDynamicFlow } from '@/data/structure-flows'
import {
  generateStructure as generateStructureAI,
  generateH1Only,
  generateH2sFromH1,
} from '@/lib/ai/generate'
import { extractH1Promise } from '@/lib/ai/utils/h1-promise-extractor'
import { buildPromiseContextBlock } from '@/lib/ai/prompts/content-prompts'
import { extractCoreKeywords } from '@/lib/ai/utils/keyword-extractor'
import { correctGrammarBatch } from '@/lib/ai/grammar-checker'
import {
  streamOverview,
  streamSectionContent,
  streamClosing,
  consumeStreamWithFallback,
  type RecipeContext,
  type ReviewContext,
  type ComparisonContext,
  type CommercialContext,
} from '@/lib/ai/stream-content'
import {
  generateProductCards,
  generateFeatureList,
  generateProsCons,
  generateIngredients,
  generateInstructions,
  generateFaqAnswers,
  generateKeyTakeaways,
  generateUniqueComponent,
  generateImageCaption,
  type GenerateComponentResult,
} from '@/lib/ai/generate-content'
import { buildNutritionPrompt } from '@/lib/ai/prompts/component-prompts'
import {
  type BaseVariationName,
  type TitleFormat,
  ALL_VARIATIONS,
  hydrateFaq,
  hydrateProductCard,
  hydrateFeatureList,
  hydrateProsCons,
  hydrateIngredients,
  hydrateInstructions,
  hydrateKeyTakeaways,
  hydrateQuickFacts,
  hydrateComparisonTable,
  hydrateQuickVerdict,
  hydrateRequirements,
  hydrateProTips,
  hydrateRating,
  hydrateCtaBox,
  hydrateServiceInfo,
  hydrateWhyLocal,
  hydrateHonorableMentions,
  hydrateNutrition,
} from '@/lib/services/template-hydrator'
import { assembleArticle, countTotalWords, type AssemblyInput } from './article-assembler'
import {
  fetchProductsFromCategories,
  fetchCandidatesFromCategories,
  enrichProductsWithDetails,
  type AmazonProduct
} from './amazon-product-api'
import { inferProductCategories, type ProductInferenceResult } from './product-inference'
import { generateClassificationHint } from '@/lib/ai/classify-article'
import { resolveSmartBadges } from './badge-service'
import { validateProductRelevance } from './product-validator'
import { cleanProductName, generateProductDescription } from './product-image-generator'
import {
  validateGeneratedContent,
  type ArticleContent as ValidatorArticleContent,
  type ValidationResult,
} from './content-validator'
import {
  iterativelyCorrectContent,
  replaceBuzzwordsInHtml,
  correctH2KeywordDensity,
  correctListicleArticle,
  type CorrectionContext,
} from './content-corrector'
import {
  expandKeywordsForArticle,
  type ExpandedKeywordSet,
} from './keyword-expansion-service'
import type {
  TitleVariation,
  ArticleStructure,
  GeneratedContent,
  FAQContent,
  StreamEvent,
} from '@/lib/types/generation'
import type { LocalBusinessInfo, ArticleTypeContext } from './content-generators'
import type { ArticleType, ImageType } from './imagen'
import { buildArticleContext } from '@/lib/types/generation'
import { type AIProvider } from '@/lib/ai/providers'
import {
  createCostTrackingContext,
  updateGenerationCostSummary,
  logAiUsageAsync,
  type CostTrackingContext,
} from './cost-tracking-service'
import {
  ComparisonTableSchema,
  QuickVerdictSchema,
  QuickFactsSchema,
  MaterialsBoxSchema,
  ProTipsSchema,
  RatingContentSchema,
  ComparisonExtractSchema,
  CommercialExtractSchema,
  WhyChooseLocalSchema,
  ServiceInfoSchema,
  HonorableMentionsSchema,
  NutritionTableSchema,
} from '@/lib/ai/schemas'

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensures that question-format headings end with "?"
 * Works as a safety net after AI grammar correction
 * 
 * @param text - The heading text to check
 * @param variation - The article variation (only applies to 'question' variation)
 * @returns The text with "?" added if needed
 */
function ensureQuestionMark(text: string, variation?: TitleVariation): string {
  // Only apply to question variation
  if (variation !== 'question') return text

  const trimmedText = text.trim()
  
  // If already has question mark, return as-is
  if (trimmedText.endsWith('?')) return text

  // Check if starts with question word
  const questionWords = ['what', 'how', 'why', 'which', 'when', 'where', 'who', 'whose', 'whom', 'can', 'is', 'are', 'does', 'do', 'will', 'would', 'should']
  const firstWord = trimmedText.split(/\s+/)[0].toLowerCase()
  
  if (questionWords.includes(firstWord)) {
    console.log(`[Question Mark] Added "?" to: "${trimmedText}"`)
    return trimmedText + '?'
  }

  return text
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface OrchestrationConfig {
  articleType: string
  topic: string
  primaryKeyword: string
  variation: TitleVariation
  targetWordCount: number
  maxRetries: number
  parallelBatchSize: number
  imageBatchSize: number
  imageBatchDelayMs: number
  provider: AIProvider
  variationName: BaseVariationName
  expandedKeywords?: ExpandedKeywordSet | null
  clusterKeywords?: string[]
  /** Cluster context for sibling awareness in bulk generation (optional - only for cluster mode) */
  clusterContext?: {
    siblingArticles: Array<{ title: string; url: string; focus: string; articleType: string }>
    interlinkKeywords: string[]
  }
  // Pre-generated recipe data (optional, typed loosely to avoid schema drift issues)
  preGeneratedIngredients?: GenerateComponentResult<any> | null
  preGeneratedInstructions?: GenerateComponentResult<any> | null
  // Pre-generated review data (optional, typed loosely to avoid schema drift issues)
  preGeneratedFeatures?: GenerateComponentResult<any> | null
  preGeneratedProsCons?: GenerateComponentResult<any> | null
  preGeneratedRating?: { score: number; scoreDisplay: string; title: string; justification: string; h2?: string } | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: GET VARIATION NAME
// ═══════════════════════════════════════════════════════════════════════════════

function getRandomVariationName(seed: string): BaseVariationName {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const index = Math.abs(hash) % ALL_VARIATIONS.length
  return ALL_VARIATIONS[index]
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: UPDATE TOC WITH ALL H2s
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Updates TOC in final HTML to include all H2s (dynamic + component H2s).
 * Extracts H2s from assembled HTML and rebuilds TOC section.
 */
function updateTocWithAllH2s(html: string, variation: string): string {
  // Extract all H2s from sections (skip FAQ, closing, and component H2s that shouldn't be in TOC)
  const sectionRegex = /<section[^>]*id="section-(\d+)"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/gi
  const allH2s: Array<{ id: string; text: string }> = []
  let match

  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionId = match[1]
    const h2Text = match[2].trim()
    
    // Skip FAQ sections and closing sections
    if (!h2Text.toLowerCase().includes('frequently asked') && 
        !h2Text.toLowerCase().includes('faq') &&
        !h2Text.toLowerCase().includes('final thoughts') &&
        !h2Text.toLowerCase().includes('conclusion')) {
      allH2s.push({ id: sectionId, text: h2Text })
    }
  }

  // ⚠️ Component H2s (ingredients, nutrition, features, pros/cons, rating) should NOT be in TOC
  // TOC should only contain main section H2s for better navigation structure

  if (allH2s.length === 0) {
    console.log('[TOC Update] No H2s found to update TOC')
    return html
  }

  // Build TOC items HTML
  const tocItems = allH2s.map((h2) =>
    `<li><a href="#section-${h2.id}">${h2.text}</a></li>`
  ).join('\n')

  // Find and replace TOC list
  const tocListRegex = /(<ul[^>]*class="scai-toc-list"[^>]*>)[\s\S]*?(<\/ul>)/
  if (!tocListRegex.test(html)) {
    console.log('[TOC Update] No TOC list found in HTML')
    return html
  }

  const updatedHtml = html.replace(tocListRegex, `$1\n${tocItems}\n$2`)
  console.log(`[TOC Update] Updated TOC with ${allH2s.length} H2s`)
  
  return updatedHtml
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: STRIP MARKDOWN FROM AI-GENERATED TEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Strips markdown formatting from AI-generated text content.
 * Removes headers (###), bold (**), italic (*), bullet points, etc.
 * This ensures clean paragraph text for HTML assembly.
 */
function stripMarkdownFormatting(text: string): string {
  return text
    // Remove markdown headers (# ## ### etc.) at start of lines
    .replace(/^#{1,6}\s+/gm, '')
    // CRITICAL: Remove markdown headers ANYWHERE in the string (e.g., "2. ## Text")
    .replace(/#{1,6}\s+/g, '')
    // Remove bold markers (**text** or __text__)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic markers (*text* or _text_) - be careful not to remove * in lists
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    // Remove bullet points at start of lines
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove numbered list markers at start of lines
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove link markdown [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Clean up any double spaces created
    .replace(/\s{2,}/g, ' ')
    // Trim whitespace
    .trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: EXTRACT TEXT FROM HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts text content from an HTML string, stripping all tags.
 * Handles nested HTML elements properly.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')  // Replace all tags with space
    .replace(/&nbsp;/g, ' ')   // Replace non-breaking spaces
    .replace(/&amp;/g, '&')    // Decode common entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')   // Collapse multiple spaces
    .trim()
}

/**
 * Extract the full content of ALL paragraphs, including text inside nested HTML tags.
 * Joins all paragraph text for validation.
 */
function extractParagraphContent(html: string, sectionSelector: string): string | null {
  // Match the section first, then find ALL paragraphs within it
  const sectionRegex = new RegExp(
    `<section[^>]*${sectionSelector}[^>]*>([\\s\\S]*?)</section>`,
    'i'
  )
  const sectionMatch = html.match(sectionRegex)
  if (!sectionMatch) return null

  const sectionContent = sectionMatch[1]

  // Find ALL <p> tags and extract text from each
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  const paragraphs: string[] = []
  let match
  while ((match = paragraphRegex.exec(sectionContent)) !== null) {
    paragraphs.push(stripHtmlTags(match[1]))
  }

  if (paragraphs.length === 0) return null

  // Join all paragraphs with space for validation
  return paragraphs.join(' ')
}

/**
 * Replace the paragraph content in a section while preserving the HTML structure.
 * Handles multi-paragraph sections like overview.
 */
function replaceSectionParagraphs(html: string, sectionSelector: string, newText: string): string {
  // Match the section
  const sectionRegex = new RegExp(
    `(<section[^>]*${sectionSelector}[^>]*>)([\\s\\S]*?)(</section>)`,
    'i'
  )
  const sectionMatch = html.match(sectionRegex)
  if (!sectionMatch) return html

  const sectionOpenTag = sectionMatch[1]
  const sectionContent = sectionMatch[2]
  const sectionCloseTag = sectionMatch[3]

  // Split new text into paragraphs (by double newlines or periods followed by space)
  const newParagraphs = newText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // If only one paragraph, try to split by sentence boundaries for 2 paragraphs
  if (newParagraphs.length === 1 && sectionSelector.includes('overview')) {
    const sentences = newText.match(/[^.!?]+[.!?]+/g) || [newText]
    if (sentences.length >= 2) {
      const mid = Math.ceil(sentences.length / 2)
      newParagraphs.length = 0
      newParagraphs.push(sentences.slice(0, mid).join(' ').trim())
      newParagraphs.push(sentences.slice(mid).join(' ').trim())
    }
  }

  // Generate new paragraph HTML
  const newParagraphsHtml = newParagraphs
    .map(p => `<p class="scai-paragraph">${p}</p>`)
    .join('\n')

  // FIX: Instead of trying to remove paragraphs with regex (which can fail and leave orphaned text),
  // find the insertion point and DISCARD everything after it, then append new paragraphs.
  // This ensures complete replacement of paragraph content.

  // Find insertion point - after last figure (image) or H2
  const figureEndIndex = sectionContent.lastIndexOf('</figure>')
  const h2EndIndex = sectionContent.lastIndexOf('</h2>')

  let updatedContent: string
  if (figureEndIndex !== -1) {
    // Keep everything up to and including </figure>, discard old paragraphs, add new ones
    const keepUntil = figureEndIndex + '</figure>'.length
    updatedContent = sectionContent.substring(0, keepUntil) + '\n' + newParagraphsHtml
  } else if (h2EndIndex !== -1) {
    // Keep everything up to and including </h2>, discard old paragraphs, add new ones
    const keepUntil = h2EndIndex + '</h2>'.length
    updatedContent = sectionContent.substring(0, keepUntil) + '\n' + newParagraphsHtml
  } else {
    // No figure or h2 found, just use new paragraphs
    updatedContent = newParagraphsHtml
  }

  // Clean up any excessive whitespace
  updatedContent = updatedContent.replace(/\n{3,}/g, '\n\n')

  return html.replace(sectionRegex, () => `${sectionOpenTag}${updatedContent}${sectionCloseTag}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE PLACEHOLDERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImagePlaceholderMeta {
  text: string
  articleType: string
  imageType: ImageType
  sectionIndex: number
  componentType: string
  stepNumber?: number
  sourceImageUrl?: string  // For product cards: the Amazon image URL to transform
  sourceProductName?: string  // For H2 images: the matched product name for reference context
}

export function createEnhancedPlaceholder(meta: ImagePlaceholderMeta): string {
  const encodedText = encodeURIComponent(meta.text.replace(/\s+/g, '+'))
  const metaJson = JSON.stringify({
    at: meta.articleType,
    it: meta.imageType,
    si: meta.sectionIndex,
    ct: meta.componentType,
    sn: meta.stepNumber,
    src: meta.sourceImageUrl,  // Include source image URL for product card transformation
    spn: meta.sourceProductName,  // Include matched product name for reference context
  })
  const encodedMeta = Buffer.from(metaJson).toString('base64url')
  return `https://placehold.co/800x400/e5e7eb/6b7280?text=${encodedText}&meta=${encodedMeta}`
}

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
        sourceImageUrl: metaJson.src,  // Extract source image URL
        sourceProductName: metaJson.spn,  // Extract matched product name
      }
    }
  } catch {
    const match = url.match(/\?text=([^&"'\s)]+)/)
    const text = match ? decodeURIComponent(match[1]).replace(/\+/g, ' ') : 'Image'
    return { text, meta: null }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE CALLBACK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnhancedImageCallback {
  (params: {
    description: string
    context: string
    articleType: ArticleType
    imageType: ImageType
    stepNumber?: number
    componentType?: string      // e.g., 'product-card', 'why-local'
    sourceImageUrl?: string     // For product cards: Amazon image URL to transform
    sourceProductName?: string  // For H2 images: matched product name for reference context
  }): Promise<{ url: string }>
}

export interface LegacyImageCallback {
  (description: string, topic: string): Promise<{ url: string }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT EXTRACTION AND CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove H2 heading text from the beginning of paragraph if it's duplicated
 * Handles exact matches, case differences, and trailing punctuation
 */
function removeH2Duplication(h2Text: string, paragraphText: string): string {
  if (!h2Text || !paragraphText) return paragraphText

  // Normalize both texts for comparison (lowercase, trim)
  const normalizedH2 = h2Text.toLowerCase().trim()
  const normalizedPara = paragraphText.trim()
  const normalizedParaLower = normalizedPara.toLowerCase()

  // Check if paragraph starts with the H2 text (exact match)
  if (normalizedParaLower.startsWith(normalizedH2)) {
    // Remove the H2 text from the beginning
    let cleaned = paragraphText.substring(h2Text.length).trim()

    // If the remaining text starts with punctuation or lowercase, keep it
    // Otherwise, ensure proper sentence structure
    if (cleaned && !cleaned.match(/^[a-z]/)) {
      // First char is uppercase or punctuation - looks good
      return cleaned
    } else if (cleaned) {
      // First char is lowercase - capitalize it
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
  }

  // Check for variations with punctuation or extra words
  // e.g., "Sound Quality Factors To Consider:" or "Sound Quality Factors To Consider -"
  // Put hyphen at the end of character class to avoid range interpretation
  const escapedH2 = normalizedH2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const h2WithPunctuation = new RegExp(`^${escapedH2}[:.,-]?\\s*`, 'i')
  if (h2WithPunctuation.test(normalizedPara)) {
    const cleaned = paragraphText.replace(h2WithPunctuation, '').trim()
    if (cleaned) {
      // Ensure first character is uppercase
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
  }

  return paragraphText
}

/**
 * Parse section text into 3 paragraphs for proper HTML structure
 * AI generates text with blank lines between paragraphs
 * Returns an array of 3 paragraph strings (pads with fallback if needed)
 */
function parseSectionParagraphs(sectionText: string): string[] {
  // Split by double newlines (paragraph separator from AI)
  const paragraphs = sectionText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // If we got exactly 3, great
  if (paragraphs.length === 3) {
    return paragraphs
  }

  // If less than 3, try to split the longest paragraph
  if (paragraphs.length < 3) {
    // Fallback: split by sentences if needed to get 3 chunks
    const allText = paragraphs.join(' ')
    const sentences = allText.match(/[^.!?]+[.!?]+/g) || [allText]

    if (sentences.length >= 3) {
      // Distribute sentences into 3 groups
      const perGroup = Math.ceil(sentences.length / 3)
      return [
        sentences.slice(0, perGroup).join(' ').trim(),
        sentences.slice(perGroup, perGroup * 2).join(' ').trim(),
        sentences.slice(perGroup * 2).join(' ').trim()
      ].filter(p => p.length > 0)
    }

    // If still not enough, pad with empty or duplicate
    while (paragraphs.length < 3) {
      paragraphs.push('')
    }
    return paragraphs.filter((_, i) => i < 3)
  }

  // If more than 3, merge the extras into the last paragraph
  const first = paragraphs[0]
  const second = paragraphs[1]
  const rest = paragraphs.slice(2).join(' ')
  return [first, second, rest]
}

/**
 * Generate section HTML with 3 separate paragraph tags
 */
function generateSectionHtmlWithParagraphs(
  h2Title: string,
  sectionText: string,
  sectionIndex: number,
  h2Placeholder: string,
  h2AltText: string,
  h2Caption: string,
  stripFormatting: boolean = true,
  includeH2Image: boolean = true
): string {
  // First remove any H2 duplication from the entire text
  const cleanedText = removeH2Duplication(h2Title, sectionText)

  // Parse into 3 paragraphs
  const paragraphs = parseSectionParagraphs(cleanedText)

  // Apply markdown stripping if needed
  const finalParagraphs = stripFormatting
    ? paragraphs.map(p => stripMarkdownFormatting(p))
    : paragraphs

  // Build paragraph HTML
  const paragraphsHtml = finalParagraphs
    .filter(p => p.length > 0)
    .map(p => `  <p class="scai-paragraph">${p}</p>`)
    .join('\n')

  const imageHtml = includeH2Image ? `
  <figure class="scai-h2-image">
    <img src="${h2Placeholder}" alt="${h2AltText}" />
    <figcaption>${h2Caption}</figcaption>
  </figure>` : ''

  return `
<section data-component="scai-section" id="section-${sectionIndex}" class="scai-section">
  <h2 class="scai-h2">${h2Title}</h2>${imageHtml}
${paragraphsHtml}
</section>`.trim()
}

function extractSectionContent(html: string, sectionIndex: number): string {
  const sectionRegex = new RegExp(
    `<section[^>]*(?:id="section-${sectionIndex}"|data-component="scai-section")[^>]*>([\\s\\S]*?)</section>`,
    'i'
  )
  const match = html.match(sectionRegex)
  if (match) {
    return match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500)
  }
  return ''
}

function extractArticleContext(html: string, articleType?: string, reviewProductName?: string): string {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const h1 = h1Match ? h1Match[1] : ''
  const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)]
  const h2s = h2Matches.map(m => m[1]).join(', ')
  const pMatches = [...html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi)]
  const overview = pMatches.slice(0, 3).map(m => m[1]).join(' ').substring(0, 300)

  // For review articles, add explicit product anchoring to help image generation
  if (articleType === 'review' && reviewProductName) {
    return `PRODUCT BEING REVIEWED: ${reviewProductName}. ALL IMAGES MUST SHOW THIS PRODUCT. Title: ${h1}. Sections: ${h2s}. Overview: ${overview}`
  }

  return `Title: ${h1}. Sections: ${h2s}. Overview: ${overview}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTICLE NORMALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that identify non-list-item H2s (component H2s, closing H2s)
 * These should NOT be counted in listicle numbering
 */
const NON_LIST_ITEM_H2_PATTERNS = [
  // Component H2s
  /pros?\s*(and|&|,)?\s*cons?/i,
  /key\s*features?/i,
  /feature\s*list/i,
  /honorable\s*mentions?/i,
  // Honorable mentions alternatives (AI-generated creative titles)
  /other.*(worth|deserve|consider|checking)/i,
  /more.*(worth|deserve|consider|checking)/i,
  /additional.*(worth|options|models|choices)/i,
  /alternatives?\s*to\s*consider/i,
  /nearly\s*made\s*(the\s*)?cut/i,
  /worth\s*(checking\s*out|exploring|trying)/i,
  /product\s*cards?/i,
  /comparison\s*table/i,
  /quick\s*(verdict|facts?|summary)/i,
  /rating|score|verdict/i,
  /specifications?|specs/i,
  // Closing H2 patterns
  /final\s*(thoughts?|verdict|takeaway|summary|word)/i,
  /conclusion|summary|wrap[- ]?up/i,
  /in\s*summary/i,
  /the\s*bottom\s*line/i,
  /our\s*verdict/i,
  /key\s*takeaways?/i,
  /wrapping\s*(it\s*)?up/i,
]

/**
 * Check if an H2 title is a non-list-item (component or closing)
 */
function isNonListItemH2(title: string): boolean {
  const normalizedTitle = title.toLowerCase().trim()
  return NON_LIST_ITEM_H2_PATTERNS.some(pattern => pattern.test(normalizedTitle))
}

/**
 * Extract the number from the start of a listicle H1
 * Examples: "5 Best Ways to..." returns 5, "10 Reasons Why..." returns 10
 */
function extractH1Number(h1: string): number | null {
  const match = h1.match(/^(\d+)\s+/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Replace the number at the start of a listicle H1
 */
function replaceH1Number(h1: string, newNumber: number): string {
  return h1.replace(/^(\d+)(\s+)/, `${newNumber}$2`)
}

/**
 * Extract the number from the start of a listicle H2
 * Examples: "1. Best Feature" returns 1, "3: Top Pick" returns 3
 */
function extractH2Number(h2: string): number | null {
  const match = h2.match(/^(\d+)[.:)\-\s]/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Replace or add a number at the start of a listicle H2
 */
function setH2Number(h2: string, newNumber: number): string {
  // If H2 already has a number, replace it
  if (/^(\d+)[.:)\-\s]/.test(h2)) {
    return h2.replace(/^(\d+)([.:)\-\s]+)/, `${newNumber}$2`)
  }
  // If H2 doesn't have a number, add one
  return `${newNumber}. ${h2}`
}

/**
 * Remove the number from the start of an H2 (for closing H2s that shouldn't be numbered)
 */
function stripH2Number(h2: string): string {
  return h2.replace(/^\d+[.:)\-\s]+\s*/, '').trim()
}

/**
 * Normalize listicle structure to ensure coherent H1/H2 numbering
 * 
 * Rules:
 * 1. H1 number MUST match the count of list-item H2s
 * 2. List-item H2s MUST be numbered 1..N sequentially (no gaps/dupes)
 * 3. Component H2s (Pros/Cons, Features, etc.) are NOT numbered
 * 4. Closing H2 is NEVER numbered
 * 5. Honorable Mentions is NOT counted as a list item
 */
function normalizeListicleStructure(
  h1: string,
  h2Titles: Array<{ id: string; title: string; index: number }>,
  closingH2: string
): {
  normalizedH1: string
  normalizedH2Titles: Array<{ id: string; title: string; index: number; isListItem: boolean }>
  normalizedClosingH2: string
  listItemCount: number
  tocItemH2s: Array<{ id: string; title: string; index: number }> // Only list-item H2s for TOC
} {
  // Categorize H2s: list items vs non-list items
  const categorized = h2Titles.map((h2, originalIndex) => ({
    ...h2,
    isListItem: !isNonListItemH2(h2.title),
    originalIndex,
  }))

  // Count actual list items (excluding component H2s and honorable mentions)
  const listItems = categorized.filter(h2 => h2.isListItem)
  const listItemCount = listItems.length

  // Normalize H1: ensure the number matches actual list item count
  let normalizedH1 = h1
  const currentH1Number = extractH1Number(h1)
  if (currentH1Number !== null && currentH1Number !== listItemCount) {
    normalizedH1 = replaceH1Number(h1, listItemCount)
    console.log(`[Listicle] H1 number corrected: ${currentH1Number} → ${listItemCount}`)
  }

  // Normalize H2s: renumber list items 1..N, strip numbers from non-list items
  let listItemCounter = 0
  const normalizedH2Titles = categorized.map(h2 => {
    // CRITICAL: Strip any markdown FIRST (defensive - should already be stripped but edge cases exist)
    let normalizedTitle = h2.title.replace(/#{1,6}\s+/g, '').trim()

    if (h2.isListItem) {
      listItemCounter++
      const currentNumber = extractH2Number(normalizedTitle)
      if (currentNumber !== listItemCounter) {
        normalizedTitle = setH2Number(normalizedTitle, listItemCounter)
        console.log(`[Listicle] H2 renumbered: "${h2.title}" → "${normalizedTitle}"`)
      }
    } else {
      // Strip any accidental numbering from component/non-list H2s
      const hasNumber = extractH2Number(h2.title) !== null
      if (hasNumber) {
        normalizedTitle = stripH2Number(h2.title)
        console.log(`[Listicle] Component H2 number stripped: "${h2.title}" → "${normalizedTitle}"`)
      }
    }

    return {
      id: h2.id,
      title: normalizedTitle,
      index: h2.index,
      isListItem: h2.isListItem,
    }
  })

  // Normalize closing H2: ensure it's NEVER numbered
  let normalizedClosingH2 = closingH2
  if (extractH2Number(closingH2) !== null) {
    normalizedClosingH2 = stripH2Number(closingH2)
    console.log(`[Listicle] Closing H2 number stripped: "${closingH2}" → "${normalizedClosingH2}"`)
  }

  // Build TOC items: only list-item H2s (no Honorable Mentions, no component H2s, no closing)
  const tocItemH2s = normalizedH2Titles
    .filter(h2 => h2.isListItem)
    .map((h2, tocIndex) => ({
      id: h2.id,
      title: h2.title,
      index: tocIndex + 1,
    }))

  return {
    normalizedH1,
    normalizedH2Titles,
    normalizedClosingH2,
    listItemCount,
    tocItemH2s,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARALLEL IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

async function* generateImagesInParallel(
  placeholders: Array<{ match: string; text: string; meta: ImagePlaceholderMeta | null; sectionContent: string }>,
  onImageGenerate: EnhancedImageCallback,
  articleContext: string,
  batchSize: number,
  batchDelayMs: number
): AsyncGenerator<{ index: number; placeholder: string; url: string; success: boolean; description: string }> {
  const total = placeholders.length

  for (let batchStart = 0; batchStart < total; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, total)
    const batch = placeholders.slice(batchStart, batchEnd)

    const batchPromises = batch.map(async (placeholder, batchIndex) => {
      const globalIndex = batchStart + batchIndex

      try {
        const richContext = placeholder.sectionContent
          ? `${placeholder.sectionContent}. ${articleContext}`
          : articleContext

        const result = await onImageGenerate({
          description: placeholder.text,
          context: richContext,
          articleType: (placeholder.meta?.articleType || 'informational') as ArticleType,
          imageType: placeholder.meta?.imageType || 'h2',
          stepNumber: placeholder.meta?.stepNumber,
          componentType: placeholder.meta?.componentType,       // Pass for product-card detection
          sourceImageUrl: placeholder.meta?.sourceImageUrl,     // Pass Amazon URL for transformation
          sourceProductName: placeholder.meta?.sourceProductName, // Pass matched product name for context
        })

        return {
          index: globalIndex,
          placeholder: placeholder.match,
          url: result.url,
          success: true,
          description: placeholder.text, // Include description for alt text
        }
      } catch (error) {
        console.error(`[ImageGen] Failed to generate image ${globalIndex + 1}:`, error)
        return {
          index: globalIndex,
          placeholder: placeholder.match,
          url: placeholder.match,
          success: false,
          description: placeholder.text, // Include description for alt text
        }
      }
    })

    const results = await Promise.all(batchPromises)

    for (const result of results) {
      yield result
    }

    if (batchEnd < total) {
      await new Promise(resolve => setTimeout(resolve, batchDelayMs))
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR - UNIFIED FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified article generation using AI SDK + Template Hydration
 * 
 * This is the correct flow matching the mockup generator:
 * 1. Generate structure (H1, H2s, FAQs) using AI SDK
 * 2. Generate TEXT content for each component using AI SDK  
 * 3. Hydrate HTML templates with the TEXT using template-hydrator
 * 4. Assemble final article
 * 5. Generate images
 */
export async function* orchestrateUnifiedGeneration(
  articleType: string,
  topic: string,
  variation: TitleVariation,
  targetWordCount: number = 1000,
  onImageGenerate: EnhancedImageCallback | LegacyImageCallback,
  componentColor: string = 'default',
  provider: AIProvider = 'openai',
  variationName: BaseVariationName | 'random' = 'random',
  enableKeywordExpansion: boolean = false,
  enableAutoCorrection: boolean = true,  // Enable iterative correction
  skipAltTextValidation: boolean = false,  // Skip alt text validation in background mode
  affiliateTag?: string, // Amazon Affiliate Tag
  /** Cluster context for sibling awareness in bulk generation (optional - only for cluster mode) */
  clusterContext?: {
    siblingArticles: Array<{ title: string; url: string; focus: string; articleType: string }>
    interlinkKeywords: string[]
  },
  /** Cost tracking context for logging AI usage (optional) */
  costTrackingInfo?: { historyId: string; userId: string; bulkJobId?: string },
  /** User-provided article-type-specific context (local business, commercial product, comparison items, review product) */
  typeContext?: ArticleTypeContext,
  /** Previously generated H1s to avoid in bulk generation (optional) */
  previousH1s?: string[],
  /** Optional component IDs the user enabled. When provided, components NOT in this list are skipped. */
  selectedComponents?: string[],
  /** Component IDs to exclude from generation (e.g., ['closing-h2', 'closing-paragraph']) */
  excludeComponents?: string[],
  /** Pre-generated H1 for bulk parallel generation (skips H1 generation when provided) */
  presetH1?: string,
  /** Pre-generated meta title for bulk parallel generation */
  presetMetaTitle?: string,
  /** Pre-generated meta description for bulk parallel generation */
  presetMetaDescription?: string,
): AsyncGenerator<StreamEvent, void, unknown> {
  // Derive localBusinessInfo from typeContext for backwards compatibility
  const localBusinessInfo = typeContext?.localBusinessInfo

  // Helper: check if an optional component is enabled
  // - If selectedComponents is provided, only those listed are enabled
  // - If excludeComponents is provided, those are always excluded
  const isComponentOn = (id: string) => {
    // If explicitly excluded, component is always off
    if (excludeComponents?.includes(id)) return false
    // If selectedComponents is provided, check if included
    if (selectedComponents) return selectedComponents.includes(id)
    // Default: all components are enabled
    return true
  }

  // Create cost tracking context if info provided
  const costTracking = costTrackingInfo
    ? createCostTrackingContext(costTrackingInfo.historyId, costTrackingInfo.userId, costTrackingInfo.bulkJobId)
    : undefined
  // Resolve variation name
  const resolvedVariation = variationName === 'random'
    ? getRandomVariationName(topic + articleType)
    : variationName

  // Detect callback type
  const isEnhancedCallback = onImageGenerate.length === 1
  const enhancedCallback: EnhancedImageCallback = isEnhancedCallback
    ? onImageGenerate as EnhancedImageCallback
    : async (params) => (onImageGenerate as LegacyImageCallback)(params.description, topic)

  const config: OrchestrationConfig = {
    articleType,
    topic,
    primaryKeyword: topic, // Use topic as primary keyword
    variation,
    targetWordCount,
    maxRetries: 2,
    parallelBatchSize: 2,
    imageBatchSize: 4,        // Increased from 2 for faster generation
    imageBatchDelayMs: 300,   // Reduced from 1000ms for faster batching
    provider,
    variationName: resolvedVariation,
    clusterContext,  // Optional - only provided in cluster mode
  }

  // Track state
  let affiliateProducts: AmazonProduct[] | null = null
  let affiliateInference: ProductInferenceResult | null = null

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // EMIT START
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n[Orchestrator] ════════════════════════════════════════════════`)
    console.log(`[Orchestrator] Starting article generation`)
    console.log(`[Orchestrator]   Type: ${articleType}`)
    console.log(`[Orchestrator]   Topic: ${topic}`)
    console.log(`[Orchestrator]   Variation: ${resolvedVariation}`)
    console.log(`[Orchestrator]   Provider: ${provider}`)
    console.log(`[Orchestrator]   Target: ${targetWordCount} words`)
    if (affiliateTag) console.log(`[Orchestrator]   Affiliate Tag: ${affiliateTag}`)
    console.log(`[Orchestrator] ════════════════════════════════════════════════\n`)

    yield { type: 'start', articleType, topic }

    yield {
      type: 'variation_selected',
      variationName: resolvedVariation,
      wasRandom: variationName === 'random'
    } as StreamEvent

    yield {
      type: 'provider_selected',
      provider
    } as StreamEvent

    // ─────────────────────────────────────────────────────────────────────────
    // KEYWORD EXPANSION (OPTIONAL)
    // ─────────────────────────────────────────────────────────────────────────
    let expandedKeywords: ExpandedKeywordSet | null = null
    let clusterKeywords: string[] = []

    if (enableKeywordExpansion) {
      console.log('[Orchestrator] Keyword Expansion: Generating SEO keywords...')
      yield { type: 'phase', phase: 'keywords', message: 'Expanding keywords for SEO optimization...' }

      try {
        expandedKeywords = await expandKeywordsForArticle({
          seedKeyword: topic,
          articleType: articleType as any,
          provider,
        })

        // Collect keywords for prompts - use primary + expanded (first 5)
        if (expandedKeywords) {
          clusterKeywords = [
            expandedKeywords.primary,
            ...expandedKeywords.expanded.slice(0, 5),
          ]

          console.log(`[Orchestrator] Keywords expanded: ${clusterKeywords.join(', ')}`)

          yield {
            type: 'component_complete',
            componentId: 'keyword-expansion',
            html: `<!-- SEO Keywords: ${clusterKeywords.join(', ')} -->`,
          }
        }
      } catch (error) {
        console.warn('[Orchestrator] Keyword expansion failed, continuing without:', error)
        // Continue without keywords if expansion fails
      }
    }

    // Update config with expanded keywords
    config.expandedKeywords = expandedKeywords
    config.clusterKeywords = clusterKeywords

    // If in cluster mode, merge sibling interlink keywords for natural referencing
    if (clusterContext && clusterContext.interlinkKeywords.length > 0) {
      // Add sibling keywords to clusterKeywords (avoid duplicates)
      const existingKeywords = new Set(config.clusterKeywords?.map(k => k.toLowerCase()) || [])
      const siblingKeywords = clusterContext.interlinkKeywords.filter(
        k => !existingKeywords.has(k.toLowerCase())
      ).slice(0, 10) // Limit to 10 additional keywords

      config.clusterKeywords = [...(config.clusterKeywords || []), ...siblingKeywords]

      console.log(`[Orchestrator] Cluster mode: Added ${siblingKeywords.length} sibling keywords for interlinking`)
      console.log(`[Orchestrator] Sibling articles: ${clusterContext.siblingArticles.map(s => s.title).join(', ')}`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 0 (AFFILIATE ONLY): PRODUCT INFERENCE + AMAZON SEARCH
    // ─────────────────────────────────────────────────────────────────────────
    if (articleType === 'affiliate') {
      console.log('[Orchestrator] Phase 0: Affiliate product inference...')
      yield { type: 'phase', phase: 'inference', message: 'Analyzing topic for product recommendations...' }

      const productCount = 3
      affiliateInference = await inferProductCategories(topic, productCount, variation, provider, costTracking)

      yield {
        type: 'component_complete',
        componentId: 'inference',
        html: `<!-- AI inferred ${affiliateInference.categories.length} product categories -->`
      }

      yield { type: 'phase', phase: 'amazon', message: 'Searching Amazon for products...' }

      // 1. Fetch candidates for all categories
      const candidatesPerCategory = await fetchCandidatesFromCategories(affiliateInference.categories, 3, affiliateTag)
      
      // 2. Validate all candidates
      const allCandidates = candidatesPerCategory.flat()
      if (allCandidates.length > 0) {
        console.log(`[Orchestrator] Validating ${allCandidates.length} product candidates...`)
        const validationResult = await validateProductRelevance(allCandidates, topic, provider, costTracking)
        const validAsins = new Set(validationResult.validProducts.map(p => p.asin))
        
        affiliateProducts = []
        const failedCategoryIndices: number[] = []
        const selectedAsins = new Set<string>()

        // 3. Select best valid product for each category
        for (let i = 0; i < affiliateInference.categories.length; i++) {
          const categoryCandidates = candidatesPerCategory[i]
          // Find best valid product that hasn't been selected yet
          const bestValid = categoryCandidates.find(p => validAsins.has(p.asin) && !selectedAsins.has(p.asin))
          
          if (bestValid) {
            affiliateProducts.push(bestValid)
            selectedAsins.add(bestValid.asin)
          } else {
            failedCategoryIndices.push(i)
          }
        }

        // 4. Retry failed categories with alternate query (if available and not already used)
        if (failedCategoryIndices.length > 0) {
          console.log(`[Orchestrator] ${failedCategoryIndices.length} categories failed validation or uniqueness check, trying alternate queries...`)
          
          // Filter to only categories that have an alternate query AND mostly likely used primary query first
          const retryCategories = failedCategoryIndices
            .map(idx => ({ index: idx, category: affiliateInference!.categories[idx] }))
            .filter(({ category }) => category.alternateQuery && category.alternateQuery !== category.searchQuery)
          
          if (retryCategories.length > 0) {
            // Fetch candidates for alternates
            // Note: We create a temporary category list where searchQuery is swapped with alternateQuery
            const alternateCategoryConfigs = retryCategories.map(({ category }) => ({
              ...category,
              searchQuery: category.alternateQuery
            }))
            
            const retryCandidatesPerCategory = await fetchCandidatesFromCategories(alternateCategoryConfigs, 3, affiliateTag)
            const allRetryCandidates = retryCandidatesPerCategory.flat()
            
            if (allRetryCandidates.length > 0) {
              console.log(`[Orchestrator] Validating ${allRetryCandidates.length} retry candidates...`)
              const retryValidation = await validateProductRelevance(allRetryCandidates, topic, provider, costTracking)
              const retryValidAsins = new Set(retryValidation.validProducts.map(p => p.asin))
              
              // Fill holes in affiliateProducts
              // affiliateProducts currently contains successful products in order of arrival? No, array push order.
              // Actually, we want to maintain the original category order.
              // Let's rebuild the array to be safe.
              
              const finalProducts: AmazonProduct[] = []
              const finalSelectedAsins = new Set<string>()
              
              for (let i = 0; i < affiliateInference.categories.length; i++) {
                // Check if we already found a valid one
                const originalCandidates = candidatesPerCategory[i]
                const originalValid = originalCandidates.find(p => validAsins.has(p.asin) && !finalSelectedAsins.has(p.asin))
                
                if (originalValid) {
                  finalProducts.push(originalValid)
                  finalSelectedAsins.add(originalValid.asin)
                  continue
                }
                
                // Check if this was a retried category
                const retryIndex = retryCategories.findIndex(rc => rc.index === i)
                if (retryIndex !== -1) {
                  const retryCandidates = retryCandidatesPerCategory[retryIndex]
                  const retryValid = retryCandidates.find(p => retryValidAsins.has(p.asin) && !finalSelectedAsins.has(p.asin))
                  if (retryValid) {
                    finalProducts.push(retryValid)
                    finalSelectedAsins.add(retryValid.asin)
                    console.log(`[Orchestrator] Recovered category ${i + 1} with alternate query`)
                  } else {
                    console.log(`[Orchestrator] Category ${i + 1} failed with alternate query too`)
                  }
                }
              }
              affiliateProducts = finalProducts
            }
          }
        }
        
        // 5. Enrich the final selection
        if (affiliateProducts.length > 0) {
          await enrichProductsWithDetails(affiliateProducts, process.env.RAPIDAPI_KEY || '')
        }
      }

      // Pre-clean product names for use in structure generation
      // This ensures H2s use the same names as product cards
      if (affiliateProducts && affiliateProducts.length > 0) {
        console.log('[Orchestrator] Pre-cleaning product names for structure generation...')
        for (const product of affiliateProducts) {
          const cleanedName = await cleanProductName(product.title)
            // Store cleaned name on the product for reuse
            ; (product as any).cleanedName = cleanedName
          console.log(`[Orchestrator] Cleaned: "${product.title.substring(0, 40)}..." → "${cleanedName}"`)
        }

        // Apply smart badge resolution (data-driven + AI context-aware + synonym pools)
        console.log('[Orchestrator] Resolving smart badges...')
        const badgeCandidates = affiliateProducts.map((product, i) => ({
          product,
          aiSuggestedBadge: affiliateInference?.categories[i]?.suggestedBadge,
          position: i,
        }))
        affiliateProducts = resolveSmartBadges(badgeCandidates)
      }

      yield {
        type: 'component_complete',
        componentId: 'amazon-data',
        html: affiliateProducts?.length
          ? `<!-- Found ${affiliateProducts.length} real Amazon products -->`
          : `<!-- No Amazon products found, using LLM-generated content -->`
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1: STRUCTURE GENERATION (AI SDK)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Orchestrator] Phase 1: Generating structure...')
    yield { type: 'phase', phase: 'structure', message: 'Generating article structure...' }

    // Calculate H2 count based on word count WITH unique component budget
    // Each article type has different unique components that consume word budget
    // Optional components excluded via isComponentOn() free their words for more H2 sections
    const uniqueComponentBudget: Record<string, number> = {
      'affiliate': 200,      // 3 product cards (~50 words each) + CTA
      'informational': 65 + (isComponentOn('quick-facts') ? 90 : 0),  // Key Takeaways (65) + Quick Facts (90)
      'local': (isComponentOn('why-choose-local') ? 50 : 0) + (isComponentOn('service-info-box') ? 50 : 0),
      'comparison': 100 + 200 + (isComponentOn('quick-verdict') ? 50 : 0),  // Feature List + Table + Verdict
      'how-to': 70 + (isComponentOn('pro-tips') ? 75 : 0),         // Materials Box (70) + Pro Tips (75)
      'recipe': 70 + 150 + 150 + (isComponentOn('nutrition-table') ? 100 : 0),  // Ingredients + Instructions + Tips + Nutrition
      'review': 380,         // Feature List (~120) + Pros/Cons (~160) + Rating justification (~100)
      'listicle': (isComponentOn('honorable-mentions') ? 120 : 0),  // Honorable Mentions (100)
      'commercial': 250,     // Feature List (~100) + CTA Box (~50) + Benefits summary (~100)
    }

    // Fixed H2 sections that are ALWAYS present for each article type
    // These are H2s from unique components that don't come from the dynamic loop
    const fixedH2Sections: Record<string, number> = {
      'affiliate': 0,        // Product cards are dynamic based on h2Count
      'informational': 1,    // Quick Facts has own H2
      'local': 1,            // Why Choose Local has own H2
      'comparison': 0,       // Unique components (table, verdict) have their own titles, not counted as H2 sections
      'how-to': 2,           // Materials/Requirements + Pro Tips
      'recipe': 4,           // Ingredients + Instructions + Tips + Nutrition
      'review': 3,           // Features + Pros/Cons + Rating
      'listicle': 1,         // Honorable Mentions
      'commercial': 1,       // CTA section has own H2
    }

    // Fixed words: H1 (10) + Overview (100) + FAQ answers (~140 for 5 Qs) + Closing (50) = 300
    // When optional components are disabled, their word budget is freed for more H2 sections
    // For review articles, add 50-word buffer to account for component H2 titles
    const baseFixedWords = 10 + 100 + (isComponentOn('faq') ? 140 : 0) + (isComponentOn('closing-paragraph') ? 50 : 0)
    const fixedWords = articleType === 'review' ? baseFixedWords + 50 : baseFixedWords
    const uniqueWords = uniqueComponentBudget[articleType] || 150
    const wordsPerSection = articleType === 'review' ? 160 : 180 // Review sections slightly tighter to hit target

    // Available words for ADDITIONAL H2 sections (beyond fixed unique components)
    const fixedH2s = fixedH2Sections[articleType] || 0
    const availableForSections = targetWordCount - fixedWords - uniqueWords
    // Calculate ADDITIONAL H2s needed beyond the fixed ones
    let calculatedH2Count = Math.max(0, Math.floor(availableForSections / wordsPerSection))

    // Informational articles: round instead of floor to get 3 dynamic H2s at 1000 words
    // floor(520/180) = 2 is too few content sections; round(2.88) = 3
    if (articleType === 'informational') {
      calculatedH2Count = Math.max(0, Math.round(availableForSections / wordsPerSection))
    }

    // Ensure minimum of 2 total H2s for article structure
    const totalH2s = fixedH2s + calculatedH2Count
    if (totalH2s < 2) {
      calculatedH2Count = Math.max(0, 2 - fixedH2s)
    }
    // Recipe: ensure at least 1 dynamic H2 so there are 2 content sections (tips + 1 dynamic)
    if (articleType === 'recipe' && calculatedH2Count < 1) {
      calculatedH2Count = 1
    }
    // Dynamic cap based on target word count (allows proper scaling to 2000-3000 words)
    // Use 150 words as divisor to allow flexibility in section length while maintaining structure
    const maxSections = Math.ceil(targetWordCount / 150)
    calculatedH2Count = Math.min(maxSections, calculatedH2Count)
    console.log(`[Orchestrator] Dynamic section cap: ${maxSections} sections allowed for ${targetWordCount} words`)

    // CRITICAL: For listicle articles, the NUMBERED list items must be ODD (5, 7, 9...)
    // Only calculatedH2Count matters — fixedH2s are non-numbered components (e.g., Honorable Mentions)
    if (articleType === 'listicle' && calculatedH2Count % 2 === 0) {
      calculatedH2Count = calculatedH2Count + 1 // Add one to make numbered items odd
      console.log(`[Orchestrator] Listicle format: adjusted to odd numbered H2 count: ${calculatedH2Count}`)
    }
    // Ensure minimum 5 numbered items for listicle articles
    if (articleType === 'listicle' && calculatedH2Count < 5) {
      calculatedH2Count = 5
      console.log(`[Orchestrator] Listicle format: enforced minimum 5 numbered items`)
    }

    console.log(`[Orchestrator] Word budget: target=${targetWordCount}, fixed=${fixedWords}, unique=${uniqueWords}, perSection=${wordsPerSection}`)
    console.log(`[Orchestrator] H2 calculation: ${fixedH2s} fixed + ${calculatedH2Count} dynamic = ${fixedH2s + calculatedH2Count} total H2s`)
    console.log(`[Orchestrator] Available for dynamic sections: ${availableForSections} words`)

    // CRITICAL FIX: For affiliate articles with real products, cap h2Count to product count
    // This prevents the flow from having more product-card entries than actual products
    // which was causing massive HTML duplication (sections being repeated 8+ times)
    let effectiveH2Count = calculatedH2Count
    if (articleType === 'affiliate' && affiliateProducts && affiliateProducts.length > 0) {
      effectiveH2Count = affiliateProducts.length
      console.log(`[Orchestrator] Affiliate with ${affiliateProducts.length} products: capping h2Count from ${calculatedH2Count} to ${effectiveH2Count}`)
    }

    // Build dynamic flow based on effective H2 count (product count for affiliate, calculated for others)
    const flow = buildDynamicFlow(articleType, effectiveH2Count)
    // Count H2s - for affiliate, product-card elements serve as H2 sections
    const h2Count = flow.filter(f => f === 'h2' || f === 'product-card').length
    console.log(`[Orchestrator] Flow: ${h2Count} H2 sections planned (from ${targetWordCount} words target)`)

    // Prepare affiliate products for structure generation (cleaned names + badges)
    const affiliateProductsForStructure = affiliateProducts && affiliateProducts.length > 0
      ? affiliateProducts.map(p => ({
        name: (p as any).cleanedName || p.title,
        badge: p.badge
      }))
      : undefined

    if (affiliateProductsForStructure) {
      console.log(`[Orchestrator] Passing ${affiliateProductsForStructure.length} products to structure generation:`)
      affiliateProductsForStructure.forEach((p, i) => console.log(`[Orchestrator]   ${i + 1}. "${p.name}" (${p.badge})`))
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PROMISE-AWARE STRUCTURE GENERATION (Phase 2 Integration)
    // ═══════════════════════════════════════════════════════════════════════════════
    // NEW: Sequential H1 → H2 generation with promise fulfillment
    // 1. Extract core keywords from topic for natural H2 integration
    // 2. Generate H1 first with correct number for listicles
    // 3. Extract H1 promise to understand what H2s should deliver
    // 4. Generate H2s that explicitly fulfill the H1 promise
    // 5. Validate and re-prompt if needed
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log(`[Orchestrator] Phase 1.5: Promise-aware structure generation...`)
    yield { type: 'phase', phase: 'structure', message: 'Extracting core keywords...' }

    // Step 0: Extract core keywords from topic for natural H2 integration
    // This prevents awkward keyword stuffing like "Funny Aspects of WWE Botches Mishaps"
    const keywordResult = await extractCoreKeywords(topic, {
      heuristicOnly: false, // Allow AI fallback for complex phrases
      provider,
      costTracking
    })
    const coreKeywords = keywordResult.coreKeywords

    console.log(`[Orchestrator] Keyword extraction:`)
    console.log(`[Orchestrator]   Original phrase: "${topic}"`)
    console.log(`[Orchestrator]   Core keywords: ${coreKeywords.join(', ')}`)
    console.log(`[Orchestrator]   Method: ${keywordResult.method}`)
    console.log(`[Orchestrator]   Confidence: ${keywordResult.confidence}`)
    console.log(`[Orchestrator] ℹ️ These keywords will be used for natural H1/H2 phrasing`)

    yield { type: 'phase', phase: 'structure', message: 'Generating H1 with promise detection...' }

    // Step 1: Generate H1 independently with h2Count for listicle alignment
    // OR use preset H1 if provided (bulk parallel generation)
    let h1Result: { h1: string; normalizedH1: string; meta: { title: string; description: string }; promise: ReturnType<typeof extractH1Promise> }
    
    if (presetH1) {
      // Use pre-generated H1 (bulk parallel mode)
      console.log(`[Orchestrator] Using preset H1: "${presetH1}"`)
      const promise = extractH1Promise(presetH1)
      h1Result = {
        h1: presetH1,
        normalizedH1: presetH1,
        meta: {
          title: presetMetaTitle || presetH1.substring(0, 60),
          description: presetMetaDescription || `Learn about ${topic}. ${presetH1}`,
        },
        promise,
      }
      console.log(`[Orchestrator] Preset H1 promise extracted:`)
      console.log(`[Orchestrator]   Type: ${promise.promiseType}`)
      console.log(`[Orchestrator]   Count: ${promise.count}`)
      console.log(`[Orchestrator]   Subject: "${promise.subject}"`)
    } else {
      // Generate H1 normally
      const generatedH1 = await generateH1Only({
        topic,
        primaryKeyword: topic,
        articleType,
        variation: config.variation,
        h2Count,
        targetWordCount,
        affiliateProducts: affiliateProductsForStructure,
        provider,
        coreKeywords,
        previousH1s,
      })

      if (generatedH1.error) {
        console.log(`[Orchestrator] ❌ H1 generation failed: ${generatedH1.error}`)
        throw new Error(generatedH1.error || 'Failed to generate H1')
      }

      h1Result = generatedH1
      console.log(`[Orchestrator] H1 generated: "${h1Result.h1}"`)
      console.log(`[Orchestrator] Normalized H1: "${h1Result.normalizedH1}"`)
      console.log(`[Orchestrator] Promise extracted:`)
      console.log(`[Orchestrator]   Type: ${h1Result.promise.promiseType}`)
      console.log(`[Orchestrator]   Count: ${h1Result.promise.count}`)
      console.log(`[Orchestrator]   Subject: "${h1Result.promise.subject}"`)
      console.log(`[Orchestrator]   Confidence: ${h1Result.promise.confidence}`)
    }

    // Build H1 promise context for content generators — ensures all sections deliver on the H1's angle
    const h1PromiseContext = buildPromiseContextBlock(h1Result.normalizedH1, h1Result.promise, config.variation)

    // Word budget determines h2Count — the H1 number is normalized to match in generateH1Only.
    // We do NOT override h2Count with the H1 promise count, because the budget is the constraint.

    yield { type: 'phase', phase: 'structure', message: 'Generating promise-fulfilling H2s...' }

    // Step 2: Generate H2s that fulfill the H1 promise
    const h2Result = await generateH2sFromH1({
      normalizedH1: h1Result.normalizedH1,
      h1Promise: h1Result.promise,
      topic,
      primaryKeyword: topic,
      articleType,
      variation: config.variation,
      h2Count,
      coreKeywords, // Pass extracted keywords for natural integration
      affiliateProducts: affiliateProductsForStructure,
      provider,
    })

    if (h2Result.error) {
      console.log(`[Orchestrator] ❌ H2 generation failed: ${h2Result.error}`)
      throw new Error(h2Result.error || 'Failed to generate H2s')
    }

    console.log(`[Orchestrator] H2s generated (${h2Result.attempts} attempt${h2Result.attempts > 1 ? 's' : ''}):`)
    console.log(`[Orchestrator]   Validation score: ${h2Result.validation.score}/100`)
    console.log(`[Orchestrator]   Fulfilled: ${h2Result.validation.fulfilled}`)
    if (h2Result.validation.issues.length > 0) {
      console.log(`[Orchestrator]   Issues: ${h2Result.validation.issues.join(', ')}`)
    }
    h2Result.h2s.forEach((h2, i) => console.log(`[Orchestrator]     ${i + 1}. "${h2}"`))

    // Grammar-correct the H2s (fixes capitalization issues like "clubhouse" → "Clubhouse")
    const grammarCorrectedH2s = await correctGrammarBatch(
      h2Result.h2s,
      { type: 'h2', provider, logCorrections: true, costTracking }
    )
    // Also grammar-correct the closing H2
    const grammarCorrectedClosingH2 = (await correctGrammarBatch(
      [h2Result.closingH2],
      { type: 'h2', provider, logCorrections: false, costTracking }
    ))[0]
    
    // Programmatic safety net: Ensure question marks are added if AI missed them
    h2Result.h2s = grammarCorrectedH2s.map(h2 => ensureQuestionMark(h2, config.variation))
    h2Result.closingH2 = ensureQuestionMark(grammarCorrectedClosingH2, config.variation)

    // Step 3: Fallback to old generator for FAQ and image alts (not part of promise system)
    // TODO: In future, generate FAQ and image alts separately with their own prompts
    const structureResult = await generateStructureAI({
      topic,
      primaryKeyword: topic,
      articleType,
      h2Count,
      provider,
      titleFormat: config.variation,
      affiliateProducts: affiliateProductsForStructure,
      coreKeywords, // Pass extracted keywords for natural component H2s
      costTracking,
    })

    // Use promise-aware H1 and H2s, but keep FAQ from old generator
    const aiStructure = {
      h1: h1Result.normalizedH1,
      h2s: h2Result.h2s,
      closing: { h2: h2Result.closingH2 },
      faq: structureResult.structure?.faq || { h2: 'Frequently Asked Questions', questions: [] },
      meta: h1Result.meta,
      imageAlts: structureResult.structure?.imageAlts || { featured: '', h2s: [] },
    }
    console.log(`[Orchestrator] Structure received:`)
    console.log(`[Orchestrator]   H1: "${aiStructure.h1}"`)
    console.log(`[Orchestrator]   H2s: ${aiStructure.h2s.length}`)
    console.log(`[Orchestrator]   FAQs: ${aiStructure.faq.questions.length}`)

    const h2Titles = aiStructure.h2s.map((h2Title, i) => ({
      id: `h2-${i}`,
      title: h2Title,
      index: i + 1
    }))

    // For listicle format, normalize H1/H2 numbering to ensure coherence
    let normalizedH1 = aiStructure.h1
    let normalizedH2Titles = h2Titles
    let normalizedClosingH2 = aiStructure.closing.h2 || `Final Thoughts on ${topic}`

    // Strip any numbers from closing H2 immediately (component H2s should never be numbered)
    normalizedClosingH2 = stripH2Number(normalizedClosingH2)

    let tocItemsForStructure: Array<{ id: string; title: string; href: string }> =
      h2Titles.map((h2, i) => ({ id: `section-${i}`, title: h2.title, href: `#section-${i}` }))

    if (config.variation === 'listicle') {
      console.log(`[Orchestrator] Listicle detected - normalizing H1/H2 numbering...`)
      const normalization = normalizeListicleStructure(
        aiStructure.h1,
        h2Titles,
        normalizedClosingH2
      )
      normalizedH1 = normalization.normalizedH1
      normalizedH2Titles = normalization.normalizedH2Titles.map(h2 => ({
        id: h2.id,
        title: h2.title,
        index: h2.index,
      }))
      normalizedClosingH2 = normalization.normalizedClosingH2

      // TOC uses ONLY list-item H2s (no honorable mentions, no component H2s, no closing)
      tocItemsForStructure = normalization.tocItemH2s.map((h2, i) => ({
        id: `section-${normalizedH2Titles.findIndex(t => t.title === h2.title)}`,
        title: h2.title,
        href: `#section-${normalizedH2Titles.findIndex(t => t.title === h2.title)}`,
      }))

      console.log(`[Orchestrator] Listicle normalization complete:`)
      console.log(`[Orchestrator]   H1: "${normalizedH1}"`)
      console.log(`[Orchestrator]   List items: ${normalization.listItemCount}`)
      console.log(`[Orchestrator]   TOC entries: ${tocItemsForStructure.length}`)
    }

    // Build structure with promise fulfillment metadata (Phase 5)
    const structure: ArticleStructure = {
      h1: normalizedH1,
      h1Variation: config.variation,
      h2Titles: normalizedH2Titles,
      faqQuestions: aiStructure.faq.questions,
      closingH2: normalizedClosingH2,
      tocItems: tocItemsForStructure,
      articleType,
      topic,
      // Keyword extraction metadata (for natural H2 integration)
      coreKeywords,
      primaryKeyword: topic,
      // Promise fulfillment metadata
      dynamicH2s: h2Result.h2s,  // The promise-fulfilling H2s
      componentH2s: {
        faq: aiStructure.faq.h2 || 'Frequently Asked Questions',
        closing: normalizedClosingH2,
      },
      promiseValidation: {
        score: h2Result.validation.score,
        fulfilled: h2Result.validation.fulfilled,
        attempts: h2Result.attempts,
        issues: h2Result.validation.issues.length > 0 ? h2Result.validation.issues : undefined,
      },
    }

    yield { type: 'structure_complete', structure }

    // Image alt texts from AI structure (with fallbacks) - extract before using
    const featuredImageAlt = aiStructure.imageAlts?.featured || `Comprehensive visual guide about ${topic} showing key concepts and practical applications for better understanding`
    const h2ImageAlts = aiStructure.imageAlts?.h2s || []

    // Send header immediately
    const h1Html = `<header data-component="scai-h1"><h1 class="scai-h1">${structure.h1}</h1></header>`

    // FEATURED HERO IMAGE: Use featured alt as the PRIMARY BRIEF for image generation
    // The featured alt describes the exact visual we want - use it as the prompt source
    // This ensures the generated image matches what the alt text describes
    const featuredPlaceholder = createEnhancedPlaceholder({
      text: featuredImageAlt,  // Use featured alt as prompt (not generic "Featured {topic}")
      articleType,
      imageType: 'featured-hero',  // Use hero image type for stricter quality rules
      sectionIndex: 0,
      componentType: 'featured-image'
    })

    // Generate AI caption for featured image
    const featuredCaptionResult = await generateImageCaption({
      imageDescription: `Featured image about ${topic}`,
      articleTopic: topic,
      imageType: 'featured',
      provider,
    })
    const featuredCaption = featuredCaptionResult.success ? featuredCaptionResult.data : `Featured image about ${topic}`

    const featuredImageHtml = `<figure data-component="scai-featured-image" class="scai-featured-image"><img src="${featuredPlaceholder}" alt="${featuredImageAlt}" /><figcaption>${featuredCaption}</figcaption></figure>`

    yield { type: 'header_ready', h1Html, featuredImageHtml }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2: CONTENT GENERATION + TEMPLATE HYDRATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Orchestrator] Phase 2: Generating content...')
    yield { type: 'phase', phase: 'content', message: 'Generating content...' }

    // Build article context
    const articleContext = buildArticleContext(structure, resolvedVariation, undefined, undefined, componentColor)

    // Storage for generated content
    const generatedContent: Map<string, GeneratedContent | FAQContent> = new Map()

    // Meta info from AI structure
    const metaTitle = aiStructure.meta?.title || `${topic} - Complete Guide`
    const metaDescription = aiStructure.meta?.description || `Learn everything about ${topic}.`

    // Track cumulative HTML for streaming (grows as components are generated)
    let cumulativeHtml = h1Html + featuredImageHtml

    // ─── RECIPE PRE-GENERATION: Generate ingredients FIRST for connected content ───
    // For recipe articles, we generate ingredients BEFORE the overview so we can
    // reference specific ingredients throughout all sections for cohesive content
    let recipeContext: RecipeContext | undefined = undefined
    let preGeneratedIngredients: Awaited<ReturnType<typeof generateIngredients>> | null = null
    let preGeneratedInstructions: Awaited<ReturnType<typeof generateInstructions>> | null = null

    if (articleType === 'recipe') {
      console.log('[Orchestrator] Recipe article detected - pre-generating ingredients for connected content...')

      // Generate ingredients first
      preGeneratedIngredients = await generateIngredients({
        recipeTopic: topic,
        primaryKeyword: topic,
        servings: 4,
        provider,
        titleFormat: config.variation as TitleFormat,
        costTracking,
      })

      if (preGeneratedIngredients.success && preGeneratedIngredients.data) {
        const ingredientsList = preGeneratedIngredients.data.items.map(i => `${i.quantity} ${i.name}`)

        // Now generate instructions with the actual ingredients
        preGeneratedInstructions = await generateInstructions({
          recipeTopic: topic,
          primaryKeyword: topic,
          ingredients: ingredientsList,
          provider,
          titleFormat: config.variation as TitleFormat,
          costTracking,
        })

        const instructionText = preGeneratedInstructions?.success && preGeneratedInstructions.data
          ? preGeneratedInstructions.data.steps.map(s => s.text).join(' ').toLowerCase()
          : ''

        // Build timeline notes from instruction text (avoids contradictions in overview/FAQ)
        const timelineNotes: string[] = []
        if (/\b\d+\s*day(s)?\b/i.test(instructionText)) {
          timelineNotes.push('Includes multi-day soaking or prep')
        }
        if (instructionText.includes('overnight')) {
          timelineNotes.push('Includes overnight resting/settling')
        }
        if (/\b\d+\s*hour(s)?\b/i.test(instructionText)) {
          timelineNotes.push('Includes hour-level prep time')
        }
        const timelineNote = timelineNotes.length > 0 ? timelineNotes.join('. ') : undefined

        // Determine fermentation handling from instructions
        let fermentation: 'uses' | 'avoids' | 'unknown' = 'unknown'
        if (instructionText.includes('ferment')) {
          if (instructionText.includes('prevent fermentation') || instructionText.includes('avoid fermentation') || instructionText.includes('without fermentation')) {
            fermentation = 'avoids'
          } else {
            fermentation = 'uses'
          }
        }

        // Infer cooking method and style from ingredients and topic
        const cookingMethods = ['baking', 'grilling', 'sautéing', 'roasting', 'frying', 'steaming', 'braising', 'boiling']
        const topicLower = topic.toLowerCase()
        let inferredMethod = 'cooking'
        for (const method of cookingMethods) {
          if (topicLower.includes(method) || topicLower.includes(method.slice(0, -3))) {
            inferredMethod = method
            break
          }
        }
        // Check instructions for cooking method hints
        if (preGeneratedInstructions?.success && preGeneratedInstructions.data) {
          for (const method of cookingMethods) {
            if (instructionText.includes(method)) {
              inferredMethod = method
              break
            }
          }
        }

        // Infer cuisine style
        const cuisineHints: Record<string, string[]> = {
          'Italian': ['pasta', 'parmesan', 'basil', 'oregano', 'tomato sauce', 'olive oil', 'mozzarella'],
          'Mexican': ['cilantro', 'jalapeño', 'cumin', 'tortilla', 'salsa', 'lime', 'avocado'],
          'Asian': ['soy sauce', 'ginger', 'sesame', 'rice', 'noodles', 'tofu', 'fish sauce'],
          'Indian': ['curry', 'turmeric', 'garam masala', 'cumin', 'coriander', 'ghee'],
          'Mediterranean': ['feta', 'olives', 'hummus', 'pita', 'tahini', 'za\'atar'],
          'American comfort': ['butter', 'cheese', 'bacon', 'gravy', 'biscuit'],
        }

        let inferredCuisine = 'homestyle'
        const ingredientsLower = ingredientsList.join(' ').toLowerCase()
        for (const [cuisine, hints] of Object.entries(cuisineHints)) {
          if (hints.some(hint => ingredientsLower.includes(hint) || topicLower.includes(hint))) {
            inferredCuisine = cuisine
            break
          }
        }

        // Ingredient clarifications to avoid ambiguity (e.g., multiple water entries)
        const ingredientNotes: string[] = []
        const ingredientNames = preGeneratedIngredients.data.items.map(i => i.name.toLowerCase())
        const waterCount = ingredientNames.filter(name => name.includes('water')).length
        if (waterCount > 1) {
          ingredientNotes.push('Multiple water entries represent different stages (soaking vs cooking)')
        }

        // Build recipe context for connected content
        const activeCookTime = preGeneratedInstructions?.success && preGeneratedInstructions.data
          ? `${preGeneratedInstructions.data.steps.length * 5}-${preGeneratedInstructions.data.steps.length * 8} minutes`
          : undefined
        recipeContext = {
          dishName: topic,
          ingredients: ingredientsList,
          cookingMethod: inferredMethod,
          cookTime: activeCookTime ? (timelineNote ? `Active cook time: ${activeCookTime}` : activeCookTime) : undefined,
          servings: 4,
          cuisineStyle: inferredCuisine,
          timelineNote,
          fermentation,
          ingredientNotes: ingredientNotes.length > 0 ? ingredientNotes : undefined,
        }

        console.log(`[Orchestrator] Recipe context built:`)
        console.log(`[Orchestrator]   Dish: ${recipeContext.dishName}`)
        console.log(`[Orchestrator]   Ingredients: ${recipeContext.ingredients.length} items`)
        console.log(`[Orchestrator]   Method: ${recipeContext.cookingMethod}`)
        console.log(`[Orchestrator]   Style: ${recipeContext.cuisineStyle}`)
        console.log(`[Orchestrator]   Timeline: ${recipeContext.timelineNote}`)
        console.log(`[Orchestrator]   Fermentation: ${recipeContext.fermentation}`)
        console.log(`[Orchestrator] 🍳 Recipe context will be passed to: overview, ${structure.h2Titles.length} sections, and closing`)
      }
    }

    // ─── REVIEW PRE-GENERATION: Generate features/pros/cons/rating FIRST for connected content ───
    // For review articles, we generate structured components BEFORE the overview so we can
    // reference rating, features, pros/cons throughout all sections for cohesive content
    let reviewContext: ReviewContext | undefined = undefined
    let preGeneratedFeatures: Awaited<ReturnType<typeof generateFeatureList>> | null = null
    let preGeneratedProsCons: Awaited<ReturnType<typeof generateProsCons>> | null = null
    let preGeneratedRating: { score: number; scoreDisplay: string; title: string; justification: string; h2?: string } | null = null

    if (articleType === 'review') {
      console.log('[Orchestrator] Review article detected - pre-generating features/pros/cons/rating for connected content...')

      // Use user-provided product name if available, otherwise fall back to topic
      const userReview = typeContext?.reviewInfo
      const reviewProductName = userReview?.productName?.trim() || topic
      if (userReview?.productName?.trim()) {
        console.log(`[Orchestrator] Using USER-PROVIDED review product name: "${reviewProductName}"`)
      }

      // Generate feature list first
      preGeneratedFeatures = await generateFeatureList({
        topic,
        primaryKeyword: topic,
        productOrService: reviewProductName,
        provider,
        coreKeywords,
        costTracking,
      })

      console.log('[Orchestrator] [Review] Feature list pre-generation:', preGeneratedFeatures.success ? 'SUCCESS' : 'FAILED',
        preGeneratedFeatures.success ? `features: ${preGeneratedFeatures.data?.features?.length}` : preGeneratedFeatures.error)

      // Generate pros/cons - pass titleFormat for H2 format consistency
      preGeneratedProsCons = await generateProsCons({
        topic,
        primaryKeyword: topic,
        productName: reviewProductName,
        provider,
        titleFormat: config.variation as 'question' | 'statement' | 'listicle', // Pass format for H2 consistency
        coreKeywords,
        costTracking,
      })

      console.log('[Orchestrator] [Review] Pros/cons pre-generation:', preGeneratedProsCons.success ? 'SUCCESS' : 'FAILED',
        preGeneratedProsCons.success ? `pros: ${preGeneratedProsCons.data?.pros?.length}, cons: ${preGeneratedProsCons.data?.cons?.length}` : preGeneratedProsCons.error)

      // Generate rating (needs pros/cons context for consistency)
      const prosConsContext = preGeneratedProsCons?.success && preGeneratedProsCons.data
        ? `Pros: ${preGeneratedProsCons.data.pros.slice(0, 3).join(', ')}. Cons: ${preGeneratedProsCons.data.cons.slice(0, 3).join(', ')}`
        : ''

      const ratingResult = await generateUniqueComponent({
        componentType: 'rating',
        schema: RatingContentSchema,
        prompt: `Generate a rating for: ${topic}. Primary keyword: ${topic}.
Context for rating consistency: ${prosConsContext}

You MUST return JSON with:
{
  "h2": "Our Verdict" or similar heading,
  "score": 8.5,
  "scoreDisplay": "8.5" (just the number for display),
  "title": "Excellent" or "Highly Recommended" or "Good Value" (rating label),
  "justification": "100-word paragraph explaining the rating"
}

IMPORTANT: The score should be consistent with the pros/cons. More pros than cons = higher score. Significant cons = lower score.`,
        provider,
        costTracking,
      })

      if (ratingResult.success && ratingResult.data) {
        preGeneratedRating = ratingResult.data
        // Strip any numbers from rating H2 immediately (component H2s should never be numbered)
        if (preGeneratedRating.h2) {
          preGeneratedRating.h2 = stripH2Number(preGeneratedRating.h2)
        }
        console.log('[Orchestrator] [Review] Rating pre-generation: SUCCESS',
          `score: ${preGeneratedRating.score}, verdict: ${preGeneratedRating.title}`)
      } else {
        console.log('[Orchestrator] [Review] Rating pre-generation: FAILED', ratingResult.error)
      }

      // Build review context if we have enough data
      if (preGeneratedFeatures?.success && preGeneratedProsCons?.success && preGeneratedRating) {
        // Infer category from topic
        const topicLower = topic.toLowerCase()
        let inferredCategory = 'product'
        const categoryHints: Record<string, string[]> = {
          'software': ['app', 'software', 'platform', 'tool', 'service', 'saas'],
          'electronics': ['phone', 'laptop', 'computer', 'headphone', 'speaker', 'camera', 'tablet', 'watch'],
          'appliances': ['refrigerator', 'washer', 'dryer', 'oven', 'microwave', 'dishwasher', 'vacuum'],
          'fitness': ['treadmill', 'bike', 'weights', 'gym', 'fitness', 'exercise'],
          'gaming': ['console', 'controller', 'game', 'gaming', 'playstation', 'xbox', 'nintendo'],
          'audio': ['headphones', 'earbuds', 'speaker', 'soundbar', 'audio'],
          'home': ['furniture', 'mattress', 'pillow', 'decor', 'lighting'],
        }

        for (const [category, hints] of Object.entries(categoryHints)) {
          if (hints.some(hint => topicLower.includes(hint))) {
            inferredCategory = category
            break
          }
        }

        // Infer price point from pros/cons text - ONLY if explicit pricing cues found
        // Note: Not all reviews are about physical products (e.g., WWE, entertainment, services)
        // So we don't default to "mid-range" - only set if we have strong evidence
        const allText = [...preGeneratedProsCons.data!.pros, ...preGeneratedProsCons.data!.cons].join(' ').toLowerCase()
        let pricePoint: 'budget' | 'mid-range' | 'premium' | undefined = undefined
        if (allText.includes('expensive') || allText.includes('premium') || allText.includes('high price') || allText.includes('luxury') || allText.includes('costly')) {
          pricePoint = 'premium'
        } else if (allText.includes('affordable') || allText.includes('budget') || allText.includes('value') || allText.includes('cheap') || allText.includes('inexpensive') || allText.includes('low cost')) {
          pricePoint = 'budget'
        } else if (allText.includes('mid-range') || allText.includes('moderately priced') || allText.includes('average price')) {
          pricePoint = 'mid-range'
        }
        // If no explicit price cue found, pricePoint remains undefined - no default

        // Infer target audience from features/pros
        let targetAudience: string | undefined = undefined
        if (allText.includes('beginner') || allText.includes('easy to use') || allText.includes('simple')) {
          targetAudience = 'beginners and casual users'
        } else if (allText.includes('professional') || allText.includes('advanced') || allText.includes('expert')) {
          targetAudience = 'professionals and power users'
        } else if (allText.includes('family') || allText.includes('kids') || allText.includes('children')) {
          targetAudience = 'families'
        }

        reviewContext = {
          productName: reviewProductName,
          category: userReview?.category?.trim() || inferredCategory,
          rating: {
            score: preGeneratedRating.score,
            verdict: preGeneratedRating.title,
          },
          keyFeatures: preGeneratedFeatures.data!.features.slice(0, 4).map(f => f.title),
          topPros: preGeneratedProsCons.data!.pros.slice(0, 3),
          topCons: preGeneratedProsCons.data!.cons.slice(0, 2),
          pricePoint: userReview?.pricePoint || pricePoint,
          targetAudience,
        }

        console.log(`[Orchestrator] Review context built:`)
        console.log(`[Orchestrator]   Product: ${reviewContext.productName}`)
        console.log(`[Orchestrator]   Category: ${reviewContext.category}`)
        console.log(`[Orchestrator]   Rating: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"`)
        console.log(`[Orchestrator]   Key features: ${reviewContext.keyFeatures.length} items`)
        console.log(`[Orchestrator]   Top pros: ${reviewContext.topPros.length} items`)
        console.log(`[Orchestrator]   Top cons: ${reviewContext.topCons.length} items`)
        console.log(`[Orchestrator]   Price point: ${reviewContext.pricePoint}`)
        console.log(`[Orchestrator]   Target audience: ${reviewContext.targetAudience}`)
        console.log(`[Orchestrator] ⭐ Review context will be passed to: overview, ${structure.h2Titles.length} sections, and closing`)
      }
    }

    // ─── COMPARISON PRE-GENERATION: Extract items and generate comparison context ───
    // For comparison articles, we extract the two items being compared and generate
    // comparison criteria, differences, and recommendations BEFORE content generation
    let comparisonContext: ComparisonContext | undefined = undefined

    if (articleType === 'comparison') {
      console.log('[Orchestrator] Comparison article detected - pre-generating comparison context...')

      // Check if user provided comparison items
      const userComparison = typeContext?.comparisonInfo
      const hasUserComparisonItems = userComparison && userComparison.itemA?.trim() && userComparison.itemB?.trim()

      if (hasUserComparisonItems) {
        // User specified Item A and Item B — run AI extraction with those items pre-filled
        // This still lets AI generate criteria, differences, similarities, winner etc.
        console.log(`[Orchestrator] Using USER-PROVIDED comparison items: "${userComparison.itemA}" vs "${userComparison.itemB}"`)
        const userCriteria = userComparison.criteria?.split(',').map((s: string) => s.trim()).filter(Boolean) || []

        const comparisonExtractResult = await generateUniqueComponent({
          componentType: 'comparison-extract',
          schema: ComparisonExtractSchema,
          prompt: `Analyze this comparison: "${userComparison.itemA}" vs "${userComparison.itemB}"
Topic context: "${topic}"
Category: ${userComparison.category || 'determine from items'}
${userCriteria.length > 0 ? `User-specified criteria to compare: ${userCriteria.join(', ')}` : ''}

IMPORTANT: The two items being compared are ALREADY DETERMINED:
- Item A: "${userComparison.itemA}"
- Item B: "${userComparison.itemB}"
Do NOT change or rename these items. Use them exactly as provided.

Return JSON with:
- itemA: "${userComparison.itemA}" (use exactly as provided)
- itemB: "${userComparison.itemB}" (use exactly as provided)
- category: What type of things are being compared
- criteria: ${userCriteria.length >= 3 ? `Use these criteria: ${userCriteria.join(', ')}` : '4-6 aspects to compare (relevant to the category)'}
- keyDifferences: 3-4 major differences between them
- similarities: 1-2 things they share in common (optional but helpful)
- winnerName: Which one we recommend (or "It depends on your needs" if truly equal) - optional
- winnerReason: Brief reason for recommendation - optional
- chooseA: When to choose the first option - optional
- chooseB: When to choose the second option - optional
- targetAudience: Who would benefit from this comparison - optional`,
          provider,
          costTracking,
        })

        if (comparisonExtractResult.success && comparisonExtractResult.data) {
          const data = comparisonExtractResult.data
          comparisonContext = {
            itemA: userComparison.itemA!.trim(),
            itemB: userComparison.itemB!.trim(),
            category: userComparison.category?.trim() || data.category,
            criteria: userCriteria.length >= 3 ? userCriteria : data.criteria,
            keyDifferences: data.keyDifferences,
            similarities: data.similarities || [],
            winner: data.winnerName && data.winnerReason ? { name: data.winnerName, reason: data.winnerReason } : undefined,
            useCases: data.chooseA && data.chooseB ? { chooseA: data.chooseA, chooseB: data.chooseB } : undefined,
            targetAudience: data.targetAudience || undefined,
          }
          console.log(`[Orchestrator] ⚖️ Comparison context built with user items: ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
        } else {
          // Minimal context from user input only
          comparisonContext = {
            itemA: userComparison.itemA!.trim(),
            itemB: userComparison.itemB!.trim(),
            category: userComparison.category?.trim() || 'general',
            criteria: userCriteria.length > 0 ? userCriteria : ['features', 'value', 'quality'],
            keyDifferences: [],
            similarities: [],
          }
          console.warn('[Orchestrator] AI enrichment failed, using minimal user-provided comparison context')
        }
      } else {
      // Extract comparison items from topic using AI (fallback)
      const comparisonExtractResult = await generateUniqueComponent({
        componentType: 'comparison-extract',
        schema: ComparisonExtractSchema,
        prompt: `Extract comparison details from this topic: "${topic}"

This comparison could be between ANY two things: products, people, services, events, companies, frameworks, games, movies, etc.

IMPORTANT: Identify what is being compared and provide fair, balanced analysis.

Examples of what could be compared:
- Products: "iPhone 15 vs Samsung Galaxy S24"
- People: "Elon Musk vs Jeff Bezos leadership styles"
- Services: "Netflix vs Disney+ for families"
- Events: "Super Bowl vs World Cup viewership"
- Frameworks: "React vs Vue for web development"
- Games: "FIFA 24 vs eFootball 2024"

Return JSON with:
- itemA: First item name (extract from topic)
- itemB: Second item name (extract from topic)
- category: What type of things are being compared
- criteria: 4-6 aspects to compare (relevant to the category)
- keyDifferences: 3-4 major differences between them
- similarities: 1-2 things they share in common (optional but helpful)
- winnerName: Which one we recommend (or "It depends on your needs" if truly equal) - optional
- winnerReason: Brief reason for recommendation - optional
- chooseA: When to choose the first option - optional
- chooseB: When to choose the second option - optional
- targetAudience: Who would benefit from this comparison - optional`,
        provider,
        costTracking,
      })

      if (comparisonExtractResult.success && comparisonExtractResult.data) {
        const data = comparisonExtractResult.data

        console.log('[Orchestrator] [Comparison] Extraction successful:')
        console.log(`[Orchestrator]   Item A: ${data.itemA}`)
        console.log(`[Orchestrator]   Item B: ${data.itemB}`)
        console.log(`[Orchestrator]   Category: ${data.category}`)
        console.log(`[Orchestrator]   Criteria: ${data.criteria.length} items - ${data.criteria.slice(0, 3).join(', ')}...`)
        console.log(`[Orchestrator]   Key differences: ${data.keyDifferences.length} items`)
        console.log(`[Orchestrator]   Similarities: ${data.similarities?.length || 0} items`)

        comparisonContext = {
          itemA: data.itemA,
          itemB: data.itemB,
          category: data.category,
          criteria: data.criteria,
          keyDifferences: data.keyDifferences,
          similarities: data.similarities || [],
          winner: data.winnerName && data.winnerReason ? {
            name: data.winnerName,
            reason: data.winnerReason,
          } : undefined,
          useCases: data.chooseA && data.chooseB ? {
            chooseA: data.chooseA,
            chooseB: data.chooseB,
          } : undefined,
          targetAudience: data.targetAudience || undefined,
        }

        console.log(`[Orchestrator] ⚖️ Comparison context built:`)
        console.log(`[Orchestrator]   Comparing: ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
        console.log(`[Orchestrator]   Category: ${comparisonContext.category}`)
        console.log(`[Orchestrator]   Criteria: ${comparisonContext.criteria.join(', ')}`)
        console.log(`[Orchestrator]   Winner: ${comparisonContext.winner?.name || 'No clear winner'}`)
        console.log(`[Orchestrator]   Use cases defined: ${comparisonContext.useCases ? 'Yes' : 'No'}`)
        console.log(`[Orchestrator] ⚖️ Comparison context will be passed to: overview, ${structure.h2Titles.length} sections, and closing`)
      } else {
        console.warn('[Orchestrator] [Comparison] Failed to extract comparison context:', comparisonExtractResult.error)
        console.log('[Orchestrator] Proceeding without comparison context - content may be less connected')
      }
      } // end else (AI fallback for comparison)
    }

    // ─── COMMERCIAL PRE-GENERATION: Extract product/service info and value propositions ───
    // For commercial articles, we extract the product/service details, benefits, and target audience
    // BEFORE content generation to ensure persuasive, connected commercial content
    let commercialContext: CommercialContext | undefined = undefined

    if (articleType === 'commercial') {
      console.log('[Orchestrator] Commercial article detected - pre-generating commercial context...')

      // Check if user provided commercial product/service info
      const userCommercial = typeContext?.commercialInfo
      const hasUserCommercialData = userCommercial && userCommercial.productName?.trim()

      if (hasUserCommercialData) {
        // Build CommercialContext directly from user-provided data — skip AI extraction
        console.log('[Orchestrator] Using USER-PROVIDED commercial context (skipping AI extraction)')
        commercialContext = {
          productName: userCommercial.productName!.trim(),
          category: userCommercial.category?.trim() || 'general',
          keyBenefits: userCommercial.keyBenefits?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
          keyFeatures: userCommercial.keyFeatures?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
          targetAudience: userCommercial.targetAudience?.trim() || 'general audience',
          painPoint: userCommercial.painPoint?.trim() || `challenges related to ${userCommercial.productName}`,
          uniqueValue: userCommercial.uniqueValue?.trim() || `the unique value of ${userCommercial.productName}`,
          ctaSuggestion: userCommercial.ctaSuggestion?.trim() || undefined,
          pricePosition: userCommercial.pricePosition || undefined,
        }

        console.log(`[Orchestrator] 💼 Commercial context built from user input:`)
        console.log(`[Orchestrator]   Product: ${commercialContext.productName}`)
        console.log(`[Orchestrator]   Category: ${commercialContext.category}`)
        console.log(`[Orchestrator]   Target: ${commercialContext.targetAudience}`)
        console.log(`[Orchestrator]   Benefits: ${commercialContext.keyBenefits.length} items`)
        console.log(`[Orchestrator]   Features: ${commercialContext.keyFeatures.length} items`)
        console.log(`[Orchestrator]   CTA: ${commercialContext.ctaSuggestion || 'Take action'}`)
      } else {
      // Extract commercial details from topic using AI (fallback)
      const commercialExtractResult = await generateUniqueComponent({
        componentType: 'commercial-extract',
        schema: CommercialExtractSchema,
        prompt: `Extract commercial/business details from this topic: "${topic}"

This is for COMMERCIAL content - identify what product/service is being SOLD/PROMOTED (not just what the topic is about).

CRITICAL DISTINCTION:
The topic might be ABOUT something (like "iPhone 15 review" or "the rock and john cena wwe"), 
but the PRODUCT being sold is different (like "iPhone 15 device" or "WWE Live Event Tickets").

Ask yourself:
- If this were a sales page, what would we be selling?
- What can someone BUY or SIGN UP FOR related to this topic?
- What's the commercial offering here?

EXAMPLES:
Topic: "the rock and john cena wwe" → Product: "WWE Live Event Tickets" (NOT "the rock and john cena wwe")
Topic: "best crm for small business" → Product: "CRM Software Solutions" (or specific CRM name if clear)
Topic: "how to lose weight fast" → Product: "Weight Loss Program" or "Fitness Coaching"
Topic: "macbook pro 2024 review" → Product: "MacBook Pro 2024"
Topic: "project management tips" → Product: "Project Management Software" or "PM Training Course"

Analyze the topic to identify:
1. What is the ACTUAL product or service being sold? (Be specific, avoid using the raw topic phrase)
2. What industry/category does it belong to?
3. Who is the ideal customer/target audience?
4. What pain point does it solve?
5. What are the key benefits (outcomes, not just features)?
6. What makes it unique or different from alternatives?

Be specific and persuasive - this will guide commercial content generation.

Return JSON with:
- productName: The ACTUAL product/service name (e.g., "WWE Live Events", NOT "the rock and john cena wwe")
- category: Industry/category (e.g., "sports entertainment", "SaaS", "consulting", "fitness")
- keyBenefits: 4-6 key benefits/value propositions (focus on outcomes)
- keyFeatures: 3-5 main features that deliver the benefits
- targetAudience: Who this is for (be specific: "wrestling fans", "small business owners", etc.)
- painPoint: The primary problem this solves
- uniqueValue: What makes this different/better (unique selling proposition)
- ctaSuggestion: Call-to-action idea (e.g., "Get Tickets", "Start Free Trial", "Buy Now")
- pricePosition: "budget", "mid-range", "premium", or "enterprise" - optional
- socialProof: Any relevant credibility element - optional`,
        provider,
        costTracking,
      })

      if (commercialExtractResult.success && commercialExtractResult.data) {
        const data = commercialExtractResult.data

        console.log('[Orchestrator] [Commercial] Extraction successful:')
        console.log(`[Orchestrator]   Product/Service: ${data.productName}`)
        console.log(`[Orchestrator]   Category: ${data.category}`)
        console.log(`[Orchestrator]   Target Audience: ${data.targetAudience}`)
        console.log(`[Orchestrator]   Pain Point: ${data.painPoint}`)
        console.log(`[Orchestrator]   Key Benefits: ${data.keyBenefits.length} items - ${data.keyBenefits.slice(0, 3).join(', ')}...`)
        console.log(`[Orchestrator]   Key Features: ${data.keyFeatures.length} items`)
        console.log(`[Orchestrator]   Unique Value: ${data.uniqueValue}`)

        commercialContext = {
          productName: data.productName,
          category: data.category,
          keyBenefits: data.keyBenefits,
          keyFeatures: data.keyFeatures,
          targetAudience: data.targetAudience,
          painPoint: data.painPoint,
          uniqueValue: data.uniqueValue,
          ctaSuggestion: data.ctaSuggestion ?? undefined,
          pricePosition: data.pricePosition ?? undefined,
          socialProof: data.socialProof ?? undefined,
        }

        console.log(`[Orchestrator] 💼 Commercial context built:`)
        console.log(`[Orchestrator]   Product: ${commercialContext.productName}`)
        console.log(`[Orchestrator]   Category: ${commercialContext.category}`)
        console.log(`[Orchestrator]   Target: ${commercialContext.targetAudience}`)
        console.log(`[Orchestrator]   CTA: ${commercialContext.ctaSuggestion || 'Take action'}`)
        console.log(`[Orchestrator] 💼 Commercial context will be passed to: overview, ${structure.h2Titles.length} sections, and closing`)
      } else {
        console.warn('[Orchestrator] [Commercial] Failed to extract commercial context:', commercialExtractResult.error)
        console.log('[Orchestrator] Proceeding without commercial context - content may be less persuasive')
      }
      } // end else (AI fallback)
    }

    // ─── OVERVIEW (Token-by-token streaming) ───
    yield { type: 'component_start', componentId: 'overview', index: 1, total: 10 }
    console.log('[Orchestrator] Starting overview generation...')
    if (recipeContext) {
      console.log('[Orchestrator] ✅ Passing recipe context to overview')
    }
    if (reviewContext) {
      console.log('[Orchestrator] ✅ Passing review context to overview')
    }
    if (comparisonContext) {
      console.log('[Orchestrator] ✅ Passing comparison context to overview')
    }
    if (commercialContext) {
      console.log('[Orchestrator] ✅ Passing commercial context to overview')
    }

    // Use resilient stream consumption with automatic fallback
    let overviewText = ''
    let overviewChunkCount = 0
    const overviewProviders: Array<'gemini' | 'openai'> = [provider as 'gemini' | 'openai', provider === 'gemini' ? 'openai' : 'gemini']
    let overviewSuccess = false

    for (const currentProvider of overviewProviders) {
      if (overviewSuccess) break

      try {
        const overviewStream = await streamOverview({
          topic,
          primaryKeyword: topic,
          articleType,
          h1: structure.h1,
          provider: currentProvider,
          clusterKeywords: config.clusterKeywords,
          recipeContext,
          reviewContext,
          comparisonContext,
          commercialContext,
          titleFormat: config.variation as 'question' | 'statement' | 'listicle',
          h1PromiseContext,
        })

        overviewText = ''
        overviewChunkCount = 0

        for await (const chunk of overviewStream.textStream) {
          overviewText += chunk
          overviewChunkCount++

          // Emit chunk every few tokens for smooth streaming
          if (overviewChunkCount % 3 === 0 || chunk.includes('.') || chunk.includes('!') || chunk.includes('?')) {
            const currentParagraphs = overviewText
              .split(/\n\n+/)
              .map(p => p.trim())
              .filter(p => p.length > 0)

            const currentInnerHtml = currentParagraphs
              .map(p => `<p class="scai-paragraph">${p}</p>`)
              .join('\n')

            const currentOverviewHtml = `<section data-component="scai-overview" class="scai-overview">${currentInnerHtml}</section>`

            yield {
              type: 'component_chunk',
              componentId: 'overview',
              chunk: chunk,
              accumulated: cumulativeHtml + currentOverviewHtml
            }
          }
        }

        // Log stream usage if cost tracking is enabled
        if (costTracking) {
          try {
            const usage = await overviewStream.usage
            if (usage && (usage.inputTokens || usage.outputTokens)) {
              logAiUsageAsync({
                historyId: costTracking.historyId,
                userId: costTracking.userId,
                bulkJobId: costTracking.bulkJobId,
                provider: currentProvider,
                modelId: currentProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini',
                operationType: 'stream',
                operationName: 'streamOverview',
                inputTokens: usage.inputTokens || 0,
                outputTokens: usage.outputTokens || 0,
                success: true,
              })
            }
          } catch (usageError) {
            console.warn('[Orchestrator] Failed to log overview stream usage:', usageError)
          }
        }

        overviewSuccess = true
        console.log(`[Orchestrator] Overview stream completed with ${currentProvider}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`[Orchestrator] ❌ Overview stream failed with ${currentProvider}: ${errorMessage}`)

        // Check if this is a retriable error
        if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('Resource exhausted')) {
          console.log(`[Orchestrator] Retrying overview with fallback provider...`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait before retry
        } else {
          throw error // Non-retriable error
        }
      }
    }

    if (!overviewSuccess) {
      throw new Error('Overview generation failed after all retry attempts')
    }

    // Split overview text into paragraphs
    const overviewParagraphs = overviewText
      .split(/\n\n+/)
      .map(p => stripMarkdownFormatting(p))
      .filter(p => p.length > 0)

    const overviewInnerHtml = overviewParagraphs
      .map(p => `<p class="scai-paragraph">${p}</p>`)
      .join('\n')

    const overviewHtml = `<section data-component="scai-overview" class="scai-overview">${overviewInnerHtml}</section>`
    const overviewWordCount = overviewText.split(/\s+/).filter(w => w.length > 0).length
    generatedContent.set('overview', { componentId: 'overview', html: overviewHtml, wordCount: overviewWordCount })
    cumulativeHtml += overviewHtml  // Add completed overview to cumulative
    yield { type: 'component_complete', componentId: 'overview', html: overviewHtml }
    console.log(`[Orchestrator] Overview complete: ${overviewWordCount} words, ${overviewChunkCount} chunks`)

    // ─── SECTIONS (H2s with token-by-token streaming) ───
    const sectionContents: GeneratedContent[] = []
    console.log(`[Orchestrator] Starting ${structure.h2Titles.length} sections...`)

    for (let i = 0; i < structure.h2Titles.length; i++) {
      const h2 = structure.h2Titles[i]
      yield { type: 'component_start', componentId: `section-${i}`, index: i + 2, total: structure.h2Titles.length + 5 }
      console.log(`[Orchestrator] Starting section ${i + 1}/${structure.h2Titles.length}: "${h2.title}"`)
      if (recipeContext) {
        console.log(`[Orchestrator] ✅ Passing recipe context to section ${i + 1}`)
      }
      if (reviewContext) {
        console.log(`[Orchestrator] ✅ Passing review context to section ${i + 1}`)
      }
      if (comparisonContext) {
        console.log(`[Orchestrator] ✅ Passing comparison context to section ${i + 1}`)
      }
      if (commercialContext) {
        console.log(`[Orchestrator] ✅ Passing commercial context to section ${i + 1}`)
      }

      // Detect matching product for affiliate articles to use as reference image
      let sourceImageUrl: string | undefined
      let matchedProduct: AmazonProduct | undefined
      if (articleType === 'affiliate' && affiliateProducts && affiliateProducts.length > 0) {
        // Try to find a product whose name appears in the H2 title
        const h2Lower = h2.title.toLowerCase()
        matchedProduct = affiliateProducts.find(p => {
          const cleanName = (p as any).cleanedName?.toLowerCase()
          const rawTitle = p.title.toLowerCase()
          // Check cleaned name (most accurate) or raw title parts
          if (cleanName && h2Lower.includes(cleanName)) return true
          // Fallback: check if first 3 words of product title are in H2
          const firstWords = rawTitle.split(' ').slice(0, 3).join(' ')
          return h2Lower.includes(firstWords)
        })

        if (matchedProduct) {
          sourceImageUrl = matchedProduct.imageUrl
          console.log(`[Orchestrator] 🔗 Linked H2 "${h2.title.substring(0, 30)}..." to product image: ${matchedProduct.title.substring(0, 30)}...`)
        }
      }

      // Create H2 image placeholder upfront (skip if H2 images disabled)
      let h2Placeholder = ''
      let h2Caption = h2.title
      let h2AltText = ''

      if (isComponentOn('h2-image')) {
        h2Placeholder = createEnhancedPlaceholder({
          text: h2.title,
          articleType,
          imageType: articleType === 'how-to' ? 'step-process' : 'h2',
          sectionIndex: i,
          componentType: 'h2',
          sourceImageUrl, // Pass the detected product image URL
          sourceProductName: matchedProduct?.title, // Pass the matched product name for image context
        })

        // Generate AI caption for H2 image
        const h2CaptionResult = await generateImageCaption({
          articleTopic: topic,
          imageDescription: h2.title,
          sectionContext: h2.title,
          imageType: articleType === 'how-to' ? 'step-process' : 'h2',
        })
        h2Caption = h2CaptionResult.success && h2CaptionResult.data ? h2CaptionResult.data : h2.title

        // Use AI-generated alt text, falling back to a descriptive default
        h2AltText = h2ImageAlts[i] || `Detailed illustration showing ${h2.title.toLowerCase()} with practical examples and visual explanations`
      }

      // Use resilient stream consumption with automatic fallback for sections
      let sectionText = ''
      let sectionChunkCount = 0
      const sectionProviders: Array<'gemini' | 'openai'> = [provider as 'gemini' | 'openai', provider === 'gemini' ? 'openai' : 'gemini']
      let sectionSuccess = false

      for (const currentSectionProvider of sectionProviders) {
        if (sectionSuccess) break

        try {
          const sectionStream = await streamSectionContent({
            topic,
            primaryKeyword: topic,
            articleType,
            h2: h2.title,
            h2Index: i,
            totalH2s: structure.h2Titles.length,
            provider: currentSectionProvider,
            clusterKeywords: config.clusterKeywords,
            recipeContext, // Pass recipe context for connected content
            reviewContext, // Pass review context for connected content
            comparisonContext, // Pass comparison context for connected content
            commercialContext, // Pass commercial context for connected content
            titleFormat: config.variation as 'question' | 'statement' | 'listicle', // Pass format for listicle awareness
            h1PromiseContext,
          })

          sectionText = ''
          sectionChunkCount = 0

          for await (const chunk of sectionStream.textStream) {
            sectionText += chunk
            sectionChunkCount++

            // Stream chunk updates for live typing effect
            if (sectionChunkCount % 3 === 0 || chunk.includes('.') || chunk.includes('!') || chunk.includes('?')) {
              // Use helper function for streaming preview (without final formatting)
              const currentSectionHtml = generateSectionHtmlWithParagraphs(
                h2.title,
                sectionText,
                i,
                h2Placeholder,
                h2AltText,
                h2Caption,
                false, // Don't strip formatting during streaming for speed
                isComponentOn('h2-image'), // Include H2 image only if enabled
              )

              yield {
                type: 'component_chunk',
                componentId: `section-${i}`,
                chunk: chunk,
                accumulated: cumulativeHtml + currentSectionHtml  // Full document so far
              }
            }
          }

          // Log stream usage if cost tracking is enabled
          if (costTracking) {
            try {
              const usage = await sectionStream.usage
              if (usage && (usage.inputTokens || usage.outputTokens)) {
                logAiUsageAsync({
                  historyId: costTracking.historyId,
                  userId: costTracking.userId,
                  bulkJobId: costTracking.bulkJobId,
                  provider: currentSectionProvider,
                  modelId: currentSectionProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini',
                  operationType: 'stream',
                  operationName: `streamSection-${i + 1}`,
                  inputTokens: usage.inputTokens || 0,
                  outputTokens: usage.outputTokens || 0,
                  success: true,
                })
              }
            } catch (usageError) {
              console.warn(`[Orchestrator] Failed to log section ${i + 1} stream usage:`, usageError)
            }
          }

          sectionSuccess = true
          console.log(`[Orchestrator] Section ${i + 1} stream completed with ${currentSectionProvider}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log(`[Orchestrator] ❌ Section ${i + 1} stream failed with ${currentSectionProvider}: ${errorMessage}`)

          // Check if this is a retriable error
          if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('Resource exhausted')) {
            console.log(`[Orchestrator] Retrying section ${i + 1} with fallback provider...`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait before retry
          } else {
            throw error // Non-retriable error
          }
        }
      }

      if (!sectionSuccess) {
        throw new Error(`Section ${i + 1} generation failed after all retry attempts`)
      }

      // Generate final section HTML with 3 paragraphs and full formatting
      const sectionHtml = generateSectionHtmlWithParagraphs(
        h2.title,
        sectionText,
        i,
        h2Placeholder,
        h2AltText,
        h2Caption,
        true, // Strip markdown formatting for final output
        isComponentOn('h2-image'), // Include H2 image only if enabled
      )

      const sectionWordCount = sectionText.split(/\s+/).filter(w => w.length > 0).length
      const sectionContent: GeneratedContent = { componentId: `section-${i}`, html: sectionHtml, wordCount: sectionWordCount }
      sectionContents.push(sectionContent)
      generatedContent.set(`section-${i}`, sectionContent)
      cumulativeHtml += sectionHtml  // Add completed section to cumulative
      yield { type: 'component_complete', componentId: `section-${i}`, html: sectionHtml }
      console.log(`[Orchestrator] Section ${i + 1} complete: ${sectionWordCount} words`)
    }

    // ─── FAQ (AI generates answers, template hydrates) ───
    if (isComponentOn('faq')) {
    yield { type: 'component_start', componentId: 'faq', index: structure.h2Titles.length + 3, total: structure.h2Titles.length + 5 }

    const faqResult = await generateFaqAnswers({
      topic,
      primaryKeyword: topic,
      questions: structure.faqQuestions,
      articleType,
      provider,
      costTracking,
      recipeContext: recipeContext ? {
        dishName: recipeContext.dishName,
        ingredients: recipeContext.ingredients,
        cookingMethod: recipeContext.cookingMethod,
        cookTime: recipeContext.cookTime,
        servings: recipeContext.servings,
        cuisineStyle: recipeContext.cuisineStyle,
        timelineNote: recipeContext.timelineNote,
        fermentation: recipeContext.fermentation,
        ingredientNotes: recipeContext.ingredientNotes,
      } : undefined,
      reviewContext: reviewContext ? {
        productName: reviewContext.productName,
        category: reviewContext.category,
        rating: reviewContext.rating,
        keyFeatures: reviewContext.keyFeatures,
        topPros: reviewContext.topPros,
        topCons: reviewContext.topCons,
        pricePoint: reviewContext.pricePoint,
        targetAudience: reviewContext.targetAudience,
      } : undefined,
    })

    let faqHtml = ''
    let faqVariationCss = ''
    if (faqResult.success && faqResult.data) {
      const faqItems = structure.faqQuestions.map((question, i) => ({
        question,
        answer: faqResult.data![i] || `Learn more about ${topic}.`
      }))

      // Use template hydrator for consistent styling
      const hydratedFaq = hydrateFaq(resolvedVariation, { items: faqItems })
      if (hydratedFaq) {
        faqHtml = hydratedFaq.html
        faqVariationCss = hydratedFaq.css || ''
      } else {
        // Fallback HTML with proper class names
        faqHtml = `<section data-component="scai-faq" class="scai-faq"><h2>Frequently Asked Questions</h2>${faqItems.map(item => `<div class="scai-faq-item"><h3 class="scai-faq-h3">${item.question}</h3><p class="scai-faq-answer">${item.answer}</p></div>`).join('')}</section>`
      }

      generatedContent.set('faq', { h2Html: `<h2>FAQ</h2>`, items: faqItems, html: faqHtml, variationCss: faqVariationCss })
    } else {
      // Fallback with proper class names
      faqHtml = `<section data-component="scai-faq" class="scai-faq"><h2>Frequently Asked Questions</h2>${structure.faqQuestions.map(q => `<div class="scai-faq-item"><h3 class="scai-faq-h3">${q}</h3><p class="scai-faq-answer">Learn more about ${topic}.</p></div>`).join('')}</section>`
      generatedContent.set('faq', { h2Html: '', items: [], html: faqHtml })
    }
    cumulativeHtml += faqHtml  // Add FAQ to cumulative
    yield { type: 'component_complete', componentId: 'faq', html: faqHtml }
    console.log(`[Orchestrator] FAQ complete: ${structure.faqQuestions.length} questions`)
    } else {
      // FAQ disabled — register empty content so assembler can handle it
      generatedContent.set('faq', { h2Html: '', items: [], html: '' })
      console.log('[Orchestrator] FAQ skipped (disabled by user)')
    }

    // ─── CLOSING (Token-by-token streaming) ───
    if (isComponentOn('closing-paragraph')) {
    yield { type: 'component_start', componentId: 'closing', index: structure.h2Titles.length + 4, total: structure.h2Titles.length + 5 }
    console.log('[Orchestrator] Starting closing section...')
    if (recipeContext) {
      console.log('[Orchestrator] ✅ Passing recipe context to closing')
    }
    if (reviewContext) {
      console.log('[Orchestrator] ✅ Passing review context to closing')
    }
    if (comparisonContext) {
      console.log('[Orchestrator] ✅ Passing comparison context to closing')
    }
    if (commercialContext) {
      console.log('[Orchestrator] ✅ Passing commercial context to closing')
    }

    // Use resilient stream consumption with automatic fallback for closing
    let closingText = ''
    let closingChunkCount = 0
    const closingProviders: Array<'gemini' | 'openai'> = [provider as 'gemini' | 'openai', provider === 'gemini' ? 'openai' : 'gemini']
    let closingSuccess = false

    for (const currentClosingProvider of closingProviders) {
      if (closingSuccess) break

      try {
        const closingStream = await streamClosing({
          topic,
          primaryKeyword: topic,
          articleType,
          h1: structure.h1,
          closingH2: structure.closingH2,
          mainPoints: structure.h2Titles.map(h => h.title), // Pass H2 titles for listicle context
          provider: currentClosingProvider,
          clusterKeywords: config.clusterKeywords,
          recipeContext, // Pass recipe context for connected content
          reviewContext, // Pass review context for connected content
          comparisonContext, // Pass comparison context for connected content
          commercialContext, // Pass commercial context for connected content
          titleFormat: config.variation as 'question' | 'statement' | 'listicle', // Pass format for listicle awareness
          h1PromiseContext,
        })

        closingText = ''
        closingChunkCount = 0

        for await (const chunk of closingStream.textStream) {
          closingText += chunk
          closingChunkCount++

          // Stream chunk updates
          if (closingChunkCount % 3 === 0 || chunk.includes('.') || chunk.includes('!') || chunk.includes('?')) {
            const currentClosingHtml = `
<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${structure.closingH2}</h2>
  <p class="scai-paragraph">${closingText}</p>
</section>`.trim()

            yield {
              type: 'component_chunk',
              componentId: 'closing',
              chunk: chunk,
              accumulated: cumulativeHtml + currentClosingHtml  // Full document so far
            }
          }
        }

        // Log stream usage if cost tracking is enabled
        if (costTracking) {
          try {
            const usage = await closingStream.usage
            if (usage && (usage.inputTokens || usage.outputTokens)) {
              logAiUsageAsync({
                historyId: costTracking.historyId,
                userId: costTracking.userId,
                bulkJobId: costTracking.bulkJobId,
                provider: currentClosingProvider,
                modelId: currentClosingProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini',
                operationType: 'stream',
                operationName: 'streamClosing',
                inputTokens: usage.inputTokens || 0,
                outputTokens: usage.outputTokens || 0,
                success: true,
              })
            }
          } catch (usageError) {
            console.warn('[Orchestrator] Failed to log closing stream usage:', usageError)
          }
        }

        closingSuccess = true
        console.log(`[Orchestrator] Closing stream completed with ${currentClosingProvider}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`[Orchestrator] ❌ Closing stream failed with ${currentClosingProvider}: ${errorMessage}`)

        // Check if this is a retriable error
        if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('Resource exhausted')) {
          console.log(`[Orchestrator] Retrying closing with fallback provider...`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait before retry
        } else {
          throw error // Non-retriable error
        }
      }
    }

    if (!closingSuccess) {
      throw new Error('Closing generation failed after all retry attempts')
    }

    const closingHtml = `
<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${structure.closingH2}</h2>
  <p class="scai-paragraph">${stripMarkdownFormatting(closingText)}</p>
</section>`.trim()

    const closingWordCount = closingText.split(/\s+/).filter(w => w.length > 0).length
    generatedContent.set('closing', { componentId: 'closing', html: closingHtml, wordCount: closingWordCount })
    cumulativeHtml += closingHtml  // Add completed closing to cumulative
    yield { type: 'component_complete', componentId: 'closing', html: closingHtml }
    console.log(`[Orchestrator] Closing complete: ${closingWordCount} words`)
    } else {
      // Closing disabled — register empty content
      generatedContent.set('closing', { componentId: 'closing', html: '', wordCount: 0 })
      console.log('[Orchestrator] Closing skipped (disabled by user)')
    }

    // ─── UNIQUE COMPONENTS (AI generates data, template hydrates) ───
    console.log(`[Orchestrator] Generating unique components for ${articleType}...`)

    // For recipe articles, pass pre-generated ingredients and instructions through config
    // For review articles, pass pre-generated features/pros/cons/rating through config
    let configWithPreGenData = config
    if (articleType === 'recipe' && preGeneratedIngredients?.success) {
      configWithPreGenData = {
        ...config,
        preGeneratedIngredients,
        preGeneratedInstructions,
      }
    } else if (articleType === 'review' && preGeneratedFeatures?.success) {
      configWithPreGenData = {
        ...config,
        preGeneratedFeatures,
        preGeneratedProsCons,
        preGeneratedRating,
      }
    }

    const uniqueComponents = await generateUniqueComponents(
      articleType,
      configWithPreGenData,
      resolvedVariation,
      affiliateProducts,
      (componentId, html) => {
        // Callback to emit progress
      },
      coreKeywords,
      costTracking,
      commercialContext,
      localBusinessInfo,
      isComponentOn,
    )
    console.log(`[Orchestrator] Unique components complete: ${uniqueComponents.length} components`)
    console.log(`[Orchestrator] Unique component IDs: ${uniqueComponents.map(c => c.componentId).join(', ') || '(none)'}`)

    for (const component of uniqueComponents) {
      generatedContent.set(component.componentId, component)
      cumulativeHtml += component.html  // Add each unique component to cumulative
      yield { type: 'component_complete', componentId: component.componentId, html: component.html }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: ASSEMBLY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Orchestrator] Phase 3: Assembling article...')
    yield { type: 'phase', phase: 'assembly', message: 'Assembling article...' }

    const assemblyInput: AssemblyInput = {
      structure,
      overview: generatedContent.get('overview') as GeneratedContent,
      sections: sectionContents,
      faq: generatedContent.get('faq') as FAQContent,
      closing: generatedContent.get('closing') as GeneratedContent,
      uniqueComponents,
      metaTitle: isComponentOn('meta-title') ? metaTitle : '',
      metaDescription: isComponentOn('meta-description') ? metaDescription : '',
      componentColor,
      designVariation: resolvedVariation,
      featuredImageAlt,
      featuredImageCaption: featuredCaption,
      h2ImageAlts,
      selectedComponents,
    }

    let finalHtml = assembleArticle(assemblyInput)
    console.log(`[Orchestrator] Article assembled: ${countTotalWords(finalHtml)} words`)

    // Update TOC to include all H2s (dynamic + component H2s) — skip if TOC is disabled
    if (isComponentOn('toc')) {
      finalHtml = updateTocWithAllH2s(finalHtml, config.variation)
    }

    // Stream content incrementally (no artificial delays - content already streamed token-by-token)
    let accumulatedHtml = h1Html + featuredImageHtml
    const sectionRegex = /<(?:header|section|figure|div|nav|aside)[^>]*data-component="([^"]+)"[^>]*>[\s\S]*?<\/(?:header|section|figure|div|nav|aside)>/gi
    const matches = [...finalHtml.matchAll(sectionRegex)]

    if (matches.length > 0) {
      for (const match of matches) {
        const sectionHtml = match[0]
        const sectionId = match[1]

        if (sectionId === 'h1' || sectionId === 'featured-image') continue

        accumulatedHtml += sectionHtml

        yield {
          type: 'incremental_content',
          chunk: sectionHtml,
          accumulated: accumulatedHtml,
          sectionId
        }

        // Minimal delay to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    yield { type: 'assembly_complete', html: finalHtml }

    // ─────────────────────────────────────────────────────────────────────────
    // CLASSIFICATION HINT (runs in parallel with image generation)
    // ─────────────────────────────────────────────────────────────────────────
    const classificationPromise = generateClassificationHint(
      topic,
      articleType,
      structure.h1,
      structure.h2Titles.map(h => h.title),
      provider,
      costTracking,
    ).catch((err) => {
      console.warn('[Orchestrator] Classification hint failed (non-blocking):', err)
      return null
    })

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: IMAGE GENERATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Orchestrator] Phase 4: Generating images...')
    yield { type: 'phase', phase: 'images', message: 'Generating images...' }

    // For review articles, extract the product name to anchor image generation
    const reviewProductName = reviewContext?.productName || (articleType === 'review' ? topic : undefined)
    const imageArticleContext = extractArticleContext(finalHtml, articleType, reviewProductName)
    const placeholderRegex = /https:\/\/(?:via\.placeholder\.com|placehold\.co)\/[^\s"<>]+/g
    const placeholderMatches: Array<{ match: string; text: string; meta: ImagePlaceholderMeta | null; sectionContent: string }> = []
    let match

    while ((match = placeholderRegex.exec(finalHtml)) !== null) {
      const parsed = parseEnhancedPlaceholder(match[0])
      const sectionContent = parsed.meta ? extractSectionContent(finalHtml, parsed.meta.sectionIndex) : ''
      placeholderMatches.push({ match: match[0], text: parsed.text, meta: parsed.meta, sectionContent })
    }

    let completedImages = 0
    const totalImages = placeholderMatches.length
    console.log(`[Orchestrator] Found ${totalImages} image placeholders to generate`)

    for await (const result of generateImagesInParallel(
      placeholderMatches,
      enhancedCallback,
      imageArticleContext,
      config.imageBatchSize,
      config.imageBatchDelayMs
    )) {
      completedImages++
      console.log(`[Orchestrator] Image ${completedImages}/${totalImages} ${result.success ? 'complete' : 'failed'}`)

      if (result.success) {
        finalHtml = finalHtml.split(result.placeholder).join(result.url)
      }

      yield {
        type: 'image_complete',
        index: completedImages,
        total: totalImages,
        url: result.url,
        placeholder: result.placeholder,
        description: result.description, // For alt text
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Orchestrator] Running content validation...')

    // Extract content for validation from generated HTML
    // Use improved extraction that handles nested HTML tags
    const h1Match = finalHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const h1Text = h1Match ? stripHtmlTags(h1Match[1]) : structure.h1

    // H2 extraction - match any h2 with class scai-h2, handling possible nested content
    // IMPORTANT: Exclude component H2s and closing H2s - only include list-item H2s for validation
    const allH2Matches = [...finalHtml.matchAll(/<h2[^>]*class="scai-h2"[^>]*>([\s\S]*?)<\/h2>/gi)]
    const h2Texts = allH2Matches
      .map((m, index) => ({ text: stripHtmlTags(m[1]), index: m.index || 0 }))
      .filter(({ index }) => {
        // Check if this H2 is inside a component section by looking backwards for data-component attribute
        const beforeH2 = finalHtml.substring(0, index)
        const lastComponentOpen = Math.max(
          beforeH2.lastIndexOf('data-component="scai-feature-section"'),
          beforeH2.lastIndexOf('data-component="scai-pros-cons-section"'),
          beforeH2.lastIndexOf('data-component="scai-rating-section"'),
          beforeH2.lastIndexOf('data-component="scai-faq-section"'),
          beforeH2.lastIndexOf('data-component="scai-faq"'),
          beforeH2.lastIndexOf('data-component="scai-closing"')
        )
        const lastSectionClose = beforeH2.lastIndexOf('</section>')
        const lastDivClose = beforeH2.lastIndexOf('</div>')

        // H2 is a component/closing if it's inside a component section that hasn't been closed
        const isComponent = lastComponentOpen > -1 &&
          lastComponentOpen > lastSectionClose &&
          lastComponentOpen > lastDivClose

        return !isComponent // Only include non-component H2s
      })
      .map(({ text }) => text)

    // Closing H2 extraction
    const closingH2Match = finalHtml.match(/<section[^>]*data-component="scai-closing"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const closingH2Text = closingH2Match ? stripHtmlTags(closingH2Match[1]) : structure.closingH2

    // Overview paragraph - use helper function for better extraction
    const extractedOverviewText = extractParagraphContent(finalHtml, 'data-component="scai-overview"')

    // Closing paragraph
    const extractedClosingParaText = extractParagraphContent(finalHtml, 'data-component="scai-closing"')

    // Standard section paragraphs - extract from sections with id="section-N"
    const sectionMatches = [...finalHtml.matchAll(/<section[^>]*id="section-(\d+)"[^>]*>[\s\S]*?<\/section>/gi)]
    const extractedStandardParagraphs: string[] = sectionMatches
      .sort((a, b) => parseInt(a[1], 10) - parseInt(b[1], 10)) // Sort by section number
      .map(match => {
        const sectionHtml = match[0]
        const paragraphRegex = /<p[^>]*class="[^"]*scai-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi
        const paragraphs: string[] = []
        let pMatch
        while ((pMatch = paragraphRegex.exec(sectionHtml)) !== null) {
          paragraphs.push(stripHtmlTags(pMatch[1]))
        }
        return paragraphs.join(' ')
      })
      .filter(text => text.length > 0)

    // FAQ H2
    const faqH2Match = finalHtml.match(/<section[^>]*data-component="scai-faq"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const faqH2Text = faqH2Match ? stripHtmlTags(faqH2Match[1]) : undefined

    // FAQ Questions (h3 with scai-faq-h3 or scai-faq-question class)
    const faqH3Matches = [...finalHtml.matchAll(/<h3[^>]*class="[^"]*(?:scai-faq-question|scai-faq-h3)[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi)]
    const faqQuestionTexts = faqH3Matches.map(m => stripHtmlTags(m[1]))

    // Meta information from comments
    const metaTitleMatch = finalHtml.match(/<!--\s*META_TITLE:\s*([^-]+)\s*-->/i)
    const metaDescMatch = finalHtml.match(/<!--\s*META_DESC:\s*([^-]+)\s*-->/i)

    // Extract image alt texts for validation (skip in background mode - will validate in Trigger.dev)
    let featuredImageAltText: string | undefined = undefined
    let h2ImageAltTexts: string[] = []

    if (!skipAltTextValidation) {
      // Featured image (img within figure.scai-featured-image or data-component="scai-featured-image")
      const featuredImgMatch = finalHtml.match(/<figure[^>]*class="[^"]*scai-featured-image[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"[^>]*>/i) ||
        finalHtml.match(/<figure[^>]*data-component="scai-featured-image"[^>]*>\s*<img[^>]*alt="([^"]*)"[^>]*>/i)
      featuredImageAltText = featuredImgMatch?.[1]

      // H2 section images (imgs within h2 sections)
      const h2ImgAltMatches = [...finalHtml.matchAll(/<figure[^>]*class="[^"]*scai-h2-image[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"[^>]*>/gi)]
      h2ImageAltTexts = h2ImgAltMatches.map(m => m[1])
    } else {
      console.log('[Orchestrator] Skipping alt text validation - will validate in Trigger.dev after real images')
    }

    const validationContent: ValidatorArticleContent = {
      h1: h1Text,
      h2s: h2Texts,
      closingH2: closingH2Text,
      overviewParagraph: extractedOverviewText || undefined,
      standardParagraphs: extractedStandardParagraphs.length > 0 ? extractedStandardParagraphs : undefined,
      closingParagraph: extractedClosingParaText || undefined,
      faqH2: faqH2Text,
      faqQuestions: faqQuestionTexts,
      metaTitle: metaTitleMatch?.[1]?.trim() || aiStructure.meta?.title,
      metaDescription: metaDescMatch?.[1]?.trim() || aiStructure.meta?.description,
      featuredImageAlt: featuredImageAltText,
      h2ImageAlts: h2ImageAltTexts,
      variation: config.variation,
      articleType: articleType,
    }

    const validationResult = validateGeneratedContent(validationContent)

    console.log(`[Orchestrator] Validation: Score=${validationResult.score}/100, Valid=${validationResult.isValid}`)
    if (validationResult.errors.length > 0) {
      console.log(`[Orchestrator] Validation errors: ${validationResult.errors.map(e => e.message).join('; ')}`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ITERATIVE CORRECTION (if enabled and validation is not perfect)
    // ─────────────────────────────────────────────────────────────────────────
    let finalValidation = validationResult

    // ── STEP 1: Auto-replace buzzwords in HTML before validation corrections ──
    // This is a fast text replacement that catches most buzzwords without AI calls
    const { html: buzzwordCleanedHtml, replaced: replacedBuzzwords } = replaceBuzzwordsInHtml(finalHtml)
    if (replacedBuzzwords.length > 0) {
      console.log(`[Orchestrator] 🚫 Auto-replaced ${replacedBuzzwords.length} buzzwords: ${replacedBuzzwords.join(', ')}`)
      finalHtml = buzzwordCleanedHtml

      yield {
        type: 'component_complete',
        componentId: 'buzzword-cleanup',
        html: `<!-- Buzzwords auto-replaced: ${replacedBuzzwords.join(', ')} -->`,
      }
    }

    // ── STEP 2: Listicle normalization (DISABLED) ──
    // NOTE: Listicle normalization is NO LONGER NEEDED because:
    // 1. List items are numbered correctly during structure generation
    // 2. Component H2s are stripped of numbers immediately after generation
    // 3. Running ListicleCorrector was causing component H2s to be incorrectly renumbered
    // The corrector's HTML structure detection was misidentifying component H2s as list items.
    // Since everything is already correct before this step, we skip it entirely.
    if (false && config.articleType === 'listicle') {
      const listicleResult = correctListicleArticle(finalHtml, true)
      if (listicleResult.corrections.length > 0) {
        console.log(`[Orchestrator] 📝 Applied ${listicleResult.corrections.length} listicle corrections`)
        finalHtml = listicleResult.html

        yield {
          type: 'component_complete',
          componentId: 'listicle-normalization',
          html: `<!-- Listicle corrections: ${listicleResult.corrections.join('; ')} -->`,
        }
      }
    }

    if (
      enableAutoCorrection &&
      (validationResult.errors.length > 0 || validationResult.warnings.length > 0 || validationResult.score < 100)
    ) {
      console.log('[Orchestrator] Starting iterative correction...')
      yield { type: 'phase', phase: 'correction', message: 'Auto-correcting validation issues...' }

      // Build correction context, including recipe context if available
      const correctionContext: CorrectionContext = {
        topic,
        articleType,
        variation: config.variation as 'statement' | 'question' | 'listicle',
        provider,
        h1: structure.h1,
        closingH2: structure.closingH2,
        primaryKeyword: topic,  // Use topic as primary keyword for H2 keyword density correction
        coreKeywords: structure.coreKeywords,  // Pass extracted keywords for natural H2 integration
        costTracking,  // Pass cost tracking for AI usage logging
        // Pass recipe context for connected corrections
        recipeContext: recipeContext ? {
          dishName: recipeContext.dishName,
          ingredients: recipeContext.ingredients,
          cookingMethod: recipeContext.cookingMethod,
          cuisineStyle: recipeContext.cuisineStyle,
          timelineNote: recipeContext.timelineNote,
          fermentation: recipeContext.fermentation,
          ingredientNotes: recipeContext.ingredientNotes,
        } : undefined,
        // Pass review context for connected corrections
        reviewContext: reviewContext ? {
          productName: reviewContext.productName,
          category: reviewContext.category,
          rating: {
            score: reviewContext.rating.score,
            verdict: reviewContext.rating.verdict,
          },
          keyFeatures: reviewContext.keyFeatures,
          topPros: reviewContext.topPros,
          topCons: reviewContext.topCons,
          pricePoint: reviewContext.pricePoint,
          targetAudience: reviewContext.targetAudience,
        } : undefined,
      }

      if (recipeContext) {
        console.log('[Orchestrator] ✅ Passing recipe context to auto-correction')
      }
      if (reviewContext) {
        console.log('[Orchestrator] ✅ Passing review context to auto-correction')
      }

      try {
        const correctionResult = await iterativelyCorrectContent(
          validationContent,
          correctionContext,
          { maxAttemptsPerComponent: 4, maxTotalAttempts: 12 }
        )

        finalValidation = correctionResult.finalValidation

        // If corrections were made, update the HTML
        if (correctionResult.corrections.length > 0) {
          console.log(`[Orchestrator] Applied ${correctionResult.corrections.length} corrections`)

          // ═══ FIX: Deduplicate corrections - only apply LAST correction per component ═══
          // When the same component is corrected multiple times, applying all corrections
          // causes paragraph accumulation. Only the LAST correction is the final result.
          const finalCorrectionByComponent = new Map<string, typeof correctionResult.corrections[0]>()
          for (const correction of correctionResult.corrections) {
            if (correction.success && correction.correctedContent !== correction.originalContent) {
              finalCorrectionByComponent.set(correction.componentId, correction)
            }
          }

          if (finalCorrectionByComponent.size !== correctionResult.corrections.length) {
            console.log(`[Orchestrator] Deduped: ${finalCorrectionByComponent.size} unique corrections (from ${correctionResult.corrections.length} total)`)
          }

          // Update finalHtml with DEDUPED corrected content (only last correction per component)
          for (const [componentId, correction] of finalCorrectionByComponent) {
            // Use special replacement for multi-paragraph sections
            if (correction.componentId === 'overviewParagraph') {
              finalHtml = replaceSectionParagraphs(finalHtml, 'data-component="scai-overview"', correction.correctedContent)
            } else if (correction.componentId === 'closingParagraph') {
              finalHtml = replaceSectionParagraphs(finalHtml, 'data-component="scai-closing"', correction.correctedContent)
            } else if (correction.componentId.startsWith('paragraph_')) {
              // Standard section paragraphs - find the section by index
              // paragraph_N is 1-indexed, section-N is 0-indexed, so subtract 1
              const sectionIndex = parseInt(correction.componentId.split('_')[1], 10) - 1
              finalHtml = replaceSectionParagraphs(finalHtml, `id="section-${sectionIndex}"`, correction.correctedContent)
            } else {
              // Escape special regex characters in original content
              // CRITICAL: Do NOT use 'g' (global) flag - only replace FIRST occurrence
              // Global replace causes duplication in affiliate articles with similar product cards
              const escapedOriginal = correction.originalContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              finalHtml = finalHtml.replace(new RegExp(escapedOriginal), () => correction.correctedContent)
            }
          }

          yield {
            type: 'component_complete',
            componentId: 'correction',
            html: `<!-- Corrections applied: ${correctionResult.corrections.length}, New score: ${finalValidation.score}/100 -->`,
          }
        }

        console.log(`[Orchestrator] Correction complete: Score improved to ${finalValidation.score}/100`)

        // Escalation pass if still not fully compliant
        if (finalValidation.score < 100 || finalValidation.errors.length > 0 || finalValidation.warnings.length > 0) {
          console.log('[Orchestrator] Escalating correction pass for 100% compliance...')
          yield { type: 'phase', phase: 'correction', message: 'Final compliance pass...' }

          const escalationResult = await iterativelyCorrectContent(
            correctionResult.correctedContent,
            correctionContext,
            { maxAttemptsPerComponent: 5, maxTotalAttempts: 16 }
          )

          finalValidation = escalationResult.finalValidation

          if (escalationResult.corrections.length > 0) {
            console.log(`[Orchestrator] Applied ${escalationResult.corrections.length} escalation corrections`)

            // ═══ FIX: Deduplicate escalation corrections - only apply LAST correction per component ═══
            const escFinalCorrectionByComponent = new Map<string, typeof escalationResult.corrections[0]>()
            for (const correction of escalationResult.corrections) {
              if (correction.success && correction.correctedContent !== correction.originalContent) {
                escFinalCorrectionByComponent.set(correction.componentId, correction)
              }
            }

            if (escFinalCorrectionByComponent.size !== escalationResult.corrections.length) {
              console.log(`[Orchestrator] Deduped escalation: ${escFinalCorrectionByComponent.size} unique corrections (from ${escalationResult.corrections.length} total)`)
            }

            // Apply DEDUPED escalation corrections (only last correction per component)
            for (const [componentId, correction] of escFinalCorrectionByComponent) {
              // Use special replacement for multi-paragraph sections
              if (correction.componentId === 'overviewParagraph') {
                finalHtml = replaceSectionParagraphs(finalHtml, 'data-component="scai-overview"', correction.correctedContent)
              } else if (correction.componentId === 'closingParagraph') {
                finalHtml = replaceSectionParagraphs(finalHtml, 'data-component="scai-closing"', correction.correctedContent)
              } else if (correction.componentId.startsWith('paragraph_')) {
                // Standard section paragraphs - find the section by index
                // paragraph_N is 1-indexed, section-N is 0-indexed, so subtract 1
                const sectionIndex = parseInt(correction.componentId.split('_')[1], 10) - 1
                finalHtml = replaceSectionParagraphs(finalHtml, `id="section-${sectionIndex}"`, correction.correctedContent)
              } else {
                // CRITICAL: Do NOT use 'g' (global) flag - only replace FIRST occurrence
                // Global replace causes duplication in affiliate articles with similar product cards
                const escapedOriginal = correction.originalContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                finalHtml = finalHtml.replace(new RegExp(escapedOriginal), () => correction.correctedContent)
              }
            }

            yield {
              type: 'component_complete',
              componentId: 'correction',
              html: `<!-- Escalation corrections applied: ${escFinalCorrectionByComponent.size}, New score: ${finalValidation.score}/100 -->`,
            }
          }

          console.log(`[Orchestrator] Escalation complete: Score improved to ${finalValidation.score}/100`)
        }

        // ── H2 Keyword Density Correction ──
        // Run after all other corrections to improve SEO compliance
        console.log('[Orchestrator] Checking H2 keyword density...')
        const keywordDensityResult = await correctH2KeywordDensity(finalHtml, correctionContext)

        if (keywordDensityResult.totalCorrections > 0) {
          finalHtml = keywordDensityResult.html
          console.log(`[Orchestrator] 🔑 Corrected ${keywordDensityResult.totalCorrections} H2s for keyword density`)

          // Run buzzword replacement again after keyword density correction
          // (keyword corrector may introduce buzzwords like "unique", "discover", etc.)
          const { html: postKeywordBuzzwordHtml, replaced: postKeywordBuzzwords } = replaceBuzzwordsInHtml(finalHtml)
          if (postKeywordBuzzwords.length > 0) {
            finalHtml = postKeywordBuzzwordHtml
            console.log(`[Orchestrator] 🚫 Post-keyword buzzword cleanup: ${postKeywordBuzzwords.join(', ')}`)
          }

          yield {
            type: 'component_complete',
            componentId: 'keyword-density',
            html: `<!-- H2 keyword density improved: ${keywordDensityResult.totalCorrections} H2s updated -->`,
          }
        }
      } catch (error) {
        console.warn('[Orchestrator] Correction failed, using original content:', error)
      }
    }

    // Safety net: strip any numbers from closing H2 in listicle articles
    // The AI corrector sometimes adds numbers when fixing other closing H2 issues
    if (config.variation === 'listicle') {
      finalHtml = finalHtml.replace(
        /(<section[^>]*data-component="scai-closing"[^>]*>[\s\S]*?<h2[^>]*>)\s*\d+[.:)\-\s]+\s*([\s\S]*?<\/h2>)/i,
        '$1$2'
      )
    }

    // Re-sync TOC after all corrections (H2s may have changed during correction/keyword density passes)
    if (isComponentOn('toc')) {
      finalHtml = updateTocWithAllH2s(finalHtml, config.variation)
    }

    yield {
      type: 'validation_result' as const,
      isValid: finalValidation.isValid,
      score: finalValidation.score,
      errors: finalValidation.errors.map(e => ({ component: e.component, rule: e.rule, message: e.message })),
      warnings: finalValidation.warnings.map(w => ({ component: w.component, rule: w.rule, message: w.message })),
      summary: finalValidation.summary,
    } as StreamEvent

    // ─────────────────────────────────────────────────────────────────────────
    // AWAIT CLASSIFICATION HINT
    // ─────────────────────────────────────────────────────────────────────────
    const classificationHint = await classificationPromise
    if (classificationHint) {
      yield { type: 'classification_complete', hint: classificationHint }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMPLETE
    // ─────────────────────────────────────────────────────────────────────────
    const wordCount = countTotalWords(finalHtml)

    console.log(`\n[Orchestrator] ════════════════════════════════════════════════`)
    console.log(`[Orchestrator] GENERATION COMPLETE`)
    console.log(`[Orchestrator]   Final word count: ${wordCount}`)
    console.log(`[Orchestrator]   Images generated: ${totalImages}`)
    console.log(`[Orchestrator]   Variation: ${resolvedVariation}`)
    console.log(`[Orchestrator]   Provider: ${provider}`)
    console.log(`[Orchestrator] ════════════════════════════════════════════════\n`)

    // Update cost summary with all logged usage for this generation
    if (costTracking) {
      await updateGenerationCostSummary(costTracking.historyId, costTracking.userId)
      console.log(`[Orchestrator] Cost tracking summary updated for historyId: ${costTracking.historyId}`)
    }

    yield {
      type: 'complete',
      html: finalHtml,
      wordCount,
      imageCount: placeholderMatches.length,
      usedVariation: resolvedVariation,
      usedProvider: provider
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`[Orchestrator] ERROR: ${message}`)
    yield { type: 'error', error: message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIQUE COMPONENT GENERATION + HYDRATION
// ═══════════════════════════════════════════════════════════════════════════════

async function generateUniqueComponents(
  articleType: string,
  config: OrchestrationConfig,
  variationName: BaseVariationName,
  amazonProducts: AmazonProduct[] | null,
  onProgress: (componentId: string, html: string) => void,
  coreKeywords: string[],
  costTracking?: CostTrackingContext,
  commercialContext?: CommercialContext,
  localBusinessInfo?: LocalBusinessInfo,
  isComponentOn: (id: string) => boolean = () => true,
): Promise<GeneratedContent[]> {
  const components: GeneratedContent[] = []
  const { topic, primaryKeyword, provider } = config

  switch (articleType) {
    // ═══════════════════════════════════════════════════════════════════════
    // AFFILIATE: Product Cards
    // ═══════════════════════════════════════════════════════════════════════
    case 'affiliate': {
      const badges = ['Best Overall', 'Best Value', 'Premium Pick']
      const productCount = amazonProducts?.length || 3

      // If we have real Amazon products, use them
      if (amazonProducts && amazonProducts.length > 0) {
        for (let i = 0; i < amazonProducts.length; i++) {
          const product = amazonProducts[i]

          // Use pre-cleaned name if available (from structure generation phase), otherwise clean now
          const cleanedProductName = (product as any).cleanedName || await cleanProductName(product.title)

          // Build description from available data
          let description: string
          if (product.description) {
            // Priority 1: Use Amazon's description paragraph
            description = product.description.length > 200
              ? product.description.substring(0, 197) + '...'
              : product.description
          } else if (product.features && product.features.length > 0) {
            // Priority 2: Generate natural description from features using AI
            description = await generateProductDescription(
              cleanedProductName,
              product.features
            )
            // Ensure it fits in product card
            if (description.length > 200) {
              description = description.substring(0, 197) + '...'
            }
          } else {
            // Priority 3: Generate description from product name, badge, and topic using AI
            description = await generateProductDescription(
              cleanedProductName,
              [`${product.badge || badges[i % badges.length]} pick for ${topic}`, `Rated ${product.rating.toFixed(1)} out of 5`]
            )
            if (description.length > 200) {
              description = description.substring(0, 197) + '...'
            }
          }

          // Create placeholder with Amazon image URL in metadata
          // The image will be transformed during the image generation phase
          const imageUrl = createEnhancedPlaceholder({
            text: cleanedProductName.substring(0, 30),
            articleType: 'affiliate',
            imageType: 'product',
            sectionIndex: i,
            componentType: 'product-card',
            sourceImageUrl: product.imageUrl,  // Store Amazon URL for later transformation
          })

          const hydratedCard = hydrateProductCard(variationName, {
            name: cleanedProductName,
            description,
            price: product.price || '$XX.XX',
            imageUrl,
            ctaUrl: product.productUrl || '#',
            badge: product.badge || badges[i % badges.length]
          })

          if (hydratedCard) {
            components.push({
              componentId: `product-card-${i}`,
              html: hydratedCard.html,
              wordCount: 50,
              variationCss: hydratedCard.css
            })
          }
        }
      } else {
        // Generate product cards via AI
        const result = await generateProductCards({
          topic,
          primaryKeyword,
          productCount,
          provider,
          costTracking,
        })

        if (result.success && result.data) {
          for (let i = 0; i < result.data.length; i++) {
            const card = result.data[i]

            // For AI-generated products, we don't have source images to transform
            // Use placeholder images instead
            const imageUrl = createEnhancedPlaceholder({
              text: card.name.substring(0, 30),
              articleType: 'affiliate',
              imageType: 'product',
              sectionIndex: i,
              componentType: 'product-card'
            })

            const hydratedCard = hydrateProductCard(variationName, {
              name: card.name,
              description: card.description,
              price: card.price,
              imageUrl,
              ctaUrl: '#',
              badge: card.badge || undefined
            })

            if (hydratedCard) {
              components.push({
                componentId: `product-card-${i}`,
                html: hydratedCard.html,
                wordCount: 50,
                variationCss: hydratedCard.css
              })
            }
          }
        }
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMERCIAL: Feature List + CTA Box
    // ═══════════════════════════════════════════════════════════════════════
    case 'commercial': {
      const featureResult = await generateFeatureList({
        topic,
        primaryKeyword,
        productOrService: topic,
        provider,
        coreKeywords,
        costTracking,
      })

      console.log('[Commercial] Feature list generation:', featureResult.success ? 'SUCCESS' : 'FAILED', featureResult.success ? `h2: "${featureResult.data?.h2}", features: ${featureResult.data?.features?.length}` : featureResult.error)

      if (featureResult.success && featureResult.data) {
        // Strip any numbers from feature list H2 immediately (component H2s should never be numbered)
        if (featureResult.data.h2) {
          featureResult.data.h2 = stripH2Number(featureResult.data.h2)
        }

        const hydratedFeatures = hydrateFeatureList(variationName, {
          h2: featureResult.data.h2,
          features: featureResult.data.features.map(f => ({
            title: f.title,
            description: f.description
          }))
        }, config.variation as TitleFormat)
        if (hydratedFeatures) {
          components.push({
            componentId: 'feature-list',
            html: hydratedFeatures.html,
            wordCount: 100,
            variationCss: hydratedFeatures.css
          })
        } else {
          console.error('[Commercial] Feature list hydration returned null')
        }
      }

      // CTA Box - use commercial context for dynamic, topic-specific content
      const ctaTitle = commercialContext
        ? (commercialContext.ctaSuggestion || `Get Started with ${commercialContext.productName}`)
        : `Get Started with ${topic}`
      const ctaText = commercialContext
        ? `${commercialContext.keyBenefits[0]}. Discover how ${commercialContext.productName} can help you today.`
        : `Ready to experience the benefits of ${topic}? Take action today!`
      const ctaButton = commercialContext?.ctaSuggestion || 'Get Started'

      const hydratedCta = hydrateCtaBox(variationName, {
        title: ctaTitle,
        text: ctaText,
        buttonText: ctaButton,
        buttonUrl: '#'
      })
      if (hydratedCta) {
        components.push({
          componentId: 'cta-box',
          html: hydratedCta.html,
          wordCount: 30,
          variationCss: hydratedCta.css
        })
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMPARISON: Topic Overviews + Comparison Table + Quick Verdict
    // ═══════════════════════════════════════════════════════════════════════
    case 'comparison': {
      console.log('[UniqueComponents] Generating comparison components...')

      // Comparison Table
      const tableResult = await generateUniqueComponent({
        componentType: 'comparison-table',
        schema: ComparisonTableSchema,
        prompt: `Generate a comparison table for: ${topic}. Primary keyword: ${primaryKeyword}.

You MUST return JSON with:
- h2: YOUR OWN original compelling H2 heading for the comparison table
  Inspiration (do NOT copy these, create your own original phrasing): "Head-to-Head Comparison", "Feature-by-Feature Analysis", "Side-by-Side Breakdown"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)
- itemNames: Array with exactly 2 item names being compared
- criteria: Array of 4-6 comparison criteria (e.g., Price, Features, Ease of Use, Support, Value)
  - Each criterion has: name, valueA (value for first item), valueB (value for second item)

Make the H2 contextual and engaging, NOT generic.`,
        provider,
        costTracking,
      })

      // Store item names for use in quick verdict
      let comparisonItemNames: string[] | undefined;

      if (tableResult.success && tableResult.data) {
        console.log('[UniqueComponents] Comparison table generated:', JSON.stringify(tableResult.data).substring(0, 200))
        // Extract item names from comparison table
        comparisonItemNames = (tableResult.data as any).itemNames;
        const hydratedTable = hydrateComparisonTable(variationName, tableResult.data as any)
        if (hydratedTable) {
          components.push({
            componentId: 'comparison-table',
            html: hydratedTable.html,
            wordCount: 100,
            variationCss: hydratedTable.css
          })
          console.log('[UniqueComponents] Comparison table hydrated successfully')
        } else {
          console.warn('[UniqueComponents] Failed to hydrate comparison table')
        }
      } else {
        console.warn('[UniqueComponents] Failed to generate comparison table:', tableResult.error)
      }

      // Quick Verdict - skip if disabled
      if (!isComponentOn('quick-verdict')) {
        console.log('[UniqueComponents] Quick verdict skipped (disabled by user)')
        break
      }

      // Quick Verdict - include item names if we have them
      const itemNamesPrompt = comparisonItemNames && comparisonItemNames.length === 2
        ? `\nThe two items being compared are: "${comparisonItemNames[0]}" and "${comparisonItemNames[1]}".\nYou MUST include these exact item names in the itemNames field.`
        : '';

      const verdictResult = await generateUniqueComponent({
        componentType: 'quick-verdict',
        schema: QuickVerdictSchema,
        prompt: `Generate a quick verdict for comparing items about: ${topic}. Primary keyword: ${primaryKeyword}.${itemNamesPrompt}

You MUST return JSON with:
- h2: YOUR OWN original compelling H2 heading for the verdict
  Inspiration (do NOT copy these, create your own original phrasing): "Which Should You Choose?", "The Final Verdict", "Our Recommendation"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)
- itemNames: Array with exactly 2 item names being compared
- chooseA: When to choose the first option (~25 words)
- chooseB: When to choose the second option (~25 words)

Make the H2 contextual and engaging, NOT generic.`,
        provider,
        costTracking,
      })

      if (verdictResult.success && verdictResult.data) {
        console.log('[UniqueComponents] Quick verdict generated:', JSON.stringify(verdictResult.data).substring(0, 200))
        const hydratedVerdict = hydrateQuickVerdict(variationName, verdictResult.data as any)
        if (hydratedVerdict) {
          components.push({
            componentId: 'quick-verdict',
            html: hydratedVerdict.html,
            wordCount: 50,
            variationCss: hydratedVerdict.css
          })
          console.log('[UniqueComponents] Quick verdict hydrated successfully')
        } else {
          console.warn('[UniqueComponents] Failed to hydrate quick verdict')
        }
      } else {
        console.warn('[UniqueComponents] Failed to generate quick verdict:', verdictResult.error)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOW-TO: Materials Box + Pro Tips
    // ═══════════════════════════════════════════════════════════════════════
    case 'how-to': {
      console.log('[UniqueComponents] Generating how-to components...')

      const materialsResult = await generateUniqueComponent({
        componentType: 'materials-box',
        schema: MaterialsBoxSchema,
        prompt: `Generate a materials/requirements list for: ${topic}. Primary keyword: ${primaryKeyword}.

REQUIRED FORMAT - Return JSON with this exact structure:
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "items": [
    { "name": "Item name", "specs": "quantity or details (optional)", "optional": false },
    { "name": "Another item", "specs": "specs here", "optional": true }
  ]
}

For "h2": Create a specific heading (15-35 characters) that fits "${topic}" naturally.
  Inspiration (do NOT copy these, create your own original phrasing): "What You'll Need", "Gather These First", "Your ${primaryKeyword} Toolkit", "Supplies at a Glance"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)

REQUIREMENTS:
- Include 5-8 items needed
- Each item has: name (required), specs (optional), optional (boolean, default false)
- Mark truly optional items with "optional": true`,
        provider,
        costTracking,
      })

      if (materialsResult.success && materialsResult.data) {
        console.log('[UniqueComponents] Materials box generated:', JSON.stringify(materialsResult.data).substring(0, 200))
        const hydratedMaterials = hydrateRequirements(variationName, materialsResult.data as any)
        if (hydratedMaterials) {
          components.push({
            componentId: 'requirements-box',
            html: hydratedMaterials.html,
            wordCount: 70,
            variationCss: hydratedMaterials.css
          })
          console.log('[UniqueComponents] Materials box hydrated successfully')
        } else {
          console.warn('[UniqueComponents] Failed to hydrate materials box')
        }
      } else {
        console.warn('[UniqueComponents] Failed to generate materials box:', materialsResult.error)
      }

      // Pro Tips - skip if disabled
      if (!isComponentOn('pro-tips')) {
        console.log('[UniqueComponents] Pro tips skipped (disabled by user)')
        break
      }

      const tipsResult = await generateUniqueComponent({
        componentType: 'pro-tips',
        schema: ProTipsSchema,
        prompt: `Generate professional tips for: ${topic}. Primary keyword: ${primaryKeyword}.

REQUIRED FORMAT:
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "tips": [
    "tip 1 text (15-80 characters)",
    "tip 2 text (15-80 characters)",
    "tip 3 text (15-80 characters)",
    "tip 4 text (15-80 characters)",
    "tip 5 text (15-80 characters)"
  ]
}

For "h2": Create a specific heading (15-35 characters) that fits "${topic}" naturally.
  Inspiration (do NOT copy these, create your own original phrasing): "Tips from the Pros", "Expert ${primaryKeyword} Advice", "Insider Tips", "Before You Start"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)

Generate exactly 5-7 actionable pro tips. Each tip should be 15-80 characters and provide practical advice.`,
        provider,
        costTracking,
      })

      if (tipsResult.success && tipsResult.data) {
        console.log('[UniqueComponents] Pro tips generated:', JSON.stringify(tipsResult.data).substring(0, 200))
        const hydratedTips = hydrateProTips(variationName, { tips: (tipsResult.data as any).tips, h2: (tipsResult.data as any).h2 || undefined })
        if (hydratedTips) {
          components.push({
            componentId: 'pro-tips',
            html: hydratedTips.html,
            wordCount: 100,
            variationCss: hydratedTips.css
          })
          console.log('[UniqueComponents] Pro tips hydrated successfully')
        } else {
          console.warn('[UniqueComponents] Failed to hydrate pro tips')
        }
      } else {
        console.warn('[UniqueComponents] Failed to generate pro tips:', tipsResult.error)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INFORMATIONAL: Key Takeaways + Quick Facts
    // ═══════════════════════════════════════════════════════════════════════
    case 'informational': {
      console.log(`[UniqueComponents] Generating key-takeaways for informational article...`)
      const takeawaysResult = await generateKeyTakeaways({
        topic,
        primaryKeyword,
        h1: topic,
        mainH2s: [],
        provider,
        costTracking,
      })

      if (takeawaysResult.success && takeawaysResult.data) {
        console.log(`[UniqueComponents] Key takeaways generated: ${takeawaysResult.data.items.length} items, h2: ${takeawaysResult.data.h2}`)
        const hydratedTakeaways = hydrateKeyTakeaways(variationName, { items: takeawaysResult.data.items, h2: takeawaysResult.data.h2 }, config.variation as TitleFormat)
        if (hydratedTakeaways) {
          console.log(`[UniqueComponents] Key takeaways hydrated successfully with variation "${variationName}"`)
          components.push({
            componentId: 'key-takeaways',
            html: hydratedTakeaways.html,
            wordCount: 65,
            variationCss: hydratedTakeaways.css
          })
        } else {
          console.error(`[UniqueComponents] FAILED to hydrate key-takeaways with variation "${variationName}"`)
        }
      } else {
        console.error(`[UniqueComponents] FAILED to generate key-takeaways: ${takeawaysResult.error}`)
      }

      // Quick Facts - skip if disabled
      if (!isComponentOn('quick-facts')) {
        console.log('[UniqueComponents] Quick facts skipped (disabled by user)')
        break
      }

      console.log(`[UniqueComponents] Generating quick-facts for informational article...`)
      const factsResult = await generateUniqueComponent({
        componentType: 'quick-facts',
        schema: QuickFactsSchema,
        prompt: `Generate quick facts about: ${topic}. Primary keyword: ${primaryKeyword}.
Return JSON with:
- "h2": YOUR OWN original short, punchy section header (15-35 characters) that feels specific to "${topic}".
  Inspiration (do NOT copy these, create your own original phrasing): "${primaryKeyword} by the Numbers", "The Quick Rundown", "${primaryKeyword} in Numbers", "Fast Facts"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential", "Essentials" (overused)
- "facts": An array of 5-7 objects, each with "label" (the fact category) and "value" (the fact data)`,
        provider,
        costTracking,
      })

      if (factsResult.success && factsResult.data) {
        console.log(`[UniqueComponents] Quick facts generated successfully, h2: ${(factsResult.data as any).h2}`)
        const hydratedFacts = hydrateQuickFacts(variationName, { facts: (factsResult.data as any).facts, h2: (factsResult.data as any).h2 }, config.variation as TitleFormat)
        if (hydratedFacts) {
          console.log(`[UniqueComponents] Quick facts hydrated successfully with variation "${variationName}"`)
          components.push({
            componentId: 'quick-facts',
            html: hydratedFacts.html,
            wordCount: 90,
            variationCss: hydratedFacts.css
          })
        } else {
          console.error(`[UniqueComponents] FAILED to hydrate quick-facts with variation "${variationName}"`)
        }
      } else {
        console.error(`[UniqueComponents] FAILED to generate quick-facts: ${factsResult.error}`)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LISTICLE: Honorable Mentions
    // ═══════════════════════════════════════════════════════════════════════
    case 'listicle': {
      // Honorable Mentions - skip if disabled
      if (!isComponentOn('honorable-mentions')) {
        console.log('[UniqueComponents] Honorable mentions skipped (disabled by user)')
        break
      }

      const mentionsResult = await generateUniqueComponent({
        componentType: 'honorable-mentions',
        schema: HonorableMentionsSchema,
        prompt: `Generate 3-5 honorable mentions for: ${topic}. Primary keyword: ${primaryKeyword}. Each mention should have a title (h3) and brief description (40-100 words).

Also generate YOUR OWN original creative H2 heading (50-60 characters) for this section. It must be a ${config.variation === 'question' ? 'QUESTION ending with ?' : 'STATEMENT (no question marks)'}.
Inspiration (do NOT copy these, create your own original phrasing):
- "More ${topic} Worth Checking Out"
- "Other ${topic} That Deserve Recognition"
- "${topic} That Nearly Made the Cut"
CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
BANNED words: "Essential" (overused), "Honorable Mentions" (too generic)
NO colons, NO "and", NO hyphens as separators.`,
        provider,
        costTracking,
      })

      if (mentionsResult.success && mentionsResult.data) {
        const hydratedMentions = hydrateHonorableMentions(variationName, mentionsResult.data as any, config.variation as TitleFormat)
        if (hydratedMentions) {
          components.push({
            componentId: 'honorable-mentions',
            html: hydratedMentions.html,
            wordCount: 150,
            variationCss: hydratedMentions.css
          })
        }
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOCAL: Why Choose Local + Service Info
    // ═══════════════════════════════════════════════════════════════════════
    case 'local': {
      // Why Choose Local - skip if disabled
      if (isComponentOn('why-choose-local')) {
      console.log('[UniqueComponents] Generating why-choose-local component...')
      const whyLocalResult = await generateUniqueComponent({
        componentType: 'why-choose-local',
        schema: WhyChooseLocalSchema,
        prompt: `Generate a "Why Choose Local" section for a local article about: ${topic}. Primary keyword: ${primaryKeyword}.

You MUST return JSON with BOTH fields:
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "reasons": ["Reason 1", "Reason 2", "Reason 3", "Reason 4"]
}

H2 REQUIREMENTS:
- 50-60 characters
- Must be SPECIFIC to ${topic}, not generic "why choose local" phrasing
- Use proper title case capitalization ("${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}" not "${primaryKeyword}")
- Must be a ${config.variation === 'question' ? 'QUESTION ending with ?' : 'STATEMENT (no question marks)'}
- NO colons, NO "and", NO hyphens as separators
- Inspiration (do NOT copy these, create your own original phrasing): "Why a Neighborhood ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Makes All the Difference", "The Local ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Edge"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
- BANNED words: "Essential" (overused)

REASONS REQUIREMENTS:
- 4-5 reasons specific to choosing a LOCAL ${topic}
- Each reason: 10-20 words
- Must be SPECIFIC to ${topic}, not generic business platitudes
- ✅ GOOD: "Staff who know the neighborhood can recommend the best programs for you"
- ❌ BAD: "Personalized service tailored to community needs" (vague, applies to anything)
- Mention tangible local benefits: walking distance, knowing staff, community events, local partnerships`,
        provider,
        costTracking,
      })

      console.log('[UniqueComponents] why-choose-local result:', whyLocalResult.success ? 'success' : `failed: ${whyLocalResult.error}`)

      if (whyLocalResult.success && whyLocalResult.data) {
        const whyLocalData = whyLocalResult.data as any;
        console.log('[UniqueComponents] why-choose-local raw data:', JSON.stringify(whyLocalData))
        console.log('[UniqueComponents] why-choose-local h2:', whyLocalData.h2)
        console.log('[UniqueComponents] why-choose-local reasons:', whyLocalData.reasons?.length)

        // Create an image placeholder for the why-choose-local component
        const whyLocalImagePlaceholder = createEnhancedPlaceholder({
          text: `Local provider for ${topic}`,
          articleType: 'local',
          imageType: 'local-service',
          sectionIndex: 0,
          componentType: 'why-choose-local',
        })

        const hydratedWhyLocal = hydrateWhyLocal(variationName, {
          h2: whyLocalData.h2,
          reasons: whyLocalData.reasons,
          imageUrl: whyLocalImagePlaceholder
        }, config.variation as TitleFormat)
        if (hydratedWhyLocal) {
          components.push({
            componentId: 'why-choose-local',
            html: hydratedWhyLocal.html,
            wordCount: 100,
            variationCss: hydratedWhyLocal.css
          })
          console.log('[UniqueComponents] why-choose-local hydrated and added to components')
        } else {
          console.log('[UniqueComponents] why-choose-local hydration failed')
        }
      }
      } else {
        console.log('[UniqueComponents] Why-choose-local skipped (disabled by user)')
      }

      // Service Info - skip if disabled
      if (!isComponentOn('service-info-box')) {
        console.log('[UniqueComponents] Service info box skipped (disabled by user)')
        break
      }

      // Service Info — use user-provided business data if available, AI fallback otherwise
      console.log('[UniqueComponents] Building service-info component...')
      const hasUserBusinessData = localBusinessInfo && Object.values(localBusinessInfo).some(v => v && String(v).trim())

      let serviceInfoH2: string | undefined
      let serviceInfoRows: Array<{ label: string; value: string }> = []

      if (hasUserBusinessData) {
        // Build rows from user-supplied data — no AI call needed
        console.log('[UniqueComponents] Using user-provided business data for service-info')
        const info = localBusinessInfo!

        if (info.businessName) {
          serviceInfoRows.push({ label: 'Business', value: info.businessName })
        }
        if (info.hours) {
          serviceInfoRows.push({ label: 'Hours', value: info.hours })
        }
        if (info.phone) {
          serviceInfoRows.push({ label: 'Phone', value: info.phone })
        }
        // Location: combine city + state/region + postal code
        const locationParts = [info.city, info.stateRegion].filter(Boolean)
        if (locationParts.length > 0) {
          let locationValue = locationParts.join(', ')
          if (info.postalCode) locationValue += ` ${info.postalCode}`
          serviceInfoRows.push({ label: 'Service Area', value: `${locationValue} and surrounding areas` })
        }
        if (info.servicesOffered) {
          serviceInfoRows.push({ label: 'Services', value: info.servicesOffered })
        }
        if (info.email) {
          serviceInfoRows.push({ label: 'Email', value: info.email })
        }
        if (info.website) {
          serviceInfoRows.push({ label: 'Website', value: info.website })
        }
      } else {
        // AI fallback: generate service info via LLM when no user data provided
        console.log('[UniqueComponents] No user business data — generating service-info via AI...')
        const serviceInfoResult = await generateUniqueComponent({
          componentType: 'service-info',
          schema: ServiceInfoSchema,
          prompt: `Generate service information for a local business related to: ${topic}. Primary keyword: ${primaryKeyword}.
Return JSON with:
- "h2": YOUR OWN original compelling header for this section
  Inspiration (do NOT copy these, create your own original phrasing): "Get in Touch for ${topic} Help", "Reach Out to Your Local ${topic} Team", "How to Connect with Us"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)
- "rows": An array of 4-6 service info rows, each with:
  - "label": Short label (e.g., "Working Hours", "Phone", "Service Area", "Response Time")
  - "value": Descriptive value (e.g., "Monday-Friday: 8AM-6PM, Weekends: Emergency Only")

Include rows for: hours, phone/contact, service area, response time, and optionally payment methods.`,
          provider,
          costTracking,
        })

        if (serviceInfoResult.success && serviceInfoResult.data) {
          const svcData = serviceInfoResult.data as any
          serviceInfoH2 = svcData.h2
          serviceInfoRows = svcData.rows || []
        } else {
          console.error('[UniqueComponents] Failed to generate service-info:', serviceInfoResult.error)
        }
      }

      // Hydrate and add to components
      if (serviceInfoRows.length > 0) {
        console.log('[UniqueComponents] service-info rows:', serviceInfoRows.length, 'h2:', serviceInfoH2)
        const hydratedServiceInfo = hydrateServiceInfo(variationName, {
          h2: serviceInfoH2,
          rows: serviceInfoRows
        }, config.variation as TitleFormat)
        if (hydratedServiceInfo) {
          components.push({
            componentId: 'service-info',
            html: hydratedServiceInfo.html,
            wordCount: 30,
            variationCss: hydratedServiceInfo.css
          })
          console.log('[UniqueComponents] service-info hydrated and added to components')
        } else {
          console.log('[UniqueComponents] service-info hydration failed')
        }
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RECIPE: Ingredients + Instructions + Nutrition
    // Uses pre-generated data from Phase 2 if available for connected content
    // ═══════════════════════════════════════════════════════════════════════
    case 'recipe': {
      console.log('[Recipe] Starting recipe component generation...')
      console.log(`[Recipe] Using variation: ${variationName}, titleFormat: ${config.variation}`)

      // Use pre-generated ingredients if available (from Phase 2), otherwise generate new
      // Access pre-generated data via closure from the orchestrator
      const ingredientsResult = (config as any).preGeneratedIngredients || await generateIngredients({
        recipeTopic: topic,
        primaryKeyword,
        servings: 4,
        provider,
        titleFormat: config.variation as TitleFormat,
        costTracking,
      })

      console.log(`[Recipe] Ingredients: ${ingredientsResult.success ? 'SUCCESS (using pre-generated)' : 'FAILED'}`)
      if (!ingredientsResult.success) {
        console.error(`[Recipe] Ingredients error: ${ingredientsResult.error}`)
      }

      if (ingredientsResult.success && ingredientsResult.data) {
        console.log(`[Recipe] Ingredients data: ${ingredientsResult.data.items.length} items, h2: ${ingredientsResult.data.h2}`)
        
        // Grammar-correct the component H2 (fixes capitalization like "fried rice" → "Fried Rice")
        const [correctedIngredientsH2] = await correctGrammarBatch(
          [ingredientsResult.data.h2],
          { type: 'h2', provider, logCorrections: true, costTracking }
        )
        // Programmatic safety net: Ensure question marks
        ingredientsResult.data.h2 = ensureQuestionMark(correctedIngredientsH2, config.variation)
        
        // AI schema returns {quantity, name}, hydrator expects {amount, item}
        const hydratedIngredients = hydrateIngredients(variationName, {
          h2: ingredientsResult.data.h2,
          items: ingredientsResult.data.items.map((item: { quantity: string; name: string }) => ({
            amount: item.quantity,
            item: item.name
          }))
        }, config.variation as TitleFormat)
        if (hydratedIngredients) {
          components.push({
            componentId: 'ingredients',
            html: hydratedIngredients.html,
            wordCount: 100,
            variationCss: hydratedIngredients.css
          })
          console.log('[Recipe] Ingredients component added successfully')
        } else {
          console.error('[Recipe] hydrateIngredients returned null - check variation template')
        }
      }

      // INSTRUCTIONS - Use pre-generated if available
      const ingredientsList = ingredientsResult.success && ingredientsResult.data
        ? ingredientsResult.data.items.map((i: { quantity: string; name: string }) => `${i.quantity} ${i.name}`)
        : [`${topic} ingredients`]

      const instructionsResult = (config as any).preGeneratedInstructions || await generateInstructions({
        recipeTopic: topic,
        primaryKeyword,
        ingredients: ingredientsList,
        provider,
        titleFormat: config.variation as TitleFormat,
        costTracking,
      })

      console.log(`[Recipe] Instructions: ${instructionsResult.success ? 'SUCCESS (using pre-generated)' : 'FAILED'}`)
      if (!instructionsResult.success) {
        console.error(`[Recipe] Instructions error: ${instructionsResult.error}`)
      }

      if (instructionsResult.success && instructionsResult.data) {
        console.log(`[Recipe] Instructions data: ${instructionsResult.data.steps.length} steps, h2: ${instructionsResult.data.h2}`)
        
        // Grammar-correct the component H2
        const [correctedInstructionsH2] = await correctGrammarBatch(
          [instructionsResult.data.h2],
          { type: 'h2', provider, logCorrections: true, costTracking }
        )
        // Programmatic safety net: Ensure question marks
        instructionsResult.data.h2 = ensureQuestionMark(correctedInstructionsH2, config.variation)
        
        // AI schema returns {number, text}, hydrator expects {stepNumber, content}
        const hydratedInstructions = hydrateInstructions(variationName, {
          h2: instructionsResult.data.h2,
          steps: instructionsResult.data.steps.map((step: { number?: number; text: string }, i: number) => ({
            stepNumber: step.number || i + 1,
            content: step.text
          }))
        }, config.variation as TitleFormat)
        if (hydratedInstructions) {
          components.push({
            componentId: 'instructions',
            html: hydratedInstructions.html,
            wordCount: 200,
            variationCss: hydratedInstructions.css
          })
          console.log('[Recipe] Instructions component added successfully')
        } else {
          console.error('[Recipe] hydrateInstructions returned null - check variation template')
        }
      }

      // NUTRITION - skip if disabled
      if (!isComponentOn('nutrition-table')) {
        console.log('[Recipe] Nutrition table skipped (disabled by user)')
        break
      }

      // NUTRITION - Generate with actual ingredients context for accuracy
      let nutritionPromptContext = ''
      if (ingredientsResult.success && ingredientsResult.data) {
        const ingredientNames = ingredientsResult.data.items.slice(0, 5).map((item: { name: string }) => item.name)
        nutritionPromptContext = `Based on these ingredients: ${ingredientNames.join(', ')}`
      }

      const nutritionResult = await generateUniqueComponent({
        componentType: 'nutrition-table',
        schema: NutritionTableSchema,
        prompt: buildNutritionPrompt({
          recipeTopic: topic,
          servings: 4,
          recipeType: 'main',
          titleFormat: config.variation as TitleFormat,
          ingredientContext: nutritionPromptContext ? nutritionPromptContext.replace('Based on these ingredients: ', '') : undefined,
        }),
        provider,
        costTracking,
      })

      console.log(`[Recipe] Nutrition generation: ${nutritionResult.success ? 'SUCCESS' : 'FAILED'}`)
      if (!nutritionResult.success) {
        console.error(`[Recipe] Nutrition error: ${nutritionResult.error}`)
      }

      if (nutritionResult.success && nutritionResult.data) {
        // Map the schema output (facts nested) to the hydrator input (flat)
        const nutritionData = nutritionResult.data as {
          h2?: string
          facts: {
            calories: number
            totalFat: string
            carbohydrates: string
            protein: string
          }
        }
        console.log(`[Recipe] Nutrition h2: ${nutritionData.h2}`)
        
        // Grammar-correct the component H2
        if (nutritionData.h2) {
          const [correctedNutritionH2] = await correctGrammarBatch(
            [nutritionData.h2],
            { type: 'h2', provider, logCorrections: true, costTracking }
          )
          // Programmatic safety net: Ensure question marks
          nutritionData.h2 = ensureQuestionMark(correctedNutritionH2, config.variation)
        }
        
        const hydratedNutrition = hydrateNutrition(variationName, {
          h2: nutritionData.h2,
          calories: nutritionData.facts.calories,
          fat: nutritionData.facts.totalFat,
          carbs: nutritionData.facts.carbohydrates,
          protein: nutritionData.facts.protein,
        }, config.variation as TitleFormat)
        if (hydratedNutrition) {
          components.push({
            componentId: 'nutrition-table',
            html: hydratedNutrition.html,
            wordCount: 50,
            variationCss: hydratedNutrition.css
          })
          console.log('[Recipe] Nutrition component added successfully')
        } else {
          console.error('[Recipe] hydrateNutrition returned null - check variation template')
        }
      }

      console.log(`[Recipe] Total components generated: ${components.length}`)
      console.log(`[Recipe] Component IDs: ${components.map(c => c.componentId).join(', ')}`)
      break
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REVIEW: Feature List + Pros/Cons + Rating
    // Uses pre-generated data if available (from connected content flow)
    // ═══════════════════════════════════════════════════════════════════════
    case 'review': {
      // Check if we have pre-generated data from the connected content flow
      const preGenFeatures = (config as any).preGeneratedFeatures
      const preGenProsCons = (config as any).preGeneratedProsCons
      const preGenRating = (config as any).preGeneratedRating

      // Use pre-generated features or generate new
      const featureResult = preGenFeatures || await generateFeatureList({
        topic,
        primaryKeyword,
        productOrService: topic,
        provider,
        coreKeywords,
        costTracking,
      })

      console.log('[Review] Feature list:', preGenFeatures ? 'REUSING PRE-GENERATED' : 'NEWLY GENERATED',
        featureResult.success ? `features: ${featureResult.data?.features?.length}` : featureResult.error)

      if (featureResult.success && featureResult.data) {
        // Strip any numbers from feature list H2 immediately (component H2s should never be numbered)
        if (featureResult.data.h2) {
          featureResult.data.h2 = stripH2Number(featureResult.data.h2)
          
          // Grammar-correct the component H2
          const [correctedFeaturesH2] = await correctGrammarBatch(
            [featureResult.data.h2],
            { type: 'h2', provider, logCorrections: true, costTracking }
          )
          // Programmatic safety net: Ensure question marks
          featureResult.data.h2 = ensureQuestionMark(correctedFeaturesH2, config.variation)
        }

        const hydratedFeatures = hydrateFeatureList(variationName, {
          h2: featureResult.data.h2,
          features: featureResult.data.features.map((f: { title: string; description: string }) => ({
            title: f.title,
            description: f.description
          }))
        }, config.variation as TitleFormat)
        if (hydratedFeatures) {
          components.push({
            componentId: 'feature-list',
            html: hydratedFeatures.html,
            wordCount: 100,
            variationCss: hydratedFeatures.css
          })
        } else {
          console.error('[Review] Feature list hydration returned null')
        }
      }

      // Use pre-generated pros/cons or generate new
      const prosConsResult = preGenProsCons || await generateProsCons({
        topic,
        primaryKeyword,
        productName: topic,
        provider,
        titleFormat: config.variation as 'question' | 'statement' | 'listicle',
        coreKeywords,
        costTracking,
      })

      console.log('[Review] Pros/cons:', preGenProsCons ? 'REUSING PRE-GENERATED' : 'NEWLY GENERATED',
        prosConsResult.success ? `pros: ${prosConsResult.data?.pros?.length}, cons: ${prosConsResult.data?.cons?.length}, h2: "${prosConsResult.data?.h2}"` : prosConsResult.error)

      if (prosConsResult.success && prosConsResult.data) {
        // Strip any numbers from pros/cons H2 immediately (component H2s should never be numbered)
        if (prosConsResult.data.h2) {
          prosConsResult.data.h2 = stripH2Number(prosConsResult.data.h2)
          
          // Grammar-correct the component H2
          const [correctedProsConsH2] = await correctGrammarBatch(
            [prosConsResult.data.h2],
            { type: 'h2', provider, logCorrections: true, costTracking }
          )
          // Programmatic safety net: Ensure question marks
          prosConsResult.data.h2 = ensureQuestionMark(correctedProsConsH2, config.variation)
        }

        const hydratedProsCons = hydrateProsCons(variationName, {
          h2: prosConsResult.data.h2, // Pass AI-generated H2 (with numbers stripped)
          pros: prosConsResult.data.pros,
          cons: prosConsResult.data.cons
        }, config.variation as TitleFormat)
        if (hydratedProsCons) {
          components.push({
            componentId: 'pros-cons',
            html: hydratedProsCons.html,
            wordCount: 150,
            variationCss: hydratedProsCons.css
          })
        }
      }

      // Use pre-generated rating or generate new
      let ratingData: { h2?: string; score: number; scoreDisplay: string; title: string; justification: string } | null = null

      if (preGenRating) {
        ratingData = preGenRating
        console.log('[Review] Rating: REUSING PRE-GENERATED', `score: ${ratingData?.score}, verdict: ${ratingData?.title}`)
      } else {
        const ratingResult = await generateUniqueComponent({
          componentType: 'rating',
          schema: RatingContentSchema,
          prompt: `Generate a rating for: ${topic}. Primary keyword: ${primaryKeyword}.

You MUST return JSON with:
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "score": 8.5,
  "scoreDisplay": "8.5" (just the number for display),
  "title": "Excellent" or "Highly Recommended" or "Good Value" (rating label),
  "justification": "100-word paragraph explaining the rating"
}

For "h2": Create YOUR OWN original heading.
  Inspiration (do NOT copy these, create your own original phrasing): "Our Verdict on ${topic}", "Final ${topic} Assessment", "How ${topic} Scores Overall"
  CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration.
  BANNED words: "Essential" (overused)`,
          provider,
          costTracking,
        })

        if (ratingResult.success && ratingResult.data) {
          ratingData = ratingResult.data
          // Strip any numbers from rating H2 immediately (component H2s should never be numbered)
          if (ratingData.h2) {
            ratingData.h2 = stripH2Number(ratingData.h2)
            
            // Grammar-correct the component H2
            const [correctedRatingH2] = await correctGrammarBatch(
              [ratingData.h2],
              { type: 'h2', provider, logCorrections: true, costTracking }
            )
            // Programmatic safety net: Ensure question marks
            ratingData.h2 = ensureQuestionMark(correctedRatingH2, config.variation)
          }
          console.log('[Review] Rating: NEWLY GENERATED', `score: ${ratingData.score}, verdict: ${ratingData.title}`)
        }
      }

      if (ratingData) {
        console.log('[Review] Rating data:', { h2: ratingData.h2, score: ratingData.score, scoreDisplay: ratingData.scoreDisplay, title: ratingData.title })
        const hydratedRating = hydrateRating(variationName, {
          h2: ratingData.h2,
          score: ratingData.scoreDisplay,
          title: ratingData.title,
          summary: ratingData.justification
        }, config.variation as TitleFormat)
        if (hydratedRating) {
          components.push({
            componentId: 'rating-paragraph',
            html: hydratedRating.html,
            wordCount: 50,
            variationCss: hydratedRating.css
          })
        }
      }
      break
    }
  }

  console.log(`[UniqueComponents] Total components generated for ${articleType}: ${components.length}`)
  console.log(`[UniqueComponents] Component IDs: ${components.map(c => c.componentId).join(', ') || '(none)'}`)

  return components
}

// ═══════════════════════════════════════════════════════════════════════════════
// NON-STREAMING API
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateArticleUnified(
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

  for await (const event of orchestrateUnifiedGeneration(articleType, topic, variation, targetWordCount, onImageGenerate, componentColor, provider, variationName)) {
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
