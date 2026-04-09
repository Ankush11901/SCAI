/**
 * Component Generation Prompts
 * 
 * Prompt templates for generating unique article components:
 * Product cards, feature lists, pros/cons, ingredients, etc.
 * 
 * Enhanced with SCAI production rules for forbidden content,
 * symbol usage, and character limits.
 */

import {
  FORBIDDEN_PHRASES,
  APPROVED_SYMBOLS,
  CHARACTER_LIMITS,
  WORD_COUNT_RULES,
  HEADER_CONSISTENCY_RULES,
} from '@/lib/ai/rules/forbidden-content'

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS WITH EMBEDDED RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build forbidden buzzwords block for prompts
 */
function getBuzzwordsBlock(): string {
  return `
🚫 BANNED MARKETING BUZZWORDS (AUTOMATIC REJECTION - NEVER USE):
${FORBIDDEN_PHRASES.contentBuzzwords.join(', ')}

INSTEAD OF BUZZWORDS, USE:
- Specific numbers, facts, and measurements
- Concrete descriptions with technical details
- Measurable benefits (percentages, comparisons)
- Plain descriptive language`
}

/**
 * Build forbidden phrases block for prompts
 */
function getForbiddenPhrasesBlock(): string {
  return `
FORBIDDEN PHRASES (NEVER USE):
Closing H2 forbidden: ${FORBIDDEN_PHRASES.closingH2.slice(0, 10).join(', ')}...
Closing paragraph starts: ${FORBIDDEN_PHRASES.closingParagraphStart.join(', ')}
H2 general forbidden: ${FORBIDDEN_PHRASES.h2General.slice(0, 8).join(', ')}...
H1 generic filler: ${FORBIDDEN_PHRASES.h1Generic.slice(0, 6).join(', ')}...`
}

/**
 * Build symbol rules block for prompts
 */
function getSymbolRulesBlock(): string {
  return `
SYMBOL RULES:
- APPROVED symbols: ${APPROVED_SYMBOLS.checkmark}, ${APPROVED_SYMBOLS.bullet}, ${APPROVED_SYMBOLS.plus}, ${APPROVED_SYMBOLS.minus}, ${APPROVED_SYMBOLS.dash}
- FORBIDDEN: ALL emojis, decorative symbols, ★ ☆ ❤ ♡ etc. (except ${APPROVED_SYMBOLS.starFilled}${APPROVED_SYMBOLS.starEmpty} for ratings)
- Use approved bullets for lists ONLY when appropriate
- NO symbols in H1, H2, H3 headings`
}

/**
 * Build character limits block for prompts
 */
function getCharacterLimitsBlock(): string {
  return `
CHARACTER LIMITS (STRICT):
- H1: ${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} chars
- H2: ${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} chars
- Closing H2: ${CHARACTER_LIMITS.closingH2.min}-${CHARACTER_LIMITS.closingH2.max} chars
- Rating H2: max ${CHARACTER_LIMITS.ratingH2.max} chars
- FAQ H2: max ${CHARACTER_LIMITS.faqH2.max} chars
- Quick Facts H2: ${CHARACTER_LIMITS.quickFactsH2.min}-${CHARACTER_LIMITS.quickFactsH2.max} chars
- Meta Title: ${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} chars`
}

/**
 * Build word count rules block for prompts
 */
function getWordCountRulesBlock(): string {
  return `
WORD COUNT TARGETS (±5 tolerance):
- Overview paragraph: ${WORD_COUNT_RULES.overviewParagraph.target} words
- Standard paragraph: ${WORD_COUNT_RULES.standardParagraph.target} words
- Closing paragraph: ${WORD_COUNT_RULES.closingParagraph.target} words
- FAQ answer: ${WORD_COUNT_RULES.faqAnswer.target} words
- Ingredients list: ~${WORD_COUNT_RULES.ingredientsList.target} words
- Tips paragraph: ${WORD_COUNT_RULES.tipsParagraph.target} words`
}

/**
 * Build header consistency rules block for prompts
 */
function getHeaderConsistencyBlock(): string {
  return `
HEADER CONSISTENCY RULES:
- H2s MUST match H1 format (Question→Question, Statement→Statement, Listicle→Numbered)
- NO colons in H2 titles
- NO "and" or "or" in H2 titles (single focus)
- CLOSING H2 in listicle format is NOT numbered (structural section)
- Component H2s (inside components) are NEVER numbered`
}

export const COMPONENT_SYSTEM_PROMPT = `You are an expert content writer specializing in creating engaging, structured content components. Your outputs MUST follow these STRICT rules:

COMPONENT RULES:
- Follow exact word count and item count requirements
- Use specific, detailed information
- Maintain consistent formatting
- Create compelling, actionable content
${getBuzzwordsBlock()}
${getForbiddenPhrasesBlock()}
${getSymbolRulesBlock()}
${getCharacterLimitsBlock()}
${getHeaderConsistencyBlock()}

GRAMMAR & QUALITY:
- Perfect grammar, spelling, and punctuation required
- Use clear, complete sentences
- Ensure parallel structure in lists
- Consistent tense throughout
- Proofread all outputs before returning

OUTPUT FORMAT:
Return ONLY valid JSON matching the requested schema. No markdown, no explanations.`

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE: PRODUCT CARD
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductCardPromptParams {
  topic: string
  primaryKeyword: string
  productIndex: number
  totalProducts: number
  badge?: string
  priceRange?: string
}

export function buildProductCardPrompt(params: ProductCardPromptParams): string {
  const {
    topic,
    primaryKeyword,
    productIndex,
    totalProducts,
    badge = productIndex === 0 ? 'Best Overall' : productIndex === 1 ? 'Best Value' : 'Premium Pick',
    priceRange = '$50-$200'
  } = params

  return `Generate a product card for an affiliate article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
PRODUCT NUMBER: ${productIndex + 1} of ${totalProducts}
SUGGESTED BADGE: ${badge}
PRICE RANGE: ${priceRange}

REQUIREMENTS:
- Product H2: Max 60 characters, compelling
- Product name: Realistic, brandable name
- Short description: 30-50 words for card display
- Features: 5-7 specific features/benefits
- Price: Realistic price in ${priceRange} range
- Badge: "${badge}" or similar positioning
- Detailed description: EXACTLY 150 words explaining why this product is recommended

H2 REQUIREMENTS:
- Inspiration (do NOT copy these, create your own original phrasing): "Top Pick for ${topic}", "Best Budget ${topic} Option", "Premium ${topic} Selection"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "name": "Product Name Here",
  "shortDescription": "30-50 word card description",
  "features": ["Feature 1", "Feature 2", ...],
  "price": "$XX.XX",
  "badge": "${badge}",
  "description": "150-word detailed description"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: FEATURE LIST
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureListPromptParams {
  topic: string
  primaryKeyword: string
  productOrService: string
  coreKeywords?: string[]
}

export function buildFeatureListPrompt(params: FeatureListPromptParams): string {
  const { topic, primaryKeyword, productOrService, coreKeywords } = params

  const hasExtractedKeywords = coreKeywords && coreKeywords.length > 0
  const keywordGuidance = hasExtractedKeywords
    ? `\n- For H2: Use keywords naturally (${coreKeywords.join(', ')}) - avoid forcing the full phrase "${primaryKeyword}"`
    : `\n- For H2: Include "${primaryKeyword}" when natural`

  return `Generate a feature list for a commercial article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}${hasExtractedKeywords ? `\nCORE KEYWORDS: ${coreKeywords.join(', ')}` : ''}
PRODUCT/SERVICE: ${productOrService}

REQUIREMENTS:
- H2: 40-60 characters, compelling headline about features${keywordGuidance}
- 5-7 features total
- Each feature title: 3-6 words (max 50 chars)
- Each feature description: 15-30 words (max 150 chars) - keep concise!
- Total word count: 100-150 words
- Highlight unique selling points
- Benefits-focused (not just specs)

H2 REQUIREMENTS:
- Inspiration (do NOT copy these, create your own original phrasing): "What ${productOrService} Brings to the Table", "Standout ${productOrService} Features", "Why ${productOrService} Stands Out"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "features": [
    { "title": "Short Feature Title", "description": "Concise 15-30 word description" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL: CTA BOX
// ═══════════════════════════════════════════════════════════════════════════════

export interface CtaBoxPromptParams {
  topic: string
  primaryKeyword: string
  offerType: string
}

export function buildCtaBoxPrompt(params: CtaBoxPromptParams): string {
  const { topic, primaryKeyword, offerType } = params

  return `Generate a CTA box for a commercial article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
OFFER TYPE: ${offerType}

REQUIREMENTS:
- Headline: Compelling, action-oriented (max 60 chars)
- Body: 20-30 words explaining the offer/value
- Button text: Clear call-to-action (5-25 chars)

HEADLINE REQUIREMENTS:
- Inspiration (do NOT copy these, create your own original phrasing): "Get Started with ${topic} Today", "Ready to Try ${topic}?", "Claim Your ${topic} Deal"
- CRITICAL: Generate your OWN original headline — do NOT copy the examples above. Use them only as inspiration for the style and tone.

Return JSON (the headline below is a PLACEHOLDER — you MUST replace it with your own original):
{
  "headline": "YOUR ORIGINAL HEADLINE HERE",
  "body": "20-30 word description of the offer",
  "buttonText": "Action Text"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON: COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComparisonTablePromptParams {
  topic: string
  itemA: string
  itemB: string
}

export function buildComparisonTablePrompt(params: ComparisonTablePromptParams): string {
  const { topic, itemA, itemB } = params

  return `Generate a comparison table for a comparison article.

TOPIC: ${topic}
ITEM A: ${itemA}
ITEM B: ${itemB}

REQUIREMENTS:
- H2: 40-50 characters, compelling comparison headline
- 5-8 comparison criteria
- Each criterion: Name + value for both items
- Values should be concise but informative
- Fair, balanced comparison
- Total words: 120-150

H2 REQUIREMENTS:
- Inspiration (do NOT copy these, create your own original phrasing): "How ${itemA} Stacks Up Against ${itemB}", "Feature-by-Feature Breakdown", "${itemA} Versus ${itemB} at a Glance"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "itemNames": ["${itemA}", "${itemB}"],
  "criteria": [
    { "name": "Criterion", "valueA": "Value for A", "valueB": "Value for B" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW: PROS & CONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProsConsPromptParams {
  topic: string
  primaryKeyword: string
  productName: string
  titleFormat?: 'question' | 'statement' | 'listicle'
  coreKeywords?: string[]
}

export function buildProsConsPrompt(params: ProsConsPromptParams): string {
  const { topic, primaryKeyword, productName, titleFormat = 'statement', coreKeywords } = params

  const hasExtractedKeywords = coreKeywords && coreKeywords.length > 0
  const keywordList = hasExtractedKeywords ? coreKeywords.join(', ') : primaryKeyword

  // Component H2s are NEVER numbered (they're inside components, not list items)
  // ⚠️ CRITICAL: H2s MUST NOT contain "and", "or", "Versus", "Plus", "Then"
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION that frames the evaluation\n- MUST end with ?\n- ⚠️ NEVER use "and", "or", "Versus", "Plus", "Then"`,
    statement: `- H2 MUST be a STATEMENT that frames the evaluation\n- NO question marks\n- ⚠️ NEVER use "and", "or", "Versus", "Plus", "Then"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- ⚠️ NEVER use "and", "or", "Versus", "Plus", "Then"`
  }

  const keywordInstruction = hasExtractedKeywords
    ? `- Use keywords naturally in H2: ${keywordList}\n- AVOID forcing the full phrase "${primaryKeyword}"`
    : `- Include "${primaryKeyword}" in H2 when possible for SEO`

  return `Generate pros and cons for a review article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}${hasExtractedKeywords ? `\nCORE KEYWORDS: ${keywordList}` : ''}
PRODUCT: ${productName}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: 40-50 characters
- ⚠️ CRITICAL: H2 MUST NOT contain "and", "or", "Versus", "Plus", "Then" (WILL BE REJECTED)
${keywordInstruction}

H2 APPROACH: Frame the evaluation WITHOUT listing both sides in the heading. Focus on ONE angle — the heading sits above a visual pros/cons box, so the reader already knows what's inside.

Inspiration (do NOT copy these — create your own original phrasing):
✅ "Honest Take on ${productName}"
✅ "Where ${productName} Delivers"
✅ "${productName} Put to the Test"
✅ "The Real Deal with ${productName}"
✅ "Is ${productName} Worth the Hype?"
✅ "What ${productName} Gets Right"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above.
- BANNED words in H2: "Essential", "Benefits", "Versus", "Challenges", "Advantages"

BAD H2 EXAMPLES (REJECTED — forced conjunctions or listing both sides):
❌ "Pros and Cons" (contains "and")
❌ "Benefits Versus Challenges" (forced, awkward)
❌ "Strengths Plus Limitations" (robotic)
❌ "Advantages Then Drawbacks" (unnatural)
❌ Any H2 that tries to name BOTH pros AND cons — just frame the evaluation

CONTENT REQUIREMENTS:
- Pros: 5-7 items, ~75 words total
- Cons: 5-7 items, ~75 words total
- Each item: 10-15 words, specific and credible
- Balanced perspective
- Real-world considerations
- ⚠️ NO BUZZWORDS: Never use "innovative", "seamless", "cutting-edge", "game-changer", etc.

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "pros": ["Pro 1 (10-15 words, no buzzwords)", "Pro 2", ...],
  "cons": ["Con 1 (10-15 words, no buzzwords)", "Con 2", ...]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW: RATING
// ═══════════════════════════════════════════════════════════════════════════════

export interface RatingPromptParams {
  topic: string
  primaryKeyword: string
  productName: string
  prosConsContext: string
  titleFormat?: 'question' | 'statement' | 'listicle'
  coreKeywords?: string[]
}

export function buildRatingPrompt(params: RatingPromptParams): string {
  const { topic, primaryKeyword, productName, prosConsContext, titleFormat = 'statement', coreKeywords } = params

  const hasExtractedKeywords = coreKeywords && coreKeywords.length > 0
  const keywordInstruction = hasExtractedKeywords
    ? `- Use keywords naturally in H2: ${coreKeywords.join(', ')}\n- AVOID forcing the full phrase "${primaryKeyword}"`
    : `- Include "${primaryKeyword}" in H2 when possible for SEO`

  // Component H2s are NEVER numbered (they're inside components, not list items)
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION\n- Inspiration (do NOT copy these, create your own): "What Is the ${productName} Score?", "How Does ${productName} Rate Overall?"\n- MUST end with ?`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "${productName} Final Score", "Rating ${productName} Overall", "Our ${productName} Assessment"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "Our ${productName} Verdict", "${productName} Score Breakdown"`
  }

  return `Generate a rating for a review article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}${hasExtractedKeywords ? `\nCORE KEYWORDS: ${coreKeywords.join(', ')}` : ''}
PRODUCT: ${productName}
CONTEXT: ${prosConsContext}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: Max 30 characters
${keywordInstruction}
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.

CONTENT REQUIREMENTS:
- Score: 1-10 (realistic based on pros/cons)
- Score display: "X.X/10" format
- Justification: EXACTLY 100 words explaining the score
- ⚠️ NO BUZZWORDS: Never use "innovative", "seamless", "cutting-edge", "game-changer", etc.

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "score": 8.5,
  "scoreDisplay": "8.5/10",
  "justification": "100-word justification (no buzzwords)"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INGREDIENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface IngredientsPromptParams {
  recipeTopic: string
  primaryKeyword: string
  servings: number
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildIngredientsPrompt(params: IngredientsPromptParams): string {
  const { recipeTopic, primaryKeyword, servings, titleFormat = 'statement' } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION that ends with ?\n- Inspiration (do NOT copy these, create your own): "What Goes Into ${recipeTopic}?", "Which Ingredients Make ${recipeTopic} Special?"`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "Key ${recipeTopic} Ingredients", "Gathering Your ${recipeTopic} Ingredients", "Must-Have ${recipeTopic} Components", "${recipeTopic} Pantry Staples"\n- BANNED words in H2: "Essential" (overused)`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "${recipeTopic} Ingredient Checklist", "Everything for ${recipeTopic}"`
  }

  return `Generate an ingredients list for a recipe article.

RECIPE: ${recipeTopic}
PRIMARY KEYWORD: ${primaryKeyword}
SERVINGS: ${servings}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: Max 40 characters
- H2 MUST be unique to this specific recipe — NEVER use generic headings like "Ingredients" or "Recipe Ingredients"
- H2 MUST mention the recipe name or a distinguishing detail
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words: "Essential" (overused)

CONTENT REQUIREMENTS:
- 8-15 ingredients
- Each: Quantity + name + optional notes
- Realistic, accurate measurements
- If the same ingredient appears for different stages (e.g., water for soaking vs cooking), label its purpose in the name or notes (e.g., "water (for soaking)")
- Total ~150 words

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "items": [
    { "quantity": "2 cups", "name": "all-purpose flour", "notes": "sifted" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface InstructionsPromptParams {
  recipeTopic: string
  primaryKeyword: string
  ingredients: string[]
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildInstructionsPrompt(params: InstructionsPromptParams): string {
  const { recipeTopic, primaryKeyword, ingredients, titleFormat = 'statement' } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION that ends with ?\n- Inspiration (do NOT copy these, create your own): "How Do You Make ${recipeTopic}?", "What Are the Steps for ${recipeTopic}?"`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "Cooking ${recipeTopic} from Scratch", "Preparing ${recipeTopic} at Home", "Making ${recipeTopic} the Right Way"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "Preparing ${recipeTopic} Step by Step", "Making ${recipeTopic} from Start to Finish"`
  }

  return `Generate cooking instructions for a recipe article.

RECIPE: ${recipeTopic}
PRIMARY KEYWORD: ${primaryKeyword}
INGREDIENTS: ${ingredients.join(', ')}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: Max 50 characters
- H2 MUST be unique to this specific recipe — NEVER use generic headings like "Instructions" or "Cooking Instructions"
- H2 MUST mention the recipe name or a distinguishing detail
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.

CONTENT REQUIREMENTS:
- 6-12 numbered steps
- Each step: 50-350 characters (roughly 10-60 words), clear and actionable
- Total: 150-400 words across all steps
- Reference specific ingredients and techniques

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "steps": [
    { "number": 1, "text": "Step instruction here (50-350 characters)" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE: NUTRITION TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface NutritionPromptParams {
  recipeTopic: string
  servings: number
  recipeType: 'dessert' | 'main' | 'side' | 'snack' | 'beverage'
  titleFormat?: 'question' | 'statement' | 'listicle'
  ingredientContext?: string
}

export function buildNutritionPrompt(params: NutritionPromptParams): string {
  const { recipeTopic, servings, recipeType, titleFormat = 'statement', ingredientContext } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION that ends with ?\n- Inspiration (do NOT copy these, create your own): "How Healthy Is ${recipeTopic}?", "What Nutrition Does ${recipeTopic} Offer?"`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "${recipeTopic} Nutrition Profile", "${recipeTopic} Calorie Breakdown", "Nutritional Value of ${recipeTopic}"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "${recipeTopic} Nutrition at a Glance", "${recipeTopic} Dietary Breakdown"`
  }

  const ingredientLine = ingredientContext ? `\nBASED ON INGREDIENTS: ${ingredientContext}` : ''

  return `Generate nutrition information for a recipe article.

RECIPE: ${recipeTopic}
SERVINGS: ${servings}
TYPE: ${recipeType}
FORMAT: ${titleFormat.toUpperCase()}${ingredientLine}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: Max 40 characters
- H2 MUST be unique to this specific recipe — NEVER use generic headings like "Nutrition Facts" or "Nutritional Information"
- H2 MUST mention the recipe name or a distinguishing detail
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.

CONTENT REQUIREMENTS:
- Realistic values for this recipe type
- Per serving values
- MUST include disclaimer: "Approximate nutritional values. Actual nutrition may vary."

DISCLAIMER REQUIREMENT (CRITICAL):
The nutrition table MUST include this exact disclaimer text at the bottom:
"Approximate nutritional values. Actual nutrition may vary."

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "servingSize": "1 serving",
  "servings": ${servings},
  "disclaimer": "Approximate nutritional values. Actual nutrition may vary.",
  "facts": {
    "calories": 250,
    "totalFat": "12g",
    "saturatedFat": "5g",
    "cholesterol": "45mg",
    "sodium": "380mg",
    "carbohydrates": "28g",
    "fiber": "2g",
    "sugar": "14g",
    "protein": "6g"
  }
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO: MATERIALS BOX
// ═══════════════════════════════════════════════════════════════════════════════

export interface MaterialsPromptParams {
  topic: string
  primaryKeyword: string
}

export function buildMaterialsPrompt(params: MaterialsPromptParams): string {
  const { topic, primaryKeyword } = params

  return `Generate a materials/requirements list for a how-to article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}

REQUIREMENTS:
- H2: 40-50 characters, compelling headline for materials/requirements
- 5-15 items
- Each: Name + optional specs/quantity
- Mark optional items
- Total: 20-120 words
- Practical, commonly available items

H2 REQUIREMENTS:
- Inspiration (do NOT copy these, create your own original phrasing): "What You Need to Get Started", "Your ${topic} Toolkit", "Gather These Supplies First"
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "items": [
    { "name": "Item name", "specs": "Optional specs", "optional": false },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO: PRO TIPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProTipsPromptParams {
  topic: string
  primaryKeyword: string
  stepsContext: string
}

export function buildProTipsPrompt(params: ProTipsPromptParams): string {
  const { topic, primaryKeyword, stepsContext } = params

  return `Generate pro tips for a how-to article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
STEPS CONTEXT: ${stepsContext}

REQUIREMENTS:
- 5-7 tips
- Each tip: 15-25 words
- Total: 80-120 words
- Expert-level insights
- Common mistakes to avoid
- Time-saving shortcuts
- CRITICAL: Generate your OWN original tips — do NOT use generic filler like "Practice makes perfect" or "Start with the basics"

Return JSON:
{
  "tips": ["Pro tip 1 (15-25 words)", "Pro tip 2", ...]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL: QUICK FACTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuickFactsPromptParams {
  topic: string
  primaryKeyword: string
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildQuickFactsPrompt(params: QuickFactsPromptParams): string {
  const { topic, primaryKeyword, titleFormat = 'statement' } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION\n- Inspiration (do NOT copy these, create your own): "What Should You Know About ${primaryKeyword}?", "How Does ${primaryKeyword} Measure Up?"\n- MUST end with ?`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "${primaryKeyword} by the Numbers", "Fast Facts on ${primaryKeyword}", "${primaryKeyword} at a Glance"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "${primaryKeyword} in Numbers", "The ${primaryKeyword} Rundown"`
  }

  return `Generate quick facts for an informational article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: 40-50 characters
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

CONTENT REQUIREMENTS:
- 5-7 facts
- Each: Label + value format
- Total: 80-100 words
- Interesting, shareable facts

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "facts": [
    { "label": "Fact label", "value": "Fact value" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL: WHY CHOOSE LOCAL
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhyChooseLocalPromptParams {
  topic: string
  primaryKeyword: string
  locationName: string
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildWhyChooseLocalPrompt(params: WhyChooseLocalPromptParams): string {
  const { topic, primaryKeyword, locationName, titleFormat = 'statement' } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION\n- Inspiration (do NOT copy these, create your own): "Why Go Local for ${topic}?", "What Makes Neighborhood ${topic} Different?"\n- MUST end with ?`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "The Local ${topic} Advantage in ${locationName}", "Why Neighborhood ${topic} Matters", "Choosing ${topic} Close to Home"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "Perks of a Local ${topic}", "Nearby ${topic} Benefits"`
  }

  return `Generate "Why Choose Local" content for a local article about ${topic}.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
LOCATION: ${locationName}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: 50-60 characters
- H2 must be SPECIFIC to ${topic}, not generic "why choose local" phrasing
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

CONTENT REQUIREMENTS:
- 4-5 reasons specific to choosing a LOCAL ${topic}
- Each reason: 10-15 words
- Total: 50-75 words
- Reasons must be SPECIFIC to ${topic}, not generic business platitudes
- ✅ GOOD: "Staff who know the neighborhood can recommend the right membership tier"
- ❌ BAD: "Personalized service tailored to community needs" (vague, applies to anything)
- Mention tangible local benefits: walking distance, knowing staff, community events, local partnerships

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "reasons": ["Reason 1 (10-15 words, specific to ${topic})", "Reason 2", ...]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTICLE: HONORABLE MENTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface HonorableMentionsPromptParams {
  topic: string
  primaryKeyword: string
  mainListItems: string[]
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildHonorableMentionsPrompt(params: HonorableMentionsPromptParams): string {
  const { topic, primaryKeyword, mainListItems, titleFormat = 'statement' } = params

  // Component H2s are NEVER numbered
  const formatInstructions = {
    question: `- H2 MUST be a QUESTION\n- Inspiration (do NOT copy these, create your own): "What Other ${topic} Deserve a Look?", "Which ${topic} Almost Made the Cut?"\n- MUST end with ?`,
    statement: `- H2 MUST be a STATEMENT (NO question marks)\n- Inspiration (do NOT copy these, create your own original phrasing): "More ${topic} Worth Your Time", "Close Contenders in ${topic}", "${topic} That Nearly Made the List"`,
    listicle: `- H2 MUST be a STATEMENT (NOT numbered - component H2s are never numbered)\n- Inspiration (do NOT copy, create your own): "Additional ${topic} to Consider", "Runner-Up ${topic} Picks"`
  }

  return `Generate honorable mentions for a listicle article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
MAIN LIST ITEMS (already covered): ${mainListItems.join(', ')}
FORMAT: ${titleFormat.toUpperCase()}

H2 FORMAT REQUIREMENTS:
${formatInstructions[titleFormat]}
- H2: 40-50 characters
- CRITICAL: Generate your OWN original H2 — do NOT copy the examples above. Use them only as inspiration for the style and tone.
- BANNED words in H2: "Essential" (overused)

CONTENT REQUIREMENTS:
- 3-4 additional items NOT in main list
- Each: H3 heading (15-50 chars) + description (40-50 words)
- Items that almost made the main list

Return JSON (the h2 below is a PLACEHOLDER — you MUST replace it with your own original H2):
{
  "h2": "YOUR ORIGINAL H2 HERE",
  "items": [
    { "h3": "Item H3 heading", "description": "40-50 word description" },
    ...
  ]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_PROMPTS = {
  productCard: buildProductCardPrompt,
  featureList: buildFeatureListPrompt,
  ctaBox: buildCtaBoxPrompt,
  comparisonTable: buildComparisonTablePrompt,
  prosCons: buildProsConsPrompt,
  rating: buildRatingPrompt,
  ingredients: buildIngredientsPrompt,
  instructions: buildInstructionsPrompt,
  nutrition: buildNutritionPrompt,
  materials: buildMaterialsPrompt,
  proTips: buildProTipsPrompt,
  quickFacts: buildQuickFactsPrompt,
  whyChooseLocal: buildWhyChooseLocalPrompt,
  honorableMentions: buildHonorableMentionsPrompt,
}
