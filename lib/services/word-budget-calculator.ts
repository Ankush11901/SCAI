/**
 * Word Budget Calculator
 * Dynamically calculates the number of H2 sections needed based on target word count
 * and fixed component word allocations per article type.
 *
 * When `selectedComponents` is provided, optional components NOT in the list
 * are excluded from the fixed budget, freeing their word allocation for more H2 sections.
 */

export interface WordBudget {
  targetWordCount: number
  fixedComponentsTotal: number
  remainingBudget: number
  h2SectionCount: number
  estimatedWordsPerH2: number
}

/**
 * Calculate dynamic H2 count based on target word count
 * @param articleType - The type of article being generated
 * @param targetWordCount - Desired total word count for the article (default: 1000)
 * @param selectedComponents - Optional list of enabled component IDs. When provided,
 *   optional components NOT in this list are excluded from the word budget.
 *   When undefined/null, all components are included (backwards compatible).
 * @returns WordBudget with calculated H2 section count
 */
export function calculateWordBudget(
  articleType: string,
  targetWordCount: number = 1000,
  selectedComponents?: string[],
): WordBudget {
  let fixedComponentsTotal = 0
  let estimatedWordsPerH2 = 150 // Standard paragraph base

  // Helper: check if an optional component is enabled.
  // When no selectedComponents list is provided, everything is enabled (backwards compat).
  const isOn = (id: string) => !selectedComponents || selectedComponents.includes(id)

  // Base universal components (appear in ALL article types)
  const overviewWords = 100 // Overview Paragraph (2×50) — always required
  const faqWords = isOn('faq') ? 140 : 0
  const closingWords = isOn('closing-paragraph') ? 50 : 0

  switch (articleType) {
    case 'affiliate':
      // Fixed: Overview (100) + Closing (50)
      // Each product-card: Product Card (0) + H2 (0) + H2 Image (0) + Standard Paragraph (150)
      fixedComponentsTotal = overviewWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per product
      break

    case 'commercial':
      // Fixed: Overview (100) + Feature List (110) + CTA Box (25) + FAQ (140) + Closing (50)
      fixedComponentsTotal = overviewWords + 110 + 25 + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per H2
      break

    case 'comparison': {
      // Fixed: Overview (100) + Topic sections (2 topics × 80 words) + Comparison Table (135) + Quick Verdict (50) + FAQ (140) + Closing (50)
      const topicCount = 2
      const topicWords = topicCount * 80
      const quickVerdictWords = isOn('quick-verdict') ? 50 : 0
      fixedComponentsTotal = overviewWords + topicWords + 135 + quickVerdictWords + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph for analysis sections
      break
    }

    case 'how-to': {
      // Fixed: Overview (100) + Materials Box (70) + Pro Tips (100) + FAQ (140) + Closing (50)
      const proTipsWords = isOn('pro-tips') ? 100 : 0
      fixedComponentsTotal = overviewWords + 70 + proTipsWords + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per step
      break
    }

    case 'informational': {
      // Fixed: Overview (100) + Key Takeaways (65) + Quick Facts (90) + FAQ (140) + Closing (50)
      const quickFactsWords = isOn('quick-facts') ? 90 : 0
      fixedComponentsTotal = overviewWords + 65 + quickFactsWords + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per H2
      break
    }

    case 'listicle': {
      // Fixed: Overview (100) + Honorable Mentions (160) + Closing (50)
      const honorableMentionsWords = isOn('honorable-mentions') ? 160 : 0
      fixedComponentsTotal = overviewWords + honorableMentionsWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per list item
      break
    }

    case 'local': {
      // Fixed: Overview (100) + Why Choose Local (50) + Service Info Box (50) + FAQ (140) + Closing (50)
      const whyChooseWords = isOn('why-choose-local') ? 50 : 0
      const serviceInfoWords = isOn('service-info-box') ? 50 : 0
      fixedComponentsTotal = overviewWords + whyChooseWords + serviceInfoWords + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per H2
      break
    }

    case 'recipe': {
      // Fixed: Overview (100) + Ingredients (70) + Instructions (150) + Tips (150) + Nutrition Table (100) + FAQ (140)
      const nutritionWords = isOn('nutrition-table') ? 100 : 0
      fixedComponentsTotal = overviewWords + 70 + 150 + 150 + nutritionWords + faqWords
      estimatedWordsPerH2 = 150 // Standard paragraph for additional sections
      break
    }

    case 'review':
      // Fixed: Overview (100) + Features List (150) + Pros & Cons (150) + Rating Paragraph (100) + FAQ (140) + Closing (50)
      fixedComponentsTotal = overviewWords + 150 + 150 + 100 + faqWords + closingWords
      estimatedWordsPerH2 = 150 // Standard paragraph per analysis section
      break

    default:
      // Default to informational structure
      fixedComponentsTotal = overviewWords + 65 + 90 + faqWords + closingWords
      estimatedWordsPerH2 = 150
      break
  }

  // Calculate remaining budget after fixed components
  const remainingBudget = Math.max(0, targetWordCount - fixedComponentsTotal)

  // Calculate number of H2 sections needed
  // Minimum 3 H2 sections for quality, maximum 15 for readability
  let h2SectionCount = Math.floor(remainingBudget / estimatedWordsPerH2)
  h2SectionCount = Math.max(3, Math.min(h2SectionCount, 15))

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARTICLE TYPE SPECIFIC H2 RULES
  // ═══════════════════════════════════════════════════════════════════════════════
  // IMPORTANT: This returns the count of STRUCTURE-GENERATED H2s (standard sections)
  // NOT the total H2s in the article (unique components create their own H2s)
  // ═══════════════════════════════════════════════════════════════════════════════

  switch (articleType) {
    case 'affiliate': {
      // Affiliate: Product cards create their own H2s
      // Each product card = ~250-300 words (card + 150-word paragraph)
      // Per documentation: Minimum 3 product cards, loop until word count met
      // Calculate: (targetWordCount - fixedComponents) / 250 = product count
      const wordsPerProduct = 250 // Product card + 150-word description
      const affiliateBudget = Math.max(0, targetWordCount - fixedComponentsTotal)
      h2SectionCount = Math.max(3, Math.floor(affiliateBudget / wordsPerProduct))
      h2SectionCount = Math.min(h2SectionCount, 7) // Cap at 7 products for readability
      break
    }

    case 'how-to':
      // How-To: 1 Materials H2 + 5+ Step H2s + 1 Pro Tips H2 = 7+ total
      // We need at least 5 steps per documentation
      h2SectionCount = Math.max(5, h2SectionCount)
      break

    case 'listicle':
      // Listicle: H2s are numbered list items (must be ODD numbers: 5, 7, 9...)
      if (h2SectionCount % 2 === 0) {
        h2SectionCount += 1
      }
      h2SectionCount = Math.max(5, h2SectionCount)
      break

    case 'informational':
      // Informational: Key Takeaways + 4+ content H2s + Quick Facts H2
      // Minimum 4 content sections + 1 Quick Facts = 5 structure H2s
      h2SectionCount = Math.max(4, h2SectionCount)
      break

    case 'comparison':
      // Comparison: 2 Topic H2s + Comparison Table + 3+ Analysis H2s
      // Topic H2s (2) + Analysis H2s (3+) = 5+ structure H2s
      // Comparison table and quick verdict are unique components (no H2)
      h2SectionCount = Math.max(3, h2SectionCount) + 2 // +2 for topic H2s
      break

    case 'commercial':
      // Commercial: 1 Feature H2 + 3+ content H2s = 4+ structure H2s
      h2SectionCount = Math.max(3, h2SectionCount) + 1 // +1 for Feature H2
      break

    case 'review':
      // Review: Features H2 + Pros/Cons H2 + 3+ analysis H2s + Rating H2
      // = 2 fixed + 3+ analysis + 1 rating = 6+ structure H2s
      h2SectionCount = Math.max(3, h2SectionCount) + 3 // +3 for Features, Pros/Cons, Rating
      break

    case 'local':
      // Local: 3+ content H2s + Why Choose Local (unique component creates H2)
      h2SectionCount = Math.max(3, h2SectionCount)
      break

    case 'recipe':
      // Recipe: Ingredients, Instructions, Tips, Nutrition are unique components
      // Structure generator creates 1-2 additional H2s (variations, storage)
      // Ensure at least 1 dynamic H2 for adequate content depth
      h2SectionCount = Math.max(1, Math.min(3, h2SectionCount))
      break

    default:
      // Default minimum 4 H2s
      h2SectionCount = Math.max(4, h2SectionCount)
  }

  return {
    targetWordCount,
    fixedComponentsTotal,
    remainingBudget,
    h2SectionCount,
    estimatedWordsPerH2
  }
}

/**
 * Get a human-readable breakdown of word budget
 */
export function getWordBudgetBreakdown(budget: WordBudget): string {
  return `
Target Word Count: ${budget.targetWordCount} words
Fixed Components: ${budget.fixedComponentsTotal} words
Remaining Budget: ${budget.remainingBudget} words
H2 Sections Needed: ${budget.h2SectionCount}
Estimated Words per H2: ${budget.estimatedWordsPerH2} words
  `.trim()
}
