/**
 * Promise Fulfillment Rules
 * 
 * Defines what H2s must contain to fulfill the promise made by an H1
 * for each combination of article type and variation.
 */

import type {
  PromiseType,
  ArticleType,
  VariationType,
  ExtractedPromise
} from './h1-promise-extractor'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Requirements for H2s to fulfill an H1 promise
 */
export interface H2Requirements {
  /** H2s must be specific items (e.g., "Classic Italian Taco" not "Preparation Method") */
  mustBeSpecific: boolean

  /** H2s must be in sequential order (e.g., steps 1, 2, 3) */
  mustBeSequential: boolean

  /** H2s must cover distinct topics (no overlap/duplicates) */
  mustBeDistinct: boolean

  /** H2s must be evaluative/review-focused (for review articles) */
  mustEvaluate: boolean

  /** H2s must be instructional (for how-to articles) */
  mustInstruct: boolean

  /** Enforcement level */
  enforcement: 'strict' | 'soft'

  /** Good H2 examples for this promise */
  examplePatterns: string[]

  /** H2 patterns that would NOT fulfill the promise */
  antiPatterns: string[]

  /** Description of what H2s should achieve */
  description: string
}

/**
 * Complete fulfillment rule for an article type × variation combination
 */
export interface PromiseFulfillmentRule {
  articleType: ArticleType
  variation: VariationType
  requirements: H2Requirements
  /** Prompt instructions for AI to generate proper H2s */
  promptInstructions: string
}

/**
 * Validation result for H2s against H1 promise
 */
export interface PromiseFulfillmentValidation {
  fulfilled: boolean
  score: number  // 0-100
  issues: string[]
  suggestions: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULFILLMENT RULES BY ARTICLE TYPE × VARIATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get H2 requirements for a specific article type and variation
 */
export function getH2Requirements(
  articleType: ArticleType,
  variation: VariationType,
  promise: ExtractedPromise
): H2Requirements {
  // Listicle article type OR listicle variation is ALWAYS strict
  // Note: articleType 'listicle' can have variation 'statement' or 'question' — still needs listicle rules
  if (variation === 'listicle' || articleType === 'listicle') {
    return getListicleRequirements(articleType, promise)
  }

  // Question and Statement are soft enforcement
  if (variation === 'question') {
    return getQuestionRequirements(articleType, promise)
  }

  return getStatementRequirements(articleType, promise)
}

/**
 * Listicle requirements - STRICT enforcement
 */
function getListicleRequirements(articleType: ArticleType, promise: ExtractedPromise): H2Requirements {
  const baseRequirements: H2Requirements = {
    mustBeSpecific: true,
    mustBeSequential: promise.promiseType === 'steps',
    mustBeDistinct: true,
    mustEvaluate: articleType === 'review',
    mustInstruct: articleType === 'howto' || articleType === 'how-to',
    enforcement: 'strict',
    examplePatterns: [],
    antiPatterns: [],
    description: '',
  }

  switch (articleType) {
    case 'review':
      return {
        ...baseRequirements,
        mustBeSpecific: true,
        mustEvaluate: true,
        description: 'Each H2 must evaluate a specific aspect of the product/service',
        examplePatterns: [
          '1. Performance Analysis and Real-World Testing',
          '2. Value Assessment Compared to Alternatives',
          '3. Build Quality and Durability Evaluation',
          '4. Feature Deep-Dive and Usability Review',
          '5. Long-Term Reliability Considerations',
        ],
        antiPatterns: [
          'History of [Product]',
          'How [Product] Works',
          'About [Product]',
          'Introduction to [Product]',
          '[Product] Overview',
        ],
      }

    case 'recipe':
      return {
        ...baseRequirements,
        mustBeSpecific: true,
        description: 'Each H2 must be a distinct recipe variation with unique ingredients or method',
        examplePatterns: [
          '1. Classic Italian-Style [Dish] with Fresh Basil',
          '2. Spicy Calabrian [Dish] with Chili Peppers',
          '3. Creamy Parmesan [Dish] with White Wine Sauce',
          '4. Mediterranean [Dish] with Olives and Feta',
          '5. Quick Weeknight [Dish] in 30 Minutes',
        ],
        antiPatterns: [
          'Essential Ingredients for [Dish]',
          'Cooking Tips for [Dish]',
          'History of [Dish]',
          'Why [Dish] Is Popular',
          'Serving Suggestions',
        ],
      }

    case 'howto':
    case 'how-to':
      return {
        ...baseRequirements,
        mustBeSequential: true,
        mustInstruct: true,
        description: 'Each H2 must be an ACTION STEP teaching the reader what to DO',
        examplePatterns: [
          '1. Identify the Key Elements You Need',
          '2. Gather Your Materials and Tools',
          '3. Prepare Your Workspace Properly',
          '4. Execute the Main Process Step by Step',
          '5. Apply Final Touches and Review Results',
        ],
        antiPatterns: [
          'Introduction to [Task]',
          'Why [Task] Matters',
          'Benefits of [Task]',
          'History of [Task]',
          '[Topic] Provides [Benefit]',
          '[Topic] Is Important Because',
          'Conclusion',
        ],
      }

    case 'comparison':
      return {
        ...baseRequirements,
        mustEvaluate: true,
        description: 'Each H2 must COMPARE a specific aspect of the two options head-to-head',
        examplePatterns: [
          '1. Performance Showdown: [A] vs [B]',
          '2. Price and Value Comparison',
          '3. Features Face-Off: What Each Offers',
          '4. User Experience: Which Feels Better?',
          '5. Final Verdict: Which Should You Choose?',
        ],
        antiPatterns: [
          'History of [Option A]',
          'About [Option B]',
          'Introduction to [Topic]',
          '[Option] Is Great',      // Not comparative
          'Why [Option] Matters',   // Not comparative
          'Benefits of [Option]',   // One-sided, not comparative
        ],
      }

    case 'commercial':
      return {
        ...baseRequirements,
        mustEvaluate: false,
        description: 'Each H2 must highlight a distinct BENEFIT, FEATURE, or VALUE PROPOSITION',
        examplePatterns: [
          '1. Dramatically Reduce Your [Pain Point] Costs',
          '2. Get [Specific Benefit] in [Timeframe]',
          '3. Industry-Leading [Feature] Technology',
          '4. Trusted by [Target Audience] Worldwide',
          '5. [Number]% More Efficient Than Traditional Methods',
        ],
        antiPatterns: [
          'History of [Product/Service]',
          'What Is [Product/Service]?',
          'Introduction to [Topic]',
          'About Our Company',
          'General Overview',
          'How It Works',  // Too generic
        ],
      }

    case 'informational':
    default:
      return {
        ...baseRequirements,
        description: 'Each H2 must present a distinct fact, aspect, or point about the topic',
        examplePatterns: [
          '1. [Topic] Originated in Ancient [Place]',
          '2. Over [Number] People Use [Topic] Daily',
          '3. [Topic] Contains [Interesting Property]',
          '4. Scientists Discovered [Topic] in [Year]',
          '5. [Topic] Affects [Aspect] in Surprising Ways',
        ],
        antiPatterns: [
          'Introduction to [Topic]',
          'Conclusion',
          'Summary',
          'Final Thoughts',
          'Why This Matters',
        ],
      }
  }
}

/**
 * Question variation requirements - SOFT enforcement
 */
function getQuestionRequirements(articleType: ArticleType, promise: ExtractedPromise): H2Requirements {
  // SELECTION PROMISE (e.g., "What Are the Best PS5 Games?")
  if (promise.promiseType === 'selection') {
    const s = promise.subject || 'Items';
    return {
      mustBeSpecific: true,
      mustBeSequential: false,
      mustBeDistinct: true,
      mustEvaluate: true,
      mustInstruct: false,
      enforcement: 'strict',
      description: `H2s must be specific RECOMMENDATION QUESTIONS asking about specific "${s}" categories/items.`,
      examplePatterns: [
        `Which ${s} Are Must-Haves?`,
        `What Are the Top ${s} Available?`,
        `Which ${s} Offers the Best Value?`,
        `What Premium ${s} Should You Buy?`,
      ],
      antiPatterns: [
        `What Is a ${s}?`,
        `Why Do We Use ${s}?`,
        `History of ${s}`,
      ],
    }
  }

  // FACTS PROMISE (e.g., "What Are the Most Fascinating Facts About X?")
  if (promise.promiseType === 'facts') {
    const s = promise.subject || 'the topic'
    return {
      mustBeSpecific: true,
      mustBeSequential: false,
      mustBeDistinct: true,
      mustEvaluate: false,
      mustInstruct: false,
      enforcement: 'soft',
      description: `H2s must be FACT-REVEALING questions that hint at specific, surprising facts about "${s}".`,
      examplePatterns: [
        `How Many Varieties of ${s} Actually Exist?`,
        `What Surprising Record Does ${s} Hold?`,
        `Why Did ${s} Change the Course of History?`,
        `What Hidden Role Does ${s} Play in Daily Life?`,
      ],
      antiPatterns: [
        'what are the main types',
        'how do they contribute',
        'why are they important',
        'what is the history',
        'different kinds of',
      ],
    }
  }

  const baseRequirements: H2Requirements = {
    mustBeSpecific: false,
    mustBeSequential: false,
    mustBeDistinct: true,
    mustEvaluate: articleType === 'review',
    mustInstruct: articleType === 'howto' || articleType === 'how-to',
    enforcement: 'soft',
    examplePatterns: [],
    antiPatterns: [],
    description: 'H2s should collectively answer the question posed in the H1',
  }

  switch (articleType) {
    case 'review':
      return {
        ...baseRequirements,
        mustEvaluate: true,
        description: 'H2s should answer the question by evaluating different aspects',
        examplePatterns: [
          'What Does [Product] Offer?',
          'How Does [Product] Perform?',
          'Is [Product] Worth the Price?',
          'What Are the Alternatives?',
          'Who Should Buy [Product]?',
        ],
        antiPatterns: [
          'Introduction',
          'Background Information',
          'Unrelated Tangent',
        ],
      }

    case 'recipe':
      return {
        ...baseRequirements,
        description: 'H2s should answer by covering preparation, cooking, and serving',
        examplePatterns: [
          'What Ingredients Do You Need?',
          'How Do You Prepare the [Dish]?',
          'What Is the Best Cooking Method?',
          'How Long Does It Take to Cook?',
          'What Are Some Variations?',
        ],
        antiPatterns: [
          'History of [Dish]',
          'Famous Chefs Who Made [Dish]',
        ],
      }

    case 'howto':
    case 'how-to':
      return {
        ...baseRequirements,
        mustInstruct: true,
        description: 'Each H2 must be an ACTION-FOCUSED question teaching HOW to do something',
        examplePatterns: [
          'What Do You Need to Get Started?',
          'How Do You Begin the Process?',
          'What Is the First Step You Should Take?',
          'How Do You Execute the Main Task?',
          'How Do You Finish and Review Your Work?',
        ],
        antiPatterns: [
          'Why Is This Important?',
          'What Are the Benefits?',
          'History of [Method]',
          '[Topic] Provides [Description]',
          'What Makes [Topic] So [Adjective]?',
        ],
      }

    case 'comparison':
      return {
        ...baseRequirements,
        mustEvaluate: true,
        description: 'Each H2 must be a COMPARISON question weighing the options',
        examplePatterns: [
          'Which One Offers Better Performance?',
          'How Do They Compare on Price?',
          'What Features Does Each Bring to the Table?',
          'Which Is Easier to Use?',
          'Which Should You Choose in the End?',
        ],
        antiPatterns: [
          'What Is [Option A]?',
          'History of [Option]',
          'Why Is [Option] Popular?',
        ],
      }

    case 'commercial':
      return {
        ...baseRequirements,
        description: 'Each H2 must be a BENEFIT-FOCUSED question that sells the value',
        examplePatterns: [
          'How Can [Product/Service] Save You Time?',
          'What Makes [Product/Service] Different?',
          'Why Do [Target Audience] Choose [Product/Service]?',
          'How Much Can You Save with [Product/Service]?',
          'What Results Can You Expect?',
        ],
        antiPatterns: [
          'What Is [Product/Service]?',  // Too generic
          'History of [Company]',
          'How Does It Work?',  // Feature-focused, not benefit-focused
        ],
      }

    case 'informational':
    default:
      return {
        ...baseRequirements,
        description: 'Each H2 must be a SPECIFIC question a real reader would search for — not a generic textbook section rephrased as a question',
        examplePatterns: [
          'Why Does [Topic] Fail for So Many People?',
          'What Happens When You First Try [Topic]?',
          'Which [Topic] Approach Actually Gets Results?',
          'How Do Experts Approach [Topic] Differently?',
          'What Mistake Ruins Most People\'s [Topic] Efforts?',
        ],
        antiPatterns: [
          'What Is [Topic]?',
          'What Are the Types of [Topic]?',
          'Where Did [Topic] Come From?',
          'Why Is [Topic] Important?',
          'How Does [Topic] Affect Society?',
          'What Are the Benefits of [Topic]?',
          'What Does the Future Hold for [Topic]?',
          'How Has [Topic] Evolved Over Time?',
        ],
      }
  }
}

/**
 * Statement variation requirements - SOFT enforcement
 */
function getStatementRequirements(articleType: ArticleType, promise: ExtractedPromise): H2Requirements {
  // SELECTION PROMISE (e.g., "Best PS5 Games", "Top Marketing Strategies")
  // Even for statement articles, "Best" implies curation/selection.
  if (promise.promiseType === 'selection') {
    const s = promise.subject || 'Items';
    return {
      mustBeSpecific: true,
      mustBeSequential: false,
      mustBeDistinct: true,
      mustEvaluate: true,
      mustInstruct: false,
      enforcement: 'strict',
      description: `H2s must be specific SELECTIONS, CATEGORIES, or RECOMMENDATIONS for "${s}", not generic descriptions.`,
      examplePatterns: [
        `Top-Rated ${s} Options`,
        `Must-Have ${s} for ${new Date().getFullYear()}`,
        `Best Value ${s} Selections`,
        `Premium ${s} Choices`,
        `Hidden Gem ${s} You Missed`,
      ],
      antiPatterns: [
        `${s} Exist`,
        `Why ${s} Are Important`,
        `History of ${s}`,
        'Introduction',
        'Conclusion',
      ],
    }
  }

  const baseRequirements: H2Requirements = {
    mustBeSpecific: false,
    mustBeSequential: false,
    mustBeDistinct: true,
    mustEvaluate: articleType === 'review',
    mustInstruct: articleType === 'howto' || articleType === 'how-to',
    enforcement: 'soft',
    examplePatterns: [],
    antiPatterns: [],
    description: 'H2s should comprehensively cover all essential aspects promised by the H1',
  }

  switch (articleType) {
    case 'review':
      return {
        ...baseRequirements,
        mustEvaluate: true,
        description: 'H2s should cover features, performance, value, and verdict',
        examplePatterns: [
          'Key Features and Specifications',
          'Performance in Real-World Use',
          'Value Compared to Competitors',
          'Pros and Cons Breakdown',
          'Final Verdict and Recommendations',
        ],
        antiPatterns: [
          'Company History',
          'Unrelated Products',
        ],
      }

    case 'recipe':
      return {
        ...baseRequirements,
        description: 'H2s should cover ingredients, preparation, cooking, and tips',
        examplePatterns: [
          'Key Ingredients You Need',
          'Step-by-Step Preparation',
          'Cooking the Dish from Scratch',
          'Tips for Perfect Results',
          'Serving Suggestions and Variations',
        ],
        antiPatterns: [
          'History of the Cuisine',
          'Famous Restaurants',
        ],
      }

    case 'howto':
    case 'how-to':
      return {
        ...baseRequirements,
        mustInstruct: true,
        description: 'Each H2 must INSTRUCT the reader with an ACTION VERB - what to DO, not what something IS',
        examplePatterns: [
          'Identify What You Need Before Starting',
          'Prepare Your Materials and Workspace',
          'Follow the Core Steps Carefully',
          'Apply Advanced Techniques for Better Results',
          'Troubleshoot Common Problems Effectively',
        ],
        antiPatterns: [
          '[Topic] Provides [Benefit]',
          '[Topic] Is Important',
          'Why This Is Popular',
          'The Benefits of [Topic]',
          '[Noun] [Verb]s [Description]',
          'Celebrity Endorsements',
        ],
      }

    case 'comparison':
      return {
        ...baseRequirements,
        mustEvaluate: true,
        description: 'Each H2 must COMPARE the options on a specific aspect or criterion',
        examplePatterns: [
          'Performance Comparison: Head-to-Head Testing',
          'Price and Value Analysis',
          'Feature Breakdown: What Each Offers',
          'User Experience and Ease of Use',
          'The Verdict: Making Your Final Choice',
        ],
        antiPatterns: [
          '[Option A] Overview',
          'About [Option B]',
          'History of [Topic]',
          'Why [Option] Is Great',
          '[Option] Features',  // One-sided, not comparative
        ],
      }

    case 'commercial':
      return {
        ...baseRequirements,
        description: 'Each H2 must highlight BENEFITS, VALUE PROPOSITIONS, or RESULTS',
        examplePatterns: [
          'Proven Results That Speak for Themselves',
          'Unmatched Value for Your Investment',
          'Built for [Target Audience] Like You',
          'The [Product/Service] Advantage',
          'Transform Your [Pain Point] Today',
        ],
        antiPatterns: [
          'About [Product/Service]',
          'Company History',
          'Technical Specifications',  // Features, not benefits
          'How It Works',  // Process, not outcome
        ],
      }

    case 'informational':
    default:
      return {
        ...baseRequirements,
        description: 'Each H2 must explore a SPECIFIC, CONCRETE angle — not generic encyclopedic sections like "What Is X" / "History of X" / "Types of X"',
        examplePatterns: [
          'The Surprising Way [Topic] Reshapes Your Daily Routine',
          'The Biggest Misconception About [Topic] Exposed',
          '[Topic] Mistakes Most Beginners Still Make',
          'The Key Difference Between [Topic] and Common Alternatives',
          'Real-World Results People See After Adopting [Topic]',
        ],
        antiPatterns: [
          'What Is [Topic]',
          'Defining [Topic]',
          'Defining the Impact of [Topic]',
          'History of [Topic]',
          'Historical Background of [Topic]',
          'Evolution of [Topic]',
          'Types of [Topic]',
          'Categories of [Topic]',
          'Different Varieties of [Topic]',
          'Identifying Different Categories of [Topic]',
          'Impact of [Topic] on Society',
          'Influence of [Topic] on Culture',
          'Future of [Topic]',
          'Future Developments',
          'Real-World Applications',
          'How [Topic] Works',
          'Benefits of [Topic]',
          'Importance of [Topic]',
          'The Role of [Topic]',
        ],
      }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INSTRUCTIONS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate prompt instructions for H2 generation based on H1 promise
 */
export function getPromiseFulfillmentInstructions(
  promise: ExtractedPromise,
  articleType: ArticleType,
  variation: VariationType,
  h2Count: number
): string {
  const requirements = getH2Requirements(articleType, variation, promise)

  let instructions = ''

  // Header with H1 reference
  instructions += `
═══════════════════════════════════════════════════════════════════════════════
H1 PROMISE FULFILLMENT - ${requirements.enforcement.toUpperCase()} ENFORCEMENT
═══════════════════════════════════════════════════════════════════════════════

H1: "${promise.h1}"

${requirements.description}
`

  // Selection/Curation specific guidance (e.g. "Best PS5 Games")
  if (promise.promiseType === 'selection') {
    const s = promise.subject || 'Item';
    instructions += `
🏆 SELECTION/CURATION PROMISE - SPECIFIC ITEMS REQUIRED:

The H1 promises a "Best of" or "Top" selection of "${s}".
- H2s MUST be specific RECOMMENDATIONS (Products, Tools, Strategies) or SPECIFIC CATEGORIES of "${s}".
- ❌ "${s} Are Important" (Generic/Abstract)
- ❌ "History of ${s}" (Background)
- ✅ "Top-Rated ${s} for Professionals" (Specific Category)
- ✅ "The Best Budget-Friendly ${s}" (Specific Recommendation)
- Do NOT write an essay about the *concept* of "${s}". List the best items/sub-categories.
`
  }

  // Listicle-specific strict requirements (check both articleType and variation)
  if ((variation === 'listicle' || articleType === 'listicle') && promise.count !== null) {
    instructions += `
⚠️ CRITICAL LISTICLE REQUIREMENTS (NON-NEGOTIABLE):

1. COUNT MATCH: Generate EXACTLY ${promise.count} H2s (the H1 promises ${promise.count} items)
   
2. EACH H2 = ONE ITEM: Every H2 must represent ONE DISTINCT ${getItemLabel(promise.promiseType)}
   - NOT generic sections like "Introduction" or "Overview"
   - NOT background/history sections
   - NOT conclusion/summary sections
   
3. NO DUPLICATES: Each H2 must cover a UNIQUE aspect
   - ❌ "Best Feature" + "Top Feature" = DUPLICATE (same concept)
   - ❌ "How to Start" + "Getting Started" = DUPLICATE (same concept)
   - ✅ Each H2 should be clearly different from others

4. SPECIFICITY: H2s should name SPECIFIC items, not generic categories
   - ✅ "1. Classic Italian Taco with Fresh Basil" (specific)
   - ❌ "1. Traditional Cooking Method" (generic)
`
  }

  // Article-type-specific guidance
  if (articleType === 'review' && requirements.mustEvaluate) {
    instructions += `
📊 REVIEW ARTICLE - EVALUATIVE H2s REQUIRED:

Each H2 must EVALUATE an aspect of "${promise.subject}":
- ✅ "Performance Analysis" - evaluates how it works
- ✅ "Value Assessment" - evaluates if it's worth the price
- ✅ "Build Quality Review" - evaluates physical construction
- ❌ "How ${promise.subject} Works" - explains, doesn't evaluate
- ❌ "History of ${promise.subject}" - informs, doesn't evaluate
`
  }

  if (articleType === 'recipe' && variation === 'listicle') {
    instructions += `
🍳 RECIPE LISTICLE - UNIQUE RECIPES REQUIRED:

Each H2 must be a DISTINCT recipe variation:
- ✅ "1. Classic Italian-Style Beef Taco" - specific recipe
- ✅ "2. Spicy Chipotle Beef Taco" - different flavor profile
- ✅ "3. Creamy Avocado Beef Taco" - different key ingredient
- ❌ "1. Ingredient List" - not a recipe
- ❌ "2. Cooking Tips" - not a recipe
- ❌ "3. Another Beef Taco" - too vague, not specific
`
  }

  if ((articleType === 'howto' || articleType === 'how-to') && requirements.mustBeSequential) {
    instructions += `
📝 HOW-TO LISTICLE - SEQUENTIAL STEPS REQUIRED:

H2s must be in LOGICAL ORDER that a reader would follow:
- ✅ "1. Gather Materials" → "2. Prepare Workspace" → "3. Begin Process"
- ❌ Steps out of order or random arrangement
`
  }

  // How-to specific guidance for ALL variations
  if ((articleType === 'howto' || articleType === 'how-to') && requirements.mustInstruct) {
    instructions += `
📝 HOW-TO ARTICLE - INSTRUCTIONAL H2s REQUIRED:

Each H2 must TEACH the reader an ACTION or STEP - use action verbs!

ACTION VERBS to use: Identify, Gather, Prepare, Start, Execute, Apply, Complete, Review, Troubleshoot, Master

Examples for topic "${promise.subject}":
- ✅ "Identify the Key Elements of ${promise.subject}" (action-based)
- ✅ "Learn to Spot ${promise.subject} Patterns" (instructional)
- ✅ "Practice ${promise.subject} Techniques Daily" (teaches action)
- ❌ "${promise.subject} Provides Great Benefits" (DESCRIPTIVE - not instructional)
- ❌ "${promise.subject} Is Important for Many Reasons" (INFORMATIONAL - not how-to)
- ❌ "Why ${promise.subject} Matters" (explains WHY, not HOW)

Each H2 should answer: "What should I DO next?" NOT "What is this about?"
`
  }

  // Informational articles — kill the Wikipedia pattern
  if (articleType === 'informational') {
    instructions += `
📰 INFORMATIONAL ARTICLE — DO NOT WRITE A WIKIPEDIA ARTICLE:

Your H2s must NOT follow the generic encyclopedic pattern of:
  ❌ "What Is [Topic]" → "History of [Topic]" → "Types of [Topic]" → "Applications of [Topic]"

This pattern makes EVERY article read identically regardless of topic. Instead:

Each H2 should explore a SPECIFIC, INTERESTING angle that matches the H1's promise.
Think like a journalist writing a feature story, NOT an encyclopedia editor:

- ✅ "The Surprising Way ${promise.subject || 'This'} Reshapes Your Daily Routine" (specific impact)
- ✅ "The Biggest Misconception About ${promise.subject || 'This Topic'} Exposed" (surprising angle)
- ✅ "${promise.subject || 'This'} Mistakes Most People Still Make" (practical, actionable)
- ✅ "The One Thing Experts Get Wrong About ${promise.subject || 'This Topic'}" (contrarian insight)

${variation === 'statement' ? `⚠️ CRITICAL — STATEMENT FORMAT REQUIRED:
All H2s MUST be declarative statements. They must NEVER end with a question mark.
Do NOT start H2s with "How", "What", "Why", "When", "Where", "Which", "Do", "Does", "Can", "Is", "Are" — these create questions, not statements.
Instead, start with: "The...", "[Topic]...", "Real...", "Surprising...", "Common...", "Key...", etc.
` : ''}
- ❌ "What Is ${promise.subject || 'Topic'}" (encyclopedic opener — the reader already knows what it is)
- ❌ "History of ${promise.subject || 'Topic'}" (filler — unless the H1 specifically promises history)
- ❌ "Types of ${promise.subject || 'Topic'}" (taxonomic filler)
- ❌ "Impact of ${promise.subject || 'Topic'} on Society" (vague academic fluff)
- ❌ "Defining the Impact of ${promise.subject || 'Topic'}" (same thing reworded)

EACH H2 should make the reader think "I want to read that section" — not "I've seen this heading in every article."

⚠️ The examples above are for TONE and ANGLE guidance only — do NOT copy them.
Generate ORIGINAL H2s specific to "${promise.subject || 'this topic'}" and the H1's promise.
`
  }

  // Facts promise - H2s should reveal/present specific facts
  if (promise.promiseType === 'facts') {
    const s = promise.subject || 'the topic'
    if (variation === 'question') {
      instructions += `
🔬 FACTS PROMISE - FACT-REVEALING QUESTIONS REQUIRED:

The H1 promises FACTS about "${s}". Each H2 must be a question that REVEALS or HINTS at a specific fact.

- ✅ "How Many Varieties of ${s} Actually Exist?" (reveals a number-based fact)
- ✅ "What Surprising Record Does ${s} Hold?" (reveals a surprising fact)
- ✅ "Why Did ${s} Change an Entire Industry?" (reveals a specific impact)
- ❌ "What Are the Main Types of ${s}?" (generic categorization, not a fact)
- ❌ "How Does ${s} Contribute to Society?" (broad topic question, not fact-specific)
- ❌ "Why Is ${s} Important?" (generic relevance, not a fact)

Each H2 should make the reader think "I didn't know that!" — not "this is a general topic."
`
    } else {
      instructions += `
🔬 FACTS PROMISE - SPECIFIC FACTS REQUIRED:

The H1 promises FACTS about "${s}". Each H2 must present or hint at a SPECIFIC, SURPRISING fact.

- ✅ "${s} Has Been Around for Over a Century" (specific, surprising)
- ✅ "Over 10 Million People Rely on ${s} Daily" (concrete number)
- ✅ "${s} Can Withstand Extreme Conditions" (surprising capability)
- ❌ "The Importance of ${s}" (generic, not a fact)
- ❌ "Different Types of ${s}" (categorization, not a fact)
- ❌ "Benefits of ${s}" (generic benefit, not a fact)

Each H2 should make the reader think "I didn't know that!" — not "this is a general topic."
`
    }
  }

  // Examples
  if (requirements.examplePatterns.length > 0) {
    instructions += `
✅ H2 STYLE INSPIRATION for this ${articleType} ${variation} (do NOT copy these — create your own original H2s using these only as a guide for tone and style):
${requirements.examplePatterns.map(ex => `- ${ex}`).join('\n')}
`
  }

  // Anti-patterns
  if (requirements.antiPatterns.length > 0) {
    instructions += `
❌ DO NOT GENERATE H2s like:
${requirements.antiPatterns.map(ap => `- "${ap}" - Does NOT fulfill the H1 promise`).join('\n')}
`
  }

  return instructions
}

/**
 * Get singular item label for promise type
 */
function getItemLabel(promiseType: PromiseType): string {
  const labels: Record<PromiseType, string> = {
    recipes: 'recipe',
    reasons: 'reason',
    ways: 'way/method',
    tips: 'tip',
    benefits: 'benefit',
    features: 'feature',
    examples: 'example',
    products: 'product',
    ideas: 'idea',
    steps: 'step',
    facts: 'fact',
    mistakes: 'mistake',
    secrets: 'secret',
    strategies: 'strategy',
    methods: 'method',
    techniques: 'technique',
    options: 'option',
    alternatives: 'alternative',
    things: 'thing',
    moments: 'moment',
    items: 'item',
    guide: 'section',
    review: 'aspect',
    analysis: 'point',
    overview: 'area',
    comparison: 'comparison',
    tutorial: 'lesson',
    breakdown: 'part',
    explained: 'explanation',
    'how-to': 'step',
    'what-is': 'aspect',
    'why-does': 'reason',
    'when-to': 'situation',
    'which-is': 'option',
    'can-you': 'possibility',
    'should-you': 'consideration',
    'selection': 'selection',
    generic: 'point',
  }
  return labels[promiseType] || 'item'
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that H2s fulfill the H1 promise
 * 
 * SPECIAL CASE: Affiliate articles use product names as H2s
 * These are pre-validated by the product selection process, so they
 * automatically pass promise fulfillment (the "promise" is the products).
 * 
 * @param coreKeywords - Optional extracted core keywords for density validation
 *                       If provided, uses 30-60% threshold; otherwise 40-70%
 */
export function validatePromiseFulfillment(
  promise: ExtractedPromise,
  h2s: string[],
  articleType: ArticleType,
  variation: VariationType,
  affiliateProducts?: Array<{ name: string; badge: string }>,
  coreKeywords?: string[]
): PromiseFulfillmentValidation {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // AFFILIATE SPECIAL CASE: Product names ARE the promise fulfillment
  // If we have affiliate products, the H2s should be product names
  // which are inherently valid (selected by product selection process)
  if (articleType === 'affiliate' && affiliateProducts && affiliateProducts.length > 0) {
    // Check if H2s roughly match product names (allowing for formatting)
    const productNamesLower = affiliateProducts.map(p => p.name.toLowerCase())
    const h2sMatchProducts = h2s.filter(h2 => {
      const h2Lower = h2.toLowerCase().replace(/^\d+\.\s*/, '') // Remove numbering
      return productNamesLower.some(pn =>
        h2Lower.includes(pn) || pn.includes(h2Lower.substring(0, 20))
      )
    })

    if (h2sMatchProducts.length >= h2s.length * 0.7) {
      // At least 70% of H2s match products - this is valid
      return {
        fulfilled: true,
        score: 95, // High score for affiliate articles with matching products
        issues: [],
        suggestions: [],
      }
    }
  }

  const requirements = getH2Requirements(articleType, variation, promise)

  // 1. Count Match (listicle article type or variation, strict)
  if ((variation === 'listicle' || articleType === 'listicle') && promise.count !== null) {
    if (h2s.length !== promise.count) {
      issues.push(`H1 promises ${promise.count} items but got ${h2s.length} H2s`)
      suggestions.push(`Generate exactly ${promise.count} H2s to match the H1 promise`)
      score -= 30
    }
  }

  // 2. Duplicate Detection
  const duplicates = detectDuplicateH2s(h2s)
  if (duplicates.length > 0) {
    issues.push(`Duplicate H2s detected: ${duplicates.join(', ')}`)
    suggestions.push('Each H2 must cover a unique, distinct topic')
    score -= 20 * duplicates.length
  }

  // 3. Anti-pattern Detection
  for (const h2 of h2s) {
    for (const antiPattern of requirements.antiPatterns) {
      if (h2.toLowerCase().includes(antiPattern.toLowerCase())) {
        issues.push(`H2 "${h2}" matches anti-pattern "${antiPattern}"`)
        suggestions.push(`Replace generic H2 with specific ${getItemLabel(promise.promiseType)}`)
        score -= 15
      }
    }
  }

  // 4. Review article - must be evaluative
  if (requirements.mustEvaluate) {
    const nonEvaluativeH2s = h2s.filter(h2 => !isEvaluativeH2(h2))
    if (nonEvaluativeH2s.length > h2s.length / 2) {
      issues.push('Most H2s are not evaluative - review articles need evaluation-focused H2s')
      suggestions.push('Use evaluative language: "Analysis", "Assessment", "Review", "Evaluation"')
      score -= 15
    }
  }

  // 5. Recipe listicle - must be specific recipes
  if (articleType === 'recipe' && variation === 'listicle') {
    const genericRecipeH2s = h2s.filter(h2 => isGenericRecipeH2(h2))
    if (genericRecipeH2s.length > 0) {
      issues.push(`Generic recipe H2s found: ${genericRecipeH2s.join(', ')}`)
      suggestions.push('Each H2 must name a SPECIFIC recipe variation')
      score -= 10 * genericRecipeH2s.length
    }
  }

  // 6. Subject relevance
  const irrelevantH2s = h2s.filter(h2 => !isRelevantToSubject(h2, promise.subject))
  if (irrelevantH2s.length > h2s.length / 3) {
    issues.push('Many H2s seem unrelated to the H1 subject')
    suggestions.push(`Ensure H2s relate to "${promise.subject}"`)
    score -= 10
  }

  // 7. Keyword Density Validation (new)
  // Check that keywords appear naturally in H2s (not stuffed)
  if (coreKeywords && coreKeywords.length > 0 && h2s.length > 0) {
    const h2sWithKeyword = h2s.filter(h2 => {
      const lowerH2 = h2.toLowerCase()
      return coreKeywords.some(kw => lowerH2.includes(kw.toLowerCase()))
    })

    const keywordDensity = (h2sWithKeyword.length / h2s.length) * 100
    const minDensity = 30  // For extracted keywords
    const maxDensity = 60  // For extracted keywords

    if (keywordDensity < minDensity) {
      issues.push(`Keyword density too low (${keywordDensity.toFixed(0)}%) - include keywords in more H2s`)
      suggestions.push(`Include keywords (${coreKeywords.join(', ')}) in at least ${minDensity}% of H2s`)
      score -= 10
    } else if (keywordDensity > maxDensity) {
      issues.push(`Keyword density too high (${keywordDensity.toFixed(0)}%) - keywords appear in too many H2s`)
      suggestions.push(`Reduce keyword usage - not every H2 needs "${coreKeywords.join(', ')}"`)
      score -= 15  // Higher penalty for keyword stuffing
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  return {
    fulfilled: issues.length === 0,
    score,
    issues,
    suggestions,
  }
}

/**
 * Detect duplicate or near-duplicate H2s
 */
export function detectDuplicateH2s(h2s: string[]): string[] {
  const duplicates: string[] = []
  const normalized = h2s.map(h2 => normalizeForComparison(h2))

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      // Exact match after normalization
      if (normalized[i] === normalized[j]) {
        duplicates.push(`"${h2s[i]}" ≈ "${h2s[j]}"`)
        continue
      }

      // Semantic similarity (word overlap)
      const similarity = calculateWordOverlap(normalized[i], normalized[j])
      if (similarity > 0.7) {
        duplicates.push(`"${h2s[i]}" ≈ "${h2s[j]}" (${Math.round(similarity * 100)}% similar)`)
      }
    }
  }

  return duplicates
}

/**
 * Normalize H2 for comparison (remove numbers, common words)
 */
function normalizeForComparison(h2: string): string {
  return h2
    .toLowerCase()
    .replace(/^\d+[\.\)\-\s]+/, '') // Remove leading numbers
    .replace(/\b(the|a|an|of|to|for|in|on|with|and|or|is|are)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate word overlap between two strings
 */
function calculateWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2))
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++
  }

  return overlap / Math.max(wordsA.size, wordsB.size)
}

/**
 * Check if H2 uses evaluative language
 */
function isEvaluativeH2(h2: string): boolean {
  const evaluativePatterns = [
    /\b(review|analysis|assessment|evaluation|verdict|rating)\b/i,
    /\b(pros|cons|benefits|drawbacks|advantages|disadvantages)\b/i,
    /\b(worth|value|quality|performance)\b/i,
    /\b(compared|versus|vs\.?|better|worse)\b/i,
    /\b(tested|measured|examined|inspected)\b/i,
  ]
  return evaluativePatterns.some(pattern => pattern.test(h2))
}

/**
 * Check if H2 is a generic recipe section (not a specific recipe)
 */
function isGenericRecipeH2(h2: string): boolean {
  const genericPatterns = [
    /\b(ingredients?|supplies|materials)\b/i,
    /\b(tips?|tricks?|advice)\b/i,
    /\b(history|origin|background)\b/i,
    /\b(introduction|overview|about)\b/i,
    /\b(conclusion|summary|final)\b/i,
    /\b(serving|presentation|plating)\b/i,
  ]
  return genericPatterns.some(pattern => pattern.test(h2))
}

/**
 * Check if H2 relates to the subject
 */
function isRelevantToSubject(h2: string, subject: string): boolean {
  if (!subject || subject === 'Topic') return true

  const subjectWords = subject.toLowerCase().split(' ').filter(w => w.length > 3)
  const h2Lower = h2.toLowerCase()

  // Check if any significant subject word appears in H2
  return subjectWords.some(word => h2Lower.includes(word))
}
