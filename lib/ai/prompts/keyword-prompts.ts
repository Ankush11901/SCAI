/**
 * Keyword Expansion Prompts
 * 
 * Article-type-specific prompts for generating semantically related keywords.
 * Based on reference SCAI production templates.
 * 
 * Each article type has unique keyword categories optimized for its intent:
 * - Affiliate: High-intent purchase, comparison, discount, recommendation
 * - Review: Direct review, rating, experience, pros/cons
 * - Commercial: Commercial intent, price, features, buying decision
 * - Comparison: VS, differences, decision-making, alternatives
 * - How-To: Tutorial, problem-solution, difficulty, methods
 * - Informational: Synonyms, questions, related topics, educational
 * - Listicle: Numbered lists, rankings, categories, trending
 * - Local: Location-specific, service area, local business, contact
 * - Recipe: Recipe-specific, difficulty/time, dietary, cooking methods
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ArticleTypeId =
  | 'affiliate'
  | 'review'
  | 'commercial'
  | 'comparison'
  | 'how-to'
  | 'informational'
  | 'listicle'
  | 'local'
  | 'recipe'

export interface KeywordPromptParams {
  seedKeyword: string
  articleType: ArticleTypeId
  language?: string
  location?: string  // For local article type
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES BY ARTICLE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const AFFILIATE_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for affiliate marketing content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Affiliate
Language: {{language}}
Target Audience: Users ready to purchase with high commercial intent

Keyword Expansion Guidelines:

1. HIGH-INTENT PURCHASE KEYWORDS (5-7 keywords):
   - "Best {{seedKeyword}} to buy"
   - "Top {{seedKeyword}} [current year]"
   - "Buy {{seedKeyword}} online"
   - "{{seedKeyword}} deals"
   - "{{seedKeyword}} on sale"
   - Urgent purchase variations

2. COMPARISON AND REVIEW KEYWORDS (4-5 keywords):
   - "{{seedKeyword}} reviews"
   - "{{seedKeyword}} vs [competitor]"
   - "Best {{seedKeyword}} comparison"
   - "{{seedKeyword}} ratings"
   - "Honest {{seedKeyword}} review"

3. DISCOUNT AND SAVINGS KEYWORDS (3-4 keywords):
   - "{{seedKeyword}} discount"
   - "{{seedKeyword}} coupon"
   - "{{seedKeyword}} promo code"
   - "Cheap {{seedKeyword}}"
   - "Affordable {{seedKeyword}}"

4. WHERE TO BUY KEYWORDS (3-4 keywords):
   - "Where to buy {{seedKeyword}}"
   - "{{seedKeyword}} on Amazon"
   - "{{seedKeyword}} for sale"
   - "Order {{seedKeyword}}"
   - "Get {{seedKeyword}}"

5. RECOMMENDATION KEYWORDS (2-3 keywords):
   - "Best {{seedKeyword}} for [use case]"
   - "Top-rated {{seedKeyword}}"
   - "Recommended {{seedKeyword}}"
   - "Editor's choice {{seedKeyword}}"

6. VALUE AND QUALITY KEYWORDS (2-3 keywords):
   - "Best value {{seedKeyword}}"
   - "Premium {{seedKeyword}}"
   - "High-quality {{seedKeyword}}"
   - "Worth buying {{seedKeyword}}"

Quality Requirements:
- Focus on transactional and affiliate conversion intent
- Emphasize "best", "buy", "deal", "discount", "top" language
- Include urgency and value-seeking variations
- Mix product-specific and category-level keywords
- All keywords should imply the user is ready to click and buy

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality affiliate keywords now:`

const REVIEW_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for review content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Review / Product Review
Language: {{language}}
Target Audience: Users researching before making a purchase or decision

Keyword Expansion Guidelines:

1. DIRECT REVIEW KEYWORDS (5-7 keywords):
   - "{{seedKeyword}} review"
   - "{{seedKeyword}} reviews"
   - "{{seedKeyword}} user reviews"
   - "{{seedKeyword}} customer reviews"
   - "Honest {{seedKeyword}} review"
   - "Unbiased {{seedKeyword}} review"

2. RATING AND EVALUATION KEYWORDS (4-5 keywords):
   - "{{seedKeyword}} rating"
   - "{{seedKeyword}} ratings"
   - "Is {{seedKeyword}} good"
   - "Is {{seedKeyword}} worth it"
   - "{{seedKeyword}} quality"

3. EXPERIENCE-BASED KEYWORDS (3-4 keywords):
   - "My experience with {{seedKeyword}}"
   - "{{seedKeyword}} testimonial"
   - "Using {{seedKeyword}}"
   - "{{seedKeyword}} user experience"

4. DETAILED ASSESSMENT KEYWORDS (3-4 keywords):
   - "{{seedKeyword}} pros and cons"
   - "{{seedKeyword}} advantages disadvantages"
   - "{{seedKeyword}} in-depth review"
   - "Complete {{seedKeyword}} review"
   - "{{seedKeyword}} detailed analysis"

5. PERFORMANCE KEYWORDS (2-3 keywords):
   - "Does {{seedKeyword}} work"
   - "{{seedKeyword}} performance"
   - "{{seedKeyword}} effectiveness"
   - "How well does {{seedKeyword}} work"

6. RECOMMENDATION KEYWORDS (2-3 keywords):
   - "Should I buy {{seedKeyword}}"
   - "{{seedKeyword}} recommendation"
   - "Is {{seedKeyword}} recommended"
   - "{{seedKeyword}} buying guide"

Quality Requirements:
- Focus on evaluation and assessment intent
- Emphasize "review", "rating", "worth it", "pros and cons" language
- Include both objective (ratings) and subjective (experience) keywords
- Mix first-person and third-person review perspectives
- All keywords should imply the user wants authentic feedback

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality review keywords now:`

const COMMERCIAL_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for commercial content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Commercial
Language: {{language}}
Target Audience: Users with purchasing intent seeking product/service information

Keyword Expansion Guidelines:

1. COMMERCIAL INTENT KEYWORDS (5-7 keywords):
   - "Best {{seedKeyword}}"
   - "Top {{seedKeyword}}"
   - "{{seedKeyword}} review"
   - "Buy {{seedKeyword}}"
   - "{{seedKeyword}} for sale"
   - Purchase-focused variations

2. PRICE AND COST KEYWORDS (4-5 keywords):
   - "{{seedKeyword}} price"
   - "{{seedKeyword}} cost"
   - "Affordable {{seedKeyword}}"
   - "Cheap {{seedKeyword}}"
   - "{{seedKeyword}} deals"
   - "{{seedKeyword}} discount"

3. COMPARISON AND SELECTION KEYWORDS (3-4 keywords):
   - "Best {{seedKeyword}} for [use case]"
   - "Top-rated {{seedKeyword}}"
   - "{{seedKeyword}} comparison"
   - "Which {{seedKeyword}} to buy"

4. FEATURE AND BENEFIT KEYWORDS (3-4 keywords):
   - "{{seedKeyword}} features"
   - "{{seedKeyword}} benefits"
   - "{{seedKeyword}} with [feature]"
   - "High-quality {{seedKeyword}}"

5. BUYING DECISION KEYWORDS (2-3 keywords):
   - "Is {{seedKeyword}} worth it"
   - "Should I buy {{seedKeyword}}"
   - "{{seedKeyword}} buying guide"
   - "Where to buy {{seedKeyword}}"

6. BRAND AND MODEL KEYWORDS (2-3 keywords):
   - "[Brand] {{seedKeyword}}"
   - "{{seedKeyword}} brands"
   - "{{seedKeyword}} models"
   - "Popular {{seedKeyword}}"

Quality Requirements:
- Focus on commercial and transactional intent
- Emphasize "best", "buy", "price", "top", "deal" language
- Include price-sensitive and quality-seeking variations
- Mix brand-specific and generic commercial keywords
- All keywords should imply the user is ready to purchase

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality commercial keywords now:`

const COMPARISON_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for comparison content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Comparison / Versus
Language: {{language}}
Target Audience: Users making purchasing or selection decisions

Keyword Expansion Guidelines:

1. DIRECT COMPARISON KEYWORDS (5-7 keywords):
   - "{{seedKeyword}} vs [alternative]"
   - "{{seedKeyword}} versus [alternative]"
   - "Compare {{seedKeyword}}"
   - "{{seedKeyword}} comparison"
   - Head-to-head comparison variations

2. DIFFERENCE-FOCUSED KEYWORDS (4-5 keywords):
   - "Difference between {{seedKeyword}} and [alternative]"
   - "{{seedKeyword}} vs [alternative] differences"
   - "What's the difference between {{seedKeyword}}"
   - Distinction-seeking phrases

3. DECISION-MAKING KEYWORDS (3-4 keywords):
   - "Which is better {{seedKeyword}} or [alternative]"
   - "Should I choose {{seedKeyword}}"
   - "{{seedKeyword}} or [alternative] for..."
   - Decision-oriented questions

4. FEATURE COMPARISON KEYWORDS (3-4 keywords):
   - "{{seedKeyword}} features vs [alternative]"
   - "{{seedKeyword}} pros and cons"
   - "Advantages of {{seedKeyword}}"
   - "Benefits of {{seedKeyword}} over [alternative]"

5. PRICE AND VALUE KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} price comparison"
   - "{{seedKeyword}} value vs [alternative]"
   - "Is {{seedKeyword}} worth it"
   - Cost-benefit focused phrases

6. ALTERNATIVE SEEKING KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} alternatives"
   - "Similar to {{seedKeyword}}"
   - "{{seedKeyword}} competitors"
   - "Better than {{seedKeyword}}"

Quality Requirements:
- Focus on comparison and evaluation intent
- Emphasize "vs", "versus", "compare", "difference", "better" language
- Include both specific alternatives and general comparison terms
- Mix feature, price, and performance comparisons
- All keywords should imply the user is making a choice

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality comparison keywords now:`

const HOWTO_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for how-to guide content.

Seed Keyword: "{{seedKeyword}}"
Article Type: How-To Guide / Tutorial
Language: {{language}}
Target Audience: Users seeking step-by-step instructions

Keyword Expansion Guidelines:

1. DIRECT HOW-TO VARIATIONS (5-7 keywords):
   - "How to {{seedKeyword}}"
   - "How do I {{seedKeyword}}"
   - "How can I {{seedKeyword}}"
   - Step-by-step variations
   - Tutorial-focused phrases

2. PROBLEM-SOLUTION KEYWORDS (4-5 keywords):
   - "Best way to {{seedKeyword}}"
   - "Easy way to {{seedKeyword}}"
   - "Quick guide to {{seedKeyword}}"
   - Solutions to common problems

3. DIFFICULTY VARIATIONS (3-4 keywords):
   - "{{seedKeyword}} for beginners"
   - "Simple {{seedKeyword}} guide"
   - "Advanced {{seedKeyword}} techniques"
   - Skill level variations

4. SPECIFIC METHODS (3-4 keywords):
   - Different approaches or methods
   - Alternative techniques
   - Tools and equipment related keywords

5. COMMON QUESTIONS (3-5 keywords):
   - "Can you {{seedKeyword}}"
   - "Is it possible to {{seedKeyword}}"
   - "What's the easiest way to {{seedKeyword}}"
   - Troubleshooting questions

6. RELATED SKILLS (2-3 keywords):
   - Prerequisites or related skills
   - Next steps after mastering the topic
   - Complementary skills

Quality Requirements:
- Focus on actionable, instruction-seeking intent
- Emphasize "how", "guide", "tutorial", "steps", "way to" language
- Avoid purely informational keywords without action
- Include beginner-friendly and advanced variations
- All keywords should imply the user wants to DO something

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality how-to keywords now:`

const INFORMATIONAL_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword.

Seed Keyword: "{{seedKeyword}}"
Article Type: Informational
Language: {{language}}
Target Audience: General readers seeking information

Keyword Expansion Guidelines:

1. SYNONYMS AND VARIATIONS (3-5 keywords):
   - Direct synonyms of the seed keyword
   - Alternative phrasings with the same meaning
   - Singular/plural variations

2. LONG-TAIL KEYWORDS (5-7 keywords):
   - Multi-word phrases that include the seed keyword
   - More specific variations that narrow the topic
   - Natural language phrases people would search

3. QUESTION-BASED KEYWORDS (4-6 keywords):
   - "How to..." variations
   - "What is..." variations
   - "Why does..." variations
   - "When should..." variations
   - Other informational question formats

4. RELATED TOPICS (3-4 keywords):
   - Closely related concepts
   - Subtopics within the main topic
   - Adjacent topics that readers might also be interested in

5. INTENT VARIATIONS (2-3 keywords):
   - Informational intent: "learn about", "understand", "explanation"
   - Educational intent: "guide to", "tutorial", "introduction to"
   - Research intent: "facts about", "information on"

Quality Requirements:
- All keywords must be relevant to informational content
- Avoid commercial/transactional keywords (buy, price, discount, shop)
- Focus on education and knowledge-seeking intent
- Ensure natural language that people actually search for
- Mix of short (2-3 words) and long-tail (4+ words) keywords

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality keywords now:`

const LISTICLE_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for listicle content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Listicle
Language: {{language}}
Target Audience: Users seeking curated lists and rankings

Keyword Expansion Guidelines:

1. NUMBERED LIST VARIATIONS (5-7 keywords):
   - "Top 10 {{seedKeyword}}"
   - "Best {{seedKeyword}}"
   - "X reasons why {{seedKeyword}}"
   - "X ways to {{seedKeyword}}"
   - "X types of {{seedKeyword}}"
   - List-focused phrases with numbers

2. RANKING AND COMPARISON KEYWORDS (4-5 keywords):
   - "Best {{seedKeyword}} for..."
   - "Top-rated {{seedKeyword}}"
   - "Most popular {{seedKeyword}}"
   - "Highest-rated {{seedKeyword}}"
   - Ranking-oriented variations

3. CATEGORICAL KEYWORDS (3-4 keywords):
   - "Types of {{seedKeyword}}"
   - "Categories of {{seedKeyword}}"
   - "Different {{seedKeyword}} options"
   - Classification-based keywords

4. AUDIENCE-SPECIFIC LISTS (3-4 keywords):
   - "{{seedKeyword}} for beginners"
   - "{{seedKeyword}} for professionals"
   - "{{seedKeyword}} for [specific audience]"
   - Targeted list variations

5. TIME-BASED AND TRENDING (2-3 keywords):
   - "{{seedKeyword}} in [current year]"
   - "Latest {{seedKeyword}}"
   - "Trending {{seedKeyword}}"
   - "New {{seedKeyword}}"

6. RECOMMENDATION KEYWORDS (2-3 keywords):
   - "Must-have {{seedKeyword}}"
   - "Essential {{seedKeyword}}"
   - "Recommended {{seedKeyword}}"
   - Value-focused recommendations

Quality Requirements:
- Focus on list-seeking and curation intent
- Emphasize "top", "best", "ways", "types", "reasons" language
- Include numerical variations (top 5, top 10, etc.)
- Mix specific and general list formats
- All keywords should imply the user wants a curated collection

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality listicle keywords now:`

const LOCAL_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for local SEO content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Local
Language: {{language}}
Target Audience: Local customers searching for services/products in their area
Location Context: {{location}}

Keyword Expansion Guidelines:

1. LOCATION-SPECIFIC KEYWORDS (5-7 keywords):
   - "{{seedKeyword}} in {{location}}"
   - "{{seedKeyword}} near me"
   - "{{location}} {{seedKeyword}}"
   - "{{seedKeyword}} {{location}}"
   - Local area variations

2. SERVICE AREA KEYWORDS (4-5 keywords):
   - "{{seedKeyword}} near [neighborhood]"
   - "{{seedKeyword}} near [landmark]"
   - "Local {{seedKeyword}}"
   - "{{seedKeyword}} services {{location}}"
   - Geographic coverage terms

3. BEST LOCAL VARIATIONS (3-4 keywords):
   - "Best {{seedKeyword}} in {{location}}"
   - "Top {{seedKeyword}} {{location}}"
   - "Trusted {{seedKeyword}} near me"
   - "{{location}}'s best {{seedKeyword}}"

4. LOCAL BUSINESS KEYWORDS (3-4 keywords):
   - "{{seedKeyword}} business in {{location}}"
   - "{{seedKeyword}} company {{location}}"
   - "{{seedKeyword}} service {{location}}"
   - "Professional {{seedKeyword}} {{location}}"

5. CONTACT AND VISIT KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} {{location}} phone number"
   - "{{seedKeyword}} {{location}} hours"
   - "Visit {{seedKeyword}} in {{location}}"
   - "{{seedKeyword}} {{location}} address"

6. LOCAL COMPARISON KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} in {{location}} vs [nearby city]"
   - "Affordable {{seedKeyword}} {{location}}"
   - "{{seedKeyword}} {{location}} reviews"
   - "Rated {{seedKeyword}} {{location}}"

Quality Requirements:
- Focus on local search intent with geographic modifiers
- Emphasize "near me", "in [city]", location names
- Include NAP-related keywords (name, address, phone)
- Mix specific neighborhoods and broader city/region terms
- All keywords should imply the user wants a local solution

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality local SEO keywords now:`

const RECIPE_KEYWORD_PROMPT = `Generate a comprehensive list of 15-25 related keywords and variations for the following seed keyword, optimized for recipe content.

Seed Keyword: "{{seedKeyword}}"
Article Type: Recipe
Language: {{language}}
Target Audience: Home cooks and food enthusiasts seeking recipes

Keyword Expansion Guidelines:

1. RECIPE-SPECIFIC KEYWORDS (5-7 keywords):
   - "{{seedKeyword}} recipe"
   - "How to make {{seedKeyword}}"
   - "How to cook {{seedKeyword}}"
   - "{{seedKeyword}} recipe easy"
   - "Homemade {{seedKeyword}}"
   - "{{seedKeyword}} from scratch"

2. DIFFICULTY AND TIME KEYWORDS (4-5 keywords):
   - "Easy {{seedKeyword}} recipe"
   - "Quick {{seedKeyword}}"
   - "{{seedKeyword}} in 30 minutes"
   - "Simple {{seedKeyword}}"
   - "Best {{seedKeyword}} recipe"

3. DIETARY AND STYLE KEYWORDS (3-4 keywords):
   - "Healthy {{seedKeyword}}"
   - "Vegan {{seedKeyword}} recipe"
   - "Gluten-free {{seedKeyword}}"
   - "Low-carb {{seedKeyword}}"
   - "Traditional {{seedKeyword}}"

4. COOKING METHOD KEYWORDS (3-4 keywords):
   - "Baked {{seedKeyword}}"
   - "Fried {{seedKeyword}}"
   - "Slow cooker {{seedKeyword}}"
   - "Instant pot {{seedKeyword}}"
   - "Air fryer {{seedKeyword}}"

5. OCCASION AND SERVING KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} for dinner"
   - "{{seedKeyword}} for party"
   - "{{seedKeyword}} for beginners"
   - "Family {{seedKeyword}} recipe"

6. INGREDIENT AND VARIATION KEYWORDS (2-3 keywords):
   - "{{seedKeyword}} with [ingredient]"
   - "{{seedKeyword}} without [ingredient]"
   - "{{seedKeyword}} variations"
   - "Authentic {{seedKeyword}} recipe"

Quality Requirements:
- Focus on cooking and recipe discovery intent
- Emphasize "recipe", "how to make", "easy", "homemade" language
- Include dietary restrictions and cooking methods
- Mix skill level and time-based variations
- All keywords should imply the user wants to cook/prepare the dish

Return Format:
ONLY return a valid JSON array of keywords, no explanations or additional text.

Example format:
["keyword 1", "keyword 2", "keyword 3", ...]

Generate 15-25 high-quality recipe keywords now:`

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const KEYWORD_EXPANSION_PROMPTS: Record<ArticleTypeId, string> = {
  affiliate: AFFILIATE_KEYWORD_PROMPT,
  review: REVIEW_KEYWORD_PROMPT,
  commercial: COMMERCIAL_KEYWORD_PROMPT,
  comparison: COMPARISON_KEYWORD_PROMPT,
  'how-to': HOWTO_KEYWORD_PROMPT,
  informational: INFORMATIONAL_KEYWORD_PROMPT,
  listicle: LISTICLE_KEYWORD_PROMPT,
  local: LOCAL_KEYWORD_PROMPT,
  recipe: RECIPE_KEYWORD_PROMPT,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a keyword expansion prompt for the given parameters
 */
export function buildKeywordExpansionPrompt(params: KeywordPromptParams): string {
  const { seedKeyword, articleType, language = 'en-US', location = '[city/region]' } = params

  const template = KEYWORD_EXPANSION_PROMPTS[articleType]
  if (!template) {
    throw new Error(`Unknown article type: ${articleType}`)
  }

  return template
    .replace(/\{\{seedKeyword\}\}/g, seedKeyword)
    .replace(/\{\{language\}\}/g, language)
    .replace(/\{\{location\}\}/g, location)
}

/**
 * Get the system prompt for keyword expansion
 */
export function getKeywordExpansionSystemPrompt(): string {
  return `You are an expert SEO keyword researcher specializing in semantic keyword expansion.
Your task is to generate high-quality, relevant keywords that are:
1. Semantically related to the seed keyword
2. Optimized for the specific article type's search intent
3. Natural language phrases that real users search for
4. A mix of short-tail and long-tail keywords

IMPORTANT:
- Return ONLY a valid JSON array of strings
- No explanations, no markdown formatting, no additional text
- Each keyword should be unique and relevant
- Generate 15-25 keywords total`
}
