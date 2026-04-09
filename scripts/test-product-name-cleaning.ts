/**
 * Test script for Product Name Cleaning
 * Run: npx tsx scripts/test-product-name-cleaning.ts
 */

import { cleanProductName } from '../lib/services/product-image-generator';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TEST_TITLES = [
  // 1. Standard messy title
  "Edifier R1280T Powered Bookshelf Speakers - 2.0 Active Near Field Monitors - Studio Monitor Speaker - Wooden Enclosure - 42 Watts RMS",
  
  // 2. All caps with fluff
  "BEST COFFEE MAKER 2024 - PROGRAMMABLE DRIP COFFEE MACHINE WITH GLASS CARAFE - STAINLESS STEEL (12 CUP)",
  
  // 3. Keyword stuffing
  "Gaming Headset for PS4 PS5 Xbox One Switch PC with Noise Cancelling Mic, Deep Bass Stereo Surround Sound, LED Light - Red",
  
  // 4. Weird formatting
  "Apple iPhone 13 Pro, 128GB, Sierra Blue - Unlocked (Renewed Premium)",
  
  // 5. Brand + Model + Specs pileup
  "Sony WH-1000XM5 Wireless Noise Cancelling Headphones, 30 Hours Battery Life, Hands-Free Calling, Alexa Built-in, Black",
  
  // 6. Very long title
  "Instant Pot Duo 7-in-1 Electric Pressure Cooker, Slow Cooker, Rice Cooker, Steamer, Sauté, Yogurt Maker, Warmer & Sterilizer, Includes App With Over 800 Recipes, Stainless Steel, 6 Quart",

  // 7. Pack/Count info
  "Energizer AA Batteries, Max Double A Battery Alkaline, 24 Count (Pack of 1)",
  
  // 8. With weird brackets
  "[Upgraded 2024] Robot Vacuum Cleaner with Mop, 3000Pa Suction, Wi-Fi/App/Alexa Control, Self-Charging (Black)"
];

async function runTests() {
  console.log("🚀 Testing Product Name Cleaning...\n");

  for (const [i, title] of TEST_TITLES.entries()) {
    console.log(`[${i + 1}] Original: "${title.substring(0, 80)}${title.length > 80 ? '...' : ''}"`);
    
    const start = Date.now();
    const cleaned = await cleanProductName(title);
    const duration = Date.now() - start;

    console.log(`    Cleaned:  "${cleaned}"`);
    console.log(`    Time:     ${duration}ms\n`);
    
    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }
}

runTests().catch(console.error);
