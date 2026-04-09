import { GoogleGenerativeAI } from '@google/generative-ai'
import { getStructureFlow } from '@/data/structure-flows'
import { getComponentsForArticleType, ComponentDefinition } from '@/data/components'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

/**
 * Content chunk from streaming generation
 */
export interface ContentChunk {
  type: 'component' | 'image' | 'progress' | 'complete' | 'error'
  id?: string
  status?: 'pending' | 'streaming' | 'complete' | 'error'
  content?: string
  prompt?: string
  url?: string
  html?: string
  wordCount?: number
  percentage?: number
  error?: string
}

/**
 * Build system prompt for article generation
 */
function buildSystemPrompt(
  articleType: string,
  variation: string,
  components: ComponentDefinition[]
): string {
  const requiredComponents = components.filter(c => c.required).map(c => c.name).join(', ')
  const optionalComponents = components.filter(c => !c.required).map(c => c.name).join(', ')

  // Build article-type specific rules
  const articleTypeRules = getArticleTypeSpecificRules(articleType)

  return `You are an expert SEO content writer. Generate a complete, well-structured HTML article.

ARTICLE TYPE: ${articleType}
TITLE VARIATION: ${variation} (use a ${variation} format for the H1 title)

REQUIRED COMPONENTS: ${requiredComponents}
OPTIONAL COMPONENTS: ${optionalComponents}

===== STRICT SEO CONTENT GUIDELINES =====

===== HEADER CONSISTENCY RULE - CRITICAL =====
This is the MOST IMPORTANT rule. ALL H2 headings MUST match the H1 format type:
- If H1 is QUESTION format (starts with What/How/Why/Which) → ALL H2s MUST be QUESTION format
- If H1 is STATEMENT format (declarative) → ALL H2s MUST be STATEMENT format (NO Question Marks allowed in ANY H2)
- If H1 is LISTICLE format (numbered, e.g., "7 Best...") → ALL H2s MUST be LISTICLE format (numbered)

Examples:
- H1 Question: "What Are the Best Wireless Headphones?" → H2s: "What Features Matter Most?", "Why Is Battery Life Important?"
- H1 Statement: "The Complete Guide to Wireless Headphones" → H2s: "Key Features to Consider", "Battery Life Essentials" (NOT "What are the features?")
- H1 Listicle: "7 Best Wireless Headphones for 2025" → H2s: "1. Sony WH-1000XM5", "2. Bose QC Ultra"

===== PARAGRAPH WORD COUNTS - MANDATORY =====
OVERVIEW PARAGRAPH (first paragraph after H1):
- Total: 90-110 words
- Structure: 2 sub-paragraphs × ~50 words each
- Purpose: Provides overview of the entire article topic

STANDARD PARAGRAPH (under each H2):
- Total: 130-170 words
- Structure: 3 sub-paragraphs × ~50 words each
- Purpose: Elaborates on the H2 heading above it

CLOSING PARAGRAPH:
- Total: 40-60 words
- Single paragraph
- Purpose: Natural ending, reinforces main value

===== H2 HEADING RULES - MANDATORY =====
1. Each H2 MUST be under 60 characters
2. NEVER use "and" or "or" in H2 headings
3. NEVER use colons (:) in H2 headings
4. NEVER ask multiple questions in a single H2
5. Each H2 must be a SINGLE, focused question or statement
6. All H2s must be THEMATICALLY CONNECTED to the H1
7. H2s should explore DIFFERENT ASPECTS of the SAME topic
8. ALL H2s MUST follow the same format type as H1 (see Header Consistency Rule above)

===== FAQ SECTION RULES - MANDATORY =====
When including FAQ section:
- FAQ H2: Maximum 30 characters (shorter than standard H2)
- Exactly 5 FAQ H3 questions (no more, no less)
- Each H3 question: 30-60 characters
- Each FAQ answer: 25-32 words
- Total FAQ section: ~140 words (5 answers × ~28 words)

===== CLOSING SECTION RULES - MANDATORY =====
CLOSING H2 - NEVER use these literal words/phrases:
- "Closing", "Conclusion", "Summary", "Final Thoughts"
- "To Wrap Up", "In Summary", "Wrapping Up", "Final Words"
Instead, use descriptive headings like: "Your Next Steps", "Making the Right Choice", "Getting Started Today"

CLOSING PARAGRAPH - NEVER start with these phrases:
- "In conclusion", "To summarize", "In summary", "Finally"
- "To wrap up", "As we've discussed", "As mentioned"
Instead, start naturally and reinforce the main benefit/value

===== TITLE VARIATIONS =====
- question: Start with "What", "How", "Why", "Which", "When", "Where", "Can", "Should", "Is", "Are", "Do", "Does"
- statement: Direct, declarative statement (no question marks)
- listicle: Include a number, e.g., "7 Best...", "10 Ways to...", "5 Essential..."

===== LISTICLE RULE =====
For LISTICLE article types: Items must ALWAYS be an ODD number (5, 7, 9, 11, 13, 15, 17, 19, 21, 23)

===== IMAGE RULES - CRITICAL =====
1. NEVER generate base64 images (data:image/...). It crashes the system.
2. ALWAYS use this placeholder format:
   <img src="https://placehold.co/800x450/e5e7eb/6b7280?text=Descriptive+Alt+Text" alt="Descriptive Alt Text" />
3. The 'text' parameter in the URL MUST match the 'alt' text.
4. Images will be replaced by high-quality AI images automatically.

===== VISUAL STYLING & COLORS - MANDATORY =====
1. USE ONLY BLACK, WHITE, AND GRAYSCALE.
2. NO COLORED BACKGROUNDS for boxes, takeaways, or summaries.
3. NO COLORED BORDERS (use black or gray borders only).
4. NO COLORED TEXT (use black or dark gray text only).
5. For "Key Takeaways" or special boxes: Use white background with black/gray border.
6. The aesthetic must be clean, minimalist, and purely monochrome.

${articleTypeRules}

===== OTHER RULES =====
1. Output ONLY the HTML body content (NO <html>, <head>, or <body> tags).
2. NO <style> blocks. Use only scai- prefixed classes.
3. Every component must have a data-component attribute
4. Include proper semantic HTML structure
5. Make content sound natural, not AI-generated
6. Focus on providing genuine value to readers

===== HTML STRUCTURE - USE THESE EXACT CLASSES =====
<h1 data-component="scai-h1" class="scai-h1">Title Here (under 60 chars)</h1>
<figure data-component="scai-featured-image" class="scai-featured-image">
  <img src="https://placehold.co/800x450/e5e7eb/6b7280?text=Featured+Image" alt="descriptive alt text" />
</figure>

<!-- Overview Paragraph: 90-110 words total -->
<p data-component="scai-overview-paragraph" class="scai-paragraph">First 50 words of overview...</p>
<p data-component="scai-overview-paragraph" class="scai-paragraph">Second 50 words of overview...</p>

<nav data-component="scai-toc" class="scai-toc">
  <h3 class="scai-toc-title">Table of Contents</h3>
  <ol class="scai-toc-list">
    <li><a href="#section-1">1. First H2 Title</a></li>
    <li><a href="#section-2">2. Second H2 Title</a></li>
  </ol>
</nav>

<section id="section-1" data-component="scai-section">
  <h2 class="scai-h2">H2 Title</h2>
  <figure data-component="scai-h2-image" class="scai-h2-image">
    <img src="https://placehold.co/800x400/e5e7eb/6b7280?text=Section+Image" alt="descriptive alt text" />
  </figure>
  <!-- Standard Paragraph: 130-170 words total -->
  <p data-component="scai-standard-paragraph" class="scai-paragraph">First 50 words...</p>
</section>

<section id="faq" data-component="scai-faq" class="scai-faq">
  <h2 class="scai-faq-title">FAQ Section Title</h2>
  <div class="scai-faq-item">
    <h3 class="scai-faq-question">Question 1?</h3>
    <p class="scai-faq-answer">Answer (25-32 words).</p>
  </div>
</section>

<section data-component="scai-closing" class="scai-closing">
  <h2 data-component="scai-closing-h2" class="scai-h2">Descriptive Closing Title</h2>
  <p data-component="scai-closing-paragraph" class="scai-paragraph">Closing paragraph (40-60 words)...</p>
</section>

Generate the complete article HTML body content now. Output ONLY valid HTML elements, starting with the H1. 
CRITICAL: Do NOT include <html>, <head>, <body>, or <!DOCTYPE> tags. You are generating the inner HTML only.
Do NOT wrap in markdown code blocks.`
}

/**
 * Get article-type specific rules for the prompt
 */
function getArticleTypeSpecificRules(articleType: string): string {
  const rules: Record<string, string> = {
    affiliate: `
    ===== AFFILIATE ARTICLE SPECIFIC RULES =====
      - Product Card: Contains Product Image, Product Name, Star Rating, Price, CTA Button
        - H2 after each Product Card should contain the product name
          - Standard Paragraph after H2 should describe product features
            - Pattern loops: Product Card → H2 → H2 Image(optional) → Standard Paragraph(150 words)`,

    commercial: `
              ===== COMMERCIAL ARTICLE SPECIFIC RULES =====
                - Feature H2: 60 characters, adapts to H1 variant type
                  - Feature List: 100 - 120 words(5 - 7 bullets × 15 - 20 words each)
                    - CTA Box: 20 - 30 words, call - to - action element
                      - Flow: Feature H2 → Feature List → CTA Box → H2 + Standard Paragraph loop`,

    comparison: `
                        ===== COMPARISON ARTICLE SPECIFIC RULES =====
                          - Topic H2: 60 characters, repeats for each topic being compared
                            - Topic Overview: 80 words total(2 paragraphs × 40 words each)
                              - Paragraph 1(40 words): What it is + Main feature
                                - Paragraph 2(40 words): Who it's for + Key benefit
                                  - Comparison Table: 120 - 150 words(side - by - side format)
                                    - Quick Verdict Box(optional): 50 words("Choose A if..." / "Choose B if...")
                                      - MUST end with Closing H2 + Closing Paragraph`,

    'how-to': `
                                        ===== HOW - TO ARTICLE SPECIFIC RULES =====
                                          - Materials / Requirements H2: 60 characters
                                            - Materials / Requirements Box: 20 - 120 words(5 - 15 bullets × 2 - 12 words each)
                                              - Steps: 5 - 10 steps, each with H2 + Standard Paragraph(150 words)
                                                - Pro Tips H2(optional): 60 characters
                                                  - Pro Tips List(optional): 80 - 120 words(5 - 7 bullets × 12 - 18 words)
                                                    - MUST end with Closing H2 + Closing Paragraph`,

    informational: `
                                                      ===== INFORMATIONAL ARTICLE SPECIFIC RULES =====
                                                        - Key Takeaways Box(REQUIRED): 50 - 75 words(5 - 6 bullets × 10 - 12 words each)
                                                          - Appears immediately after Overview Paragraph(TL;DR at top)
  - Quick Facts H2(optional): 40 - 50 characters(shorter than standard 60)
    - Quick Facts List(optional): 80 - 100 words(5 - 7 bullets × 12 - 15 words)
      - Minimum 4 H2 + Standard Paragraph sections
        - MUST end with Closing H2 + Closing Paragraph`,

    listicle: `
          ===== LISTICLE ARTICLE SPECIFIC RULES =====
            - CRITICAL: Item count MUST be an ODD number(5, 7, 9, 11, 13, 15, 17, 19, 21, 23)
              - Each item: H2(numbered) + H2 Image(optional) + Standard Paragraph(150 words)
                - Honorable Mentions H2(optional): 40 - 50 characters
                  - Honorable Mentions H3s: 30 - 40 characters(3 - 4 fixed)
                    - Honorable Mentions Paragraph: 40 - 50 words per H3`,

    local: `
                      ===== LOCAL ARTICLE SPECIFIC RULES =====
                        - Keyword structure: Service + Location(e.g., "Plumber in Los Angeles")
                          - Why Choose Local H2(optional): 40 - 50 characters
                            - Why Choose Local List: 40 - 60 words(4 - 5 bullets × 8 - 12 words)
                              - Service Info Box: Structured table with Label + Information columns`,

    recipe: `
                                ===== RECIPE ARTICLE SPECIFIC RULES =====
                                  - Ingredients H2: 60 characters
                                    - Ingredients List: 150 words(bulleted < ul > format)
                                      - Instructions H2: 60 characters
                                        - Instructions List: 150 - 400 words(numbered < ol > format, flexible based on complexity)
                                          - Tips H2: 60 characters
                                            - Tips Paragraph: 150 words(3 × 50 words)
                                              - Nutrition Facts H2: 60 characters
                                                - Nutrition Table: 100 words(table format)`,

    review: `
                                                  ===== REVIEW ARTICLE SPECIFIC RULES =====
                                                    - Features H2: 60 characters
                                                      - Features List: 150 words(7 - 10 bullets × 15 - 20 words each)
                                                        - Pros & Cons H2: 60 characters
                                                          - Pros & Cons Lists: 150 words total(75 words Pros + 75 words Cons, 5 - 7 bullets each)
                                                            - H2 + Standard Paragraph loop for detailed analysis
                                                              - Rating H2: 30 characters(shorter than standard)
                                                                - Rating Paragraph: 100 words(includes score like "8/10" with justification)
  - MUST end with Closing H2 + Closing Paragraph`
  }

  return rules[articleType] || ''
}

/**
 * Stream article content generation
 */
export async function* streamArticleContent(
  articleType: string,
  topic: string,
  variation: string = 'question',
  enabledComponents?: string[]
): AsyncGenerator<ContentChunk> {
  try {
    // Get components for this article type
    const components = getComponentsForArticleType(articleType)
    const structureFlow = getStructureFlow(articleType)

    // Build the prompt
    const systemPrompt = buildSystemPrompt(articleType, variation, components)
    const userPrompt = `Write a comprehensive ${articleType} article about: "${topic}"

Follow the structure flow: ${structureFlow.join(' > ')}

Make the content engaging, informative, and optimized for SEO.Include relevant details and practical information.Generate complete HTML with all required sections.`

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
    })

    // Start streaming
    yield { type: 'progress', percentage: 5 }

    const result = await model.generateContentStream([
      { text: systemPrompt },
      { text: userPrompt },
    ])

    let fullContent = ''
    let chunkCount = 0

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullContent += text
        chunkCount++

        // Yield content updates every chunk
        yield {
          type: 'component',
          id: 'content',
          status: 'streaming',
          content: fullContent,
        }

        // Calculate approximate progress
        const estimatedProgress = Math.min(90, 10 + (chunkCount * 3))
        if (chunkCount % 5 === 0) {
          yield { type: 'progress', percentage: estimatedProgress }
        }
      }
    }

    // Clean up content - remove markdown code blocks if present
    let cleanedContent = fullContent
      .replace(/^```html\n ?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    // Calculate word count
    const wordCount = cleanedContent.split(/\s+/).filter(word => word.length > 0).length

    // Yield completion
    yield {
      type: 'complete',
      html: cleanedContent,
      wordCount,
    }

  } catch (error) {
    console.error('Gemini generation error:', error)
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Generation failed',
    }
  }
}

/**
 * Generate a single article (non-streaming)
 */
export async function generateArticle(
  articleType: string,
  topic: string,
  variation: string = 'question'
): Promise<{ html: string; wordCount: number }> {
  const components = getComponentsForArticleType(articleType)
  const structureFlow = getStructureFlow(articleType)

  const systemPrompt = buildSystemPrompt(articleType, variation, components)
  const userPrompt = `Write a comprehensive ${articleType} article about: "${topic}"

Follow the structure flow: ${structureFlow.join(' > ')}

Make the content engaging, informative, and optimized for SEO. Generate complete HTML.`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  })

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt },
  ])

  let content = result.response.text()

  // Clean up content
  content = content
    .replace(/^```html\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

  return { html: content, wordCount }
}
