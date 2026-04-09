/**
 * Prompt Registry
 *
 * Central registry of all prompts in the article generator system.
 * Used by the prompt testing page to list, describe, and execute prompts.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PromptCategory = 'structure' | 'content' | 'component' | 'keyword'

export type ParamType = 'string' | 'number' | 'select' | 'array' | 'boolean' | 'object'

export interface ParamOption {
  value: string
  label: string
}

export interface ParamDefinition {
  name: string
  type: ParamType
  required: boolean
  default?: unknown
  options?: ParamOption[]
  description: string
}

export interface PromptDefinition {
  id: string
  name: string
  description: string
  category: PromptCategory
  builderFn: string
  sourceFile: string
  params: ParamDefinition[]
  dependencies: string[]
  outputFormat: 'json' | 'text'
  outputSchema?: string
  articleTypes?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ARTICLE_TYPE_OPTIONS: ParamOption[] = [
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'review', label: 'Review' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'how-to', label: 'How-To' },
  { value: 'informational', label: 'Informational' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'local', label: 'Local' },
  { value: 'recipe', label: 'Recipe' },
]

export const TITLE_FORMAT_OPTIONS: ParamOption[] = [
  { value: 'statement', label: 'Statement' },
  { value: 'question', label: 'Question' },
  { value: 'listicle', label: 'Listicle (Numbered)' },
]

export const TONE_OPTIONS: ParamOption[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'persuasive', label: 'Persuasive' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const PROMPT_REGISTRY: PromptDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // STRUCTURE PROMPTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'structure.h1',
    name: 'H1 Title Generation',
    description: 'Generates the main H1 title for an article. The H1 sets the tone and promise for the entire article. Supports question, statement, and listicle formats.',
    category: 'structure',
    builderFn: 'buildH1Prompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'The main topic of the article' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary SEO keyword to include' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Type of article being generated' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Format style for the title' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "text": "string" }',
  },
  {
    id: 'structure.h1-only',
    name: 'H1 + Meta Generation',
    description: 'Generates H1 title along with meta title and description in a single call. Used in the sequential generation pipeline.',
    category: 'structure',
    builderFn: 'buildH1OnlyPrompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'The main topic of the article' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary SEO keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Type of article' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
      { name: 'h2Count', type: 'number', required: false, description: 'Number of H2s (for listicle alignment)' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h1": "string", "meta": { "title": "string", "description": "string" } }',
  },
  {
    id: 'structure.h2',
    name: 'H2 Headings Generation',
    description: 'Generates H2 subheadings for article sections. Each H2 should be unique and follow the same format as H1.',
    category: 'structure',
    builderFn: 'buildH2Prompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title (from h1 generation)' },
      { name: 'h2Count', type: 'number', required: true, default: 5, description: 'Number of H2s to generate' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: ['structure.h1'],
    outputFormat: 'json',
    outputSchema: '{ "h2s": ["string", ...] }',
  },
  {
    id: 'structure.h2-from-h1',
    name: 'H2 from H1 Promise',
    description: 'Generates H2s that specifically fulfill the promise made by the H1. Uses promise extraction for coherent structure.',
    category: 'structure',
    builderFn: 'buildH2FromH1Prompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'normalizedH1', type: 'string', required: true, description: 'The normalized H1 title' },
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'variation', type: 'select', required: true, options: TITLE_FORMAT_OPTIONS, description: 'Title format variation' },
      { name: 'h2Count', type: 'number', required: true, default: 5, description: 'Number of H2s' },
    ],
    dependencies: ['structure.h1-only'],
    outputFormat: 'json',
    outputSchema: '{ "h2s": ["string", ...], "closingH2": "string" }',
  },
  {
    id: 'structure.faq',
    name: 'FAQ Questions Generation',
    description: 'Generates FAQ section with H2 heading and question list. Questions should be what users actually search for.',
    category: 'structure',
    builderFn: 'buildFaqPrompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'faqCount', type: 'number', required: false, default: 3, description: 'Number of FAQ questions' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "questions": ["string?", ...] }',
  },
  {
    id: 'structure.closing-h2',
    name: 'Closing H2 Generation',
    description: 'Generates the closing/conclusion section H2. Never numbered even in listicle format.',
    category: 'structure',
    builderFn: 'buildClosingH2Prompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: ['structure.h1'],
    outputFormat: 'json',
    outputSchema: '{ "text": "string" }',
  },
  {
    id: 'structure.meta',
    name: 'Meta Information',
    description: 'Generates SEO meta title (50-60 chars) and description (140-160 chars).',
    category: 'structure',
    builderFn: 'buildMetaPrompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
    ],
    dependencies: ['structure.h1'],
    outputFormat: 'json',
    outputSchema: '{ "title": "string", "description": "string" }',
  },
  {
    id: 'structure.image-alt',
    name: 'Image Alt Text',
    description: 'Generates alt text for featured image (100-125 chars) and H2 section images (80-100 chars each).',
    category: 'structure',
    builderFn: 'buildImageAltPrompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'h2s', type: 'array', required: true, description: 'Array of H2 titles' },
      { name: 'articleType', type: 'select', required: false, options: ARTICLE_TYPE_OPTIONS, description: 'Article type (affects product anchoring for reviews)' },
    ],
    dependencies: ['structure.h1', 'structure.h2'],
    outputFormat: 'json',
    outputSchema: '{ "featured": "string", "h2s": ["string", ...] }',
  },
  {
    id: 'structure.full',
    name: 'Full Structure Generation',
    description: 'Generates complete article structure in one call: H1, H2s, FAQ, Closing, Meta, and Image Alts.',
    category: 'structure',
    builderFn: 'buildFullStructurePrompt',
    sourceFile: 'lib/ai/prompts/structure-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'h2Count', type: 'number', required: true, default: 5, description: 'Number of H2 sections' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h1": "string", "h2s": [...], "faq": {...}, "closing": {...}, "meta": {...}, "imageAlts": {...} }',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT PROMPTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'content.overview',
    name: 'Overview Paragraph',
    description: 'Generates the opening 100-word overview (2 paragraphs of ~50 words each). Hooks the reader and previews article content.',
    category: 'content',
    builderFn: 'buildOverviewPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
    ],
    dependencies: ['structure.h1'],
    outputFormat: 'json',
    outputSchema: '{ "paragraph1": "string", "paragraph2": "string" }',
  },
  {
    id: 'content.section',
    name: 'Section Content',
    description: 'Generates 150-word content for an H2 section (3 paragraphs of ~50 words each). Covers a specific subtopic.',
    category: 'content',
    builderFn: 'buildSectionPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h2', type: 'string', required: true, description: 'The H2 title for this section' },
      { name: 'h2Index', type: 'number', required: true, description: 'Index of this H2 (0-based)' },
      { name: 'totalH2s', type: 'number', required: true, description: 'Total number of H2s' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
    ],
    dependencies: ['structure.h1', 'structure.h2'],
    outputFormat: 'json',
    outputSchema: '{ "paragraph1": "string", "paragraph2": "string", "paragraph3": "string" }',
  },
  {
    id: 'content.closing',
    name: 'Closing Paragraph',
    description: 'Generates a 50-word closing paragraph. Summarizes key takeaways with a call-to-action.',
    category: 'content',
    builderFn: 'buildClosingPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'closingH2', type: 'string', required: true, description: 'The closing H2 heading' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
    ],
    dependencies: ['structure.h1', 'structure.closing-h2'],
    outputFormat: 'json',
    outputSchema: '{ "text": "string" }',
  },
  {
    id: 'content.faq-answers',
    name: 'FAQ Answers',
    description: 'Generates answers for FAQ questions. Each answer is exactly 28 words.',
    category: 'content',
    builderFn: 'buildFaqAnswersPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'questions', type: 'array', required: true, description: 'Array of FAQ questions' },
      { name: 'articleType', type: 'select', required: true, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
      { name: 'tone', type: 'select', required: false, default: 'professional', options: TONE_OPTIONS, description: 'Writing tone' },
    ],
    dependencies: ['structure.faq'],
    outputFormat: 'json',
    outputSchema: '{ "answers": ["string", ...] }',
  },
  {
    id: 'content.topic-overview',
    name: 'Topic Overview (Comparison)',
    description: 'Generates 80-word overview for one side of a comparison. Contains "what" and "who" paragraphs.',
    category: 'content',
    builderFn: 'buildTopicOverviewPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Overall comparison topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'topicName', type: 'string', required: true, description: 'Name of this specific topic being compared' },
      { name: 'h2', type: 'string', required: true, description: 'The H2 title' },
      { name: 'position', type: 'select', required: true, options: [{ value: 'first', label: 'First' }, { value: 'second', label: 'Second' }], description: 'Position in comparison' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "what": "string", "who": "string" }',
    articleTypes: ['comparison'],
  },
  {
    id: 'content.key-takeaways',
    name: 'Key Takeaways',
    description: 'Generates a TL;DR summary with 3-5 bullet points (50-75 words total) for informational articles.',
    category: 'content',
    builderFn: 'buildKeyTakeawaysPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h1', type: 'string', required: true, description: 'The H1 title' },
      { name: 'mainH2s', type: 'array', required: true, description: 'Array of main H2 headings' },
    ],
    dependencies: ['structure.h1', 'structure.h2'],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "items": ["string", ...] }',
    articleTypes: ['informational'],
  },
  {
    id: 'content.quick-verdict',
    name: 'Quick Verdict (Comparison)',
    description: 'Generates a 50-word quick verdict with "Choose A if..." and "Choose B if..." statements.',
    category: 'content',
    builderFn: 'buildQuickVerdictPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Comparison topic' },
      { name: 'optionA', type: 'string', required: true, description: 'First option being compared' },
      { name: 'optionB', type: 'string', required: true, description: 'Second option being compared' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "chooseA": "string", "chooseB": "string" }',
    articleTypes: ['comparison'],
  },
  {
    id: 'content.tips-paragraph',
    name: 'Tips Paragraph (Recipe)',
    description: 'Generates a 150-word tips paragraph with 5-7 cooking tips for recipe articles.',
    category: 'content',
    builderFn: 'buildTipsParagraphPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'recipeTopic', type: 'string', required: true, description: 'Recipe name/topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'h2', type: 'string', required: true, description: 'The tips section H2' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "text": "string" }',
    articleTypes: ['recipe'],
  },
  {
    id: 'content.rating-paragraph',
    name: 'Rating Justification (Review)',
    description: 'Generates a 100-word paragraph justifying the review score. References pros and cons.',
    category: 'content',
    builderFn: 'buildRatingParagraphPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Product/topic being reviewed' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'score', type: 'number', required: true, description: 'Rating score (1-10)' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "text": "string" }',
    articleTypes: ['review'],
  },
  {
    id: 'content.stream',
    name: 'Streaming Content',
    description: 'Flexible content prompt for streaming generation. Supports overview, section, closing, and faq-answer types with optional context.',
    category: 'content',
    builderFn: 'buildStreamContentPrompt',
    sourceFile: 'lib/ai/prompts/content-prompts.ts',
    params: [
      { name: 'contentType', type: 'select', required: true, options: [
        { value: 'overview', label: 'Overview' },
        { value: 'section', label: 'Section' },
        { value: 'closing', label: 'Closing' },
        { value: 'faq-answer', label: 'FAQ Answer' },
      ], description: 'Type of content to generate' },
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'targetWords', type: 'number', required: true, description: 'Target word count' },
      { name: 'context', type: 'string', required: true, description: 'Additional context' },
      { name: 'h2', type: 'string', required: false, description: 'H2 title (for section type)' },
      { name: 'articleType', type: 'select', required: false, options: ARTICLE_TYPE_OPTIONS, description: 'Article type' },
    ],
    dependencies: [],
    outputFormat: 'text',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPONENT PROMPTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'component.product-card',
    name: 'Product Card (Affiliate)',
    description: 'Generates an affiliate product card with name, description, features, price, and badge.',
    category: 'component',
    builderFn: 'buildProductCardPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'productIndex', type: 'number', required: true, description: 'Product index (0-based)' },
      { name: 'totalProducts', type: 'number', required: true, description: 'Total number of products' },
      { name: 'badge', type: 'string', required: false, description: 'Product badge (Best Overall, Best Value, etc.)' },
      { name: 'priceRange', type: 'string', required: false, default: '$50-$200', description: 'Price range' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "name": "string", "shortDescription": "string", "features": [...], "price": "string", "badge": "string", "description": "string" }',
    articleTypes: ['affiliate'],
  },
  {
    id: 'component.feature-list',
    name: 'Feature List (Commercial)',
    description: 'Generates a feature list with 5-7 features, each with title and description.',
    category: 'component',
    builderFn: 'buildFeatureListPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'productOrService', type: 'string', required: true, description: 'Product or service name' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "features": [{ "title": "string", "description": "string" }, ...] }',
    articleTypes: ['commercial'],
  },
  {
    id: 'component.cta-box',
    name: 'CTA Box (Commercial)',
    description: 'Generates a call-to-action box with headline, body text, and button text.',
    category: 'component',
    builderFn: 'buildCtaBoxPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'offerType', type: 'string', required: true, description: 'Type of offer (Free Trial, Discount, etc.)' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "headline": "string", "body": "string", "buttonText": "string" }',
    articleTypes: ['commercial'],
  },
  {
    id: 'component.comparison-table',
    name: 'Comparison Table',
    description: 'Generates a comparison table with 5-8 criteria comparing two items.',
    category: 'component',
    builderFn: 'buildComparisonTablePrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Comparison topic' },
      { name: 'itemA', type: 'string', required: true, description: 'First item' },
      { name: 'itemB', type: 'string', required: true, description: 'Second item' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "itemNames": ["string", "string"], "criteria": [{ "name": "string", "valueA": "string", "valueB": "string" }, ...] }',
    articleTypes: ['comparison'],
  },
  {
    id: 'component.pros-cons',
    name: 'Pros & Cons (Review)',
    description: 'Generates pros and cons list for a review. 5-7 items each, ~75 words per list.',
    category: 'component',
    builderFn: 'buildProsConsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'productName', type: 'string', required: true, description: 'Product being reviewed' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "pros": ["string", ...], "cons": ["string", ...] }',
    articleTypes: ['review'],
  },
  {
    id: 'component.rating',
    name: 'Rating (Review)',
    description: 'Generates a rating component with score (1-10) and 100-word justification.',
    category: 'component',
    builderFn: 'buildRatingPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'productName', type: 'string', required: true, description: 'Product being rated' },
      { name: 'prosConsContext', type: 'string', required: true, description: 'Summary of pros/cons for context' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: ['component.pros-cons'],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "score": number, "scoreDisplay": "string", "justification": "string" }',
    articleTypes: ['review'],
  },
  {
    id: 'component.ingredients',
    name: 'Ingredients (Recipe)',
    description: 'Generates an ingredients list with quantities, names, and optional notes.',
    category: 'component',
    builderFn: 'buildIngredientsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'recipeTopic', type: 'string', required: true, description: 'Recipe name' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'servings', type: 'number', required: true, default: 4, description: 'Number of servings' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "items": [{ "quantity": "string", "name": "string", "notes": "string" }, ...] }',
    articleTypes: ['recipe'],
  },
  {
    id: 'component.instructions',
    name: 'Instructions (Recipe)',
    description: 'Generates cooking instructions with 6-12 numbered steps.',
    category: 'component',
    builderFn: 'buildInstructionsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'recipeTopic', type: 'string', required: true, description: 'Recipe name' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'ingredients', type: 'array', required: true, description: 'List of ingredients' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: ['component.ingredients'],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "steps": [{ "number": number, "text": "string" }, ...] }',
    articleTypes: ['recipe'],
  },
  {
    id: 'component.nutrition',
    name: 'Nutrition Table (Recipe)',
    description: 'Generates nutrition information with calories, fats, carbs, protein, etc.',
    category: 'component',
    builderFn: 'buildNutritionPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'recipeTopic', type: 'string', required: true, description: 'Recipe name' },
      { name: 'servings', type: 'number', required: true, default: 4, description: 'Number of servings' },
      { name: 'recipeType', type: 'select', required: true, options: [
        { value: 'dessert', label: 'Dessert' },
        { value: 'main', label: 'Main Course' },
        { value: 'side', label: 'Side Dish' },
        { value: 'snack', label: 'Snack' },
        { value: 'beverage', label: 'Beverage' },
      ], description: 'Type of recipe' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "servingSize": "string", "servings": number, "disclaimer": "string", "facts": {...} }',
    articleTypes: ['recipe'],
  },
  {
    id: 'component.materials',
    name: 'Materials Box (How-To)',
    description: 'Generates a materials/requirements list for how-to articles.',
    category: 'component',
    builderFn: 'buildMaterialsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'How-to topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "items": [{ "name": "string", "specs": "string", "optional": boolean }, ...] }',
    articleTypes: ['how-to'],
  },
  {
    id: 'component.pro-tips',
    name: 'Pro Tips (How-To)',
    description: 'Generates 5-7 expert tips for how-to articles (80-120 words total).',
    category: 'component',
    builderFn: 'buildProTipsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'How-to topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'stepsContext', type: 'string', required: true, description: 'Summary of the how-to steps' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "tips": ["string", ...] }',
    articleTypes: ['how-to'],
  },
  {
    id: 'component.quick-facts',
    name: 'Quick Facts (Informational)',
    description: 'Generates 5-7 quick facts in label/value format for informational articles.',
    category: 'component',
    builderFn: 'buildQuickFactsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Article topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "facts": [{ "label": "string", "value": "string" }, ...] }',
    articleTypes: ['informational'],
  },
  {
    id: 'component.why-choose-local',
    name: 'Why Choose Local',
    description: 'Generates 3-5 reasons to choose a local provider for local articles.',
    category: 'component',
    builderFn: 'buildWhyChooseLocalPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Service/business topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'locationName', type: 'string', required: true, description: 'Location name' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "reasons": ["string", ...] }',
    articleTypes: ['local'],
  },
  {
    id: 'component.honorable-mentions',
    name: 'Honorable Mentions (Listicle)',
    description: 'Generates 3-4 additional items that almost made the main list.',
    category: 'component',
    builderFn: 'buildHonorableMentionsPrompt',
    sourceFile: 'lib/ai/prompts/component-prompts.ts',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Listicle topic' },
      { name: 'primaryKeyword', type: 'string', required: true, description: 'Primary keyword' },
      { name: 'mainListItems', type: 'array', required: true, description: 'Items already in the main list' },
      { name: 'titleFormat', type: 'select', required: false, default: 'statement', options: TITLE_FORMAT_OPTIONS, description: 'Title format' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '{ "h2": "string", "items": [{ "h3": "string", "description": "string" }, ...] }',
    articleTypes: ['listicle'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // KEYWORD PROMPTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'keyword.affiliate',
    name: 'Affiliate Keywords',
    description: 'Generates 15-25 affiliate marketing keywords with high purchase intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword to expand' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['affiliate'],
  },
  {
    id: 'keyword.review',
    name: 'Review Keywords',
    description: 'Generates 15-25 review-focused keywords for evaluation intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['review'],
  },
  {
    id: 'keyword.commercial',
    name: 'Commercial Keywords',
    description: 'Generates 15-25 commercial keywords with transactional intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['commercial'],
  },
  {
    id: 'keyword.comparison',
    name: 'Comparison Keywords',
    description: 'Generates 15-25 comparison keywords for vs/decision-making intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['comparison'],
  },
  {
    id: 'keyword.how-to',
    name: 'How-To Keywords',
    description: 'Generates 15-25 how-to keywords for instructional intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['how-to'],
  },
  {
    id: 'keyword.informational',
    name: 'Informational Keywords',
    description: 'Generates 15-25 informational keywords for educational intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['informational'],
  },
  {
    id: 'keyword.listicle',
    name: 'Listicle Keywords',
    description: 'Generates 15-25 listicle keywords for list-seeking intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['listicle'],
  },
  {
    id: 'keyword.local',
    name: 'Local Keywords',
    description: 'Generates 15-25 local SEO keywords with geographic modifiers.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
      { name: 'location', type: 'string', required: true, description: 'Target location' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['local'],
  },
  {
    id: 'keyword.recipe',
    name: 'Recipe Keywords',
    description: 'Generates 15-25 recipe keywords for cooking intent.',
    category: 'keyword',
    builderFn: 'buildKeywordExpansionPrompt',
    sourceFile: 'lib/ai/prompts/keyword-prompts.ts',
    params: [
      { name: 'seedKeyword', type: 'string', required: true, description: 'Seed keyword' },
      { name: 'language', type: 'string', required: false, default: 'en-US', description: 'Target language' },
    ],
    dependencies: [],
    outputFormat: 'json',
    outputSchema: '["keyword1", "keyword2", ...]',
    articleTypes: ['recipe'],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all prompts in a category
 */
export function getPromptsByCategory(category: PromptCategory): PromptDefinition[] {
  return PROMPT_REGISTRY.filter(p => p.category === category)
}

/**
 * Get a prompt by ID
 */
export function getPromptById(id: string): PromptDefinition | undefined {
  return PROMPT_REGISTRY.find(p => p.id === id)
}

/**
 * Get prompts applicable to an article type
 */
export function getPromptsForArticleType(articleType: string): PromptDefinition[] {
  return PROMPT_REGISTRY.filter(p =>
    !p.articleTypes || p.articleTypes.includes(articleType)
  )
}

/**
 * Get prompts that have no dependencies (can be tested independently)
 */
export function getIndependentPrompts(): PromptDefinition[] {
  return PROMPT_REGISTRY.filter(p => p.dependencies.length === 0)
}

/**
 * Get the dependency chain for a prompt
 */
export function getDependencyChain(promptId: string): string[] {
  const prompt = getPromptById(promptId)
  if (!prompt) return []

  const chain: string[] = []
  const visited = new Set<string>()

  function traverse(id: string) {
    if (visited.has(id)) return
    visited.add(id)

    const p = getPromptById(id)
    if (!p) return

    for (const dep of p.dependencies) {
      traverse(dep)
    }

    if (id !== promptId) {
      chain.push(id)
    }
  }

  traverse(promptId)
  return chain
}

/**
 * Get category display info
 */
export const CATEGORY_INFO: Record<PromptCategory, { name: string; description: string; icon: string }> = {
  structure: {
    name: 'Structure',
    description: 'Prompts for generating article structure: H1, H2, FAQ, Meta, Image Alts',
    icon: 'Layout',
  },
  content: {
    name: 'Content',
    description: 'Prompts for generating article body content: Overview, Sections, Closing, FAQ Answers',
    icon: 'FileText',
  },
  component: {
    name: 'Components',
    description: 'Prompts for generating special components: Product Cards, Ingredients, Pros/Cons, etc.',
    icon: 'Boxes',
  },
  keyword: {
    name: 'Keywords',
    description: 'Prompts for generating SEO keyword expansions by article type',
    icon: 'Search',
  },
}
