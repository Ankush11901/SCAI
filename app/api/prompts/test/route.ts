import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, isWhitelabelUser } from '@/lib/auth'
import { getPromptById } from '@/lib/prompts/registry'
import { db, promptTestRuns } from '@/lib/db'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

// Import prompt builders
import * as structurePrompts from '@/lib/ai/prompts/structure-prompts'
import * as contentPrompts from '@/lib/ai/prompts/content-prompts'
import * as componentPrompts from '@/lib/ai/prompts/component-prompts'
import * as keywordPrompts from '@/lib/ai/prompts/keyword-prompts'

type AIProvider = 'gemini' | 'openai' | 'claude'

/**
 * Get model for provider
 */
function getModel(provider: AIProvider) {
  switch (provider) {
    case 'gemini':
      return {
        model: createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
        })('gemini-2.0-flash'),
        modelId: 'gemini-2.0-flash',
      }
    case 'openai':
      return {
        model: createOpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        })('gpt-4o'),
        modelId: 'gpt-4o',
      }
    case 'claude':
      return {
        model: createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY!,
        })('claude-sonnet-4-20250514'),
        modelId: 'claude-sonnet-4-20250514',
      }
  }
}

/**
 * Get system prompt for a category
 */
function getSystemPrompt(category: string): string {
  switch (category) {
    case 'structure':
      return structurePrompts.STRUCTURE_SYSTEM_PROMPT
    case 'content':
      return contentPrompts.CONTENT_SYSTEM_PROMPT
    case 'component':
      return componentPrompts.COMPONENT_SYSTEM_PROMPT
    case 'keyword':
      return keywordPrompts.getKeywordExpansionSystemPrompt()
    default:
      return 'You are an expert content writer.'
  }
}

// Type for builder functions - we use 'unknown' to allow any params object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuilderFn = (params: any) => string

/**
 * Build user prompt using the appropriate builder function
 */
function buildUserPrompt(promptId: string, params: Record<string, unknown>): string {
  const builders: Record<string, BuilderFn> = {
    // Structure prompts
    'structure.h1': structurePrompts.buildH1Prompt,
    'structure.h1-only': structurePrompts.buildH1OnlyPrompt,
    'structure.h2': structurePrompts.buildH2Prompt,
    'structure.h2-from-h1': structurePrompts.buildH2FromH1Prompt,
    'structure.faq': structurePrompts.buildFaqPrompt,
    'structure.closing-h2': structurePrompts.buildClosingH2Prompt,
    'structure.meta': structurePrompts.buildMetaPrompt,
    'structure.image-alt': structurePrompts.buildImageAltPrompt,
    'structure.full': structurePrompts.buildFullStructurePrompt,

    // Content prompts
    'content.overview': contentPrompts.buildOverviewPrompt,
    'content.section': contentPrompts.buildSectionPrompt,
    'content.closing': contentPrompts.buildClosingPrompt,
    'content.faq-answers': contentPrompts.buildFaqAnswersPrompt,
    'content.topic-overview': contentPrompts.buildTopicOverviewPrompt,
    'content.key-takeaways': contentPrompts.buildKeyTakeawaysPrompt,
    'content.quick-verdict': contentPrompts.buildQuickVerdictPrompt,
    'content.tips-paragraph': contentPrompts.buildTipsParagraphPrompt,
    'content.rating-paragraph': contentPrompts.buildRatingParagraphPrompt,
    'content.stream': contentPrompts.buildStreamContentPrompt,

    // Component prompts
    'component.product-card': componentPrompts.buildProductCardPrompt,
    'component.feature-list': componentPrompts.buildFeatureListPrompt,
    'component.cta-box': componentPrompts.buildCtaBoxPrompt,
    'component.comparison-table': componentPrompts.buildComparisonTablePrompt,
    'component.pros-cons': componentPrompts.buildProsConsPrompt,
    'component.rating': componentPrompts.buildRatingPrompt,
    'component.ingredients': componentPrompts.buildIngredientsPrompt,
    'component.instructions': componentPrompts.buildInstructionsPrompt,
    'component.nutrition': componentPrompts.buildNutritionPrompt,
    'component.materials': componentPrompts.buildMaterialsPrompt,
    'component.pro-tips': componentPrompts.buildProTipsPrompt,
    'component.quick-facts': componentPrompts.buildQuickFactsPrompt,
    'component.why-choose-local': componentPrompts.buildWhyChooseLocalPrompt,
    'component.honorable-mentions': componentPrompts.buildHonorableMentionsPrompt,
  }

  // Handle keyword prompts specially (they use article type)
  if (promptId.startsWith('keyword.')) {
    const articleType = promptId.replace('keyword.', '')
    return keywordPrompts.buildKeywordExpansionPrompt({
      seedKeyword: params.seedKeyword as string,
      articleType: articleType as keywordPrompts.ArticleTypeId,
      language: (params.language as string) || 'en-US',
      location: params.location as string,
    })
  }

  const builder = builders[promptId]
  if (!builder) {
    throw new Error(`No builder found for prompt: ${promptId}`)
  }

  return builder(params)
}

/**
 * Helper to get authenticated admin
 */
async function getAuthenticatedAdmin(): Promise<{ userId: string; email: string } | null> {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id || !authSession?.user?.email) {
    return null
  }

  if (!isWhitelabelUser(authSession.user.email)) {
    return null
  }

  return {
    userId: authSession.user.id,
    email: authSession.user.email,
  }
}

/**
 * Generate unique ID for database records
 */
function generateId(): string {
  return `ptr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Single iteration result type
interface IterationResult {
  success: boolean
  output: {
    raw: string
    parsed: unknown
    tokens: { input: number; output: number }
    duration: number
  }
  error: string | null
  historyId: string | null
}

/**
 * POST /api/prompts/test
 * Execute a prompt with a specified provider (supports multiple iterations)
 *
 * Body:
 * - promptId: The prompt ID to test
 * - params: Parameters for the prompt
 * - provider: AI provider (gemini, openai, claude)
 * - overridePrompt: Optional custom prompt override
 * - saveToHistory: Whether to save to history (default: true)
 * - iterations: Number of times to run the test (default: 1, max: 10)
 */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      promptId,
      params,
      provider = 'gemini',
      overridePrompt,
      saveToHistory = true,
      iterations = 1,
    } = body as {
      promptId: string
      params: Record<string, unknown>
      provider?: AIProvider
      overridePrompt?: string
      saveToHistory?: boolean
      iterations?: number
    }

    // Clamp iterations to valid range
    const iterationCount = Math.max(1, Math.min(10, iterations))

    // Validate prompt exists
    const promptDef = getPromptById(promptId)
    if (!promptDef) {
      return NextResponse.json(
        { error: `Prompt not found: ${promptId}` },
        { status: 404 }
      )
    }

    // Validate required params
    const missingParams = promptDef.params
      .filter(p => p.required)
      .filter(p => params[p.name] === undefined || params[p.name] === null || params[p.name] === '')
      .map(p => p.name)

    if (missingParams.length > 0) {
      return NextResponse.json(
        { error: `Missing required parameters: ${missingParams.join(', ')}` },
        { status: 400 }
      )
    }

    // Get model for provider
    const { model, modelId } = getModel(provider)

    // Build prompts
    const systemPrompt = getSystemPrompt(promptDef.category)

    // Process template variables in override prompt (e.g., {{topic}} -> actual value)
    let processedOverride = overridePrompt
    if (overridePrompt) {
      processedOverride = overridePrompt.replace(
        /\{\{(\w+)\}\}/g,
        (match, key) => {
          const value = params[key]
          if (value === undefined || value === null) return match
          if (Array.isArray(value)) return value.join(', ')
          return String(value)
        }
      )
    }

    const userPrompt = processedOverride || buildUserPrompt(promptId, params)

    // Generate batch ID for grouping iterations
    const batchId = iterationCount > 1 ? `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : null

    // Run iterations
    const results: IterationResult[] = []

    for (let i = 0; i < iterationCount; i++) {
      const startTime = Date.now()
      let resultText = ''
      let resultUsage = { input: 0, output: 0 }
      let error: string | null = null

      try {
        const result = await generateText({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          maxOutputTokens: 4096,
          temperature: 0.7,
        })
        resultText = result.text
        resultUsage = {
          input: result.usage?.inputTokens ?? 0,
          output: result.usage?.outputTokens ?? 0,
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }

      const duration = Date.now() - startTime

      // Parse output if JSON
      let parsed: unknown = null
      if (!error && resultText) {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          }
        } catch {
          // Not valid JSON, that's okay for text prompts
        }
      }

      const iterationResult: IterationResult = {
        success: !error,
        output: {
          raw: resultText,
          parsed,
          tokens: {
            input: resultUsage.input,
            output: resultUsage.output,
          },
          duration,
        },
        error,
        historyId: null,
      }

      // Save to history if requested
      if (saveToHistory) {
        try {
          const historyId = generateId()
          await db.insert(promptTestRuns).values({
            id: historyId,
            userId: admin.userId,
            promptId,
            promptName: promptDef.name,
            category: promptDef.category,
            provider,
            model: modelId,
            params: JSON.stringify(params),
            prompt: JSON.stringify({
              system: systemPrompt.substring(0, 1000),
              user: userPrompt,
            }),
            overrideUsed: !!overridePrompt,
            output: JSON.stringify({
              raw: resultText,
              parsed,
            }),
            tokens: JSON.stringify({
              input: resultUsage.input,
              output: resultUsage.output,
            }),
            duration,
            error,
            batchId,
            iterationNumber: i + 1,
          })
          iterationResult.historyId = historyId
        } catch (dbError) {
          console.error('[prompts/test] Failed to save history:', dbError)
        }
      }

      results.push(iterationResult)
    }

    // Calculate aggregate stats
    const successCount = results.filter(r => r.success).length
    const totalDuration = results.reduce((sum, r) => sum + r.output.duration, 0)
    const totalInputTokens = results.reduce((sum, r) => sum + r.output.tokens.input, 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + r.output.tokens.output, 0)

    // Build response
    const response = {
      success: successCount > 0,
      iterations: iterationCount,
      batchId,
      aggregate: {
        avgDuration: Math.round(totalDuration / iterationCount),
        totalDuration,
        avgTokens: {
          input: Math.round(totalInputTokens / iterationCount),
          output: Math.round(totalOutputTokens / iterationCount),
        },
        totalTokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
        successCount,
        failureCount: iterationCount - successCount,
      },
      results,
      prompt: {
        system: systemPrompt.substring(0, 500) + (systemPrompt.length > 500 ? '...' : ''),
        user: userPrompt,
        rendered: userPrompt,
      },
      provider,
      model: modelId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[prompts/test] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to test prompt: ${errorMessage}` },
      { status: 500 }
    )
  }
}
