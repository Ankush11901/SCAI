/**
 * Content Generators
 * Phase 2: Parallel content generation for individual article components
 * Each generator is focused with minimal rules for better LLM compliance
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCAI HTML NAMING CONVENTION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * All generators MUST follow the three-layer naming system:
 * 
 * 1. CSS Classes: scai-{component-name}
 *    - Example: scai-product-card, scai-h2, scai-cta-box
 *    - Nested: scai-product-card-image, scai-product-card-name
 * 
 * 2. Data Attributes: data-component="scai-{semantic-name}"
 *    - Example: data-component="scai-product-card"
 *    - Identifies component type for programmatic access
 * 
 * 3. Unique IDs: scai-{version}-{component}-{number} (optional but recommended)
 *    - Question: scai-q-product-card-1
 *    - Statement: scai-s-product-card-1
 *    - Listicle: scai-l-product-card-1
 * 
 * WHY: This enables programmatic customization and automation at scale.
 * Users can target components for styling, layout changes, and bulk modifications.
 * 
 * Reference: documentation/scai-naming-convention-documentation.md
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * H2 OWNERSHIP DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * COMPONENTS THAT CREATE H2s (include <h2> in returned HTML):
 *   ✓ generateProductCard() - Affiliate product cards with H2 (60 chars)
 *   ✓ generateIngredientsList() - Recipe ingredients with H2 (60 chars)
 *   ✓ generateInstructions() - Recipe/How-To instructions with H2 (60 chars)
 *   ✓ generateNutritionTable() - Recipe nutrition with H2 (60 chars)
 *   ✓ generateHonorableMentions() - Listicle honorable mentions with H2 (40-50 chars)
 *   ✓ generateWhyChooseLocal() - Local service benefits with H2 (40-50 chars)
 *   ✓ generateQuickFacts() - Informational facts with H2 (40-50 chars)
 *   ✓ generateRatingParagraph() - Review rating with H2 (30 chars max)
 * 
 * COMPONENTS WITHOUT H2 (embedded in existing sections):
 *   • generateKeyTakeaways() - Box component only
 *   • generateProsCons() - Two lists only
 *   • generateComparisonTable() - Table only
 *   • generateFeatureList() - Bullet list only
 *   • generateCTABox() - Call-to-action box only
 *   • generateTopicOverview() - Paragraphs only
 *   • generateQuickVerdict() - Verdict box only
 *   • generateMaterialsBox() - Materials list only
 *   • generateProTips() - Tips list only
 *   • generateServiceInfo() - Service info table only
 *   • generateTipsParagraph() - Tips text only
 * 
 * RULE: Components that create H2s must use generateH2ForVariation() or 
 *       generateSpecialH2WithAI() to ensure H2 format matches H1 variation 
 *       (question/statement/listicle) AND character limits per documentation.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ContentGeneratorConfig,
  GeneratedContent,
  FAQContent,
  FAQItem,
  ArticleContext,
  TitleVariation
} from '@/lib/types/generation'
import { createEnhancedPlaceholder, type ImagePlaceholderMeta } from './generator-orchestrator'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: TRUNCATE PRODUCT NAME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truncate a product name at the first delimiter (comma, pipe, hyphen surrounded by spaces, etc.)
 * to create a cleaner, shorter display name for product cards.
 * @param fullName - The full product name from Amazon
 * @param maxLength - Maximum length before forcing truncation (default 60)
 * @returns Truncated product name
 */
function truncateProductName(fullName: string, maxLength: number = 60): string {
  // Common delimiters that indicate secondary info in Amazon product names
  const delimiters = [' - ', ' | ', ', ', ' – ', ' — ', ' / ']

  let truncated = fullName

  // Find the first delimiter and cut there
  for (const delimiter of delimiters) {
    const index = fullName.indexOf(delimiter)
    if (index > 0 && index < truncated.length) {
      truncated = fullName.substring(0, index)
    }
  }

  // If still too long, truncate at maxLength with ellipsis
  if (truncated.length > maxLength) {
    truncated = truncated.substring(0, maxLength - 3).trim() + '...'
  }

  return truncated.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST QUEUE & RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple request queue to prevent rate limiting
 * Ensures minimum delay between API calls
 */
class RequestQueue {
  private lastRequestTime: number = 0
  private readonly minDelayMs: number = 200 // Minimum 200ms between requests
  private requestCount: number = 0
  private windowStart: number = Date.now()
  private readonly maxRequestsPerMinute: number = 15 // Conservative limit

  async waitForSlot(): Promise<void> {
    const now = Date.now()

    // Reset window every minute
    if (now - this.windowStart > 60000) {
      this.requestCount = 0
      this.windowStart = now
    }

    // If we've hit the per-minute limit, wait until window resets
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.windowStart) + 1000
      console.log(`[RequestQueue] Rate limit reached, waiting ${Math.round(waitTime / 1000)}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.windowStart = Date.now()
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minDelayMs) {
      await new Promise(resolve => setTimeout(resolve, this.minDelayMs - timeSinceLastRequest))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }
}

const requestQueue = new RequestQueue()

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate H2 heading that matches H1 variation format
 * 
 * CRITICAL: This ensures unique component H2s comply with Header Consistency Rule
 * 
 * @param variation - H1 format type (question/statement/listicle)
 * @param baseTitle - Generic title (e.g., "Product 1", "Ingredients")
 * @param templates - Variation-specific templates
 * @returns Properly formatted H2 matching H1 style
 */
export function generateH2ForVariation(
  variation: TitleVariation,
  baseTitle: string,
  templates?: {
    question?: string
    statement?: string
    listicle?: string
  }
): string {
  // Use custom templates if provided
  if (templates) {
    if (variation === 'question' && templates.question) return templates.question
    if (variation === 'statement' && templates.statement) return templates.statement
    if (variation === 'listicle' && templates.listicle) return templates.listicle
  }

  // Default formatting rules if no template provided
  switch (variation) {
    case 'question':
      // Questions must start with interrogative word
      return baseTitle.startsWith('What') || baseTitle.startsWith('How') ||
        baseTitle.startsWith('Which') || baseTitle.startsWith('Why') ||
        baseTitle.startsWith('When') || baseTitle.startsWith('Where')
        ? baseTitle
        : `What About ${baseTitle}?`

    case 'listicle':
      // Listicles must start with number
      return baseTitle.match(/^\d+\./)
        ? baseTitle
        : `${baseTitle}`

    case 'statement':
      // Statements are declarative (no changes needed)
      return baseTitle

    default:
      return baseTitle
  }
}

/**
 * Generate a proper H2 heading with specific character limits using AI
 * Per documentation: Different components have different H2 character limits:
 * - Standard H2: 60 chars
 * - Rating H2: 30 chars
 * - Quick Facts/Honorable Mentions/Why Choose Local H2: 40-50 chars
 * 
 * @param componentType - Type of component (rating, quick-facts, honorable-mentions, why-choose-local)
 * @param variation - H1 variation type to match
 * @param topic - Article topic
 * @returns AI-generated H2 that follows all rules
 */
async function generateSpecialH2WithAI(
  componentType: 'rating' | 'quick-facts' | 'honorable-mentions' | 'why-choose-local',
  variation: TitleVariation,
  topic: string
): Promise<string> {
  // Character limits per documentation
  const charLimits: Record<string, { min: number; max: number }> = {
    'rating': { min: 15, max: 30 },
    'quick-facts': { min: 30, max: 50 },
    'honorable-mentions': { min: 30, max: 50 },
    'why-choose-local': { min: 30, max: 50 }
  }

  const limit = charLimits[componentType] || { min: 40, max: 60 }

  // Variation-specific templates per documentation
  const templates: Record<string, Record<TitleVariation, string>> = {
    'rating': {
      question: 'What Is the Rating?',
      statement: 'Overall Rating',
      listicle: 'Rating Score'
    },
    'quick-facts': {
      question: `Did You Know These ${topic} Facts?`,
      statement: `Fascinating ${topic} Facts`,
      listicle: `Quick ${topic} Facts`
    },
    'honorable-mentions': {
      question: `What Other ${topic} Options Exist?`,
      statement: `Other Notable ${topic} Options`,
      listicle: `More ${topic} Worth Considering`
    },
    'why-choose-local': {
      question: `Why Choose a Local ${topic} Provider?`,
      statement: `Benefits of Local ${topic} Services`,
      listicle: `Why Choose Local ${topic}`
    }
  }

  const variationRules: Record<TitleVariation, string> = {
    question: 'H2 MUST be a question ending with "?"',
    statement: 'H2 MUST be a declarative statement, NO question marks',
    listicle: 'H2 should be action-oriented or list-style'
  }

  // Get template as starting point
  const templateH2 = templates[componentType]?.[variation] || `${topic} ${componentType}`

  // If template already fits, use it
  if (templateH2.length >= limit.min && templateH2.length <= limit.max) {
    return templateH2
  }

  // Otherwise use AI to generate
  const prompt = `Generate a single H2 heading for a ${componentType.replace('-', ' ')} section.

TOPIC: "${topic}"
COMPONENT: ${componentType}

CRITICAL RULES:
1. EXACTLY ${limit.min}-${limit.max} characters (MANDATORY - count carefully!)
2. ${variationRules[variation]}
3. Be specific to the topic
4. Natural, engaging language

EXAMPLES for this component type:
- ${templates[componentType]?.question || 'Question example'}
- ${templates[componentType]?.statement || 'Statement example'}

Return ONLY the H2 text, nothing else. No quotes, no explanation.`

  try {
    await requestQueue.waitForSlot()
    const response = await callGemini(prompt, 128, 2)
    const h2 = response.trim().replace(/^["']|["']$/g, '').replace(/^#+\s*/, '')

    // Validate character count
    if (h2.length >= limit.min && h2.length <= limit.max) {
      // Validate variation compliance
      if (variation === 'question' && !h2.endsWith('?')) {
        return templateH2.length <= limit.max ? templateH2 : templateH2.substring(0, limit.max)
      }
      return h2
    }

    console.warn(`[H2] AI returned ${h2.length} chars for ${componentType}, using template`)
  } catch (error) {
    console.error(`[H2] Failed to generate ${componentType} H2 with AI:`, error)
  }

  // Fallback to template (truncated if needed)
  return templateH2.length <= limit.max ? templateH2 : templateH2.substring(0, limit.max)
}

/**
 * Generate a proper H2 heading for an affiliate product using AI
 * Per documentation: H2 max 60 chars, must follow H1 variation type
 * 
 * @param productTitle - Full Amazon product title
 * @param badge - Product badge (Best Overall, Best Value, etc.)
 * @param variation - H1 variation type to match
 * @param topic - User's search topic
 * @param index - Product index (1, 2, 3...)
 * @returns AI-generated H2 that follows all rules
 */
async function generateProductH2WithAI(
  productTitle: string,
  badge: string,
  variation: TitleVariation,
  topic: string,
  index: number
): Promise<string> {
  const variationRules = {
    question: 'H2 MUST be a question ending with "?" (e.g., "Is This Cat Tower Worth Buying?")',
    statement: 'H2 MUST be a statement, NO question marks (e.g., "Top-Rated Cat Tower for Indoor Cats")',
    listicle: `H2 MUST start with "${index}." (e.g., "${index}. Best Cat Tower for Small Spaces")`
  }

  const prompt = `Generate a single H2 heading for an affiliate product review.

PRODUCT: "${productTitle}"
BADGE: "${badge}"
TOPIC: "${topic}"

CRITICAL RULES:
1. EXACTLY 60 characters or LESS (mandatory - count carefully!)
2. ${variationRules[variation]}
3. Reference the product's key feature or brand name naturally
4. Include the badge context when appropriate
5. Be specific and descriptive - NO generic text like "Top products of 2026"

Return ONLY the H2 text, nothing else. No quotes, no explanation.`

  try {
    await requestQueue.waitForSlot()
    const response = await callGemini(prompt, 256, 2)
    const h2 = response.trim().replace(/^["']|["']$/g, '').replace(/^#+\s*/, '')

    // Validate and enforce rules
    if (h2.length > 0 && h2.length <= 60) {
      // Validate variation compliance
      if (variation === 'question' && !h2.endsWith('?')) {
        return `Is ${productTitle.substring(0, 40)} Worth It?`.substring(0, 60)
      }
      if (variation === 'listicle' && !h2.match(/^\d+\./)) {
        return `${index}. ${h2}`.substring(0, 60)
      }
      return h2
    }

    // If over 60 chars, let AI try again with stricter prompt
    if (h2.length > 60) {
      console.warn(`[H2] AI returned ${h2.length} chars, truncating: "${h2}"`)
    }
  } catch (error) {
    console.error('[H2] Failed to generate with AI:', error)
  }

  // Fallback: Generate simple H2 if AI fails
  const shortName = productTitle.substring(0, 35)
  switch (variation) {
    case 'question':
      return `Is ${shortName} Worth Buying?`.substring(0, 60)
    case 'listicle':
      return `${index}. ${shortName}`.substring(0, 60)
    default:
      return `${shortName} - ${badge}`.substring(0, 60)
  }
}

async function callGemini(prompt: string, maxTokens: number = 1024, maxRetries: number = 3): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wait for a slot in the request queue
      await requestQueue.waitForSlot()

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
      })

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000
        console.warn(`[Gemini] Rate limited (429), retry ${attempt + 1}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    } catch (error) {
      lastError = error as Error

      // Only retry on rate limit errors or network errors
      const isRetryable = (error as Error).message?.includes('429') ||
        (error as Error).message?.includes('fetch') ||
        (error as Error).message?.includes('network')

      if (isRetryable && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt + 1) * 1000
        console.warn(`[Gemini] Error, retry ${attempt + 1}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      throw error
    }
  }

  throw lastError || new Error('Failed to call Gemini API after retries')
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length
}

function extractHtml(response: string): string {
  // Try to extract HTML from code blocks
  const htmlMatch = response.match(/```html\n?([\s\S]*?)\n?```/)
  if (htmlMatch) {
    return fixRawImageUrls(htmlMatch[1].trim())
  }
  // Try to find raw HTML
  const tagMatch = response.match(/<[a-z][^>]*>[\s\S]*<\/[a-z]+>/i)
  if (tagMatch) {
    return fixRawImageUrls(tagMatch[0].trim())
  }
  // Return as-is if no HTML found
  return fixRawImageUrls(response.trim())
}

/**
 * Fix raw image URLs that the LLM might output as plain text instead of <img> tags
 * This handles cases where the AI writes the URL as text or forgets the img wrapper
 */
function fixRawImageUrls(html: string): string {
  // Pattern 1: Raw placehold.co URLs not inside an img src attribute
  // E.g., "https://placehold.co/800x400/..." as plain text
  const rawUrlPattern = /(?<!src=["'])(?<!src=["'][^"']*)(https:\/\/(?:placehold\.co|via\.placeholder\.com)\/[^\s"'<>]+)/g

  // Replace raw URLs with proper img tags (but only if not already in an img tag)
  let fixed = html.replace(rawUrlPattern, (match, url) => {
    // Check if this URL is already part of an img tag by looking at surrounding context
    // We'll be conservative - if it looks like it's inside a tag attribute, skip it
    return `<img src="${url}" alt="Generated image" class="scai-h2-image" style="width:100%;border-radius:12px;margin:1rem 0;" />`
  })

  // Pattern 2: Fix broken img tags where src might be written incorrectly
  // E.g., <img>https://placehold.co/...</img> instead of <img src="...">
  fixed = fixed.replace(/<img>\s*(https:\/\/[^<]+)\s*<\/img>/gi,
    '<img src="$1" alt="Generated image" class="scai-h2-image" style="width:100%;border-radius:12px;margin:1rem 0;" />')

  // Pattern 3: Empty img tags followed by URL
  fixed = fixed.replace(/<img\s*\/?>[\s\n]*(https:\/\/(?:placehold\.co|via\.placeholder\.com)[^\s<]+)/gi,
    '<img src="$1" alt="Generated image" class="scai-h2-image" style="width:100%;border-radius:12px;margin:1rem 0;" />')

  return stripColors(fixed)
}

/**
 * Strip any inline colors from HTML to enforce strict monochrome styling
 * Also removes base64 encoded images that the LLM might generate
 */
function stripColors(html: string): string {
  let cleaned = html

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Remove base64 encoded images
  // ═══════════════════════════════════════════════════════════════════════════

  // Pattern 1: Replace base64 img src with placeholder
  cleaned = cleaned.replace(
    /<img\s+[^>]*src\s*=\s*["']data:image\/[^;]+;base64,[^"']+["'][^>]*>/gi,
    '<img src="https://placehold.co/800x400/e5e7eb/6b7280?text=Image" alt="Image placeholder" class="scai-h2-image" style="width:100%;border-radius:12px;margin:1rem 0;" />'
  )

  // Pattern 2: Remove standalone base64 data URIs written as text
  cleaned = cleaned.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/gi, 'https://placehold.co/800x400/e5e7eb/6b7280?text=Image')

  // ═══════════════════════════════════════════════════════════════════════════
  // Remove inline color styles
  // ═══════════════════════════════════════════════════════════════════════════

  // Remove inline style color properties
  cleaned = cleaned.replace(/\s*color\s*:\s*(?!#000|#333|#444|#666|#1a1a1a|black|inherit)[^;"}]+;?/gi, '')

  // Remove inline background-color properties (except white, gray variants)
  cleaned = cleaned.replace(/\s*background-color\s*:\s*(?!#fff|#fafafa|#f5f5f5|#f0f0f0|#f9f9f9|#e5e5e5|white|transparent|inherit)[^;"}]+;?/gi, '')
  cleaned = cleaned.replace(/\s*background\s*:\s*(?!#fff|#fafafa|#f5f5f5|#f0f0f0|#f9f9f9|#e5e5e5|white|transparent|inherit|none)[^;"}]+;?/gi, '')

  // Remove border-color properties that aren't grayscale
  cleaned = cleaned.replace(/\s*border-color\s*:\s*(?!#000|#333|#ccc|#ddd|#e5e5e5|black|gray)[^;"}]+;?/gi, '')

  // Remove fill/stroke colors for SVGs that aren't black/gray
  cleaned = cleaned.replace(/\s*fill\s*:\s*(?!#000|#333|#666|black|none|currentColor)[^;"}]+;?/gi, '')
  cleaned = cleaned.replace(/\s*stroke\s*:\s*(?!#000|#333|#666|black|none|currentColor)[^;"}]+;?/gi, '')

  // Remove empty style attributes that might be left over
  cleaned = cleaned.replace(/\s*style\s*=\s*["']\s*["']/gi, '')

  return cleaned
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PARAGRAPH GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateOverview(
  topic: string,
  h1Title: string,
  wordTarget: number = 100
): Promise<GeneratedContent> {
  const prompt = `You are an expert SEO content writer. Write the opening overview section for an article about "${topic}".

⚠️⚠️⚠️ WORD COUNT TARGET: EXACTLY ${wordTarget} WORDS (±15 words) ⚠️⚠️⚠️

Write EXACTLY ${wordTarget} words total (between ${wordTarget - 15} and ${wordTarget + 15} words).
- Paragraph 1: 50 words
- Paragraph 2: 50 words

DO NOT write more than ${wordTarget + 15} words - your response will be REJECTED if too long.

CONTENT RULES:
- Mention "${topic}" 2-3 times naturally
- Hook the reader immediately
- Each paragraph must be concise but informative
- NO questions, NO bullet points

RETURN ONLY THIS HTML FORMAT:

<p class="scai-paragraph">[Write first paragraph - ~50 words]</p>
<p class="scai-paragraph">[Write second paragraph - ~50 words]</p>

Write your ${wordTarget}-word overview NOW:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'overview-paragraph',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD SECTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateSection(
  topic: string,
  h2Title: string,
  sectionIndex: number,
  wordTarget: number = 150,
  imagePlaceholder: string
): Promise<GeneratedContent> {
  const prompt = `You are an expert SEO content writer. Write content for a section about "${h2Title}" in an article about "${topic}".

⚠️⚠️⚠️ WORD COUNT TARGET: EXACTLY ${wordTarget} WORDS (±20 words) ⚠️⚠️⚠️

Write EXACTLY ${wordTarget} words of paragraph content (between ${wordTarget - 20} and ${wordTarget + 20} words).
- Paragraph 1: ~50 words
- Paragraph 2: ~50 words
- Paragraph 3: ~50 words

DO NOT write more than ${wordTarget + 20} words - responses that are too long will be REJECTED.

CONTENT RULES:
- Be concise but informative
- Mention "${topic}" at least once
- NO questions, NO bullet points, NO sub-headings
- Keep each paragraph focused on ONE main idea

RETURN ONLY THIS HTML FORMAT:

<section id="section-${sectionIndex}" data-component="scai-section">
  <h2 class="scai-h2">${h2Title}</h2>
  <figure data-component="scai-h2-image" class="scai-h2-image">
    <img src="${imagePlaceholder}" alt="${h2Title}" loading="lazy">
    <figcaption>${h2Title}</figcaption>
  </figure>
  <p class="scai-paragraph">[~50 words about ${h2Title}]</p>
  <p class="scai-paragraph">[~50 words continuing the topic]</p>
  <p class="scai-paragraph">[~50 words concluding this section]</p>
</section>

Write your ${wordTarget}-word section NOW:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'section',
    html,
    wordCount: countWords(html),
    index: sectionIndex
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateFAQ(
  topic: string,
  questions: string[],
  answerWordTarget: number = 25,
  context?: ArticleContext
): Promise<FAQContent> {
  // Determine if we should use template mode
  const useTemplateMode = true /* always use template mode */

  const questionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')

  const prompt = `You are an expert SEO content writer. Write FAQ answers for an article about "${topic}".

FAQ QUESTIONS:
${questionsText}

REQUIREMENTS:
- Write exactly ${answerWordTarget} words for EACH answer
- Each answer is a single paragraph
- Answers are informative and helpful
- NO bullet points in answers
- Each answer ends with a period
- Include the keyword "${topic}" in at least 2 answers

OUTPUT FORMAT:
Return a JSON array of answers only. No explanation.

["Answer 1 here (${answerWordTarget} words).", "Answer 2 here (${answerWordTarget} words).", ...]

Write the answers now:`

  const response = await callGemini(prompt, 2048)

  // Parse answers
  let answers: string[] = []
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      answers = JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fallback: try to extract answers line by line
    answers = questions.map(() => `This answer provides helpful information about ${topic}. We recommend researching further for the most current details.`)
  }

  // Build FAQ items
  const items: FAQItem[] = questions.map((question, i) => ({
    question,
    answer: answers[i] || `Learn more about ${topic} by exploring this topic in depth.`
  }))

  // Use template mode with variations if enabled
  let variationCss: string | undefined
  let faqHtml: string

  if (useTemplateMode) {
    const { pickVariation } = await import('@/lib/utils/variation-picker')
    const variation = pickVariation('faq', context?.variationName)

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-faq-section-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-faq-section-a'
      variationCss = variation.css

      // Build FAQ HTML using variation structure
      faqHtml = `
<div class="${wrapperClass}" data-component="scai-faq-section">
<h2 class="scai-faq-h2" data-component="scai-faq-h2">Frequently Asked Questions About ${topic}</h2>
${items.map(item => `
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">${item.question}</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">${item.answer}</p>
</div>`).join('')}
</div>`.trim()
    } else {
      // Fallback to default structure
      faqHtml = `
<section id="faq" data-component="scai-faq" class="scai-faq">
  <h2 class="scai-faq-title">Frequently Asked Questions About ${topic}</h2>
  ${items.map(item => `
  <div class="scai-faq-item">
    <h3 class="scai-faq-question">${item.question}</h3>
    <p class="scai-faq-answer">${item.answer}</p>
  </div>`).join('')}
</section>`.trim()
    }
  } else {
    // LLM mode - use default structure
    faqHtml = `
<section id="faq" data-component="scai-faq" class="scai-faq">
  <h2 class="scai-faq-title">Frequently Asked Questions About ${topic}</h2>
  ${items.map(item => `
  <div class="scai-faq-item">
    <h3 class="scai-faq-question">${item.question}</h3>
    <p class="scai-faq-answer">${item.answer}</p>
  </div>`).join('')}
</section>`.trim()
  }

  return {
    h2Html: `<h2 class="scai-faq-h2">Frequently Asked Questions About ${topic}</h2>`,
    items,
    html: faqHtml,
    variationCss
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// META TAG GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetaTags {
  title: string       // 50-60 chars
  description: string // 150-160 chars
}

export async function generateMetaTags(
  topic: string,
  h1: string,
  articleType: string
): Promise<MetaTags> {
  const prompt = `You are an SEO expert. Create optimized meta tags for an article.

ARTICLE INFO:
- Topic: "${topic}"
- H1 Title: "${h1}"
- Article Type: ${articleType}

REQUIREMENTS:
1. Meta Title:
   - EXACTLY 50-60 characters (this is CRITICAL for Google search results)
   - Include main keyword "${topic}"
   - Compelling and click-worthy
   - NO quotes, NO colons, NO special chars
   
2. Meta Description:
   - EXACTLY 150-160 characters (this is CRITICAL for Google snippets)
   - Summarize article value
   - Include "${topic}" naturally
   - Call to action if possible
   - NO quotes, NO special chars

OUTPUT FORMAT:
Return ONLY valid JSON with no markdown, no explanation, no code blocks:
{"title":"Your 50-60 char title here","description":"Your 150-160 char description here"}

Generate NOW:`

  const response = await callGemini(prompt, 512)

  try {
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title?.substring(0, 60) || h1.substring(0, 60),
        description: parsed.description?.substring(0, 160) || `Learn everything about ${topic}. Expert insights, tips, and comprehensive information to help you make informed decisions.`
      }
    }
  } catch (error) {
    console.warn('Failed to parse meta tags, using fallbacks', error)
  }

  // Fallback: generate from H1
  return {
    title: h1.length <= 60 ? h1 : h1.substring(0, 57) + '...',
    description: `Discover comprehensive information about ${topic}. This guide covers everything you need to know with expert insights and practical advice.`
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING SECTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateClosing(
  topic: string,
  closingH2: string,
  wordTarget: number = 50,
  articleType?: string,
  h2Titles?: string[],
  h1?: string
): Promise<GeneratedContent> {
  // Build article context section for the prompt
  const h2List = h2Titles?.length
    ? `\nTOPICS COVERED IN THIS ARTICLE:\n${h2Titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : ''

  const h1Line = h1 ? `\nARTICLE TITLE: "${h1}"\n` : ''

  // Type-specific tone instructions
  const toneInstructions: Record<string, string> = {
    review: 'Give a clear verdict. Reference the product strengths from the sections above. State who this product is best for.',
    affiliate: 'Reinforce buying confidence. Reference 1-2 standout products from the sections above. Help the reader feel ready to choose.',
    'how-to': 'Encourage the reader to take the first step. Reference a specific technique or step from the sections above.',
    informational: 'Reinforce the most valuable insight from the sections above. Give the reader a clear next action.',
    listicle: 'Highlight the variety of options covered in the sections above. Encourage the reader to pick one and try it.',
    comparison: 'Help the reader decide between the options compared in the sections above. Reference a key differentiator.',
    local: 'Encourage the reader to take local action. Reference a specific service or benefit from the sections above.',
    commercial: 'Reinforce the product value. Reference a key benefit from the sections above.',
    recipe: 'Encourage the reader to try the recipe. Reference a tip or variation from the sections above.',
  }

  const toneGuide = (articleType && toneInstructions[articleType])
    ? `\nTONE: ${toneInstructions[articleType]}`
    : ''

  const prompt = `You are an expert SEO content writer. Write the closing section for an article about "${topic}".
${h1Line}${h2List}
CLOSING SECTION:
- H2 Title: "${closingH2}"
${toneGuide}
REQUIREMENTS:
- Write exactly ${wordTarget} words
- Single paragraph
- Reference at least 1 specific topic from the sections listed above — do NOT write generic filler
- Mention "${topic}" once
- NEVER start with "In conclusion", "To summarize", "Finally", "In summary", "To wrap up"
- NEVER use vague phrases like "transform your experience", "enhance your life", "achieve your goals", "make informed decisions"
- Be specific and concrete — reference actual topics, products, or techniques from the article
- End with a clear, actionable next step for the reader
- Ends with a period

OUTPUT FORMAT:
Return ONLY the HTML section. No explanation.

\`\`\`html
<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${closingH2}</h2>
  <p class="scai-paragraph">Closing content here (${wordTarget} words).</p>
</section>
\`\`\`

Write the closing now:`

  try {
    const response = await callGemini(prompt)
    const html = extractHtml(response)

    // Ensure we have valid HTML with content
    if (html && html.includes('scai-closing') && html.length > 100) {
      return {
        componentId: 'closing',
        html,
        wordCount: countWords(html)
      }
    }

    // Fallback if extraction failed
    console.warn('Closing extraction failed, using fallback')
  } catch (error) {
    console.error('Error generating closing:', error)
  }

  // Fallback closing HTML — reference H2 topics if available
  const topicRef = h2Titles?.length
    ? `From ${h2Titles[0].toLowerCase()} to ${h2Titles[h2Titles.length - 1].toLowerCase()}, this guide covers what matters most about ${topic}.`
    : `This guide covers what matters most about ${topic}.`

  const fallbackHtml = `
<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${closingH2}</h2>
  <p class="scai-paragraph">${topicRef} Put these insights into practice and see the difference for yourself.</p>
</section>`

  return {
    componentId: 'closing',
    html: fallbackHtml.trim(),
    wordCount: countWords(fallbackHtml)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE-TYPE SPECIFIC GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateKeyTakeaways(
  context: ArticleContext,
  wordTarget: number = 65
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    // Import variation picker
    const { pickVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')

    // Pick a variation template (uses named if context.variationName, otherwise random)
    const variation = pickVariation('key-takeaways', context?.variationName)

    // If we have a variation template, use it
    if (variation) {
      const classMatch = variation.html.match(/class="(scai-key-takeaways-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-key-takeaways-a'

      const prompt = `You are an expert SEO content writer. Write key takeaways for an article about "${context.topic}".

REQUIREMENTS:
- Write EXACTLY 5-6 bullet points
- Total ~${wordTarget} words
- Each bullet is concise (10-12 words)
- Summarize the main points a reader will learn
- Include "${context.topic}" in at least one bullet

OUTPUT FORMAT:
Return ONLY a JSON array of takeaway strings. No explanation.

Example:
["First key insight about the topic", "Second important point to remember", "Third takeaway"]

Write the key takeaways now:`

      const response = await callGemini(prompt)

      // Parse the JSON array
      const takeaways = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n').filter(s => s.trim().length > 5).slice(0, 6)
      })

      // Build list items
      const listItems = takeaways.map(t => `<li>${t}</li>`).join('\n')

      const html = `<div class="${wrapperClass}" data-component="scai-key-takeaways">
<div class="scai-takeaways-title">Key Takeaways</div>
<ul class="scai-takeaways-list">
${listItems}
</ul>
</div>`

      return {
        componentId: 'key-takeaways',
        html,
        wordCount: countWords(html),
        variationCss: variation.css
      }
    }
  }

  // Fallback
  const prompt = `You are an expert SEO content writer. Write a "Key Takeaways" box for an article about "${context.topic}".

REQUIREMENTS:
- Write 5-6 bullet points
- Total ~${wordTarget} words
- Each bullet is concise (10-12 words)
- Summarize the main points a reader will learn
- Include "${context.topic}" in at least one bullet

CRITICAL STYLING RULES:
- Use ONLY plain black text
- NO colors (no green, blue, teal, or any color)
- NO background colors on elements
- NO colored bullets - use default black bullets
- Keep it simple and clean

OUTPUT FORMAT:
Return ONLY the HTML. No explanation.

\`\`\`html
<div data-component="scai-key-takeaways" class="scai-key-takeaways">
  <h4 class="scai-takeaways-title">Key Takeaways</h4>
  <ul class="scai-takeaways-list">
    <li>First key point about ${context.topic}</li>
    <li>Second key point</li>
    ...
  </ul>
</div>
\`\`\`

Write the key takeaways now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'key-takeaways',
    html,
    wordCount: countWords(html)
  }
}

export async function generateProsCons(
  context: ArticleContext,
  wordTarget: number = 150
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickVariation('pros-cons', context?.variationName)

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-pros-cons-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-pros-cons-a'

      // Detect variation structure
      const hasMainHeader = variation.html.includes('scai-pc-h2')
      const isMinimalStyle = wrapperClass === 'scai-pros-cons-c'

      // Ask LLM for CONTENT ONLY as structured JSON
      const prompt = `Write pros and cons for "${context.topic}".

REQUIREMENTS:
- 5-6 pros (positive points), 15-25 words each
- 4-5 cons (negative points), 15-25 words each
- Be honest, balanced, and specific to the topic
- Total ~${wordTarget} words

OUTPUT FORMAT:
Return ONLY a JSON object with "pros" and "cons" arrays. No explanation.

Example:
{
  "pros": ["First positive point about the topic that is detailed and specific", "Second positive point"],
  "cons": ["First negative point that is honest and balanced", "Second negative point"]
}

Write now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      let prosConsData = { pros: [] as string[], cons: [] as string[] }
      const parsed = parseJsonObjectFromLlm<{ pros: string[], cons: string[] }>(response, (text) => {
        // Fallback parser: try to extract lines with +/- or Pros:/Cons: markers
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10)
        const pros: string[] = []
        const cons: string[] = []
        let currentSection = ''
        for (const line of lines) {
          if (line.toLowerCase().includes('pros') || line.startsWith('+')) {
            currentSection = 'pros'
          } else if (line.toLowerCase().includes('cons') || line.startsWith('-')) {
            currentSection = 'cons'
          } else if (currentSection === 'pros') {
            pros.push(line.replace(/^[\+\-\*\d\.]+\s*/, ''))
          } else if (currentSection === 'cons') {
            cons.push(line.replace(/^[\+\-\*\d\.]+\s*/, ''))
          }
        }
        return pros.length > 0 ? { pros, cons } : null
      })

      if (parsed) {
        prosConsData = parsed
      }

      // Build list items
      const prosItems = prosConsData.pros.slice(0, 6).map(p => `<li>${p}</li>`).join('\n')
      const consItems = prosConsData.cons.slice(0, 5).map(c => `<li>${c}</li>`).join('\n')

      // Build HTML based on variation structure
      let html: string
      if (hasMainHeader) {
        // Variation B/C style with main header
        if (isMinimalStyle) {
          // Minimal style (C) with columns
          html = `<div class="${wrapperClass}" data-component="scai-pros-cons-section">
<h2 class="scai-pc-h2" data-component="scai-pros-cons-h2">Pros and Cons</h2>
<div class="scai-pc-columns">
<div>
<div class="scai-section-title">Pros</div>
<ul class="scai-pros-list">
${prosItems}
</ul>
</div>
<div>
<div class="scai-section-title">Cons</div>
<ul class="scai-cons-list">
${consItems}
</ul>
</div>
</div>
</div>`
        } else {
          // Stacked style (B)
          html = `<div class="${wrapperClass}" data-component="scai-pros-cons-section">
<h2 class="scai-pc-h2" data-component="scai-pros-cons-h2">Pros and Cons</h2>
<div class="scai-pros-section">
<div class="scai-section-title">Pros</div>
<ul class="scai-pros-list">
${prosItems}
</ul>
</div>
<div class="scai-cons-section">
<div class="scai-section-title">Cons</div>
<ul class="scai-cons-list">
${consItems}
</ul>
</div>
</div>`
        }
      } else {
        // Side-by-side style (A)
        html = `<div class="${wrapperClass}" data-component="scai-pros-cons-section">
<div class="scai-pros">
<div class="scai-pros-title">Pros</div>
<ul class="scai-pros-list" data-component="scai-pros-list">
${prosItems}
</ul>
</div>
<div class="scai-cons">
<div class="scai-cons-title">Cons</div>
<ul class="scai-cons-list" data-component="scai-cons-list">
${consItems}
</ul>
</div>
</div>`
      }

      return {
        componentId: 'pros-cons',
        html,
        wordCount: countWords(html),
        variationCss: variation.css
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert SEO content writer. Write a Pros & Cons section for a review about "${context.topic}".

REQUIREMENTS:
- 5-6 Pros (positive points)
- 4-5 Cons (negative points)
- Total ~${wordTarget} words
- Each bullet is concise (12-18 words)
- Be honest and balanced

OUTPUT FORMAT:
Return ONLY the HTML. No explanation.

\`\`\`html
<div data-component="scai-pros-cons" class="scai-pros-cons">
  <div class="scai-pros">
    <h4 class="scai-pros-title">Pros</h4>
    <ul>
      <li>Positive point about ${context.topic}</li>
      ...
    </ul>
  </div>
  <div class="scai-cons">
    <h4 class="scai-cons-title">Cons</h4>
    <ul>
      <li>Negative point about ${context.topic}</li>
      ...
    </ul>
  </div>
</div>
\`\`\`

Write the pros and cons now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'pros-cons',
    html,
    wordCount: countWords(html)
  }
}

export async function generateComparisonTable(
  context: ArticleContext,
  wordTarget: number = 135
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('comparison-table')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-comparison-table-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-comparison-table-a'

      // Ask LLM for structured table data
      const prompt = `Create a comparison table for "${context.topic}".

REQUIREMENTS:
- Compare 2-3 options/products
- Include 5-7 comparison features/criteria
- Use clear, concise values

OUTPUT FORMAT:
Return ONLY a JSON object. No explanation.

Example:
{
  "headers": ["Feature", "Option A", "Option B", "Option C"],
  "rows": [
    ["Price", "$29/mo", "$49/mo", "$79/mo"],
    ["Storage", "10GB", "50GB", "100GB"],
    ["Support", "Email only", "24/7 Chat", "Phone + Chat"]
  ]
}

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonObjectFromLlm<{ headers: string[], rows: string[][] }>(response, (text) => {
        // Fallback: try to parse markdown table
        const lines = text.split('\n').filter(l => l.includes('|'))
        if (lines.length > 2) {
          const headers = lines[0].split('|').map(h => h.trim()).filter(h => h.length > 0)
          const rows = lines.slice(2).map(line =>
            line.split('|').map(c => c.trim()).filter(c => c.length > 0)
          ).filter(r => r.length > 0)
          return { headers, rows }
        }
        return null
      })

      if (parsed && parsed.headers && parsed.rows) {
        // Detect if this is card columns variation (C) which uses div wrapper
        const isCardColumns = wrapperClass === 'scai-comparison-table-c'

        let html: string
        if (isCardColumns) {
          // Card columns format: products as columns
          const products = parsed.headers.slice(1) // Skip "Feature" header
          const features = parsed.rows

          const cardItems = products.map((product, productIdx) => {
            const rows = features.map(row =>
              `<div class="scai-compare-row"><span class="scai-compare-label">${row[0]}</span> ${row[productIdx + 1] || '-'}</div>`
            ).join('\n')
            return `<div class="scai-compare-item">
<div class="scai-compare-header">${product}</div>
${rows}
</div>`
          }).join('\n')

          html = `<div class="${wrapperClass}" data-component="scai-comparison-table">
${cardItems}
</div>`
        } else {
          // Standard table format (A and B): class goes on <table> element
          const headerCells = parsed.headers.map(h => `<th>${h}</th>`).join('')
          const bodyRows = parsed.rows.map(row =>
            `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
          ).join('\n')

          html = `<table class="${wrapperClass}" data-component="scai-comparison-table">
<thead><tr>${headerCells}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>`
        }

        return {
          componentId: 'comparison-table',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert SEO content writer. Write a comparison table for an article about "${context.topic}".

REQUIREMENTS:
- Compare 2-3 options/products related to "${context.topic}"
- Include 5-7 comparison features/criteria
- Total ~${wordTarget} words
- Use clear, concise values in cells

OUTPUT FORMAT:
Return ONLY the HTML. No explanation.

\`\`\`html
<div data-component="scai-comparison-table" class="scai-comparison-table">
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Option A</th>
        <th>Option B</th>
        <th>Option C</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Feature Name</td>
        <td>Value</td>
        <td>Value</td>
        <td>Value</td>
      </tr>
      ...
    </tbody>
  </table>
</div>
\`\`\`

Write the comparison table now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'comparison-table',
    html,
    wordCount: countWords(html)
  }
}

export async function generateIngredientsList(
  context: ArticleContext,
  wordTarget: number = 150
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  // Generate H2 based on variation
  const h2Title = generateH2ForVariation(
    context.h1Variation,
    'Ingredients',
    {
      question: `What Ingredients Do You Need for ${context.topic}?`,
      statement: `Ingredients for ${context.topic}`,
      listicle: `Ingredients You'll Need`
    }
  )

  if (useTemplateMode) {
    // Import variation picker
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')

    // Pick a random variation template
    const variation = pickRandomVariation('ingredients')

    // If we have a variation template, use it
    if (variation) {
      const classMatch = variation.html.match(/class="(scai-ingredients-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-ingredients-a'

      const prompt = `You are an expert culinary content writer. Write an ingredients list for a "${context.topic}" recipe.

REQUIREMENTS:
- Write EXACTLY 10-15 ingredients
- Total ~${wordTarget} words
- Use format: "QUANTITY MEASUREMENT INGREDIENT" (e.g., "2 cups all-purpose flour")
- Organize logically (main ingredients first, seasonings last)

OUTPUT FORMAT:
Return ONLY a JSON array of ingredient strings. No explanation.

Example:
["2 cups all-purpose flour", "1 cup granulated sugar", "1/2 teaspoon salt"]

Write the ingredients now:`

      const response = await callGemini(prompt)

      // Parse the JSON array
      const ingredients = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n').filter(s => s.trim().length > 3).slice(0, 15)
      })

      // Build list items
      const listItems = ingredients.map(ing => `<li>${ing}</li>`).join('\n')

      const html = `<div class="${wrapperClass}" data-component="scai-ingredients-section">
<h2 class="scai-ingredients-h2" data-component="scai-ingredients-h2">${h2Title}</h2>
<ul class="scai-ingredients-list" data-component="scai-ingredients-list">
${listItems}
</ul>
</div>`

      return {
        componentId: 'ingredients',
        html,
        wordCount: countWords(html),
        variationCss: variation.css
      }
    }
  }

  // Fallback
  const prompt = `You are an expert culinary content writer. Write an ingredients list for a "${context.topic}" recipe.

H2 HEADING: "${h2Title}"

REQUIREMENTS:
- Include 10-15 ingredients
- Total ~${wordTarget} words
- Use standard recipe format (quantity + ingredient)
- Organize logically (main ingredients first, seasonings last)

OUTPUT FORMAT:
Return ONLY the HTML. No explanation.

\`\`\`html
<section data-component="scai-ingredients" class="scai-ingredients">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <ul class="scai-ingredients-list">
    <li>1 cup ingredient</li>
    <li>2 tablespoons ingredient</li>
    ...
  </ul>
</section>
\`\`\`

Write the ingredients list now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'ingredients',
    html,
    wordCount: countWords(html)
  }
}

export async function generateInstructions(
  context: ArticleContext,
  wordTarget: number = 275
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  // Generate H2 based on variation
  const h2Title = generateH2ForVariation(
    context.h1Variation,
    'Instructions',
    {
      question: `How Do You Make ${context.topic}?`,
      statement: `Step-by-Step Instructions for ${context.topic}`,
      listicle: `Instructions`
    }
  )

  if (useTemplateMode) {
    // Import variation picker
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')

    // Pick a random variation template
    const variation = pickRandomVariation('instructions')

    // If we have a variation template, use it
    if (variation) {
      // Extract the class name from the variation (e.g., scai-instructions-a)
      const classMatch = variation.html.match(/class="(scai-instructions-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-instructions-a'

      // Determine if it's ordered (ol) or unordered (ul) list
      const useOrderedList = variation.html.includes('<ol')
      const hasStepNumbers = variation.html.includes('scai-step-number')

      const prompt = `You are an expert culinary content writer. Write step-by-step instructions for a "${context.topic}" recipe.

REQUIREMENTS:
- Write EXACTLY 8-10 numbered steps
- Total ~${wordTarget} words
- Each step is clear and actionable (25-35 words)
- Include timing where relevant
- Progress logically from prep to finish

OUTPUT FORMAT:
Return ONLY a JSON array of step strings. No explanation, no numbering prefix.

Example:
["Preheat your oven to 350°F...", "In a large bowl, combine...", "Mix until smooth..."]

Write the instruction steps now:`

      const response = await callGemini(prompt)

      // Parse the JSON array of steps
      const steps = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n').filter(s => s.trim().length > 10).slice(0, 10)
      })

      // Build the list items based on variation style
      let listItems: string
      if (hasStepNumbers) {
        // Variation C style: uses <span class="scai-step-number">Step N</span>
        listItems = steps.map((step, i) =>
          `<li><span class="scai-step-number">Step ${i + 1}</span> ${step}</li>`
        ).join('\n')
      } else {
        // Variation A/B style: uses CSS counters or default numbering
        listItems = steps.map(step => `<li>${step}</li>`).join('\n')
      }

      const listTag = useOrderedList ? 'ol' : 'ul'

      const html = `<div class="${wrapperClass}" data-component="scai-instructions-section">
<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">${h2Title}</h2>
<${listTag} class="scai-instructions-list" data-component="scai-instructions-list">
${listItems}
</${listTag}>
</div>`

      return {
        componentId: 'instructions',
        html,
        wordCount: countWords(html),
        variationCss: variation.css
      }
    }
  }

  // Fallback to original behavior if no variation found
  const prompt = `You are an expert culinary content writer. Write step-by-step instructions for a "${context.topic}" recipe.

H2 HEADING: "${h2Title}"

REQUIREMENTS:
- Include 8-12 numbered steps
- Total ~${wordTarget} words
- Each step is clear and actionable (20-35 words)
- Include timing where relevant
- Progress logically from prep to finish

OUTPUT FORMAT:
Return ONLY the HTML. No explanation.

\`\`\`html
<section data-component="scai-instructions" class="scai-instructions">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <ol class="scai-instructions-list">
    <li>First step with clear action...</li>
    <li>Second step...</li>
    ...
  </ol>
</section>
\`\`\`

Write the instructions now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'instructions',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CARD GENERATOR (Affiliate)
// ═══════════════════════════════════════════════════════════════════════════════

import type { AmazonProduct } from './amazon-product-api'
import { generateAffiliateLink, generateAmazonSearchLink } from './amazon-product-api'

/**
 * Generate Product Card for Affiliate Articles
 * 
 * DATA FLOW & BEHAVIOR:
 * 1. Creates complete <section> with H2 heading + product card
 * 2. H2 is auto-generated based on H1 variation using generateH2ForVariation()
 * 3. If realProduct provided: Uses actual Amazon data (price, rating, image, link)
 * 4. If no realProduct: LLM generates realistic mock data
 * 
 * SUBSEQUENT CONTENT:
 * - After this component, orchestrator generates:
 *   - H2 image (optional placeholder)
 *   - Standard paragraph (150 words, 3×50)
 * - Standard paragraph receives same topic + H2 title for context
 * - Content flows naturally from product card H2
 * 
 * DESIGN PATTERN:
 * Product Card → [Optional Image] → Standard Paragraph
 * Each card is self-contained with its own H2, but followed by supporting content
 * 
 * @param context - Full article context with H1, variation, tone
 * @param productIndex - 1-3 (Best Overall, Best Value, Premium Pick)
 * @param badge - Display badge text
 * @param realProduct - Optional real Amazon product data from API
 */
export async function generateProductCard(
  context: ArticleContext,
  productIndex: number,
  badge: string = 'Top Pick',
  realProduct?: AmazonProduct
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  // Generate H2 using AI to create proper, SEO-friendly heading from product name
  // Per documentation: H2 max 60 chars, must follow H1 variation type
  const h2Title = await generateProductH2WithAI(
    realProduct?.title || context.topic,
    badge,
    context.h1Variation,
    context.topic,
    productIndex
  )

  // If we have real Amazon product data, use it directly (no LLM call needed for card)
  // But we still need LLM for the description paragraph
  if (realProduct) {
    return generateProductCardFromAmazonData(context, h2Title, badge, realProduct, productIndex, useTemplateMode)
  }

  // Generate Amazon search link for fallback (still goes to Amazon!)
  const amazonSearchLink = generateAmazonSearchLink(context.topic)

  // H2 Image placeholder with ENHANCED metadata for proper article-type aware image generation
  const h2ImagePlaceholder = createEnhancedPlaceholder({
    text: `${context.topic} ${badge} Product`,
    articleType: 'affiliate',
    imageType: 'product',
    sectionIndex: productIndex,
    componentType: 'product-card'
  })

  // Template mode: pick variation for styling
  let variationCss: string | undefined
  let wrapperClass = 'scai-pc-clean' // Default to Clean Studio

  if (useTemplateMode) {
    const { pickRandomVariation } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('product-card')
    if (variation) {
      // Extract the wrapper class from the variation HTML (e.g., scai-pc-clean, scai-pc-brutal)
      const classMatch = variation.html.match(/class="(scai-pc-[a-z]+)"/)
      if (classMatch) {
        wrapperClass = classMatch[1]
      }
      variationCss = variation.css
    }
  }

  // Otherwise, use LLM to generate product data + description with link to Amazon search
  // The HTML structure matches the variation template structure for CSS to work
  const prompt = `You are an expert affiliate content writer. Create a COMPLETE product section for an affiliate article about "${context.topic}".

THIS IS PRODUCT #${productIndex} with badge: "${badge}"

SECTION REQUIREMENTS:
1. Product Card with:
   - REALISTIC, specific product name (NOT "Product 1")
   - Brief description (1-2 sentences)
   - Realistic rating (4.2-4.9 out of 5) and review count (500-5000)
   - Price placeholder: $XX.XX

2. Product Description Paragraph: EXACTLY 150 words (3 paragraphs × 50 words each)
   - Paragraph 1: What makes this product stand out
   - Paragraph 2: Key features and specifications
   - Paragraph 3: Who this product is best for

CRITICAL: Use the EXACT HTML structure provided. Do not modify class names.

OUTPUT FORMAT:
Return ONLY the HTML. Replace [PRODUCT_NAME] with a realistic product name.

\`\`\`html
<h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
<div class="${wrapperClass}" data-component="scai-product-card">
<div class="scai-pc-image-wrap">
<span class="scai-pc-badge">${badge}</span>
<img src="https://placehold.co/400x400/e5e7eb/6b7280?text=Product${productIndex}" alt="[PRODUCT_NAME]" class="scai-pc-img">
</div>
<div class="scai-pc-content">
<h3 class="scai-pc-title" data-component="scai-product-card-name">[PRODUCT_NAME]</h3>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-stars">★★★★☆</span>
<span class="scai-pc-rating-text">4.X (X,XXX reviews)</span>
</div>
<p class="scai-pc-desc">[1-2 sentence description of the product]</p>
<div class="scai-pc-price-row">
<span class="scai-pc-price" data-component="scai-product-card-price">$XX.XX</span>
</div>
<a href="${amazonSearchLink}" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="nofollow noopener sponsored">View on Amazon →</a>
</div>
</div>
<figure class="scai-h2-image" data-component="scai-h2-image">
<img src="${h2ImagePlaceholder}" alt="About [PRODUCT_NAME]">
</figure>
<div class="scai-product-description" data-component="scai-product-description">
<p class="scai-paragraph">[~50 words about what makes this product stand out]</p>
<p class="scai-paragraph">[~50 words about key features and specifications]</p>
<p class="scai-paragraph">[~50 words about who this product is best for]</p>
</div>
\`\`\`

Write the complete product section with REALISTIC product name and 150-word description:`

  const response = await callGemini(prompt, 2048)
  const html = extractHtml(response)

  // Use indexed componentId for unique matching in assembler
  return {
    componentId: `product-card-${productIndex - 1}`,
    html,
    wordCount: countWords(html),
    index: productIndex,
    variationCss
  }
}

/**
 * Generate Product Card HTML from real Amazon API data
 * No LLM call needed - directly formats the data
 */
async function generateProductCardFromAmazonData(
  context: ArticleContext,
  h2Title: string,
  badge: string,
  product: AmazonProduct,
  productIndex: number,
  useTemplateMode: boolean = true
): Promise<GeneratedContent> {
  // Generate affiliate link (pass-through, no tag needed for now)
  const affiliateLink = generateAffiliateLink(product.productUrl)

  // Format the review count with commas
  const formattedReviews = product.reviewCount.toLocaleString()

  // Template mode: get the product card variation for consistent styling across all cards
  let variationCss: string | undefined
  let wrapperClass = 'scai-pc-clean' // Default fallback

  if (useTemplateMode) {
    const { pickRandomVariation } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('product-card')
    if (variation) {
      variationCss = variation.css
      // Extract the wrapper class from the variation HTML (e.g., scai-pc-clean, scai-pc-brutal)
      const classMatch = variation.html.match(/class="(scai-pc-[a-z]+)"/)
      if (classMatch) {
        wrapperClass = classMatch[1]
      }
    }
  }

  // H2 Image placeholder with ENHANCED metadata for proper article-type aware image generation
  // Use actual product title (truncated) for AI image reference
  const h2ImagePlaceholder = createEnhancedPlaceholder({
    text: product.title.substring(0, 50),
    articleType: 'affiliate',
    imageType: 'product',
    sectionIndex: productIndex,
    componentType: 'product-card'
  })

  // Generate description paragraph using LLM (150 words, 3×50) + short card description
  const descPrompt = `You are an expert affiliate content writer. Write content for "${product.title}" in the context of "${context.topic}".

OUTPUT FORMAT — Return EXACTLY this structure, nothing else:

<card-desc>Write ONE sentence (15-20 words) that highlights what makes this specific product worth buying. Be specific to THIS product, not generic. Do NOT mention review counts or star ratings.</card-desc>

<p class="scai-paragraph">[~50 words about what makes this product stand out (reference: ${badge})]</p>
<p class="scai-paragraph">[~50 words about key features and specifications]</p>
<p class="scai-paragraph">[~50 words about who this product is best for]</p>

RULES:
- The card-desc must be specific to "${product.title}" — mention an actual feature or benefit
- The 3 paragraphs should total ~150 words
- Output ONLY the card-desc tag and 3 paragraphs in HTML format. No extra text.

Write the content now:`

  let descriptionHtml = ''
  let cardDescription = `Rated ${product.rating.toFixed(1)} out of 5 stars by ${formattedReviews} verified buyers.`
  try {
    const descResponse = await callGemini(descPrompt, 1024)
    // Extract card description from <card-desc> tag
    const cardDescMatch = descResponse.match(/<card-desc>([\s\S]*?)<\/card-desc>/)
    if (cardDescMatch) {
      cardDescription = cardDescMatch[1].trim()
    }
    // Extract the paragraph HTML (everything except the card-desc tag)
    const cleanedResponse = descResponse.replace(/<card-desc>[\s\S]*?<\/card-desc>/, '').trim()
    descriptionHtml = extractHtml(cleanedResponse)
  } catch (e) {
    // Fallback description
    descriptionHtml = `
<p class="scai-paragraph">This ${context.topic} option stands out for its exceptional quality and value. With a rating of ${product.rating.toFixed(1)} out of 5 stars from ${formattedReviews} reviews, it has proven reliability among users.</p>
<p class="scai-paragraph">Key features include the premium build quality and thoughtful design that sets it apart from competitors. The specifications meet the needs of most users looking for a dependable ${context.topic} solution.</p>
<p class="scai-paragraph">This product is ideal for those who prioritize quality and value in their ${context.topic} purchase. Whether you're a beginner or experienced user, this option delivers consistent performance.</p>`.trim()
  }

  // Truncate product name for cleaner display in card
  const displayName = truncateProductName(product.title)

  // Generate star rating display (filled stars based on rating)
  const fullStars = Math.floor(product.rating)
  const starDisplay = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars)

  // Build responsive product card HTML using variation-specific class structure
  // All 18 variations use this same inner class naming: scai-pc-image-wrap, scai-pc-content, scai-pc-title, etc.
  const productCardHtml = `<div class="${wrapperClass}" data-component="scai-product-card" data-asin="${product.asin}">
<div class="scai-pc-image-wrap">
<span class="scai-pc-badge">${badge}</span>
<img src="${product.imageUrl}" alt="${product.title}" class="scai-pc-img" loading="lazy">
</div>
<div class="scai-pc-content">
<h3 class="scai-pc-title" data-component="scai-product-card-name">${displayName}</h3>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-stars">${starDisplay}</span>
<span class="scai-pc-rating-text">${product.rating.toFixed(1)} (${formattedReviews} reviews)</span>
</div>
<p class="scai-pc-desc">${cardDescription}</p>
<div class="scai-pc-price-row">
<span class="scai-pc-price" data-component="scai-product-card-price">${product.price}</span>
</div>
<a href="${affiliateLink}" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="nofollow noopener sponsored">Check Price →</a>
</div>
</div>`

  // Build complete product section: H2 + Card + H2 Image + Description
  const html = `
<h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
${productCardHtml}
<figure class="scai-h2-image" data-component="scai-h2-image">
  <img src="${h2ImagePlaceholder}" alt="About ${displayName}" />
</figure>
<div class="scai-product-description" data-component="scai-product-description">
${descriptionHtml}
</div>`.trim()

  // Use indexed componentId for unique matching in assembler
  return {
    componentId: `product-card-${productIndex - 1}`,
    html,
    wordCount: countWords(html),
    index: productIndex,
    variationCss
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE LIST GENERATOR (Commercial)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateFeatureList(
  context: ArticleContext,
  wordTarget: number = 110
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('feature-list')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-feature-(?:section|list)-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-feature-section-a'

      // Ask LLM for structured feature data
      const prompt = `Write a feature list for "${context.topic}".

REQUIREMENTS:
- 5-7 features with descriptions
- Each feature: 15-20 words total
- Focus on value and benefits
- ⚠️ NO BUZZWORDS: Never use "innovative", "seamless", "cutting-edge", "game-changer", "revolutionary", "state-of-the-art", "groundbreaking", "unprecedented"
- Use specific, factual language instead

OUTPUT FORMAT:
Return ONLY a JSON array. No explanation.

Example:
[
  {"name": "Feature Name", "description": "Brief description of this feature and its benefit"},
  {"name": "Another Feature", "description": "Brief description explaining the value"}
]

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonArrayFromLlm<{ name: string, description: string }>(response, (text) => {
        // Fallback: try to extract bullet points
        const lines = text.split('\n')
          .filter(l => l.trim().length > 10)
          .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
        return lines.map(line => {
          const colonIndex = line.indexOf(':')
          if (colonIndex > 0) {
            return { name: line.substring(0, colonIndex).trim(), description: line.substring(colonIndex + 1).trim() }
          }
          return { name: 'Feature', description: line }
        })
      })

      if (parsed && parsed.length > 0) {
        // Build list items
        const listItems = parsed.slice(0, 7).map(f =>
          `<li><strong>${f.name}:</strong> ${f.description}</li>`
        ).join('\n')

        const html = `<div class="${wrapperClass}" data-component="scai-feature-list">
<ul class="scai-feature-list">
${listItems}
</ul>
</div>`

        return {
          componentId: 'feature-list',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert copywriter. Write a feature list for "${context.topic}".

REQUIREMENTS:
- 5-7 bullet points highlighting key features/benefits
- Total ~${wordTarget} words
- Each bullet: 15-20 words
- Focus on what makes this product/service valuable
- Use action-oriented language

CRITICAL STYLING:
- NO colors - black text only
- NO colored backgrounds
- Clean, simple bullet list

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-feature-list" class="scai-feature-list">
  <ul>
    <li><strong>Feature Name:</strong> Description of this feature and its benefit</li>
    <li><strong>Feature Name:</strong> Description of this feature and its benefit</li>
    ...
  </ul>
</div>
\`\`\`

Write the feature list now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'feature-list',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA BOX GENERATOR (Commercial)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateCTABox(
  context: ArticleContext,
  action: string = 'Get Started'
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('cta-box')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-cta-box-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-cta-box-a'

      // Ask LLM for structured CTA content
      const prompt = `Write a call-to-action for "${context.topic}".

REQUIREMENTS:
- Compelling headline (5-8 words)
- Brief persuasive text (12-18 words)
- Create urgency without being pushy

OUTPUT FORMAT:
Return ONLY a JSON object. No explanation.

Example:
{
  "headline": "Ready to Transform Your Workflow?",
  "text": "Don't let inefficiencies hold you back. Take the first step toward success today.",
  "buttonText": "${action}"
}

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonObjectFromLlm<{ headline: string, text: string, buttonText?: string }>(response, (text) => {
        // Fallback: try to extract headline and text
        const lines = text.split('\n').filter(l => l.trim().length > 5)
        if (lines.length >= 2) {
          return { headline: lines[0].replace(/^["']|["']$/g, ''), text: lines.slice(1).join(' ').replace(/^["']|["']$/g, '') }
        }
        return null
      })

      if (parsed) {
        const html = `<div class="${wrapperClass}" data-component="scai-cta-box">
<h4 class="scai-cta-headline">${parsed.headline}</h4>
<p class="scai-cta-text">${parsed.text}</p>
<a href="#" class="scai-cta-button">${parsed.buttonText || action}</a>
</div>`

        return {
          componentId: 'cta-box',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert copywriter. Write a call-to-action box for "${context.topic}".

REQUIREMENTS:
- Total 20-30 words
- Compelling headline (5-8 words)
- Brief persuasive text (12-18 words)
- Action button text: "${action}"
- Create urgency without being pushy

CRITICAL STYLING:
- NO colors in text
- Simple, clean design
- Button is styled separately via CSS

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-cta-box" class="scai-cta-box">
  <h4 class="scai-cta-headline">Ready to [Action]?</h4>
  <p class="scai-cta-text">Brief persuasive message about ${context.topic}.</p>
  <a href="#" class="scai-cta-button">${action}</a>
</div>
\`\`\`

Write the CTA box now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'cta-box',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC OVERVIEW GENERATOR (Comparison)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateTopicOverview(
  context: ArticleContext,
  subtopic: string,
  wordTarget: number = 80
): Promise<GeneratedContent> {
  const prompt = `You are an expert SEO writer. Write a topic overview about "${subtopic}" in the context of "${context.topic}".

⚠️⚠️⚠️ MANDATORY WORD COUNT: EXACTLY ${wordTarget} WORDS ⚠️⚠️⚠️

You MUST write EXACTLY ${wordTarget} words split into TWO paragraphs.
- Paragraph 1: EXACTLY 40 words (write 40-45 words to be safe)
- Paragraph 2: EXACTLY 40 words (write 40-45 words to be safe)

Each paragraph should be 3-4 lines long for readability.

CONTENT STRUCTURE:
- Paragraph 1: What ${subtopic} is + main feature/characteristic
- Paragraph 2: Who it's for + key benefit/use case

If your response has fewer than ${wordTarget} words, it will be REJECTED.

Here is an EXAMPLE of proper paragraph length (roughly 40 words):
"${subtopic} represents a popular option in the ${context.topic} space that delivers reliable performance for most users. This approach combines essential features with straightforward functionality, making it accessible to both newcomers and experienced individuals."

CRITICAL STYLING:
- Plain black text only
- NO colors or backgrounds

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-topic-overview" class="scai-topic-overview">
  <p>What ${subtopic} is - definition and core concept explanation that helps readers understand the basics.</p>
  <p>Who ${subtopic} is for - target audience, ideal use cases, and who benefits most from this option.</p>
</div>
\`\`\`

Write the topic overview now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'topic-overview',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK VERDICT GENERATOR (Comparison)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateQuickVerdict(
  context: ArticleContext,
  options: string[] = []
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('quick-verdict')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-quick-verdict-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-quick-verdict-a'

      const optionsText = options.length > 0 ? options.join(', ') : 'the options compared'

      // Ask LLM for structured verdict content
      const prompt = `Write a quick verdict comparing options for "${context.topic}": ${optionsText}.

REQUIREMENTS:
- Give conditional recommendations ("Choose X if..., Choose Y if...")
- Be direct and helpful
- Total ~50 words

OUTPUT FORMAT:
Return ONLY a JSON object. No explanation.

Example:
{
  "verdicts": [
    {"option": "Option A", "recommendation": "you need maximum performance and have a larger budget"},
    {"option": "Option B", "recommendation": "you prioritize value and don't need advanced features"}
  ]
}

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonObjectFromLlm<{ verdicts: Array<{ option: string, recommendation: string }> }>(response, (text) => {
        // Fallback: try to extract "Choose X if" patterns
        const matches = [...text.matchAll(/choose\s+([^:]+)\s*(?:if|when)[:\s]*([^.]+)/gi)]
        if (matches.length > 0) {
          return { verdicts: matches.map(m => ({ option: m[1].trim(), recommendation: m[2].trim() })) }
        }
        return null
      })

      if (parsed && parsed.verdicts && parsed.verdicts.length > 0) {
        // Detect variation type to match HTML structure
        const isVariationA = wrapperClass === 'scai-quick-verdict-a'
        const isVariationB = wrapperClass === 'scai-quick-verdict-b'
        const isVariationC = wrapperClass === 'scai-quick-verdict-c'

        let html: string

        if (isVariationA) {
          // Split layout: side-by-side verdict options
          const verdictOptions = parsed.verdicts.map(v =>
            `<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose ${v.option} if:</div>
<p class="scai-verdict-text">${v.recommendation}.</p>
</div>`
          ).join('\n')

          html = `<div class="${wrapperClass}" data-component="scai-quick-verdict">
${verdictOptions}
</div>`
        } else if (isVariationB) {
          // Boxed layout: title + combined paragraph
          const combinedText = parsed.verdicts.map(v =>
            `Choose ${v.option} if ${v.recommendation}.`
          ).join(' ')

          html = `<div class="${wrapperClass}" data-component="scai-quick-verdict">
<div class="scai-verdict-title">Quick Verdict</div>
<p class="scai-verdict-text">${combinedText}</p>
</div>`
        } else {
          // Inline layout (C): title span + combined text
          const combinedText = parsed.verdicts.map(v =>
            `Choose ${v.option} if ${v.recommendation}.`
          ).join(' ')

          html = `<div class="${wrapperClass}" data-component="scai-quick-verdict">
<p class="scai-verdict-text"><span class="scai-verdict-title">Quick Verdict:</span> ${combinedText}</p>
</div>`
        }

        return {
          componentId: 'quick-verdict',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const optionsText = options.length > 0 ? options.join(', ') : 'the options compared'

  const prompt = `You are an expert reviewer. Write a quick verdict box for "${context.topic}" comparing ${optionsText}.

REQUIREMENTS:
- Total ~50 words
- Give conditional recommendations ("Choose X if..., Choose Y if...")
- Be direct and helpful
- Don't be wishy-washy - give clear guidance

CRITICAL STYLING:
- Plain black text only
- NO colors

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-quick-verdict" class="scai-quick-verdict">
  <h4 class="scai-verdict-title">Quick Verdict</h4>
  <p><strong>Choose [Option A] if:</strong> you need [specific use case].</p>
  <p><strong>Choose [Option B] if:</strong> you prioritize [specific benefit].</p>
</div>
\`\`\`

Write the quick verdict now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'quick-verdict',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIALS BOX GENERATOR (How-To)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateMaterialsBox(
  context: ArticleContext,
  wordTarget: number = 70
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    // Use 'requirements-box' variation key which maps to materials/requirements
    const variation = pickRandomVariation('requirements-box')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-requirements-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-requirements-a'

      // Ask LLM for structured materials data
      const prompt = `Write a materials/requirements list for "${context.topic}".

REQUIREMENTS:
- 5-15 items depending on complexity
- Include quantities where appropriate
- List tools, materials, or prerequisites needed
- Organize logically (essential items first)

OUTPUT FORMAT:
Return ONLY a JSON array of requirement strings. No explanation.

Example:
["1 cup flour (all-purpose)", "2 tablespoons butter (softened)", "Mixing bowl (medium)", "Whisk or fork"]

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const materials = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n')
          .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
          .filter(l => l.length > 2)
      })

      if (materials.length > 0) {
        const listItems = materials.slice(0, 15).map(m => `<li>${m}</li>`).join('\n')

        const html = `<div class="${wrapperClass}" data-component="scai-requirements-section">
<h3 class="scai-requirements-h3" data-component="scai-requirements-h3">What You'll Need</h3>
<ul class="scai-requirements-list" data-component="scai-requirements-list">
${listItems}
</ul>
</div>`

        return {
          componentId: 'materials-box',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert content writer. Write a materials/requirements list for a how-to guide about "${context.topic}".

REQUIREMENTS:
- 5-15 items depending on complexity
- Total ~${wordTarget} words
- Include quantities where appropriate
- List tools, materials, or prerequisites needed
- Organize logically (essential items first)

CRITICAL STYLING:
- Plain black text only
- Simple bullet list
- NO colors or icons

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-materials-box" class="scai-materials-box">
  <h4 class="scai-materials-title">What You'll Need</h4>
  <ul>
    <li>Item 1 (with quantity if applicable)</li>
    <li>Item 2</li>
    ...
  </ul>
</div>
\`\`\`

Write the materials list now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'materials-box',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRO TIPS GENERATOR (How-To)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateProTips(
  context: ArticleContext,
  wordTarget: number = 100
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('pro-tips')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-pro-tips-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-pro-tips-a'

      // Detect list type from variation (ol vs ul)
      const useOrderedList = variation.html.includes('<ol')

      // Ask LLM for structured tips data
      const prompt = `Write pro tips for "${context.topic}".

REQUIREMENTS:
- 5-7 tips, each 15-25 words
- Actionable, specific insider advice
- Mix of time-savers, quality improvers, mistake-avoiders

OUTPUT FORMAT:
Return ONLY a JSON array of tip strings. No explanation.

Example:
["First actionable tip that helps with the topic", "Second insider tip that beginners wouldn't know", "Third helpful advice point"]

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const tips = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n')
          .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
          .filter(l => l.length > 10)
          .slice(0, 7)
      })

      if (tips.length > 0) {
        const listTag = useOrderedList ? 'ol' : 'ul'
        const listItems = tips.slice(0, 7).map(tip => `<li>${tip}</li>`).join('\n')

        const html = `<div class="${wrapperClass}" data-component="scai-pro-tips-section">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Pro Tips for Best Results</h2>
<${listTag} class="scai-tips-list" data-component="scai-tips-list">
${listItems}
</${listTag}>
</div>`

        return {
          componentId: 'pro-tips',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert in "${context.topic}". Write a pro tips section with insider advice.

REQUIREMENTS:
- 5-7 tips
- Total ~${wordTarget} words
- Each tip: actionable and specific
- Include "insider knowledge" that beginners wouldn't know
- Mix of time-savers, quality improvers, and mistake-avoiders

CRITICAL STYLING:
- Plain black text only
- NO colored backgrounds or icons

OUTPUT FORMAT:
Return ONLY the HTML. Each tip should be a short, actionable bullet point WITHOUT a "Pro Tip:" prefix.

\`\`\`html
<div data-component="scai-pro-tips" class="scai-pro-tips">
  <h3 class="scai-pro-tips-title">Expert Pro Tips</h3>
  <ul>
    <li>Specific actionable advice that helps with ${context.topic}</li>
    <li>Another helpful insider tip (12-18 words)</li>
    <li>Additional expert advice point</li>
    <li>More helpful tip here</li>
    <li>Final tip for best results</li>
  </ul>
</div>
\`\`\`

Write 5-7 expert tips now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'pro-tips',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK FACTS GENERATOR (Informational)
// Per documentation: Quick Facts H2 is 40-50 characters
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateQuickFacts(
  context: ArticleContext,
  wordTarget: number = 90
): Promise<GeneratedContent> {
  // Generate H2 with proper 40-50 character limit per documentation
  const h2Title = await generateSpecialH2WithAI('quick-facts', context.h1Variation, context.topic)

  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('quick-facts')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-quick-facts-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-quick-facts-a'

      // Detect if using grid layout (variation A) or simple list (B/C)
      const isGridLayout = variation.html.includes('scai-facts-grid')

      // Ask LLM for structured facts data
      const prompt = `Write quick facts about "${context.topic}".

REQUIREMENTS:
- 5-7 interesting facts
- Each fact: surprising or educational
- Mix of statistics, history, and trivia

OUTPUT FORMAT:
Return ONLY a JSON array. No explanation.
${isGridLayout ? `
Example with labels:
[
  {"label": "Origin Story", "fact": "Established in 2015 with headquarters in San Francisco"},
  {"label": "User Base", "fact": "Trusted by over ten million active users worldwide"}
]` : `
Example:
["First interesting fact about the topic", "Second surprising statistic or historical note", "Third educational fact"]`}

Generate now:`

      const response = await callGemini(prompt)

      if (isGridLayout) {
        // Parse as array of objects for grid layout
        const facts = parseJsonArrayFromLlm<{ label: string, fact: string }>(response, (text) => {
          return text.split('\n')
            .filter(l => l.trim().length > 10)
            .map(l => {
              const colonIdx = l.indexOf(':')
              if (colonIdx > 0) {
                return { label: l.substring(0, colonIdx).replace(/^[\d\.\-\*]+\s*/, '').trim(), fact: l.substring(colonIdx + 1).trim() }
              }
              return { label: 'Fact', fact: l.replace(/^[\d\.\-\*]+\s*/, '').trim() }
            })
        })

        if (facts.length > 0) {
          const factItems = facts.slice(0, 6).map(f => `<div class="scai-facts-item">
<h3>${f.label}</h3>
<p>${f.fact}</p>
</div>`).join('\n')

          const html = `<div class="${wrapperClass}" data-component="scai-quick-facts-section">
<span class="scai-facts-title" data-component="scai-quick-facts-h2">${h2Title}</span>
<div class="scai-facts-grid" data-component="scai-quick-facts-list">
${factItems}
</div>
</div>`

          return {
            componentId: 'quick-facts',
            html,
            wordCount: countWords(html),
            variationCss: variation.css
          }
        }
      } else {
        // Parse as simple array for list layout
        const facts = parseJsonArrayFromLlm<string>(response, (text) => {
          return text.split('\n')
            .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
            .filter(l => l.length > 10)
        })

        if (facts.length > 0) {
          const listItems = facts.slice(0, 7).map(f => `<li>${f}</li>`).join('\n')

          const html = `<div class="${wrapperClass}" data-component="scai-quick-facts-section">
<h2 class="scai-facts-h2" data-component="scai-quick-facts-h2">${h2Title}</h2>
<ul class="scai-facts-list" data-component="scai-quick-facts-list">
${listItems}
</ul>
</div>`

          return {
            componentId: 'quick-facts',
            html,
            wordCount: countWords(html),
            variationCss: variation.css
          }
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert content writer. Write a "Quick Facts" section about "${context.topic}".

H2 HEADING: "${h2Title}"

REQUIREMENTS:
- 5-7 interesting facts
- Total ~${wordTarget} words
- Each fact: surprising or educational
- Mix of statistics, history, and trivia
- "Did you know?" style engagement

CRITICAL STYLING:
- Plain black text only
- NO colored backgrounds

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<section data-component="scai-quick-facts" class="scai-quick-facts">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <ul class="scai-facts-list">
    <li>Interesting fact about ${context.topic}</li>
    <li>Surprising statistic or historical note</li>
    ...
  </ul>
</section>
\`\`\`

Write the quick facts now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'quick-facts',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HONORABLE MENTIONS GENERATOR (Listicle)
// Per documentation: Honorable Mentions H2 is 40-50 characters
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateHonorableMentions(
  context: ArticleContext,
  mainItems: string[] = []
): Promise<GeneratedContent> {
  // Generate H2 with proper 40-50 character limit per documentation
  const h2Title = await generateSpecialH2WithAI('honorable-mentions', context.h1Variation, context.topic)

  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('honorable-mentions')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-honorable-mentions-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-honorable-mentions-a'

      const mainItemsText = mainItems.length > 0
        ? `The main list already covers: ${mainItems.join(', ')}. Suggest different items.`
        : ''

      // Ask LLM for structured honorable mentions data
      const prompt = `Write honorable mentions for a listicle about "${context.topic}".

${mainItemsText}

REQUIREMENTS:
- 3-4 items that just missed the main list
- Each item: name (30-40 chars) + subtitle + description (40-50 words)

OUTPUT FORMAT:
Return ONLY a JSON array. No explanation.

Example:
[
  {"name": "Product Alpha", "subtitle": "Reliable Basic Choice", "description": "While missing some premium features, this option delivers exceptional reliability and solid core performance that budget-conscious buyers will appreciate."},
  {"name": "Product Beta", "subtitle": "Specialized Powerhouse", "description": "This carves out a unique niche with specialized tools for complex workflows that other platforms ignore."}
]

Generate 3-4 items now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const mentions = parseJsonArrayFromLlm<{ name: string, subtitle?: string, description: string }>(response, (text) => {
        // Fallback: try to extract H3 + paragraph patterns
        const items: Array<{ name: string, subtitle?: string, description: string }> = []
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.match(/^[\d\.\-\*]+/) || line.includes(':')) {
            const colonIdx = line.indexOf(':')
            const name = colonIdx > 0 ? line.substring(0, colonIdx).replace(/^[\d\.\-\*]+\s*/, '').trim() : line.replace(/^[\d\.\-\*]+\s*/, '').trim()
            const nextLine = lines[i + 1]?.trim() || ''
            if (nextLine.length > 20) {
              items.push({ name, description: nextLine })
              i++
            }
          }
        }
        return items.length > 0 ? items : null
      }) || []

      if (mentions.length > 0) {
        const mentionItems = mentions.slice(0, 4).map(m => {
          const h3Text = m.subtitle ? `${m.name}: ${m.subtitle}` : m.name
          return `<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">${h3Text}</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">${m.description}</p>
</div>`
        }).join('\n')

        const html = `<div class="${wrapperClass}" data-component="scai-honorable-mentions">
<h2 class="scai-hm-h2" data-component="scai-hm-h2">${h2Title}</h2>
${mentionItems}
</div>`

        return {
          componentId: 'honorable-mentions',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const mainItemsText = mainItems.length > 0
    ? `The main list already covers: ${mainItems.join(', ')}.`
    : ''

  const prompt = `You are an expert content writer. Write an "Honorable Mentions" section for a listicle about "${context.topic}".

H2 HEADING: "${h2Title}"

${mainItemsText}

REQUIREMENTS:
- Generate 3-4 H3 items (NOT just 1-2, generate AT LEAST 3)
- Each H3: 30-40 characters (item name)
- Each paragraph: 40-50 words explaining why it's notable
- These are good options that just missed the main list

CRITICAL: You MUST generate 3-4 separate <div class="scai-honorable-item"> blocks.

CRITICAL STYLING:
- Plain black text only
- NO colors

OUTPUT FORMAT:
Return ONLY the HTML with 3-4 items.

\`\`\`html
<section data-component="scai-honorable-mentions" class="scai-honorable-mentions">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <div class="scai-honorable-item">
    <h3 class="scai-honorable-h3">First Item Name (30-40 chars)</h3>
    <p>40-50 word description of why this item is notable and worth considering despite not making the main list.</p>
  </div>
  <div class="scai-honorable-item">
    <h3 class="scai-honorable-h3">Second Item Name (30-40 chars)</h3>
    <p>40-50 word description explaining the merits of this second option.</p>
  </div>
  <div class="scai-honorable-item">
    <h3 class="scai-honorable-h3">Third Item Name (30-40 chars)</h3>
    <p>40-50 word description of why this third option deserves mention.</p>
  </div>
  <div class="scai-honorable-item">
    <h3 class="scai-honorable-h3">Fourth Item Name (30-40 chars, optional)</h3>
    <p>40-50 word description of this fourth honorable mention if applicable.</p>
  </div>
</section>
\`\`\`

Write 3-4 honorable mention items now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'honorable-mentions',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY CHOOSE LOCAL GENERATOR (Local)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateWhyChooseLocal(
  context: ArticleContext,
  location: string = 'your area'
): Promise<GeneratedContent> {
  // Generate H2 with proper 40-50 character limit per documentation
  const h2Title = await generateSpecialH2WithAI('why-choose-local', context.h1Variation, context.topic)

  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonArrayFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('why-choose-local')

    if (variation) {
      // Extract wrapper class from variation HTML - NOTE: variations.ts uses scai-why-local-[abc]
      const classMatch = variation.html.match(/class="(scai-why-local-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-why-local-a'

      // Detect if variation uses a side image layout - variations.ts uses scai-local-image
      const hasImageLayout = variation.html.includes('scai-local-image')

      // Ask LLM for structured reasons data
      const prompt = `Write reasons to choose local ${context.topic} services in ${location}.

REQUIREMENTS:
- 4-5 benefits of choosing local
- Each benefit: 8-12 words
- Focus on: community, personalization, local economy, faster response

OUTPUT FORMAT:
Return ONLY a JSON array of reason strings. No explanation.

Example:
["Personalized service tailored to your specific needs", "Supporting local businesses strengthens your community", "Faster response times and more flexible scheduling"]

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const reasons = parseJsonArrayFromLlm<string>(response, (text) => {
        return text.split('\n')
          .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
          .filter(l => l.length > 5 && l.length < 100)
      })

      if (reasons.length > 0) {
        const listItems = reasons.slice(0, 5).map(r => `<li>${r}</li>`).join('\n')

        // Create placeholder image URL
        const imagePlaceholder = 'https://placehold.co/300x400/e5e7eb/6b7280?text=Local+Service'

        let html: string

        // Generate HTML structure that matches each variation exactly
        if (wrapperClass === 'scai-why-local-a') {
          // Variation A: h2 outside, then content-div with image FIRST, list second
          html = `<section class="${wrapperClass}" data-component="scai-why-local-section">
<h2 class="scai-local-h2" data-component="scai-local-h2">${h2Title}</h2>
<div class="scai-local-content">
<div class="scai-local-image" data-component="scai-local-image">
<img src="${imagePlaceholder}" alt="Local service provider" />
</div>
<ul class="scai-local-list" data-component="scai-local-list">
${listItems}
</ul>
</div>
</section>`
        } else if (wrapperClass === 'scai-why-local-b') {
          // Variation B: content-div (with h2 + list inside) FIRST, image OUTSIDE last
          html = `<section class="${wrapperClass}" data-component="scai-why-local-section">
<div class="scai-local-content">
<h2 class="scai-local-h2" data-component="scai-local-h2">${h2Title}</h2>
<ul class="scai-local-list" data-component="scai-local-list">
${listItems}
</ul>
</div>
<div class="scai-local-image" data-component="scai-local-image">
<img src="${imagePlaceholder}" alt="Local service provider" />
</div>
</section>`
        } else if (wrapperClass === 'scai-why-local-c') {
          // Variation C: image FIRST (outside content-div), then content-div with h2+list
          html = `<section class="${wrapperClass}" data-component="scai-why-local-section">
<div class="scai-local-image" data-component="scai-local-image">
<img src="${imagePlaceholder}" alt="Local service provider" />
</div>
<div class="scai-local-content">
<h2 class="scai-local-h2" data-component="scai-local-h2">${h2Title}</h2>
<ul class="scai-local-list" data-component="scai-local-list">
${listItems}
</ul>
</div>
</section>`
        } else {
          // Fallback: simple list without image
          html = `<section class="${wrapperClass}" data-component="scai-why-local-section">
<h2 class="scai-local-h2" data-component="scai-local-h2">${h2Title}</h2>
<ul class="scai-local-list" data-component="scai-local-list">
${listItems}
</ul>
</section>`
        }

        return {
          componentId: 'why-choose-local',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert local SEO writer. Write a "Why Choose Local" section for ${context.topic} in ${location}.

H2 HEADING: "${h2Title}"

REQUIREMENTS:
- 4-5 bullet points
- Each bullet: 8-12 words explaining a benefit of choosing local
- Focus on community, personalization, support local economy, faster response

CRITICAL STYLING:
- Plain black text only
- NO colors

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<section data-component="scai-why-choose-local" class="scai-why-choose-local">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <div class="scai-why-choose-local-content">
    <div class="scai-why-choose-local-image">
      <img src="https://placehold.co/300x400/e5e7eb/6b7280?text=Local+Service" alt="Local service provider" />
    </div>
    <div class="scai-why-choose-local-list">
      <ul>
        <li>Personalized service tailored to your specific needs</li>
        <li>Supporting local businesses strengthens your community</li>
        <li>Faster response times and more flexible scheduling</li>
        <li>Face-to-face communication builds trust and accountability</li>
      </ul>
    </div>
  </div>
</section>
\`\`\`

Write the why choose local section now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'why-choose-local',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INFO BOX GENERATOR (Local)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Service Info Data Interface
 * Data should come from user settings/form, NOT from LLM
 */
export interface ServiceInfoData {
  businessName?: string
  hours?: string
  serviceArea?: string
  phone?: string
  email?: string
  website?: string
}

/**
 * Local Business Info — user-provided fields for local SEO articles.
 * All fields optional; internationally flexible (no US-centric assumptions).
 * Flows: Form → API → Orchestrator → Service Info component.
 */
export interface LocalBusinessInfo {
  businessName?: string
  phone?: string
  hours?: string            // Free-text, e.g. "Mon–Fri 8am–6pm"
  city?: string
  stateRegion?: string      // State / Province / Region — location-agnostic
  postalCode?: string       // Optional — not all countries use postal codes
  servicesOffered?: string  // Comma-separated or free-text
  email?: string
  website?: string
  gbpUrl?: string           // Google Business Profile URL — stored for future auto-fill
}

/**
 * Commercial Product/Service Info — user-provided fields for commercial articles.
 * When provided, replaces the AI extraction step in the orchestrator.
 * All fields optional — partial info still helps AI generation.
 * Flows: Form → API → Orchestrator → CommercialContext.
 */
export interface CommercialProductInfo {
  productName?: string        // "Acme CRM Pro"
  category?: string           // "SaaS", "consulting"
  targetAudience?: string     // "small business owners"
  painPoint?: string          // "losing track of customers"
  keyBenefits?: string        // comma-separated free text
  keyFeatures?: string        // comma-separated free text
  uniqueValue?: string        // USP
  ctaSuggestion?: string      // "Start Free Trial"
  pricePosition?: 'budget' | 'mid-range' | 'premium' | 'enterprise'
}

/**
 * Comparison Items Info — user-provided fields for comparison articles.
 * When provided, replaces the AI extraction step for item identification.
 * Flows: Form → API → Orchestrator → ComparisonContext.
 */
export interface ComparisonItemsInfo {
  itemA?: string              // "iPhone 15 Pro"
  itemB?: string              // "Samsung Galaxy S24"
  category?: string           // "smartphones"
  criteria?: string           // comma-separated: "Camera, Battery, Price"
}

/**
 * Review Product Info — user-provided fields for review articles.
 * When provided, replaces topic-as-productName default in the orchestrator.
 * Flows: Form → API → Orchestrator → ReviewContext.
 */
export interface ReviewProductInfo {
  productName?: string        // "Sony WH-1000XM5"
  category?: string           // "wireless headphones"
  pricePoint?: 'budget' | 'mid-range' | 'premium'
}

/**
 * Unified article-type context — bundles all type-specific user inputs.
 * Carried through the pipeline as a single field to avoid parameter bloat.
 */
export interface ArticleTypeContext {
  localBusinessInfo?: LocalBusinessInfo
  commercialInfo?: CommercialProductInfo
  comparisonInfo?: ComparisonItemsInfo
  reviewInfo?: ReviewProductInfo
}

/**
 * Generate Service Info Box (Local Articles)
 *
 * Uses variation templates from variations.ts
 * Data comes from settings/form submission
 */
export function generateServiceInfo(
  context: ArticleContext,
  serviceData: ServiceInfoData,
  location: string = 'your area'
): GeneratedContent {
  // Pick a random variation
  const { pickRandomVariation } = require('@/lib/utils/variation-picker')
  const variation = pickRandomVariation('service-info-box')

  // Build service info rows
  const rows: { label: string; value: string }[] = []

  if (serviceData.businessName) {
    rows.push({ label: 'Business', value: serviceData.businessName })
  }
  rows.push({
    label: 'Hours',
    value: serviceData.hours || 'Monday-Friday: 8AM-6PM, Saturday: 9AM-3PM'
  })
  rows.push({
    label: 'Service Area',
    value: serviceData.serviceArea || `${location} and surrounding areas`
  })
  if (serviceData.phone) {
    rows.push({ label: 'Phone', value: serviceData.phone })
  }
  if (serviceData.email) {
    rows.push({ label: 'Email', value: serviceData.email })
  }
  if (serviceData.website) {
    rows.push({ label: 'Website', value: `<a href="${serviceData.website}" target="_blank" rel="noopener">${serviceData.website}</a>` })
  }

  let html: string
  let variationCss: string | undefined

  if (variation) {
    // Use the variation template structure
    variationCss = variation.css

    // Extract wrapper class from variation HTML
    const classMatch = variation.html.match(/class="(scai-service-info-[a-z]+)"/)
    const wrapperClass = classMatch ? classMatch[1] : 'scai-service-info-a'

    // Check if variation uses grid layout (variation C) or row layout (A, B)
    const isGridLayout = variation.html.includes('scai-info-grid')

    if (isGridLayout) {
      // Grid layout (variation C)
      const itemsHtml = rows.map(row => `
<div class="scai-info-item">
<span class="scai-info-label">${row.label}</span>
<span class="scai-info-value">${row.value}</span>
</div>`).join('')

      html = `<div class="${wrapperClass}" data-component="scai-service-info-box">
<div class="scai-info-title">Service Information</div>
<div class="scai-info-grid">
${itemsHtml}
</div>
</div>`
    } else {
      // Row layout (variations A, B)
      const rowsHtml = rows.map(row =>
        `<div class="scai-info-row"><span class="scai-info-label">${row.label}</span><span class="scai-info-value">${row.value}</span></div>`
      ).join('\n')

      html = `<div class="${wrapperClass}" data-component="scai-service-info-box">
<div class="scai-info-title">Service Information</div>
${rowsHtml}
</div>`
    }
  } else {
    // Fallback to basic table if no variation found
    html = `
<section data-component="scai-service-info" class="scai-service-info">
  <h2 class="scai-h2" data-component="scai-h2">Service Information</h2>
  <table class="scai-service-table">
    <tbody>
      ${rows.map(row => `<tr><td>${row.label}</td><td>${row.value}</td></tr>`).join('\n      ')}
    </tbody>
  </table>
</section>`.trim()
  }

  return {
    componentId: 'service-info',
    html,
    wordCount: countWords(html),
    variationCss
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUTRITION TABLE GENERATOR (Recipe)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateNutritionTable(
  context: ArticleContext,
  servings: number = 4
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    // Import variation picker
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')

    // Pick a random variation template
    const variation = pickRandomVariation('nutrition-table')

    if (variation) {
      const classMatch = variation.html.match(/class="(scai-nutrition-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-nutrition-a'

      const prompt = `You are a culinary nutrition expert. Generate nutrition facts for "${context.topic}" (${servings} servings).

REQUIREMENTS:
- Standard nutrition label format
- Use realistic values for this type of dish
- Per serving values

OUTPUT FORMAT:
Return ONLY a JSON object with nutrition values. No explanation.

Example:
{
  "calories": "250",
  "totalFat": "12g",
  "saturatedFat": "4g",
  "carbohydrates": "32g",
  "fiber": "3g",
  "sugar": "8g",
  "protein": "8g",
  "sodium": "450mg",
  "cholesterol": "25mg"
}

Generate nutrition facts now:`

      const response = await callGemini(prompt)

      // Parse the JSON
      const defaultNutrition = {
        calories: "250",
        totalFat: "12g",
        carbohydrates: "30g",
        protein: "8g",
        sodium: "400mg",
        fiber: "3g"
      }
      const nutrition = parseJsonObjectFromLlm<Record<string, string>>(response, () => defaultNutrition) || defaultNutrition

      const html = `<div class="${wrapperClass}" data-component="scai-nutrition-section">
<h2 class="scai-nutrition-h2">Nutrition Facts</h2>
<table class="scai-nutrition-table">
<tr><td>Calories per Serving</td><td>${nutrition.calories || '250'}</td></tr>
<tr><td>Total Fat</td><td>${nutrition.totalFat || '12g'}</td></tr>
<tr><td>Carbohydrates</td><td>${nutrition.carbohydrates || '30g'}</td></tr>
<tr><td>Protein</td><td>${nutrition.protein || '8g'}</td></tr>
<tr><td>Sodium</td><td>${nutrition.sodium || '400mg'}</td></tr>
<tr><td>Fiber</td><td>${nutrition.fiber || '3g'}</td></tr>
<tr><td colspan="2" style="text-align: left; font-size: 0.75rem; color: #666; padding-top: 1rem; border-top: 1px solid #ddd;">*Based on ${servings} servings. Daily values may vary.</td></tr>
</table>
</div>`

      return {
        componentId: 'nutrition-table',
        html,
        wordCount: countWords(html),
        variationCss: variation.css
      }
    }
  }

  // Fallback
  const prompt = `You are a culinary nutrition expert. Write a nutrition facts table for "${context.topic}" (${servings} servings).

REQUIREMENTS:
- Standard nutrition label format
- Include: Calories, Fat, Carbs, Protein, Fiber, Sodium, Sugar
- Use realistic values for this type of dish
- Per serving values
- Total ~100 words

CRITICAL STYLING:
- Plain black text only
- Clean table format
- NO colors

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-nutrition-table" class="scai-nutrition-table">
  <h4 class="scai-nutrition-title">Nutrition Facts (Per Serving)</h4>
  <table>
    <tbody>
      <tr><td>Calories</td><td>XXX</td></tr>
      <tr><td>Total Fat</td><td>Xg</td></tr>
      <tr><td>Saturated Fat</td><td>Xg</td></tr>
      <tr><td>Carbohydrates</td><td>Xg</td></tr>
      <tr><td>Fiber</td><td>Xg</td></tr>
      <tr><td>Sugar</td><td>Xg</td></tr>
      <tr><td>Protein</td><td>Xg</td></tr>
      <tr><td>Sodium</td><td>Xmg</td></tr>
    </tbody>
  </table>
  <p class="scai-nutrition-note">*Based on ${servings} servings</p>
</div>
\`\`\`

Write the nutrition table now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'nutrition-table',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATING PARAGRAPH GENERATOR (Review)
// Per documentation: Rating H2 is 30 characters max (unique to Review articles)
// This component now creates its own H2 to enforce the 30-char limit
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateRatingParagraph(
  context: ArticleContext,
  score: number = 8.5
): Promise<GeneratedContent> {
  // Generate H2 with proper 30-character limit per documentation
  const h2Title = await generateSpecialH2WithAI('rating', context.h1Variation, context.topic)

  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('rating')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-rating-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-rating-a'

      // Ask LLM for structured rating content
      const prompt = `Write a rating verdict for "${context.topic}" with score ${score}/10.

REQUIREMENTS:
- Justify the score with 2-3 key reasons
- Mention who this product is best for
- Be honest about any limitations

OUTPUT FORMAT:
Return ONLY a JSON object. No explanation.

Example:
{
  "score": ${score},
  "stars": "★★★★☆",
  "summary": "Brief 2-3 sentence summary justifying the score and mentioning key strengths/weaknesses.",
  "bestFor": "This product is ideal for users who prioritize..."
}

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonObjectFromLlm<{ score: number, stars?: string, summary: string, bestFor?: string }>(response, (text) => {
        // Fallback: use the text as summary
        return { score, summary: text.substring(0, 300) }
      })

      if (parsed) {
        // Generate star display from score
        const fullStars = Math.floor(parsed.score || score)
        const hasHalfStar = (parsed.score || score) % 1 >= 0.5
        const starDisplay = '★'.repeat(Math.min(fullStars, 10)) + (hasHalfStar ? '½' : '') + '☆'.repeat(Math.max(0, 10 - fullStars - (hasHalfStar ? 1 : 0)))

        const html = `<div class="${wrapperClass}" data-component="scai-rating-section">
<h2 class="scai-rating-h2" data-component="scai-rating-h2">${h2Title}</h2>
<div class="scai-rating-body">
<div class="scai-rating-left">
<span class="scai-rating-score" data-component="scai-rating-score">${(parsed.score || score).toFixed(1)}</span>
<span class="scai-rating-max">/10</span>
</div>
<div class="scai-rating-right">
<span class="scai-rating-stars">${starDisplay.substring(0, 5)}</span>
<p class="scai-rating-summary" data-component="scai-rating-summary">${parsed.summary}</p>
${parsed.bestFor ? `<p class="scai-rating-bestfor">${parsed.bestFor}</p>` : ''}
</div>
</div>
</div>`

        return {
          componentId: 'rating-paragraph',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert product reviewer. Write a rating paragraph for "${context.topic}" with a score of ${score}/10.

H2 HEADING: "${h2Title}"

REQUIREMENTS:
- Total ~100 words
- Start with the score prominently
- Justify the score with 2-3 key reasons
- Mention who this product is best for
- Be honest about any limitations that affected the score

CRITICAL STYLING:
- Plain black text only
- NO colored rating stars or badges

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<section data-component="scai-rating" class="scai-rating">
  <h2 class="scai-h2" data-component="scai-h2">${h2Title}</h2>
  <div class="scai-score">
    <span class="scai-score-value">${score}</span>
    <span class="scai-score-max">/10</span>
  </div>
  <p class="scai-rating-text">Explanation of why ${context.topic} earned this score. Key strengths that contributed to the rating. Any weaknesses that prevented a higher score. Who this product is ideal for.</p>
</section>
\`\`\`

Write the rating paragraph now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'rating-paragraph',
    html,
    wordCount: countWords(html)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPS PARAGRAPH GENERATOR (Recipe)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateTipsParagraph(
  context: ArticleContext,
  wordTarget: number = 150
): Promise<GeneratedContent> {
  // Only use template mode if explicitly enabled (default is template)
  const useTemplateMode = true /* always use template mode */

  if (useTemplateMode) {
    const { pickRandomVariation, parseJsonObjectFromLlm } = await import('@/lib/utils/variation-picker')
    const variation = pickRandomVariation('recipe-tips')

    if (variation) {
      // Extract wrapper class from variation HTML
      const classMatch = variation.html.match(/class="(scai-tips-section-[abc])"/i)
      const wrapperClass = classMatch ? classMatch[1] : 'scai-tips-section-a'

      // Ask LLM for structured tips content
      const prompt = `Write cooking tips for "${context.topic}".

REQUIREMENTS:
- 3 categories: Preparation, Cooking Technique, Serving/Storage
- Each category: 40-50 words of practical, actionable advice

OUTPUT FORMAT:
Return ONLY a JSON object. No explanation.

Example:
{
  "prep": "Helpful preparation advice that saves time and improves results. Include specific tips for this recipe.",
  "cooking": "Technique advice for getting the best results during cooking. Temperature and timing tips.",
  "serving": "How to serve and store for best results. Presentation and leftover tips."
}

Generate now:`

      const response = await callGemini(prompt)

      // Parse JSON response
      const parsed = parseJsonObjectFromLlm<{ prep: string, cooking: string, serving: string }>(response, (text) => {
        // Fallback: split text into three parts
        const paragraphs = text.split(/\n\n+/).filter(p => p.length > 20)
        if (paragraphs.length >= 3) {
          return { prep: paragraphs[0], cooking: paragraphs[1], serving: paragraphs[2] }
        }
        // Fallback: Use full text for all tips if not enough paragraphs
        if (text.length > 50) {
          const third = Math.floor(text.length / 3)
          return {
            prep: text.slice(0, third).trim() || 'Ensure all ingredients are at room temperature for best results.',
            cooking: text.slice(third, third * 2).trim() || 'Follow the cooking times closely and check for doneness early.',
            serving: text.slice(third * 2).trim() || 'Serve immediately for best flavor and texture.'
          }
        }
        return null
      })

      // Validate all required properties exist with fallbacks
      if (parsed) {
        const safeParsed = {
          prep: parsed.prep || 'Ensure all ingredients are at room temperature before starting.',
          cooking: parsed.cooking || 'Follow the cooking times closely for best results.',
          serving: parsed.serving || 'Serve immediately and store leftovers properly.'
        }

        const html = `<div class="${wrapperClass}" data-component="scai-tips-section">
<p><strong>Prep Tips:</strong> ${safeParsed.prep}</p>
<p><strong>Cooking Tips:</strong> ${safeParsed.cooking}</p>
<p><strong>Serving Tips:</strong> ${safeParsed.serving}</p>
</div>`

        return {
          componentId: 'tips-paragraph',
          html,
          wordCount: countWords(html),
          variationCss: variation.css
        }
      }
    }
  }

  // Fallback: Original LLM-generated HTML behavior
  const prompt = `You are an expert chef. Write cooking tips for "${context.topic}".

REQUIREMENTS:
- Total ~${wordTarget} words (3 paragraphs of ~50 words each)
- Paragraph 1: Preparation tips
- Paragraph 2: Cooking technique tips
- Paragraph 3: Serving/storage tips
- Include practical, actionable advice

CRITICAL STYLING:
- Plain black text only
- NO colors

OUTPUT FORMAT:
Return ONLY the HTML.

\`\`\`html
<div data-component="scai-tips-paragraph" class="scai-tips">
  <p><strong>Prep Tips:</strong> Helpful preparation advice for ${context.topic} that saves time and improves results.</p>
  <p><strong>Cooking Tips:</strong> Technique advice for getting the best results during cooking.</p>
  <p><strong>Serving Tips:</strong> How to serve and store for best results.</p>
</div>
\`\`\`

Write the tips paragraph now:`

  const response = await callGemini(prompt)
  const html = extractHtml(response)

  return {
    componentId: 'tips-paragraph',
    html,
    wordCount: countWords(html)
  }
}
