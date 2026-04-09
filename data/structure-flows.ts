/**
 * Structure Flows
 * Defines the required component ordering for each article type
 * Based on article_types_ascii_reference.txt and updated_article_component_documentation.md
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * H2 OWNERSHIP CONVENTION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GENERIC H2s (created by structure-generator.ts in Phase 1):
 *   - 'h2' - Standard section heading (followed by image + paragraph)
 *   - 'faq-h2' - FAQ section heading
 *   - 'closing-h2' - Closing section heading
 * 
 * UNIQUE COMPONENT H2s (created by component generator in Phase 2):
 *   - 'product-card' - Creates its own H2 (Affiliate)
 *   - 'ingredients' - Creates H2 + list (Recipe)
 *   - 'instructions' - Creates H2 + numbered list (Recipe/How-To)
 *   - 'nutrition-table' - Creates H2 + table (Recipe)
 *   - 'honorable-mentions' - Creates H2 (40-50 chars) + multiple H3 items (Listicle)
 *   - 'why-choose-local' - Creates H2 (40-50 chars) + image + list (Local)
 *   - 'quick-facts' - Creates H2 (40-50 chars) + facts list (Informational)
 *   - 'rating-paragraph' - Creates H2 (30 chars max) + rating content (Review)
 * 
 * COMPONENTS WITHOUT H2 (embedded in sections):
 *   - 'feature-list' - Bullet list only (Commercial)
 *   - 'cta-box' - Call-to-action box (Commercial)
 *   - 'comparison-table' - Table only (Comparison)
 *   - 'topic-overview' - Paragraphs only (Comparison)
 *   - 'quick-verdict' - Verdict box (Comparison)
 *   - 'key-takeaways' - Takeaway box (Informational/Review)
 *   - 'pros-cons' - Two lists (Review)
 *   - 'materials-box' - Materials list (How-To)
 *   - 'pro-tips' - Tips list (How-To)
 *   - 'quick-facts' - Facts list (Informational)
 *   - 'service-info' - Service table (Local)
 *   - 'tips-paragraph' - Tips text (Recipe)
 * 
 * RULE: If a component creates its own H2, it appears WITHOUT a preceding 'h2' entry
 *       in the flow. The component generator handles H2 formatting to match H1 variation.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const STRUCTURE_FLOWS: Record<string, string[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // Affiliate Article Flow
  // Product Card is a COMPLETE unit that outputs: H2 + Card + H2 Image + Description
  // Each product-card entry produces all content for one product
  // Documentation: Product Card → H2 → H2 Image (opt) → Standard Paragraph
  // Implementation: product-card outputs everything as self-contained unit
  // ═══════════════════════════════════════════════════════════════════════════════
  affiliate: [
    'h1',
    'featured-image',
    'overview-paragraph', // 100 words (2×50)
    'toc',
    // Each product-card outputs: H2 + Card + optional image + 150-word description
    'product-card', // Product 1 (Best Overall)
    'product-card', // Product 2 (Best Value)
    'product-card', // Product 3 (Premium Pick)
    // FAQ section
    'faq-h2',
    'faq-h3',
    'faq-answer',
    // Closing
    'closing-h2',
    'closing-paragraph', // 50 words
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Commercial Article Flow
  // H1 → Overview → Feature List (with built-in H2) → CTA Box (20-30w) → H2 + Standard Para loop
  // Note: Feature List component includes its own H2 header (injected from content.h2s[0])
  // ═══════════════════════════════════════════════════════════════════════════════
  commercial: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    'feature-list', // Has built-in H2 - uses h2s[0] as header (100-120 words, 5-7 bullets)
    'cta-box', // 20-30 words
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2',
    'closing-paragraph',
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Comparison Article Flow
  // H1 → Overview → [Topic H2 × 2] → Comparison Table → [Analysis H2 × N] → Quick Verdict → FAQ → Closing
  // NOTE: All section content uses standard-paragraph for consistency with unified orchestrator
  // ═══════════════════════════════════════════════════════════════════════════════
  comparison: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    // Topic sections (2 topics introducing each item)
    'h2', // Topic 1 H2
    'h2-image',
    'standard-paragraph',
    'h2', // Topic 2 H2
    'h2-image',
    'standard-paragraph',
    // Comparison Table after all topic sections
    'comparison-table', // 120-150 words side-by-side
    // Analysis loop (detailed analysis sections)
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    // Quick Verdict before closing
    'quick-verdict', // 50 words - "Choose A if..." / "Choose B if..."
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2', // REQUIRED for Comparison
    'closing-paragraph', // REQUIRED for Comparison
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // How-To Article Flow
  // H1 → Overview → Materials Box (with built-in H2) → 
  // [Step H2 → H2 Image (opt) → Standard Para (150w)] × 5-10 steps → 
  // Pro Tips H2 (opt) → Pro Tips List (80-120w, opt) → Closing H2 + Closing Para (REQUIRED)
  // Note: Requirements Box component includes its own H2 header (injected from content.h2s[0])
  // ═══════════════════════════════════════════════════════════════════════════════
  'how-to': [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    'requirements-box', // Has built-in H2 - uses h2s[0] as header (20-120 words, 5-15 bullets)
    // Steps 1-5 (minimum 5 steps per documentation)
    'h2', // Step 1
    'h2-image',
    'standard-paragraph',
    'h2', // Step 2
    'h2-image',
    'standard-paragraph',
    'h2', // Step 3
    'h2-image',
    'standard-paragraph',
    'h2', // Step 4
    'h2-image',
    'standard-paragraph',
    'h2', // Step 5
    'h2-image',
    'standard-paragraph',
    // Pro Tips section (OPTIONAL per documentation)
    'h2', // Pro Tips H2
    'h2-image',
    'pro-tips', // 80-120 words (5-7 bullets)
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2', // REQUIRED for How-To
    'closing-paragraph', // REQUIRED for How-To
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Informational Article Flow
  // H1 → Featured Image → Overview → Key Takeaways Box (50-75w, REQUIRED, TL;DR at top) → 
  // [H2 → H2 Image (opt) → Standard Para (150w)] × min 4 → 
  // Quick Facts H2 (40-50 chars, opt) → H2 Image (opt) → Quick Facts List (80-100w, opt) → 
  // Closing H2 + Closing Para (REQUIRED)
  // ═══════════════════════════════════════════════════════════════════════════════
  informational: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'key-takeaways', // 50-75 words (REQUIRED, TL;DR immediately after overview)
    'toc',
    // Minimum 4 content sections per documentation
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    // Quick Facts section (OPTIONAL per documentation) - component creates own H2 (40-50 chars)
    'quick-facts', // 80-100 words (5-7 bullets) + own H2
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2', // REQUIRED for Informational
    'closing-paragraph', // REQUIRED for Informational
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Listicle Article Flow
  // H1 → Overview → [H2 Item → H2 Image (opt) → Standard Para (150w)] × ODD numbers (5,7,9...) → 
  // Honorable Mentions H2 (40-50 chars, opt) → [H3 → Paragraph (40-50w)] × 3-4 → Closing (opt)
  // ═══════════════════════════════════════════════════════════════════════════════
  listicle: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    'h2', // Item 1
    'h2-image',
    'standard-paragraph',
    'h2', // Item 2
    'h2-image',
    'standard-paragraph',
    'h2', // Item 3
    'h2-image',
    'standard-paragraph',
    'h2', // Item 4
    'h2-image',
    'standard-paragraph',
    'h2', // Item 5 (ODD number requirement)
    'h2-image',
    'standard-paragraph',
    'honorable-mentions', // H2 + 3-4 H3 items with paragraphs (40-50w each)
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2',
    'closing-paragraph',
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Local Article Flow
  // H1 → Overview → [H2 → H2 Image (opt) → Standard Para (150w)] loop → 
  // Why Choose Local H2 (40-50 chars, opt) → [Image + List (40-60w)] → 
  // Service Info Box (40-60w, from settings, opt) → Closing (opt)
  // ═══════════════════════════════════════════════════════════════════════════════
  local: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'h2',
    'h2-image',
    'standard-paragraph',
    'why-choose-local', // H2 + Image + List (40-60 words) - component creates own H2
    'service-info', // 40-60 words (from user settings)
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2',
    'closing-paragraph',
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Recipe Article Flow
  // Components that create their own H2s: ingredients, instructions, nutrition-table
  // Components WITHOUT H2: tips-paragraph (uses preceding h2 entry)
  // H2 Images are embedded within component generators where applicable
  // Flow: H1 → Overview → Ingredients → Instructions → Tips (H2) → Nutrition → 
  // [H2 → Standard Para] loop → FAQ → Closing
  // ═══════════════════════════════════════════════════════════════════════════════
  recipe: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    // Ingredients section (component creates own H2 - NO preceding h2 entry)
    'ingredients', // H2 + 150 words bulleted
    // Instructions section (component creates own H2 - NO preceding h2 entry)
    'instructions', // H2 + 150-400 words numbered
    // Tips section (standard H2 + paragraph structure - tips-paragraph does NOT create H2)
    'h2', // Tips H2
    'h2-image',
    'tips-paragraph', // 150 words
    // Nutrition section (component creates own H2 - NO preceding h2 entry)
    'nutrition-table', // H2 + 100 words table
    // Additional content section
    'h2',
    'h2-image',
    'standard-paragraph',
    // FAQ and Closing
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2',
    'closing-paragraph', // 50 words
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // Review Article Flow
  // H1 → Overview → Features List (with built-in H2) → H2 Image (opt) → 
  // Pros & Cons (with built-in H2) → H2 Image (opt) → 
  // [H2 → H2 Image (opt) → Standard Para (150w)] × 3-5 sections → 
  // Rating (with built-in H2, 30 chars) → Rating Para (100w with score) → Closing H2 + Closing Para (REQUIRED)
  // ═══════════════════════════════════════════════════════════════════════════════
  review: [
    'h1',
    'featured-image',
    'overview-paragraph',
    'toc',
    // Features section - feature-list component has built-in H2
    'feature-list', // 150 words (7-10 bullets) - consumes h2s[0]
    'h2-image',
    // Pros & Cons section - pros-cons component has built-in H2
    'pros-cons', // 150 words (75 Pros + 75 Cons) - uses prosConsH2
    'h2-image',
    // In-depth analysis loop (3-5 sections)
    'h2', // h2s[1]
    'h2-image',
    'standard-paragraph',
    'h2', // h2s[2]
    'h2-image',
    'standard-paragraph',
    'h2', // h2s[3]
    'h2-image',
    'standard-paragraph',
    // Rating section (near end) - rating component has built-in H2 (30 chars max)
    'rating-paragraph', // 100 words with score justification - uses ratingH2
    'faq-h2',
    'faq-h3',
    'faq-answer',
    'closing-h2', // REQUIRED for Review
    'closing-paragraph', // REQUIRED for Review
  ],
}

/**
 * Get the structure flow for a specific article type
 */
export function getStructureFlow(articleType: string): string[] {
  return STRUCTURE_FLOWS[articleType] || STRUCTURE_FLOWS.informational
}

/**
 * Build dynamic structure flow based on calculated H2 count
 * This replaces hardcoded H2 loops with dynamically calculated sections
 */
export function buildDynamicFlow(articleType: string, h2Count: number): string[] {
  const flow: string[] = []

  switch (articleType) {
    case 'affiliate':
      // AFFILIATE SPECIAL CASE: h2Count from word budget is 0 because product cards create their own H2s
      // Per documentation: Flow loops [Product Card → H2 → H2 Image → Standard Paragraph] until word count met
      // Each product card = ~250-300 words (card + 150-word description)
      // For 1000 words: (1000 - 150 fixed) / 250 ≈ 3 products
      // MINIMUM 3 product cards per documentation
      const productCardCount = Math.max(3, h2Count || 3) // Use h2Count if passed, otherwise 3
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      for (let i = 0; i < productCardCount; i++) {
        flow.push('product-card') // Each product-card includes H2 + Card + Description
      }
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'commercial':
      // H1 → Featured Image → Overview → TOC → Feature H2 → Feature List → CTA Box → [H2 + Para × h2Count] → FAQ → Closing
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      flow.push('h2', 'feature-list', 'cta-box') // Feature section
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'comparison':
      // H1 → Featured Image → Overview → TOC → [Topic sections × 2 (treated as regular H2s)] → Comparison Table → [Analysis H2 × h2Count] → Quick Verdict → FAQ → Closing
      // NOTE: All sections use standard-paragraph as the orchestrator generates unified content
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      // Topic sections (first 2 H2s introduce each item being compared)
      flow.push('h2', 'h2-image', 'standard-paragraph')
      flow.push('h2', 'h2-image', 'standard-paragraph')
      flow.push('comparison-table')
      // Analysis sections (dynamic - remaining H2s for detailed analysis)
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('quick-verdict', 'faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'how-to':
      // H1 → Featured Image → Overview → TOC → Materials H2 + Box → [Step H2 × h2Count] → Pro Tips → FAQ → Closing
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      flow.push('h2', 'requirements-box') // Materials/Requirements section
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('h2', 'h2-image', 'pro-tips') // Pro Tips section
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'informational':
      // H1 → Featured Image → Overview → Key Takeaways → TOC → [H2 + Para × h2Count] → Quick Facts → FAQ → Closing
      // CRITICAL: quick-facts creates its OWN H2 (40-50 chars per documentation)
      flow.push('h1', 'featured-image', 'overview-paragraph', 'key-takeaways', 'toc')
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('quick-facts') // Quick Facts section - component creates own 40-50 char H2
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'listicle':
      // H1 → Featured Image → Overview → TOC → [H2 Item × h2Count] → Honorable Mentions → FAQ → Closing
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('honorable-mentions') // Honorable Mentions section (H2 + 3-4 H3s)
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'local':
      // H1 → Featured Image → Overview → TOC → [H2 + Para × h2Count] → Why Choose Local → Service Info → FAQ → Closing
      // CRITICAL: why-choose-local creates its OWN H2 - no preceding h2 entry needed
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('why-choose-local') // Component creates own H2 + Image + List
      flow.push('service-info') // Service Info Box
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'recipe':
      // H1 → Featured Image → Overview → TOC → Ingredients → Instructions → Tips → Nutrition → [H2 × h2Count] → FAQ → Closing
      // CRITICAL: ingredients, instructions, nutrition-table create their OWN H2s - no preceding h2 entry needed
      // Only tips-paragraph needs a preceding h2 (it's a content-only component)
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      flow.push('ingredients') // Component creates own H2 + list
      flow.push('instructions') // Component creates own H2 + numbered list
      flow.push('h2', 'h2-image', 'tips-paragraph') // Tips section (standard H2 + content)
      flow.push('nutrition-table') // Component creates own H2 + table
      // Additional content sections
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    case 'review':
      // H1 → Featured Image → Overview → TOC → Features → Pros & Cons → [Analysis H2 × h2Count] → Rating → FAQ → Closing
      // CRITICAL: rating-paragraph creates its OWN H2 (30 chars max per documentation)
      flow.push('h1', 'featured-image', 'overview-paragraph', 'toc')
      flow.push('h2', 'h2-image', 'feature-list') // Features section
      flow.push('h2', 'h2-image', 'pros-cons') // Pros & Cons section
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('rating-paragraph') // Rating section - component creates own 30-char H2
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break

    default:
      // Default to informational flow
      flow.push('h1', 'featured-image', 'overview-paragraph', 'key-takeaways', 'toc')
      for (let i = 0; i < h2Count; i++) {
        flow.push('h2', 'h2-image', 'standard-paragraph')
      }
      flow.push('faq-h2', 'faq-h3', 'faq-answer', 'closing-h2', 'closing-paragraph')
      break
  }

  return flow
}

/**
 * Component display names for the structure flow
 */
export const COMPONENT_LABELS: Record<string, string> = {
  // Universal Components
  h1: 'H1 Title',
  'featured-image': 'Featured Image',
  'overview-paragraph': 'Overview Paragraph (100w)',
  'standard-paragraph': 'Standard Paragraph (150w)',
  toc: 'Table of Contents',
  h2: 'H2 Heading',
  'h2-image': 'H2 Image (Optional)',
  'closing-h2': 'Closing H2',
  'closing-paragraph': 'Closing Paragraph (50w)',
  'faq-h2': 'FAQ H2 (30 chars)',
  'faq-h3': 'FAQ H3 (30-60 chars)',
  'faq-answer': 'FAQ Answer (28w each)',
  'meta-title': 'Meta Title (50-60 chars)',
  'meta-description': 'Meta Description (140-160 chars)',
  'featured-image-alt': 'Featured Image Alt (100-125 chars)',
  'h2-image-alt': 'H2 Image Alt (80-100 chars)',

  // Unique Components
  'product-card': 'Product Card (Affiliate)',
  'feature-list': 'Feature List (100-150w)',
  'cta-box': 'CTA Box (20-30w)',
  'topic-overview': 'Topic Overview (80w)',
  'comparison-table': 'Comparison Table (120-150w)',
  'quick-verdict': 'Quick Verdict Box (50w)',
  'materials-box': 'Materials/Requirements Box (20-120w)',
  'pro-tips': 'Pro Tips List (80-120w)',
  'key-takeaways': 'Key Takeaways Box (50-75w)',
  'quick-facts': 'Quick Facts List (80-100w)',
  'honorable-mentions': 'Honorable Mentions Section',
  'why-choose-local': 'Why Choose Local (40-60w)',
  'service-info': 'Service Info Box (40-60w)',
  'ingredients': 'Ingredients List (150w)',
  'instructions': 'Instructions List (150-400w)',
  'tips-paragraph': 'Tips Paragraph (150w)',
  'nutrition-table': 'Nutrition Table (100w)',
  'rating-paragraph': 'Rating Paragraph (100w)',
  'pros-cons': 'Pros & Cons (150w)',
}

