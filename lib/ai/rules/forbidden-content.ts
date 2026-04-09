/**
 * Forbidden Content Rules
 * 
 * Centralized rules for content that MUST NOT appear in generated articles.
 * Based on reference SCAI production specifications.
 * 
 * These rules are injected into prompts and used for post-generation validation.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN PHRASES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phrases that MUST NEVER appear in specific contexts
 */
export const FORBIDDEN_PHRASES = {
  /**
   * Never use in Closing H2
   * INSTEAD: Use descriptive, elaborative headings that match H1 type
   */
  closingH2: [
    'Closing',
    'Conclusion',
    'Final Thoughts',
    'Summary',
    'In Summary',
    'To Wrap Up',
    'Wrapping Up',
    'In Conclusion',
    'To Conclude',
    'In Closing',
    'To Sum Up',
    'Final Words',
    'Last Thoughts',
    'Summing Up',
    'Key Takeaways',
    'Takeaways',
    'Main Takeaways',
  ],

  /**
   * Never start closing paragraphs with these phrases
   * INSTEAD: End naturally with value reinforcement
   */
  closingParagraphStart: [
    'In conclusion',
    'To summarize',
    'In summary',
    'To wrap up',
    'Finally',
    "As we've discussed",
    "As we've seen",
    'To conclude',
    'In closing',
    'Wrapping up',
    'To sum up',
    'All in all',
    'Overall',
    'At the end of the day',
  ],

  /**
   * Never use in H2 headings
   */
  h2General: [
    'and',    // Each H2 must be single-focused
    'or',     // Each H2 must be single-focused
    ':',      // No colons in heading text
  ],

  /**
   * Never use in H1 headings (generic filler)
   */
  h1Generic: [
    'A Comprehensive Guide',
    'Comprehensive Guide',
    'The Ultimate Guide',
    'Ultimate Guide',
    'Your Complete Guide',
    'Complete Guide',
    'Everything You Need to Know',
    'All You Need to Know',
    'The Definitive Guide',
    'Definitive Guide',
  ],

  /**
   * Never combine in FAQ H3s
   */
  faqH3: [
    'Multiple questions in single H3', // Structural rule
  ],

  /**
   * Marketing buzzwords to NEVER use in content
   * Replace with specific, factual language
   */
  contentBuzzwords: [
    'unique',
    'amazing',
    'incredible',
    'unbelievable',
    'spectacular',
    'phenomenal',
    'game-changer',
    'game changer',
    'revolutionary',
    'revolutionize',
    'cutting-edge',
    'cutting edge',
    'state-of-the-art',
    'state of the art',
    'world-class',
    'best-in-class',
    'groundbreaking',
    'unprecedented',
    'next-gen',
    'next generation',
    'innovative',
    'seamless',
    'synergy',
    'leverage',
    'disruptive',
    'paradigm',
  ],
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVED SYMBOLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Approved symbols and their ONLY allowed usages.
 * NO EMOJIS allowed anywhere.
 */
export const APPROVED_SYMBOLS = {
  checkmark: '✓',     // Feature lists, completion indicators
  bullet: '•',        // Unordered lists (standard)
  starFilled: '★',    // Ratings ONLY
  starEmpty: '☆',     // Ratings ONLY
  plus: '+',          // Pros lists ONLY
  minus: '–',         // Cons lists ONLY (en-dash)
  dash: '—',          // Em-dash for sentence breaks
} as const

/**
 * Maps symbols to their allowed component contexts
 */
export const SYMBOL_USAGE_RULES: Record<string, string[]> = {
  '✓': ['feature-list', 'key-takeaways', 'checklist'],
  '•': ['any-unordered-list', 'bullet-points'],
  '★': ['rating', 'star-rating'],
  '☆': ['rating', 'star-rating'],
  '+': ['pros-cons-pros', 'pros-list'],
  '–': ['pros-cons-cons', 'cons-list'],
  '—': ['sentence-break', 'aside'],
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARACTER & WORD LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum character limits for headings and meta
 */
export const CHARACTER_LIMITS = {
  // Headings (per programmatic_rules.md documentation)
  h1: { min: 50, max: 60 },
  h2: { min: 50, max: 60 },
  h2Product: { min: 30, max: 60 },  // Product H2s can be shorter
  closingH2: { min: 50, max: 60 },  // Match general H2 limits
  faqH2: { min: 25, max: 30 },
  faqH3: { min: 30, max: 60 },

  // Special H2s (per reference spec)
  ratingH2: { min: 25, max: 30 },
  honorableMentionsH2: { min: 35, max: 50 },
  whyChooseLocalH2: { min: 35, max: 50 },
  quickFactsH2: { min: 35, max: 50 },

  // Meta
  metaTitle: { min: 50, max: 60 },
  metaDescription: { min: 150, max: 160 },  // Updated to match validator expectations

  // Images
  featuredImageAlt: { min: 100, max: 125 },
  h2ImageAlt: { min: 80, max: 100 },
} as const

/**
 * Fixed word counts for components (with ±5 tolerance for most)
 */
export const WORD_COUNT_RULES = {
  // Universal paragraphs
  overviewParagraph: { target: 100, tolerance: 5, breakdown: '2 × 250-300 chars (~50 words each)' },
  standardParagraph: { target: 150, tolerance: 5, breakdown: '3 × 50 words' },
  closingParagraph: { target: 50, tolerance: 5, breakdown: '1 × 50 words' },

  // FAQ
  faqAnswer: { target: 28, tolerance: 3, perQuestion: true },
  faqTotal: { target: 140, breakdown: '5 × 28 words' },

  // Recipe components
  ingredientsList: { target: 150, tolerance: 10 },
  instructions: { min: 150, max: 400 },
  tipsParagraph: { target: 150, tolerance: 10, breakdown: '3 × 50 words' },
  nutritionTable: { target: 100, tolerance: 10 },

  // Article-type specific
  productCard: { target: 100, tolerance: 10, note: 'Per product' },
  comparisonTable: { min: 120, max: 150 },
  topicOverview: { target: 80, tolerance: 5, breakdown: '2 × 40 words' },
  quickVerdict: { target: 70, tolerance: 5 },

  // Review-specific
  prosCons: { target: 100, tolerance: 10 },
  ratingParagraph: { target: 100, tolerance: 5 },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER CONSISTENCY RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rules for maintaining H1/H2 format consistency
 */
export const HEADER_CONSISTENCY_RULES = {
  question: {
    h1: 'Must be a grammatically correct question ending with "?"',
    h2: 'All H2s must be questions ending with "?"',
    closingH2: 'Must be a question ending with "?"',
    examples: {
      h1: ['How Do You Choose the Best Product?', 'What Makes This Solution Stand Out?'],
      h2: ['What Features Should You Look For?', 'Why Is Quality Important?'],
      closingH2: ['Which Option Is Right for You?', 'How Can You Get Started Today?'],
    },
  },
  statement: {
    h1: 'Must be a statement (NO question marks)',
    h2: 'All H2s must be statements (NO question marks)',
    closingH2: 'Must be a statement (NO question marks)',
    examples: {
      h1: ['The Best Products for Your Needs', 'Top Solutions Worth Considering'],
      h2: ['Key Features to Consider', 'Benefits of This Approach'],
      closingH2: ['Your Path Forward Starts Here', 'Taking Action on Your Goals'],
    },
  },
  listicle: {
    h1: 'Must start with a number (odd numbers preferred: 3, 5, 7, 9, 11)',
    h2: 'All H2s must start with a number (1., 2., 3., etc.)',
    closingH2: 'NOT numbered (structural section, not list item)',
    examples: {
      h1: ['7 Best Products Worth Buying', '5 Ways to Solve This Problem'],
      h2: ['1. First Item on the List', '2. Second Important Option'],
      closingH2: ['Your Next Steps Forward', 'Moving Forward With Confidence'],
    },
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// TONE AND STYLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Available tones with their characteristics
 */
export const TONE_DEFINITIONS = {
  professional: {
    name: 'Professional',
    characteristics: 'Polished, business-appropriate, credible, formal',
    voice: 'Third-person preferred, measured language',
  },
  conversational: {
    name: 'Conversational',
    characteristics: 'Natural speech, uses "you", relaxed, approachable',
    voice: 'Second-person, casual but informative',
  },
  authoritative: {
    name: 'Authoritative',
    characteristics: 'Expert voice, confident, knowledgeable, commanding',
    voice: 'Direct statements, industry expertise',
  },
  friendly: {
    name: 'Friendly',
    characteristics: 'Warm, approachable, personable, welcoming',
    voice: 'Inclusive, encouraging, supportive',
  },
  persuasive: {
    name: 'Persuasive',
    characteristics: 'Compelling, benefit-driven, action-oriented',
    voice: 'Strong CTAs, value propositions, urgency',
  },
  educational: {
    name: 'Educational',
    characteristics: 'Clear explanations, teaching voice, informative',
    voice: 'Step-by-step, definitions, examples',
  },
  objective: {
    name: 'Objective',
    characteristics: 'Unbiased, fact-based, balanced, neutral',
    voice: 'Data-driven, multiple perspectives',
  },
  enthusiastic: {
    name: 'Enthusiastic',
    characteristics: 'Energetic, excited, passionate, dynamic',
    voice: 'Exclamatory (sparingly), positive language',
  },
  empathetic: {
    name: 'Empathetic',
    characteristics: 'Understanding, compassionate, acknowledges struggles',
    voice: 'Validates feelings, offers solutions',
  },
} as const

/**
 * Available styles with sentence structure guidelines
 */
export const STYLE_DEFINITIONS = {
  concise: {
    name: 'Concise',
    wordsPerSentence: { min: 5, max: 10 },
    characteristics: 'Short, punchy, direct, no fluff',
  },
  balanced: {
    name: 'Balanced',
    wordsPerSentence: { min: 12, max: 18 },
    characteristics: 'Standard, natural flow, readable',
  },
  detailed: {
    name: 'Detailed',
    wordsPerSentence: { min: 20, max: 30 },
    characteristics: 'Thorough, comprehensive, explanatory',
  },
} as const

/**
 * Default tone/style by article type
 */
export const DEFAULT_TONE_STYLE = {
  affiliate: { tone: 'persuasive', style: 'balanced' },
  commercial: { tone: 'professional', style: 'balanced' },
  comparison: { tone: 'objective', style: 'detailed' },
  'how-to': { tone: 'educational', style: 'balanced' },
  informational: { tone: 'educational', style: 'balanced' },
  listicle: { tone: 'conversational', style: 'concise' },
  local: { tone: 'friendly', style: 'balanced' },
  recipe: { tone: 'friendly', style: 'concise' },
  review: { tone: 'authoritative', style: 'detailed' },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ToneType = keyof typeof TONE_DEFINITIONS
export type StyleType = keyof typeof STYLE_DEFINITIONS
export type VariationType = keyof typeof HEADER_CONSISTENCY_RULES
