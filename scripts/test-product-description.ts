/**
 * Test script for Product Description Generation
 * Run: npx tsx scripts/test-product-description.ts
 */

import { generateProductDescription } from '../lib/services/product-image-generator';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TEST_CASES = [
  {
    name: "Sony WH-1000XM5",
    features: [
      "Industry-leading noise cancellation optimized to you",
      "Magnificent Sound, engineered to perfection with the new Integrated Processor V1",
      "Crystal clear hands-free calling with 4 beamforming microphones, precise voice pickup, and advanced audio signal processing."
    ]
  },
  {
    name: "Instant Pot Duo",
    features: [
      "7-IN-1 FUNCTIONALITY: Pressure cook, slow cook, rice cooker, yogurt maker, steamer, sauté pan and food warmer.",
      "QUICK ONE-TOUCH COOKING: 13 customizable Smart Programs for pressure cooking ribs, soups, beans, rice, poultry, yogurt, desserts and more.",
      "COOK FAST OR SLOW: Pressure cook delicious one-pot meals up to 70% faster than traditional cooking methods or slow cook your favorite traditional recipes."
    ]
  },
  {
    name: "Very Long Feature List (Fallback Test)",
    features: [
      "This is a very long feature sentence that goes on and on for quite a while to test the truncation logic. It has a first sentence that ends here.",
      "This is the second feature which is also quite long and should hopefully be included if there is space, but might get cut off if the limit is reached. We want to see if it cuts cleanly at the period."
    ]
  }
];

async function runTests() {
  console.log("🚀 Testing Product Description Generation...\n");

  for (const [i, test] of TEST_CASES.entries()) {
    console.log(`[${i + 1}] Product: ${test.name}`);
    
    const start = Date.now();
    const desc = await generateProductDescription(test.name, test.features);
    const duration = Date.now() - start;

    console.log(`    Description: "${desc}"`);
    console.log(`    Length:      ${desc.length} chars`);
    console.log(`    Time:        ${duration}ms\n`);
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

runTests().catch(console.error);