/**
 * Test script for Product Inference Engine
 * Run: npx tsx scripts/test-product-inference.ts
 */

import { inferProductCategories, type ProductCategory } from '../lib/services/product-inference';
import fs from 'fs';
import path from 'path';

// Diverse set of prompts to test the inference engine
const TEST_PROMPTS = [
  // 1. General Categories
  "best coffee makers for small kitchens",
  "top rated gaming laptops 2024",
  "essential camping gear for beginners",

  // 2. Specific Brand/Focus (Testing our new feature)
  "best running shoes focusing on Nike and Adidas",
  "smartphones comparing iPhone vs Samsung",
  "gaming headsets specifically Razer and Logitech",

  // 3. Niche / Long-tail
  "gifts for 7 year old boys who like dinosaurs",
  "ergonomic office chairs for tall people with back pain",
  "vegan protein powders without soy",

  // 4. Abstract / Solution-oriented
  "how to improve sleep quality",
  "best setup for podcasting at home",
  "tools for fixing a leaky faucet",

  // 5. Budget constraints
  "best budget wireless earbuds under $50",
  "luxury watches for men",
  "affordable skincare for acne prone skin"
];

async function runTests() {
  console.log("🚀 Starting Product Inference Tests...\n");
  
  const results: any[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-') ;
  const outputDir = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (const [index, topic] of TEST_PROMPTS.entries()) {
    console.log(`[${index + 1}/${TEST_PROMPTS.length}] Testing: "${topic}"...`);
    
    try {
      const startTime = Date.now();
      const result = await inferProductCategories(topic, 3, 'statement');
      const duration = Date.now() - startTime;
      
      const entry = {
        topic,
        duration_ms: duration,
        article_focus: result.articleFocus,
        target_audience: result.targetAudience,
        h1_suggestion: result.h1Suggestion,
        categories: result.categories.map(c => ({
          badge: c.badge,
          query: c.searchQuery,
          alt_query: c.alternateQuery,
          reason: c.reason
        }))
      };

      results.push(entry);
      
      // Console summary
      console.log(`   ✅ Inferred ${result.categories.length} categories in ${duration}ms`);
      result.categories.forEach(c => {
        console.log(`      - [${c.badge}] "${c.searchQuery}"`);
      });
      console.log("");
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({
        topic,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Small delay to avoid rate limits if using real API
    await new Promise(r => setTimeout(r, 1000));
  }

  const outputPath = path.join(outputDir, `inference-test-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log("════════════════════════════════════════════════════════════");
  console.log(`✅ Tests complete! Results saved to:\n`);
  console.log(outputPath);
  console.log("════════════════════════════════════════════════════════════");
}

// Check for .env.local to ensure API keys are present
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠️  WARNING: No AI API keys found in .env.local. Tests may fail or fallback to mock data.");
}

runTests().catch(console.error);
