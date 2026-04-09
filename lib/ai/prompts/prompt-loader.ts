/**
 * Prompt Template Loader
 * 
 * Loads and hydrates prompt templates for AI generation.
 * Supports versioning and article-type-specific templates.
 */

import {
  FORBIDDEN_PHRASES,
  APPROVED_SYMBOLS,
  SYMBOL_USAGE_RULES,
  CHARACTER_LIMITS,
  HEADER_CONSISTENCY_RULES,
  TONE_DEFINITIONS,
  STYLE_DEFINITIONS,
  DEFAULT_TONE_STYLE,
  type ToneType,
  type StyleType,
  type VariationType,
} from '../rules/forbidden-content'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PromptTemplate {
  version: string
  category: PromptCategory
  articleType: string
  content: string
  variables: string[]
  description?: string
}

export type PromptCategory =
  | 'content_generation'
  | 'heading_generation'
  | 'keyword_expansion'
  | 'component_generation'
  | 'validation'

export interface PromptVariables {
  keyword?: string
  topic?: string
  h1Type?: VariationType
  intent?: string
  wordCount?: number
  tone?: ToneType
  style?: StyleType
  keywordDensity?: string
  clusterKeywords?: string[]
  location?: string
  productDataSource?: string
  [key: string]: string | number | string[] | undefined
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE INJECTION BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the forbidden phrases rules block for injection into prompts
 */
export function getForbiddenPhrasesBlock(): string {
  return `
================================================================================
                       FORBIDDEN PHRASES (CRITICAL)
================================================================================
CLOSING H2 - NEVER use these words/phrases:
${FORBIDDEN_PHRASES.closingH2.map(p => `- "${p}"`).join('\n')}

INSTEAD: Use descriptive, elaborative headings that match H1 type:
- Question H1 → "Which Option Is Right for You?"
- Statement H1 → "Our Top Pick for Most Buyers"
- Listicle H1 → "The Best Choice Overall"

CLOSING PARAGRAPH - NEVER start with:
${FORBIDDEN_PHRASES.closingParagraphStart.map(p => `- "${p}"`).join('\n')}

INSTEAD: End naturally with value reinforcement, not announcements.

H2 HEADINGS - NEVER include:
- Conjunctions "and" or "or" (each H2 must be single-focused)
- Colons (:) in heading text
- Multiple questions combined in one H2

H1 HEADINGS - NEVER use generic filler:
${FORBIDDEN_PHRASES.h1Generic.map(p => `- "${p}"`).join('\n')}

FAQ H3 QUESTIONS - NEVER:
- Combine multiple questions in a single FAQ H3
- Each FAQ must be a single, focused question
`
}

/**
 * Generate the symbol rules block for injection into prompts
 */
export function getSymbolRulesBlock(): string {
  return `
================================================================================
                        SYMBOL AND EMOJI RULES (STRICT)
================================================================================
EMOJI RESTRICTION:
- NO EMOJIS - Do not use any emojis anywhere in the article content
- This applies to headings, paragraphs, lists, and all text

APPROVED SYMBOLS ONLY:
| Symbol | Character | Allowed Usage |
|--------|-----------|---------------|
| Checkmark | ${APPROVED_SYMBOLS.checkmark} | Feature lists, completion indicators |
| Bullet | ${APPROVED_SYMBOLS.bullet} | Unordered lists (standard) |
| Star (filled) | ${APPROVED_SYMBOLS.starFilled} | Ratings ONLY |
| Star (empty) | ${APPROVED_SYMBOLS.starEmpty} | Ratings ONLY |
| Plus | ${APPROVED_SYMBOLS.plus} | Pros lists ONLY |
| Minus | ${APPROVED_SYMBOLS.minus} | Cons lists ONLY |
`
}

/**
 * Generate the header consistency rules block for a specific variation
 */
export function getHeaderConsistencyBlock(variation: VariationType): string {
  const rules = HEADER_CONSISTENCY_RULES[variation]

  return `
================================================================================
                         HEADER CONSISTENCY RULE (CRITICAL)
================================================================================
H1 FORMAT: ${variation.toUpperCase()}
${rules.h1}

ALL H2 headings MUST match the H1 variant type:
${rules.h2}

CLOSING H2:
${rules.closingH2}

EXAMPLES:
- H1: ${rules.examples.h1.map(e => `"${e}"`).join(', ')}
- H2: ${rules.examples.h2.map(e => `"${e}"`).join(', ')}
- Closing H2: ${rules.examples.closingH2.map(e => `"${e}"`).join(', ')}
`
}

/**
 * Generate the tone and style rules block
 */
export function getToneStyleBlock(tone: ToneType, style: StyleType): string {
  const toneInfo = TONE_DEFINITIONS[tone]
  const styleInfo = STYLE_DEFINITIONS[style]

  return `
================================================================================
                         TONE AND STYLE BEHAVIOR
================================================================================
TONE: ${toneInfo.name}
Apply this tone consistently throughout ALL content:
- Characteristics: ${toneInfo.characteristics}
- Voice: ${toneInfo.voice}

STYLE: ${styleInfo.name}
Adjust sentence structure based on this style:
- Words per sentence: ${styleInfo.wordsPerSentence.min}-${styleInfo.wordsPerSentence.max} words
- Characteristics: ${styleInfo.characteristics}
`
}

/**
 * Generate the character limits block
 */
export function getCharacterLimitsBlock(): string {
  return `
================================================================================
                         CHARACTER LIMITS (STRICT)
================================================================================
HEADINGS:
- H1: ${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} characters
- H2: ${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} characters
- Closing H2: ${CHARACTER_LIMITS.closingH2.min}-${CHARACTER_LIMITS.closingH2.max} characters
- FAQ H2: Max ${CHARACTER_LIMITS.faqH2.max} characters
- FAQ H3: ${CHARACTER_LIMITS.faqH3.min}-${CHARACTER_LIMITS.faqH3.max} characters

SPECIAL H2s:
- Rating H2: Max ${CHARACTER_LIMITS.ratingH2.max} characters
- Honorable Mentions H2: ${CHARACTER_LIMITS.honorableMentionsH2.min}-${CHARACTER_LIMITS.honorableMentionsH2.max} characters
- Why Choose Local H2: ${CHARACTER_LIMITS.whyChooseLocalH2.min}-${CHARACTER_LIMITS.whyChooseLocalH2.max} characters
- Quick Facts H2: ${CHARACTER_LIMITS.quickFactsH2.min}-${CHARACTER_LIMITS.quickFactsH2.max} characters

META:
- Meta Title: ${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} characters
- Meta Description: ${CHARACTER_LIMITS.metaDescription.min}-${CHARACTER_LIMITS.metaDescription.max} characters

IMAGE ALT:
- Featured Image Alt: ${CHARACTER_LIMITS.featuredImageAlt.min}-${CHARACTER_LIMITS.featuredImageAlt.max} characters
- H2 Image Alt: ${CHARACTER_LIMITS.h2ImageAlt.min}-${CHARACTER_LIMITS.h2ImageAlt.max} characters
`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT HYDRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hydrate a template string with variable values
 * Supports {{variable}} syntax
 */
export function hydratePrompt(
  template: string,
  variables: PromptVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    if (value === undefined) return match // Keep unresolved variables

    if (Array.isArray(value)) {
      return value.join(', ')
    }

    return String(value)
  })
}

/**
 * Extract variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnhancedPromptOptions {
  basePrompt: string
  articleType: string
  variation?: VariationType
  tone?: ToneType
  style?: StyleType
  includeRules?: {
    forbidden?: boolean
    symbols?: boolean
    headerConsistency?: boolean
    toneStyle?: boolean
    characterLimits?: boolean
  }
}

/**
 * Build an enhanced prompt with injected rules
 * 
 * @example
 * ```typescript
 * const prompt = buildEnhancedPrompt({
 *   basePrompt: 'Generate content for an affiliate article about {{keyword}}',
 *   articleType: 'affiliate',
 *   variation: 'question',
 *   tone: 'persuasive',
 *   style: 'balanced',
 *   includeRules: { forbidden: true, symbols: true, headerConsistency: true },
 * })
 * ```
 */
export function buildEnhancedPrompt(options: EnhancedPromptOptions): string {
  const {
    basePrompt,
    articleType,
    variation = 'statement',
    tone,
    style,
    includeRules = {
      forbidden: true,
      symbols: true,
      headerConsistency: true,
      toneStyle: true,
      characterLimits: true,
    },
  } = options

  // Get default tone/style for article type if not provided
  const defaultTS = DEFAULT_TONE_STYLE[articleType as keyof typeof DEFAULT_TONE_STYLE]
  const effectiveTone = tone || defaultTS?.tone || 'professional'
  const effectiveStyle = style || defaultTS?.style || 'balanced'

  const sections: string[] = [basePrompt]

  // Add header consistency rules
  if (includeRules.headerConsistency) {
    sections.push(getHeaderConsistencyBlock(variation))
  }

  // Add forbidden phrases
  if (includeRules.forbidden) {
    sections.push(getForbiddenPhrasesBlock())
  }

  // Add symbol rules
  if (includeRules.symbols) {
    sections.push(getSymbolRulesBlock())
  }

  // Add tone and style
  if (includeRules.toneStyle) {
    sections.push(getToneStyleBlock(effectiveTone as ToneType, effectiveStyle as StyleType))
  }

  // Add character limits
  if (includeRules.characterLimits) {
    sections.push(getCharacterLimitsBlock())
  }

  return sections.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if text contains any forbidden phrases for a context
 */
export function containsForbiddenPhrases(
  text: string,
  context: keyof typeof FORBIDDEN_PHRASES
): { hasForbidden: boolean; found: string[] } {
  const phrases = FORBIDDEN_PHRASES[context]
  const found: string[] = []

  for (const phrase of phrases) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      found.push(phrase)
    }
  }

  return { hasForbidden: found.length > 0, found }
}

/**
 * Check if text starts with any forbidden closing paragraph phrases
 */
export function startsWithForbiddenPhrase(text: string): { startsWithForbidden: boolean; phrase?: string } {
  const trimmed = text.trim().toLowerCase()

  for (const phrase of FORBIDDEN_PHRASES.closingParagraphStart) {
    if (trimmed.startsWith(phrase.toLowerCase())) {
      return { startsWithForbidden: true, phrase }
    }
  }

  return { startsWithForbidden: false }
}

/**
 * Check if text contains any unapproved symbols/emojis
 */
export function containsUnapprovedSymbols(text: string): { hasUnapproved: boolean; found: string[] } {
  const approvedChars = Object.values(APPROVED_SYMBOLS)
  const found: string[] = []

  // Emoji regex (simplified)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
  const emojis = text.match(emojiRegex) || []
  found.push(...emojis)

  return { hasUnapproved: found.length > 0, found }
}

/**
 * Validate H2 against forbidden patterns
 */
export function validateH2(h2: string, variation: VariationType): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for "and"
  if (/\band\b/i.test(h2)) {
    issues.push('H2 contains "and" - each H2 must be single-focused')
  }

  // Check for "or"
  if (/\bor\b/i.test(h2)) {
    issues.push('H2 contains "or" - each H2 must be single-focused')
  }

  // Check for colons
  if (h2.includes(':')) {
    issues.push('H2 contains colon - not allowed in heading text')
  }

  // Check format consistency
  if (variation === 'question' && !h2.endsWith('?')) {
    issues.push('H2 must be a question (end with ?) for Question format')
  }
  if (variation === 'statement' && h2.includes('?')) {
    issues.push('H2 must not contain ? for Statement format')
  }
  if (variation === 'listicle' && !/^\d+\./.test(h2)) {
    issues.push('H2 must start with a number for Listicle format')
  }

  return { valid: issues.length === 0, issues }
}
