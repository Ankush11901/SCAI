/**
 * Comprehensive AI Model Benchmark
 * Tests different models and configurations to find optimal performance
 * 
 * Run with: $env:GOOGLE_GENERATIVE_AI_API_KEY='YOUR_KEY'; npx tsx test-model-benchmark.ts
 */

import { streamText, generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const PROMPT = `Write a 100-word paragraph about dogs for an informational article. Be concise.`
const SYSTEM = 'You are a content writer. Write clear, engaging content.'

// Models to test
const MODELS_TO_TEST = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-3-flash-preview',
]

interface BenchmarkResult {
  model: string
  timeToFirstChunk: number
  totalTime: number
  streamingTime: number
  chunks: number
  words: number
  error?: string
}

async function benchmarkStreamModel(modelId: string, google: ReturnType<typeof createGoogleGenerativeAI>): Promise<BenchmarkResult> {
  const startTime = Date.now()
  let firstChunkTime: number | null = null
  let chunks = 0
  let text = ''

  try {
    const stream = streamText({
      model: google(modelId),
      system: SYSTEM,
      prompt: PROMPT,
      temperature: 0.7,
    })

    for await (const chunk of stream.textStream) {
      if (firstChunkTime === null) {
        firstChunkTime = Date.now()
      }
      text += chunk
      chunks++
    }

    const endTime = Date.now()
    const timeToFirstChunk = firstChunkTime ? firstChunkTime - startTime : 0

    return {
      model: modelId,
      timeToFirstChunk,
      totalTime: endTime - startTime,
      streamingTime: firstChunkTime ? endTime - firstChunkTime : 0,
      chunks,
      words: text.split(/\s+/).filter(w => w).length,
    }
  } catch (error: any) {
    return {
      model: modelId,
      timeToFirstChunk: 0,
      totalTime: Date.now() - startTime,
      streamingTime: 0,
      chunks: 0,
      words: 0,
      error: error.message?.substring(0, 80) || 'Unknown error',
    }
  }
}

async function benchmarkGenerateModel(modelId: string, google: ReturnType<typeof createGoogleGenerativeAI>): Promise<BenchmarkResult> {
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: google(modelId),
      system: SYSTEM,
      prompt: PROMPT,
      temperature: 0.7,
    })

    const endTime = Date.now()
    const words = result.text.split(/\s+/).filter(w => w).length

    return {
      model: `${modelId} (non-stream)`,
      timeToFirstChunk: endTime - startTime, // All at once
      totalTime: endTime - startTime,
      streamingTime: 0,
      chunks: 1,
      words,
    }
  } catch (error: any) {
    return {
      model: `${modelId} (non-stream)`,
      timeToFirstChunk: 0,
      totalTime: Date.now() - startTime,
      streamingTime: 0,
      chunks: 0,
      words: 0,
      error: error.message?.substring(0, 80) || 'Unknown error',
    }
  }
}

function formatMs(ms: number): string {
  if (ms === 0) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

async function runBenchmark() {
  console.log('🧪 AI Model Benchmark')
  console.log('═'.repeat(80))
  console.log(`Testing ${MODELS_TO_TEST.length} models with streaming...`)
  console.log()

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set')
    process.exit(1)
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const results: BenchmarkResult[] = []

  // Test each model with streaming
  for (const modelId of MODELS_TO_TEST) {
    console.log(`⏳ Testing: ${modelId}...`)
    const result = await benchmarkStreamModel(modelId, google)
    results.push(result)

    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`)
    } else {
      console.log(`   ✅ First chunk: ${formatMs(result.timeToFirstChunk)}, Total: ${formatMs(result.totalTime)}`)
    }

    // Brief pause between tests
    await new Promise(r => setTimeout(r, 500))
  }

  // Also test one model without streaming for comparison
  console.log(`\n⏳ Testing: gemini-2.0-flash (non-streaming)...`)
  const nonStreamResult = await benchmarkGenerateModel('gemini-2.0-flash', google)
  results.push(nonStreamResult)
  if (nonStreamResult.error) {
    console.log(`   ❌ Error: ${nonStreamResult.error}`)
  } else {
    console.log(`   ✅ Total: ${formatMs(nonStreamResult.totalTime)}`)
  }

  // Summary table
  console.log('\n')
  console.log('📊 Results Summary')
  console.log('═'.repeat(80))
  console.log()
  console.log('Model'.padEnd(35) + 'First Chunk'.padStart(12) + 'Total'.padStart(12) + 'Streaming'.padStart(12) + 'Words'.padStart(8))
  console.log('─'.repeat(80))

  // Sort by time to first chunk
  const sorted = results
    .filter(r => !r.error)
    .sort((a, b) => a.timeToFirstChunk - b.timeToFirstChunk)

  for (const r of sorted) {
    console.log(
      r.model.padEnd(35) +
      formatMs(r.timeToFirstChunk).padStart(12) +
      formatMs(r.totalTime).padStart(12) +
      formatMs(r.streamingTime).padStart(12) +
      String(r.words).padStart(8)
    )
  }

  // Errors
  const errors = results.filter(r => r.error)
  if (errors.length > 0) {
    console.log('\n❌ Failed Models:')
    for (const r of errors) {
      console.log(`   ${r.model}: ${r.error}`)
    }
  }

  // Recommendation
  console.log('\n')
  console.log('💡 Recommendations')
  console.log('═'.repeat(80))

  if (sorted.length > 0) {
    const fastest = sorted[0]
    console.log(`\n🏆 Fastest to first chunk: ${fastest.model}`)
    console.log(`   Time to first chunk: ${formatMs(fastest.timeToFirstChunk)}`)
    console.log(`   Total time: ${formatMs(fastest.totalTime)}`)

    if (fastest.timeToFirstChunk > 3000) {
      console.log('\n⚠️  All models have >3s latency to first chunk.')
      console.log('   This is normal for Gemini models due to:')
      console.log('   - Model loading/cold start')
      console.log('   - Network latency to Google APIs')
      console.log('   - Safety checks')
      console.log('\n   Possible optimizations:')
      console.log('   1. Use parallel generation for independent sections')
      console.log('   2. Show a loading state during first-chunk wait')
      console.log('   3. Try OpenAI or Claude (may have lower latency)')
      console.log('   4. Use model warmup/keep-alive techniques')
    }
  }
}

runBenchmark().catch(console.error)
