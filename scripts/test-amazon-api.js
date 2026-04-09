/**
 * Test script for Amazon Product API
 * Run: node scripts/test-amazon-api.js
 */

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

const RAPIDAPI_HOST = "real-time-amazon-data.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const TEST_QUERIES = [
  "wireless bluetooth speaker",
  "bookshelf speakers",
  "portable speaker waterproof",
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testProductSearch(query, retryCount = 3) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing: "${query}"`);
  console.log("=".repeat(80));

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const url = new URL(`https://${RAPIDAPI_HOST}/search`);
      url.searchParams.set("query", query);
      url.searchParams.set("country", "US");
      url.searchParams.set("page", "1");

      console.log(`\n[Attempt ${attempt}/${retryCount}]`);

      const startTime = Date.now();
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      });
      const duration = Date.now() - startTime;

      console.log(
        `Status: ${response.status} ${response.statusText} (${duration}ms)`,
      );

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.warn(`⚠️  Rate limited (429). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Request failed:`, errorText.substring(0, 300));
        return {
          success: false,
          error: `HTTP ${response.status}`,
          details: errorText.substring(0, 300),
        };
      }

      const data = await response.json();
      console.log(`✅ Request successful!`);
      console.log(`API Status: ${data.status}`);
      console.log(`Total Products: ${data.data?.total_products || 0}`);
      console.log(`Products Returned: ${data.data?.products?.length || 0}`);

      if (data.data?.products?.length > 0) {
        console.log(`\nTop 3 Products:`);
        data.data.products.slice(0, 3).forEach((p, i) => {
          console.log(`\n  ${i + 1}. ${p.product_title?.substring(0, 70)}...`);
          console.log(`     ASIN: ${p.asin}`);
          console.log(`     Price: ${p.product_price || "N/A"}`);
          console.log(
            `     Rating: ${p.product_star_rating || "N/A"} ⭐ (${p.product_num_ratings || 0} reviews)`,
          );
        });

        return {
          success: true,
          productCount: data.data.products.length,
          topProduct: data.data.products[0].product_title?.substring(0, 60),
        };
      } else {
        console.log(`⚠️  No products found`);
        return { success: true, productCount: 0 };
      }
    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      if (attempt < retryCount) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.log(`\n❌ All ${retryCount} attempts failed`);
  return { success: false, error: "All retries exhausted" };
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("AMAZON PRODUCT API TEST");
  console.log("=".repeat(80));

  // Check API key
  if (!RAPIDAPI_KEY) {
    console.error("\n❌ ERROR: RAPIDAPI_KEY not found in .env.local");
    console.error("\nMake sure .env.local contains:");
    console.error("RAPIDAPI_KEY=your-key-here");
    process.exit(1);
  }

  console.log(
    `\n✓ API Key loaded: ${RAPIDAPI_KEY.substring(0, 20)}...${RAPIDAPI_KEY.slice(-4)}`,
  );
  console.log(`✓ API Host: ${RAPIDAPI_HOST}`);
  console.log(`✓ Testing ${TEST_QUERIES.length} queries\n`);

  const results = [];

  for (const query of TEST_QUERIES) {
    const result = await testProductSearch(query);
    results.push({ query, ...result });

    // Wait between queries to avoid rate limiting
    if (TEST_QUERIES.indexOf(query) < TEST_QUERIES.length - 1) {
      console.log(`\n⏳ Waiting 3 seconds before next query...`);
      await sleep(3000);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  results.forEach((r) => {
    const status = r.success ? "✅" : "❌";
    const detail = r.success
      ? r.productCount > 0
        ? `${r.productCount} products - "${r.topProduct}..."`
        : "No products found"
      : `Failed: ${r.error}`;
    console.log(`${status} "${r.query}"`);
    console.log(`   ${detail}`);
  });

  const successCount = results.filter(
    (r) => r.success && r.productCount > 0,
  ).length;
  console.log(
    `\n${successCount}/${results.length} queries returned products\n`,
  );

  if (successCount === 0) {
    console.log("⚠️  DIAGNOSIS:");
    console.log("   1. API key may be invalid or expired");
    console.log('   2. No active subscription to "Real-Time Amazon Data" API');
    console.log("   3. Daily quota exhausted (check RapidAPI dashboard)");
    console.log("   4. API endpoint may have changed");
    console.log(
      "\n   Check: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data",
    );
  } else {
    console.log("✅ API is working correctly!");
  }
}

main().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
