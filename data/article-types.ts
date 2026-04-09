/**
 * Article Type Definitions
 * The 9 core article types supported by SCAI
 */

export interface ArticleType {
  id: string
  name: string
  description: string
  icon: string
  variations: ('question' | 'statement' | 'listicle')[]
  uniqueComponents: string[]
}

export const ARTICLE_TYPES: ArticleType[] = [
  {
    id: 'affiliate',
    name: 'Affiliate',
    description: 'Product-focused articles with purchase CTAs and Amazon affiliate links',
    icon: 'shopping-cart',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['product-card', 'cta-button', 'price-comparison'],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Business-focused content highlighting features, benefits, and value propositions',
    icon: 'briefcase',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['feature-list', 'pricing-table', 'testimonial'],
  },
  {
    id: 'comparison',
    name: 'Comparison',
    description: 'Head-to-head product or service comparisons with clear winner recommendations',
    icon: 'git-compare',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['comparison-table', 'winner-box', 'verdict-section'],
  },
  {
    id: 'how-to',
    name: 'How-To',
    description: 'Step-by-step instructional guides with clear, actionable directions',
    icon: 'list-ordered',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['step-list', 'materials-list', 'time-estimate'],
  },
  {
    id: 'informational',
    name: 'Informational',
    description: 'Educational content providing comprehensive information on a topic',
    icon: 'info',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['key-takeaways', 'expert-quote', 'definition-box'],
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Numbered list format articles for easy scanning and engagement',
    icon: 'list',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['numbered-items', 'quick-summary', 'highlight-box'],
  },
  {
    id: 'local',
    name: 'Local',
    description: 'Location-specific content for local SEO and geographic targeting',
    icon: 'map-pin',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['map-embed', 'contact-info', 'hours-table'],
  },
  {
    id: 'recipe',
    name: 'Recipe',
    description: 'Cooking and recipe content with ingredients, instructions, and nutrition info',
    icon: 'utensils',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['ingredients-list', 'instructions', 'nutrition-facts', 'recipe-card'],
  },
  {
    id: 'review',
    name: 'Review',
    description: 'In-depth product or service reviews with ratings and recommendations',
    icon: 'star',
    variations: ['question', 'statement', 'listicle'],
    uniqueComponents: ['pros-cons', 'rating-box', 'verdict-section', 'specifications'],
  },
]

/**
 * Get article type by ID
 */
export function getArticleType(id: string): ArticleType | undefined {
  return ARTICLE_TYPES.find((type) => type.id === id)
}

/**
 * Get icon component for article type
 */
export function getArticleIcon(iconName: string): string {
  const icons: Record<string, string> = {
    'shopping-cart': 'ShoppingCart',
    'briefcase': 'Briefcase',
    'git-compare': 'GitCompare',
    'list-ordered': 'ListOrdered',
    'info': 'Info',
    'list': 'List',
    'map-pin': 'MapPin',
    'utensils': 'UtensilsCrossed',
    'star': 'Star',
  }
  return icons[iconName] || 'FileText'
}

