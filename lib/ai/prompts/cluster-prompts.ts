/**
 * Cluster Expansion AI Prompts
 *
 * Prompts for AI-driven cluster expansion - determining article types
 * and generating titles/focus for bulk article generation.
 */

import type { ClusterInput, TitleVariation } from '@/lib/types/cluster';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE TYPE DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ARTICLE_TYPE_DESCRIPTIONS = `
AVAILABLE ARTICLE TYPES (choose the most appropriate for the topic):

1. **affiliate** - Product-focused articles with purchase recommendations
   - Best for: Product roundups, buying guides, "best X for Y" content
   - Example: "Best Home Gym Equipment for Small Spaces"

2. **commercial** - Business/service focused content
   - Best for: Service pages, feature highlights, value propositions
   - Example: "Professional Home Gym Installation Services"

3. **comparison** - Head-to-head comparisons
   - Best for: Product vs product, service comparisons, alternatives
   - Example: "Bowflex vs NordicTrack: Which Home Gym Is Better?"

4. **how-to** - Step-by-step instructional guides
   - Best for: Tutorials, DIY guides, process explanations
   - Example: "How to Set Up a Home Gym in Your Garage"

5. **informational** - Educational, comprehensive content
   - Best for: Guides, explainers, "what is" content
   - Example: "Complete Guide to Building a Home Gym"

6. **listicle** - Numbered list format articles
   - Best for: Tips, ideas, collections, quick reads
   - Example: "15 Essential Home Gym Accessories"

7. **local** - Location-specific content (LOCAL SEO)
   - Best for: Location pages, local services, area guides
   - Example: "Best Home Gym Stores in Los Angeles"
   - NOTE: Only use for topics with geographic relevance

8. **recipe** - Cooking and food content
   - Best for: Recipes, meal prep, cooking guides
   - Example: "High-Protein Post-Workout Smoothie Recipe"
   - NOTE: Only use for food/cooking related topics

9. **review** - In-depth product/service reviews
   - Best for: Single product reviews, detailed analysis
   - Example: "Peloton Bike Review: Is It Worth the Price?"
`;

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE FORMAT INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getTitleFormatInstructions(variation: TitleVariation): string {
  switch (variation) {
    case 'question':
      return `
TITLE FORMAT: Question Format
- Start with "What", "How", "Why", "Which", "Is", "Are", "Can", "Do", "Does"
- Must end with a question mark (?)
- Examples:
  - "What Is the Best Home Gym Equipment for Beginners?"
  - "How Much Does a Home Gym Cost in 2024?"
`;
    case 'statement':
      return `
TITLE FORMAT: Statement Format
- Direct, declarative statements
- No question marks
- Examples:
  - "Best Home Gym Equipment for Small Spaces"
  - "Complete Guide to Building Your Home Gym"
`;
    case 'listicle':
      return `
TITLE FORMAT: Listicle/Number Format
- Start with a number
- Examples:
  - "10 Best Home Gym Machines for Weight Loss"
  - "7 Essential Tips for Your First Home Gym"
`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER EXPANSION SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

export const CLUSTER_EXPANSION_SYSTEM_PROMPT = `You are an expert SEO content strategist specializing in topical authority and content clusters.

Your task is to create a comprehensive content cluster plan that:
1. Covers the topic thoroughly from multiple angles
2. Uses appropriate article types for each piece
3. Creates natural interlinking opportunities between articles
4. Maximizes topical authority and SEO value

IMPORTANT RULES:
- Choose article types that MAKE SENSE for the topic
- Do NOT use "recipe" for non-food topics
- Do NOT use "local" unless there's geographic relevance
- You CAN repeat article types if it makes sense (e.g., multiple how-to articles)
- Ensure titles are UNIQUE and cover DIFFERENT aspects of the topic
- Each article should have a distinct focus - avoid overlap

PILLAR ARTICLE (REQUIRED):
- Designate exactly ONE article as the "pillar" (isPillar: true)
- The pillar article is the most comprehensive, authoritative piece in the cluster
- It should broadly cover the primary keyword and serve as the hub
- Pillar articles are typically "informational" or "how-to" types (comprehensive guides)
- All other articles are supporting content (isPillar: false) that link back to the pillar
- The pillar should have the most incoming links from supporting articles

INTERLINKING STRATEGY:
- Identify natural linking opportunities between articles
- Each article should have 2-4 potential links to other articles
- Suggest anchor phrases that would naturally appear in content
- Ensure every article has at least 2 incoming link opportunities (no orphans)
- Supporting articles should prioritize linking to the pillar article
`;

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD CLUSTER EXPANSION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClusterExpansionPromptParams {
  topic: string;
  primaryKeyword: string;
  articleCount: number;
  variation?: TitleVariation;
  variations?: TitleVariation[];
  allowedArticleTypes?: string[];
  aiChooseVariants?: boolean;
}

/**
 * Get variation instructions for only the selected formats (multi-select)
 */
function getSelectedVariationInstructions(selectedVariations: TitleVariation[]): string {
  const formatDescriptions: Record<TitleVariation, string> = {
    question: `"question" - Question Format
   - Start with "What", "How", "Why", "Which", "Is", "Are", "Can", "Do", "Does"
   - Must end with a question mark (?)
   - Best for: informational queries, FAQ-style content
   - Example: "What Is the Best Home Gym Equipment for Beginners?"`,
    statement: `"statement" - Statement Format
   - Direct, declarative statements
   - No question marks
   - Best for: guides, reviews, commercial content
   - Example: "Best Home Gym Equipment for Small Spaces"`,
    listicle: `"listicle" - Listicle/Number Format
   - Start with a number
   - Best for: tips, roundups, collections
   - Example: "10 Best Home Gym Machines for Weight Loss"`,
  };

  const entries = selectedVariations
    .map((v, i) => `${i + 1}. ${formatDescriptions[v]}`)
    .join('\n\n');

  return `
TITLE VARIATION OPTIONS (choose the best format for each article from these ${selectedVariations.length} options):

${entries}
`;
}

/**
 * Get all variation format instructions (for AI to choose)
 */
function getAllVariationInstructions(): string {
  return `
TITLE VARIATION OPTIONS (choose the best format for each article):

1. "question" - Question Format
   - Start with "What", "How", "Why", "Which", "Is", "Are", "Can", "Do", "Does"
   - Must end with a question mark (?)
   - Best for: informational queries, FAQ-style content
   - Example: "What Is the Best Home Gym Equipment for Beginners?"

2. "statement" - Statement Format
   - Direct, declarative statements
   - No question marks
   - Best for: guides, reviews, commercial content
   - Example: "Best Home Gym Equipment for Small Spaces"

3. "listicle" - Listicle/Number Format
   - Start with a number
   - Best for: tips, roundups, collections
   - Example: "10 Best Home Gym Machines for Weight Loss"
`;
}

/**
 * Build the user prompt for cluster expansion
 */
export function buildClusterExpansionPrompt(params: ClusterExpansionPromptParams): string {
  const { topic, primaryKeyword, articleCount, variation, variations, allowedArticleTypes, aiChooseVariants } = params;

  // Article type constraint (if specific types selected)
  const typeConstraint = allowedArticleTypes?.length
    ? `\nARTICLE TYPE CONSTRAINT:\nYou may ONLY use these article types: ${allowedArticleTypes.join(', ')}\nDo NOT use any other types.\n`
    : '';

  // Title format instructions - support multi-select variations
  let titleInstructions: string;
  const selectedVariations = variations && variations.length > 0 ? variations : (variation ? [variation] : undefined);
  
  if (aiChooseVariants && selectedVariations && selectedVariations.length > 1) {
    // Multi-select: show only the selected format instructions
    titleInstructions = getSelectedVariationInstructions(selectedVariations);
  } else if (aiChooseVariants && (!selectedVariations || selectedVariations.length === 0)) {
    // AI chooses from all (legacy behavior)
    titleInstructions = getAllVariationInstructions();
  } else {
    // Single variation selected
    titleInstructions = getTitleFormatInstructions(selectedVariations?.[0] || variation || 'statement');
  }

  // Determine if AI is choosing between multiple formats
  const isMultiFormat = aiChooseVariants || (selectedVariations && selectedVariations.length > 1);

  // Variation field instruction
  const variationFieldNote = isMultiFormat
    ? `   - variation: One of ${selectedVariations ? selectedVariations.map(v => `"${v}"`).join(', ') : '"question", "statement", or "listicle"'} (choose best for each article)`
    : '';

  // Example output format
  const exampleVariationField = isMultiFormat ? `\n      "variation": "${selectedVariations?.[0] || 'statement'}"` + ',' : '';
  const exampleVariationField2 = isMultiFormat ? `\n      "variation": "${selectedVariations?.[1] || selectedVariations?.[0] || 'question'}"` + ',' : '';

  // Remember section
  const titleReminder = isMultiFormat
    ? `- Choose the best title variation for each article from: ${selectedVariations ? selectedVariations.join(', ') : 'all formats'}`
    : `- Titles must be ${variation || selectedVariations?.[0] || 'statement'} format`;

  return `
Create a content cluster plan for the following:

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
NUMBER OF ARTICLES: ${articleCount}
${typeConstraint}
${ARTICLE_TYPE_DESCRIPTIONS}

${titleInstructions}

REQUIREMENTS:
1. Generate exactly ${articleCount} articles
2. Each article must have:
   - articleType: One of the ${allowedArticleTypes?.length ? allowedArticleTypes.length : 9} types ${allowedArticleTypes?.length ? 'allowed above' : 'listed above'}
   - title: SEO-optimized title (50-65 characters)
   - focus: What this specific article covers (1-2 sentences)
   - keywords: 3-5 semantic keywords relevant to this article
   - isPillar: true for exactly ONE article (the main pillar), false for all others${variationFieldNote ? '\n' + variationFieldNote : ''}

3. For the interlinking plan:
   - For each article (by index), identify which OTHER articles it should link to
   - Provide 1-3 natural anchor phrases for each link
   - Ensure comprehensive coverage (every article should have incoming links)
   - Supporting articles should prioritize linking to the pillar

OUTPUT FORMAT (JSON):
{
  "articles": [
    {
      "articleType": "informational",
      "title": "Complete Guide to Building a Home Gym",${exampleVariationField}
      "focus": "Comprehensive guide covering everything you need to know about setting up a home gym, from equipment to layout.",
      "keywords": ["home gym guide", "home gym setup", "build home gym", "home fitness"],
      "isPillar": true
    },
    {
      "articleType": "how-to",
      "title": "How to Build a Home Gym on a Budget?",${exampleVariationField2}
      "focus": "Step-by-step guide to creating an effective home gym without breaking the bank.",
      "keywords": ["budget home gym", "affordable gym equipment", "home workout setup", "DIY home gym"],
      "isPillar": false
    }
  ],
  "interlinkingPlan": [
    {
      "sourceIndex": 1,
      "targets": [
        {
          "targetIndex": 0,
          "suggestedAnchorPhrases": ["complete home gym guide", "home gym setup guide"]
        }
      ]
    }
  ]
}

Remember:
${titleReminder}
- Each article should cover a DIFFERENT angle of the topic
- Article types should be APPROPRIATE for the topic
- Keywords should enable natural interlinking
- Exactly ONE article must have isPillar: true (the comprehensive hub article)
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIBLING AWARENESS PROMPT ADDITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SiblingArticle {
  title: string;
  url: string;
  focus: string;
  articleType: string;
}

/**
 * Build additional prompt content for sibling awareness during generation
 * This is added to the content generation prompts when in cluster mode
 */
export function buildSiblingAwarenessPrompt(siblings: SiblingArticle[]): string {
  if (siblings.length === 0) return '';

  const siblingList = siblings
    .map((s, i) => `${i + 1}. "${s.title}" (${s.articleType}) - ${s.focus}`)
    .join('\n');

  return `
RELATED ARTICLES IN THIS CONTENT CLUSTER:
${siblingList}

INTERLINKING INSTRUCTIONS:
- Where relevant, naturally mention concepts covered by these related articles
- Use varied anchor text when referencing related topics
- Do NOT force references - only include when it genuinely adds value
- Aim for 2-4 natural reference points to related topics
- Use semantic variations, not exact title matches
`;
}

/**
 * Extract keywords from sibling articles for natural referencing
 */
export function extractSiblingKeywords(siblings: SiblingArticle[]): string[] {
  // Extract meaningful words from titles and focus
  const keywords = new Set<string>();

  siblings.forEach((s) => {
    // Extract key phrases from title (skip common words)
    const titleWords = s.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    titleWords.forEach((w) => keywords.add(w));
  });

  return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'have',
  'been',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'this',
  'that',
  'from',
  'they',
  'will',
  'would',
  'there',
  'their',
  'about',
  'into',
  'your',
  'best',
  'most',
  'how',
  'why',
]);
