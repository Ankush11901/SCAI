/**
 * Mockup Types
 * 
 * TypeScript interfaces for the Full Article Mockups feature.
 * These types ensure type safety across the mockup generation pipeline.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE FORMAT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TitleFormat = 'question' | 'statement' | 'listicle';

export type ArticleTypeId =
  | 'affiliate'
  | 'commercial'
  | 'comparison'
  | 'how-to'
  | 'informational'
  | 'listicle'
  | 'local'
  | 'recipe'
  | 'review';

export type VariationName =
  | 'Clean Studio'
  | 'Clean Studio Centered'
  | 'Airy Premium'
  | 'Airy Premium Centered'
  | 'Gradient Glow'
  | 'Gradient Glow Centered'
  | 'Soft Stone'
  | 'Soft Stone Centered';

// Base variation names (without Centered suffix)
export type BaseVariationName =
  | 'Clean Studio'
  | 'Airy Premium'
  | 'Gradient Glow'
  | 'Soft Stone';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT STRUCTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * H1 title variations - must follow format rules:
 * - Question: Start with What, How, Why, Which, When, Where
 * - Statement: Direct, declarative statement
 * - Listicle: Include a number at the beginning
 * All must be under 60 characters and include primary keyword
 */
export interface TitleVariations {
  question: string;    // Max 60 chars, starts with question word
  statement: string;   // Max 60 chars, declarative
  listicle: string;    // Max 60 chars, starts with number
}

/**
 * H2 headings - MUST match H1 format type
 * - If H1 is question → all H2s must be questions
 * - If H1 is statement → all H2s must be statements
 * - If H1 is listicle → all H2s must be numbered
 * 
 * Rules:
 * - Max 60 characters each
 * - No "and" or "or"
 * - No colons (:)
 * - 60-70% must contain primary keyword
 */
export interface H2Variations {
  question: string[];   // All questions matching H1 question format
  statement: string[];  // All statements matching H1 statement format
  listicle: string[];   // All numbered matching H1 listicle format
}

/**
 * FAQ item - follows strict rules:
 * - Question: 30-60 characters
 * - Answer: EXACTLY 28 words
 * - Single focused question, not multiple combined
 */
export interface FAQItem {
  question: string;  // 30-60 characters
  answer: string;    // EXACTLY 28 words
}

/**
 * Product card data for Affiliate articles
 */
export interface ProductData {
  name: string;
  description: string;  // 150 words
  price: string;
  rating: number;       // 1-5
  amazonUrl: string;    // Affiliate link
  imageUrl: string;
  features: string[];   // 4-6 features
  badge?: string;       // "Best Overall", "Best Value", etc.
}

/**
 * Comparison topic for Comparison articles
 */
export interface ComparisonTopic {
  name: string;
  overview: string;     // 80 words (2×40)
  imageUrl: string;
  features: string[];
}

/**
 * Ingredient item for Recipe articles
 */
export interface IngredientItem {
  amount: string;
  item: string;
}

/**
 * Instruction step for Recipe/How-To articles
 */
export interface InstructionStep {
  stepNumber: number;
  title: string;
  content: string;      // 50 words per step
}

/**
 * Pros/Cons for Review articles
 * Total 150 words (75 pros + 75 cons)
 */
export interface ProsConsData {
  pros: string[];       // 5-7 items, ~75 words total
  cons: string[];       // 5-7 items, ~75 words total
}

/**
 * Rating data for Review articles
 */
export interface RatingData {
  score: number;        // 0-10 or 0-5
  maxScore: number;
  title: string;        // H2 must be ≤30 characters
  summary: string;      // 100 words
}

/**
 * Honorable mention for Listicle articles
 */
export interface HonorableMention {
  title: string;        // H3 heading
  description: string;  // 40-50 words
}

/**
 * Service info for Local articles
 */
export interface ServiceInfo {
  name: string;
  address: string;
  phone: string;
  hours: string;
  description: string;  // 40-60 words
}

/**
 * Nutrition info for Recipe articles
 */
export interface NutritionData {
  servingSize: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
  sodium?: string;
}

/**
 * Key takeaway for Informational articles
 */
export interface KeyTakeaway {
  text: string;         // Single takeaway point
}

/**
 * Quick fact for Informational articles
 */
export interface QuickFact {
  label: string;
  value: string;
}

/**
 * Feature list item for Commercial/Review articles
 */
export interface FeatureItem {
  title: string;
  description: string;
}

/**
 * Material/requirement item for How-To articles
 */
export interface MaterialItem {
  name: string;
  optional?: boolean;
}

/**
 * Pro tip for How-To/Recipe articles
 */
export interface ProTip {
  tip: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TONE & STYLE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ToneType =
  | 'professional'
  | 'conversational'
  | 'authoritative'
  | 'friendly'
  | 'persuasive'
  | 'educational'
  | 'objective'
  | 'enthusiastic'
  | 'empathetic';

export type StyleType = 'concise' | 'balanced' | 'detailed';

// ═══════════════════════════════════════════════════════════════════════════════
// META CONTENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Meta title variations - 50-60 characters each
 * No colons, eye-catching, maintains keyword sentiment
 */
export interface MetaTitleVariations {
  question: string;   // 50-60 chars
  statement: string;  // 50-60 chars
  listicle: string;   // 50-60 chars
}

/**
 * Meta description variations - 140-160 characters each
 * Never identical to heading, natural keyword integration
 */
export interface MetaDescriptionVariations {
  question: string;   // 140-160 chars
  statement: string;  // 140-160 chars
  listicle: string;   // 140-160 chars
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKUP CONTENT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base content shared by all article types
 */
export interface BaseMockupContent {
  /** Primary keyword for SEO */
  primaryKeyword: string;

  /** Default tone for this article type */
  defaultTone: ToneType;

  /** Default style for this article type */
  defaultStyle: StyleType;

  /** H1 title variations (all under 60 chars, include keyword) */
  titles: TitleVariations;

  /** Meta title variations (50-60 chars each, no colons) */
  metaTitles: MetaTitleVariations;

  /** Meta description variations (140-160 chars each) */
  metaDescriptions: MetaDescriptionVariations;

  /** H2 headings matching each title format */
  h2s: H2Variations;

  /** Overview paragraph: 100 words (2×50) */
  overviewParagraph: string;

  /** Standard paragraphs: 150 words each (3×50) */
  standardParagraphs: string[];

  /** Closing H2 heading (matches title format, NOT "Conclusion") */
  closingH2: TitleVariations;

  /** Closing paragraph: 50 words */
  closingParagraph: string;

  /** FAQ section: exactly 5 questions, 28 words each answer = 140 words total */
  faqs: FAQItem[];

  /** Featured image */
  featuredImage: {
    url: string;
    alt: string;  // 100-125 characters
  };

  /** H2 section images */
  sectionImages: {
    url: string;
    alt: string;  // 80-100 characters
  }[];
}

/**
 * Affiliate article specific content
 */
export interface AffiliateMockupContent extends BaseMockupContent {
  articleType: 'affiliate';
  products: ProductData[];  // Minimum 3 products
}

/**
 * Commercial article specific content
 */
export interface CommercialMockupContent extends BaseMockupContent {
  articleType: 'commercial';
  features: FeatureItem[];  // 5-7 features, 100-120 words total
  ctaBox: {
    title: string;
    text: string;
    buttonText: string;
    buttonLink?: string;
  };
}

/**
 * Comparison article specific content
 */
export interface ComparisonMockupContent extends BaseMockupContent {
  articleType: 'comparison';
  topics: ComparisonTopic[];  // 2-3 topics
  comparisonTable: {
    headers: string[];
    rows: string[][];
  };
  quickVerdict: string;  // 50 words
}

/**
 * How-To article specific content
 */
export interface HowToMockupContent extends BaseMockupContent {
  articleType: 'how-to';
  materials: MaterialItem[];  // 5-15 items, 20-120 words
  steps: InstructionStep[];   // 5-10 steps
  proTips: ProTip[];          // 5-7 tips, 80-120 words
}

/**
 * Informational article specific content
 */
export interface InformationalMockupContent extends BaseMockupContent {
  articleType: 'informational';
  keyTakeaways: KeyTakeaway[];  // 50-75 words total
  quickFactsH2: TitleVariations;  // H2 for quick facts section, 40-50 chars
  quickFacts: QuickFact[];      // 5-7 facts, 80-100 words
}

/**
 * Listicle article specific content
 */
export interface ListicleMockupContent extends BaseMockupContent {
  articleType: 'listicle';
  /** List items - MUST be ODD number: 5, 7, 9, etc. */
  listItemCount: 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21 | 23;
  honorableMentionsH2: TitleVariations;  // H2 for honorable mentions, 40-50 chars
  honorableMentions: HonorableMention[];  // 3-4 items
}

/**
 * Local article specific content
 */
export interface LocalMockupContent extends BaseMockupContent {
  articleType: 'local';
  whyChooseLocal: {
    title: string;    // H2, 40-50 chars
    reasons: string[];  // 40-60 words total
  };
  serviceInfo: ServiceInfo;
}

/**
 * Recipe article specific content
 */
export interface RecipeMockupContent extends BaseMockupContent {
  articleType: 'recipe';
  ingredientsH2: TitleVariations;  // H2 for ingredients section, 40-50 chars
  ingredients: IngredientItem[];  // 150 words total
  instructionsH2: TitleVariations;  // H2 for instructions section, 40-50 chars
  instructions: InstructionStep[];  // 150-400 words
  tips: string;  // Tips paragraph, 150 words
  nutritionH2: TitleVariations;  // H2 for nutrition section, 40-50 chars
  nutrition: NutritionData;  // 100 words
}

/**
 * Review article specific content
 */
export interface ReviewMockupContent extends BaseMockupContent {
  articleType: 'review';
  features: FeatureItem[];  // 7-10 bullets, 150 words
  prosConsH2: TitleVariations;  // H2 for pros/cons section, 40-50 chars
  prosCons: ProsConsData;   // 150 words (75+75)
  ratingH2: TitleVariations;  // H2 for rating section, ≤30 chars
  rating: RatingData;       // 100 words content
}

/**
 * Union type for all mockup content types
 */
export type MockupContent =
  | AffiliateMockupContent
  | CommercialMockupContent
  | ComparisonMockupContent
  | HowToMockupContent
  | InformationalMockupContent
  | ListicleMockupContent
  | LocalMockupContent
  | RecipeMockupContent
  | ReviewMockupContent;

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for generating a mockup
 */
export interface MockupGeneratorOptions {
  /** Article type to generate */
  articleType: ArticleTypeId;

  /** Content data for the article */
  content: MockupContent;

  /** Design variation to use */
  variationName: BaseVariationName;

  /** Title format (determines H2 format too) */
  titleFormat?: TitleFormat;
}

/**
 * Generated mockup output
 */
export interface GeneratedMockup {
  /** Complete article HTML */
  html: string;

  /** Combined CSS for all components */
  css: string;

  /** Article type */
  articleType: ArticleTypeId;

  /** Variation used */
  variationName: BaseVariationName;

  /** Title format used */
  titleFormat: TitleFormat;

  /** Metadata about the generated article */
  metadata: {
    generatedAt: string;
    wordCount: number;
    componentCount: number;
    theme: VariationTheme;
  };
}

/**
 * Variation theme colors and styles
 */
export interface VariationTheme {
  id: string;
  name: BaseVariationName;
  description: string;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    accent: string;
    accentHover: string;
  };
  typography: {
    fontFamily: string;
    headingWeight: string;
    bodyWeight: string;
    lineHeight: string;
  };
  spacing: {
    borderRadius: string;
    padding: string;
  };
  effects: {
    shadow: string;
    border: string;
    backdropBlur?: string;
  };
}

/**
 * Component variation data from variations.ts
 */
export interface ComponentVariation {
  name: string;
  html: string;
  css: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** All 4 base variation names */
export const BASE_VARIATION_NAMES: BaseVariationName[] = [
  'Clean Studio',
  'Airy Premium',
  'Gradient Glow',
  'Soft Stone',
];

/** All 9 article type IDs */
export const ARTICLE_TYPE_IDS: ArticleTypeId[] = [
  'affiliate',
  'commercial',
  'comparison',
  'how-to',
  'informational',
  'listicle',
  'local',
  'recipe',
  'review',
];

/** Title format options */
export const TITLE_FORMATS: TitleFormat[] = ['question', 'statement', 'listicle'];
