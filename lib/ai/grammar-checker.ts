/**
 * Grammar Checking & Correction Layer
 * 
 * Post-generation grammar correction using AI models.
 * Applies targeted corrections to titles, headings, and content.
 */

import { generateText } from 'ai'
import { executeWithFallback } from './providers'
import type { AIProvider } from './providers'
import type { CostTrackingContext } from '@/lib/services/cost-tracking-service'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ContentType = 'h1' | 'h2' | 'paragraph' | 'section-paragraph' | 'component' | 'list-item' | 'faq-answer'

export interface GrammarCheckOptions {
  /** Content type being checked */
  type: ContentType
  /** AI provider preference */
  provider?: AIProvider
  /** Additional context about the content */
  context?: string
  /** Whether to log corrections */
  logCorrections?: boolean
  /** Cost tracking context */
  costTracking?: CostTrackingContext
}

export interface GrammarCheckResult {
  /** Original text */
  original: string
  /** Corrected text */
  corrected: string
  /** Whether any corrections were made */
  hasChanges: boolean
  /** List of changes made (if any) */
  changes?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR CORRECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Correct grammar, spelling, and punctuation errors in text
 */
export async function correctGrammar(
  text: string,
  options: GrammarCheckOptions
): Promise<string> {
  const { type, provider, context, logCorrections = true, costTracking } = options

  // Skip if text is too short
  if (text.length < 3) return text

  const prompt = buildCorrectionPrompt(text, type, context)

  try {
    const { result } = await executeWithFallback(
      async (model) => {
        return generateText({
          model,
          prompt,
          temperature: 0.3, // Low temperature for precision
        })
      },
      {
        preferredProvider: provider,
        tier: 'fast', // Use fast models for efficiency
        operationName: `grammar-check-${type}`,
        costTracking,
      }
    )

    const corrected = result.text.trim()

    // Log if changes were made
    if (logCorrections && corrected !== text) {
      console.log(`[Grammar] ${type} corrected:`)
      console.log(`[Grammar]   Original: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`)
      console.log(`[Grammar]   Corrected: "${corrected.substring(0, 80)}${corrected.length > 80 ? '...' : ''}"`)
    }

    return corrected
  } catch (error) {
    console.error(`[Grammar] Correction failed for ${type}:`, error)
    // Return original text if correction fails
    return text
  }
}

/**
 * Correct grammar with detailed result
 */
export async function correctGrammarDetailed(
  text: string,
  options: GrammarCheckOptions
): Promise<GrammarCheckResult> {
  const corrected = await correctGrammar(text, options)

  return {
    original: text,
    corrected,
    hasChanges: corrected !== text,
    changes: corrected !== text ? [
      `Changed "${text}" to "${corrected}"`
    ] : undefined
  }
}

/**
 * Batch correct multiple texts (useful for H2 lists, FAQ answers, etc.)
 */
export async function correctGrammarBatch(
  texts: string[],
  options: Omit<GrammarCheckOptions, 'context'>
): Promise<string[]> {
  const { logCorrections = false } = options

  if (logCorrections) {
    console.log(`[Grammar] Batch correcting ${texts.length} items...`)
  }

  // Process in parallel for speed
  const correctedTexts = await Promise.all(
    texts.map(text => correctGrammar(text, { ...options, logCorrections: false }))
  )

  if (logCorrections) {
    const changedCount = correctedTexts.filter((c, i) => c !== texts[i]).length
    if (changedCount > 0) {
      console.log(`[Grammar] Batch correction: ${changedCount}/${texts.length} items corrected`)
    }
  }

  return correctedTexts
}

/**
 * Correct grammar in section content that has 3 paragraphs
 * Processes each paragraph individually and preserves structure
 */
export async function correctSectionParagraphs(
  sectionText: string,
  options: Omit<GrammarCheckOptions, 'type'>
): Promise<string> {
  const { provider, context, logCorrections = true, costTracking } = options

  // Split into paragraphs (separated by double newlines)
  const paragraphs = sectionText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (paragraphs.length === 0) return sectionText

  if (logCorrections) {
    console.log(`[Grammar] Correcting section with ${paragraphs.length} paragraphs...`)
  }

  // Correct each paragraph individually
  const correctedParagraphs = await Promise.all(
    paragraphs.map(async (para, i) => {
      const paraContext = context ? `${context}. Paragraph ${i + 1} of ${paragraphs.length}` : `Paragraph ${i + 1} of ${paragraphs.length}`
      return correctGrammar(para, {
        type: 'paragraph',
        provider,
        context: paraContext,
        logCorrections: false, // We'll log at section level
        costTracking: options.costTracking,
      })
    })
  )

  // Reconstruct with double newlines between paragraphs
  const result = correctedParagraphs.join('\n\n')

  if (logCorrections) {
    const changedCount = correctedParagraphs.filter((c, i) => c !== paragraphs[i]).length
    if (changedCount > 0) {
      console.log(`[Grammar] Section correction: ${changedCount}/${paragraphs.length} paragraphs corrected`)
    }
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

function buildCorrectionPrompt(text: string, type: ContentType, context?: string): string {
  const basePrompt = `Proofread and correct any grammar, spelling, or punctuation errors in this ${type}.

ORIGINAL TEXT:
${text}

${context ? `CONTEXT: ${context}\n\n` : ''}CRITICAL RULES:
- Fix ONLY grammar, spelling, punctuation errors
- Do NOT change meaning, tone, or style
- Do NOT add or remove content
- Do NOT rewrite or rephrase unnecessarily
- Keep the same length (±5%)
- Preserve all formatting
- If text is already correct, return it unchanged
${getTypeSpecificRules(type)}

Return ONLY the corrected text with no explanations or markup.`

  return basePrompt
}

function getTypeSpecificRules(type: ContentType): string {
  switch (type) {
    case 'h1':
      return `
H1 SPECIFIC:
- Ensure proper capitalization (title case or sentence case)
- No period at the end
- CRITICAL QUESTION MARK RULE:
  * If H1 starts with: What, How, Why, Which, When, Where, Who, Whose, Whom
  * And it does NOT already end with "?"
  * YOU MUST ADD "?" at the end
  * Example: "How Effective Is the Air Fryer" → "How Effective Is the Air Fryer?"
- Check for typos in keywords`

    case 'h2':
      return `
H2 SPECIFIC:
- Ensure proper capitalization
- No period at the end
- CRITICAL QUESTION MARK RULE:
  * If H2 starts with: What, How, Why, Which, When, Where, Who, Whose, Whom
  * And it does NOT already end with "?"
  * YOU MUST ADD "?" at the end
  * Example: "What Factors Influence Performance" → "What Factors Influence Performance?"
  * Example: "How Does This Work" → "How Does This Work?"
- Do NOT remove question marks if already present
- Check for consistency with article format
- Maintain parallel structure if part of a list`

    case 'paragraph':
      return `
PARAGRAPH SPECIFIC:
- Ensure complete sentences with proper punctuation
- Check subject-verb agreement
- Fix run-on sentences or fragments
- Proper comma usage
- No double spaces`

    case 'section-paragraph':
      return `
SECTION PARAGRAPH SPECIFIC:
- This text contains 3 SEPARATE paragraphs separated by blank lines
- PRESERVE the blank lines between paragraphs (double newlines)
- Correct each paragraph individually
- Do NOT merge paragraphs together
- Each paragraph should be 250-300 characters
- Ensure complete sentences with proper punctuation
- Check subject-verb agreement
- Fix run-on sentences or fragments
- Proper comma usage
- No double spaces`

    case 'component':
      return `
COMPONENT SPECIFIC:
- Ensure clarity and conciseness
- Check for proper list formatting
- Verify all items are complete
- Maintain consistent structure`

    case 'list-item':
      return `
LIST ITEM SPECIFIC:
- Ensure parallel structure with other items
- Consistent punctuation (all items should match)
- Complete thoughts
- Concise phrasing`

    case 'faq-answer':
      return `
FAQ ANSWER SPECIFIC:
- Clear, direct answer
- Complete sentences
- Helpful tone
- Proper punctuation`

    default:
      return ''
  }
}
