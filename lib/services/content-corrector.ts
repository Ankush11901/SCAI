/**
 * Content Corrector Service
 * 
 * Iteratively corrects AI-generated content that fails SCAI validation.
 * Re-prompts the AI with specific error feedback to fix issues like:
 * - Word count violations
 * - Forbidden phrases
 * - Character limit breaches
 * - Format inconsistencies
 */

import { generateText } from 'ai'
import { getModelWithFallback, executeWithFallback, type AIProvider } from '@/lib/ai/providers'
import type { CostTrackingContext } from './cost-tracking-service'
import {
  validateGeneratedContent,
  type ValidationResult,
  type ValidationIssue,
  type ArticleContent,
} from './content-validator'
import {
  WORD_COUNT_RULES,
  CHARACTER_LIMITS,
  FORBIDDEN_PHRASES,
} from '@/lib/ai/rules/forbidden-content'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe context for connected content corrections
 */
export interface RecipeContextForCorrection {
  dishName: string
  ingredients: string[]
  cookingMethod?: string
  cuisineStyle?: string
  timelineNote?: string
  fermentation?: 'uses' | 'avoids' | 'unknown'
  ingredientNotes?: string[]
}

/**
 * Review context for connected content corrections
 */
export interface ReviewContextForCorrection {
  productName: string
  category: string
  rating: {
    score: number
    verdict: string
  }
  keyFeatures: string[]
  topPros: string[]
  topCons: string[]
  pricePoint?: 'budget' | 'mid-range' | 'premium'
  targetAudience?: string
}

export interface CorrectionContext {
  topic: string
  articleType: string
  variation: 'statement' | 'question' | 'listicle'
  provider: AIProvider
  h1?: string
  closingH2?: string
  primaryKeyword?: string  // For H2 keyword density correction (full phrase)
  coreKeywords?: string[]  // Extracted core keywords for natural H2 integration
  recipeContext?: RecipeContextForCorrection  // Optional recipe context for connected corrections
  reviewContext?: ReviewContextForCorrection  // Optional review context for connected corrections
  costTracking?: CostTrackingContext  // Optional cost tracking context
}

export interface ComponentCorrection {
  componentId: string
  originalContent: string
  correctedContent: string
  issue: ValidationIssue
  attempts: number
  success: boolean
}

export interface CorrectionResult {
  success: boolean
  totalAttempts: number
  corrections: ComponentCorrection[]
  finalValidation: ValidationResult
  correctedContent: ArticleContent
}

export interface CorrectionConfig {
  maxAttemptsPerComponent: number
  maxTotalAttempts: number
  stopOnFirstSuccess: boolean
}

const DEFAULT_CONFIG: CorrectionConfig = {
  maxAttemptsPerComponent: 3,
  maxTotalAttempts: 10,
  stopOnFirstSuccess: false,
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUZZWORD AUTO-REPLACEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map of buzzwords to their plain-language replacements.
 * These replace marketing jargon with specific, factual alternatives.
 */
const BUZZWORD_REPLACEMENTS: Record<string, string> = {
  'unique': 'distinct',
  'amazing': 'impressive',
  'incredible': 'notable',
  'unbelievable': 'remarkable',
  'spectacular': 'excellent',
  'phenomenal': 'exceptional',
  'game-changer': 'significant improvement',
  'game changer': 'significant improvement',
  'revolutionary': 'advanced',
  'revolutionize': 'significantly improve',
  'cutting-edge': 'modern',
  'cutting edge': 'modern',
  'state-of-the-art': 'current-generation',
  'state of the art': 'current-generation',
  'world-class': 'high-quality',
  'best-in-class': 'top-tier',
  'groundbreaking': 'new',
  'unprecedented': 'first of its kind',
  'next-gen': 'newer',
  'next generation': 'newer',
  'innovative': 'well-designed',
  'seamless': 'smooth',
  'synergy': 'combination',
  'leverage': 'use',
  'disruptive': 'different',
  'paradigm': 'approach',
}

/**
 * Replace buzzwords in text with plain-language alternatives.
 * Handles case-insensitive matching while preserving original case pattern.
 */
export function replaceBuzzwords(text: string): { text: string; replaced: string[] } {
  let result = text
  const replaced: string[] = []

  for (const [buzzword, replacement] of Object.entries(BUZZWORD_REPLACEMENTS)) {
    // Create case-insensitive regex with word boundaries
    const pattern = new RegExp(`\\b${buzzword.replace(/-/g, '[-\\s]?')}\\b`, 'gi')

    if (pattern.test(result)) {
      replaced.push(buzzword)
      result = result.replace(pattern, (match) => {
        // Preserve capitalization of first letter
        if (match[0] === match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1)
        }
        return replacement
      })
    }
  }

  return { text: result, replaced }
}

/**
 * Replace buzzwords in HTML content while preserving HTML structure.
 * Only replaces text content, not attributes or tags.
 */
export function replaceBuzzwordsInHtml(html: string): { html: string; replaced: string[] } {
  const allReplaced: string[] = []

  // Replace buzzwords in text nodes only (between > and <)
  const result = html.replace(/>([^<]+)</g, (match, textContent) => {
    const { text, replaced } = replaceBuzzwords(textContent)
    allReplaced.push(...replaced)
    return `>${text}<`
  })

  // Also check alt text attributes
  const altResult = result.replace(/alt="([^"]+)"/g, (match, altText) => {
    const { text, replaced } = replaceBuzzwords(altText)
    allReplaced.push(...replaced)
    return `alt="${text}"`
  })

  return { html: altResult, replaced: [...new Set(allReplaced)] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC LISTICLE CORRECTIONS (Non-LLM)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that identify non-list-item H2s (component H2s, closing H2s)
 * These should NOT be numbered in listicle format
 */
const LISTICLE_NON_LIST_H2_PATTERNS = [
  /pros?\s*(and|&|,)?\s*cons?/i,
  /key\s*features?/i,
  /feature\s*list/i,
  /honorable\s*mentions?/i,
  /product\s*cards?/i,
  /comparison\s*table/i,
  /quick\s*(verdict|facts?|summary)/i,
  /rating|score|verdict/i,
  /specifications?|specs/i,
  /final\s*(thoughts?|verdict|takeaway|summary|word)/i,
  /conclusion|summary|wrap[- ]?up/i,
  /in\s*summary/i,
  /the\s*bottom\s*line/i,
  /our\s*verdict/i,
  /key\s*takeaways?/i,
  /wrapping\s*(it\s*)?up/i,
]

/**
 * Check if an H2 is a non-list-item (component or closing)
 */
function isNonListItemH2(h2Text: string): boolean {
  const normalized = h2Text.toLowerCase().trim()
  return LISTICLE_NON_LIST_H2_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * Extract the number from the start of a listicle H2
 */
function extractH2Number(h2: string): number | null {
  const match = h2.match(/^(\d+)[.:)\-\s]/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Set or replace the number at the start of a listicle H2
 */
function setH2Number(h2: string, newNumber: number): string {
  if (/^(\d+)[.:)\-\s]/.test(h2)) {
    return h2.replace(/^(\d+)([.:)\-\s]+)/, `${newNumber}$2`)
  }
  return `${newNumber}. ${h2}`
}

/**
 * Strip the number from the start of an H2
 */
function stripH2Number(h2: string): string {
  return h2.replace(/^\d+[.:)\-\s]+\s*/, '').trim()
}

/**
 * Extract the number from the start of a listicle H1
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

export interface ListicleNormalizationResult {
  html: string
  h1Updated: boolean
  h2sRenumbered: number
  componentH2sStripped: number
  closingStrippped: boolean
  originalH1Number: number | null
  newH1Number: number | null
  listItemCount: number
}

/**
 * Normalize listicle H1 and H2 numbering in final HTML
 * 
 * This is a DETERMINISTIC (non-LLM) corrector that:
 * 1. Counts actual list-item H2s (excluding component/closing H2s)
 * 2. Does NOT update H1 number (H1 is locked from initial generation)
 * 3. Renumbers list-item H2s sequentially (1, 2, 3, ...)
 * 4. Strips any numbers from component H2s (Pros/Cons, Features, etc.)
 * 5. Strips any numbers from closing H2
 */
export function normalizeListicleHtml(html: string): ListicleNormalizationResult {
  let result = html
  let h1Updated = false
  let h2sRenumbered = 0
  let componentH2sStripped = 0
  let closingStripped = false
  let originalH1Number: number | null = null
  let newH1Number: number | null = null

  // Extract H1
  const h1Match = result.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const h1Text = h1Match ? h1Match[1].trim() : ''
  originalH1Number = extractH1Number(h1Text)

  // Extract all H2s with their positions and context
  const h2Regex = /<h2([^>]*)>(.*?)<\/h2>/gi
  const h2s: Array<{ full: string; attrs: string; text: string; isListItem: boolean; isClosing: boolean; isComponent: boolean }> = []

  let h2Match
  while ((h2Match = h2Regex.exec(result)) !== null) {
    const attrs = h2Match[1]
    const text = h2Match[2].trim()

    // Check if H2 is inside a component section by looking at parent data-component attribute
    const beforeH2 = result.substring(0, h2Match.index)

    // Check for component sections (feature-section, pros-cons-section, rating-section, faq-section, etc.)
    const lastComponentOpen = Math.max(
      beforeH2.lastIndexOf('data-component="scai-feature-section"'),
      beforeH2.lastIndexOf('data-component="scai-pros-cons-section"'),
      beforeH2.lastIndexOf('data-component="scai-rating-section"'),
      beforeH2.lastIndexOf('data-component="scai-faq-section"'),
      beforeH2.lastIndexOf('data-component="scai-faq"')
    )

    const lastClosingOpen = beforeH2.lastIndexOf('data-component="scai-closing"')
    const lastSectionOpen = beforeH2.lastIndexOf('<section')
    const lastSectionClose = beforeH2.lastIndexOf('</section>')
    const lastDivOpen = beforeH2.lastIndexOf('<div')
    const lastDivClose = beforeH2.lastIndexOf('</div>')

    // H2 is a component if it's inside a component div/section that hasn't been closed
    const isComponent = lastComponentOpen > -1 &&
      lastComponentOpen > lastSectionClose &&
      lastComponentOpen > lastDivClose

    // H2 is closing if it's inside a closing section
    const isClosing = lastClosingOpen > lastSectionClose && lastClosingOpen > lastSectionOpen - 100

    h2s.push({
      full: h2Match[0],
      attrs,
      text,
      isListItem: !isComponent && !isClosing,
      isClosing,
      isComponent,
    })
  }

  // Count list items
  const listItemH2s = h2s.filter(h2 => h2.isListItem)
  const listItemCount = listItemH2s.length

  // DO NOT update H1 number during correction - H1 is locked from initial generation
  // The H1 number represents the intended list count from article generation.
  // Changing it during correction would break article coherence.
  newH1Number = originalH1Number
  if (originalH1Number !== null && originalH1Number !== listItemCount) {
    console.log(`[ListicleCorrector] H1 number (${originalH1Number}) differs from list items (${listItemCount}) - H1 LOCKED, not changing`)
  }

  // Renumber list-item H2s sequentially
  let listItemCounter = 0
  for (const h2 of h2s) {
    if (h2.isListItem) {
      listItemCounter++
      const currentNumber = extractH2Number(h2.text)
      if (currentNumber !== listItemCounter) {
        const newText = setH2Number(h2.text, listItemCounter)
        result = result.replace(
          new RegExp(`<h2${h2.attrs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>${h2.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`, 'i'),
          `<h2${h2.attrs}>${newText}</h2>`
        )
        h2sRenumbered++
        console.log(`[ListicleCorrector] H2 renumbered: "${h2.text}" → "${newText}"`)
      }
    }
  }

  // Strip numbers from component H2s (Pros/Cons, Features, etc.)
  // These should NEVER be numbered in listicle format
  for (const h2 of h2s) {
    if (h2.isComponent && extractH2Number(h2.text) !== null) {
      const strippedText = stripH2Number(h2.text)
      result = result.replace(
        new RegExp(`<h2${h2.attrs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>${h2.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`, 'i'),
        `<h2${h2.attrs}>${strippedText}</h2>`
      )
      componentH2sStripped++
      console.log(`[ListicleCorrector] Component H2 number stripped: "${h2.text}" → "${strippedText}"`)
    }
  }

  // Strip numbers from closing H2s
  for (const h2 of h2s) {
    if (h2.isClosing && extractH2Number(h2.text) !== null) {
      const strippedText = stripH2Number(h2.text)
      result = result.replace(
        new RegExp(`<h2${h2.attrs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>${h2.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`, 'i'),
        `<h2${h2.attrs}>${strippedText}</h2>`
      )
      closingStripped = true
      console.log(`[ListicleCorrector] Closing H2 number stripped: "${h2.text}" → "${strippedText}"`)
    }
  }

  return {
    html: result,
    h1Updated,
    h2sRenumbered,
    componentH2sStripped,
    closingStrippped: closingStripped,
    originalH1Number,
    newH1Number,
    listItemCount,
  }
}

/**
 * Rebuild TOC in HTML to include only list-item H2s
 * 
 * This updates the table of contents to:
 * 1. Include only numbered list-item H2s
 * 2. Exclude component H2s (Pros/Cons, Honorable Mentions, etc.)
 * 3. Exclude closing H2
 */
export function rebuildListicleToc(html: string): { html: string; tocUpdated: boolean; newItemCount: number } {
  // Find TOC section
  const tocMatch = html.match(/<nav[^>]*data-component="scai-toc"[^>]*>([\s\S]*?)<\/nav>/i)
  if (!tocMatch) {
    return { html, tocUpdated: false, newItemCount: 0 }
  }

  // Extract list-item H2s (same logic as normalizeListicleHtml)
  const h2Regex = /<section[^>]*id="section-(\d+)"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/gi
  const sectionH2s: Array<{ sectionId: string; text: string; isListItem: boolean }> = []

  let match
  while ((match = h2Regex.exec(html)) !== null) {
    const sectionId = match[1]
    const h2Text = match[2].trim()
    const isListItem = !isNonListItemH2(h2Text)
    sectionH2s.push({ sectionId, text: h2Text, isListItem })
  }

  // Also check for closing section H2s
  const closingMatch = html.match(/<section[^>]*data-component="scai-closing"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/i)
  const closingH2Text = closingMatch ? closingMatch[1].trim() : null

  // Build new TOC items from list-item H2s only
  const listItemH2s = sectionH2s.filter(h2 => h2.isListItem && (!closingH2Text || h2.text !== closingH2Text))

  if (listItemH2s.length === 0) {
    return { html, tocUpdated: false, newItemCount: 0 }
  }

  // Build new TOC HTML
  const newTocItems = listItemH2s.map(h2 =>
    `<li class="toc-list-item"><a href="#section-${h2.sectionId}">${h2.text}</a></li>`
  ).join('\n        ')

  const newTocHtml = `<nav data-component="scai-toc" class="scai-toc">
    <h2 class="toc-title">Table of Contents</h2>
    <ul class="toc-list">
        ${newTocItems}
    </ul>
  </nav>`

  // Replace old TOC
  const result = html.replace(/<nav[^>]*data-component="scai-toc"[^>]*>[\s\S]*?<\/nav>/i, newTocHtml)

  console.log(`[ListicleCorrector] TOC rebuilt with ${listItemH2s.length} list-item entries`)

  return {
    html: result,
    tocUpdated: true,
    newItemCount: listItemH2s.length,
  }
}

/**
 * Full listicle correction: normalize numbering + rebuild TOC
 */
export function correctListicleArticle(html: string, isListicle: boolean): {
  html: string
  corrections: string[]
} {
  if (!isListicle) {
    return { html, corrections: [] }
  }

  const corrections: string[] = []

  // Step 1: Normalize H1/H2 numbering
  const normResult = normalizeListicleHtml(html)
  let result = normResult.html

  if (normResult.h1Updated) {
    corrections.push(`H1 number updated: ${normResult.originalH1Number} → ${normResult.newH1Number}`)
  }
  if (normResult.h2sRenumbered > 0) {
    corrections.push(`${normResult.h2sRenumbered} H2(s) renumbered sequentially`)
  }
  if (normResult.componentH2sStripped > 0) {
    corrections.push(`${normResult.componentH2sStripped} component H2(s) had numbers stripped`)
  }
  if (normResult.closingStrippped) {
    corrections.push('Closing H2 number stripped')
  }

  // Step 2: Rebuild TOC
  const tocResult = rebuildListicleToc(result)
  result = tocResult.html

  if (tocResult.tocUpdated) {
    corrections.push(`TOC rebuilt with ${tocResult.newItemCount} list-item entries`)
  }

  if (corrections.length > 0) {
    console.log(`[ListicleCorrector] Applied ${corrections.length} corrections:`)
    corrections.forEach(c => console.log(`[ListicleCorrector]   - ${c}`))
  }

  return { html: result, corrections }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get article-type-specific tone guidance for corrections
 * Ensures corrected content maintains the proper tone based on article type
 */
function getToneGuidanceForArticleType(
  articleType: string,
  variation: 'statement' | 'question' | 'listicle',
  componentType?: string
): string {
  // Only apply tone guidance for listicle variations and content components
  const isContentComponent = componentType && ['overviewParagraph', 'standardParagraph', 'closingParagraph'].includes(componentType)
  if (variation !== 'listicle' && !isContentComponent) {
    return ''
  }

  const toneMap: Record<string, { overview: string; section: string; closing: string }> = {
    review: {
      overview: `
🎯 REVIEW TONE REQUIREMENT:
- Use EVALUATIVE/ASSESSMENT language: "This feature excels...", "The value proposition...", "Performance-wise..."
- Avoid purely informational descriptions: "This feature is..." → "This feature performs..."
- You are REVIEWING and JUDGING, not just describing
- Express opinions on quality, value, and performance`,
      section: `
🎯 REVIEW TONE REQUIREMENT:
- Use EVALUATIVE language: "This aspect delivers...", "When tested...", "The verdict on this feature..."
- Assess quality, performance, and value
- NOT factual descriptions: avoid "This is..." → use "This performs...", "This excels..."
- Be judgmental in a professional way`,
      closing: `
🎯 REVIEW TONE REQUIREMENT:
- SUMMARIZE the assessment: "Overall, this product delivers...", "The final verdict..."
- Reference the evaluation provided: "Based on our testing...", "Considering the value..."
- Reinforce the rating or recommendation
- Close with evaluative perspective`
    },
    howto: {
      overview: `
🎯 HOW-TO TONE REQUIREMENT:
- Use INSTRUCTIONAL/DIRECTIVE language: "First, you'll...", "You need to...", "Make sure to..."
- Action-oriented and prescriptive
- Guide the reader through a process
- Use second person ("you will", "you should")`,
      section: `
🎯 HOW-TO TONE REQUIREMENT:
- Use INSTRUCTIONAL language: "To do this, start by...", "The next step involves...", "You'll want to..."
- Provide clear step-by-step guidance
- Be directive and actionable
- Focus on teaching the reader HOW to do something`,
      closing: `
🎯 HOW-TO TONE REQUIREMENT:
- RECAP the process: "Now that you've learned...", "With these steps completed..."
- Encourage action: "You're ready to...", "Apply these techniques..."
- Reinforce the instructional value`
    },
    recipe: {
      overview: `
🎯 RECIPE TONE REQUIREMENT:
- Use CULINARY/INSTRUCTIONAL language: "This dish features...", "You'll prepare...", "The cooking process..."
- Focus on ingredients, techniques, and outcomes
- Build anticipation for the cooking experience
- Reference specific recipe elements`,
      section: `
🎯 RECIPE TONE REQUIREMENT:
- Use CULINARY language: "The ingredients combine...", "During cooking...", "This technique ensures..."
- Describe cooking processes and ingredient interactions
- Provide cooking tips and technique explanations
- Maintain connection to the dish being prepared`,
      closing: `
🎯 RECIPE TONE REQUIREMENT:
- CONCLUDE the culinary journey: "Once prepared...", "This dish delivers...", "Serve and enjoy..."
- Reference the completed dish
- Encourage cooking and tasting`
    },
    informational: {
      overview: `
🎯 INFORMATIONAL TONE REQUIREMENT:
- Use EDUCATIONAL/EXPLANATORY language: "This aspect...", "Understanding this...", "This demonstrates..."
- Present facts, insights, and analysis
- Educate and inform objectively
- Avoid evaluative judgments - focus on knowledge sharing`,
      section: `
🎯 INFORMATIONAL TONE REQUIREMENT:
- Use EDUCATIONAL language: "This element...", "Research shows...", "Experts indicate..."
- Present information objectively
- Focus on facts and insights, not opinions
- Explain concepts clearly`,
      closing: `
🎯 INFORMATIONAL TONE REQUIREMENT:
- SUMMARIZE key learnings: "These insights reveal...", "Understanding these factors..."
- Reference the knowledge shared
- Encourage further exploration`
    }
  }

  const guidance = toneMap[articleType] || toneMap.informational

  // For listicle variations, return specific guidance based on component type
  if (variation === 'listicle') {
    if (componentType === 'overviewParagraph') return guidance.overview
    if (componentType === 'standardParagraph') return guidance.section
    if (componentType === 'closingParagraph') return guidance.closing
  }

  // For other components in any variation, return section guidance as default
  return guidance.section
}

function buildCorrectionPrompt(
  componentType: string,
  originalContent: string,
  issue: ValidationIssue,
  context: CorrectionContext
): string {
  const baseInstructions = getComponentInstructions(componentType, context)

  // Add a new block for article context to guide the tone
  const articleContextBlock = `
ARTICLE CONTEXT:
- Article Type: ${context.articleType.toUpperCase()}
- Variation/Format: ${context.variation.toUpperCase()}

TONE GUIDANCE:
- For INFORMATIONAL articles, the tone should be educational, objective, and neutral.
- For REVIEW or COMPARISON articles, the tone should be evaluative and analytical.
- For HOW-TO articles, the tone must be instructional and direct.
- Maintain this tone in your correction.
`;

  // Extract word count info from issue if applicable
  const wordCountMatch = issue.message.match(/word count \((\d+)\).*target \((\d+)\)/i)
  const currentWords = wordCountMatch ? parseInt(wordCountMatch[1]) : null
  const targetWords = wordCountMatch ? parseInt(wordCountMatch[2]) : null
  const wordCountGuidance = currentWords && targetWords
    ? `\n\nWORD COUNT GUIDANCE:\n- Current: ${currentWords} words\n- Target: EXACTLY ${targetWords} words\n- You need to ${currentWords < targetWords ? `ADD ${targetWords - currentWords} more words` : `REMOVE ${currentWords - targetWords} words`}\n- Count your words carefully before responding!`
    : ''

  // Build recipe-specific context if available
  let recipeGuidance = ''
  if (context.recipeContext && context.articleType === 'recipe') {
    const { dishName, ingredients, cookingMethod, cuisineStyle, timelineNote, fermentation, ingredientNotes } = context.recipeContext
    const ingredientHighlights = ingredients.slice(0, 4).join(', ')

    recipeGuidance = `

🍳 RECIPE CONTEXT (MUST MAINTAIN):
- Dish: ${dishName}
- Key ingredients: ${ingredientHighlights}
${cookingMethod ? `- Cooking method: ${cookingMethod}` : ''}
${cuisineStyle ? `- Style: ${cuisineStyle}` : ''}
${timelineNote ? `- Timeline note: ${timelineNote}` : ''}
${fermentation && fermentation !== 'unknown' ? `- Fermentation: ${fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}` : ''}
${ingredientNotes && ingredientNotes.length > 0 ? `- Ingredient clarifications: ${ingredientNotes.join('; ')}` : ''}

When correcting this content, MAINTAIN references to the specific recipe details above.
The corrected content should still feel connected to this specific dish and ingredients.`

    console.log(`[ContentCorrector] 🍳 Adding recipe context to correction prompt for ${componentType}`)
  }

  // Build review-specific context if available
  let reviewGuidance = ''
  if (context.reviewContext && context.articleType === 'review') {
    const { productName, category, rating, keyFeatures, topPros, topCons, pricePoint, targetAudience } = context.reviewContext

    reviewGuidance = `

⭐ REVIEW CONTEXT (MUST MAINTAIN):
- Product: ${productName}
- Category: ${category}
- Rating: ${rating.score}/10 - "${rating.verdict}"
- Key features: ${keyFeatures.slice(0, 3).join(', ')}
- Top strengths: ${topPros.slice(0, 2).join(', ')}
${topCons.length > 0 ? `- Considerations: ${topCons[0]}` : ''}
${pricePoint ? `- Price positioning: ${pricePoint}` : ''}
${targetAudience ? `- Target audience: ${targetAudience}` : ''}

When correcting this content, MAINTAIN consistency with the rating and verdict.
Do NOT contradict the ${rating.score}/10 rating or the product assessment.
The corrected content should align with the "${rating.verdict}" verdict.`

    console.log(`[ContentCorrector] ⭐ Adding review context to correction prompt for ${componentType}`)
  }

  return `You are fixing content that failed SCAI validation. 
${articleContextBlock}
ORIGINAL CONTENT:
"${originalContent}"

VALIDATION ERROR:
- Component: ${issue.component}
- Rule: ${issue.rule}
- Issue: ${issue.message}
${issue.location?.expected ? `- Expected: ${issue.location.expected}` : ''}
${issue.location?.value ? `- Actual: ${issue.location.value}` : ''}
${wordCountGuidance}
${recipeGuidance}
${reviewGuidance}

${baseInstructions}

FIX REQUIREMENTS:
1. Address the SPECIFIC error mentioned above
2. Keep the same meaning and tone as guided by the ARTICLE CONTEXT.
3. Do NOT change anything that wasn't flagged as an error
4. If fixing word count: count words PRECISELY - aim for EXACTLY the target number
5. Return ONLY the corrected text, no explanations
${context.recipeContext ? '6. MAINTAIN all recipe-specific references (ingredients, dish name, cooking method)' : ''}
${context.reviewContext ? '7. MAINTAIN rating consistency and product assessment alignment' : ''}

CORRECTED CONTENT:`
}

function getComponentInstructions(componentType: string, context: CorrectionContext): string {
  const { topic, articleType, variation, h1, closingH2 } = context

  // Get article-type-specific tone guidance
  const toneGuidance = getToneGuidanceForArticleType(articleType, variation, componentType)

  switch (componentType) {
    case 'overviewParagraph':
      return `
OVERVIEW PARAGRAPH RULES:
- EXACTLY ${WORD_COUNT_RULES.overviewParagraph.target} words (±${WORD_COUNT_RULES.overviewParagraph.tolerance} tolerance)
- Hook the reader in the first sentence
- Preview what the article covers
- Include the primary keyword "${topic}" naturally
- NO HTML, NO markdown, plain text only
${toneGuidance}`

    case 'closingParagraph':
      return `
CLOSING PARAGRAPH RULES:
- EXACTLY ${WORD_COUNT_RULES.closingParagraph.target} words (±${WORD_COUNT_RULES.closingParagraph.tolerance} tolerance)
- NEVER start with: ${FORBIDDEN_PHRASES.closingParagraphStart.slice(0, 5).join(', ')}
- End with value reinforcement, not summary
- NO HTML, NO markdown, plain text only
${toneGuidance}`

    case 'standardParagraph':
      return `
STANDARD PARAGRAPH RULES:
- EXACTLY ${WORD_COUNT_RULES.standardParagraph.target} words total (±${WORD_COUNT_RULES.standardParagraph.tolerance} tolerance)
- Write EXACTLY 3 SEPARATE PARAGRAPHS
- Each paragraph: ~50 words, 250-300 characters
- CRITICAL: Separate paragraphs with a BLANK LINE (double newline)
- Support the H2 heading
- Add specific, actionable information
- NO HTML, NO markdown, plain text only

FORMAT (MUST FOLLOW):
[First paragraph ~50 words]

[Second paragraph ~50 words]

[Third paragraph ~50 words]
${toneGuidance}`

    case 'h1':
      return `
H1 TITLE RULES:
- ${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} characters
- Format: ${variation.toUpperCase()} style

⚠️ FORMAT REQUIREMENTS (CRITICAL - MUST MATCH VARIATION):
${variation === 'question' ? `- This is a QUESTION format article
- H1 MUST end with a question mark (?)
- H1 should start with What, How, Why, Which, When, or Where
- Example: "What Makes This Product Worth Buying?"` : ''}
${variation === 'statement' ? `- This is a STATEMENT format article
- H1 must be a direct, declarative sentence
- H1 must NOT contain any question marks (?)
- NO questions allowed
- Example: "The Complete Guide to Better Results"` : ''}
${variation === 'listicle' ? `- This is a LISTICLE format article
- H1 MUST start with a number (5, 7, 10, etc.)
- H1 must NOT contain any question marks (?)
- Example: "7 Essential Tips for Better Results"` : ''}

⚠️ SEMANTIC RELEVANCE CHECK (CRITICAL):
- Ensure adjectives match the TOPIC CATEGORY.
- For a Celebrity/Artist: Use "Shocking", "Surprising", "Unknown", "Incredible", "Fascinating", "Untold", "Little-Known". (❌ AVOID "Scientific", "Technical", "Nutritional", "Delicious")
- For a Product: Use "Essential", "Top-Rated", "Innovative", "Practical", "Reliable", "Must-Have". (❌ AVOID "Emotional", "Shocking", "Heartbreaking")
- For a Scientific/Tech Concept: Use "Critical", "Essential", "Complex", "Fundamental", "Groundbreaking".
- For a History Topic: Use "Unknown", "Dark", "Forgotten", "Pivotal", "Historic".
- For a Food/Recipe: Use "Delicious", "Mouth-Watering", "Authentic", "Easy", "Classic".

- NEVER use: ${FORBIDDEN_PHRASES.h1Generic.slice(0, 4).join(', ')}
- Topic: ${topic}
- Include the primary keyword naturally`

    case 'h2':
      return `
H2 HEADING RULES:
- ${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} characters
- Format: Must match H1 style (${variation})

⚠️ FORMAT REQUIREMENTS (CRITICAL - MUST MATCH H1 VARIATION):
${variation === 'question' ? `- This is a QUESTION format article
- H2 MUST be a QUESTION ending with ?
- H2 should start with What, How, Why, Which, When, or Where
- Example: "How Does This Feature Compare?"` : ''}
${variation === 'statement' ? `- This is a STATEMENT format article
- H2 must be a direct, declarative statement
- H2 must NOT contain any question marks (?)
- Example: "Key Benefits for Users"` : ''}
${variation === 'listicle' ? `- This is a LISTICLE format article
- ONLY list-item H2s should be numbered (1., 2., 3., etc.)
- Component H2s (Features, Pros/Cons, FAQ, Rating) should NOT be numbered
- H2 must NOT contain any question marks
- Example: "3. Performance Optimization"` : ''}

⚠️ SEMANTIC RELEVANCE CHECK (CRITICAL):
- Ensure adjectives match the TOPIC CATEGORY.
- For a Celebrity/Artist: Use "Shocking", "Surprising", "Unknown", "Incredible", "Fascinating", "Untold", "Little-Known". (❌ AVOID "Scientific", "Technical", "Nutritional", "Delicious")
- For a Product: Use "Essential", "Top-Rated", "Innovative", "Practical", "Reliable", "Must-Have". (❌ AVOID "Emotional", "Shocking", "Heartbreaking")
- For a Scientific/Tech Concept: Use "Critical", "Essential", "Complex", "Fundamental", "Groundbreaking".
- For a History Topic: Use "Unknown", "Dark", "Forgotten", "Pivotal", "Historic".
- For a Food/Recipe: Use "Delicious", "Mouth-Watering", "Authentic", "Easy", "Classic".

- NEVER include "and" or "or" (single focus only)
- NEVER include colons (:)
- Topic: ${topic}`

    case 'closingH2':
      return `
CLOSING H2 RULES:
- ${CHARACTER_LIMITS.closingH2.min}-${CHARACTER_LIMITS.closingH2.max} characters
- ${variation === 'listicle' ? 'NEVER start with a number — closing H2 is a structural section, NOT a list item' : `Format: Must match H1 style (${variation})`}
- NEVER use: ${FORBIDDEN_PHRASES.closingH2.join(', ')}
- Be descriptive and elaborative`

    case 'faqQuestion':
      return `
FAQ QUESTION RULES:
- ${CHARACTER_LIMITS.faqH3.min}-${CHARACTER_LIMITS.faqH3.max} characters
- Must be a single, focused question
- Must end with a question mark (?)
- Related to topic: ${topic}`

    case 'faqAnswer':
      return `
FAQ ANSWER RULES:
- EXACTLY ${WORD_COUNT_RULES.faqAnswer.target} words (±${WORD_COUNT_RULES.faqAnswer.tolerance} tolerance)
- Direct answer to the question
- Concise and informative
- NO HTML, NO markdown, plain text only`

    case 'metaTitle':
      return `
META TITLE RULES:
- ${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} characters EXACTLY
- NEVER include colons (:)
- Include the primary keyword "${topic}"
- Make it compelling for search results
- Plain text only, no special characters
- MUST be grammatically correct — a single coherent phrase, NOT keywords jammed together
- ❌ BAD: "How to Grow Tomatoes Indoors Year Round Tips" (two ideas without grammar)
- ✅ GOOD: "How to Grow Tomatoes Indoors All Year Round" (proper sentence)`

    case 'metaDescription':
      return `
META DESCRIPTION RULES:
- ${CHARACTER_LIMITS.metaDescription.min}-${CHARACTER_LIMITS.metaDescription.max} characters EXACTLY
- Include the primary keyword "${topic}"
- Summarize the article value proposition
- Call to action or benefit-focused
- Plain text only`

    case 'featuredImageAlt':
      return `
FEATURED IMAGE ALT TEXT RULES:
- ${CHARACTER_LIMITS.featuredImageAlt.min}-${CHARACTER_LIMITS.featuredImageAlt.max} characters EXACTLY
- NEVER start with "Image of", "Picture of", "Photo of"
- Describe what is IN the image, not what it represents
- Include the primary keyword "${topic}" naturally
- Plain text only, no HTML or special characters`

    case 'h2ImageAlt':
      return `
H2 SECTION IMAGE ALT TEXT RULES:
- ${CHARACTER_LIMITS.h2ImageAlt.min}-${CHARACTER_LIMITS.h2ImageAlt.max} characters EXACTLY
- NEVER start with "Image of", "Picture of", "Photo of"
- Describe what is IN the image visually
- Related to the section content
- Plain text only, no HTML or special characters`

    default:
      return `
GENERAL CONTENT RULES:
- Follow word count/character limit exactly
- Avoid forbidden phrases
- Match the article tone
- Plain text only`
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE COMPONENT CORRECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Correct a single component that failed validation
 */
export async function correctComponent(
  componentType: string,
  originalContent: string,
  issue: ValidationIssue,
  context: CorrectionContext
): Promise<{ corrected: string; success: boolean }> {
  const prompt = buildCorrectionPrompt(componentType, originalContent, issue, context)

  try {
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))

    const { result } = await executeWithFallback(
      async (model) => {
        return generateText({
          model,
          prompt,
          temperature: 0.2, // Lower temperature for more precise corrections
          maxOutputTokens: 500,
          maxRetries: 1, // executeWithFallback handles retries
        })
      },
      { preferredProvider: context.provider, tier: 'fast', operationName: `correctComponent-${componentType}`, costTracking: context.costTracking }
    )

    let corrected = result.text.trim()

    // Strip surrounding quotes that AI sometimes adds
    if ((corrected.startsWith('"') && corrected.endsWith('"')) ||
      (corrected.startsWith("'") && corrected.endsWith("'"))) {
      corrected = corrected.slice(1, -1).trim()
    }

    // Quick validation of the correction
    if (corrected.length === 0) {
      return { corrected: originalContent, success: false }
    }

    return { corrected, success: true }
  } catch (error: unknown) {
    console.error(`[ContentCorrector] Failed to correct ${componentType}:`, error)

    // Check if it's a rate limit error (429) and add longer delay
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Rate limit')) {
      console.log(`[ContentCorrector] Rate limit hit, waiting 2 seconds before next attempt...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return { corrected: originalContent, success: false }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITERATIVE CORRECTION LOOP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Iteratively correct content until all validations pass or max attempts reached.
 * 
 * @example
 * ```typescript
 * const result = await iterativelyCorrectContent(
 *   { h1: 'Best Coffee Makers', overviewParagraph: '...', ... },
 *   { topic: 'coffee makers', articleType: 'affiliate', variation: 'statement', provider: 'gemini' },
 *   { maxAttemptsPerComponent: 3, maxTotalAttempts: 10 }
 * )
 * 
 * if (result.success) {
 *   console.log('All validations passed!')
 *   console.log('Corrected content:', result.correctedContent)
 * } else {
 *   console.log('Some issues remain after max attempts')
 * }
 * ```
 */
export async function iterativelyCorrectContent(
  content: ArticleContent,
  context: CorrectionContext,
  config: Partial<CorrectionConfig> = {}
): Promise<CorrectionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  let currentContent = { ...content }
  const corrections: ComponentCorrection[] = []
  let totalAttempts = 0
  const componentAttempts: Record<string, number> = {}

  console.log(`[ContentCorrector] Starting iterative correction...`)
  console.log(`[ContentCorrector] Max attempts per component: ${cfg.maxAttemptsPerComponent}`)
  console.log(`[ContentCorrector] Max total attempts: ${cfg.maxTotalAttempts}`)

  // Initial validation
  let validation = validateGeneratedContent(currentContent)
  console.log(`[ContentCorrector] Initial validation: ${validation.score}/100, ${validation.errors.length} errors`)

  // Iteratively correct until all pass or max attempts reached
  while (
    (validation.errors.length > 0 || validation.warnings.length > 0) &&
    totalAttempts < cfg.maxTotalAttempts
  ) {
    // Get next issue to fix (prioritize errors over warnings)
    const nextIssue = validation.errors[0] || validation.warnings[0]
    if (!nextIssue) break

    const componentId = nextIssue.component

    // Check if we've exceeded attempts for this component
    componentAttempts[componentId] = (componentAttempts[componentId] || 0) + 1
    if (componentAttempts[componentId] > cfg.maxAttemptsPerComponent) {
      console.log(`[ContentCorrector] Max attempts reached for ${componentId}, skipping...`)
      // Remove this issue from the list to try others
      if (validation.errors[0]?.component === componentId) {
        validation.errors.shift()
      } else if (validation.warnings[0]?.component === componentId) {
        validation.warnings.shift()
      }
      continue
    }

    totalAttempts++

    // Get original content for this component
    const originalContent = getComponentContent(currentContent, componentId)
    if (!originalContent) {
      console.log(`[ContentCorrector] No content found for ${componentId}, skipping...`)
      continue
    }

    console.log(`[ContentCorrector] Attempt ${totalAttempts}: Correcting ${componentId} (attempt ${componentAttempts[componentId]})`)
    console.log(`[ContentCorrector]   Issue: ${nextIssue.message}`)

    // Attempt correction
    const { corrected, success } = await correctComponent(
      getComponentType(componentId),
      originalContent,
      nextIssue,
      context
    )

    if (success && corrected !== originalContent) {
      // Update content
      setComponentContent(currentContent, componentId, corrected)

      corrections.push({
        componentId,
        originalContent,
        correctedContent: corrected,
        issue: nextIssue,
        attempts: componentAttempts[componentId],
        success: true,
      })

      console.log(`[ContentCorrector]   ✓ Correction applied`)

      // Re-validate
      validation = validateGeneratedContent(currentContent)
      console.log(`[ContentCorrector]   New validation: ${validation.score}/100, ${validation.errors.length} errors, ${validation.warnings.length} warnings`)
    } else {
      console.log(`[ContentCorrector]   ✗ Correction failed or unchanged`)

      corrections.push({
        componentId,
        originalContent,
        correctedContent: corrected,
        issue: nextIssue,
        attempts: componentAttempts[componentId],
        success: false,
      })
    }
  }

  // Final validation
  const finalValidation = validateGeneratedContent(currentContent)
  const success = finalValidation.score === 100 && finalValidation.errors.length === 0 && finalValidation.warnings.length === 0

  console.log(`[ContentCorrector] ════════════════════════════════════════`)
  console.log(`[ContentCorrector] Correction complete`)
  console.log(`[ContentCorrector]   Total attempts: ${totalAttempts}`)
  console.log(`[ContentCorrector]   Final score: ${finalValidation.score}/100`)
  console.log(`[ContentCorrector]   Remaining errors: ${finalValidation.errors.length}`)
  console.log(`[ContentCorrector]   Remaining warnings: ${finalValidation.warnings.length}`)
  console.log(`[ContentCorrector]   Success: ${success}`)
  console.log(`[ContentCorrector] ════════════════════════════════════════`)

  return {
    success,
    totalAttempts,
    corrections,
    finalValidation,
    correctedContent: currentContent,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map component ID from validation to component type
 */
function getComponentType(componentId: string): string {
  if (componentId.startsWith('faqQuestion_')) return 'faqQuestion'
  if (componentId.startsWith('faqAnswer_')) return 'faqAnswer'
  if (componentId.startsWith('h2_')) return 'h2'
  if (componentId.startsWith('paragraph_')) return 'standardParagraph'
  if (componentId === 'featuredImageAlt') return 'featuredImageAlt'
  if (componentId.startsWith('h2ImageAlt_')) return 'h2ImageAlt'
  return componentId
}

/**
 * Get content from ArticleContent by component ID
 */
function getComponentContent(content: ArticleContent, componentId: string): string | null {
  // Direct properties
  if (componentId === 'h1') return content.h1 || null
  if (componentId === 'overviewParagraph') return content.overviewParagraph || null
  if (componentId === 'closingH2') return content.closingH2 || null
  if (componentId === 'closingParagraph') return content.closingParagraph || null
  if (componentId === 'faqH2') return content.faqH2 || null
  if (componentId === 'metaTitle') return content.metaTitle || null
  if (componentId === 'metaDescription') return content.metaDescription || null
  if (componentId === 'featuredImageAlt') return content.featuredImageAlt || null

  // Array properties (validator uses 1-indexed IDs like h2_1, h2_2, but arrays are 0-indexed)
  if (componentId.startsWith('h2_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    return content.h2s?.[index] || null
  }
  if (componentId.startsWith('paragraph_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    return content.standardParagraphs?.[index] || null
  }
  if (componentId.startsWith('faqQuestion_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    return content.faqQuestions?.[index] || null
  }
  if (componentId.startsWith('faqAnswer_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    return content.faqAnswers?.[index] || null
  }
  if (componentId.startsWith('h2ImageAlt_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    return content.h2ImageAlts?.[index] || null
  }

  return null
}

/**
 * Set content in ArticleContent by component ID
 */
function setComponentContent(content: ArticleContent, componentId: string, value: string): void {
  // Direct properties
  if (componentId === 'h1') { content.h1 = value; return }
  if (componentId === 'overviewParagraph') { content.overviewParagraph = value; return }
  if (componentId === 'closingH2') { content.closingH2 = value; return }
  if (componentId === 'closingParagraph') { content.closingParagraph = value; return }
  if (componentId === 'faqH2') { content.faqH2 = value; return }
  if (componentId === 'metaTitle') { content.metaTitle = value; return }
  if (componentId === 'metaDescription') { content.metaDescription = value; return }
  if (componentId === 'featuredImageAlt') { content.featuredImageAlt = value; return }

  // Array properties (validator uses 1-indexed IDs like h2_1, h2_2, but arrays are 0-indexed)
  if (componentId.startsWith('h2_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    if (content.h2s && index >= 0 && content.h2s[index] !== undefined) {
      content.h2s[index] = value
    }
    return
  }
  if (componentId.startsWith('paragraph_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    if (content.standardParagraphs && index >= 0 && content.standardParagraphs[index] !== undefined) {
      content.standardParagraphs[index] = value
    }
    return
  }
  if (componentId.startsWith('faqQuestion_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    if (content.faqQuestions && index >= 0 && content.faqQuestions[index] !== undefined) {
      content.faqQuestions[index] = value
    }
    return
  }
  if (componentId.startsWith('faqAnswer_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    if (content.faqAnswers && index >= 0 && content.faqAnswers[index] !== undefined) {
      content.faqAnswers[index] = value
    }
    return
  }
  if (componentId.startsWith('h2ImageAlt_')) {
    const index = parseInt(componentId.split('_')[1], 10) - 1  // Convert 1-indexed to 0-indexed
    if (content.h2ImageAlts && index >= 0 && content.h2ImageAlts[index] !== undefined) {
      content.h2ImageAlts[index] = value
    }
    return
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK CORRECTION (Errors Only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick correction that only fixes errors (ignores warnings).
 * Faster than full correction, suitable for most use cases.
 */
export async function quickCorrectContent(
  content: ArticleContent,
  context: CorrectionContext,
  maxAttempts: number = 5
): Promise<CorrectionResult> {
  let currentContent = { ...content }
  const corrections: ComponentCorrection[] = []
  let totalAttempts = 0

  let validation = validateGeneratedContent(currentContent)

  while (validation.errors.length > 0 && totalAttempts < maxAttempts) {
    const error = validation.errors[0]
    totalAttempts++

    const originalContent = getComponentContent(currentContent, error.component)
    if (!originalContent) {
      validation.errors.shift()
      continue
    }

    const { corrected, success } = await correctComponent(
      getComponentType(error.component),
      originalContent,
      error,
      context
    )

    if (success) {
      setComponentContent(currentContent, error.component, corrected)
      corrections.push({
        componentId: error.component,
        originalContent,
        correctedContent: corrected,
        issue: error,
        attempts: 1,
        success: true,
      })
    }

    validation = validateGeneratedContent(currentContent)
  }

  return {
    success: validation.errors.length === 0,
    totalAttempts,
    corrections,
    finalValidation: validation,
    correctedContent: currentContent,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE ALT TEXT VALIDATION & CORRECTION (For Trigger.dev before HTML assembly)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SingleAltTextValidationResult {
  isValid: boolean
  original: string
  corrected: string
  charCount: number
  targetRange: { min: number; max: number }
  issue?: string
}

/**
 * Validate and correct a single alt text description BEFORE inserting into HTML.
 * This ensures alt texts meet character requirements without truncation.
 * 
 * @param description - The image description/prompt to use as alt text
 * @param imageType - 'featured' or 'h2' to determine character limits
 * @param context - Context for AI correction if needed
 * @returns Validated (and possibly corrected) alt text
 */
export async function validateAndCorrectAltText(
  description: string,
  imageType: 'featured' | 'h2',
  context: { topic: string; articleType: string; provider: AIProvider; costTracking?: CostTrackingContext }
): Promise<SingleAltTextValidationResult> {
  // Determine character limits based on image type
  const limits = imageType === 'featured'
    ? CHARACTER_LIMITS.featuredImageAlt
    : CHARACTER_LIMITS.h2ImageAlt

  const charCount = description.length

  console.log(`[AltTextValidator] Validating ${imageType} alt text:`)
  console.log(`[AltTextValidator]   Original: "${description.substring(0, 60)}..."`)
  console.log(`[AltTextValidator]   Length: ${charCount} chars (target: ${limits.min}-${limits.max})`)

  // Check if already valid
  if (charCount >= limits.min && charCount <= limits.max) {
    console.log(`[AltTextValidator]   ✓ Already valid!`)
    return {
      isValid: true,
      original: description,
      corrected: description,
      charCount,
      targetRange: limits,
    }
  }

  // Determine the issue
  const issue = charCount < limits.min
    ? `too short (${charCount} chars, need ${limits.min}-${limits.max})`
    : `too long (${charCount} chars, need ${limits.min}-${limits.max})`

  console.log(`[AltTextValidator]   ✗ Invalid: ${issue}`)
  console.log(`[AltTextValidator]   Correcting with AI...`)

  // Build validation issue for the corrector
  const validationIssue: ValidationIssue = {
    component: imageType === 'featured' ? 'featuredImageAlt' : 'h2ImageAlt',
    rule: 'character_limit',
    message: `Alt text ${issue}`,
    severity: 'info',
    location: {
      field: imageType === 'featured' ? 'featuredImageAlt' : 'h2ImageAlt',
      value: description,
      expected: `${limits.min}-${limits.max} chars`,
    },
  }

  // Correction context
  const correctionContext: CorrectionContext = {
    topic: context.topic,
    articleType: context.articleType,
    variation: 'statement',
    provider: context.provider,
    costTracking: context.costTracking,
  }

  // Attempt correction
  const { corrected, success } = await correctComponent(
    imageType === 'featured' ? 'featuredImageAlt' : 'h2ImageAlt',
    description,
    validationIssue,
    correctionContext
  )

  if (success && corrected !== description) {
    const newCharCount = corrected.length
    const nowValid = newCharCount >= limits.min && newCharCount <= limits.max

    console.log(`[AltTextValidator]   Corrected: "${corrected.substring(0, 60)}..."`)
    console.log(`[AltTextValidator]   New length: ${newCharCount} chars`)
    console.log(`[AltTextValidator]   ${nowValid ? '✓ Now valid!' : '⚠ Still outside range'}`)

    return {
      isValid: nowValid,
      original: description,
      corrected,
      charCount: newCharCount,
      targetRange: limits,
      issue: nowValid ? undefined : `Corrected but still ${newCharCount < limits.min ? 'short' : 'long'}`,
    }
  }

  // Correction failed - use truncation as last resort for too-long texts
  if (charCount > limits.max) {
    const truncated = description.substring(0, limits.max - 3) + '...'
    console.log(`[AltTextValidator]   AI correction failed, using truncation`)
    console.log(`[AltTextValidator]   Truncated: "${truncated.substring(0, 60)}..."`)

    return {
      isValid: true, // Truncation ensures valid length
      original: description,
      corrected: truncated,
      charCount: truncated.length,
      targetRange: limits,
      issue: 'Truncated (AI correction failed)',
    }
  }

  // For too-short texts where AI failed, return original with warning
  console.log(`[AltTextValidator]   AI correction failed, using original (still too short)`)

  return {
    isValid: false,
    original: description,
    corrected: description,
    charCount,
    targetRange: limits,
    issue: 'AI correction failed',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALT TEXT CORRECTION (For Trigger.dev after real images are generated - LEGACY)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AltTextCorrectionContext {
  topic: string
  articleType: string
  provider: AIProvider
  costTracking?: CostTrackingContext
}

export interface AltTextCorrectionResult {
  html: string
  corrections: Array<{
    imageIndex: number
    original: string
    corrected: string
    imageType: 'featured' | 'h2'
  }>
  totalCorrections: number
}

/**
 * Correct alt texts in the final HTML after real images are generated.
 * This is called from Trigger.dev task after image generation is complete.
 * 
 * @param html - The final HTML with real images
 * @param context - Context for correction prompts
 * @returns Updated HTML with corrected alt texts
 */
export async function correctAltTextsInHtml(
  html: string,
  context: AltTextCorrectionContext
): Promise<AltTextCorrectionResult> {
  const corrections: AltTextCorrectionResult['corrections'] = []
  let updatedHtml = html

  console.log(`[AltTextCorrector] Starting alt text correction for ${context.articleType} article`)
  console.log(`[AltTextCorrector] Topic: "${context.topic}"`)
  console.log(`[AltTextCorrector] HTML length: ${html.length} chars`)

  // Debug: Show the first occurrence of scai-featured-image in HTML
  const featuredDebugMatch = html.match(/<figure[^>]*scai-featured-image[^>]*>[\s\S]{0,500}/i)
  if (featuredDebugMatch) {
    console.log(`[AltTextCorrector] Featured image HTML snippet:`)
    console.log(`[AltTextCorrector]   ${featuredDebugMatch[0].substring(0, 300)}...`)
  } else {
    console.log(`[AltTextCorrector] WARNING: No scai-featured-image found in HTML!`)
  }

  // Extract all image alt texts for validation - use more flexible regex
  // Match: <figure...scai-featured-image...>...<img...alt="..."...>
  const featuredImgMatch = html.match(/<figure[^>]*class="[^"]*scai-featured-image[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/i) ||
    html.match(/<figure[^>]*data-component="scai-featured-image"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/i)
  const featuredImageAlt = featuredImgMatch?.[1]

  // H2 section images - also use flexible regex
  const h2ImgMatches = [...html.matchAll(/<figure[^>]*class="[^"]*scai-h2-image[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi)]
  const h2ImageAlts = h2ImgMatches.map(m => m[1])

  console.log(`[AltTextCorrector] Extracted alt texts:`)
  console.log(`[AltTextCorrector]   Featured Image Alt: "${featuredImageAlt || 'NOT FOUND'}" (${featuredImageAlt?.length || 0} chars)`)
  console.log(`[AltTextCorrector]   H2 Image Alts: ${h2ImageAlts.length} found`)
  h2ImageAlts.forEach((alt, idx) => {
    console.log(`[AltTextCorrector]     H2 Image ${idx + 1}: "${alt}" (${alt.length} chars)`)
  })

  // Build validation content for alt texts only
  const validationContent: ArticleContent = {
    featuredImageAlt,
    h2ImageAlts,
    articleType: context.articleType,
  }

  console.log(`[AltTextCorrector] Running validation...`)
  const validation = validateGeneratedContent(validationContent)

  console.log(`[AltTextCorrector] Validation results:`)
  console.log(`[AltTextCorrector]   Score: ${validation.score}/100`)
  console.log(`[AltTextCorrector]   Errors: ${validation.errors.length}`)
  console.log(`[AltTextCorrector]   Warnings: ${validation.warnings.length}`)
  console.log(`[AltTextCorrector]   Info: ${validation.info.length}`)

  // Log all validation issues (including info level)
  const allIssues = [...validation.errors, ...validation.warnings, ...validation.info]
  allIssues.forEach(issue => {
    console.log(`[AltTextCorrector]   - [${issue.severity}] ${issue.component}: ${issue.message}`)
  })

  // Filter to only alt text related issues (including INFO level for character limits!)
  const altTextIssues = allIssues.filter(issue =>
    issue.component === 'featuredImageAlt' || issue.component.startsWith('h2ImageAlt_')
  )

  console.log(`[AltTextCorrector] Alt text specific issues: ${altTextIssues.length}`)

  if (altTextIssues.length === 0) {
    console.log('[AltTextCorrector] No alt text issues found, HTML unchanged')
    return { html, corrections: [], totalCorrections: 0 }
  }

  console.log(`[AltTextCorrector] Found ${altTextIssues.length} alt text issues to correct`)

  // Correction context
  const correctionContext: CorrectionContext = {
    topic: context.topic,
    articleType: context.articleType,
    variation: 'statement', // Default, not critical for alt text
    provider: context.provider,
    costTracking: context.costTracking,
  }

  // Correct each issue
  for (const issue of altTextIssues) {
    const originalAlt = getComponentContent(validationContent, issue.component)
    if (!originalAlt) continue

    const { corrected, success } = await correctComponent(
      getComponentType(issue.component),
      originalAlt,
      issue,
      correctionContext
    )

    if (success && corrected !== originalAlt) {
      // Replace in HTML (escape special regex chars in original)
      const escapedOriginal = originalAlt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const altPattern = new RegExp(`alt="${escapedOriginal}"`, 'g')
      updatedHtml = updatedHtml.replace(altPattern, `alt="${corrected}"`)

      const imageType = issue.component === 'featuredImageAlt' ? 'featured' : 'h2'
      const imageIndex = issue.component.startsWith('h2ImageAlt_')
        ? parseInt(issue.component.split('_')[1], 10)
        : 0

      corrections.push({
        imageIndex,
        original: originalAlt,
        corrected,
        imageType,
      })

      console.log(`[AltTextCorrector] Corrected ${issue.component}: "${originalAlt.substring(0, 40)}..." → "${corrected.substring(0, 40)}..."`)
    }
  }

  console.log(`[AltTextCorrector] Completed with ${corrections.length} corrections`)

  return {
    html: updatedHtml,
    corrections,
    totalCorrections: corrections.length,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// H2 KEYWORD DENSITY CORRECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface H2KeywordCorrectionResult {
  html: string
  correctedH2s: Array<{ index: number; original: string; corrected: string }>
  totalCorrections: number
}

/**
 * Correct H2 keyword density by adding keyword to H2s that don't have it.
 * Target: 60-70% of H2s should contain the primary keyword.
 * 
 * Only corrects H2s that are missing keyword when density is below 60%.
 * Skips structural/component H2s (FAQ, Features, Pros/Cons, Rating, etc.)
 */
export async function correctH2KeywordDensity(
  html: string,
  context: CorrectionContext
): Promise<H2KeywordCorrectionResult> {
  const corrections: Array<{ index: number; original: string; corrected: string }> = []

  // Use extracted coreKeywords if available, otherwise fall back to primaryKeyword/topic
  const hasCoreKeywords = context.coreKeywords && context.coreKeywords.length > 0
  const keywordsToUse = hasCoreKeywords ? context.coreKeywords! : [context.primaryKeyword || context.topic]

  if (keywordsToUse.length === 0 || !keywordsToUse[0]) {
    console.log(`[H2KeywordCorrector] No keywords provided, skipping`)
    return { html, correctedH2s: [], totalCorrections: 0 }
  }

  // Use smarter density thresholds: lower for extracted keywords (more natural)
  const targetMin = hasCoreKeywords ? 30 : 60  // 30% for extracted, 60% for full phrase
  const targetMax = hasCoreKeywords ? 60 : 70  // 60% for extracted, 70% for full phrase

  console.log(`[H2KeywordCorrector] Using ${hasCoreKeywords ? 'extracted' : 'full'} keywords: ${keywordsToUse.join(', ')}`)
  console.log(`[H2KeywordCorrector] Target density: ${targetMin}-${targetMax}%`)

  // Extract all H2s from HTML
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gi
  const h2Matches: Array<{ full: string; text: string; index: number }> = []
  let match
  let idx = 0

  while ((match = h2Pattern.exec(html)) !== null) {
    h2Matches.push({
      full: match[0],
      text: match[1].replace(/<[^>]*>/g, '').trim(), // Strip nested tags
      index: idx++
    })
  }

  if (h2Matches.length === 0) {
    console.log(`[H2KeywordCorrector] No H2s found`)
    return { html, correctedH2s: [], totalCorrections: 0 }
  }

  // Filter out structural/component H2s that shouldn't be corrected
  // These are H2s inside components (Features, Pros/Cons, Rating, etc.) that don't need keyword inclusion
  const structuralPatterns = [
    /frequently asked|faq/i,
    /features|key features|top features/i,
    // Pros/Cons patterns - now comprehensive to catch all AI-generated variations
    /pros|cons|advantages?|drawbacks?|benefits?|limitations?|strengths?|weaknesses?/i,
    /plus|versus|worth it|good|bad|positives?|negatives?/i,
    // Rating patterns
    /rating|score|verdict|final score|our verdict|our rating|overall/i,
    // Recipe components
    /ingredients?|instructions?|nutrition|step-by-step/i,
    // Other structural components
    /key takeaways?|quick facts?|honorable mentions?|why choose/i,
  ]

  const correctableH2s = h2Matches.filter(h2 =>
    !structuralPatterns.some(pattern => pattern.test(h2.text))
  )

  if (correctableH2s.length === 0) {
    console.log(`[H2KeywordCorrector] All H2s are structural, skipping`)
    return { html, correctedH2s: [], totalCorrections: 0 }
  }

  // Check current keyword density using the keywords array
  // H2 has keyword if ANY of the core keywords appear in it
  const h2sWithKeyword = correctableH2s.filter(h2 => {
    const lowerH2 = h2.text.toLowerCase()
    return keywordsToUse.some(kw => lowerH2.includes(kw.toLowerCase()))
  })

  const currentDensity = (h2sWithKeyword.length / correctableH2s.length) * 100

  console.log(`[H2KeywordCorrector] Current H2 keyword density: ${currentDensity.toFixed(0)}% (${h2sWithKeyword.length}/${correctableH2s.length})`)

  if (currentDensity >= targetMin && currentDensity <= targetMax) {
    console.log(`[H2KeywordCorrector] Density OK (${targetMin}-${targetMax}%), no corrections needed`)
    return { html, correctedH2s: [], totalCorrections: 0 }
  }

  let updatedHtml = html
  let correctionsMade = 0
  const primaryKeywordForCorrection = keywordsToUse[0]

  // If density is too HIGH — remove keywords from excess H2s
  if (currentDensity > targetMax) {
    const maxWithKeyword = Math.floor(correctableH2s.length * (targetMax / 100))
    const excessCount = h2sWithKeyword.length - maxWithKeyword

    console.log(`[H2KeywordCorrector] Density too high (${currentDensity.toFixed(0)}% > ${targetMax}%), need to remove keyword from ${excessCount} H2s`)

    // Remove keywords from last N H2s that have them (keep first ones for SEO)
    const h2sToFix = [...h2sWithKeyword].reverse().slice(0, excessCount)

    for (const h2 of h2sToFix) {
      if (correctionsMade >= excessCount) break

      const correctedH2 = await correctH2RemoveKeyword(h2.text, keywordsToUse, context)

      if (correctedH2 && correctedH2 !== h2.text) {
        updatedHtml = updatedHtml.replace(
          h2.full,
          h2.full.replace(h2.text, correctedH2)
        )

        corrections.push({
          index: h2.index,
          original: h2.text,
          corrected: correctedH2
        })

        correctionsMade++
        console.log(`[H2KeywordCorrector] Removed keyword from H2 #${h2.index + 1}: "${h2.text}" → "${correctedH2}"`)
      }
    }
  } else {
    // Density is too LOW — add keywords
    const targetCount = Math.ceil(correctableH2s.length * (targetMin / 100))
    const neededCorrections = targetCount - h2sWithKeyword.length

    console.log(`[H2KeywordCorrector] Need to add keyword to ${neededCorrections} H2s`)

    // Find H2s without any of the keywords
    const h2sWithoutKeyword = correctableH2s.filter(h2 => {
      const lowerH2 = h2.text.toLowerCase()
      return !keywordsToUse.some(kw => lowerH2.includes(kw.toLowerCase()))
    })

    for (const h2 of h2sWithoutKeyword) {
      if (correctionsMade >= neededCorrections) break

      const correctedH2 = await correctH2WithKeyword(h2.text, primaryKeywordForCorrection, keywordsToUse, context)

      if (correctedH2 && correctedH2 !== h2.text) {
        updatedHtml = updatedHtml.replace(
          h2.full,
          h2.full.replace(h2.text, correctedH2)
        )

        corrections.push({
          index: h2.index,
          original: h2.text,
          corrected: correctedH2
        })

        correctionsMade++
        console.log(`[H2KeywordCorrector] Corrected H2 #${h2.index + 1}: "${h2.text}" → "${correctedH2}"`)
      }
    }
  }

  console.log(`[H2KeywordCorrector] Completed with ${corrections.length} corrections`)

  return {
    html: updatedHtml,
    correctedH2s: corrections,
    totalCorrections: corrections.length,
  }
}

/**
 * Use AI to naturally incorporate keyword into an H2 heading
 * 
 * @param originalH2 - The original H2 heading text
 * @param primaryKeyword - The main keyword to add (first from coreKeywords)
 * @param allKeywords - All extracted keywords (used for validation)
 * @param context - The correction context
 */
async function correctH2WithKeyword(
  originalH2: string,
  primaryKeyword: string,
  allKeywords: string[],
  context: CorrectionContext
): Promise<string> {
  const { variation, provider } = context
  const hasCoreKeywords = context.coreKeywords && context.coreKeywords.length > 0

  const formatInstructions = variation === 'question'
    ? '- Must be a QUESTION ending with ?'
    : variation === 'listicle'
      ? '- Must be a NUMBERED heading (e.g., "3. Topic Here")'
      : '- Must be a STATEMENT (no question marks)'

  // Use smarter prompt that encourages natural integration
  const keywordInstruction = hasCoreKeywords
    ? `- Include ONE of these keywords naturally: ${allKeywords.join(', ')}
- Semantic variations are OK (e.g., "hilarious" for "funny")
- Do NOT force the keyword - if it doesn't fit naturally, skip it`
    : `- MUST include "${primaryKeyword}" naturally (not forced)`

  const prompt = `Rewrite this H2 heading to naturally include a keyword while maintaining the same meaning and topic.

ORIGINAL H2: "${originalH2}"
KEYWORD${hasCoreKeywords ? 'S' : ''} TO USE: ${hasCoreKeywords ? allKeywords.join(', ') : `"${primaryKeyword}"`}

REQUIREMENTS:
${formatInstructions}
- Maximum 60 characters
${keywordInstruction}
- Keep the same general topic/meaning
- NO "and", "or", or colons
- If the original H2 is numbered, keep the same number

Return ONLY the corrected H2 text, nothing else.`

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateText({
          model,
          prompt,
          temperature: 0.3,
          maxOutputTokens: 100,
          maxRetries: 1,
        })
      },
      { preferredProvider: provider, tier: 'fast', operationName: 'correctH2WithKeyword', costTracking: context.costTracking }
    )

    let corrected = result.text.trim()

    // Strip quotes if AI wrapped the response
    if ((corrected.startsWith('"') && corrected.endsWith('"')) ||
      (corrected.startsWith("'") && corrected.endsWith("'"))) {
      corrected = corrected.slice(1, -1).trim()
    }

    // Validate the correction contains at least one keyword
    const lowerCorrected = corrected.toLowerCase()
    const containsAnyKeyword = allKeywords.some(kw => lowerCorrected.includes(kw.toLowerCase()))

    if (!containsAnyKeyword) {
      console.log(`[H2KeywordCorrector] Correction doesn't contain any keyword, skipping`)
      return originalH2
    }

    // Validate length
    if (corrected.length > 60) {
      console.log(`[H2KeywordCorrector] Corrected H2 too long (${corrected.length} chars), skipping`)
      return originalH2
    }

    return corrected
  } catch (error) {
    console.error(`[H2KeywordCorrector] Error correcting H2:`, error)
    return originalH2
  }
}

/**
 * Use AI to rewrite an H2 heading WITHOUT a keyword while keeping the same topic
 */
async function correctH2RemoveKeyword(
  originalH2: string,
  keywordsToRemove: string[],
  context: CorrectionContext
): Promise<string> {
  const { variation, provider } = context

  // Detect if the original H2 starts with a number (e.g., "3. Topic")
  const startsWithNumber = /^\d+\.\s/.test(originalH2)

  const formatInstructions = variation === 'question'
    ? '- Must be a QUESTION ending with ?'
    : variation === 'listicle'
      ? '- Must be a NUMBERED heading (e.g., "3. Topic Here")'
      : '- Must be a STATEMENT (no question marks)'

  const numberingRule = startsWithNumber
    ? '- Keep the same number prefix from the original H2'
    : '- Do NOT add any numbering (no "1.", "2.", etc.) — the heading must NOT start with a number'

  const prompt = `Rewrite this H2 heading to cover the SAME topic but WITHOUT using any of these keywords: ${keywordsToRemove.join(', ')}

ORIGINAL H2: "${originalH2}"

REQUIREMENTS:
${formatInstructions}
- Maximum 60 characters
- Minimum 50 characters
- Must NOT contain: ${keywordsToRemove.join(', ')}
- Use synonyms or rephrase to avoid the keywords entirely
- Keep the same general topic/meaning
- NO "and", "or", or colons
- Do NOT use these buzzwords: "unique", "unlock", "elevate", "discover", "explore", "navigate"
${numberingRule}
- Use proper capitalization (title case)

Return ONLY the rewritten H2 text, nothing else.`

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateText({
          model,
          prompt,
          temperature: 0.3,
          maxOutputTokens: 100,
          maxRetries: 1,
        })
      },
      { preferredProvider: provider, tier: 'fast', operationName: 'correctH2RemoveKeyword', costTracking: context.costTracking }
    )

    let corrected = result.text.trim()

    // Strip quotes
    if ((corrected.startsWith('"') && corrected.endsWith('"')) ||
      (corrected.startsWith("'") && corrected.endsWith("'"))) {
      corrected = corrected.slice(1, -1).trim()
    }

    // Validate the correction does NOT contain any keyword
    const lowerCorrected = corrected.toLowerCase()
    const stillContainsKeyword = keywordsToRemove.some(kw => lowerCorrected.includes(kw.toLowerCase()))

    if (stillContainsKeyword) {
      console.log(`[H2KeywordCorrector] Rewrite still contains keyword, skipping`)
      return originalH2
    }

    if (corrected.length > 60) {
      console.log(`[H2KeywordCorrector] Rewritten H2 too long (${corrected.length} chars), skipping`)
      return originalH2
    }

    return corrected
  } catch (error) {
    console.error(`[H2KeywordCorrector] Error removing keyword from H2:`, error)
    return originalH2
  }
}
