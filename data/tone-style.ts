/**
 * Tone & Style Definitions
 * Based on new rules-guidelines documentation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE TONES (9)
// ═══════════════════════════════════════════════════════════════════════════════

export type ToneType =
  | 'professional'
  | 'conversational'
  | 'authoritative'
  | 'friendly'
  | 'persuasive'
  | 'educational'
  | 'objective'
  | 'enthusiastic'
  | 'empathetic'

export interface ToneDefinition {
  id: ToneType
  name: string
  description: string
  icon: string
}

export const TONES: ToneDefinition[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Polished, business-appropriate, and credible. Suitable for B2B content and formal topics.',
    icon: '👔',
  },
  {
    id: 'conversational',
    name: 'Conversational',
    description: 'Natural speech patterns, uses "you" directly, relaxed and approachable.',
    icon: '💬',
  },
  {
    id: 'authoritative',
    name: 'Authoritative',
    description: 'Expert voice, confident assertions, demonstrates deep knowledge.',
    icon: '🎯',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, approachable, and personable. Like advice from a trusted friend.',
    icon: '😊',
  },
  {
    id: 'persuasive',
    name: 'Persuasive',
    description: 'Compelling, benefit-driven, action-oriented. Encourages reader decisions.',
    icon: '🎪',
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Clear explanations, teaching voice, breaks down complex topics.',
    icon: '📚',
  },
  {
    id: 'objective',
    name: 'Objective',
    description: 'Unbiased, fact-based, balanced perspective. No emotional language.',
    icon: '⚖️',
  },
  {
    id: 'enthusiastic',
    name: 'Enthusiastic',
    description: 'Energetic, excited, and passionate about the topic.',
    icon: '🎉',
  },
  {
    id: 'empathetic',
    name: 'Empathetic',
    description: 'Understanding, compassionate, acknowledges reader struggles and concerns.',
    icon: '❤️',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE STYLES (3)
// ═══════════════════════════════════════════════════════════════════════════════

export type StyleType = 'concise' | 'balanced' | 'detailed'

export interface StyleDefinition {
  id: StyleType
  name: string
  description: string
  wordsPerSentence: string
  icon: string
}

export const STYLES: StyleDefinition[] = [
  {
    id: 'concise',
    name: 'Concise',
    description: 'Short, punchy sentences. Direct and to the point.',
    wordsPerSentence: '5-10',
    icon: '⚡',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Standard sentence length. Natural reading flow, versatile.',
    wordsPerSentence: '12-18',
    icon: '⚖️',
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Longer, comprehensive sentences. Thorough explanations.',
    wordsPerSentence: '20-30',
    icon: '📖',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE TYPE DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArticleTypeDefaults {
  articleType: string
  tone: ToneType
  style: StyleType
  reason: string
}

export const ARTICLE_TYPE_DEFAULTS: ArticleTypeDefaults[] = [
  {
    articleType: 'affiliate',
    tone: 'persuasive',
    style: 'balanced',
    reason: 'Drives purchase decisions with credibility',
  },
  {
    articleType: 'commercial',
    tone: 'persuasive',
    style: 'concise',
    reason: 'Quick, compelling value propositions',
  },
  {
    articleType: 'comparison',
    tone: 'objective',
    style: 'detailed',
    reason: 'Fair, thorough analysis of options',
  },
  {
    articleType: 'how-to',
    tone: 'educational',
    style: 'concise',
    reason: 'Clear, actionable instructions',
  },
  {
    articleType: 'informational',
    tone: 'educational',
    style: 'detailed',
    reason: 'Comprehensive knowledge sharing',
  },
  {
    articleType: 'listicle',
    tone: 'conversational',
    style: 'concise',
    reason: 'Easy to scan, engaging',
  },
  {
    articleType: 'local',
    tone: 'friendly',
    style: 'balanced',
    reason: 'Approachable local business feel',
  },
  {
    articleType: 'recipe',
    tone: 'friendly',
    style: 'concise',
    reason: 'Warm, easy-to-follow cooking guidance',
  },
  {
    articleType: 'review',
    tone: 'authoritative',
    style: 'detailed',
    reason: 'Expert, thorough product analysis',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT TIERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentTier {
  id: 'primary' | 'secondary'
  name: string
  defaultWords: number
  description: string
  useCase: string
}

export const CONTENT_TIERS: ContentTier[] = [
  {
    id: 'primary',
    name: 'Primary (Pillar Content)',
    defaultWords: 2000,
    description: 'Comprehensive, in-depth content for competitive keywords',
    useCase: 'Pillar content, competitive keywords, comprehensive guides',
  },
  {
    id: 'secondary',
    name: 'Secondary (Supporting Content)',
    defaultWords: 1000,
    description: 'Focused content for supporting topics and long-tail keywords',
    useCase: 'Supporting content, long-tail keywords, topic clusters',
  },
]

export const GLOBAL_WORD_COUNT = {
  min: 800,
  max: 4000,
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getTone(id: ToneType): ToneDefinition | undefined {
  return TONES.find((t) => t.id === id)
}

export function getStyle(id: StyleType): StyleDefinition | undefined {
  return STYLES.find((s) => s.id === id)
}

export function getArticleTypeDefaults(articleType: string): ArticleTypeDefaults | undefined {
  return ARTICLE_TYPE_DEFAULTS.find((d) => d.articleType === articleType)
}

export function getContentTier(id: 'primary' | 'secondary'): ContentTier | undefined {
  return CONTENT_TIERS.find((t) => t.id === id)
}
