/**
 * Content Generation Prompts
 * 
 * Prompt templates for generating article content:
 * Overview, sections, closing, FAQ answers.
 * 
 * Enhanced with SCAI production rules for forbidden content,
 * word counts, and format consistency.
 */

import {
  FORBIDDEN_PHRASES,
  APPROVED_SYMBOLS,
  WORD_COUNT_RULES,
} from '@/lib/ai/rules/forbidden-content'
import type { ExtractedPromise, PromiseType } from '@/lib/ai/utils/h1-promise-extractor'

// ═══════════════════════════════════════════════════════════════════════════════
// H1 PROMISE → CONTENT WRITING DIRECTIVES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps the H1's extracted promise type to a concrete writing style directive
 * that content generators must follow to deliver on the H1's promise.
 */
function getWritingDirective(promiseType: PromiseType, h1: string): string {
  const h1Lower = h1.toLowerCase()

  // Check for "simple terms" / "explained simply" / "for beginners" / "for everyone" in H1
  const isSimpleLanguage = /simple|beginner|everyone|easy to understand|plain|basics/i.test(h1)
  const simpleLangDirective = isSimpleLanguage
    ? '\n- Use PLAIN, SIMPLE language. No academic or formal phrasing. Write as if explaining to a friend.'
    : ''

  switch (promiseType) {
    case 'explained':
    case 'guide':
    case 'overview':
    case 'tutorial':
      return `Writing style: EXPLANATORY — define concepts, be concrete, give examples.${simpleLangDirective}\n- Every paragraph should teach the reader something specific.\n- Avoid vague generalizations — use real details.`

    case 'breakdown':
    case 'analysis':
      return `Writing style: ANALYTICAL — break down the topic into clear parts, examine each one.\n- Be specific and evidence-based.\n- Show cause-and-effect or how pieces relate.`

    case 'review':
      return `Writing style: EVALUATIVE — give opinions, verdicts, and assessments.\n- Be specific about strengths and weaknesses.\n- Write like a reviewer, not an encyclopedia.`

    case 'comparison':
      return `Writing style: COMPARATIVE — contrast options directly.\n- Name specific differences, not vague claims.\n- Help the reader decide between options.`

    case 'how-to':
    case 'steps':
      return `Writing style: INSTRUCTIONAL — give clear, actionable steps.\n- Be specific about what to do and how.\n- Write for someone following along.`

    case 'reasons':
    case 'why-does':
      return `Writing style: PERSUASIVE/EXPLANATORY — each section must deliver a clear, distinct reason.\n- Be specific and concrete.\n- Don't pad with filler or generic observations.`

    case 'tips':
    case 'ways':
    case 'strategies':
    case 'methods':
    case 'techniques':
      return `Writing style: ACTIONABLE — each section delivers a specific, practical tip or method.\n- Be concrete and usable.\n- Include real-world details, not abstract advice.`

    case 'recipes':
      return `Writing style: RECIPE-FOCUSED — be specific about ingredients, techniques, and flavors.\n- Include practical cooking details.\n- Write for someone actually making the dish.`

    case 'what-is':
      return `Writing style: DEFINITIONAL — clearly define and explain the concept.${simpleLangDirective}\n- Start with what it IS, then cover context and implications.\n- Use concrete examples to illustrate.`

    case 'selection':
    case 'products':
      return `Writing style: CURATION — present each item with clear reasons it made the list.\n- Be specific about what makes each option stand out.\n- Help the reader choose.`

    case 'should-you':
    case 'can-you':
    case 'which-is':
    case 'when-to':
      return `Writing style: ADVISORY — answer the question directly.\n- Give clear, actionable guidance.\n- Don't dance around the answer with generic filler.`

    default:
      return `Writing style: Stay focused on the H1's specific angle.${simpleLangDirective}\n- Every paragraph must deliver concrete, specific content.\n- Avoid generic filler that could apply to any topic.`
  }
}

/**
 * Build a prompt block that tells content generators what the H1 promised
 * and how to write to fulfill that promise.
 */
export function buildPromiseContextBlock(
  h1: string,
  promise: ExtractedPromise,
  variation: string
): string {
  const directive = getWritingDirective(promise.promiseType, h1)

  return `
H1 PROMISE CONTEXT (your content MUST deliver on this):
- H1: "${h1}"
- Promise type: ${promise.promiseType}
- ${directive}
- Every paragraph must feel like it fulfills this H1 — not generic filler about the topic.
- If you catch yourself writing something that could apply to ANY article about "${promise.subject}", STOP and write something specific to the H1's angle instead.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS WITH EMBEDDED RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build forbidden phrases block for content prompts
 */
function getContentForbiddenPhrasesBlock(): string {
  return `
FORBIDDEN PHRASES (NEVER USE - WILL FAIL VALIDATION):
Starting phrases for closing: ${FORBIDDEN_PHRASES.closingParagraphStart.join(', ')}
Generic H1 filler: ${FORBIDDEN_PHRASES.h1Generic.slice(0, 6).join(', ')}...

⚠️ BANNED MARKETING BUZZWORDS (AUTOMATIC REJECTION):
${FORBIDDEN_PHRASES.contentBuzzwords.join(', ')}

INSTEAD OF BUZZWORDS, USE:
- Specific numbers and facts
- Concrete descriptions
- Measurable benefits
- Technical specifications`
}

/**
 * Build word count rules block for content prompts  
 */
function getContentWordCountBlock(): string {
  return `
WORD COUNT TARGETS (±5 tolerance):
- Overview paragraph: ${WORD_COUNT_RULES.overviewParagraph.target} words
- Standard paragraph: ${WORD_COUNT_RULES.standardParagraph.target} words
- Closing paragraph: ${WORD_COUNT_RULES.closingParagraph.target} words
- FAQ answer: ${WORD_COUNT_RULES.faqAnswer.target} words`
}

export const CONTENT_SYSTEM_PROMPT = `You are a concise content writer. You write EXACTLY the number of words requested - no more, no less.

⚠️ CRITICAL: WORD COUNT IS NON-NEGOTIABLE ⚠️
- When asked for 100 words, write EXACTLY 85-115 words
- When asked for 150 words, write EXACTLY 130-170 words
- When asked for 50 words, write EXACTLY 40-60 words
- NEVER exceed the maximum word count
- Count your words as you write
- Stop immediately when reaching the target
${getContentWordCountBlock()}

📝 OVERVIEW PARAGRAPH STRUCTURE:
When writing OVERVIEW content:
- Write EXACTLY 2 paragraphs
- Each paragraph: 250-300 characters (target: 250)
- Separate paragraphs with a BLANK LINE
- Total should be ~100 words across both paragraphs

📝 SECTION PARAGRAPH STRUCTURE:
When writing SECTION content (not overview or closing):
- Write EXACTLY 3 paragraphs
- Each paragraph: 250-300 characters (target: 250)
- Separate paragraphs with a BLANK LINE
- Total should be ~150 words across all 3 paragraphs

GRAMMAR & QUALITY STANDARDS:
- Use proper grammar, spelling, and punctuation
- Vary sentence structure and length for natural flow
- Avoid run-on sentences and sentence fragments
- Use active voice when possible (passive when appropriate)
- Ensure subject-verb agreement
- Use commas, semicolons, and periods correctly
- No double spaces or extra punctuation
- Proofread your output before completing

WRITING STYLE:
- Concise and direct - no filler
- Every word must add value
- Use active voice
- Be specific, not vague
${getContentForbiddenPhrasesBlock()}

🚫 ABSOLUTE BAN ON MARKETING LANGUAGE 🚫
The following words will cause AUTOMATIC REJECTION - NEVER USE THESE:
- unique, amazing, incredible, unbelievable, spectacular, phenomenal
- game-changer, revolutionary, cutting-edge, state-of-the-art, groundbreaking
- unprecedented, innovative, seamless, synergy, leverage, disruptive, paradigm
- world-class, best-in-class, next-gen, next generation

If you catch yourself about to use ANY of these words, STOP and replace with:
- Specific measurements or percentages
- Concrete facts with numbers
- Technical terminology
- Descriptive adjectives like "durable", "efficient", "compact"

INSTEAD USE: specific facts, concrete numbers, measurable details, technical terms

SYMBOL RULES:
- NO emojis anywhere in content
- NO decorative symbols (★ ☆ ❤ ♡ etc.)
- Approved bullets for lists only: ${APPROVED_SYMBOLS.bullet}

FORMAT:
- Plain text only (NO HTML, NO markdown)
- NO bullet points, NO numbered lists
- Just paragraphs of text

KEYWORD RULE:
- Include primary keyword 1-2 times naturally
- Never keyword-stuff

You are being evaluated on word count accuracy. Outputs that exceed word limits will be rejected.`

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PARAGRAPH GENERATION (100 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface OverviewPromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  h1: string
  tone?: string
  h1PromiseContext?: string  // Pre-built writing directive from H1 promise
}

export function buildOverviewPrompt(params: OverviewPromptParams): string {
  const { topic, primaryKeyword, articleType, h1, tone = 'professional', h1PromiseContext } = params

  const localInstructions = articleType === 'local'
    ? `
LOCAL ARTICLE INSTRUCTIONS (CRITICAL):
- This is a LOCAL/location-based article — write as if helping someone find or choose a local ${topic}
- Use local-intent language: "in your area", "near you", "local", "neighborhood", "community"
- Reference what makes a LOCAL ${topic} different from a generic one
- Mention benefits of choosing local (convenience, community, personalized service)
- Write for someone searching "best ${topic} near me" or "local ${topic}"
- Do NOT write generic informational content — make it feel location-aware
`
    : ''

  return `Write an overview paragraph for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
H1 TITLE: ${h1}
TONE: ${tone}
${localInstructions}
${h1PromiseContext || ''}
STRICT REQUIREMENTS:
- EXACTLY 100 words total (NO MORE, NO LESS)
- PARAGRAPH 1: 45-55 words - Hook the reader, introduce the topic
- PARAGRAPH 2: 45-55 words - Preview what the article covers
- Each paragraph: 250-300 characters
- Include "${primaryKeyword}" naturally in the first paragraph
- Engaging and compelling
- NO HTML or markdown
- COUNT YOUR WORDS: Exceeding 100 words is a failure

Return JSON: {
  "paragraph1": "First paragraph (45-55 words, 250-300 chars)",
  "paragraph2": "Second paragraph (45-55 words, 250-300 chars)"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD SECTION CONTENT (150 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SectionPromptParams {
  topic: string
  primaryKeyword: string
  h2: string
  h2Index: number
  totalH2s: number
  articleType: string
  previousH2s?: string[]
  tone?: string
  h1PromiseContext?: string  // Pre-built writing directive from H1 promise
}

export function buildSectionPrompt(params: SectionPromptParams): string {
  const {
    topic,
    primaryKeyword,
    h2,
    h2Index,
    totalH2s,
    articleType,
    previousH2s = [],
    tone = 'professional',
    h1PromiseContext,
  } = params

  const contextInfo = previousH2s.length > 0
    ? `\nPREVIOUS SECTIONS COVERED:\n${previousH2s.map(h => `- ${h}`).join('\n')}`
    : ''

  const localSectionInstructions = articleType === 'local'
    ? `
LOCAL ARTICLE SECTION INSTRUCTIONS (CRITICAL):
- Write for someone looking for a LOCAL ${topic} in their area
- Include local-intent phrases: "in your neighborhood", "nearby", "local", "community-based"
- Mention real-world considerations: location convenience, local reputation, word-of-mouth
- Give practical local advice (what to look for, how to evaluate, questions to ask)
- Do NOT write generic, Wikipedia-style content — make it actionable for a local searcher
`
    : ''

  return `Write content for section ${h2Index + 1} of ${totalH2s} in a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
THIS H2: ${h2}
${contextInfo}
TONE: ${tone}
${localSectionInstructions}
${h1PromiseContext || ''}
STRICT REQUIREMENTS:
- EXACTLY 150 words total (NO MORE, NO LESS)
- 3 paragraphs of 45-55 words each
- First paragraph: Introduction to this subtopic
- Second paragraph: Details, examples, or evidence
- Third paragraph: Practical insights or key takeaway
- Each paragraph: 250-300 characters
- Include "${primaryKeyword}" or related terms naturally
- Build on (don't repeat) previous sections
- Specific, valuable content
- NO HTML or markdown
- COUNT YOUR WORDS: Under 135 or over 165 is a failure

Return JSON: {
  "paragraph1": "First paragraph (45-55 words)",
  "paragraph2": "Second paragraph (45-55 words)",
  "paragraph3": "Third paragraph (45-55 words)"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING PARAGRAPH (50 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClosingPromptParams {
  topic: string
  primaryKeyword: string
  h1: string
  closingH2: string
  articleType: string
  mainPoints?: string[]
  tone?: string
  h1PromiseContext?: string  // Pre-built writing directive from H1 promise
}

export function buildClosingPrompt(params: ClosingPromptParams): string {
  const {
    topic,
    primaryKeyword,
    h1,
    closingH2,
    articleType,
    mainPoints = [],
    tone = 'professional',
    h1PromiseContext,
  } = params

  const pointsSummary = mainPoints.length > 0
    ? `\nMAIN POINTS COVERED:\n${mainPoints.map(p => `- ${p}`).join('\n')}`
    : ''

  return `Write a closing paragraph for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
H1 TITLE: ${h1}
CLOSING H2: ${closingH2}
${pointsSummary}
TONE: ${tone}
${h1PromiseContext || ''}

REQUIREMENTS:
- EXACTLY 50 words
- Summarize key takeaway
- Include subtle call-to-action
- End on strong, memorable note
- Include "${primaryKeyword}" naturally
- NO HTML or markdown
${articleType === 'local' ? `- LOCAL ARTICLE: Include a local call-to-action (e.g., "visit your local ${topic}", "check out a ${topic} near you", "explore what your neighborhood has to offer")` : ''}

FORBIDDEN PHRASES (NEVER use these):
- "In conclusion"
- "To summarize"
- "In summary"
- "Finally"
- "To wrap up"
- "As we've discussed"

Return JSON: { "text": "Your 50-word closing paragraph" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ ANSWERS (28 words each)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FaqAnswersPromptParams {
  topic: string
  primaryKeyword: string
  questions: string[]
  articleType: string
  tone?: string
  recipeContext?: RecipeContextForPrompt
  reviewContext?: ReviewContextForPrompt
}

export function buildFaqAnswersPrompt(params: FaqAnswersPromptParams): string {
  const { topic, primaryKeyword, questions, articleType, tone = 'professional', recipeContext, reviewContext } = params

  const recipeGuardrails = recipeContext && articleType === 'recipe'
    ? `

RECIPE CONTEXT (MUST FOLLOW):
- Dish: ${recipeContext.dishName}
- Key ingredients: ${recipeContext.ingredients.slice(0, 4).join(', ')}
${recipeContext.cookingMethod ? `- Cooking method: ${recipeContext.cookingMethod}` : ''}
${recipeContext.timelineNote ? `- Timeline note: ${recipeContext.timelineNote}` : ''}
${recipeContext.fermentation && recipeContext.fermentation !== 'unknown' ? `- Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}` : ''}
${recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0 ? `- Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}` : ''}

FAQ RULES FOR RECIPE:
- Do NOT introduce steps, timelines, or fermentation details that contradict the recipe context
- If fermentation is avoided, do NOT claim grains are fermented
- If timeline includes multi-day prep, do NOT claim it is ready in minutes
- Answers must remain specific to this recipe method
`
    : ''

  const reviewGuardrails = reviewContext && articleType === 'review'
    ? `

REVIEW CONTEXT (MUST FOLLOW):
- Product: ${reviewContext.productName}
- Category: ${reviewContext.category}
- Rating: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"
- Key features: ${reviewContext.keyFeatures.slice(0, 4).join(', ')}
- Strengths: ${reviewContext.topPros.slice(0, 3).join(', ')}
${reviewContext.topCons.length > 0 ? `- Considerations: ${reviewContext.topCons.join(', ')}` : ''}
${reviewContext.pricePoint ? `- Price positioning: ${reviewContext.pricePoint}` : ''}
${reviewContext.targetAudience ? `- Target audience: ${reviewContext.targetAudience}` : ''}

FAQ RULES FOR REVIEW:
- Do NOT contradict the ${reviewContext.rating.score}/10 rating in any answer
- Do NOT claim features that aren't in the key features list
- Do NOT overstate or understate the verdict
- Answers must be consistent with pros/cons assessment
- If asked about value, align with the ${reviewContext.pricePoint || 'product'} positioning
- Use consistent casing: "${reviewContext.productName}", PS5/PS4-style acronyms, and official feature names
- Do NOT invent exact technical specs (GB, Hz, fps, resolutions), prices, or subscription requirements
- If asked for specs and you are not certain, answer generally and use conditional phrasing (e.g., "in supported titles", "varies by model/region")
`
    : ''

  return `Write FAQ answers for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
TONE: ${tone}

QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
${recipeGuardrails}
${reviewGuardrails}

REQUIREMENTS:
- Each answer: EXACTLY 28 words
- Direct, helpful, and accurate
- Answer the question fully in limited words
- Include "${primaryKeyword}" in at least one answer
- NO HTML or markdown

Return JSON: { "answers": ["Answer 1 (28 words)", "Answer 2 (28 words)", ...] }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC OVERVIEW (Comparison articles - 80 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopicOverviewPromptParams {
  topic: string
  primaryKeyword: string
  topicName: string
  h2: string
  position: 'first' | 'second'
}

export function buildTopicOverviewPrompt(params: TopicOverviewPromptParams): string {
  const { topic, primaryKeyword, topicName, h2, position } = params

  return `Write a topic overview for a comparison article.

OVERALL TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
THIS TOPIC: ${topicName}
H2 TITLE: ${h2}
POSITION: This is the ${position} topic being compared

REQUIREMENTS:
- EXACTLY 80 words total (2 sub-paragraphs of ~40 words each)
- "What" paragraph: What is ${topicName}? (~40 words)
- "Who" paragraph: Who is it best for? (~40 words)
- Objective, balanced perspective
- NO HTML or markdown

Return JSON: {
  "what": "What paragraph (~40 words)",
  "who": "Who paragraph (~40 words)"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS (Informational - 50-75 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface KeyTakeawaysPromptParams {
  topic: string
  primaryKeyword: string
  h1: string
  mainH2s: string[]
}

export function buildKeyTakeawaysPrompt(params: KeyTakeawaysPromptParams): string {
  const { topic, primaryKeyword, h1, mainH2s } = params

  return `Write key takeaways for an informational article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
H1 TITLE: ${h1}
MAIN SECTIONS:
${mainH2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}

REQUIREMENTS:
- H2: A short, punchy section header (20-40 characters). It should feel specific to "${topic}", not generic.
  GOOD examples: "Miami at a Glance", "The Short Version", "Before You Read On", "The Bottom Line on ${primaryKeyword}", "What to Remember"
  BAD examples: "Key Takeaways" (too generic), "Essential Insights About ${primaryKeyword} You Should Know" (too long and wordy)
  These examples are just guidelines — create your own header that fits the topic naturally.
- 3-5 bullet points
- Total 50-75 words
- Each point: 10-20 words
- TL;DR summary of the article
- Most important facts/insights
- Include "${primaryKeyword}" in one bullet
- NO HTML or markdown

Return JSON: { "h2": "Your section header here", "items": ["Takeaway 1", "Takeaway 2", ...] }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK VERDICT (Comparison - 50 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuickVerdictPromptParams {
  topic: string
  optionA: string
  optionB: string
}

export function buildQuickVerdictPrompt(params: QuickVerdictPromptParams): string {
  const { topic, optionA, optionB } = params

  return `Write a quick verdict for a comparison article.

TOPIC: ${topic}
OPTION A: ${optionA}
OPTION B: ${optionB}

REQUIREMENTS:
- Two statements, ~25 words each (50 words total)
- "Choose ${optionA} if..." (~25 words)
- "Choose ${optionB} if..." (~25 words)
- Clear, decisive guidance
- Help reader make a choice
- NO HTML or markdown

Return JSON: {
  "chooseA": "Choose ${optionA} if... (~25 words)",
  "chooseB": "Choose ${optionB} if... (~25 words)"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPS PARAGRAPH (Recipe - 150 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TipsParagraphPromptParams {
  recipeTopic: string
  primaryKeyword: string
  h2: string
}

export function buildTipsParagraphPrompt(params: TipsParagraphPromptParams): string {
  const { recipeTopic, primaryKeyword, h2 } = params

  return `Write a tips paragraph for a recipe article.

RECIPE: ${recipeTopic}
PRIMARY KEYWORD: ${primaryKeyword}
H2 TITLE: ${h2}

REQUIREMENTS:
- EXACTLY 150 words
- Practical cooking tips for this recipe
- Include 5-7 specific tips
- Written as flowing paragraphs (not bullets)
- Expert-level insights
- Include "${primaryKeyword}" naturally
- NO HTML or markdown

Return JSON: { "text": "Your 150-word tips paragraph" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATING PARAGRAPH (Review - 100 words)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RatingParagraphPromptParams {
  topic: string
  primaryKeyword: string
  score: number
}

export function buildRatingParagraphPrompt(params: RatingParagraphPromptParams): string {
  const { topic, primaryKeyword, score } = params

  return `Write a rating justification for a review article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
SCORE: ${score}/10

REQUIREMENTS:
- EXACTLY 100 words
- Justify why the score is ${score}/10
- Mention specific pros that support the score
- Mention any cons that prevented a higher score
- Balanced and credible
- Include "${primaryKeyword}" naturally
- NO HTML or markdown

Return JSON: { "text": "Your 100-word rating justification" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING CONTENT PROMPT
// For generating content piece by piece with streaming
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe context for connected content generation
 */
export interface RecipeContextForPrompt {
  dishName: string
  ingredients: string[]
  cookingMethod?: string
  cookTime?: string
  servings?: number
  cuisineStyle?: string
  timelineNote?: string
  fermentation?: 'uses' | 'avoids' | 'unknown'
  ingredientNotes?: string[]
}

/**
 * Review context for connected content generation
 */
export interface ReviewContextForPrompt {
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

export interface ComparisonContextForPrompt {
  itemA: string
  itemB: string
  category: string
  criteria: string[]
  keyDifferences: string[]
  similarities: string[]
  winner?: {
    name: string
    reason: string
  }
  targetAudience?: string
  useCases?: {
    chooseA: string
    chooseB: string
  }
}

/**
 * Commercial context for connected content generation
 * Focuses on persuasive, benefits-driven business content
 */
export interface CommercialContextForPrompt {
  productName: string
  category: string
  keyBenefits: string[]
  keyFeatures: string[]
  targetAudience: string
  painPoint: string
  uniqueValue: string
  ctaSuggestion?: string
  pricePosition?: 'budget' | 'mid-range' | 'premium' | 'enterprise'
  socialProof?: string
}

export interface StreamContentPromptParams {
  contentType: 'overview' | 'section' | 'closing' | 'faq-answer'
  topic: string
  primaryKeyword: string
  targetWords: number
  context: string
  h2?: string
  articleType?: string  // Article type for tone-specific content (review, howto, recipe, etc.)
  recipeContext?: RecipeContextForPrompt  // Optional recipe context
  reviewContext?: ReviewContextForPrompt  // Optional review context
  comparisonContext?: ComparisonContextForPrompt  // Optional comparison context
  commercialContext?: CommercialContextForPrompt  // Optional commercial context
  titleFormat?: 'question' | 'statement' | 'listicle'  // Title format for listicle awareness
  h2Index?: number  // Current H2 index for listicle numbering
  totalH2s?: number  // Total H2 count for listicle context
  h1PromiseContext?: string  // Pre-built writing directive from H1 promise
}

/**
 * Generate a unique writing angle/approach to ensure content variety
 */
function getRandomWritingAngle(contentType: string, h2?: string): string {
  const overviewAngles = [
    'Start with a sensory description (smell, taste, texture)',
    'Begin with a relatable cooking scenario',
    'Open with what makes this dish special',
    'Start with a quick tip that hooks the reader',
    'Begin with the dish\'s origin or cultural significance',
    'Open with a personal touch about enjoying this dish',
  ]

  const sectionAngles = [
    'Focus on practical tips and tricks',
    'Emphasize time-saving techniques',
    'Highlight common mistakes to avoid',
    'Share expert chef insights',
    'Focus on flavor enhancement',
    'Discuss ingredient substitutions and variations',
    'Emphasize texture and presentation',
    'Focus on nutrition and health benefits',
  ]

  const closingAngles = [
    'End with encouragement to experiment',
    'Close with serving suggestions',
    'Finish with a warm invitation to enjoy',
    'End with a tip for leftovers',
    'Close with pairing recommendations',
  ]

  const angles = contentType === 'overview' ? overviewAngles :
    contentType === 'closing' ? closingAngles : sectionAngles

  // Use current timestamp + h2 for pseudo-random selection
  const seed = Date.now() + (h2?.charCodeAt(0) || 0) + (h2?.length || 0)
  const index = seed % angles.length

  return angles[index]
}

export function buildStreamContentPrompt(params: StreamContentPromptParams): string {
  const { contentType, topic, primaryKeyword, targetWords, context, h2, articleType, recipeContext, reviewContext, comparisonContext, commercialContext, titleFormat, h2Index, totalH2s, h1PromiseContext } = params

  const minWords = Math.floor(targetWords * 0.90)  // ±10% to match validator
  const maxWords = Math.ceil(targetWords * 1.10)

  // Base instructions by content type
  let typeInstruction = ''
  const h2NoRepeatRule = contentType === 'section'
    ? '- Do NOT repeat the H2 title verbatim in the first sentence'
    : ''

  if (contentType === 'overview') {
    typeInstruction = 'Hook the reader and preview the article content.'
  } else if (contentType === 'section') {
    typeInstruction = `Write content for the section titled "${h2}".`
  } else if (contentType === 'closing') {
    typeInstruction = 'Summarize key takeaways with a call-to-action.'
  } else {
    typeInstruction = 'Provide a direct, helpful answer to the question.'
  }

  // Build listicle-specific instructions if applicable (with article-type awareness)
  let listicleInstructions = ''
  if (titleFormat === 'listicle') {
    // Article-type-specific content tone for listicles
    const articleTypeTone: Record<string, { overview: string; section: string; closing: string }> = {
      review: {
        overview: `You are writing a REVIEW listicle - you are EVALUATING a product/service.
- Preview the review aspects you'll cover (e.g., "we'll analyze key features, value, and performance...")
- Set an evaluative tone: mention you'll be assessing, rating, or reviewing
- Reference the product/service being reviewed`,
        section: `You are writing a REVIEW section - EVALUATE this aspect of the product/service.
- Analyze performance, quality, value, or user experience
- Reference the rating/verdict context if available
- Maintain evaluative tone: "This feature excels...", "The value proposition here...", "Performance-wise..."
- NOT generic facts or history - focus on your ASSESSMENT`,
        closing: `You are concluding a REVIEW - summarize your VERDICT.
- Reference the overall rating/recommendation
- Summarize key pros and cons discussed
- Give a final recommendation based on the review`
      },
      comparison: {
        overview: `You are writing a COMPARISON listicle - you are COMPARING two or more options.
- Preview the comparison aspects you'll cover (e.g., "we'll compare features, pricing, and performance...")
- Set a comparative tone: mention you'll be weighing options head-to-head
- Reference both items being compared fairly`,
        section: `You are writing a COMPARISON section - COMPARE on this specific aspect.
- Analyze how each option performs on this criterion
- Be fair and balanced - highlight strengths and weaknesses of both
- Use comparative language: "While X excels at..., Y offers...", "In terms of..., the clear winner is..."
- NOT just descriptions - focus on HEAD-TO-HEAD COMPARISON`,
        closing: `You are concluding a COMPARISON - help the reader DECIDE.
- Summarize key differences discovered
- Give conditional recommendations: "Choose X if you need..., Choose Y if you prefer..."
- Be decisive but acknowledge different use cases`
      },
      howto: {
        overview: `You are writing a HOW-TO listicle - you are TEACHING a process.
- Preview the steps/tips you'll cover
- Set an instructional tone`,
        section: `You are writing a HOW-TO section - TEACH this step/tip.
- Use instructional language: "First, you'll...", "Make sure to..."
- Be specific and actionable`,
        closing: `You are concluding a HOW-TO - summarize what was learned.
- Reference the process covered
- Encourage the reader to apply what they learned`
      },
      informational: {
        overview: `You are writing an INFORMATIONAL listicle - you are EDUCATING.
- Preview the facts/aspects you'll cover
- Set an educational tone`,
        section: `You are writing an INFORMATIONAL section - EDUCATE on this point.
- Present facts, insights, or analysis
- Use educational tone: "This aspect...", "Understanding this..."`,
        closing: `You are concluding an INFORMATIONAL article - summarize key learnings.
- Reference the knowledge shared
- Encourage further exploration`
      }
    }

    const effectiveArticleType = articleType || 'informational'
    const toneGuidance = articleTypeTone[effectiveArticleType] || articleTypeTone.informational

    if (contentType === 'overview') {
      listicleInstructions = `

📋 LISTICLE FORMAT REQUIREMENTS:
This is a NUMBERED LIST article (the H1 starts with a number like "7 Reasons..." or "5 Best...").

🎯 ARTICLE TYPE TONE (${effectiveArticleType.toUpperCase()}):
${toneGuidance.overview}

- Preview the list structure in your overview (e.g., "we'll explore key aspects...")
- Build anticipation for the numbered points to come
- Do NOT start listing items yet - save that for the sections
- Create excitement about the comprehensive coverage`

    } else if (contentType === 'section' && h2Index !== undefined && totalH2s !== undefined) {
      const positionWords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
      const position = h2Index < positionWords.length ? positionWords[h2Index] : `number ${h2Index + 1}`
      const isFirst = h2Index === 0
      const isLast = h2Index === totalH2s - 1

      listicleInstructions = `

📋 LISTICLE FORMAT REQUIREMENTS:
This is item ${h2Index + 1} of ${totalH2s} in a numbered list article.

🎯 ARTICLE TYPE TONE (${effectiveArticleType.toUpperCase()}):
${toneGuidance.section}

- The H2 already has the number, so do NOT repeat it in your content
- Reference the list position naturally (e.g., "this ${position} aspect...", "another key factor...")
${isFirst ? '- As the first item, set the tone for the list with confidence' : ''}
${isLast ? '- As the final item, you can build toward the closing summary' : ''}
- Connect to the overall list flow
- Each section should feel like part of a cohesive numbered guide`

    } else if (contentType === 'closing') {
      listicleInstructions = `

📋 LISTICLE FORMAT REQUIREMENTS:
This article covered ${totalH2s || 'multiple'} numbered points.

🎯 ARTICLE TYPE TONE (${effectiveArticleType.toUpperCase()}):
${toneGuidance.closing}

- Reference that you've covered these key points
- Summarize the list's value (e.g., "with these ${totalH2s || ''} aspects in mind...")
- Reinforce the comprehensive nature of the coverage
- Do NOT restate all the numbers - summarize the value provided`
    }
  }

  // Build recipe-specific instructions if context is provided
  let recipeInstructions = ''
  if (recipeContext) {
    const writingAngle = getRandomWritingAngle(contentType, h2)
    console.log(`[buildStreamContentPrompt] 🎯 Recipe prompt for ${contentType}`)
    console.log(`[buildStreamContentPrompt]   Writing angle: "${writingAngle}"`)
    console.log(`[buildStreamContentPrompt]   Dish: ${recipeContext.dishName}`)

    if (contentType === 'overview') {
      recipeInstructions = `

🍳 RECIPE-SPECIFIC REQUIREMENTS (CRITICAL):
You are writing about: ${recipeContext.dishName}
Key ingredients to mention: ${recipeContext.ingredients.slice(0, 4).join(', ')}
${recipeContext.cookingMethod ? `Cooking method: ${recipeContext.cookingMethod}` : ''}
${recipeContext.cookTime ? `Prep/cook time: ${recipeContext.cookTime}` : ''}
${recipeContext.cuisineStyle ? `Cuisine style: ${recipeContext.cuisineStyle}` : ''}
${recipeContext.timelineNote ? `Timeline note: ${recipeContext.timelineNote}` : ''}
${recipeContext.fermentation && recipeContext.fermentation !== 'unknown' ? `Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}` : ''}
${recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0 ? `Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}` : ''}

WRITING APPROACH: ${writingAngle}

Your overview MUST:
- Mention at least 2-3 specific ingredients from the list above
- Reference the dish name naturally
- Create anticipation for the recipe
- Be UNIQUE - use different phrasing each time
- Connect flavors, textures, or aromas to specific ingredients
- Do NOT introduce prep steps or timelines not supported by the context`

    } else if (contentType === 'section') {
      // Rotate through different ingredients for variety
      const ingredientCount = recipeContext.ingredients.length
      const startIdx = (h2?.length || 0) % Math.max(1, ingredientCount - 2)
      const relevantIngredients = recipeContext.ingredients.slice(startIdx, startIdx + 3)

      recipeInstructions = `

🍳 RECIPE-SPECIFIC REQUIREMENTS (CRITICAL):
Recipe: ${recipeContext.dishName}
Ingredients to reference in this section: ${relevantIngredients.join(', ')}
${recipeContext.cookingMethod ? `Technique: ${recipeContext.cookingMethod}` : ''}
${recipeContext.timelineNote ? `Timeline note: ${recipeContext.timelineNote}` : ''}
${recipeContext.fermentation && recipeContext.fermentation !== 'unknown' ? `Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}` : ''}
${recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0 ? `Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}` : ''}

WRITING APPROACH: ${writingAngle}

This section MUST:
- Reference specific ingredients (${relevantIngredients[0]} or ${relevantIngredients[1] || relevantIngredients[0]})
- Connect advice to the actual recipe
- Be UNIQUE - vary your approach and phrasing
- Provide actionable, recipe-specific tips
- Do NOT repeat the H2 title verbatim in the first sentence
- Do NOT introduce steps or times not supported by the context`

    } else if (contentType === 'closing') {
      recipeInstructions = `

🍳 RECIPE-SPECIFIC REQUIREMENTS:
Recipe: ${recipeContext.dishName}
Star ingredients: ${recipeContext.ingredients.slice(0, 2).join(' and ')}
${recipeContext.servings ? `Serves: ${recipeContext.servings}` : ''}
${recipeContext.timelineNote ? `Timeline note: ${recipeContext.timelineNote}` : ''}
${recipeContext.fermentation && recipeContext.fermentation !== 'unknown' ? `Fermentation: ${recipeContext.fermentation === 'uses' ? 'this recipe uses fermentation' : 'this recipe avoids fermentation'}` : ''}
${recipeContext.ingredientNotes && recipeContext.ingredientNotes.length > 0 ? `Ingredient clarifications: ${recipeContext.ingredientNotes.join('; ')}` : ''}

WRITING APPROACH: ${writingAngle}

Your closing MUST:
- Reference the dish name
- Mention enjoying key ingredients
- Encourage trying the recipe
- Be warm and inviting
- Do NOT introduce new steps or time claims`
    }
  }

  // Build review-specific instructions if context is provided
  let reviewInstructions = ''
  if (reviewContext) {
    console.log(`[buildStreamContentPrompt] ⭐ Review prompt for ${contentType}`)
    console.log(`[buildStreamContentPrompt]   Product: ${reviewContext.productName}`)
    console.log(`[buildStreamContentPrompt]   Rating: ${reviewContext.rating.score}/10 - ${reviewContext.rating.verdict}`)

    // Determine tone based on rating
    let ratingTone = 'balanced'
    if (reviewContext.rating.score >= 8.5) {
      ratingTone = 'enthusiastically positive'
    } else if (reviewContext.rating.score >= 7) {
      ratingTone = 'positive with minor reservations'
    } else if (reviewContext.rating.score >= 5) {
      ratingTone = 'balanced and measured'
    } else {
      ratingTone = 'cautiously critical'
    }

    if (contentType === 'overview') {
      reviewInstructions = `

⭐ REVIEW-SPECIFIC REQUIREMENTS (CRITICAL):
You are writing about: ${reviewContext.productName}
Category: ${reviewContext.category}
Rating: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"
Key features: ${reviewContext.keyFeatures.slice(0, 3).join(', ')}
Main strengths: ${reviewContext.topPros.slice(0, 2).join(', ')}
${reviewContext.topCons.length > 0 ? `Key consideration: ${reviewContext.topCons[0]}` : ''}
${reviewContext.pricePoint ? `Price positioning: ${reviewContext.pricePoint}` : ''}
${reviewContext.targetAudience ? `Target audience: ${reviewContext.targetAudience}` : ''}

TONE: ${ratingTone}

Your overview MUST:
- Tease the ${reviewContext.rating.score}/10 rating verdict
- Mention 1-2 standout features
- Set appropriate expectations based on rating
- Be engaging but honest
- Do NOT contradict the rating (don't be overly positive for low scores or negative for high scores)
- Do NOT invent hard numeric specs (GB, Hz, fps, resolutions) unless explicitly provided in context
- If mentioning value/price, keep it general and avoid repeating the same phrase across sections
- Do NOT repeat the H2 title verbatim in the first sentence`

    } else if (contentType === 'section') {
      // Rotate through features based on h2 for variety
      const featureIdx = (h2?.length || 0) % reviewContext.keyFeatures.length
      const relevantFeature = reviewContext.keyFeatures[featureIdx]
      const prosIdx = (h2?.charCodeAt(0) || 0) % reviewContext.topPros.length
      const relevantPro = reviewContext.topPros[prosIdx]

      reviewInstructions = `

⭐ REVIEW-SPECIFIC REQUIREMENTS (CRITICAL):
Product: ${reviewContext.productName}
Category: ${reviewContext.category}
Overall rating: ${reviewContext.rating.score}/10
Feature to highlight: ${relevantFeature}
Strength to reference: ${relevantPro}
${reviewContext.pricePoint ? `Price positioning: ${reviewContext.pricePoint}` : ''}
${reviewContext.targetAudience ? `Target audience: ${reviewContext.targetAudience}` : ''}

TONE: ${ratingTone}

This section MUST:
- Reference specific product features from the list
- Connect advice to actual product capabilities
- Be consistent with the ${reviewContext.rating.score}/10 rating
- Be UNIQUE - vary your approach and phrasing
- Avoid hard numeric specs unless you are confident they are correct; prefer conditional phrasing ("in supported titles", "with compatible displays")
- Avoid repeating the same value/price positioning phrase unless it is directly relevant to the section
- Do NOT repeat the H2 title verbatim in the first sentence
- Do NOT contradict the overall verdict or pros/cons`

    } else if (contentType === 'closing') {
      reviewInstructions = `

⭐ REVIEW-SPECIFIC REQUIREMENTS:
Product: ${reviewContext.productName}
Final verdict: ${reviewContext.rating.score}/10 - "${reviewContext.rating.verdict}"
Key strength: ${reviewContext.topPros[0]}
${reviewContext.topCons.length > 0 ? `Balance with: ${reviewContext.topCons[0]}` : ''}
${reviewContext.targetAudience ? `Recommend for: ${reviewContext.targetAudience}` : ''}
${reviewContext.pricePoint ? `Value assessment: ${reviewContext.pricePoint} option` : ''}

TONE: ${ratingTone}

Your closing MUST:
- Reinforce the ${reviewContext.rating.score}/10 verdict
- Summarize the recommendation
- Be confident but balanced
- Match the rating's enthusiasm level
- Do NOT introduce new hard numeric specs in the closing
- Do NOT contradict the rating or be inconsistent with verdict`
    }
  }

  // Build comparison-specific instructions if context is provided
  let comparisonInstructions = ''
  if (comparisonContext) {
    console.log(`[buildStreamContentPrompt] ⚖️ Comparison prompt for ${contentType}`)
    console.log(`[buildStreamContentPrompt]   Comparing: ${comparisonContext.itemA} vs ${comparisonContext.itemB}`)
    console.log(`[buildStreamContentPrompt]   Category: ${comparisonContext.category}`)
    if (comparisonContext.winner) {
      console.log(`[buildStreamContentPrompt]   Winner: ${comparisonContext.winner.name}`)
    }

    if (contentType === 'overview') {
      comparisonInstructions = `

⚖️ COMPARISON-SPECIFIC REQUIREMENTS (CRITICAL):
You are comparing: ${comparisonContext.itemA} vs ${comparisonContext.itemB}
Category: ${comparisonContext.category}
Key comparison criteria: ${comparisonContext.criteria.slice(0, 3).join(', ')}
Main differences: ${comparisonContext.keyDifferences.slice(0, 2).join(', ')}
${comparisonContext.similarities.length > 0 ? `What they share: ${comparisonContext.similarities[0]}` : ''}
${comparisonContext.winner ? `Our pick: ${comparisonContext.winner.name} - ${comparisonContext.winner.reason}` : 'No clear winner - depends on needs'}
${comparisonContext.targetAudience ? `Target audience: ${comparisonContext.targetAudience}` : ''}

Your overview MUST:
- Introduce both options being compared fairly
- Preview what aspects you'll compare
- Hint at key differences that will be explored
- Set up the reader's decision-making framework
- Be balanced - don't heavily favor one option in the intro
- Do NOT repeat the H2 title verbatim in the first sentence`

    } else if (contentType === 'section') {
      // Rotate through criteria based on h2 for variety
      const criteriaIdx = (h2?.length || 0) % comparisonContext.criteria.length
      const relevantCriterion = comparisonContext.criteria[criteriaIdx]
      const diffIdx = (h2?.charCodeAt(0) || 0) % Math.max(1, comparisonContext.keyDifferences.length)
      const relevantDiff = comparisonContext.keyDifferences[diffIdx]

      comparisonInstructions = `

⚖️ COMPARISON-SPECIFIC REQUIREMENTS (CRITICAL):
Comparing: ${comparisonContext.itemA} vs ${comparisonContext.itemB}
Category: ${comparisonContext.category}
Criterion to focus on: ${relevantCriterion}
Key difference to highlight: ${relevantDiff}
${comparisonContext.targetAudience ? `Target audience: ${comparisonContext.targetAudience}` : ''}

This section MUST:
- Compare both options on this specific aspect
- Be fair and balanced - acknowledge strengths of both
- Use comparative language: "While X offers..., Y provides...", "X edges ahead in..."
- Reference specific differences from the context
- Help the reader understand trade-offs
- Be UNIQUE - vary your approach and comparative framing
- Do NOT repeat the H2 title verbatim in the first sentence
- Do NOT just describe each option separately - COMPARE them directly`

    } else if (contentType === 'closing') {
      comparisonInstructions = `

⚖️ COMPARISON-SPECIFIC REQUIREMENTS:
Compared: ${comparisonContext.itemA} vs ${comparisonContext.itemB}
Category: ${comparisonContext.category}
${comparisonContext.winner ? `Our recommendation: ${comparisonContext.winner.name} - ${comparisonContext.winner.reason}` : 'The best choice depends on your specific needs'}
${comparisonContext.useCases ? `Choose ${comparisonContext.itemA} ${comparisonContext.useCases.chooseA}. Choose ${comparisonContext.itemB} ${comparisonContext.useCases.chooseB}.` : ''}
${comparisonContext.targetAudience ? `Best for: ${comparisonContext.targetAudience}` : ''}

Your closing MUST:
- Summarize the key differences discovered
- Give clear, actionable recommendation(s)
- Help readers decide based on THEIR needs
- Be confident but acknowledge different use cases
- End with a decisive statement that helps the reader act`
    }
  }

  // Build commercial-specific instructions if context is provided
  let commercialInstructions = ''
  if (commercialContext) {
    console.log(`[buildStreamContentPrompt] 💼 Commercial prompt for ${contentType}`)
    console.log(`[buildStreamContentPrompt]   Product/Service: ${commercialContext.productName}`)
    console.log(`[buildStreamContentPrompt]   Category: ${commercialContext.category}`)
    console.log(`[buildStreamContentPrompt]   Target Audience: ${commercialContext.targetAudience}`)

    if (contentType === 'overview') {
      commercialInstructions = `

💼 COMMERCIAL-SPECIFIC REQUIREMENTS (CRITICAL):
You are promoting: ${commercialContext.productName}
Category: ${commercialContext.category}
Target audience: ${commercialContext.targetAudience}
Pain point we solve: ${commercialContext.painPoint}
Key benefits: ${commercialContext.keyBenefits.slice(0, 3).join(', ')}
Unique value: ${commercialContext.uniqueValue}
${commercialContext.pricePosition ? `Price positioning: ${commercialContext.pricePosition}` : ''}
${commercialContext.socialProof ? `Credibility: ${commercialContext.socialProof}` : ''}

Your overview MUST:
- Speak directly to the target audience's pain point
- Hint at the transformation/solution offered
- Preview the key benefits to be explored
- Be persuasive but credible - no hype
- Create urgency or desire to learn more
- Do NOT repeat the H2 title verbatim in the first sentence`

    } else if (contentType === 'section') {
      // Rotate through benefits/features based on h2 for variety
      const benefitIdx = (h2?.length || 0) % commercialContext.keyBenefits.length
      const relevantBenefit = commercialContext.keyBenefits[benefitIdx]
      const featureIdx = (h2?.charCodeAt(0) || 0) % commercialContext.keyFeatures.length
      const relevantFeature = commercialContext.keyFeatures[featureIdx]

      commercialInstructions = `

💼 COMMERCIAL-SPECIFIC REQUIREMENTS (CRITICAL):
Promoting: ${commercialContext.productName}
Category: ${commercialContext.category}
Benefit to highlight: ${relevantBenefit}
Feature that delivers it: ${relevantFeature}
Target audience: ${commercialContext.targetAudience}
Pain point we address: ${commercialContext.painPoint}
${commercialContext.pricePosition ? `Price positioning: ${commercialContext.pricePosition}` : ''}

This section MUST:
- Focus on BENEFITS (outcomes) not just features
- Speak to the target audience's needs
- Use persuasive language: "You'll experience...", "Imagine...", "No more..."
- Reference specific benefits from the context
- Be credible - include specifics, not vague claims
- Be UNIQUE - vary your persuasive approach
- Do NOT repeat the H2 title verbatim in the first sentence
- Do NOT use hype words - be specific and believable`

    } else if (contentType === 'closing') {
      commercialInstructions = `

💼 COMMERCIAL-SPECIFIC REQUIREMENTS:
Product/Service: ${commercialContext.productName}
Unique value: ${commercialContext.uniqueValue}
Primary benefit to reinforce: ${commercialContext.keyBenefits[0]}
Target audience: ${commercialContext.targetAudience}
${commercialContext.ctaSuggestion ? `Call-to-action: ${commercialContext.ctaSuggestion}` : 'Encourage the next step'}
${commercialContext.socialProof ? `Credibility: ${commercialContext.socialProof}` : ''}
${commercialContext.pricePosition ? `Value positioning: ${commercialContext.pricePosition}` : ''}

Your closing MUST:
- Reinforce the key transformation/benefit
- Create a sense of urgency or opportunity
- Include a clear call-to-action direction
- Be confident and decisive
- End with momentum that drives action`
    }
  }

  // Build section-specific 3-paragraph instructions
  let paragraphStructureInstructions = ''
  if (contentType === 'section') {
    paragraphStructureInstructions = `

📝 PARAGRAPH STRUCTURE REQUIREMENT (CRITICAL):
You MUST write EXACTLY 3 SEPARATE PARAGRAPHS for this section.
- PARAGRAPH 1: 250-300 characters (target: 250) - Introduce the concept
- PARAGRAPH 2: 250-300 characters (target: 250) - Expand with details/examples
- PARAGRAPH 3: 250-300 characters (target: 250) - Conclude with insights/takeaway

FORMAT REQUIREMENT:
- Separate each paragraph with a BLANK LINE (double newline)
- Each paragraph should be self-contained but flow naturally
- The 3 paragraphs combined should total ~150 words
- Do NOT merge paragraphs - keep them distinctly separated

Example structure:
[First paragraph text here - 250-300 characters]

[Second paragraph text here - 250-300 characters]

[Third paragraph text here - 250-300 characters]`
  } else if (contentType === 'overview') {
    paragraphStructureInstructions = `

📝 PARAGRAPH STRUCTURE REQUIREMENT (CRITICAL):
You MUST write EXACTLY 2 SEPARATE PARAGRAPHS for the overview.
- PARAGRAPH 1: 250-300 characters (target: 250) - Hook the reader and introduce the topic
- PARAGRAPH 2: 250-300 characters (target: 250) - Preview key themes/sections and build anticipation

FORMAT REQUIREMENT:
- Separate paragraphs with a BLANK LINE (double newline)
- The 2 paragraphs combined should total ~100 words
- Do NOT merge paragraphs - keep them distinctly separated

Example structure:
[First paragraph text here - 250-300 characters]

[Second paragraph text here - 250-300 characters]`
  }

  return `Write ${contentType} content.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
CONTEXT: ${context}

⚠️ CRITICAL WORD COUNT REQUIREMENT ⚠️
You MUST write between ${minWords} and ${maxWords} words (target: ${targetWords}).
- Count your words carefully
- Stop when you reach the target
- DO NOT exceed ${maxWords} words under any circumstances

INSTRUCTION: ${typeInstruction}
${listicleInstructions}
${recipeInstructions}
${reviewInstructions}
${comparisonInstructions}
${commercialInstructions}
${paragraphStructureInstructions}
${h1PromiseContext || ''}

CONTENT RULES:
- Write EXACTLY ${targetWords} words total (±10% = ${minWords}-${maxWords} words)
${contentType === 'section' ? `- EXACTLY 3 paragraphs of ~50 words each (150 words total)
- CRITICAL: Each paragraph MUST be 250-320 characters max, 45-55 words
- BALANCE: Distribute words evenly across paragraphs (do NOT make any paragraph longer than 55 words)` : contentType === 'overview' ? `- EXACTLY 2 paragraphs of ~50 words each (100 words total)
- CRITICAL: Each paragraph MUST be 250-320 characters max, 45-55 words
- BALANCE: Distribute words evenly across paragraphs` : '- Plain paragraph text only'}
- Include "${primaryKeyword}" 1-2 times naturally
- Clear, engaging, valuable content
- NO HTML, NO markdown, NO formatting
- NO bullet points, NO numbered lists
- BE UNIQUE - vary sentence structure, word choice, and opening phrases
${h2NoRepeatRule}

⚠️ PARAGRAPH CHECK: Each paragraph must be 250-320 characters. Do NOT exceed 320 characters per paragraph.
Output the content directly.`
}
