/**
 * Cluster Expansion Service
 *
 * Uses AI to expand a topic + keyword into a comprehensive content cluster plan.
 * Determines article types, generates titles, and plans interlinking.
 *
 * Used exclusively for bulk/cluster generation - does not affect single article generation.
 */

import { generateObject } from 'ai';
import { getModelWithFallback, type AIProvider, type ModelTier } from '@/lib/ai/providers';
import {
  ClusterPlanOutputSchema,
  type ClusterPlanOutput,
  validateClusterPlan,
  formatClusterPlanErrors,
} from '@/lib/ai/schemas/cluster';
import {
  CLUSTER_EXPANSION_SYSTEM_PROMPT,
  buildClusterExpansionPrompt,
  type ClusterExpansionPromptParams,
} from '@/lib/ai/prompts/cluster-prompts';
import {
  generateSlugFromTitle,
  applyUrlPattern,
  generateUniqueSlug,
} from '@/lib/utils/slug-generator';
import type {
  ClusterInput,
  ClusterPlan,
  ClusterArticle,
  InterlinkTarget,
} from '@/lib/types/cluster';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClusterExpansionOptions extends ClusterInput {
  provider?: AIProvider;
  modelTier?: ModelTier;
  allowedArticleTypes?: string[];
  aiChooseVariants?: boolean;
  variations?: import('@/lib/types/cluster').TitleVariation[];
}

export interface ClusterExpansionResult {
  success: boolean;
  plan?: ClusterPlan;
  error?: string;
  provider: AIProvider;
  model: string;
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPANSION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expand a topic into a complete cluster plan using AI
 *
 * @param options - Cluster input with optional provider settings
 * @returns Complete cluster plan with articles and interlinking
 */
export async function expandTopicToCluster(
  options: ClusterExpansionOptions
): Promise<ClusterExpansionResult> {
  const startTime = Date.now();
  const {
    topic,
    primaryKeyword,
    urlPattern,
    articleCount,
    variation,
    variations,
    provider = 'openai',
    modelTier = 'default',
    allowedArticleTypes,
    aiChooseVariants,
  } = options;

  // Get AI model
  const { model, provider: usedProvider, modelId } = getModelWithFallback(provider, modelTier);

  // Build prompt
  const promptParams: ClusterExpansionPromptParams = {
    topic,
    primaryKeyword,
    articleCount,
    variation: aiChooseVariants ? undefined : variation,
    variations,
    allowedArticleTypes,
    aiChooseVariants,
  };

  const userPrompt = buildClusterExpansionPrompt(promptParams);

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Generate cluster plan using AI
      const result = await generateObject({
        model,
        schema: ClusterPlanOutputSchema,
        system: CLUSTER_EXPANSION_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7, // Allow some creativity in article selection
      });

      // Validate the output
      const validation = validateClusterPlan(result.object);

      if (!validation.success) {
        const errors = formatClusterPlanErrors(validation.errors!);
        console.warn('[cluster-expansion] Validation failed:', errors);
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Transform AI output into ClusterPlan with slugs and URLs
      const clusterPlan = transformToClusterPlan(
        validation.data!,
        topic,
        primaryKeyword,
        urlPattern
      );

      return {
        success: true,
        plan: clusterPlan,
        provider: usedProvider,
        model: modelId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[cluster-expansion] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error during cluster expansion',
    provider: usedProvider,
    model: modelId,
    duration: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform AI output into a complete ClusterPlan with slugs and URLs
 */
function transformToClusterPlan(
  aiOutput: ClusterPlanOutput,
  topic: string,
  primaryKeyword: string,
  urlPattern: string
): ClusterPlan {
  const existingSlugs = new Set<string>();

  // Transform articles with slugs and URLs
  const articles: ClusterArticle[] = aiOutput.articles.map((article) => {
    const slug = generateUniqueSlug(article.title, existingSlugs);
    existingSlugs.add(slug);

    const targetUrl = applyUrlPattern(urlPattern, slug);

    return {
      articleType: article.articleType,
      title: article.title,
      slug,
      targetUrl,
      focus: article.focus,
      keywords: article.keywords,
      isPillar: article.isPillar ?? false,
      variation: article.variation ?? undefined, // Preserve per-article variation if present
    };
  });

  return {
    topic,
    primaryKeyword,
    urlPattern,
    articles,
    // Preserve AI-generated interlinking plan for anchor phrase matching
    interlinkingPlan: aiOutput.interlinkingPlan?.map((entry) => ({
      sourceIndex: entry.sourceIndex,
      targets: entry.targets.map((t) => ({
        targetIndex: t.targetIndex,
        suggestedAnchorPhrases: t.suggestedAnchorPhrases,
      })),
    })),
  };
}

/**
 * Build interlink targets for a specific article from the cluster plan
 *
 * @param plan - The complete cluster plan
 * @param articleIndex - Index of the source article
 * @returns Array of interlink targets for this article
 */
export function buildInterlinkTargetsFromPlan(
  plan: ClusterPlan,
  articleIndex: number
): InterlinkTarget[] {
  const targets: InterlinkTarget[] = [];
  const sourceArticle = plan.articles[articleIndex];

  // Build targets from all sibling articles
  plan.articles.forEach((article, idx) => {
    if (idx === articleIndex) return; // Skip self

    // Use keywords from the target article as anchor phrases
    const anchorPhrases = [
      ...article.keywords.slice(0, 2), // First 2 keywords
      article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 4).join(' '), // Simplified title
    ];

    // Determine anchor type (distribute for variance)
    const anchorType: 'exact' | 'semantic' | 'generic' =
      idx % 3 === 0 ? 'exact' : idx % 3 === 1 ? 'semantic' : 'generic';

    targets.push({
      targetSlug: article.slug,
      targetTitle: article.title,
      targetUrl: article.targetUrl,
      suggestedAnchorPhrases: anchorPhrases,
      anchorTextType: anchorType,
    });
  });

  return targets;
}

/**
 * Get sibling articles for cluster context during generation
 *
 * @param plan - The complete cluster plan
 * @param currentIndex - Index of the current article being generated
 * @returns Array of sibling article info
 */
export function getSiblingArticlesForContext(
  plan: ClusterPlan,
  currentIndex: number
): Array<{ title: string; url: string; focus: string; articleType: string }> {
  return plan.articles
    .filter((_, idx) => idx !== currentIndex)
    .map((article) => ({
      title: article.title,
      url: article.targetUrl,
      focus: article.focus,
      articleType: article.articleType,
    }));
}

/**
 * Extract all keywords from the cluster for sibling awareness
 */
export function extractClusterKeywords(plan: ClusterPlan): string[] {
  const keywords = new Set<string>();

  plan.articles.forEach((article) => {
    article.keywords.forEach((kw) => keywords.add(kw.toLowerCase()));
  });

  return Array.from(keywords);
}
