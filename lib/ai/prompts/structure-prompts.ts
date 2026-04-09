/**
 * Structure Generation Prompts
 * 
 * Prompt templates for generating article structure elements:
 * H1, H2, FAQ questions, meta information.
 * 
 * Enhanced with SCAI production rules for character limits,
 * forbidden content, and format consistency.
 */

import {
  FORBIDDEN_PHRASES,
  CHARACTER_LIMITS,
  HEADER_CONSISTENCY_RULES,
} from '@/lib/ai/rules/forbidden-content'

// ═══════════════════════════════════════════════════════════════════════════════
// RULE BLOCKS FOR STRUCTURE PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build character limits block for structure prompts
 */
function getStructureCharacterLimitsBlock(): string {
  return `
CHARACTER LIMITS (STRICT - WILL FAIL VALIDATION IF EXCEEDED):
- H1: ${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} characters
- H2: ${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} characters
- Closing H2: ${CHARACTER_LIMITS.closingH2.min}-${CHARACTER_LIMITS.closingH2.max} characters
- Rating H2: max ${CHARACTER_LIMITS.ratingH2.max} characters
- FAQ H2: max ${CHARACTER_LIMITS.faqH2.max} characters
- FAQ H3 (questions): ${CHARACTER_LIMITS.faqH3.min}-${CHARACTER_LIMITS.faqH3.max} characters
- Meta title: ${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} characters
- Meta description: ${CHARACTER_LIMITS.metaDescription.min}-${CHARACTER_LIMITS.metaDescription.max} characters
- Featured image alt: ${CHARACTER_LIMITS.featuredImageAlt.min}-${CHARACTER_LIMITS.featuredImageAlt.max} characters
- H2 image alt: ${CHARACTER_LIMITS.h2ImageAlt.min}-${CHARACTER_LIMITS.h2ImageAlt.max} characters`
}

/**
 * Build forbidden phrases block for structure prompts
 */
function getStructureForbiddenPhrasesBlock(): string {
  return `
FORBIDDEN PHRASES IN HEADINGS:
- Closing H2 forbidden: ${FORBIDDEN_PHRASES.closingH2.slice(0, 10).join(', ')}...
- H2 general forbidden: ${FORBIDDEN_PHRASES.h2General.slice(0, 8).join(', ')}...
- H1 generic filler: ${FORBIDDEN_PHRASES.h1Generic.slice(0, 6).join(', ')}...`
}

/**
 * Build header consistency rules block
 */
function getStructureConsistencyBlock(): string {
  return `
FORMAT CONSISTENCY RULES (CRITICAL):
- ALL headings must follow SAME format (Question→Question, Statement→Statement, Listicle→Numbered)
- QUESTION: ${HEADER_CONSISTENCY_RULES.question.h1}
- STATEMENT: ${HEADER_CONSISTENCY_RULES.statement.h1}
- LISTICLE: ${HEADER_CONSISTENCY_RULES.listicle.h1}
- NO "and" or "or" in H2 titles (single focus only)
- NO colons in H2 titles
- Closing H2 in listicle format is NOT numbered (structural section)`
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

export const STRUCTURE_SYSTEM_PROMPT = `You are an expert SEO content strategist specializing in creating engaging, search-optimized article structures. Your outputs MUST follow these strict rules:

GRAMMAR & QUALITY FOR TITLES:
- Perfect spelling and grammar in all titles
- Proper capitalization (context-appropriate)
- No typos in keywords or topic terms
- Clear, grammatically correct phrasing
- Proofread all H1 and H2 titles

HEADING RULES:
- H1: MUST be ${CHARACTER_LIMITS.h1.min}-${CHARACTER_LIMITS.h1.max} characters (NOT shorter!), MUST include the primary keyword
- H2: MUST be ${CHARACTER_LIMITS.h2.min}-${CHARACTER_LIMITS.h2.max} characters each (NOT shorter!)
- NEVER use "and", "or", colons (:) in any heading
- Headings must be compelling and relevant
- CRITICAL: Count characters carefully - headings under ${CHARACTER_LIMITS.h2.min} chars will FAIL validation!
${getStructureCharacterLimitsBlock()}
${getStructureForbiddenPhrasesBlock()}

TITLE FORMAT RULES (CRITICAL):
- QUESTION format: H1/H2s must START with What, How, Why, Which, When, or Where and END with ?
- STATEMENT format: H1/H2s must be direct, declarative sentences with NO question marks
- LISTICLE format: H1/H2s must START with a number (1., 2., 3., etc.)
${getStructureConsistencyBlock()}

META RULES:
- Meta title: ${CHARACTER_LIMITS.metaTitle.min}-${CHARACTER_LIMITS.metaTitle.max} characters, include primary keyword
- Meta description: ${CHARACTER_LIMITS.metaDescription.min}-${CHARACTER_LIMITS.metaDescription.max} characters, include primary keyword, call-to-action

IMAGE ALT TEXT RULES (STRICT CHARACTER LIMITS - WILL FAIL VALIDATION IF EXCEEDED):
- Featured image alt: MUST be ${CHARACTER_LIMITS.featuredImageAlt.min}-${CHARACTER_LIMITS.featuredImageAlt.max} characters (count carefully!)
- H2 image alts: MUST be ${CHARACTER_LIMITS.h2ImageAlt.min}-${CHARACTER_LIMITS.h2ImageAlt.max} characters MAXIMUM (NEVER exceed ${CHARACTER_LIMITS.h2ImageAlt.max} characters!)
- DO NOT start with "Image of", "Picture of", or "Photo of"
- Be descriptive but concise - if over ${CHARACTER_LIMITS.h2ImageAlt.max} chars for H2 alts, shorten immediately

OUTPUT FORMAT:
Return ONLY valid JSON matching the requested schema. No markdown, no explanations.`

// ═══════════════════════════════════════════════════════════════════════════════
// H1 GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface H1PromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  tone?: string
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildH1Prompt(params: H1PromptParams): string {
  const { topic, primaryKeyword, articleType, tone = 'professional', titleFormat = 'statement' } = params

  // Article-type-specific tone guidance - OVERRIDES generic format templates
  const articleTypeGuidance: Record<string, { question: string; statement: string; listicle: string }> = {
    review: {
      question: `Review articles EVALUATE a product/service. H1 must frame the REVIEW scope.\n- "Is ${primaryKeyword} Worth Your Money?"\n- "How Good Is ${primaryKeyword} Really?"\n- "Does ${primaryKeyword} Live Up to the Hype?"`,
      statement: (() => {
        const templateGroups = [
          [`"${primaryKeyword} Review: Our Complete Verdict"`, `"${primaryKeyword} Review: Honest Impressions After Testing"`, `"${primaryKeyword} Review: What We Found After Real Use"`],
          [`"Our In-Depth ${primaryKeyword} Review"`, `"A Hands-On Look at ${primaryKeyword}"`, `"A Balanced Assessment of ${primaryKeyword}"`],
          [`"${primaryKeyword} Put to the Test in Real Conditions"`, `"${primaryKeyword} After Six Months of Daily Use"`, `"${primaryKeyword} Tested: The Unfiltered Verdict"`],
          [`"The Honest Truth About ${primaryKeyword}"`, `"${primaryKeyword} in ${new Date().getFullYear()}: Our Final Verdict"`, `"${primaryKeyword} Delivers More Than Expected"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Review articles EVALUATE a product/service. H1 must indicate REVIEW/EVALUATION.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n❌ BANNED: Gerund starters, "Understanding...", generic academic framing.`
      })(),
      listicle: `Review articles EVALUATE a product/service. Listicle reviews list REASONS/FEATURES/ASPECTS of the PRODUCT.\nInspiration (do NOT copy these, create your own original title):\n- "5 Reasons ${primaryKeyword} Is Worth Your Money"\n- "7 Things We Love About ${primaryKeyword}"\n- "10 Key Features That Make ${primaryKeyword} Stand Out"\n- ⚠️ NOT generic lists like "5 Wildest Moments" - focus on REVIEWING the product/service\n⚠️ CRITICAL: Create your OWN original title — do NOT copy the examples above.`
    },
    howto: {
      question: `How-to articles TEACH a process or skill. The H1 must pose a practical question the reader wants answered — how to do something, the best approach, or what's needed.\n\nInspiration (do NOT copy these, create your own):\n- "How Do You ${primaryKeyword} the Right Way?"\n- "What's the Best Way to ${primaryKeyword}?"\n- "What Does It Take to ${primaryKeyword} Successfully?"\n- "Can You ${primaryKeyword} Without Experience?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"How to ${primaryKeyword} Step by Step"`, `"How to ${primaryKeyword} the Right Way"`, `"How to ${primaryKeyword} Without the Guesswork"`],
          [`"How to ${primaryKeyword} Like a Pro"`, `"How to ${primaryKeyword} on Your First Try"`, `"How to ${primaryKeyword} Without Common Mistakes"`],
          [`"How to ${primaryKeyword} in Less Time"`, `"How to ${primaryKeyword} with Confidence"`, `"How to ${primaryKeyword} from Start to Finish"`],
          [`"How to Finally ${primaryKeyword} the Right Way"`, `"How to ${primaryKeyword} Even as a Beginner"`, `"How to ${primaryKeyword} Without Overthinking It"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `How-to articles TEACH a process or skill. The H1 MUST start with "How to" and convey confidence that the reader will succeed.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n⚠️ MUST start with "How to" — NEVER "Discover...", "Explore...", or "[Topic] Delivers..."\n❌ BANNED: Gerund starters, "Understanding...", any title that doesn't start with "How to".`
      })(),
      listicle: `How-to articles TEACH a process. Listicle how-tos list STEPS, METHODS, or TIPS.\nInspiration (do NOT copy these, create your own):\n- "N Steps to ${primaryKeyword} Successfully"\n- "N Easy Ways to ${primaryKeyword} Like a Pro"\n- "N Proven Methods for ${primaryKeyword}"\n- "N Tips That Make ${primaryKeyword} Simple"\n⚠️ Create your OWN original title.`
    },
    'how-to': {
      question: `How-to articles TEACH a process or skill. The H1 must pose a practical question the reader wants answered — how to do something, the best approach, or what's needed.\n\nInspiration (do NOT copy these, create your own):\n- "How Do You ${primaryKeyword} the Right Way?"\n- "What's the Best Way to ${primaryKeyword}?"\n- "What Does It Take to ${primaryKeyword} Successfully?"\n- "Can You ${primaryKeyword} Without Experience?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"How to ${primaryKeyword} Step by Step"`, `"How to ${primaryKeyword} the Right Way"`, `"How to ${primaryKeyword} Without the Guesswork"`],
          [`"How to ${primaryKeyword} Like a Pro"`, `"How to ${primaryKeyword} on Your First Try"`, `"How to ${primaryKeyword} Without Common Mistakes"`],
          [`"How to ${primaryKeyword} in Less Time"`, `"How to ${primaryKeyword} with Confidence"`, `"How to ${primaryKeyword} from Start to Finish"`],
          [`"How to Finally ${primaryKeyword} the Right Way"`, `"How to ${primaryKeyword} Even as a Beginner"`, `"How to ${primaryKeyword} Without Overthinking It"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `How-to articles TEACH a process or skill. The H1 MUST start with "How to" and convey confidence that the reader will succeed.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n⚠️ MUST start with "How to" — NEVER "Discover...", "Explore...", or "[Topic] Delivers..."\n❌ BANNED: Gerund starters, "Understanding...", any title that doesn't start with "How to".`
      })(),
      listicle: `How-to articles TEACH a process. Listicle how-tos list STEPS, METHODS, or TIPS.\nInspiration (do NOT copy these, create your own):\n- "N Steps to ${primaryKeyword} Successfully"\n- "N Easy Ways to ${primaryKeyword} Like a Pro"\n- "N Proven Methods for ${primaryKeyword}"\n- "N Tips That Make ${primaryKeyword} Simple"\n⚠️ Create your OWN original title.`
    },
    recipe: {
      question: `Recipe articles are about COOKING A SPECIFIC DISH. The H1 must name the dish and frame a cooking question the reader wants answered.\nThink about what makes someone search for this recipe: difficulty, technique, authenticity, or a specific result.\n\nInspiration (do NOT copy these, create your own):\n- "How Do You Make ${primaryKeyword} from Scratch?"\n- "What's the Secret to Perfectly Crispy ${primaryKeyword}?"\n- "Can You Really Make ${primaryKeyword} at Home?"\n- "Why Does Homemade ${primaryKeyword} Taste So Much Better?"\n⚠️ Create your OWN original title — match the cuisine style and cooking method.`,
      statement: (() => {
        const templateGroups = [
          [`"Easy ${primaryKeyword} Recipe for Any Night"`, `"Quick ${primaryKeyword} in Under 30 Minutes"`, `"Simple Weeknight ${primaryKeyword} Done Right"`],
          [`"Authentic ${primaryKeyword} Made at Home"`, `"Traditional ${primaryKeyword} the Old-Fashioned Way"`, `"Classic ${primaryKeyword} Just Like the Original"`],
          [`"Restaurant-Quality ${primaryKeyword} Made Simple"`, `"${primaryKeyword} That Rivals Your Favorite Spot"`, `"Chef-Level ${primaryKeyword} in Your Own Kitchen"`],
          [`"Foolproof ${primaryKeyword} for Every Cook"`, `"${primaryKeyword} That Never Fails"`, `"The Only ${primaryKeyword} Recipe You Need"`],
          [`"Crispy Homemade ${primaryKeyword} from Scratch"`, `"Tender ${primaryKeyword} with a Golden Crust"`, `"Creamy ${primaryKeyword} Packed with Flavor"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Recipe articles are about COOKING A SPECIFIC DISH. The H1 must name the dish and convey a cooking appeal — ease, speed, authenticity, or a sensory promise.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this structural pattern. Keep the same sentence skeleton — change descriptive words to match the cuisine and cooking style of "${primaryKeyword}".\n❌ BANNED: Gerund starters, "Understanding...", generic non-food framing. The title must sound like a recipe, not an essay.`
      })(),
      listicle: `Recipe articles list RECIPE VARIATIONS, METHODS, or COOKING TIPS.\nInspiration (do NOT copy these, create your own):\n- "N Ways to Cook ${primaryKeyword} Perfectly"\n- "N ${primaryKeyword} Variations You Need to Try"\n- "N Twists on Classic ${primaryKeyword}"\n- "N ${primaryKeyword} Recipes for Every Occasion"\n- "N Secrets to the Best ${primaryKeyword}"\n⚠️ Create your OWN original title.`
    },
    informational: {
      question: `Informational articles EDUCATE on a topic. H1 must pose an informative question.\nInspiration (do NOT copy these, create your own): "What Is ${primaryKeyword}?", "Why Does ${primaryKeyword} Matter?", "How Does ${primaryKeyword} Actually Work?", "What Makes ${primaryKeyword} So Important?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          // Pattern: "The [Adjective/Noun] of/about/behind [keyword] ..."
          [
            `"The Side of ${primaryKeyword} Most People Miss"`,
            `"The Real Story Behind ${primaryKeyword}"`,
            `"The Truth About ${primaryKeyword} Nobody Talks About"`,
            `"The Untold Story of ${primaryKeyword}"`,
            `"The Surprising History Behind ${primaryKeyword}"`,
            `"The Hidden Cost of Ignoring ${primaryKeyword}"`,
          ],
          // Pattern: "[keyword] [colon or verb phrase]"
          [
            `"${primaryKeyword}: Myths vs Reality"`,
            `"${primaryKeyword}: Separating Fact from Fiction"`,
            `"${primaryKeyword}: A Reality Check"`,
            `"${primaryKeyword} Explained in Simple Terms"`,
            `"${primaryKeyword} in ${new Date().getFullYear()}: The Full Picture"`,
          ],
          // Pattern: "Inside/Beyond/Behind [framing] [keyword]"
          [
            `"Inside ${primaryKeyword}: A Deep Dive"`,
            `"Beyond the Surface of ${primaryKeyword}"`,
            `"${primaryKeyword} Stripped Down to the Basics"`,
            `"${primaryKeyword} from Every Angle"`,
            `"The Rise of ${primaryKeyword} Explained"`,
          ],
          // Pattern: "A/An/Everything [framing] [keyword]"
          [
            `"Everything You Should Know About ${primaryKeyword}"`,
            `"A Complete Breakdown of ${primaryKeyword}"`,
            `"An Insider's Perspective on ${primaryKeyword}"`,
            `"A Beginner's Roadmap to ${primaryKeyword}"`,
            `"An Honest Look at ${primaryKeyword} in Practice"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Informational articles EDUCATE on a topic. The H1 should sound like a real article you'd click on — specific, clear, and natural.

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern for "${primaryKeyword}". You MUST keep the same sentence skeleton (same opening word pattern, same punctuation style). Change adjectives and descriptive words to be specific to the topic — but the STRUCTURE is non-negotiable.

      ❌ ABSOLUTELY BANNED (instant rejection):
      - Starting with a gerund verb (-ing word): "Understanding...", "Addressing...", "Exploring...", "Examining...", "Tracing...", "Discovering...", "Navigating...", "Unlocking..."
      - The formula "[Gerund] the [Noun] of [Keyword]"
      - Using "Understanding" ANYWHERE in the title
      - Ignoring the structural pattern above and inventing your own formula`
      })(),
      listicle: `Informational articles EDUCATE on a topic. Listicle info articles list FACTS/ASPECTS/POINTS.\nInspiration (do NOT copy these, create your own): "10 Surprising Facts About ${primaryKeyword}", "7 Key Aspects of ${primaryKeyword}", "N Things Most People Get Wrong About ${primaryKeyword}"\n⚠️ Create your OWN original title — do NOT default to "Fascinating Facts" every time.`
    },
    listicle: {
      question: `Listicle articles CURATE, RANK, or COUNT items. The H1 must pose a question that makes the reader want to see the list — implying there's a definitive answer worth reading.
Inspiration (do NOT copy these, create your own):
- "What Are the Best ${primaryKeyword} Options Right Now?"
- "Which ${primaryKeyword} Should You Actually Choose?"
- "How Many ${primaryKeyword} Have You Tried?"
- "What ${primaryKeyword} Do Experts Recommend?"
⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          // Pattern: N [keyword] [benefit/outcome]
          [`"7 ${primaryKeyword} Benefits That Actually Matter"`, `"5 ${primaryKeyword} Wins You Didn't Expect"`, `"8 ${primaryKeyword} Perks That Go Unnoticed"`],
          // Pattern: N [action/reason] [keyword]
          [`"5 Reasons to Try ${primaryKeyword} Today"`, `"7 Ways ${primaryKeyword} Changed the Game"`, `"6 Signs You Need ${primaryKeyword} in Your Life"`],
          // Pattern: N [keyword] [mistakes/myths/secrets]
          [`"9 ${primaryKeyword} Mistakes to Avoid"`, `"5 ${primaryKeyword} Myths You Still Believe"`, `"7 ${primaryKeyword} Secrets Nobody Shares"`],
          // Pattern: N [adjective] [keyword] [tips/picks/ideas]
          [`"8 Proven ${primaryKeyword} Tips for Beginners"`, `"5 Underrated ${primaryKeyword} Picks Worth Trying"`, `"10 Quick ${primaryKeyword} Ideas That Work"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Listicle articles CURATE, RANK, or COUNT items. The H1 must START with a DIGIT and promise a specific, scannable payoff.

🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):
${template}

Adapt this pattern. Keep the same sentence skeleton.
⚠️ Use DIGITS (7, 10, 5) NOT words (Seven, Ten, Five).
⚠️ Do NOT start with "Top N" or "The Best" — start directly with the digit.
❌ BANNED: Gerund starters, generic filler like "Amazing", "Incredible".`
      })(),
      listicle: `Listicle articles CURATE, RANK, or COUNT items. H1 MUST START with a DIGIT and frame a clear list promise.
Inspiration (do NOT copy these, create your own):
- "7 ${primaryKeyword} Benefits You Should Know"
- "10 ${primaryKeyword} Tips That Make a Difference"
- "5 ${primaryKeyword} Secrets Worth Knowing"
- "8 ${primaryKeyword} Picks for Every Budget"
- "6 ${primaryKeyword} Facts That Might Surprise You"
⚠️ Use DIGITS (7, 10, 5) NOT words (Seven, Ten, Five).
⚠️ Do NOT start with "Top N" — start directly with the digit.
⚠️ Create your OWN original title.`
    },
    affiliate: {
      question: `Affiliate articles COMPARE and RECOMMEND products. H1 must frame a buying decision.\nInspiration (do NOT copy these, create your own): "Which ${primaryKeyword} Should You Actually Buy?", "What's the Best ${primaryKeyword} for Your Budget?", "Which ${primaryKeyword} Gives You the Most Value?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"The Best ${primaryKeyword} for Every Budget"`, `"The Only ${primaryKeyword} Comparison You Need"`, `"Our Top ${primaryKeyword} Picks for ${new Date().getFullYear()}"`],
          [`"${primaryKeyword} Compared: Our Honest Picks"`, `"${primaryKeyword} Picks That Actually Deliver"`, `"${primaryKeyword} Tested: What's Actually Worth Buying"`],
          [`"We Tested the Most Popular ${primaryKeyword}"`, `"We Compared Every ${primaryKeyword} Worth Buying"`, `"We Reviewed ${primaryKeyword} So You Don't Have To"`],
          [`"Tried and Tested ${primaryKeyword} Worth Buying"`, `"Budget-Friendly ${primaryKeyword} That Actually Perform"`, `"Honest ${primaryKeyword} Picks After Real Testing"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Affiliate articles COMPARE and RECOMMEND products. The H1 must promise a helpful comparison.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n❌ BANNED: "Best X" as default every time, gerund starters, generic "Top-Rated" filler.`
      })(),
      listicle: `Affiliate articles COMPARE and RECOMMEND products. Listicle affiliates list PRODUCTS with a clear recommendation angle.\nInspiration (do NOT copy these, create your own): "7 ${primaryKeyword} Worth Your Money in [Year]", "5 ${primaryKeyword} We Actually Recommend", "10 ${primaryKeyword} Picks for Every Budget"\n⚠️ Do NOT always start with "Best" or "Top" — vary it.\n⚠️ Create your OWN original title.`
    },
    comparison: {
      question: `Comparison articles PIT OPTIONS AGAINST EACH OTHER. H1 must frame a head-to-head decision.\nInspiration (do NOT copy these, create your own): "Which Is Better, ${primaryKeyword} or [Alternative]?", "How Does ${primaryKeyword} Stack Up Against the Competition?", "${primaryKeyword} vs the Rest: Which One Wins?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"${primaryKeyword} vs [Alternative]: The Honest Breakdown"`, `"${primaryKeyword} vs the Competition: There's a Clear Winner"`, `"${primaryKeyword} vs [Alternative]: One Clear Winner"`],
          [`"The Real Difference Between ${primaryKeyword} Options"`, `"The Definitive Matchup Between ${primaryKeyword} Contenders"`, `"The Honest Truth About ${primaryKeyword} Versus the Alternatives"`],
          [`"We Compared ${primaryKeyword} Options So You Don't Have To"`, `"${primaryKeyword} Compared: There's a Clear Winner"`, `"${primaryKeyword} Compared Side by Side for ${new Date().getFullYear()}"`],
          [`"${primaryKeyword} Head to Head: A Fair Comparison"`, `"${primaryKeyword} Side by Side: The Definitive Verdict"`, `"${primaryKeyword} Showdown: Picking the Right One"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Comparison articles PIT OPTIONS AGAINST EACH OTHER. The H1 must signal a matchup, NOT an educational overview.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n❌ BANNED: Gerund starters, "Understanding...", "Exploring...", any title that works as an informational article.`
      })(),
      listicle: `Comparison articles PIT OPTIONS AGAINST EACH OTHER. Listicle comparisons list ALTERNATIVES.\nInspiration (do NOT copy these, create your own): "5 ${primaryKeyword} Alternatives Compared Side by Side", "7 ${primaryKeyword} Options and How They Stack Up", "3 ${primaryKeyword} Matchups You Need to See"\n⚠️ Create your OWN original title.`
    },
    local: {
      question: `Local articles help readers FIND and CHOOSE local services/venues. H1 must reflect LOCAL search intent.\nInspiration (do NOT copy these, create your own): "Where Can You Find the Best ${primaryKeyword} Near You?", "What Makes a Great Local ${primaryKeyword}?", "How Do You Pick the Right ${primaryKeyword} in Your Area?", "Is There a Good ${primaryKeyword} in Your Neighborhood?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"The Neighborhood ${primaryKeyword} That Actually Delivers"`, `"The Local ${primaryKeyword} Worth Going Out of Your Way For"`, `"The Best-Kept Secret ${primaryKeyword} in Your Area"`],
          [`"Everything to Know About a Local ${primaryKeyword}"`, `"The Traits That Set Great Local ${primaryKeyword} Apart"`, `"A Truly Standout ${primaryKeyword} Right in Your Neighborhood"`],
          [`"How to Spot a Top-Notch ${primaryKeyword} Nearby"`, `"Why the ${primaryKeyword} Down the Street Might Surprise You"`, `"How to Pick the Right ${primaryKeyword} in Your Area"`],
          [`"A Local's Take on Picking the Right ${primaryKeyword}"`, `"Your Guide to Choosing a ${primaryKeyword} Near You"`, `"Finding the Right ${primaryKeyword} in Your Neighborhood"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Local articles help readers FIND and CHOOSE local services/venues. The H1 must signal LOCAL relevance.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n❌ BANNED: Gerund starters ("Discovering...", "Exploring..."), Yellow Pages style, generic directory listings.`
      })(),
      listicle: `Local articles help readers FIND and CHOOSE local services/venues. Listicle locals list specific THINGS TO LOOK FOR.\nInspiration (do NOT copy these, create your own): "5 Signs of a Great Local ${primaryKeyword}", "7 Things to Look for in a ${primaryKeyword} Near You", "N Red Flags When Choosing a Local ${primaryKeyword}"\n⚠️ Create your OWN original title.`
    },
    commercial: {
      question: `Commercial articles SELL a product, service, or experience. H1 must hook the reader with a compelling buying question.\nInspiration (do NOT copy these, create your own): "Is ${primaryKeyword} Actually Worth It?", "Should You Spend Money on ${primaryKeyword}?", "What Do You Really Get with ${primaryKeyword}?"\n⚠️ Create your OWN original title.`,
      statement: (() => {
        const templateGroups = [
          [`"${primaryKeyword} for First-Time Buyers"`, `"${primaryKeyword} for Serious Buyers in ${new Date().getFullYear()}"`, `"${primaryKeyword} for Anyone Ready to Invest"`],
          [`"Everything You Actually Get with ${primaryKeyword}"`, `"The Real Reason ${primaryKeyword} Is Worth Your Money"`, `"Smart Buyers Already Know This About ${primaryKeyword}"`],
          [`"The No-BS Guide to Buying ${primaryKeyword}"`, `"A Smart Buyer's Take on ${primaryKeyword}"`, `"The Insider's Guide to Choosing ${primaryKeyword}"`],
          [`"${primaryKeyword} at This Price Point: Worth Every Penny"`, `"How to Get the Best Deal on ${primaryKeyword}"`, `"Your First ${primaryKeyword} Purchase Simplified"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Commercial articles SELL a product, service, or experience. The H1 must make the reader want to SPEND MONEY or TAKE ACTION.\n\n🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):\n${template}\n\nAdapt this pattern. Keep the same sentence skeleton.\n❌ BANNED: Gerund starters, "Understanding...", "Exploring...", educational/informational framing.`
      })(),
      listicle: `Commercial articles SELL a product, service, or experience. Listicle commercials give the reader specific REASONS to buy or specific THINGS they'll get.\nInspiration (do NOT copy these, create your own): "7 Reasons ${primaryKeyword} Is Worth the Hype", "5 Things You Get with ${primaryKeyword}", "10 Ways ${primaryKeyword} Pays for Itself"\n⚠️ Keep it specific and natural — NOT generic like "10 Amazing Benefits of..."\n⚠️ Create your OWN original title.`
    }
  }

  // Get article-specific guidance or fall back to informational
  const guidance = articleTypeGuidance[articleType] || articleTypeGuidance.informational
  const articleSpecificInstruction = guidance[titleFormat]

  // Generic format requirements (structural rules only)
  const formatRequirements = {
    question: `MUST be a QUESTION starting with What, How, Why, Which, When, or Where\nMUST end with ?`,
    statement: `MUST be a direct STATEMENT (declarative sentence)\nNO question marks allowed`,
    listicle: `MUST START with a number (e.g., "5", "7", "10")\nNO question marks allowed`
  }

  // Commercial and affiliate articles get their own adjective guidance; other types get the generic semantic check
  const semanticRelevanceBlock = articleType === 'commercial'
    ? `⚠️ COMMERCIAL ADJECTIVE GUIDANCE:
- Do NOT use generic adjectives like "Top-Rated", "Essential", "Innovative", "Fascinating".
- Use words that imply a BUYING DECISION: "worth it", "best deal", "must-have", "game-changing", "budget-friendly".
- Match the subject: an event title differs from a product title — write naturally for what "${primaryKeyword}" actually is.`
    : articleType === 'affiliate'
    ? `⚠️ AFFILIATE ADJECTIVE GUIDANCE:
- Do NOT repeat "Top" or "Top-Rated" — these are overused and make every article look the same.
- Vary your language: "Tested", "Compared", "Honest", "Hands-On", "Worth Buying", "Budget-Friendly", "Editor's Pick".
- The title should sound like a real product reviewer wrote it, not a template.`
    : articleType === 'recipe'
    ? `⚠️ RECIPE ADJECTIVE GUIDANCE:
- Use words that evoke TASTE, EASE, or COOKING APPEAL: "delicious", "mouth-watering", "authentic", "easy", "classic", "quick", "foolproof", "crispy", "creamy", "savory", "tender", "homemade".
- Match the cuisine/dish style: a comfort food title differs from a gourmet title — write naturally for what "${primaryKeyword}" actually is.
- ❌ AVOID generic non-food adjectives: "Essential", "Innovative", "Fascinating", "Shocking", "Critical", "Groundbreaking".
- ❌ AVOID vague filler: "Amazing", "Incredible", "Ultimate" — these say nothing about the food.`
    : `⚠️ SEMANTIC RELEVANCE CHECK (CRITICAL):
- Ensure adjectives match the TOPIC CATEGORY.
- For a Celebrity/Artist: Use "Shocking", "Surprising", "Unknown", "Incredible", "Fascinating", "Untold", "Little-Known". (❌ AVOID "Scientific", "Technical", "Nutritional", "Delicious")
- For a Product: Use "Essential", "Top-Rated", "Innovative", "Practical", "Reliable", "Must-Have". (❌ AVOID "Emotional", "Shocking", "Heartbreaking")
- For a Scientific/Tech Concept: Use "Critical", "Essential", "Complex", "Fundamental", "Groundbreaking".
- For a History Topic: Use "Unknown", "Dark", "Forgotten", "Pivotal", "Historic".
- For a Food/Recipe: Use "Delicious", "Mouth-Watering", "Authentic", "Easy", "Classic".`

  return `Generate an H1 title for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
ARTICLE TYPE: ${articleType.toUpperCase()}
TONE: ${tone}
FORMAT: ${titleFormat.toUpperCase()}

⚠️ ARTICLE TYPE GUIDANCE (CRITICAL - MUST MAINTAIN ${articleType.toUpperCase()} TONE):
${articleSpecificInstruction}

${semanticRelevanceBlock}

⚠️ VARIETY RULE:
- DO NOT always pick the first adjective from the examples above.
- Randomly select DIFFERENT adjectives or similar synonyms.
- Avoid using the same structure repeatedly.

FORMAT REQUIREMENTS:
${formatRequirements[titleFormat]}

OTHER REQUIREMENTS:
- MUST be 50-60 characters (count carefully - under 50 will FAIL!)
- MUST include "${primaryKeyword}" naturally
- NO "and", "or", colons
- Compelling and click-worthy

Return JSON: { "text": "Your H1 title here" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// H2 GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface H2PromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  h1: string
  h2Count: number
  existingH2s?: string[]
  sectionPurposes?: string[]
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildH2Prompt(params: H2PromptParams): string {
  const { topic, primaryKeyword, articleType, h1, h2Count, existingH2s = [], sectionPurposes = [], titleFormat = 'statement' } = params

  const purposeGuidance = sectionPurposes.length > 0
    ? `\nSECTION PURPOSES:\n${sectionPurposes.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
    : ''

  const existingGuidance = existingH2s.length > 0
    ? `\nAVOID DUPLICATING THESE H2s:\n${existingH2s.map(h => `- ${h}`).join('\n')}`
    : ''

  const formatInstructions = {
    question: `- EVERY H2 MUST be a QUESTION starting with What, How, Why, Which, When, or Where\n- EVERY H2 MUST end with ?\n- Example: "How Does ${primaryKeyword} Compare to Others?"`,
    statement: `- EVERY H2 MUST be a direct STATEMENT\n- NO question marks allowed\n- Example: "Key Benefits of ${primaryKeyword}"`,
    listicle: `- EVERY H2 MUST start with a number: "1. First Topic", "2. Second Topic", etc.\n- Numbers must be sequential from 1\n- NO question marks allowed\n- H2s WITHOUT numbers will FAIL validation\n- Each H2 must be a SPECIFIC item, not a generic section\n- ✅ "1. ${primaryKeyword} Burns Calories Faster Than Running"\n- ❌ "1. Understanding ${primaryKeyword} Fundamentals" (too generic)`
  }

  // Article-type-specific H2 guidance for listicle format
  // Check both titleFormat AND articleType — listicle articles need this even with statement/question variation
  let articleSpecificH2Guidance = ''
  if (titleFormat === 'listicle' || articleType === 'listicle') {
    const h2TypeGuidance: Record<string, string> = {
      review: `⚠️ REVIEW LISTICLE H2s (CRITICAL - MUST BE REVIEW-FOCUSED):
Each H2 must list a REASON/FEATURE/ASPECT being REVIEWED:
✅ GOOD examples:
- "1. Content Library Quality Analysis"
- "2. Value for Money Breakdown"
- "3. User Experience Assessment"
- "4. Performance and Reliability"
❌ BAD examples (NOT review-focused):
- "1. History of ${primaryKeyword}" - This is informational, not a review
- "1. How ${primaryKeyword} Works" - This is how-to, not a review
- "1. Wildest ${primaryKeyword} Moments" - This is entertainment, not a review
Focus on EVALUATING the product/service features.`,

      howto: `⚠️ HOW-TO LISTICLE H2s:
Each H2 must list a STEP or TIP:
- "1. Gather Your Materials"
- "2. Prepare the Workspace"
- "3. Execute the Main Process"
Focus on TEACHING the process.`,

      recipe: `⚠️ RECIPE LISTICLE H2s:
Each H2 must list a VARIATION, TIP, or STEP:
- "1. Classic ${primaryKeyword} Method"
- "2. Quick 30-Minute Version"
- "3. Gourmet Twist Variation"
Focus on COOKING guidance.`,

      informational: `⚠️ INFORMATIONAL LISTICLE H2s:
Each H2 must list a FACT, ASPECT, or POINT:
- "1. Historical Background"
- "2. Current Industry Impact"
- "3. Future Developments"
Focus on EDUCATING about the topic.`,

      affiliate: `⚠️ AFFILIATE LISTICLE H2s:
Each H2 must introduce a PRODUCT being compared:
- "1. [Product Name] - Best Overall"
- "2. [Product Name] - Budget Pick"
- "3. [Product Name] - Premium Choice"
Focus on COMPARING products.`,

      comparison: `⚠️ COMPARISON LISTICLE H2s:
Each H2 must compare a specific ASPECT between the options:
- "1. Performance Side by Side"
- "2. Price and Value Breakdown"
- "3. Build Quality Face-Off"
- "4. Which One Wins on Features"
Focus on HEAD-TO-HEAD comparisons, not general overviews.`,

      commercial: `⚠️ COMMERCIAL LISTICLE H2s — each H2 should give the reader a concrete reason to care or buy:
✅ GOOD examples (specific, natural):
- "1. It Saves You Time Where It Matters"
- "2. The Price Is Hard to Beat"
- "3. Built for People Who Actually Use It"
- "4. Customer Reviews Tell the Real Story"
❌ BAD examples:
- "1. History of ${primaryKeyword}" — informational, not commercial
- "1. Superior Performance Metrics" — sounds like a spec sheet, not a headline
Write H2s that a real buyer would scan and find useful.`
    }

    articleSpecificH2Guidance = h2TypeGuidance[articleType] || h2TypeGuidance.informational
  }

  return `Generate ${h2Count} H2 headings for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
ARTICLE TYPE: ${articleType.toUpperCase()}
H1 TITLE: ${h1}
FORMAT: ${titleFormat.toUpperCase()}
${purposeGuidance}
${existingGuidance}

${articleSpecificH2Guidance ? articleSpecificH2Guidance + '\n\n' : ''}FORMAT REQUIREMENTS (CRITICAL - MUST FOLLOW):
${formatInstructions[titleFormat]}
${articleType === 'listicle' && titleFormat !== 'listicle' ? `
⚠️ LISTICLE ARTICLE TYPE — NUMBERING IS MANDATORY:
- Every H2 MUST start with a number followed by a period: "1. ", "2. ", "3. ", etc.
- Numbers must be sequential from 1 to ${h2Count}
- H2s without numbers will FAIL validation
` : ''}

⚠️ KEYWORD DENSITY RULE (CRITICAL - 60-70%):
- You are generating ${h2Count} H2s
- EXACTLY ${Math.round(h2Count * 0.6)} to ${Math.round(h2Count * 0.7)} H2s should contain "${primaryKeyword}" or closely related terms
- The remaining ${h2Count - Math.round(h2Count * 0.7)} to ${h2Count - Math.round(h2Count * 0.6)} H2s should NOT contain the keyword
- DO NOT put the keyword in ALL H2s - this will fail validation
- Vary your headings to maintain natural flow

OTHER REQUIREMENTS:
- MUST be 50-60 characters each (under 50 will FAIL validation!)
- NO "and", "or", colons
- Match the capitalization style of H1
- Each H2 should cover a distinct subtopic
- Logical flow from first to last

Return JSON: { "h2s": ["H2 title 1", "H2 title 2", ...] }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FaqPromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  faqCount?: number
}

export function buildFaqPrompt(params: FaqPromptParams): string {
  const { topic, primaryKeyword, articleType, faqCount = 3 } = params

  return `Generate FAQ section for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}

REQUIREMENTS:
- FAQ H2 heading: Maximum 30 characters
- Generate ${faqCount} FAQ questions
- Each question: 30-60 characters, MUST end with "?"
- Questions should be what users actually search for
- Include "${primaryKeyword}" in at least one question

Return JSON: {
  "h2": "Short FAQ heading",
  "questions": ["Question 1?", "Question 2?", "Question 3?"]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSING H2 GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClosingPromptParams {
  topic: string
  h1: string
  articleType: string
  titleFormat?: 'question' | 'statement' | 'listicle'
}

export function buildClosingH2Prompt(params: ClosingPromptParams): string {
  const { topic, h1, articleType, titleFormat = 'statement' } = params

  // IMPORTANT: Closing H2 is NEVER numbered, even in listicle format (it's a conclusion)
  const formatInstructions = {
    question: `- MUST be a QUESTION starting with What, How, Why, Which, When, or Where\n- MUST end with ?\n- Example: "What Are the Final Takeaways?"`,
    statement: `- MUST be a direct STATEMENT\n- NO question marks allowed\n- Example: "Final Thoughts on ${topic}"`,
    listicle: `- MUST be a direct STATEMENT (NOT numbered - closing H2s are conclusions)\n- NO numbers, NO question marks\n- Example: "Final Verdict on ${topic}"`
  }

  return `Generate a closing section H2 heading.

TOPIC: ${topic}
H1 TITLE: ${h1}
ARTICLE TYPE: ${articleType}
FORMAT: ${titleFormat.toUpperCase()}

FORMAT REQUIREMENTS (CRITICAL):
${formatInstructions[titleFormat]}

IMPORTANT: Even for LISTICLE format, the closing H2 is NEVER numbered (it's a conclusion).

OTHER REQUIREMENTS:
- Maximum 50 characters
- NO "and", "or", colons
- Should signal article conclusion
- Match H1 capitalization style
- Compelling call-to-action feel

Return JSON: { "text": "Your closing H2 here" }`
}

// ═══════════════════════════════════════════════════════════════════════════════
// META INFORMATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetaPromptParams {
  topic: string
  primaryKeyword: string
  h1: string
  articleType: string
}

export function buildMetaPrompt(params: MetaPromptParams): string {
  const { topic, primaryKeyword, h1, articleType } = params

  return `Generate meta title and description for SEO.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
H1 TITLE: ${h1}
ARTICLE TYPE: ${articleType}

⚠️ CRITICAL CHARACTER LIMITS (VALIDATION WILL REJECT IF NOT MET):
- Meta title: MUST BE 50-60 characters (count every character including spaces!)
- Meta description: MUST BE 150-160 characters (NOT 140 - minimum is 150!)
- Too short = REJECTED. Too long = REJECTED.

CONTENT REQUIREMENTS:
- Include "${primaryKeyword}" naturally in both
- Meta description ends with call-to-action
- NO colons allowed in meta title
- Optimized for click-through rate

⚠️ META TITLE GRAMMAR (CRITICAL — VALIDATION WILL REJECT BAD GRAMMAR):
The meta title MUST be a grammatically correct phrase or sentence. Do NOT jam keywords together without proper grammar.
- ✅ "How to Grow Tomatoes Indoors All Year Round" (proper sentence)
- ✅ "Easy Homemade Taco Recipes for Busy Weeknights" (coherent noun phrase)
- ✅ "Best Wireless Headphones for Working Out in 2025" (natural phrasing)
- ❌ "How to Grow Tomatoes Indoors Year Round Tips" (two ideas jammed together — "year round" + "tips" without grammar)
- ❌ "Best Taco Recipes Easy Homemade Mexican Food Ideas" (keyword stuffing — separate phrases with no connecting grammar)
- ❌ "Wireless Headphones Guide Review Workout" (words thrown together)

The meta title should read like something a real editor would write — a single, coherent thought, NOT a pile of keywords.

EXAMPLE FORMAT (showing character count):
Title (54 chars): "Easy Homemade Taco Recipes for Busy Weeknights"
Description (155 chars): "Discover delicious taco recipes with step-by-step instructions. Learn how to make authentic Mexican tacos at home with our guide. Start cooking tonight!"

Return JSON: {
  "title": "Your 50-60 char meta title here",
  "description": "Your 150-160 char meta description here"
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE ALT TEXT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImageAltPromptParams {
  topic: string
  primaryKeyword: string
  h1: string
  h2s: string[]
  articleType?: string
}

export function buildImageAltPrompt(params: ImageAltPromptParams): string {
  const { topic, primaryKeyword, h1, h2s, articleType } = params

  // Special guidance for review articles to anchor images to the product
  const reviewGuidance = articleType === 'review' ? `

⚠️ REVIEW ARTICLE - PRODUCT ANCHORING REQUIRED:
This is a REVIEW article about "${topic}". Every H2 image alt MUST:
- Explicitly mention the product being reviewed (${topic})
- Describe the product in a visual context (the product itself, its features, being used, etc.)
- NEVER describe unrelated objects (guitars, random electronics, etc.)
- Examples for PS5: "PlayStation 5 console displaying 4K gaming on TV screen with DualSense controller nearby"
- Examples for iPhone: "iPhone 15 Pro camera module showing triple lens system and titanium frame"
` : ''

  return `Generate image alt text for article images.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
H1 TITLE: ${h1}
H2 TITLES:
${h2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}
${reviewGuidance}
⚠️ CRITICAL CHARACTER LIMITS (WILL FAIL SCHEMA VALIDATION IF NOT MET):

FEATURED IMAGE ALT:
- MUST be EXACTLY 100-125 characters (not 26, not 80 - COUNT CAREFULLY!)
- Example (115 chars): "A colorful spread of freshly made tacos with seasoned beef, fresh cilantro, diced onions, and lime wedges on a rustic wooden table"

H2 IMAGE ALTS:
- Each MUST be EXACTLY 80-100 characters (NEVER under 80, NEVER over 100!)
- Example (92 chars): "Close-up of taco filling ingredients including ground beef, tomatoes, and shredded cheese"

RULES:
- Include "${primaryKeyword}" in featured alt
- Do NOT start with "Image of", "Picture of", or "Photo of"
- Describe what the image shows specifically
- Be descriptive but stay within character limits

Return JSON: {
  "featured": "100-125 character alt text for featured image",
  "h2s": ["80-100 char alt 1", "80-100 char alt 2", ...]
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullStructurePromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  h2Count: number
  tone?: string
  titleFormat?: 'question' | 'statement' | 'listicle'
  /** For affiliate articles: cleaned product names with badges for product-aware H2 generation */
  affiliateProducts?: Array<{ name: string; badge: string }>
  /** Core keywords extracted from primaryKeyword for natural H2 integration */
  coreKeywords?: string[]
}

/**
 * Build affiliate-specific H2 instructions when real products are available
 */
function buildAffiliateH2Instructions(
  products: Array<{ name: string; badge: string }>,
  titleFormat: 'question' | 'statement' | 'listicle'
): string {
  if (!products || products.length === 0) return ''

  const productLines = products.map((p, i) => {
    return `  ${i + 1}. "${p.name}" (Badge: ${p.badge})`
  }).join('\n')

  const formatPatterns = {
    statement: `EXAMPLE H2 PATTERNS (these are GUIDELINES for inspiration, not rigid templates):
- "[Product] Is Our [Badge] Pick"
- "Our [Badge] Pick Goes to [Product]"
- "The [Product] Earned Its [Badge] Badge"
- "Meet the [Badge] Option, [Product]"
- "[Product] Stands Out for [Badge Quality]"
- "Our Verdict on the [Product]"
- "The [Product] Delivers on [Badge Quality]"
- "We Tested the [Product] and It Impressed Us"`,
    question: `EXAMPLE H2 PATTERNS (these are GUIDELINES for inspiration, not rigid templates):
- "Is the [Product] Worth It?"
- "Does the [Product] Live Up to the Hype?"
- "Can the [Product] Really Do It All?"
- "Should You Buy the [Product]?"
- "Is the [Product] Actually the [Badge]?"
- "What Makes the [Product] Stand Out?"
- "Would We Recommend the [Product]?"`,
    listicle: `EXAMPLE H2 PATTERNS (these are GUIDELINES for inspiration, not rigid templates):
- "N. [Product] for [Badge Quality]"
- "N. [Badge] Goes to [Product]"
- "N. [Product], the [Badge] Pick"
- "N. Why the [Product] Is Our [Badge] Pick"
- "N. [Product] Wins for [Badge Quality]"`,
  }

  return `
⚠️ AFFILIATE ARTICLE - PRODUCT-SPECIFIC H2s REQUIRED:
You MUST create H2s that reference these ACTUAL products (in order):
${productLines}

${formatPatterns[titleFormat]}

⚠️ Mix these patterns across products. Do NOT use the same H2 structure for every product. Create your own natural phrasing.
⚠️ Do NOT use colons (:), hyphens (-), em dashes (—), or pipes (|) as separators in H2s.

RULES FOR PRODUCT H2s:
- Each H2 must clearly reference the corresponding product name
- Keep H2s under 60 characters (truncate product name if needed)
- Maintain the badge context (Best Overall, Best Value, Premium Pick)
- Follow the title format (${titleFormat}) for each H2
- Product H2s can be 30-60 chars (shorter than standard H2s is OK)`
}

export function buildFullStructurePrompt(params: FullStructurePromptParams): string {
  const { topic, primaryKeyword, articleType, h2Count, tone = 'professional', titleFormat = 'statement', affiliateProducts, coreKeywords } = params

  // Determine which keywords to use for natural integration
  const hasExtractedKeywords = coreKeywords && coreKeywords.length > 0
  const keywordsToUse = hasExtractedKeywords ? coreKeywords : [primaryKeyword]
  const keywordList = keywordsToUse.join(', ')

  const formatInstructions = {
    question: `TITLE FORMAT: QUESTION
⚠️ CRITICAL FORMAT RULES - FAILURE TO FOLLOW WILL CAUSE ARTICLE TO FAIL VALIDATION:
- H1 MUST START with What, How, Why, Which, When, or Where
- H1 MUST END with ? (question mark is REQUIRED)
- ALL H2s MUST be questions ending with ?
- Closing H2 MUST also be a question ending with ?
- ZERO question marks = REJECTION
- Example H1: "What Are the Best ${topic} Options for 2024?"
- Example H2: "How Does ${topic} Compare to Alternatives?"`,
    statement: `TITLE FORMAT: STATEMENT
⚠️ CRITICAL FORMAT RULES - FAILURE TO FOLLOW WILL CAUSE ARTICLE TO FAIL VALIDATION:
- H1 MUST be a direct, declarative statement
- H1 must NOT contain any question marks (?)
- ALL H2s MUST be statements - NO QUESTION MARKS ALLOWED
- Closing H2 MUST also be a statement - NO QUESTION MARKS
- ANY question mark = REJECTION
- Example H1: "The Complete ${topic} Guide for Better Results"
- Example H2: "Key Benefits of Choosing ${topic}"`,
    listicle: `TITLE FORMAT: LISTICLE
⚠️ CRITICAL FORMAT RULES - FAILURE TO FOLLOW WILL CAUSE ARTICLE TO FAIL VALIDATION:
- H1 MUST START with a number (e.g., "5 Best...", "7 Ways...")
- H1 must NOT contain any question marks
- H2s MUST be numbered: "1. First Topic", "2. Second Topic", etc.
- NO question marks in ANY H2
- EXCEPTION: Closing H2 is NEVER numbered (it's a structural conclusion)
- Example H1: "7 Essential ${topic} Tips You Need to Know"
- Example H2: "1. Understanding ${topic} Fundamentals"`
  }

  // Build affiliate-specific instructions if products are provided
  const affiliateInstructions = articleType === 'affiliate' && affiliateProducts && affiliateProducts.length > 0
    ? buildAffiliateH2Instructions(affiliateProducts, titleFormat)
    : ''

  // For affiliate with products, skip the keyword density rule as H2s must match products
  const minDensity = hasExtractedKeywords ? 0.3 : 0.6
  const maxDensity = hasExtractedKeywords ? 0.6 : 0.7

  const keywordDensityRule = affiliateInstructions
    ? `
⚠️ AFFILIATE H2 KEYWORD RULE:
- H2s must reference the actual product names provided above
- Include natural keywords (${keywordList}) in H1 and at least 1-2 H2s where natural
- DO NOT force keyword into every H2 - product names take priority`
    : hasExtractedKeywords
      ? `
⚠️ H2 KEYWORD INTEGRATION (Natural Flow - CRITICAL):
- Topic context: "${primaryKeyword}"
- Core keywords to use: ${keywordList}
- Use ONE of these keywords naturally in ${Math.round(h2Count * minDensity)} to ${Math.round(h2Count * maxDensity)} H2s
- The rest should NOT force keywords (for natural, varied headings)
- NEVER force the full phrase "${primaryKeyword}" into H2s - use the core keywords instead
- Semantic variations are encouraged
- For component H2s (FAQ, Closing): Use keywords naturally, not the full phrase`
      : `
⚠️ H2 KEYWORD DENSITY RULE (CRITICAL - 60-70%):
- You are generating ${h2Count} H2s
- EXACTLY ${Math.round(h2Count * 0.6)} to ${Math.round(h2Count * 0.7)} H2s should contain "${primaryKeyword}" or closely related terms
- ${h2Count - Math.round(h2Count * 0.7)} to ${h2Count - Math.round(h2Count * 0.6)} H2s should NOT contain the keyword
- DO NOT put the keyword in ALL H2s - this will FAIL validation (100% keyword density is too high)
- Vary your headings for natural SEO`

  // FEATURED HERO IMAGE ALT GUIDANCE (applies to ALL article types)
  // The featured alt becomes the primary brief for image generation
  const featuredImageAltGuidance = `

⚠️ FEATURED IMAGE ALT - HERO IMAGE BRIEF (CRITICAL FOR ALL ARTICLE TYPES):
The featured image alt is THE MOST IMPORTANT image description because:
1. It becomes the PRIMARY BRIEF for generating the article's hero image
2. It's the first visual readers see and may be shared as OG/social images
3. It must work at multiple crop ratios (16:9, 1.91:1, 1:1)

FEATURED ALT REQUIREMENTS:
- Describe ONE clear primary subject (not multiple competing elements)
- The subject must be CENTER-WEIGHTED (works when cropped)
- Be concrete and visual (objects, products, scenes - not abstract concepts)
- Include the topic/product being discussed
- 100-125 characters EXACTLY

GOOD FEATURED ALT EXAMPLES:
✅ "PlayStation 5 console with DualSense controller on modern entertainment center with game displayed on TV" (108 chars)
✅ "Freshly baked chocolate chip cookies cooling on wire rack with golden edges and melted chocolate" (96 chars - needs padding)
✅ "MacBook Pro laptop open on minimalist desk showing code editor with natural window lighting" (92 chars - needs padding)

BAD FEATURED ALT EXAMPLES:
❌ "Gaming setup" (too short, too generic)
❌ "Various electronics and accessories scattered around" (no clear subject)
❌ "Abstract representation of performance and technology" (not visual/concrete)
❌ "Person holding a phone" (contains human)
`

  // Review-specific image alt guidance to anchor every image to the product
  const reviewImageAltGuidance = articleType === 'review' ? `

⚠️ REVIEW ARTICLE - IMAGE ALT PRODUCT ANCHORING (CRITICAL):
This is a REVIEW of "${topic}". Every H2 image alt MUST:
- Explicitly mention the EXACT product being reviewed (${topic})
- Describe the product visually (the product itself, its features, being used, etc.)
- NEVER describe unrelated objects (guitars, musical instruments, random electronics, etc.)
- The product MUST be the primary subject in EVERY image alt

Examples for PS5:
✅ "PlayStation 5 console displaying vibrant 4K game scene on modern TV with DualSense controller"
✅ "PS5 DualSense controller haptic feedback triggers being pressed during intense gameplay session"
❌ "Performance boost architecture with glowing circuits" (NO - missing actual product!)
❌ "Gaming setup with various electronics" (NO - too generic!)

Examples for iPhone 15:
✅ "iPhone 15 Pro titanium frame and camera module showcasing premium design on white surface"
✅ "iPhone 15 Pro Max camera capturing stunning low-light photo in dimly lit restaurant"
❌ "Professional photography equipment" (NO - missing actual product!)
` : ''

  return `Generate complete article structure for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}${hasExtractedKeywords ? `\nCORE KEYWORDS FOR NATURAL INTEGRATION: ${keywordList}` : ''}
NUMBER OF H2s: ${h2Count}
TONE: ${tone}

${formatInstructions[titleFormat]}
${affiliateInstructions}
${keywordDensityRule}
${featuredImageAltGuidance}
${reviewImageAltGuidance}

REQUIREMENTS:
- H1: 50-60 chars (MUST be at least 50!), MUST include "${primaryKeyword}"
- H2s: ${h2Count} headings, 50-60 chars each (MUST be at least 50!)${affiliateInstructions ? ' (product H2s can be 30-60 chars)' : ''}
- FAQ: H2 (25-30 chars) + EXACTLY 5 questions (30-60 chars each, end with ?)${hasExtractedKeywords ? ` - Use keywords naturally (e.g., "${keywordList}")` : ''}
- Closing: H2 (50-60 chars) - NEVER numbered even for listicle${hasExtractedKeywords ? ` - Use keywords naturally, not the full phrase` : ''}
- Meta title: 50-60 chars (MUST be at least 50 characters - count carefully!)
- Meta description: 150-160 chars (MUST be at least 150 - count carefully!)
- Featured image alt: 100-125 chars (MUST be within this range - short alts will fail validation!)
- H2 image alts: 80-100 chars each (CRITICAL: NEVER under 80 or over 100 characters! Count each alt text carefully.)
- NO "and", "or", colons in any heading (FAQ questions can have "?")
- Consistent capitalization throughout

Return JSON matching this structure:
{
  "h1": "string",
  "h2s": ["string", ...],
  "faq": { "h2": "string", "questions": ["string?", ...] },
  "closing": { "h2": "string" },
  "meta": { "title": "string", "description": "string" },
  "imageAlts": { "featured": "string", "h2s": ["string", ...] }
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE TYPE-SPECIFIC H2 PURPOSES
// ═══════════════════════════════════════════════════════════════════════════════

export const ARTICLE_TYPE_H2_PURPOSES: Record<string, string[]> = {
  affiliate: [
    'Best Overall Product (top recommendation)',
    'Best Value Product (budget-friendly)',
    'Premium Pick (high-end option)',
  ],
  commercial: [
    'Feature Highlights Section',
    'Benefits Overview',
    'Use Cases',
    'How It Works',
    'Pricing/Value',
  ],
  comparison: [
    'Topic 1 Overview',
    'Topic 2 Overview',
    'Key Differences Analysis',
    'Performance Comparison',
    'Price/Value Comparison',
  ],
  'how-to': [
    'Materials/Requirements',
    'Step 1: Preparation',
    'Step 2: Core Action',
    'Step 3: Follow-through',
    'Step 4: Verification',
    'Step 5: Final touches',
    'Pro Tips Section',
  ],
  informational: [
    'Introduction/Background',
    'Key Concept 1',
    'Key Concept 2',
    'Practical Applications',
    'Common Misconceptions',
    'Expert Insights',
  ],
  listicle: [
    'Item 1 (Top Pick)',
    'Item 2',
    'Item 3',
    'Item 4',
    'Item 5',
  ],
  local: [
    'Service Overview',
    'Why Choose This Provider',
    'Service Area Coverage',
    'Customer Experience',
  ],
  recipe: [
    'Ingredients Section',
    'Instructions Section',
    'Tips Section',
    'Nutrition Section',
    'Variations/Modifications',
  ],
  review: [
    'Features Section',
    'Pros & Cons Section',
    'In-depth Analysis 1',
    'In-depth Analysis 2',
    'In-depth Analysis 3',
    'Rating Section',
  ],
}

/**
 * Get H2 purposes for an article type
 */
export function getH2Purposes(articleType: string): string[] {
  return ARTICLE_TYPE_H2_PURPOSES[articleType] || ARTICLE_TYPE_H2_PURPOSES.informational
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE-AWARE H1 GENERATION (Phase 2 - Sequential Generation)
// ═══════════════════════════════════════════════════════════════════════════════

import type { ExtractedPromise } from '@/lib/ai/utils/h1-promise-extractor'
import { getPromiseFulfillmentInstructions } from '@/lib/ai/utils/promise-fulfillment-rules'

/**
 * Pick N random items from an array (Fisher-Yates partial shuffle)
 */
function pickRandom<T>(items: T[], count: number): T[] {
  const arr = [...items]
  const n = Math.min(count, arr.length)
  for (let i = arr.length - 1; i > arr.length - n - 1 && i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(-n)
}

/**
 * Creative directives that fundamentally change the model's angle for H1 generation.
 * One is randomly selected per call to force structural variety.
 */
const H1_CREATIVE_DIRECTIVES: Record<string, string[]> = {
  // Base directives that work across all article types
  base: [
    `🎯 CREATIVE ANGLE: Write this title as if revealing a commonly misunderstood truth. Frame it so the reader thinks "I had no idea!" Use framing like "actually", "really", "myth", "wrong about".`,
    `🎯 CREATIVE ANGLE: Write this title from a hidden-story angle — as if there's a fascinating backstory most people don't know about. Think investigative journalism, not a textbook chapter.`,
    `🎯 CREATIVE ANGLE: Write this title with a modern/time-sensitive relevance — connect the topic to right NOW. Use framing like "today", "modern", "still", "in ${new Date().getFullYear()}", "anymore".`,
    `🎯 CREATIVE ANGLE: Write this title as a definitive breakdown — the reader wants the FULL picture in one place. Use framing like "complete", "full", "everything", "breakdown", "guide".`,
    `🎯 CREATIVE ANGLE: Write this title that challenges a popular belief. Use a contrarian or myth-busting framing — "not what you think", "wrong about", "overrated", "underestimated", "myth".`,
    `🎯 CREATIVE ANGLE: Write this title as a plain-language explainer for someone unfamiliar. Think "explained", "simple terms", "plain English", "what it means", "how it works".`,
    `🎯 CREATIVE ANGLE: Write this title focusing on consequences and real-world impact — what does this topic DO to people, industries, or society? Think "impact", "effect", "cost", "damage", "change", "shapes".`,
    `🎯 CREATIVE ANGLE: Write this title from an insider perspective — as if someone with direct experience is sharing. Think "insider", "first-hand", "real talk", "honest look", "behind the scenes".`,
  ],
  // Extra directives for informational articles
  informational: [
    `🎯 CREATIVE ANGLE: Write this title highlighting what most people get WRONG about this topic. The reader should feel corrected. Think "wrong", "mistake", "misunderstood", "overlooked".`,
    `🎯 CREATIVE ANGLE: Write this title as a historical deep-dive — trace how this topic evolved over time. Think "rise", "history", "evolution", "origin", "how it started".`,
    `🎯 CREATIVE ANGLE: Write this title connecting this topic to a BIGGER issue — show why it matters beyond the obvious. Think "why it matters", "bigger picture", "what's at stake", "real reason".`,
  ],
  // Extra directives for affiliate articles
  affiliate: [
    `🎯 CREATIVE ANGLE: Write this title from a "we tested them all" reviewer angle. Think "tested", "compared", "hands-on", "honest picks", "real results".`,
    `🎯 CREATIVE ANGLE: Write this title focused on saving the reader money or time. Think "budget", "worth it", "save", "smart choice", "best value".`,
  ],
  // Extra directives for commercial articles
  commercial: [
    `🎯 CREATIVE ANGLE: Write this title making the reader feel like a SMART BUYER — insider knowledge that saves money or gets more value. Think "smart buy", "insider", "worth every penny", "what you actually get".`,
    `🎯 CREATIVE ANGLE: Write this title creating URGENCY or FOMO — the reader should feel they're missing out by not acting. Think "don't miss", "before it's gone", "right now", "this year", "finally available".`,
    `🎯 CREATIVE ANGLE: Write this title as a PROBLEM-SOLVER — the reader has a specific need and this product/service fixes it. Think "solves", "fixes", "no more", "finally", "the answer to".`,
  ],
  // Extra directives for how-to articles (key matches article type "how-to")
  'how-to': [
    `🎯 CREATIVE ANGLE: Write this title emphasizing EASE — make the reader feel confident they can do it. Think "easy", "step-by-step", "simple", "beginner", "quick".`,
    `🎯 CREATIVE ANGLE: Write this title promising a BETTER way than what people usually do. Think "better way", "right way", "pro tip", "without the hassle".`,
    `🎯 CREATIVE ANGLE: Write this title addressing a COMMON MISTAKE — the reader has been doing it wrong. Think "without the mistakes", "the right way", "stop doing it wrong", "what most people miss".`,
  ],
  // Keep legacy key for backwards compatibility
  howto: [
    `🎯 CREATIVE ANGLE: Write this title emphasizing EASE — make the reader feel confident they can do it. Think "easy", "step-by-step", "simple", "beginner", "quick".`,
    `🎯 CREATIVE ANGLE: Write this title promising a BETTER way than what people usually do. Think "better way", "right way", "pro tip", "without the hassle".`,
  ],
  // Extra directives for review articles
  review: [
    `🎯 CREATIVE ANGLE: Write this title as an honest verdict — the reader wants to know if it's worth it. Think "worth it", "honest", "verdict", "real experience", "after testing".`,
    `🎯 CREATIVE ANGLE: Write this title focused on pros vs cons — balanced evaluation. Think "pros", "cons", "good and bad", "what we found", "reality check".`,
  ],
  // Extra directives for comparison articles
  comparison: [
    `🎯 CREATIVE ANGLE: Write this title as a DEFINITIVE SHOWDOWN — one option is clearly better. Think "winner", "clear choice", "one stands out", "verdict", "which one wins".`,
    `🎯 CREATIVE ANGLE: Write this title from a REAL USER perspective — someone who tried both options. Think "after trying both", "side by side", "hands-on comparison", "real-world test".`,
    `🎯 CREATIVE ANGLE: Write this title highlighting the HIDDEN DIFFERENCE most people miss. Think "real difference", "what nobody tells you", "overlooked", "key factor".`,
  ],
  // Extra directives for listicle articles
  listicle: [
    `🎯 CREATIVE ANGLE: Write this title promising SURPRISES — the reader expects to learn something new from the list. Think "surprising", "you didn't know", "unexpected", "hidden", "overlooked".`,
    `🎯 CREATIVE ANGLE: Write this title with AUTHORITY — this is the definitive ranked list. Think "ranked", "best to worst", "definitive", "every single", "complete list".`,
    `🎯 CREATIVE ANGLE: Write this title promising ACTIONABLE VALUE — each list item gives the reader something useful. Think "tips", "tricks", "hacks", "ways to", "reasons to".`,
    `🎯 CREATIVE ANGLE: Write this title challenging COMMON ASSUMPTIONS — the list will change how the reader thinks. Think "myths", "mistakes", "wrong about", "overrated", "underrated".`,
  ],
  // Extra directives for local articles
  local: [
    `🎯 CREATIVE ANGLE: Write this title as a LOCAL INSIDER — the reader wants recommendations from someone who knows the area. Think "local's guide", "neighborhood", "near you", "in your area", "around the corner".`,
    `🎯 CREATIVE ANGLE: Write this title emphasizing TRUST and RELIABILITY — the reader wants a service they can depend on. Think "trusted", "reliable", "dependable", "you can count on", "proven".`,
    `🎯 CREATIVE ANGLE: Write this title highlighting CONVENIENCE — the reader wants something close, fast, and easy. Think "nearby", "quick", "convenient", "walking distance", "same-day".`,
  ],
  // Extra directives for recipe articles
  recipe: [
    `🎯 CREATIVE ANGLE: Write this title emphasizing EASE and SPEED — the reader wants confidence they can pull this off. Think "easy", "quick", "simple", "30-minute", "no-fuss", "weeknight", "beginner-friendly".`,
    `🎯 CREATIVE ANGLE: Write this title promising RESTAURANT QUALITY at home — the reader wants to impress. Think "restaurant-quality", "chef-level", "gourmet", "better than takeout", "pro-level".`,
    `🎯 CREATIVE ANGLE: Write this title highlighting AUTHENTICITY — the reader wants the real deal, not a shortcut version. Think "authentic", "traditional", "classic", "old-fashioned", "grandma's", "the real way".`,
    `🎯 CREATIVE ANGLE: Write this title from a PROBLEM-SOLVING angle — the reader has tried this dish before and failed. Think "foolproof", "never fails", "finally", "perfect every time", "no more mistakes".`,
  ],
}

/**
 * Get a randomly selected creative directive for H1 generation.
 * Combines base pool with article-type-specific directives.
 */
function getRandomCreativeDirective(articleType: string): string {
  const pool = [
    ...H1_CREATIVE_DIRECTIVES.base,
    ...(H1_CREATIVE_DIRECTIVES[articleType] || []),
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

export interface H1OnlyPromptParams {
  topic: string
  primaryKeyword: string
  articleType: string
  tone?: string
  titleFormat?: 'question' | 'statement' | 'listicle'
  h2Count?: number  // For listicle number alignment
  targetWordCount?: number  // Article word budget — calibrates H1 promise scope
  affiliateProducts?: Array<{ name: string; badge: string }>
  coreKeywords?: string[]  // Extracted keywords for natural phrasing
  previousH1s?: string[]  // Previously generated H1s to avoid (for bulk generation)
}

/**
 * Build prompt for standalone H1 generation
 * 
 * Key difference from buildH1Prompt:
 * - Includes h2Count for listicle alignment
 * - Explicitly tells AI to include the correct number in H1
 * - Also generates meta (title + description) in same call
 */
export function buildH1OnlyPrompt(params: H1OnlyPromptParams): string {
  const {
    topic,
    primaryKeyword,
    articleType,
    tone = 'professional',
    titleFormat = 'statement',
    h2Count,
    targetWordCount,
    affiliateProducts,
    coreKeywords,
    previousH1s,
  } = params

  // Get article-specific guidance (reuse from buildH1Prompt)
  const articleTypeGuidance = getArticleTypeH1Guidance(articleType, primaryKeyword, titleFormat, coreKeywords)

  // Listicle-specific number instruction
  const listicleNumberInstruction = titleFormat === 'listicle' && h2Count
    ? `
⚠️ CRITICAL LISTICLE NUMBER REQUIREMENT:
The H1 MUST include the number ${h2Count} at the START.
- ✅ "${h2Count} Best Ways to ${primaryKeyword}"
- ✅ "${h2Count} Amazing ${primaryKeyword} Tips"
- ❌ "Best Ways to ${primaryKeyword}" (missing number)
- ❌ "10 Ways to ${primaryKeyword}" (wrong number, should be ${h2Count})`
    : ''

  // Affiliate products context
  const affiliateContext = affiliateProducts && affiliateProducts.length > 0
    ? `\nAFFILIATE PRODUCTS (for context, H1 should reflect these will be reviewed):
${affiliateProducts.map(p => `- ${p.name} (${p.badge})`).join('\n')}`
    : ''

  const formatRequirements = {
    question: `MUST be a QUESTION starting with What, How, Why, Which, When, or Where\nMUST end with ?`,
    statement: `MUST be a direct STATEMENT (declarative sentence)\nNO question marks allowed`,
    listicle: `MUST START with a number (specifically: ${h2Count || 'a number'})\nNO question marks allowed`
  }

  // Keyword usage guidance
  const keywordGuidance = coreKeywords && coreKeywords.length > 0
    ? `
⚠️ KEYWORD USAGE (Use Natural Phrasing):
Core Keywords: ${coreKeywords.join(', ')}

Use these keywords NATURALLY - avoid forcing the full phrase "${primaryKeyword}" verbatim.

Example for topic "funny aspects of wwe" with keywords ["WWE", "funny"]:
- ✅ "What Makes WWE Comedy So Entertaining?"
- ✅ "Why Are WWE's Funny Moments So Popular?"
- ❌ "What Makes the Funny Aspects of WWE So Entertaining?" (awkward full phrase)`
    : `
⚠️ KEYWORD USAGE:
Include "${primaryKeyword}" naturally in the H1.`

  // Current year context (to avoid placeholders like "[Current Year]")
  const currentYear = new Date().getFullYear()
  const yearContext = `
⚠️ CURRENT DATE CONTEXT:
- The current year is ${currentYear}
- If your title needs a year reference, use "${currentYear}" NOT "[Current Year]" or other placeholders
- Examples: "in ${currentYear}", "for ${currentYear}", "${currentYear}'s Best"
- DO NOT use placeholders like [Year], [Current Year], or [YYYY]`

  // Article scope context — calibrates H1 promises to article size
  const scopeContext = targetWordCount && h2Count
    ? `
⚠️ ARTICLE SCOPE (calibrate your H1 promise to this):
- This article will have ${h2Count} main sections and ~${targetWordCount} total words
- Your H1 must set an expectation this article can realistically deliver on
${targetWordCount <= 1000 ? '- SHORT article — avoid broad promises like "Everything About", "Complete Guide", "All You Need to Know"\n- Focus on ONE specific angle, not comprehensive coverage' : targetWordCount <= 1500 ? '- MEDIUM article — focus the promise on a specific angle, not comprehensive coverage' : '- LONG article — broader promises are acceptable'}`
    : ''

  // Commercial and affiliate articles get their own adjective guidance; other types get the generic semantic check
  const semanticRelevanceBlock = articleType === 'commercial'
    ? `⚠️ COMMERCIAL ADJECTIVE GUIDANCE:
- Do NOT use generic adjectives like "Top-Rated", "Essential", "Innovative", "Fascinating".
- Use words that imply a BUYING DECISION: "worth it", "best deal", "must-have", "game-changing", "budget-friendly".
- Match the subject: an event title differs from a product title — write naturally for what "${primaryKeyword}" actually is.`
    : articleType === 'affiliate'
    ? `⚠️ AFFILIATE ADJECTIVE GUIDANCE:
- Do NOT repeat "Top" or "Top-Rated" — these are overused and make every article look the same.
- Vary your language: "Tested", "Compared", "Honest", "Hands-On", "Worth Buying", "Budget-Friendly", "Editor's Pick".
- The title should sound like a real product reviewer wrote it, not a template.`
    : articleType === 'recipe'
    ? `⚠️ RECIPE ADJECTIVE GUIDANCE:
- Use words that evoke TASTE, EASE, or COOKING APPEAL: "delicious", "mouth-watering", "authentic", "easy", "classic", "quick", "foolproof", "crispy", "creamy", "savory", "tender", "homemade".
- Match the cuisine/dish style: a comfort food title differs from a gourmet title — write naturally for what "${primaryKeyword}" actually is.
- ❌ AVOID generic non-food adjectives: "Essential", "Innovative", "Fascinating", "Shocking", "Critical", "Groundbreaking".
- ❌ AVOID vague filler: "Amazing", "Incredible", "Ultimate" — these say nothing about the food.`
    : `⚠️ SEMANTIC RELEVANCE CHECK (CRITICAL):
- Ensure adjectives match the TOPIC CATEGORY.
- For a Celebrity/Artist: Use "Shocking", "Surprising", "Unknown", "Incredible", "Fascinating", "Untold", "Little-Known". (❌ AVOID "Scientific", "Technical", "Nutritional", "Delicious")
- For a Product: Use "Essential", "Top-Rated", "Innovative", "Practical", "Reliable", "Must-Have". (❌ AVOID "Emotional", "Shocking", "Heartbreaking")
- For a Scientific/Tech Concept: Use "Critical", "Essential", "Complex", "Fundamental", "Groundbreaking".
- For a History Topic: Use "Unknown", "Dark", "Forgotten", "Pivotal", "Historic".
- For a Food/Recipe: Use "Delicious", "Mouth-Watering", "Authentic", "Easy", "Classic".`

  return `Generate an H1 title AND meta information for a ${articleType} article.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
ARTICLE TYPE: ${articleType.toUpperCase()}
TONE: ${tone}
FORMAT: ${titleFormat.toUpperCase()}
${affiliateContext}
${keywordGuidance}

⚠️ ARTICLE TYPE GUIDANCE (CRITICAL - MUST MAINTAIN ${articleType.toUpperCase()} TONE):
${articleTypeGuidance}
${listicleNumberInstruction}

${semanticRelevanceBlock}
${yearContext}
${scopeContext}

${getRandomCreativeDirective(articleType)}

FORMAT REQUIREMENTS:
${formatRequirements[titleFormat]}

H1 REQUIREMENTS:
- MUST be 50-60 characters (under 50 will FAIL validation!)
- NO "and", "or", colons

❌ BANNED H1 PATTERNS (these produce generic, template-like titles):
- "Discover..." / "Discovering..." — vague, sounds like a tourism brochure
- "Explore..." / "Exploring..." — filler word that says nothing specific
- "Navigate..." / "Navigating..." — corporate buzzword
- "Uncover..." / "Uncovering..." — cliché clickbait
- "Unlock..." / "Unlocking..." — buzzword template
- "Delve..." / "Delving..." — academic filler
- "Enhance..." / "Enhancing..." — vague, could apply to anything
- "Understanding..." / "Understanding the..." — overused LLM default, too academic
- "Unraveling..." / "Unraveling the..." — cliché filler
- "Examining..." / "Examining the..." — reads like a research paper
- ANY title that follows "[Gerund Verb] the [Abstract Noun] of [Keyword]" — this is the most overused AI title formula. REJECT IT COMPLETELY.
  Examples of this BANNED formula: "Understanding the Roots of X", "Exploring the Impact of X", "Examining the Nature of X"
- If your H1 matches any of these, REWRITE IT with a completely different sentence structure.
${previousH1s && previousH1s.length > 0 ? `
❌ PREVIOUSLY GENERATED H1s (DO NOT reuse or closely resemble ANY of these):
${previousH1s.map((h, i) => `${i + 1}. "${h}"`).join('\n')}
Your H1 MUST use a DIFFERENT opening word, DIFFERENT sentence structure, and DIFFERENT angle from ALL of the above.` : ''}

META REQUIREMENTS (generate in same response):
- Meta title: 50-60 characters, include "${primaryKeyword}"
- Meta description: 150-160 characters (NOT 140!), include "${primaryKeyword}", end with call-to-action
- NO colons allowed in meta title
- Meta title MUST be grammatically correct — a single coherent phrase, NOT keywords jammed together
  ✅ "How to Grow Tomatoes Indoors All Year Round" (proper sentence)
  ❌ "How to Grow Tomatoes Indoors Year Round Tips" (two ideas crammed together without grammar)

Return JSON: {
  "h1": "Your H1 title here",
  "meta": {
    "title": "Meta title for SEO (50-60 chars)",
    "description": "Meta description for SEO (150-160 chars)"
  }
}`
}

/**
 * Get article-type-specific H1 guidance
 */
function getArticleTypeH1Guidance(
  articleType: string,
  primaryKeyword: string,
  titleFormat: 'question' | 'statement' | 'listicle',
  coreKeywords?: string[]
): string {
  const guidance: Record<string, Record<string, string>> = {
    review: {
      question: `Review articles EVALUATE a product/service. H1 must frame the REVIEW scope.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "Is ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Worth Your Money?"
      - "Does ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Live Up to the Hype?"
      - "Should You Trust the Buzz Around ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "Is ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Really As Good As People Say?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [
            `"${kw} Review: Our Complete Verdict"`,
            `"${kw} Review: Honest Impressions After Testing"`,
            `"${kw} Review: What We Found After Real Use"`,
          ],
          [
            `"Our In-Depth ${kw} Review"`,
            `"A Hands-On Look at ${kw}"`,
            `"A Balanced Assessment of ${kw}"`,
          ],
          [
            `"${kw} Put to the Test in Real Conditions"`,
            `"${kw} After Six Months of Daily Use"`,
            `"${kw} Tested: The Unfiltered Verdict"`,
          ],
          [
            `"The Honest Truth About ${kw}"`,
            `"${kw} in ${new Date().getFullYear()}: Our Final Verdict"`,
            `"${kw} Delivers More Than Expected"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Review articles EVALUATE a product/service. H1 must indicate REVIEW/EVALUATION.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.

      ❌ BANNED: Gerund starters, "Understanding...", generic academic framing.`
      })(),
      listicle: `Review articles EVALUATE a product/service. Listicle reviews list REASONS/FEATURES/ASPECTS.

      Inspiration (do NOT copy these, create your own original title):
      - "N Reasons Why ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Is a Game Changer"
      - "N Things We Learned Testing ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Crucial Features of ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Reviewed"
      - "N Surprising Pros & Cons of ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Ways ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Stands Out"
      - "N Reasons to Buy (or Avoid) ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    howto: {
      question: `How-to articles TEACH a process. H1 must pose a LEARNING question that the article will answer step by step.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "How Do You ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} the Right Way?"
      - "What's the Best Way to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "Can You Really ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} on Your Own?"
      - "What's the Easiest Way to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [`"How to ${kw} Step by Step"`, `"How to ${kw} the Right Way"`, `"How to ${kw} Without the Guesswork"`],
          [`"How to ${kw} Like a Pro"`, `"How to ${kw} on Your First Try"`, `"How to ${kw} Without Common Mistakes"`],
          [`"How to ${kw} in Less Time"`, `"How to ${kw} with Confidence"`, `"How to ${kw} from Start to Finish"`],
          [`"How to Finally ${kw} the Right Way"`, `"How to ${kw} Even as a Beginner"`, `"How to ${kw} Without Overthinking It"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `How-to articles TEACH a process. H1 MUST start with "How to".${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.
      ⚠️ NEVER use titles like "Discover..." or "The Guide to..." - MUST start with "How to"
      ❌ BANNED: Gerund starters, "Understanding...", generic academic framing.`
      })(),
      listicle: `How-to articles TEACH a process. Listicle how-tos list STEPS or TIPS.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "N Simple Steps to Master ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Easy Ways to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Like a Pro"
      - "N Proven Tips for ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Expert Methods for ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Steps to Perfect ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    'how-to': {
      question: `How-to articles TEACH a process. H1 must pose a LEARNING question that the article will answer step by step.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "How Do You ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} the Right Way?"
      - "What's the Best Way to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "Can You Really ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} on Your Own?"
      - "What's the Easiest Way to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [`"How to ${kw} Step by Step"`, `"How to ${kw} the Right Way"`, `"How to ${kw} Without the Guesswork"`],
          [`"How to ${kw} Like a Pro"`, `"How to ${kw} on Your First Try"`, `"How to ${kw} Without Common Mistakes"`],
          [`"How to ${kw} in Less Time"`, `"How to ${kw} with Confidence"`, `"How to ${kw} from Start to Finish"`],
          [`"How to Finally ${kw} the Right Way"`, `"How to ${kw} Even as a Beginner"`, `"How to ${kw} Without Overthinking It"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `How-to articles TEACH a process. H1 MUST start with "How to".${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.
      ⚠️ NEVER use titles like "Discover..." or "The Guide to..." - MUST start with "How to"
      ❌ BANNED: Gerund starters, "Understanding...", generic academic framing.`
      })(),
      listicle: `How-to articles TEACH a process. Listicle how-tos list STEPS or TIPS.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "N Simple Steps to Master ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Easy Ways to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Like a Pro"
      - "N Proven Tips for ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Expert Methods for ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Steps to Perfect ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    recipe: {
      question: `Recipe articles are about COOKING A SPECIFIC DISH. The H1 must name the dish and frame a cooking question the reader wants answered.
Think about what makes someone search for this recipe: difficulty, technique, authenticity, or a specific result.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "How Do You Make ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} from Scratch?"
      - "What's the Secret to Perfectly Crispy ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "Can You Really Make ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} at Home?"
      - "Why Does Homemade ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Taste So Much Better?"

      CRITICAL: Generate your OWN original H1 — match the cuisine style and cooking method.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          // Pattern: Easy/Quick/Simple + dish
          [
            `"Easy ${kw} Recipe for Any Night"`,
            `"Quick ${kw} in Under 30 Minutes"`,
            `"Simple Weeknight ${kw} Done Right"`,
          ],
          // Pattern: Authenticity/tradition
          [
            `"Authentic ${kw} Made at Home"`,
            `"Traditional ${kw} the Old-Fashioned Way"`,
            `"Classic ${kw} Just Like the Original"`,
          ],
          // Pattern: Restaurant quality / chef level
          [
            `"Restaurant-Quality ${kw} Made Simple"`,
            `"${kw} That Rivals Your Favorite Spot"`,
            `"Chef-Level ${kw} in Your Own Kitchen"`,
          ],
          // Pattern: Foolproof / reliability
          [
            `"Foolproof ${kw} for Every Cook"`,
            `"${kw} That Never Fails"`,
            `"The Only ${kw} Recipe You Need"`,
          ],
          // Pattern: Sensory / texture-forward
          [
            `"Crispy Homemade ${kw} from Scratch"`,
            `"Tender ${kw} with a Golden Crust"`,
            `"Creamy ${kw} Packed with Flavor"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Recipe articles are about COOKING A SPECIFIC DISH. The H1 must name the dish and convey a cooking appeal — ease, speed, authenticity, or a sensory promise.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to match the cuisine and cooking style of "${primaryKeyword}".
      ❌ BANNED: Gerund starters, "Understanding...", generic non-food framing. The title must sound like a recipe, not an essay.`
      })(),
      listicle: `Recipe articles list RECIPE VARIATIONS, METHODS, or COOKING TIPS.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "N Ways to Cook ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Perfectly"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Variations You Need to Try"
      - "N Twists on Classic ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Recipes for Every Occasion"
      - "N Secrets to the Best ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    informational: {
      question: `Informational articles EDUCATE on a topic. H1 must pose an informative question.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "What Is ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "Why Does ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Matter?"
      - "What Makes ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} So Important?"
      - "How Does ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Actually Work?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        // Structural templates grouped by sentence pattern
        const templateGroups = [
          // Pattern: "The [Adjective/Noun] of/about/behind [keyword] ..."
          [
            `"The Side of ${kw} Most People Miss"`,
            `"The Real Story Behind ${kw}"`,
            `"The Truth About ${kw} Nobody Talks About"`,
            `"The Untold Story of ${kw}"`,
            `"The Surprising History Behind ${kw}"`,
            `"The Hidden Cost of Ignoring ${kw}"`,
          ],
          // Pattern: "[keyword] [colon or verb phrase]"
          [
            `"${kw}: Myths vs Reality"`,
            `"${kw}: Separating Fact from Fiction"`,
            `"${kw}: A Reality Check"`,
            `"${kw} Explained in Simple Terms"`,
            `"${kw} in ${new Date().getFullYear()}: The Full Picture"`,
          ],
          // Pattern: "Inside/Beyond/Behind [framing] [keyword]"
          [
            `"Inside ${kw}: A Deep Dive"`,
            `"Beyond the Surface of ${kw}"`,
            `"${kw} Stripped Down to the Basics"`,
            `"${kw} from Every Angle"`,
            `"The Rise of ${kw} Explained"`,
          ],
          // Pattern: "A/An/Everything [framing] [keyword]"
          [
            `"Everything You Should Know About ${kw}"`,
            `"A Complete Breakdown of ${kw}"`,
            `"An Insider's Perspective on ${kw}"`,
            `"A Beginner's Roadmap to ${kw}"`,
            `"An Honest Look at ${kw} in Practice"`,
          ],
        ]
        // Pick ONE template from ONE random group — forces the model to follow it exactly
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Informational articles EDUCATE on a topic. The H1 should sound like a real article you'd click on — specific, clear, and natural.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern for "${primaryKeyword}". You MUST keep the same sentence skeleton (same opening word pattern, same punctuation style). Change adjectives and descriptive words to be specific to the topic — but the STRUCTURE is non-negotiable.

      ❌ ABSOLUTELY BANNED (instant rejection):
      - Starting with a gerund verb (-ing word): "Understanding...", "Addressing...", "Exploring...", "Examining...", "Tracing...", "Discovering...", "Navigating...", "Unlocking..."
      - The formula "[Gerund] the [Noun] of [Keyword]"
      - Using "Understanding" ANYWHERE in the title
      - Ignoring the structural pattern above and inventing your own formula`
      })(),
      listicle: `Informational articles list FACTS/ASPECTS.

      Inspiration (do NOT copy these, create your own original title):
      - "N Surprising Facts About ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Key Things You Didn't Know About ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Mind-Blowing Details About ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Reasons Why ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Matters"
      - "N Hidden Secrets of ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Revealed"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Myths Debunked"
      - "N Ways ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Changed History"

      ⚠️ CREATIVITY RULE: Do NOT default to "Fascinating Facts" or "Interesting Facts" every time. Use a variety of adjectives like "Surprising", "Mind-Blowing", "Hidden", "Critical", "Unknown", "Incredible", "Shocking", "Important".
      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    affiliate: {
      question: `Affiliate articles COMPARE and RECOMMEND products. H1 must frame a buying decision.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "Which ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Should You Actually Buy?"
      - "What's the Best ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} for Your Budget?"
      - "Which ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Gives You the Most Value?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [
            `"The Best ${kw} for Every Budget"`,
            `"The Only ${kw} Comparison You Need"`,
            `"Our Top ${kw} Picks for ${new Date().getFullYear()}"`,
          ],
          [
            `"${kw} Compared: Our Honest Picks"`,
            `"${kw} Picks That Actually Deliver"`,
            `"${kw} Tested: What's Actually Worth Buying"`,
          ],
          [
            `"We Tested the Most Popular ${kw}"`,
            `"We Compared Every ${kw} Worth Buying"`,
            `"We Reviewed ${kw} So You Don't Have To"`,
          ],
          [
            `"Tried and Tested ${kw} Worth Buying"`,
            `"Budget-Friendly ${kw} That Actually Perform"`,
            `"Honest ${kw} Picks After Real Testing"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Affiliate articles COMPARE and RECOMMEND products. The H1 must promise a helpful comparison.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.

      ❌ BANNED: "Best X" as default every time, gerund starters, generic "Top-Rated" filler.`
      })(),
      listicle: `Affiliate articles COMPARE and RECOMMEND products. Listicle affiliates list PRODUCTS with a clear recommendation angle.

      Inspiration (do NOT copy these, create your own original title):
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Worth Your Money in [Year]"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} We Actually Recommend"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Picks for Every Budget"
      - "N ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} That Deliver Real Results"
      - "N Honest ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Picks After Testing"

      ⚠️ Do NOT always start with "Best" or "Top" — vary it with "Worth", "Tested", "Picks", "Recommended", "Honest".
      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    comparison: {
      question: `Comparison articles PIT OPTIONS AGAINST EACH OTHER. H1 must frame a head-to-head decision.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "Which Is Better, ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} or [Alternative]?"
      - "How Does ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Stack Up Against the Competition?"
      - "${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} vs the Rest: Which One Wins?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [
            `"${kw} vs [Alternative]: The Honest Breakdown"`,
            `"${kw} vs the Competition: There's a Clear Winner"`,
            `"${kw} vs [Alternative]: One Clear Winner"`,
          ],
          [
            `"The Real Difference Between ${kw} Options"`,
            `"The Definitive Matchup Between ${kw} Contenders"`,
            `"The Honest Truth About ${kw} Versus the Alternatives"`,
          ],
          [
            `"We Compared ${kw} Options So You Don't Have To"`,
            `"${kw} Compared: There's a Clear Winner"`,
            `"${kw} Compared Side by Side for ${new Date().getFullYear()}"`,
          ],
          [
            `"${kw} Head to Head: A Fair Comparison"`,
            `"${kw} Side by Side: The Definitive Verdict"`,
            `"${kw} Showdown: Picking the Right One"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Comparison articles PIT OPTIONS AGAINST EACH OTHER. The H1 must signal a matchup, NOT an educational overview.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.

      ❌ BANNED: Gerund starters, "Understanding...", "Exploring...", any title that works as an informational article.`
      })(),
      listicle: `Comparison articles PIT OPTIONS AGAINST EACH OTHER. Listicle comparisons list ALTERNATIVES.

      Inspiration (do NOT copy these, create your own original title):
      - "5 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Alternatives Compared Side by Side"
      - "7 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Options and How They Stack Up"
      - "3 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Matchups You Need to See"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    local: {
      question: `Local articles help readers FIND and CHOOSE local services/venues. H1 must reflect LOCAL search intent.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "Where Can You Find the Best ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Near You?"
      - "What Makes a Great Local ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "How Do You Pick the Right ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} in Your Area?"
      - "Is There a Reliable ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} in Your Neighborhood?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above. Vary the structure each time.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [
            `"The Neighborhood ${kw} That Actually Delivers"`,
            `"The Local ${kw} Worth Going Out of Your Way For"`,
            `"The Best-Kept Secret ${kw} in Your Area"`,
          ],
          [
            `"Everything to Know About a Local ${kw}"`,
            `"The Traits That Set Great Local ${kw} Apart"`,
            `"A Truly Standout ${kw} Right in Your Neighborhood"`,
          ],
          [
            `"How to Spot a Top-Notch ${kw} Nearby"`,
            `"Why the ${kw} Down the Street Might Surprise You"`,
            `"How to Pick the Right ${kw} in Your Area"`,
          ],
          [
            `"A Local's Take on Picking the Right ${kw}"`,
            `"Your Guide to Choosing a ${kw} Near You"`,
            `"Finding the Right ${kw} in Your Neighborhood"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Local articles help readers FIND and CHOOSE local services/venues. The H1 must signal LOCAL relevance.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.

      ❌ BANNED: Gerund starters ("Discovering...", "Exploring..."), Yellow Pages style ("Discover Quality X Services"), generic directory listings.`
      })(),
      listicle: `Local articles help readers FIND and CHOOSE local services/venues. Listicle locals list specific THINGS TO LOOK FOR.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "5 Signs of a Great Local ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "7 Things to Look for in a ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Near You"
      - "10 Reasons to Visit a ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} in Your Area"
      - "N Red Flags When Choosing a ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Nearby"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    commercial: {
      question: `Commercial articles SELL a product, service, or experience. H1 must hook the reader with a compelling buying question.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "Is ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Actually Worth It?"
      - "Should You Spend Money on ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"
      - "What Do You Really Get with ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [
            `"${kw} for First-Time Buyers"`,
            `"${kw} for Serious Buyers in ${new Date().getFullYear()}"`,
            `"${kw} for Anyone Ready to Invest"`,
          ],
          [
            `"Everything You Actually Get with ${kw}"`,
            `"The Real Reason ${kw} Is Worth Your Money"`,
            `"Smart Buyers Already Know This About ${kw}"`,
          ],
          [
            `"The No-BS Guide to Buying ${kw}"`,
            `"A Smart Buyer's Take on ${kw}"`,
            `"The Insider's Guide to Choosing ${kw}"`,
          ],
          [
            `"${kw} at This Price Point: Worth Every Penny"`,
            `"How to Get the Best Deal on ${kw}"`,
            `"Your First ${kw} Purchase Simplified"`,
          ],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Commercial articles SELL a product, service, or experience. The H1 must make the reader want to SPEND MONEY or TAKE ACTION.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt the words to fit "${primaryKeyword}"):
      ${template}

      Adapt this structural pattern. Keep the same sentence skeleton — change descriptive words to fit the topic.

      ❌ BANNED: Gerund starters, "Understanding...", "Exploring...", educational/informational framing. If it sounds like a textbook title, REJECT IT.`
      })(),
      listicle: `Commercial articles SELL a product, service, or experience. Listicle commercials give the reader specific REASONS to buy or specific THINGS they'll get.

      Inspiration (do NOT copy these, create your own original title):
      - "N Reasons ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Is Worth the Hype"
      - "N Things You Get with ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Ways ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Pays for Itself"
      - "N Things to Know Before Buying ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"
      - "N Reasons People Keep Coming Back to ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword}"

      ⚠️ Keep it specific and natural — NOT generic like "N Amazing Benefits of..."
      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
    listicle: {
      question: `Listicle articles CURATE, RANK, or COUNT items. The H1 must pose a question that makes the reader want to see the list.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "What Are the Best ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Options Right Now?"
      - "Which ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Should You Actually Choose?"
      - "How Many ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Have You Tried?"
      - "What ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Do Experts Recommend?"

      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`,
      statement: (() => {
        const kw = coreKeywords ? coreKeywords.join(' ') : primaryKeyword
        const templateGroups = [
          [`"7 ${kw} Benefits That Actually Matter"`, `"5 ${kw} Wins You Didn't Expect"`, `"8 ${kw} Perks That Go Unnoticed"`],
          [`"5 Reasons to Try ${kw} Today"`, `"7 Ways ${kw} Changed the Game"`, `"6 Signs You Need ${kw} in Your Life"`],
          [`"9 ${kw} Mistakes to Avoid"`, `"5 ${kw} Myths You Still Believe"`, `"7 ${kw} Secrets Nobody Shares"`],
          [`"8 Proven ${kw} Tips for Beginners"`, `"5 Underrated ${kw} Picks Worth Trying"`, `"10 Quick ${kw} Ideas That Work"`],
        ]
        const selectedGroup = pickRandom(templateGroups, 1)[0]
        const template = pickRandom(selectedGroup, 1)[0]
        return `Listicle articles CURATE, RANK, or COUNT items. The H1 must START with a DIGIT and promise a specific, scannable payoff.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      🔒 YOUR H1 MUST follow this EXACT sentence structure (adapt words to fit "${primaryKeyword}"):
      ${template}

      Adapt this pattern. Keep the same sentence skeleton.
      ⚠️ Use DIGITS (7, 10, 5) NOT words (Seven, Ten, Five).
      ⚠️ Do NOT start with "Top N" or "The Best" — start directly with the digit.
      ❌ BANNED: Gerund starters, generic filler like "Amazing", "Incredible".`
      })(),
      listicle: `Listicle articles CURATE, RANK, or COUNT items. H1 MUST START with a DIGIT and frame a clear list promise.${coreKeywords ? `\nUse natural keywords: ${coreKeywords.join(', ')}` : ''}

      Inspiration (do NOT copy these, create your own original title):
      - "7 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Benefits You Should Know"
      - "10 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Tips That Make a Difference"
      - "5 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Secrets Worth Knowing"
      - "8 ${coreKeywords ? coreKeywords.join(' ') : primaryKeyword} Picks for Every Budget"

      ⚠️ Use DIGITS (7, 10, 5) NOT words (Seven, Ten, Five).
      ⚠️ Do NOT start with "Top N" — start directly with the digit.
      CRITICAL: Generate your OWN original H1 — do NOT reuse the examples above.`
    },
  }

  const typeGuidance = guidance[articleType] || guidance.informational
  return typeGuidance[titleFormat] || typeGuidance.statement
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMISE-AWARE H2 GENERATION (Phase 2 - Sequential Generation)
// ═══════════════════════════════════════════════════════════════════════════════

export interface H2FromH1PromptParams {
  normalizedH1: string
  h1Promise: ExtractedPromise
  topic: string
  primaryKeyword: string
  articleType: string
  variation: 'statement' | 'question' | 'listicle'
  h2Count: number
  previousH2s?: string[]  // For re-generation with feedback
  previousIssues?: string[]  // Validation issues from previous attempt
  affiliateProducts?: Array<{ name: string; badge: string }>
  /** Core keywords extracted from primaryKeyword for natural H2 integration */
  coreKeywords?: string[]
}

/**
 * Build prompt for H2 generation based on H1 promise
 * 
 * This is the core of promise fulfillment - the prompt explicitly:
 * 1. References the H1 and its promise
 * 2. Tells AI exactly what H2s must contain
 * 3. Provides examples and anti-patterns
 * 4. Includes feedback from previous attempts (if any)
 * 5. Uses core keywords (not full phrase) for natural integration
 */
export function buildH2FromH1Prompt(params: H2FromH1PromptParams): string {
  const {
    normalizedH1,
    h1Promise,
    topic,
    primaryKeyword,
    articleType,
    variation,
    h2Count,
    previousH2s,
    previousIssues,
    affiliateProducts,
    coreKeywords,
  } = params

  // Get promise fulfillment instructions (the core logic)
  const promiseInstructions = getPromiseFulfillmentInstructions(
    h1Promise,
    articleType as any,
    variation,
    h2Count
  )

  // Build re-prompting feedback section (if this is a retry)
  const feedbackSection = previousH2s && previousIssues && previousIssues.length > 0
    ? `
═══════════════════════════════════════════════════════════════════════════════
⚠️ PREVIOUS ATTEMPT FAILED VALIDATION - GENERATE NEW H2s
═══════════════════════════════════════════════════════════════════════════════

Your previous H2s:
${previousH2s.map((h2, i) => `${i + 1}. "${h2}"`).join('\n')}

ISSUES FOUND (YOU MUST FIX THESE):
${previousIssues.map(issue => `❌ ${issue}`).join('\n')}

Generate COMPLETELY NEW H2s that fix all issues above.
`
    : ''

  // Affiliate products - use the strong existing function for product-specific H2 instructions
  const affiliateSection = articleType === 'affiliate' && affiliateProducts && affiliateProducts.length > 0
    ? buildAffiliateH2Instructions(affiliateProducts, variation)
    : ''

  // Format requirements
  const formatRequirements = {
    question: `- EVERY H2 MUST be a QUESTION starting with What, How, Why, Which, When, or Where\n- EVERY H2 MUST end with ?`,
    statement: `- EVERY H2 MUST be a direct STATEMENT\n- NO question marks allowed`,
    listicle: `⚠️ LISTICLE NUMBERING IS MANDATORY (NON-NEGOTIABLE):
- Every H2 MUST start with a number followed by a period: "1. ", "2. ", "3. ", etc.
- Numbers must be sequential from 1 to ${h2Count}
- NO question marks allowed
- H2s without numbers will FAIL validation and the article will be REJECTED

⚠️ LISTICLE H2 CONTENT RULES:
- Each numbered H2 must be a SPECIFIC item, tip, fact, or recommendation
- Do NOT write generic section headers like "Historical Background of X" or "Real World Applications of X"
- Do NOT use filler like "Exploring the Future of X" or "Understanding the Basics of X"
- ✅ GOOD: "1. Jump Rope Burns More Calories Than Running"
- ✅ GOOD: "3. The Double Under Takes Your Workout to the Next Level"
- ❌ BAD: "1. Understanding Jump Rope Fundamentals" (generic, academic)
- ❌ BAD: "4. Historical Background of Jump Rope" (not a list item)`
  }

  // Build keyword guidance based on whether we have extracted core keywords
  const hasExtractedKeywords = coreKeywords && coreKeywords.length > 0
  const keywordsToUse = hasExtractedKeywords ? coreKeywords : [primaryKeyword]
  const keywordList = keywordsToUse.join(', ')

  // Smarter keyword density: lower for extracted keywords (more natural)
  const minDensity = hasExtractedKeywords ? 0.3 : 0.5
  const maxDensity = hasExtractedKeywords ? 0.6 : 0.7

  const keywordDensity = hasExtractedKeywords
    ? `
KEYWORD INTEGRATION (Natural Flow - CRITICAL):
- Topic context: "${primaryKeyword}"
- Core keywords to use: ${keywordList}
- Use ONE of these keywords naturally in ${Math.round(h2Count * minDensity)} to ${Math.round(h2Count * maxDensity)} H2s
- The rest should NOT force keywords (for natural, varied headings)
- NEVER force the full phrase "${primaryKeyword}" into H2s - use the core keywords instead
- Semantic variations are encouraged (e.g., "hilarious" instead of "funny", "wrestling" for "WWE")
- If a keyword doesn't fit naturally, DON'T force it - readability is more important
`
    : `
KEYWORD DENSITY (40-60% rule):
- ${Math.round(h2Count * minDensity)} to ${Math.round(h2Count * maxDensity)} H2s should contain "${primaryKeyword}"
- The rest should NOT contain the keyword (for natural flow)
`

  return `Generate ${h2Count} H2 headings that fulfill the H1 promise.

TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}${hasExtractedKeywords ? `\nCORE KEYWORDS: ${keywordList}` : ''}
ARTICLE TYPE: ${articleType.toUpperCase()}
VARIATION: ${variation.toUpperCase()}

${promiseInstructions}
${feedbackSection}
${affiliateSection}

FORMAT REQUIREMENTS:
${formatRequirements[variation]}
${articleType === 'listicle' && variation !== 'listicle' ? `
⚠️ LISTICLE ARTICLE TYPE — NUMBERING IS MANDATORY:
- Every H2 MUST start with a number followed by a period: "1. ", "2. ", "3. ", etc.
- Numbers must be sequential from 1 to ${h2Count}
- H2s without numbers will FAIL validation and the article will be REJECTED
- Each numbered H2 must be a SPECIFIC item, tip, fact, or recommendation
- Do NOT write generic section headers like "Historical Background of X"
- ✅ GOOD: "1. Jump Rope Burns More Calories Than Running"
- ❌ BAD: "Understanding Jump Rope Fundamentals" (no number, generic)
` : ''}
${keywordDensity}

OTHER REQUIREMENTS:
- You MUST return EXACTLY ${h2Count} separate H2 strings in the array (not more, not less)
- Each H2 is a SEPARATE array element — NEVER combine multiple H2s into one string
- MUST be 50-60 characters per H2 (under 50 will FAIL!)
- CRITICAL: Generate your OWN original H2s. Any examples shown above are for style/tone guidance only — do NOT copy them verbatim.
- Each H2 covers a DISTINCT subtopic
- Logical flow from first to last
- Also generate a CLOSING H2 (non-numbered conclusion)
- Use proper title case capitalization (capitalize "${primaryKeyword}" properly)
${articleType === 'local' ? `
LOCAL ARTICLE H2 GUIDELINES:
- H2s should reflect LOCAL search intent (finding, choosing, evaluating local ${topic})
- Use local-intent words: "nearby", "local", "in your area", "neighborhood"
- Focus on practical local topics: what to look for, how to choose, what to expect
- Each H2 should cover a DIFFERENT angle — not just rephrase the same "how to choose" idea

✅ GOOD H2 EXAMPLES (varied angles — do NOT copy these, create your own):
- "Red Flags at a Neighborhood ${topic}"
- "Questions to Ask Before Your First Visit"
- "How Regulars Pick Their Go-To ${topic}"
- "What Pricing Really Tells You About Quality"
- "The Walk-In Test Every Pet Owner Should Try"

❌ BANNED H2 PATTERNS FOR LOCAL ARTICLES:
- "Benefits of [Verb]ing..." — generic filler (e.g., "Benefits of Regular Visits...")
- "Tips for [Verb]ing..." — lazy structure (e.g., "Tips for Evaluating...")
- "What to Consider When [Verb]ing..." — formulaic
- "Importance of..." — academic, not actionable
- "How to Choose..." / "Guide to Choosing..." — overused, say something specific instead
- Any H2 that could apply to ANY local business (too generic) — make it specific to ${topic}
` : ''}
⚠️ BANNED WORDS IN H2s (WILL FAIL VALIDATION):
- The word "and" is BANNED — do NOT use "and" anywhere in any H2
- The word "or" is BANNED — do NOT use "or" anywhere in any H2
- The word "Essential" is BANNED — do NOT use "Essential" anywhere in any H2 (overused, generic)
- Colons (:) are BANNED — do NOT use colons in any H2
- ❌ BAD: "Coordination and Balance" — contains "and"
- ❌ BAD: "Essential Ingredients for..." — contains "Essential"
- ✅ GOOD: "Improved Coordination Through Practice" — no banned words
- ✅ GOOD: "Key Ingredients for Perfect Results" — no banned words

❌ BANNED H2 STARTING PATTERNS (produce formulaic, template-like headings):
- "Benefits of..." — lazy structure, say something specific instead
- "Tips for..." — overused, rephrase as a specific claim or insight
- "Importance of..." — academic tone, not engaging
- "Advantages of..." — corporate/textbook language
- "Understanding..." / "Exploring..." / "Discovering..." / "Navigating..." — filler verbs
- "The Role of..." — academic, vague
- If your H2 starts with any of these, REWRITE IT with a specific angle or claim.

CLOSING H2 REQUIREMENTS:
- NOT numbered (even for listicle)
- Signals article conclusion
- MUST be 50-60 characters (under 50 will FAIL!)
${variation === 'question' ? '- MUST be a QUESTION ending with ? (matching the question format of all other H2s)' : '- MUST be a STATEMENT (no question marks)'}
- ❌ BANNED: "Exploring...", "Discovering...", "Navigating...", "Understanding...", "Enhancing..."
- ❌ BANNED: Do NOT switch terminology in the closing (if article is about "${topic}", don't suddenly call it something else)
- MUST connect back to the H1's specific angle: "${normalizedH1}"
- The closing H2 should feel like a natural endpoint for what the H1 promised
- Do NOT introduce a new topic, angle, or terminology in the closing H2
${variation === 'question' ? `- ✅ GOOD: "How Can You Start Your ${topic} Journey Today?"` : `- ✅ GOOD: "Making the Most of Your ${topic} Journey"`}
${variation !== 'question' ? `- ✅ GOOD: "The Bottom Line on ${topic} for Beginners"` : `- ✅ GOOD: "What Should Your Next Step With ${topic} Be?"`}

⚠️ CRITICAL: Return EXACTLY ${h2Count} SEPARATE strings in the h2s array.
Return JSON: {
  "h2s": ["H2 1", "H2 2", ..., "H2 ${h2Count}"],
  "closingH2": "Your closing H2 here"
}`
}
