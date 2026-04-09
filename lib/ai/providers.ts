/**
 * AI Provider Configuration
 *
 * Multi-provider support using Vercel AI SDK
 * Default: OpenAI, with Gemini and Claude as fallbacks
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { logAiUsageAsync, type CostTrackingContext } from '@/lib/services/cost-tracking-service';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AIProvider = 'gemini' | 'claude' | 'openai';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  available: boolean;
  models: {
    fast: string;
    default: string;
    powerful: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER INSTANCES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create Google Gemini provider instance
 */
function createGeminiProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  return createGoogleGenerativeAI({
    apiKey,
  });
}

/**
 * Create Anthropic Claude provider instance
 */
function createClaudeProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  return createAnthropic({
    apiKey,
  });
}

/**
 * Create OpenAI provider instance
 */
function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return createOpenAI({
    apiKey,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get provider configuration for all available providers
 */
export function getProviderConfigs(): ProviderConfig[] {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini',
      available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      models: {
        // Gemini 2.0 series - fastest available models
        // Benchmarked: gemini-2.0-flash-lite = 666ms first chunk vs gemini-3-flash-preview = 5.4s
        // See: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
        fast: 'gemini-2.0-flash',              // Fastest - 666ms to first chunk
        default: 'gemini-2.0-flash',                // Good balance - 1s to first chunk
        powerful: 'gemini-2.0-flash',               // Use flash for speed, pro models are slow
      },
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      available: !!process.env.ANTHROPIC_API_KEY,
      models: {
        // Claude 3.5 and 4 series - latest models
        // See: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
        fast: 'claude-3-5-haiku-latest',           // Fast, efficient
        default: 'claude-sonnet-4-20250514',      // Good balance (Claude 4 Sonnet)
        powerful: 'claude-sonnet-4-20250514',     // Very capable
      },
    },
    {
      id: 'openai',
      name: 'OpenAI',
      available: !!process.env.OPENAI_API_KEY,
      models: {
        // GPT-4.1 and 4o series - latest stable models
        // See: https://ai-sdk.dev/providers/ai-sdk-providers/openai
        fast: 'gpt-4o-mini',              // Fast, efficient
        default: 'gpt-4o',                // Good balance
        powerful: 'gpt-4.1',              // Most capable
      },
    },
  ];
}

/**
 * Get available provider IDs
 */
export function getAvailableProviders(): AIProvider[] {
  return getProviderConfigs()
    .filter(p => p.available)
    .map(p => p.id);
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  const configs = getProviderConfigs();
  return configs.find(p => p.id === provider)?.available ?? false;
}

/**
 * Get the default provider (first available, preferring Gemini)
 */
export function getDefaultProvider(): AIProvider {
  const available = getAvailableProviders();

  // Prefer Gemini, then Claude, then OpenAI
  const preferenceOrder: AIProvider[] = ['gemini', 'claude', 'openai'];

  for (const provider of preferenceOrder) {
    if (available.includes(provider)) {
      return provider;
    }
  }

  throw new Error('No AI providers available. Please configure at least one API key.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

export type ModelTier = 'fast' | 'default' | 'powerful';

/**
 * Get a model instance for a specific provider and tier
 */
export function getModel(provider: AIProvider, tier: ModelTier = 'default') {
  const configs = getProviderConfigs();
  const config = configs.find(p => p.id === provider);

  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  if (!config.available) {
    throw new Error(`Provider ${provider} is not configured. Please set the API key.`);
  }

  const modelId = config.models[tier];

  switch (provider) {
    case 'gemini': {
      const gemini = createGeminiProvider();
      if (!gemini) throw new Error('Gemini provider not available');
      return gemini(modelId);
    }
    case 'claude': {
      const claude = createClaudeProvider();
      if (!claude) throw new Error('Claude provider not available');
      return claude(modelId);
    }
    case 'openai': {
      const openai = createOpenAIProvider();
      if (!openai) throw new Error('OpenAI provider not available');
      return openai(modelId);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get model with automatic fallback to next available provider
 */
export function getModelWithFallback(
  preferredProvider?: AIProvider,
  tier: ModelTier = 'default'
): { model: ReturnType<typeof getModel>; provider: AIProvider; modelId: string } {
  const fallbackOrder: AIProvider[] = ['openai', 'gemini', 'claude'];
  const actualPreferred = preferredProvider ?? 'openai';

  // Put preferred provider first
  const orderedProviders = [
    actualPreferred,
    ...fallbackOrder.filter(p => p !== actualPreferred),
  ];

  const configs = getProviderConfigs();

  for (const provider of orderedProviders) {
    if (isProviderAvailable(provider)) {
      try {
        const model = getModel(provider, tier);
        const config = configs.find(p => p.id === provider);
        const modelId = config?.models[tier] ?? 'unknown';
        return { model, provider, modelId };
      } catch (error) {
        console.warn(`Failed to initialize ${provider}:`, error);
        continue;
      }
    }
  }

  throw new Error('No AI providers available');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check health of all configured providers
 */
export async function checkProviderHealth(): Promise<Record<AIProvider, boolean>> {
  const results: Record<AIProvider, boolean> = {
    gemini: false,
    claude: false,
    openai: false,
  };

  const configs = getProviderConfigs();

  for (const config of configs) {
    if (config.available) {
      // For now, just check if API key is set
      // Could add actual API ping in the future
      results[config.id] = true;
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK EXECUTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error types that should trigger a fallback to the alternate provider
 * Schema/validation errors won't be fixed by switching providers
 */
export function shouldRetryWithFallback(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  // Rate limiting errors
  if (errorMessage.includes('429') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('resource_exhausted') ||
    errorMessage.includes('quota exceeded')) {
    return true;
  }

  // Server errors
  if (errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('internal server error') ||
    errorMessage.includes('service unavailable')) {
    return true;
  }

  // Timeout errors
  if (errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound')) {
    return true;
  }

  // API errors that might be provider-specific
  if (errorMessage.includes('api error') ||
    errorMessage.includes('bad gateway') ||
    errorMessage.includes('temporarily unavailable')) {
    return true;
  }

  // Default: try fallback for unknown errors
  // Note: schema/validation errors ARE retried with fallback because different
  // providers have different structured output capabilities
  return true;
}

export interface ExecuteWithFallbackOptions {
  preferredProvider?: AIProvider;
  tier?: ModelTier;
  maxRetries?: number;
  retryDelayMs?: number;
  operationName?: string;
  /** Cost tracking context - if provided, usage will be logged automatically */
  costTracking?: CostTrackingContext;
}

export interface ExecuteWithFallbackResult<T> {
  result: T;
  provider: AIProvider;
  modelId: string;
  usedFallback: boolean;
  attempts: number;
}

/**
 * Execute an AI operation with automatic fallback to Gemini on failure
 *
 * This wrapper:
 * 1. Tries the preferred provider (default: OpenAI) first
 * 2. On retriable errors, waits and retries with the same provider
 * 3. If all retries fail with retriable errors, falls back to Gemini
 * 4. Returns the result along with metadata about which provider succeeded
 *
 * @param fn - Async function that receives a model and returns a result
 * @param options - Configuration options
 * @returns Result with provider metadata
 */
export async function executeWithFallback<T>(
  fn: (model: ReturnType<typeof getModel>, provider: AIProvider, modelId: string) => Promise<T>,
  options: ExecuteWithFallbackOptions = {}
): Promise<ExecuteWithFallbackResult<T>> {
  const {
    preferredProvider = 'openai',
    tier = 'default',
    maxRetries = 3, // Total attempts, e.g., 3 means OpenAI -> Gemini -> OpenAI
    retryDelayMs = 1000,
    operationName = 'AI operation',
    costTracking,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;
  const fallbackProvider = 'gemini';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isPrimaryAttempt = attempt % 2 !== 0; // 1st, 3rd, 5th attempts are primary
    let currentProvider = isPrimaryAttempt ? preferredProvider : fallbackProvider;

    // If the fallback provider is unavailable or is the same as the primary, just use the primary.
    if (!isProviderAvailable(currentProvider) || currentProvider === preferredProvider && !isPrimaryAttempt) {
      currentProvider = preferredProvider;
    }

    // Track actual provider used (may differ from currentProvider if getModelWithFallback falls back)
    let actualProvider = currentProvider;

    try {
      const { model, provider, modelId } = getModelWithFallback(currentProvider, tier);
      actualProvider = provider;
      console.log(`[${operationName}] Attempt ${attempt} with ${provider}/${modelId}`);

      const result = await fn(model, provider, modelId);

      // Log cost tracking if enabled and result has usage data
      if (costTracking && result && typeof result === 'object' && 'usage' in result) {
        const usage = (result as any).usage;
        if (usage && (usage.inputTokens || usage.outputTokens)) {
          logAiUsageAsync({
            historyId: costTracking.historyId,
            userId: costTracking.userId,
            bulkJobId: costTracking.bulkJobId,
            provider,
            modelId,
            operationType: 'object',
            operationName,
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            durationMs: Date.now() - startTime,
            success: true,
          });
        }
      }

      console.log(`[${operationName}] ✅ Success with ${provider} on attempt ${attempt}`);
      return {
        result,
        provider,
        modelId,
        usedFallback: provider !== preferredProvider,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[${operationName}] ❌ ${actualProvider} failed (attempt ${attempt}): ${lastError.message}`);

      if (!shouldRetryWithFallback(lastError)) {
        console.log(`[${operationName}] Non-retriable error (schema/validation), not falling back`);
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[${operationName}] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.log(`[${operationName}] ❌ All ${maxRetries} attempts failed.`);
  throw lastError;
}

/**
 * Execute a streaming AI operation with automatic fallback to Gemini on failure
 *
 * Similar to executeWithFallback but designed for streaming operations.
 * If the stream fails to start, it will fallback to Gemini.
 *
 * @param fn - Async function that receives a model and returns a stream
 * @param options - Configuration options
 * @returns Stream result with provider metadata
 */
export async function executeStreamWithFallback<T>(
  fn: (model: ReturnType<typeof getModel>, provider: AIProvider, modelId: string) => Promise<T>,
  options: ExecuteWithFallbackOptions = {}
): Promise<ExecuteWithFallbackResult<T>> {
  const {
    preferredProvider = 'openai',
    tier = 'fast',
    maxRetries = 3, // Total attempts, e.g., 3 means OpenAI -> Gemini -> OpenAI
    retryDelayMs = 500,
    operationName = 'Stream operation',
  } = options;

  let lastError: Error | null = null;
  const fallbackProvider = 'gemini';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isPrimaryAttempt = attempt % 2 !== 0;
    let currentProvider = isPrimaryAttempt ? preferredProvider : fallbackProvider;

    if (!isProviderAvailable(currentProvider) || currentProvider === preferredProvider && !isPrimaryAttempt) {
      currentProvider = preferredProvider;
    }

    // Track actual provider used (may differ from currentProvider if getModelWithFallback falls back)
    let actualProvider = currentProvider;

    try {
      const { model, provider, modelId } = getModelWithFallback(currentProvider, tier);
      actualProvider = provider;
      console.log(`[${operationName}] Attempt ${attempt} with ${provider}/${modelId}`);

      const result = await fn(model, provider, modelId);

      console.log(`[${operationName}] ✅ Stream started with ${provider}`);
      return {
        result,
        provider,
        modelId,
        usedFallback: provider !== preferredProvider,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[${operationName}] ❌ ${actualProvider} stream failed: ${lastError.message}`);

      if (!shouldRetryWithFallback(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.log(`[${operationName}] ❌ All ${maxRetries} streaming attempts failed.`);
  throw lastError;
}
