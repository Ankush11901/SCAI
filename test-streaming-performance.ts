/**
 * Performance test script for AI SDK streaming
 * Run with: npx tsx test-streaming-performance.ts
 */

import 'dotenv/config'
import { streamText } from 'ai'
import { getModelWithFallback } from './lib/ai/providers'

async function testOverviewStreaming() {
  console.log('\n🧪 Testing Overview Streaming (100 words)')
  console.log('═'.repeat(60))

  const startTime = Date.now()
  let firstChunkTime: number | null = null
  let chunkCount = 0
  let totalText = ''

  const { model } = getModelWithFallback('gemini', 'fast')

  const stream = streamText({
    model,
    system: 'You are an expert content writer. Write clear, engaging, SEO-optimized content.',
    prompt: `Write a 100-word overview paragraph about "dogs" for an informational article titled "Essential Guide to Caring for Domestic Dogs". Focus on introducing the topic comprehensively.`,
    temperature: 0.7,
  })

  console.log(`⏱️  Stream created at: ${Date.now() - startTime}ms`)

  try {
    for await (const chunk of stream.textStream) {
      if (firstChunkTime === null) {
        firstChunkTime = Date.now()
        console.log(`⚡ First chunk received at: ${firstChunkTime - startTime}ms`)
      }

      totalText += chunk
      chunkCount++

      // Log every 10th chunk
      if (chunkCount % 10 === 0) {
        console.log(`   Chunk ${chunkCount}: "${chunk}" (${Date.now() - startTime}ms)`)
      }
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const timeToFirstChunk = firstChunkTime ? firstChunkTime - startTime : 0
    const streamingTime = firstChunkTime ? endTime - firstChunkTime : totalTime

    console.log('\n📊 Results:')
    console.log(`   Total time: ${totalTime}ms`)
    console.log(`   Time to first chunk: ${timeToFirstChunk}ms`)
    console.log(`   Streaming time: ${streamingTime}ms`)
    console.log(`   Total chunks: ${chunkCount}`)
    console.log(`   Words generated: ${totalText.split(/\s+/).length}`)
    console.log(`   Avg ms per chunk: ${(streamingTime / chunkCount).toFixed(2)}`)
    console.log(`\n📝 Generated text:`)
    console.log(`   ${totalText.substring(0, 200)}...`)

    return {
      totalTime,
      timeToFirstChunk,
      streamingTime,
      chunkCount,
      wordCount: totalText.split(/\s+/).length,
    }
  } catch (error) {
    console.error('❌ Error during streaming:', error)
    throw error
  }
}

async function testSectionStreaming() {
  console.log('\n🧪 Testing Section Streaming (150 words)')
  console.log('═'.repeat(60))

  const startTime = Date.now()
  let firstChunkTime: number | null = null
  let chunkCount = 0
  let totalText = ''

  const { model } = getModelWithFallback('gemini', 'fast')

  const stream = streamText({
    model,
    system: 'You are an expert content writer. Write clear, engaging, SEO-optimized content.',
    prompt: `Write a 150-word section about "Understanding Canine Behavior Patterns" for an article about dogs. Section 1 of 10. Focus on this specific topic without repeating information from other sections.`,
    temperature: 0.7,
  })

  console.log(`⏱️  Stream created at: ${Date.now() - startTime}ms`)

  try {
    for await (const chunk of stream.textStream) {
      if (firstChunkTime === null) {
        firstChunkTime = Date.now()
        console.log(`⚡ First chunk received at: ${firstChunkTime - startTime}ms`)
      }

      totalText += chunk
      chunkCount++

      // Log every 10th chunk
      if (chunkCount % 10 === 0) {
        console.log(`   Chunk ${chunkCount}: "${chunk}" (${Date.now() - startTime}ms)`)
      }
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const timeToFirstChunk = firstChunkTime ? firstChunkTime - startTime : 0
    const streamingTime = firstChunkTime ? endTime - firstChunkTime : totalTime

    console.log('\n📊 Results:')
    console.log(`   Total time: ${totalTime}ms`)
    console.log(`   Time to first chunk: ${timeToFirstChunk}ms`)
    console.log(`   Streaming time: ${streamingTime}ms`)
    console.log(`   Total chunks: ${chunkCount}`)
    console.log(`   Words generated: ${totalText.split(/\s+/).length}`)
    console.log(`   Avg ms per chunk: ${(streamingTime / chunkCount).toFixed(2)}`)

    return {
      totalTime,
      timeToFirstChunk,
      streamingTime,
      chunkCount,
      wordCount: totalText.split(/\s+/).length,
    }
  } catch (error) {
    console.error('❌ Error during streaming:', error)
    throw error
  }
}

async function runPerformanceTest() {
  console.log('🚀 AI SDK Streaming Performance Test')
  console.log('Testing Gemini 2.0 Flash streaming speed')
  console.log('═'.repeat(60))

  try {
    // Test 1: Overview
    const overviewResults = await testOverviewStreaming()

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Test 2: Section
    const sectionResults = await testSectionStreaming()

    // Summary
    console.log('\n📈 Summary')
    console.log('═'.repeat(60))
    console.log('\nOverview (100 words):')
    console.log(`   ⏱️  ${overviewResults.totalTime}ms total`)
    console.log(`   ⚡ ${overviewResults.timeToFirstChunk}ms to first chunk`)
    console.log(`   📦 ${overviewResults.chunkCount} chunks`)

    console.log('\nSection (150 words):')
    console.log(`   ⏱️  ${sectionResults.totalTime}ms total`)
    console.log(`   ⚡ ${sectionResults.timeToFirstChunk}ms to first chunk`)
    console.log(`   📦 ${sectionResults.chunkCount} chunks`)

    console.log('\n💡 Insights:')
    if (overviewResults.timeToFirstChunk > 2000) {
      console.log('   ⚠️  High latency to first chunk (>2s) - Model initialization slow')
    }
    if (overviewResults.totalTime > 10000) {
      console.log('   ⚠️  Slow overall generation (>10s) - Consider faster model or caching')
    }
    if (overviewResults.timeToFirstChunk < 1000 && overviewResults.streamingTime > 5000) {
      console.log('   ⚠️  Fast to start but slow streaming - Network or model speed issue')
    }
    if (overviewResults.timeToFirstChunk < 1000 && overviewResults.streamingTime < 3000) {
      console.log('   ✅ Good performance! Bottleneck is likely in orchestration layer')
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
runPerformanceTest()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
