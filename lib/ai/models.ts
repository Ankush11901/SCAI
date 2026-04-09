/**
 * AI Model Configuration
 * 
 * Defines model specifications, rate limits, and token limits per provider
 */

import type { AIProvider, ModelTier } from './providers';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelSpec {
  id: string;
  name: string;
  provider: AIProvider;
  tier: ModelTier;
  maxInputTokens: number;
  maxOutputTokens: number;
  costPer1kInputTokens: number;  // in USD
  costPer1kOutputTokens: number; // in USD
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
}

/**
 * Model specifications for all supported models
 */
export const MODEL_SPECS: Record<string, ModelSpec> = {
  // Gemini Models
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    tier: 'fast',
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0001,    // Updated: $0.10 per 1M tokens
    costPer1kOutputTokens: 0.0004,   // Updated: $0.40 per 1M tokens
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    tier: 'powerful',
    maxInputTokens: 2000000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },

  // Claude Models
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    tier: 'fast',
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    tier: 'default',
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },

  // OpenAI Models
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'fast',
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'default',
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },

  // Image Generation Orchestration Models (Gemini)
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    tier: 'fast',
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0005,    // $0.50 per 1M tokens
    costPer1kOutputTokens: 0.003,    // $3.00 per 1M tokens
    supportsStreaming: true,
    supportsStructuredOutput: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION PRICING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Image generation pricing (per image, NOT per token)
 * These models charge based on number of images generated, not token usage
 */
export const IMAGE_PRICING: Record<string, number> = {
  'gemini-3-pro-image-preview': 0.13,  // ~$0.13 per image at 1K-2K resolution (~$0.24 at 4K)
  'imagen-3.0-generate-002': 0.04,     // $0.04 per image
  'flux-dev': 0.025,                   // ~$0.025 per image via fal.ai (legacy Flux Dev)
  'flux-2': 0.012,                     // ~$0.012 per 1MP image via Flux 2 Dev (text-to-image)
  'flux-2-edit': 0.024,                // ~$0.024 per 1MP image via Flux 2 Edit (image-to-image, $0.012/MP × 2MP)
};

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

/**
 * Rate limits per provider (based on typical free/starter tiers)
 */
export const RATE_LIMITS: Record<AIProvider, RateLimitConfig> = {
  gemini: {
    requestsPerMinute: 15,
    tokensPerMinute: 1000000,
    requestsPerDay: 1500,
  },
  claude: {
    requestsPerMinute: 50,
    tokensPerMinute: 40000,
    requestsPerDay: 1000,
  },
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 60000,
    requestsPerDay: 10000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TASK-SPECIFIC MODEL SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type GenerationTask =
  | 'structure'      // Generate article structure (H1, H2s, etc.)
  | 'content'        // Generate section content
  | 'faq'            // Generate FAQ answers
  | 'components'     // Generate unique component content
  | 'validation';    // Validate/fix content

/**
 * Get recommended model tier for a specific task
 */
export function getRecommendedTierForTask(task: GenerationTask): ModelTier {
  switch (task) {
    case 'structure':
      // Structure generation needs good reasoning
      return 'default';
    case 'content':
      // Content can use faster models
      return 'fast';
    case 'faq':
      // FAQ needs precise word counts
      return 'default';
    case 'components':
      // Unique components need good understanding
      return 'default';
    case 'validation':
      // Validation uses fast model
      return 'fast';
    default:
      return 'default';
  }
}

/**
 * Get model spec for a specific model ID
 */
export function getModelSpec(modelId: string): ModelSpec | undefined {
  return MODEL_SPECS[modelId];
}

/**
 * Estimate token count from text (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if text fits within model's context window
 */
export function fitsInContext(text: string, modelId: string): boolean {
  const spec = MODEL_SPECS[modelId];
  if (!spec) return false;

  const tokens = estimateTokenCount(text);
  return tokens < spec.maxInputTokens * 0.9; // Leave 10% buffer
}
