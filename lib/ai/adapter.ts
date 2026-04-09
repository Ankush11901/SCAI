/**
 * AI Provider Adapter
 * 
 * Provides a bridge between the existing content generators and the new Vercel AI SDK.
 * This allows gradual migration without breaking the existing system.
 * 
 * Usage:
 * - Import getTextGenerator() or getObjectGenerator()
 * - These return functions that work like the existing Gemini calls
 * - But support provider selection and failover
 */

import { generateText, generateObject, streamText } from 'ai';
import { z } from 'zod';
import { getModel, getModelWithFallback, type AIProvider, type ModelTier } from '@/lib/ai/providers';
import { logAiUsageAsync, type CostTrackingContext } from '@/lib/services/cost-tracking-service';

// Re-export AIProvider as ModelProvider for compatibility
export type ModelProvider = AIProvider;

// Message type for the AI SDK
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ModelProvider;
  tier?: ModelTier;
  enableFallback?: boolean;
  costTracking?: CostTrackingContext;
  operationName?: string;
}

export interface GenerateObjectOptions<T extends z.ZodSchema> {
  prompt: string;
  schema: T;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ModelProvider;
  tier?: ModelTier;
  enableFallback?: boolean;
  costTracking?: CostTrackingContext;
  operationName?: string;
}

export interface StreamTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ModelProvider;
  tier?: ModelTier;
  costTracking?: CostTrackingContext;
  operationName?: string;
}

export interface GenerationResult {
  text: string;
  provider: ModelProvider;
  modelId: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface ObjectGenerationResult<T> {
  object: T;
  provider: ModelProvider;
  modelId: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK-ENABLED TEXT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate text with automatic provider fallback
 * Tries the specified provider first, then falls back to alternatives on failure
 */
export async function generateTextWithFallback(
  options: GenerateTextOptions
): Promise<GenerationResult> {
  const {
    prompt,
    systemPrompt,
    maxTokens = 2048,
    temperature = 0.7,
    provider,
    tier = 'default',
    enableFallback = true,
    costTracking,
    operationName,
  } = options;

  const startTime = Date.now();
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Get model with optional fallback
  const { model, provider: usedProvider, modelId } = enableFallback
    ? getModelWithFallback(provider, tier)
    : {
      model: getModel(provider || 'gemini', tier),
      provider: provider || 'gemini',
      modelId: `${provider || 'gemini'}-${tier}`,
    };

  try {
    const result = await generateText({
      model,
      messages,
      maxOutputTokens: maxTokens,
      temperature,
    });

    // Log successful usage if cost tracking is enabled
    if (costTracking && result.usage) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: usedProvider,
        modelId,
        operationType: 'text',
        operationName: operationName || 'generateText',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        durationMs: Date.now() - startTime,
        success: true,
      });
    }

    return {
      text: result.text,
      provider: usedProvider,
      modelId,
      usage: result.usage,
    };
  } catch (error) {
    // Log failed attempt if cost tracking is enabled
    if (costTracking) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: usedProvider,
        modelId,
        operationType: 'text',
        operationName: operationName || 'generateText',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // If fallback is enabled and initial provider failed, try others
    if (enableFallback && provider) {
      console.warn(`[AI Adapter] ${provider} failed, trying fallback...`);
      const fallback = getModelWithFallback(undefined, tier);
      const fallbackStartTime = Date.now();

      try {
        const result = await generateText({
          model: fallback.model,
          messages,
          maxOutputTokens: maxTokens,
          temperature,
        });

        // Log fallback success
        if (costTracking && result.usage) {
          logAiUsageAsync({
            historyId: costTracking.historyId,
            userId: costTracking.userId,
            bulkJobId: costTracking.bulkJobId,
            provider: fallback.provider,
            modelId: fallback.modelId,
            operationType: 'text',
            operationName: operationName || 'generateText',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            durationMs: Date.now() - fallbackStartTime,
            success: true,
            metadata: { usedFallback: true },
          });
        }

        return {
          text: result.text,
          provider: fallback.provider,
          modelId: fallback.modelId,
          usage: result.usage,
        };
      } catch (fallbackError) {
        console.error('[AI Adapter] All providers failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK-ENABLED OBJECT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate structured object with automatic provider fallback
 * Uses Zod schema for validation
 */
export async function generateObjectWithFallback<T extends z.ZodSchema>(
  options: GenerateObjectOptions<T>
): Promise<ObjectGenerationResult<z.infer<T>>> {
  const {
    prompt,
    schema,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    provider,
    tier = 'default',
    enableFallback = true,
    costTracking,
    operationName,
  } = options;

  const startTime = Date.now();

  // Get model with optional fallback
  const { model, provider: usedProvider, modelId } = enableFallback
    ? getModelWithFallback(provider, tier)
    : {
      model: getModel(provider || 'gemini', tier),
      provider: provider || 'gemini',
      modelId: `${provider || 'gemini'}-${tier}`,
    };

  try {
    const result = await generateObject({
      model,
      schema,
      prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      maxOutputTokens: maxTokens,
      temperature,
    });

    // Log successful usage if cost tracking is enabled
    if (costTracking && result.usage) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: usedProvider,
        modelId,
        operationType: 'object',
        operationName: operationName || 'generateObject',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        durationMs: Date.now() - startTime,
        success: true,
      });
    }

    return {
      object: result.object as z.infer<T>,
      provider: usedProvider,
      modelId,
      usage: result.usage,
    };
  } catch (error) {
    // Log failed attempt if cost tracking is enabled
    if (costTracking) {
      logAiUsageAsync({
        historyId: costTracking.historyId,
        userId: costTracking.userId,
        bulkJobId: costTracking.bulkJobId,
        provider: usedProvider,
        modelId,
        operationType: 'object',
        operationName: operationName || 'generateObject',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // If fallback is enabled and initial provider failed, try others
    if (enableFallback && provider) {
      console.warn(`[AI Adapter] ${provider} failed for object generation, trying fallback...`);
      const fallback = getModelWithFallback(undefined, tier);
      const fallbackStartTime = Date.now();

      try {
        const result = await generateObject({
          model: fallback.model,
          schema,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          maxOutputTokens: maxTokens,
          temperature,
        });

        // Log fallback success
        if (costTracking && result.usage) {
          logAiUsageAsync({
            historyId: costTracking.historyId,
            userId: costTracking.userId,
            bulkJobId: costTracking.bulkJobId,
            provider: fallback.provider,
            modelId: fallback.modelId,
            operationType: 'object',
            operationName: operationName || 'generateObject',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            durationMs: Date.now() - fallbackStartTime,
            success: true,
            metadata: { usedFallback: true },
          });
        }

        return {
          object: result.object as z.infer<T>,
          provider: fallback.provider,
          modelId: fallback.modelId,
          usage: result.usage,
        };
      } catch (fallbackError) {
        console.error('[AI Adapter] All providers failed for object generation:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING TEXT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stream text generation
 * Returns a streamable result that can be consumed incrementally
 * Note: Cost tracking logs usage after stream completes via onFinish callback
 */
export async function streamTextGeneration(options: StreamTextOptions) {
  const {
    prompt,
    systemPrompt,
    maxTokens = 2048,
    temperature = 0.7,
    provider,
    tier = 'default',
    costTracking,
    operationName,
  } = options;

  const startTime = Date.now();
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const { model, provider: usedProvider, modelId } = getModelWithFallback(provider, tier);

  const result = streamText({
    model,
    messages,
    maxOutputTokens: maxTokens,
    temperature,
    onFinish: (event) => {
      // Log usage when stream completes
      if (costTracking && event.usage) {
        logAiUsageAsync({
          historyId: costTracking.historyId,
          userId: costTracking.userId,
          bulkJobId: costTracking.bulkJobId,
          provider: usedProvider,
          modelId,
          operationType: 'stream',
          operationName: operationName || 'streamText',
          inputTokens: event.usage.inputTokens,
          outputTokens: event.usage.outputTokens,
          durationMs: Date.now() - startTime,
          success: true,
        });
      }
    },
  });

  return {
    stream: result.textStream,
    provider: usedProvider,
    modelId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY ADAPTER: GEMINI-COMPATIBLE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a function that mimics the old Gemini API interface
 * This allows gradual migration of existing code
 */
export function createLegacyTextGenerator(
  defaultProvider?: ModelProvider,
  defaultTier?: ModelTier
) {
  return async function generateContent(prompt: string, options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const result = await generateTextWithFallback({
      prompt,
      systemPrompt: options?.systemPrompt,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      provider: defaultProvider,
      tier: defaultTier,
      enableFallback: true,
    });
    return result.text;
  };
}

/**
 * Direct replacement for Gemini API calls
 * Returns just the text, like the old API
 */
export async function generateContentText(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    provider?: ModelProvider;
    tier?: ModelTier;
  }
): Promise<string> {
  const result = await generateTextWithFallback({
    prompt,
    ...options,
    enableFallback: true,
  });
  return result.text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export types for convenience
export type { ModelTier } from '@/lib/ai/providers';
export type { CostTrackingContext } from '@/lib/services/cost-tracking-service';
