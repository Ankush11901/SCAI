/**
 * Structure Generator
 * Phase 1: Generates and validates the article skeleton (H1, H2s, FAQ questions)
 * This is a focused, sequential call with ONLY structure rules
 * 
 * Enhanced with:
 * - generateAffiliateStructure: Product-aware structure for affiliate articles
 *   (TOC built from actual product names, not generic H2s)
 */

import { STRUCTURE_FLOWS } from '@/data/structure-flows'
import { getComponentsForArticleType } from '@/data/components'
import { calculateWordBudget } from './word-budget-calculator'
import type { ArticleStructure, TitleVariation, H2Definition, TocItem } from '@/lib/types/generation'
import type { AmazonProduct } from './amazon-product-api'
import type { ProductInferenceResult } from './product-inference'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// ═══════════════════════════════════════════════════════════════════════════════
// AI-POWERED H2 GENERATION FOR AFFILIATE PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate proper H2 headings for affiliate products using AI
 * Per documentation:
 * - H2 max 60 characters
 * - H2 must follow H1 variation type (question/statement/listicle)
 * - H2 is generated from Product Card data (contains product name)
 * 
 * @param products Amazon products with titles
 * @param variation H1 variation type to match
 * @param topic User's search topic
 * @returns Array of proper H2 titles (max 60 chars each)
 */
async function generateProductH2sWithAI(
    products: Array<{ title: string; badge?: string }>,
    variation: TitleVariation,
    topic: string
): Promise<string[]> {
    const badges = products.map((p, i) =>
        p.badge || (i === 0 ? 'Best Overall' : i === 1 ? 'Best Value' : 'Premium Pick')
    )

    const variationRules = {
        question: 'Each H2 MUST be a question ending with "?" (e.g., "Is This Cat Tower Worth Your Money?")',
        statement: 'Each H2 MUST be a statement, NO question marks (e.g., "Top-Rated Cat Tower for Indoor Cats")',
        listicle: 'Each H2 MUST start with a number (e.g., "1. Best Cat Tower for Small Spaces")'
    }

    const prompt = `Generate ${products.length} H2 headings for an affiliate article about "${topic}".

PRODUCT DATA:
${products.map((p, i) => `${i + 1}. Product: "${p.title}" | Badge: "${badges[i]}"`).join('\n')}

CRITICAL H2 RULES:
1. EXACTLY 60 characters or less per H2 (this is mandatory)
2. ${variationRules[variation]}
3. Each H2 should reference the product's key feature or brand name
4. H2s must be unique and descriptive
5. Include the badge context naturally when appropriate
6. NO generic text like "Top cats of 2026" - be specific to the product

Return ONLY a JSON array of ${products.length} H2 strings:
["H2 for product 1", "H2 for product 2", "H2 for product 3"]

Generate now:`

    try {
        await structureQueue.waitForSlot()
        const response = await callGemini(prompt)
        const jsonMatch = response.match(/\[([\s\S]*?)\]/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (Array.isArray(parsed) && parsed.length === products.length) {
                // Validate and enforce 60 char limit
                return parsed.map((h2: string) =>
                    h2.length > 60 ? h2.substring(0, 57) + '...' : h2
                )
            }
        }
    } catch (error) {
        console.error('[Structure] Failed to generate H2s with AI:', error)
    }

    // Fallback: Generate simple H2s if AI fails
    return products.map((p, i) => {
        const badge = badges[i]
        const shortName = p.title.substring(0, 40)
        switch (variation) {
            case 'question':
                return `Is ${shortName} Worth It?`.substring(0, 60)
            case 'listicle':
                return `${i + 1}. ${shortName}`.substring(0, 60)
            default:
                return `${shortName} Review`.substring(0, 60)
        }
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST QUEUE & RATE LIMITING (shared pattern)
// ═══════════════════════════════════════════════════════════════════════════════

class StructureRequestQueue {
    private lastRequestTime: number = 0
    private readonly minDelayMs: number = 300 // Minimum 300ms between requests

    async waitForSlot(): Promise<void> {
        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime
        if (timeSinceLastRequest < this.minDelayMs) {
            await new Promise(resolve => setTimeout(resolve, this.minDelayMs - timeSinceLastRequest))
        }
        this.lastRequestTime = Date.now()
    }
}

const structureQueue = new StructureRequestQueue()

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildStructurePrompt(
    topic: string,
    articleType: string,
    variation: TitleVariation,
    h2Count: number
): string {
    const formatType = variation === 'question' ? 'QUESTION' : variation === 'listicle' ? 'LISTICLE (numbered)' : 'STATEMENT'

    // ═══════════════════════════════════════════════════════════════════════════
    // ARTICLE-TYPE SPECIFIC RULES
    // ═══════════════════════════════════════════════════════════════════════════
    let articleTypeRules = ''
    let h1Examples = ''
    let h2Examples = ''

    switch (articleType) {
        case 'comparison':
            // Per docs: Topic H2s introduce each option, then Analysis H2s compare aspects
            articleTypeRules = `
COMPARISON ARTICLE RULES (from documentation):
This is a COMPARISON article - you MUST compare 2-3 specific options/alternatives related to "${topic}".

FIRST: Identify 2-3 specific things to compare within the topic "${topic}".
Example: If topic is "cats", compare "Indoor Cats vs Outdoor Cats" or "Persian Cats vs Siamese Cats"

H1 MUST indicate comparison:
- Question: "Which Is Better for You: [Option A] or [Option B]?", "How Does [A] Compare to [B]?"
- Statement: "[Option A] vs [Option B]: The Complete Comparison"
- Listicle: "3 Best [Options] for ${topic} Compared"
- MUST contain "vs", "versus", "compare", "comparison", or "which is better"

H2 STRUCTURE (EXACT ORDER from documentation):
FIRST 2-3 H2s - Topic H2s (one per option being compared):
  - Question variant: "What Is [Option A]?", "What Is [Option B]?"
  - Statement variant: "[Option A] Overview", "[Option B] Overview"
  - Listicle variant: "1. [Option A]", "2. [Option B]"

REMAINING H2s - Analysis H2s (compare specific aspects):
  - Question variant: "How Do They Compare on Price?", "Which Has Better Features?"
  - Statement variant: "Price Comparison", "Feature Analysis", "Performance Breakdown"
`
            h1Examples = variation === 'question'
                ? `"Which Is Better: Indoor Cats or Outdoor Cats?", "How Does [A] Compare to [B] for ${topic}?"`
                : variation === 'listicle'
                    ? `"3 Best ${topic} Options Compared", "5 Top ${topic} Alternatives Reviewed"`
                    : `"Indoor Cats vs Outdoor Cats: Complete Comparison", "[Option A] vs [Option B] for ${topic}"`
            h2Examples = variation === 'question'
                ? `["What Is [Option A]?", "What Is [Option B]?", "How Do They Compare on Price?", "Which Offers Better Value?", "What Are the Key Differences?"]`
                : variation === 'listicle'
                    ? `["1. [Option A]", "2. [Option B]", "3. Price Comparison", "4. Feature Analysis", "5. Final Verdict"]`
                    : `["[Option A] Overview", "[Option B] Overview", "Price Comparison", "Feature Analysis", "Final Verdict"]`
            break

        case 'how-to':
            // Per docs: Materials/Requirements H2 first, then Step H2s
            articleTypeRules = `
HOW-TO ARTICLE RULES (from documentation):
This is a HOW-TO article - showing step-by-step how to accomplish "${topic}".

H1 MUST indicate instruction/tutorial:
- Question: "How Do You [Action] for ${topic}?", "How Can You [Achieve Goal]?"
- Statement: "Step-by-Step Guide to ${topic}", "How to [Action] for ${topic}"
- Listicle: "5 Steps to Master ${topic}", "7 Easy Steps for ${topic}"

H2 STRUCTURE (EXACT ORDER from documentation):
FIRST H2 - Materials/Requirements H2:
  - Question variant: "What Do You Need to Get Started?"
  - Statement variant: "Required Materials and Tools"
  - Listicle variant: "Materials You'll Need"

REMAINING H2s - Step H2s (5-10 steps):
  - Question variant: "How Do You [Step Action]?"
  - Statement variant: "Step 1: [Action]", "Step 2: [Action]"
  - Listicle variant: "1. [Action]", "2. [Action]"
`
            h2Examples = variation === 'question'
                ? `["What Do You Need to Get Started?", "How Do You Prepare for ${topic}?", "How Do You Complete the First Step?", "What Comes After That?", "How Do You Finish Successfully?"]`
                : variation === 'listicle'
                    ? `["Materials You'll Need", "1. Prepare Your Workspace", "2. Gather Your Tools", "3. Start the Process", "4. Complete the Final Steps"]`
                    : `["Required Materials and Tools", "Step 1: Preparation", "Step 2: Main Process", "Step 3: Finishing Touches", "Step 4: Final Review"]`
            break

        case 'listicle':
            // Per docs: H1 starts with odd number, H2s are numbered items
            articleTypeRules = `
LISTICLE ARTICLE RULES (from documentation):
This is a LISTICLE article - H2s must be NUMBERED LIST ITEMS about "${topic}".

H1 MUST start with an ODD number (5, 7, 9, 11, 13, 15, 17, 19, 21, 23):
- "7 Best Ways to ${topic}", "5 Essential Tips for ${topic}", "9 Things You Need to Know About ${topic}"

H2s MUST be numbered items:
- Each H2 is a list item: "1. [Item Name]", "2. [Item Name]", etc.
- Numbers must be sequential (1, 2, 3, 4, 5...)
- The count MUST match the number in the H1
`
            h2Examples = `["1. First ${topic} Item", "2. Second ${topic} Item", "3. Third ${topic} Item", "4. Fourth ${topic} Item", "5. Fifth ${topic} Item"]`
            break

        case 'review':
            // Per docs: Features H2, Pros & Cons H2, then loop H2s, then Rating H2
            articleTypeRules = `
REVIEW ARTICLE RULES (from documentation):
This is a REVIEW article - evaluating/reviewing "${topic}".

H1 MUST indicate review/evaluation:
- Question: "Is ${topic} Worth It?", "Should You Buy ${topic}?"
- Statement: "${topic} Review: Honest Assessment", "Complete ${topic} Review"
- Listicle: "5 Reasons ${topic} Is Worth It"

H2 STRUCTURE (EXACT ORDER from documentation):
1. Features H2:
  - Question variant: "What Are the Key Features?"
  - Statement variant: "Key Features Overview"
  - Listicle variant: "Top Features of ${topic}"

2. Pros & Cons H2:
  - Question variant: "What Are the Pros and Cons?"
  - Statement variant: "Pros & Cons Analysis"
  - Listicle variant: "Advantages & Disadvantages"

3-4. Analysis H2s (loop): Performance, value, design, user experience sections

5. Rating H2 (generated separately, 30 chars):
  - Question variant: "What Is the Rating?"
  - Statement variant: "Overall Rating"
  - Listicle variant: "Rating Score"
`
            h2Examples = variation === 'question'
                ? `["What Are the Key Features?", "What Are the Pros and Cons?", "How Does It Perform?", "Is It Worth the Price?"]`
                : variation === 'listicle'
                    ? `["Top Features of ${topic}", "Advantages & Disadvantages", "Performance Analysis", "Value Assessment"]`
                    : `["Key Features Overview", "Pros & Cons Analysis", "Performance Review", "Value for Money"]`
            break

        case 'affiliate':
            // Per docs: Product cards drive H2s (generated from product name)
            articleTypeRules = `
AFFILIATE ARTICLE RULES (from documentation):
This is an AFFILIATE/PRODUCT article - recommending products for "${topic}".

H1 MUST indicate product recommendations:
- Question: "What Are the Best ${topic} Products?", "Which ${topic} Should You Buy?"
- Statement: "Best ${topic} Products Reviewed", "Top ${topic} Picks"
- Listicle: "5 Best ${topic} Products", "7 Top-Rated ${topic} Options"

NOTE: For affiliate articles, H2s are GENERATED FROM PRODUCT CARD DATA.
Each product card creates its own H2 (product name converted to heading format).
Generate 0-2 generic H2s for intro/conclusion sections only.
`
            h2Examples = variation === 'question'
                ? `["Why Do You Need a ${topic}?", "How Do You Choose the Right One?"]`
                : `["Why ${topic} Matters", "Choosing the Right Product"]`
            break

        case 'informational':
            // Per docs: Key Takeaways Box after overview, then H2 + Standard Paragraph loop, optional Quick Facts
            articleTypeRules = `
INFORMATIONAL ARTICLE RULES (from documentation):
This is an INFORMATIONAL article - educating readers about "${topic}".

H1 should be informative:
- Question: "What Is ${topic}?", "How Does ${topic} Work?"
- Statement: "Understanding ${topic}", "Everything About ${topic}"
- Listicle: "5 Things to Know About ${topic}"

H2 STRUCTURE (from documentation):
H2s should cover educational aspects:
- What it is / Definition
- How it works / Process
- Benefits / Advantages
- Types / Categories / Variations
- Common questions / Misconceptions
- Best practices / Tips

NOTE: Key Takeaways Box appears after Overview (generated separately).
Optional Quick Facts H2 (40-50 chars) can be added:
  - Question: "Did You Know These ${topic} Facts?"
  - Statement: "Fascinating Facts About ${topic}"
`
            h2Examples = variation === 'question'
                ? `["What Exactly Is ${topic}?", "How Does ${topic} Work?", "What Are the Benefits of ${topic}?", "What Types of ${topic} Exist?", "What Should You Know About ${topic}?"]`
                : `["Understanding ${topic} Basics", "How ${topic} Works", "Key Benefits of ${topic}", "Different Types of ${topic}", "Best Practices for ${topic}"]`
            break

        case 'recipe':
            // Per docs: Fixed H2s for Ingredients, Instructions, Tips, Nutrition (generated separately), then loop H2s
            articleTypeRules = `
RECIPE ARTICLE RULES (from documentation):
This is a RECIPE article for "${topic}".

H1 should indicate a recipe:
- Question: "How Do You Make ${topic}?", "What Is the Best ${topic} Recipe?"
- Statement: "Perfect ${topic} Recipe", "Homemade ${topic}"
- Listicle: "5 Steps to Perfect ${topic}"

H2 STRUCTURE (EXACT ORDER from documentation):
These H2s are generated separately by the content generator:
1. Ingredients H2:
  - Question: "What Ingredients Do You Need?"
  - Statement: "Required Ingredients"
  - Listicle: "Ingredients for ${topic}"

2. Instructions H2:
  - Question: "How Do You Make This?"
  - Statement: "Step-by-Step Instructions"
  - Listicle: "Instructions to Follow"

3. Tips H2:
  - Question: "What Tips Should You Know?"
  - Statement: "Essential Cooking Tips"
  - Listicle: "Tips for Perfect Results"

4. Nutrition Facts H2:
  - Question: "What Are the Nutritional Facts?"
  - Statement: "Nutritional Information"
  - Listicle: "Nutrition Facts Breakdown"

Generate 1-2 additional H2s for variations, serving suggestions, or storage tips.
`
            h2Examples = variation === 'question'
                ? `["What Variations Can You Try?", "How Do You Store Leftovers?"]`
                : `["Recipe Variations to Try", "Storage and Serving Tips"]`
            break

        case 'local':
            // Per docs: H2 + Standard Paragraph loop, optional Why Choose Local section with image+list layout
            articleTypeRules = `
LOCAL ARTICLE RULES (from documentation):
This is a LOCAL/SERVICE AREA article about "${topic}" in a specific location.
NOTE: Keyword should include both SERVICE and LOCATION (e.g., "plumber Los Angeles")

H1 should include location context:
- Question: "Where Can You Find the Best ${topic}?", "How Do You Choose Local ${topic}?"
- Statement: "Best ${topic} Services in [Area]", "Local ${topic} Guide"
- Listicle: "5 Best ${topic} Providers in [Area]"

H2 STRUCTURE (from documentation):
H2s should cover local service aspects:
- Service options available
- How to choose a provider
- Local tips and considerations
- Area-specific information
- Cost expectations in the area

Optional Why Choose Local H2 (40-50 chars, generated separately):
  - Question: "Why Choose a Local [Service] Provider?"
  - Statement: "Why Choose a Local Provider"
  - Listicle: "Reasons to Choose Local"
`
            h2Examples = variation === 'question'
                ? `["What ${topic} Services Are Available?", "How Do You Choose the Right Provider?", "What Should You Expect to Pay?", "What Do Local Experts Recommend?"]`
                : `["Available ${topic} Services", "Choosing the Right Provider", "Cost Expectations in Your Area", "Local Expert Recommendations"]`
            break

        case 'commercial':
            // Per docs: Feature H2 + Feature List + CTA Box, then H2 + Standard Paragraph loop
            articleTypeRules = `
COMMERCIAL ARTICLE RULES (from documentation):
This is a COMMERCIAL article promoting "${topic}".

H1 should be benefit-focused:
- Question: "Why Should You Choose ${topic}?", "What Benefits Does ${topic} Offer?"
- Statement: "Benefits of ${topic}", "Why ${topic} Stands Out"
- Listicle: "5 Reasons to Choose ${topic}"

H2 STRUCTURE (EXACT ORDER from documentation):
FIRST H2 - Feature H2:
  - Question variant: "What Features Does [Service/Product] Offer?"
  - Statement variant: "Key Features of [Service/Product]"
  - Listicle variant: "Top Features You'll Get"

After Feature H2: Feature List (generated separately) + CTA Box

REMAINING H2s - Benefit/Value H2s:
  - Question: "Why Is ${topic} the Right Choice?", "What Results Can You Expect?"
  - Statement: "Why Choose ${topic}", "Expected Results", "Value Proposition"
`
            h2Examples = variation === 'question'
                ? `["What Features Does ${topic} Offer?", "Why Is ${topic} the Right Choice?", "What Results Can You Expect?", "How Does ${topic} Compare to Alternatives?"]`
                : variation === 'listicle'
                    ? `["Top Features You'll Get", "Why ${topic} Stands Out", "Results You Can Expect", "How It Compares"]`
                    : `["Key Features of ${topic}", "Why Choose ${topic}", "Expected Results", "Value Proposition"]`
            break
    }

    // H1 format requirements based on variation
    let h1FormatRules = ''
    switch (variation) {
        case 'question':
            h1FormatRules = `- H1 MUST be a grammatically correct question ending with "?"
- Use natural question forms: "How Do You...", "What Makes...", "Why Should You...", "How Can You..."
- Make sure the question makes grammatical sense with the topic "${topic}"
${h1Examples ? `- ARTICLE-TYPE EXAMPLES: ${h1Examples}` : ''}`
            break
        case 'listicle':
            h1FormatRules = `- H1 MUST start with a number (e.g., "7 Ways to...", "5 Best...")
- The number should be odd (3, 5, 7, 9, 11) for optimal engagement
${h1Examples ? `- ARTICLE-TYPE EXAMPLES: ${h1Examples}` : ''}`
            break
        case 'statement':
        default:
            h1FormatRules = `- H1 MUST be a statement (NO question marks)
- Be CREATIVE and SPECIFIC - avoid generic patterns
- Use ACTIVE voice and SPECIFIC language about "${topic}"
${h1Examples ? `- ARTICLE-TYPE EXAMPLES: ${h1Examples}` : ''}
- BAD examples (NEVER USE): "A Comprehensive Guide", "The Ultimate Guide", "Everything About"`
            break
    }

    return `You are an expert SEO content writer. Generate the complete structure for an article about "${topic}".

ARTICLE TYPE: ${articleType}
VARIATION FORMAT: ${formatType}
${articleTypeRules}

═══════════════════════════════════════════════════════════════
H1 TITLE GENERATION - CRITICAL RULES
═══════════════════════════════════════════════════════════════
Generate a compelling, natural-sounding H1 title.

${h1FormatRules}

⚠️⚠️⚠️ STRICTLY FORBIDDEN IN H1 - INSTANT REJECTION ⚠️⚠️⚠️
- NO colons (:) or semicolons (;) ANYWHERE in the title
- NO "A Comprehensive Guide" or "Comprehensive Guide"  
- NO "The Ultimate Guide" or "Ultimate Guide"
- NO "Your Complete Guide" or "Complete Guide"
- NO "Everything You Need to Know" as full title
- NO generic filler phrases - be SPECIFIC and NATURAL

H1 CHARACTER RULES:
- MUST be exactly 50-60 characters (count carefully!)
- Include the keyword "${topic}" naturally
- Make it sound like a REAL article title a human would write

═══════════════════════════════════════════════════════════════
H2 HEADINGS (Generate exactly ${h2Count})
═══════════════════════════════════════════════════════════════

CRITICAL HEADER CONSISTENCY RULE:
Since the H1 is ${formatType} format, ALL H2 headings MUST also be ${formatType} format.
${variation === 'statement' ? '- NO question marks (?) allowed in ANY H2' : ''}
${variation === 'question' ? '- ALL H2s must be questions (start with What/How/Why/Which/When/Where/Is/Are/Can/Do)' : ''}
${variation === 'listicle' ? '- ALL H2s must be numbered (e.g., "1. First Item", "2. Second Item")' : ''}

${h2Examples ? `EXAMPLE H2s FOR THIS ARTICLE TYPE: ${h2Examples}` : ''}

H2 RULES - MANDATORY:
1. Generate exactly ${h2Count} H2 headings
2. Each H2 MUST be between 50-60 characters (not too short, not too long)
3. NEVER use "and", "or", or ":" in H2 headings
4. NEVER ask multiple questions in a single H2
5. ALL H2s must be thematically connected to "${topic}"
6. Primary keyword "${topic}" should appear in 60-70% of H2s

═══════════════════════════════════════════════════════════════
FAQ QUESTIONS (Generate exactly 5)
═══════════════════════════════════════════════════════════════
- Each question 30-60 characters
- Always end with ?
- Related to "${topic}"

═══════════════════════════════════════════════════════════════
CLOSING H2 - FORMAT RULES
═══════════════════════════════════════════════════════════════
Generate a closing H2 that:
- Is NOT "Conclusion", "Summary", "Final Thoughts", "Wrapping Up"
- Is between 50-60 characters
- Follows the H1 format type for QUESTION and STATEMENT only
${variation === 'question' ? '- MUST be a question ending with "?" (e.g., "How Can You Get Started Today?", "What Should Your Next Steps Be?")' : ''}
${variation === 'statement' ? '- MUST be a statement (e.g., "Your Path Forward Starts Here", "Taking Action on Your Goals")' : ''}
${variation === 'listicle' ? '- For LISTICLE: Closing H2 is NOT numbered (it\'s a structural section, not a list item)\n- Use a descriptive statement like "Your Next Steps Forward" or "Moving Forward With Confidence"' : ''}

OUTPUT FORMAT (JSON only, no markdown):
{
  "h1": "Your generated H1 title here",
  "h2Titles": ["H2 Title 1", "H2 Title 2", ...],
  "faqQuestions": ["FAQ Question 1?", "FAQ Question 2?", ...],
  "closingH2": "${variation === 'question' ? 'Question-Format Closing?' : 'Statement-Format Closing'}"
}

Generate the JSON now:`
}

function countH2sInFlow(flow: string[]): number {
    return flow.filter(c => c === 'h2').length
}

async function callGemini(prompt: string, maxRetries: number = 3): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Wait for a slot in the request queue
            await structureQueue.waitForSlot()

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 2048,
                        temperature: 0.7,
                    },
                }),
            })

            // Handle rate limiting with exponential backoff
            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000
                console.warn(`[Structure] Rate limited (429), retry ${attempt + 1}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                continue
            }

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
            }

            const data = await response.json()
            return data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        } catch (error) {
            lastError = error as Error

            const isRetryable = (error as Error).message?.includes('429') ||
                (error as Error).message?.includes('fetch')

            if (isRetryable && attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt + 1) * 1000
                console.warn(`[Structure] Error, retry ${attempt + 1}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                continue
            }

            throw error
        }
    }

    throw lastError || new Error('Failed to call Gemini API after retries')
}

function parseStructureResponse(response: string): { h1: string; h2Titles: string[]; faqQuestions: string[]; closingH2: string } {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
        throw new Error('Failed to parse structure response: no JSON found')
    }

    try {
        const parsed = JSON.parse(jsonMatch[0])
        return {
            h1: parsed.h1 || 'Article Title',
            h2Titles: parsed.h2Titles || [],
            faqQuestions: parsed.faqQuestions || [],
            closingH2: parsed.closingH2 || 'Your Next Steps'
        }
    } catch {
        throw new Error('Failed to parse structure response: invalid JSON')
    }
}

function validateStructure(
    h2Titles: string[],
    h1: string,
    variation: TitleVariation,
    topic: string
): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    // LISTICLE-SPECIFIC VALIDATION
    if (variation === 'listicle') {
        // Extract number from H1 (e.g., "7 Ways..." -> 7)
        const numberMatch = h1.match(/^(\d+)/)
        if (numberMatch) {
            const h1Number = parseInt(numberMatch[1], 10)

            // Check if number is odd
            if (h1Number % 2 === 0) {
                issues.push(`Listicle H1 uses even number (${h1Number}) - should use odd numbers (3, 5, 7, 9, 11) for better engagement`)
            }

            // Check if H2 count matches H1 number
            if (h2Titles.length !== h1Number) {
                issues.push(`Listicle H1 promises ${h1Number} items but only ${h2Titles.length} H2s generated. Must match exactly.`)
            }
        } else {
            issues.push(`Listicle H1 does not start with a number: "${h1}"`)
        }
    }

    // Validate H1 length (per programmatic_rules.md: 50-60 chars)
    if (h1.length < 50) {
        issues.push(`H1 is too short (${h1.length} chars): "${h1}". Minimum 50 characters required.`)
    }
    if (h1.length > 60) {
        issues.push(`H1 is too long (${h1.length} chars): "${h1}". Maximum 60 characters allowed.`)
    }

    // Validate H2 lengths (per programmatic_rules.md: 50-60 chars)
    for (let i = 0; i < h2Titles.length; i++) {
        const h2 = h2Titles[i]

        // Check length (both min and max)
        if (h2.length < 50) {
            issues.push(`H2 #${i + 1} is too short (${h2.length} chars): "${h2}". Minimum 50 characters required.`)
        }
        if (h2.length > 60) {
            issues.push(`H2 #${i + 1} exceeds 60 characters: "${h2}"`)
        }

        // Check for forbidden patterns
        if (/\band\b/i.test(h2)) {
            issues.push(`H2 #${i + 1} contains "and": "${h2}"`)
        }
        if (/\bor\b/i.test(h2)) {
            issues.push(`H2 #${i + 1} contains "or": "${h2}"`)
        }
        if (h2.includes(':')) {
            issues.push(`H2 #${i + 1} contains colon: "${h2}"`)
        }

        // Check format consistency
        if (variation === 'statement' && h2.includes('?')) {
            issues.push(`H2 #${i + 1} is a question but H1 is Statement: "${h2}"`)
        }
        if (variation === 'question' && !h2.includes('?')) {
            issues.push(`H2 #${i + 1} is not a question but H1 is Question: "${h2}"`)
        }
        if (variation === 'listicle' && !/^\d+\./.test(h2)) {
            issues.push(`H2 #${i + 1} is not numbered but H1 is Listicle: "${h2}"`)
        }
    }

    return {
        valid: issues.length === 0,
        issues
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateStructure(
    topic: string,
    articleType: string,
    variation: TitleVariation,
    targetWordCount: number = 1000,
    maxRetries: number = 2
): Promise<ArticleStructure> {
    // Calculate dynamic H2 count based on target word count
    const wordBudget = calculateWordBudget(articleType, targetWordCount)
    let h2Count = wordBudget.h2SectionCount

    // CRITICAL: For listicle articles, H2 count must be ODD (5, 7, 9, 11, 13, 15, 17, 19, 21, 23)
    // This follows the reference specification where listicle items MUST be odd numbers
    // Reference: Prompt_Templates/content_generation/listicle/latest.md
    if (articleType === 'listicle') {
        // Ensure we have at least 5 items (minimum per spec)
        h2Count = Math.max(5, h2Count)
        // Round to nearest ODD number
        if (h2Count % 2 === 0) {
            // Prefer rounding up for better content depth, cap at 23 per spec
            h2Count = Math.min(23, h2Count + 1)
        }
        // Ensure max of 23 items per spec
        h2Count = Math.min(23, h2Count)
        console.log(`[Structure Generator] Listicle format: enforced ODD item count: ${h2Count}`)
    }

    console.log(`[Structure Generator] Word Budget:`, {
        targetWordCount,
        fixedComponents: wordBudget.fixedComponentsTotal,
        remainingBudget: wordBudget.remainingBudget,
        h2SectionCount: h2Count
    })

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const prompt = buildStructurePrompt(topic, articleType, variation, h2Count)
            const response = await callGemini(prompt)
            const { h1, h2Titles, faqQuestions, closingH2 } = parseStructureResponse(response)

            // Validate structure
            const validation = validateStructure(h2Titles, h1, variation, topic)

            if (!validation.valid) {
                console.warn(`Structure validation failed (attempt ${attempt + 1}):`, validation.issues)
                if (attempt < maxRetries) {
                    continue // Retry
                }
                // On last attempt, try to fix issues programmatically
                // For now, just proceed with warnings
                console.warn('Proceeding with structure despite validation issues')
            }

            // Build H2 definitions
            const h2Definitions: H2Definition[] = h2Titles.map((title, index) => ({
                id: `section-${index + 1}`,
                title,
                index: index + 1
            }))

            // Build TOC items (FAQ excluded per SEO best practices)
            const tocItems: TocItem[] = h2Definitions.map(h2 => ({
                id: h2.id,
                title: h2.title,
                href: `#${h2.id}`
            }))

            return {
                h1: h1,
                h1Variation: variation,
                h2Titles: h2Definitions,
                faqQuestions,
                closingH2,
                tocItems,
                articleType,
                topic
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.error(`Structure generation attempt ${attempt + 1} failed:`, lastError.message)
        }
    }

    throw lastError || new Error('Structure generation failed after all retries')
}
// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE-SPECIFIC STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate structure for affiliate articles using actual product data
 * 
 * KEY DIFFERENCE from generic generateStructure:
 * - H2 titles come from ACTUAL PRODUCT NAMES (not generic AI-generated H2s)
 * - TOC is built from product names so it matches article content
 * - H1 can incorporate product focus from AI inference
 * - No mismatch between TOC and actual content
 * 
 * @param topic User's search topic
 * @param variation Title variation style
 * @param products Amazon products (from targeted search)
 * @param inference AI inference result with product categories and H1 suggestion
 */
export async function generateAffiliateStructure(
    topic: string,
    variation: TitleVariation,
    products: AmazonProduct[] | null,
    inference: ProductInferenceResult | null
): Promise<ArticleStructure> {
    await structureQueue.waitForSlot()

    // Build H1 using inference suggestion or generate one
    let h1: string
    if (inference?.h1Suggestion) {
        h1 = inference.h1Suggestion
    } else {
        // Generate H1 based on variation
        switch (variation) {
            case 'question':
                h1 = `What Are the Best ${topic} Products You Should Consider?`
                break
            case 'listicle':
                const count = products?.length || 3
                h1 = `${count} Best ${topic} Products Reviewed for You`
                break
            case 'statement':
            default:
                h1 = `Best ${topic} Products: Expert Recommendations`
        }
    }

    // Build H2 titles using AI to create proper, SEO-friendly H2s from product names
    // Per documentation: H2 max 60 chars, must follow H1 variation type
    const h2Definitions: H2Definition[] = []

    if (products && products.length > 0) {
        // Use AI to generate proper H2s for each product
        const h2Titles = await generateProductH2sWithAI(products, variation, topic)

        h2Titles.forEach((h2Title, index) => {
            h2Definitions.push({
                id: `section-${index + 1}`,
                title: h2Title,
                index: index + 1
            })
        })
    } else {
        // Fallback: Generate generic H2s if no products found
        const genericTitles = inference?.categories?.map((cat, i) => {
            const badge = cat.badge
            switch (variation) {
                case 'question':
                    return `Which ${topic} Is ${badge}?`
                case 'listicle':
                    return `${i + 1}. ${badge} ${topic}`
                default:
                    return `${badge} ${topic} Option`
            }
        }) || [
                `Best Overall ${topic}`,
                `Best Value ${topic}`,
                `Premium ${topic} Pick`
            ]

        genericTitles.forEach((title, index) => {
            h2Definitions.push({
                id: `section-${index + 1}`,
                title,
                index: index + 1
            })
        })
    }

    // Generate FAQ questions using AI
    let faqQuestions: string[]
    try {
        const faqPrompt = `Generate exactly 3 frequently asked questions about buying ${topic} products.
        
Topic: ${topic}
Article Focus: ${inference?.articleFocus || `Best ${topic} products`}

Return ONLY a JSON array of 3 question strings, nothing else:
["Question 1?", "Question 2?", "Question 3?"]

Requirements:
- Questions must be naturally worded
- Questions must be relevant to product buying decisions
- Questions must end with "?"
- Each question 8-15 words`

        const faqResponse = await callGemini(faqPrompt)
        const parsed = JSON.parse(faqResponse.trim())
        faqQuestions = Array.isArray(parsed) ? parsed.slice(0, 3) : [
            `What Should You Look for When Buying ${topic}?`,
            `How Much Should You Spend on ${topic}?`,
            `Which ${topic} Brand Is Most Reliable?`
        ]
    } catch {
        // Fallback FAQ questions
        faqQuestions = [
            `What Should You Look for When Buying ${topic}?`,
            `How Much Should You Spend on ${topic}?`,
            `Which ${topic} Brand Is Most Reliable?`
        ]
    }

    // Generate closing H2
    let closingH2: string
    switch (variation) {
        case 'question':
            closingH2 = `Which ${topic} Will You Choose?`
            break
        case 'listicle':
            closingH2 = `Your Next Steps With ${topic}`
            break
        default:
            closingH2 = `Making Your ${topic} Decision`
    }

    // Build TOC items FROM H2 definitions (ensuring match)
    const tocItems: TocItem[] = h2Definitions.map(h2 => ({
        id: h2.id,
        title: h2.title,
        href: `#${h2.id}`
    }))

    console.log(`[Affiliate Structure] Generated structure with ${h2Definitions.length} product H2s`)
    console.log(`[Affiliate Structure] H1: "${h1}"`)
    console.log(`[Affiliate Structure] TOC items:`, tocItems.map(t => t.title))

    return {
        h1,
        h1Variation: variation,
        h2Titles: h2Definitions,
        faqQuestions,
        closingH2,
        tocItems,
        articleType: 'affiliate',
        topic
    }
}