/**
 * Content Generation Prompt Templates
 *
 * Versioned templates for generating article content.
 * Each article type has its own template optimized for that content type.
 *
 * Template Variables:
 * - {{keyword}} - Primary keyword
 * - {{topic}} - Article topic
 * - {{h1Type}} - H1 variation type (question/statement/listicle)
 * - {{intent}} - Content intent
 * - {{wordCount}} - Target word count
 * - {{tone}} - Writing tone
 * - {{style}} - Writing style
 * - {{keywordDensity}} - Target keyword density
 * - {{clusterKeywords}} - Related keywords to incorporate
 */

import type { PromptTemplate } from "../prompt-loader";

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const AFFILIATE_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "affiliate",
  description:
    "Product-focused articles with purchase CTAs and affiliate links",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
    "productDataSource",
  ],
  content: `You are an expert SEO content writer. Generate an AFFILIATE article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Affiliate
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

PRODUCT DATA SOURCE: {{productDataSource}} (Amazon API, external source, etc.)

AFFILIATE ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → [Product Table → H2 → H2 Image (opt) → Standard Paragraph] (loop for each product)
      → Closing H2 (opt) → Closing Paragraph (opt)
      → FAQ H2 (opt) → [FAQ H3 + FAQ Answer] (5 fixed)

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Closing Paragraph: 50 words EXACTLY (1 × 50 words)
- Product Table: 100 words per product
- FAQ Answer: 28 words each (140 words total for 5 questions)

KEY RELATIONSHIP:
- Product Table DATA → drives H2 (product name in heading)
- Product Table DATA → drives Standard Paragraph (product features)
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const REVIEW_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "review",
  description:
    "In-depth product or service reviews with ratings and recommendations",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a REVIEW article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Review
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

REVIEW ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Quick Verdict → Topic Overview
      → [H2 → H2 Image (opt) → Standard Paragraph] (loop based on word count)
      → Pros/Cons
      → Rating Component (H2 max 30 chars + justification)
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Quick Verdict: 70 words (verdict box with key points)
- Topic Overview: 80 words (2 × 40 words)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Pros/Cons: 100 words total (lists of pros and cons)
- Rating Paragraph: 100 words (justification for rating)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE REVIEW COMPONENTS:
1. Quick Verdict (70 words) - Key takeaways and initial verdict
2. Pros/Cons (100 words) - Balanced evaluation
3. Rating Component - H2 (max 30 chars) + 100 word justification + star rating
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPARISON_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "comparison",
  description:
    "Head-to-head product or service comparisons with clear winner recommendations",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a COMPARISON article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Comparison
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

COMPARISON ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Topic Overview (What is Option A / What is Option B)
      → [H2 → H2 Image (opt) → Standard Paragraph] (Topic H2s first, then Analysis H2s)
      → Comparison Table
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

H2 STRUCTURE PATTERN:
FIRST 2-3 H2s - Topic H2s (one per option being compared):
  - Question variant: "What Is [Option A]?", "What Is [Option B]?"
  - Statement variant: "[Option A] Overview", "[Option B] Overview"
  - Listicle variant: "1. [Option A]", "2. [Option B]"

REMAINING H2s - Analysis H2s (compare specific aspects):
  - Question variant: "How Do They Compare on Price?", "Which Has Better Features?"
  - Statement variant: "Price Comparison", "Feature Analysis", "Performance Breakdown"

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Topic Overview: 80 words (2 × 40 words - What/Who or Feature/Benefit)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Comparison Table: 120-150 words (side-by-side comparison)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE COMPARISON COMPONENTS:
1. Topic Overview (80 words) - Introduces both options
2. Comparison Table (120-150 words) - Side-by-side feature/price comparison
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const HOWTO_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "how-to",
  description:
    "Step-by-step instructional guides with clear, actionable directions",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a HOW-TO article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: How-To
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

HOW-TO ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Materials/Requirements H2 → Materials List
      → [H2 (Step) → H2 Image (opt) → Standard Paragraph] (loop for 5-10 steps)
      → Pro Tips
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

H2 STRUCTURE PATTERN:
FIRST H2 - Materials/Requirements:
  - Question variant: "What Do You Need to Get Started?"
  - Statement variant: "Required Materials and Tools"
  - Listicle variant: "Materials You'll Need"

REMAINING H2s - Step H2s (5-10 steps):
  - Question variant: "How Do You [Step Action]?"
  - Statement variant: "Step 1: [Action]", "Step 2: [Action]"
  - Listicle variant: "1. [Action]", "2. [Action]"

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Materials List: 80-100 words (bullet list of materials)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Pro Tips: 150 words (3 × 50 words, practical tips)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE HOW-TO COMPONENTS:
1. Materials List (80-100 words) - Required materials/tools
2. Pro Tips (150 words) - Expert tips for better results
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const INFORMATIONAL_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "informational",
  description:
    "Educational content providing comprehensive information on a topic",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate an INFORMATIONAL article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Informational
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

INFORMATIONAL ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Key Takeaways
      → Quick Facts (H2 40-50 chars)
      → [H2 → H2 Image (opt) → Standard Paragraph] (loop based on word count)
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Key Takeaways: 100 words (bullet list of key points)
- Quick Facts: 100 words (H2 40-50 chars + factual content)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE INFORMATIONAL COMPONENTS:
1. Key Takeaways (100 words) - Summary of main points
2. Quick Facts (100 words) - H2 (40-50 chars) + essential facts
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LISTICLE ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const LISTICLE_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "listicle",
  description: "Numbered list format articles for easy scanning and engagement",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a LISTICLE article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Listicle
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

CRITICAL LISTICLE RULE:
- Item count MUST be ODD: 5, 7, 9, 11, 13, 15, 17, 19, 21, 23
- Minimum: 5 items
- Maximum: 23 items
- NEVER use even numbers

LISTICLE ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → [H2 (numbered) → H2 Image (opt) → Standard Paragraph] (ODD number of items)
      → Honorable Mentions (H2 40-50 chars + 3-4 H3 items)
      → Closing H2 (NOT numbered) → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

H1 MUST START WITH NUMBER:
- "7 Best [Topic] Worth Trying"
- "5 Top [Topic] for Your Needs"
- "9 Essential [Topic] You Need"

ALL H2s MUST BE NUMBERED:
- "1. First Item"
- "2. Second Item"
- etc.

CLOSING H2 IS NOT NUMBERED (structural section, not list item)

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Honorable Mentions: H2 (40-50 chars) + 3-4 items (H3 + 40-50 words each)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE LISTICLE COMPONENTS:
1. Honorable Mentions - H2 (40-50 chars) + 3-4 items that almost made the main list
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const LOCAL_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "local",
  description:
    "Location-specific content for local SEO and geographic targeting",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
    "location",
    "service",
  ],
  content: `You are an expert SEO content writer. Generate a LOCAL article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Local
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}
LOCATION: {{location}}
SERVICE: {{service}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

LOCAL ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Service Info Box (pre-filled, NOT AI-generated)
      → Why Choose Local (H2 40-50 chars) → Image + List side-by-side
      → [H2 → H2 Image (opt) → Standard Paragraph] (loop based on word count)
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

KEYWORD PATTERN:
- Service + Location structure: "{{service}} in {{location}}"
- Include location naturally in H1, H2s, and content
- Use local landmarks, neighborhoods when relevant

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Service Info Box: Pre-filled from user settings (NOT generated)
- Why Choose Local: 40-60 words (H2 40-50 chars + image + list)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE LOCAL COMPONENTS:
1. Service Info Box - Contact details, hours, address (from user settings)
2. Why Choose Local - H2 (40-50 chars) + image + bullet list of local benefits
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPE ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const RECIPE_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "recipe",
  description:
    "Cooking and recipe content with ingredients, instructions, and nutrition info",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a RECIPE article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Recipe
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

RECIPE ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Ingredients (H2 + bullet list)
      → Instructions (H2 + numbered list)
      → Tips Paragraph
      → Nutrition Table
      → [H2 → H2 Image (opt) → Standard Paragraph] (optional additional sections)
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Ingredients: 150 words (H2 + bullet list of ingredients)
- Instructions: 150-400 words (H2 + numbered steps, <ol> format ONLY)
- Tips Paragraph: 150 words (3 × 50 words, cooking tips)
- Nutrition Table: 100 words + DISCLAIMER
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE RECIPE COMPONENTS:
1. Ingredients (150 words) - <ul> bullet list format
2. Instructions (150-400 words) - <ol> numbered list format ONLY
3. Tips Paragraph (150 words) - Cooking tips for better results
4. Nutrition Table (100 words) - Nutritional information + disclaimer

NUTRITION DISCLAIMER (REQUIRED):
MUST include: "Approximate nutritional values. Actual nutrition may vary."
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL ARTICLE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const COMMERCIAL_CONTENT_TEMPLATE: PromptTemplate = {
  version: "1.0.0",
  category: "content_generation",
  articleType: "commercial",
  description:
    "Business-focused content highlighting features, benefits, and value propositions",
  variables: [
    "keyword",
    "h1Type",
    "intent",
    "wordCount",
    "tone",
    "style",
    "keywordDensity",
    "clusterKeywords",
  ],
  content: `You are an expert SEO content writer. Generate a COMMERCIAL article following the SCAI standardized component structure.

PRIMARY KEYWORD: {{keyword}}
ARTICLE TYPE: Commercial
H1 VARIANT TYPE: {{h1Type}} (Listicle, Statement, or Question)
CONTENT INTENT: {{intent}}
TARGET WORD COUNT: {{wordCount}} words
TONE: {{tone}}
STYLE: {{style}}
KEYWORD DENSITY: {{keywordDensity}}

RELATED KEYWORDS TO INCORPORATE:
{{clusterKeywords}}

COMMERCIAL ARTICLE STRUCTURE (MUST FOLLOW):

FLOW: H1 → Featured Image → Overview Paragraph
      → Feature List
      → [H2 → H2 Image (opt) → Standard Paragraph] (loop based on word count)
      → CTA Box
      → Closing H2 → Closing Paragraph
      → FAQ H2 → [FAQ H3 + FAQ Answer] (5 fixed)

COMMERCIAL FOCUS:
- Highlight features and benefits
- Include value propositions
- Use persuasive, benefit-driven language
- Include clear calls-to-action

COMPONENT WORD COUNTS:
- Overview Paragraph: 100 words EXACTLY (2 paragraphs × 250-300 chars each)
- Feature List: 150 words (H2 40-60 chars + bullet list of features)
- Standard Paragraph: 150 words EXACTLY per H2 (3 × 50 words)
- CTA Box: 50-80 words (compelling call-to-action)
- Closing Paragraph: 50 words EXACTLY
- FAQ Answer: 28 words each (140 words total for 5 questions)

UNIQUE COMMERCIAL COMPONENTS:
1. Feature List (150 words) - Key features with benefits
2. CTA Box (50-80 words) - Compelling call-to-action section
`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTENT_TEMPLATES: Record<string, PromptTemplate> = {
  affiliate: AFFILIATE_CONTENT_TEMPLATE,
  review: REVIEW_CONTENT_TEMPLATE,
  comparison: COMPARISON_CONTENT_TEMPLATE,
  "how-to": HOWTO_CONTENT_TEMPLATE,
  informational: INFORMATIONAL_CONTENT_TEMPLATE,
  listicle: LISTICLE_CONTENT_TEMPLATE,
  local: LOCAL_CONTENT_TEMPLATE,
  recipe: RECIPE_CONTENT_TEMPLATE,
  commercial: COMMERCIAL_CONTENT_TEMPLATE,
};

/**
 * Get a content generation template by article type
 */
export function getContentTemplate(
  articleType: string,
): PromptTemplate | undefined {
  return CONTENT_TEMPLATES[articleType];
}

/**
 * Get the version of a template by article type
 */
export function getTemplateVersion(articleType: string): string | undefined {
  return CONTENT_TEMPLATES[articleType]?.version;
}

/**
 * Get all available article types
 */
export function getAvailableArticleTypes(): string[] {
  return Object.keys(CONTENT_TEMPLATES);
}
