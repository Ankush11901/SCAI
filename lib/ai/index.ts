/**
 * AI Module Index
 * 
 * Central export for all AI-related functionality.
 * Uses Vercel AI SDK for multi-provider support.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS & MODELS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  getModel,
  getModelWithFallback,
  getProviderConfigs,
  isProviderAvailable,
  checkProviderHealth,
  type AIProvider,
  type ModelTier,
  type ProviderConfig,
} from './providers'

export {
  MODEL_SPECS,
  RATE_LIMITS,
  getModelSpec,
  getRecommendedTierForTask,
} from './models'

// ═══════════════════════════════════════════════════════════════════════════════
// WORD COUNT & BUDGET
// ═══════════════════════════════════════════════════════════════════════════════

export {
  UNIVERSAL_WORD_COUNTS,
  UNIQUE_COMPONENT_WORD_COUNTS,
  FIXED_COSTS_BY_ARTICLE_TYPE,
  WORDS_PER_H2_SECTION,
  WORDS_PER_PRODUCT_CARD,
  WORD_COUNT_LIMITS,
  H2_COUNT_LIMITS,
  getComponentWordCount,
  getFixedCost,
  getH2Limits,
} from './word-counts'

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  correctGrammar,
  correctGrammarDetailed,
  correctGrammarBatch,
  type ContentType as GrammarContentType,
  type GrammarCheckOptions,
  type GrammarCheckResult,
} from './grammar-checker'

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export * from './schemas'

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateStructure,
  generateH1,
  generateH2s,
  generateFaq,
  generateMeta,
  generateImageAlts,
  type GenerateStructureParams,
  type GenerateStructureResult,
} from './generate'

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT STREAMING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  streamOverview,
  streamSectionContent,
  streamClosing,
  streamFaqAnswer,
  streamAllSections,
  collectStreamText,
  collectStreamTextWithProgress,
  type StreamOverviewParams,
  type StreamSectionParams,
  type StreamClosingParams,
} from './stream-content'

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateProductCards,
  generateFeatureList,
  generateProsCons,
  generateIngredients,
  generateInstructions,
  generateFaqAnswers,
  generateKeyTakeaways,
  generateUniqueComponent,
  type GenerateProductCardsParams,
  type GenerateFeatureListParams,
  type GenerateProsConsParams,
  type GenerateIngredientsParams,
  type GenerateInstructionsParams,
  type GenerateFaqAnswersParams,
  type GenerateKeyTakeawaysParams,
  type GenerateComponentResult,
} from './generate-content'

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  STRUCTURE_SYSTEM_PROMPT,
  buildFullStructurePrompt,
  buildH1Prompt,
  buildH2Prompt,
  buildFaqPrompt,
  buildClosingH2Prompt,
  buildMetaPrompt,
  buildImageAltPrompt,
  getH2Purposes,
  ARTICLE_TYPE_H2_PURPOSES,
} from './prompts/structure-prompts'

export {
  CONTENT_SYSTEM_PROMPT,
  buildOverviewPrompt,
  buildSectionPrompt,
  buildClosingPrompt,
  buildFaqAnswersPrompt,
  buildTopicOverviewPrompt,
  buildKeyTakeawaysPrompt,
  buildQuickVerdictPrompt,
  buildTipsParagraphPrompt,
  buildRatingParagraphPrompt,
  buildStreamContentPrompt,
} from './prompts/content-prompts'

export {
  COMPONENT_SYSTEM_PROMPT,
  buildProductCardPrompt,
  buildFeatureListPrompt,
  buildCtaBoxPrompt,
  buildComparisonTablePrompt,
  buildProsConsPrompt,
  buildRatingPrompt,
  buildIngredientsPrompt,
  buildInstructionsPrompt,
  buildNutritionPrompt,
  buildMaterialsPrompt,
  buildProTipsPrompt,
  buildQuickFactsPrompt,
  buildWhyChooseLocalPrompt,
  buildHonorableMentionsPrompt,
  COMPONENT_PROMPTS,
} from './prompts/component-prompts'

export {
  KEYWORD_EXPANSION_PROMPTS,
  buildKeywordExpansionPrompt,
  getKeywordExpansionSystemPrompt,
  type ArticleTypeId,
  type KeywordPromptParams,
} from './prompts/keyword-prompts'

export {
  hydratePrompt,
  extractVariables,
  buildEnhancedPrompt,
  getForbiddenPhrasesBlock,
  getSymbolRulesBlock,
  getHeaderConsistencyBlock,
  getToneStyleBlock,
  getCharacterLimitsBlock,
  containsForbiddenPhrases,
  startsWithForbiddenPhrase,
  containsUnapprovedSymbols,
  validateH2,
  type PromptTemplate,
  type PromptCategory,
  type PromptVariables,
  type EnhancedPromptOptions,
} from './prompts/prompt-loader'

export {
  CONTENT_TEMPLATES,
  getContentTemplate,
  getAvailableArticleTypes,
  AFFILIATE_CONTENT_TEMPLATE,
  REVIEW_CONTENT_TEMPLATE,
  COMPARISON_CONTENT_TEMPLATE,
  HOWTO_CONTENT_TEMPLATE,
  INFORMATIONAL_CONTENT_TEMPLATE,
  LISTICLE_CONTENT_TEMPLATE,
  LOCAL_CONTENT_TEMPLATE,
  RECIPE_CONTENT_TEMPLATE,
  COMMERCIAL_CONTENT_TEMPLATE,
} from './prompts/templates/content-templates'

// ═══════════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  FORBIDDEN_PHRASES,
  APPROVED_SYMBOLS,
  SYMBOL_USAGE_RULES,
  CHARACTER_LIMITS,
  WORD_COUNT_RULES,
  HEADER_CONSISTENCY_RULES,
  TONE_DEFINITIONS,
  STYLE_DEFINITIONS,
  DEFAULT_TONE_STYLE,
  type ToneType,
  type StyleType,
  type VariationType,
} from './rules'

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateKeywordCluster,
  deduplicateKeywords,
  filterKeywordsByWordCount,
  sortKeywordsByRelevance,
  categorizeKeywords,
  generateLocalKeywordVariations,
  parseLocalKeyword,
  type GenerateKeywordsParams,
  type GenerateKeywordsResult,
} from './generate-keywords'

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER (Legacy-Compatible Interface)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateTextWithFallback,
  generateObjectWithFallback,
  streamTextGeneration,
  createLegacyTextGenerator,
  generateContentText,
  type GenerateTextOptions,
  type GenerateObjectOptions,
  type StreamTextOptions,
  type GenerationResult,
  type ObjectGenerationResult,
} from './adapter'
