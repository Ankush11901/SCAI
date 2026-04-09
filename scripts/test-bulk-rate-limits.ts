/**
 * Bulk Generation Rate Limiting Test Script
 * 
 * Tests the parallel bulk generation system to determine:
 * - Maximum safe articles per batch
 * - Maximum concurrent users
 * - AI provider rate limit thresholds (OpenAI primary, Gemini backup)
 * - Average completion times and throughput
 * - Error patterns and recovery behavior
 * 
 * AI Provider Fallback Strategy (from unified-orchestrator.ts):
 *   PRIMARY: OpenAI (gpt-4o-mini) - 10,000 RPM limit (~166 req/sec)
 *   FALLBACK: Gemini (gemini-2.0-flash) - 1,000 RPM limit (~16.67 req/sec)
 * 
 * The system tries OpenAI first for all content generation. If OpenAI fails
 * (rate limit, timeout, error), it automatically retries with Gemini. This means
 * tests will primarily hit OpenAI rate limits, with Gemini acting as backup.
 * 
 * Prerequisites:
 *   - Dev server running: `npm run dev`
 *   - Trigger.dev CLI running: `npx trigger.dev@latest dev`
 *   - Signed in to the application in your browser
 * 
 * Usage:
 *   1. Copy your session cookie from browser DevTools
 *   2. Run: SESSION_COOKIE="your-cookie-here" npx tsx scripts/test-bulk-rate-limits.ts all
 *   
 *   Or for specific phases:
 *   SESSION_COOKIE="..." npx tsx scripts/test-bulk-rate-limits.ts single
 *   SESSION_COOKIE="..." npx tsx scripts/test-bulk-rate-limits.ts multi
 *   SESSION_COOKIE="..." npx tsx scripts/test-bulk-rate-limits.ts sustained
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { bulkJobs, bulkJobArticles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SESSION_COOKIE = process.env.SESSION_COOKIE;
const CLEANUP_ON_START = true;
const CLEANUP_ON_END = true;
const DELAY_BETWEEN_TESTS = 5000; // 5 seconds between tests

// Test phases
interface TestResult {
  testName: string;
  phase: string;
  articleCount: number;
  userCount: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  status: "pending" | "completed" | "failed" | "timeout";
  jobIds: string[];
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  errors: Array<{
    jobId: string;
    error: string;
    category: "RATE_LIMIT" | "TIMEOUT" | "DATABASE" | "TRIGGER" | "OTHER";
  }>;
  metrics?: {
    avgTimePerArticle: number;
    avgTimePerJob: number;
    throughput: number; // articles per minute
    successRate: number;
  };
}

interface TestSuite {
  startTime: Date;
  endTime?: Date;
  totalTests: number;
  completedTests: number;
  results: TestResult[];
  summary?: {
    totalArticles: number;
    successfulArticles: number;
    failedArticles: number;
    avgSuccessRate: number;
    avgThroughput: number;
    recommendations: string[];
  };
}

// Generate test CSV data for bulk API
function generateTestCsvData(articleCount: number) {
  const keywords = [
    "artificial intelligence benefits",
    "machine learning applications", 
    "data science careers",
    "cloud computing security",
    "cybersecurity best practices",
    "web development trends",
    "mobile app development",
    "blockchain technology",
    "digital marketing strategies",
    "remote work productivity",
  ];
  
  const articleTypes = ["informational", "product-review", "how-to", "listicle", "comparison"];
  
  return Array.from({ length: articleCount }, (_, i) => ({
    keyword: keywords[i % keywords.length],
    articleType: articleTypes[i % articleTypes.length],
  }));
}

// Check if session cookie is provided
function validateSessionCookie() {
  if (!SESSION_COOKIE) {
    console.error("\n❌ SESSION_COOKIE environment variable is required!");
    console.log("\n📝 How to get your session cookie:");
    console.log("   1. Open your browser and sign in to the application");
    console.log("   2. Open DevTools (F12)");
    console.log("   3. Go to Application > Cookies > http://localhost:3000");
    console.log("   4. Copy the value of 'better-auth.session_token' cookie");
    console.log("\n   Then run:");
    console.log('   SESSION_COOKIE="your-cookie" npx tsx scripts/test-bulk-rate-limits.ts all\n');
    process.exit(1);
  }
}

// Get recent bulk jobs (for monitoring)
async function getRecentBulkJobs(limit: number = 20) {
  return await db
    .select()
    .from(bulkJobs)
    .orderBy(desc(bulkJobs.createdAt))
    .limit(limit);
}

// Cleanup old test data (optional - just removes failed/pending jobs)
async function cleanupTestData() {
  if (!CLEANUP_ON_START) return;
  
  console.log("\n🧹 Cleaning up old test jobs...");
  
  const recentJobs = await getRecentBulkJobs(50);
  const oldPendingJobs = recentJobs.filter(
    (job) => (job.status === "pending" || job.status === "failed") && 
    job.createdAt && job.createdAt < new Date(Date.now() - 60 * 60 * 1000) // Older than 1 hour
  );
  
  if (oldPendingJobs.length === 0) {
    console.log("✅ No old test jobs to clean");
    return;
  }
  
  // Delete articles first (foreign key constraint)
  for (const job of oldPendingJobs) {
    await db.delete(bulkJobArticles).where(eq(bulkJobArticles.bulkJobId, job.id));
    await db.delete(bulkJobs).where(eq(bulkJobs.id, job.id));
  }
  
  console.log(`✅ Cleaned up ${oldPendingJobs.length} old test jobs`);
}

// Trigger bulk job via API (using session cookie)
async function triggerBulkJob(
  articleCount: number,
  testName: string
): Promise<{ jobId: string; success: boolean; error?: string }> {
  try {
    const csvData = generateTestCsvData(articleCount);
    
    const response = await fetch(`${API_BASE_URL}/api/bulk/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `better-auth.session_token=${SESSION_COOKIE}`,
      },
      body: JSON.stringify({
        mode: "csv",
        csvData,
        variations: ["statement"], // Use single variation for testing
        settings: {
          skipImages: true, // Skip images for faster testing
          targetWordCount: 1000,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        jobId: "",
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }
    
    const data = await response.json();
    return {
      jobId: data.jobId || "",
      success: true,
    };
  } catch (error: any) {
    return {
      jobId: "",
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// Helper: Query database with retry logic
async function queryJobWithRetry(jobId: string, maxRetries: number = 3): Promise<any> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const [job] = await db
        .select()
        .from(bulkJobs)
        .where(eq(bulkJobs.id, jobId))
        .limit(1);
      return job;
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection/timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s
        console.log(`⚠️  Database connection error, retry ${attempt + 1}/${maxRetries} in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Non-retryable error
      throw error;
    }
  }
  
  throw lastError || new Error('Failed to query job after retries');
}

// Monitor job completion
async function monitorJobs(
  jobIds: string[],
  timeoutMs: number = 600000 // 10 minutes default
): Promise<{
  completed: string[];
  failed: string[];
  timeout: string[];
}> {
  const startTime = Date.now();
  const completed: string[] = [];
  const failed: string[] = [];
  const pending = new Set(jobIds);
  
  console.log(`\n⏳ Monitoring ${jobIds.length} jobs (timeout: ${timeoutMs / 1000}s)...`);
  
  while (pending.size > 0 && Date.now() - startTime < timeoutMs) {
    for (const jobId of Array.from(pending)) {
      let job;
      try {
        job = await queryJobWithRetry(jobId);
      } catch (error: any) {
        console.log(`⚠️  Job ${jobId} query failed: ${error.message}`);
        pending.delete(jobId);
        failed.push(jobId);
        continue;
      }
      
      if (!job) {
        console.log(`⚠️  Job ${jobId} not found in database`);
        pending.delete(jobId);
        failed.push(jobId);
        continue;
      }
      
      if (job.status === "completed") {
        console.log(`✅ Job ${jobId} completed (${job.completedArticles}/${job.totalArticles} articles)`);
        completed.push(jobId);
        pending.delete(jobId);
      } else if (job.status === "failed") {
        console.log(`❌ Job ${jobId} failed`);
        failed.push(jobId);
        pending.delete(jobId);
      }
    }
    
    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds (reduced DB load)
    }
  }
  
  const timeout = Array.from(pending);
  if (timeout.length > 0) {
    console.log(`⏱️  ${timeout.length} jobs timed out`);
  }
  
  return { completed, failed, timeout };
}

// Categorize error
function categorizeError(error: string): TestResult["errors"][0]["category"] {
  const errorLower = error.toLowerCase();
  
  if (
    errorLower.includes("429") ||
    errorLower.includes("rate limit") ||
    errorLower.includes("too many requests")
  ) {
    return "RATE_LIMIT";
  }
  
  if (
    errorLower.includes("timeout") ||
    errorLower.includes("timed out") ||
    errorLower.includes("deadline")
  ) {
    return "TIMEOUT";
  }
  
  if (
    errorLower.includes("database") ||
    errorLower.includes("libsql") ||
    errorLower.includes("turso")
  ) {
    return "DATABASE";
  }
  
  if (
    errorLower.includes("trigger") ||
    errorLower.includes("concurrency") ||
    errorLower.includes("batch")
  ) {
    return "TRIGGER";
  }
  
  return "OTHER";
}

// Calculate metrics
function calculateMetrics(result: TestResult): TestResult["metrics"] {
  if (!result.durationMs) return undefined;
  
  const totalArticles = result.articleCount * result.userCount;
  const avgTimePerArticle = result.durationMs / totalArticles;
  const avgTimePerJob = result.durationMs / result.userCount;
  const throughput = (totalArticles / result.durationMs) * 60000; // per minute
  const successRate = (result.successCount / totalArticles) * 100;
  
  return {
    avgTimePerArticle,
    avgTimePerJob,
    throughput,
    successRate,
  };
}

// Phase 1: Single User Tests
async function runSingleUserTests(): Promise<TestResult[]> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 1: SINGLE USER TESTS");
  console.log("=".repeat(60));
  
  const articleCounts = [5, 10, 20, 30];
  const results: TestResult[] = [];
  
  for (const count of articleCounts) {
    console.log(`\n📊 Testing ${count} articles (single user)...`);
    
    const result: TestResult = {
      testName: `single-user-${count}-articles`,
      phase: "Phase 1: Single User",
      articleCount: count,
      userCount: 1,
      startTime: new Date(),
      status: "pending",
      jobIds: [],
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      errors: [],
    };
    
    // Trigger job
    const { jobId, success, error } = await triggerBulkJob(
      count,
      result.testName
    );
    
    if (!success || !jobId) {
      result.status = "failed";
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - result.startTime.getTime();
      result.failureCount = count;
      result.errors.push({
        jobId: "",
        error: error || "Unknown error",
        category: categorizeError(error || ""),
      });
      results.push(result);
      console.log(`❌ Failed to start job: ${error}`);
      continue;
    }
    
    result.jobIds.push(jobId);
    
    // Monitor completion
    const { completed, failed, timeout } = await monitorJobs([jobId], 600000);
    
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();
    
    if (completed.length > 0) {
      const [job] = await db
        .select()
        .from(bulkJobs)
        .where(eq(bulkJobs.id, jobId))
        .limit(1);
      
      result.status = "completed";
      result.successCount = job?.completedArticles || 0;
      result.failureCount = job?.failedArticles || 0;
    } else if (failed.length > 0) {
      result.status = "failed";
      result.failureCount = count;
    } else if (timeout.length > 0) {
      result.status = "timeout";
      result.timeoutCount = count;
    }
    
    result.metrics = calculateMetrics(result);
    results.push(result);
    
    // Print summary
    console.log(`\n📈 Results:`);
    console.log(`  Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`  Success: ${result.successCount}/${count}`);
    console.log(`  Success Rate: ${result.metrics?.successRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.metrics?.throughput.toFixed(2)} articles/min`);
    
    // Delay before next test
    if (articleCounts.indexOf(count) < articleCounts.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_TESTS / 1000}s before next test...`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }
  
  return results;
}

// Phase 2: Multi-User Tests
async function runMultiUserTests(): Promise<TestResult[]> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 2: MULTI-USER TESTS");
  console.log("=".repeat(60));
  
  const userCounts = [2, 3, 5];
  const articlesPerUser = 10;
  const results: TestResult[] = [];
  
  for (const userCount of userCounts) {
    console.log(`\n📊 Testing ${userCount} users × ${articlesPerUser} articles...`);
    
    const result: TestResult = {
      testName: `multi-user-${userCount}x${articlesPerUser}`,
      phase: "Phase 2: Multi-User",
      articleCount: articlesPerUser,
      userCount: userCount,
      startTime: new Date(),
      status: "pending",
      jobIds: [],
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      errors: [],
    };
    
    // Trigger multiple jobs simultaneously
    const triggerPromises = Array.from({ length: userCount }, (_, i) =>
      triggerBulkJob(articlesPerUser, `${result.testName}-user${i + 1}`)
    );
    
    const triggerResults = await Promise.all(triggerPromises);
    
    // Check for failures
    const jobIds = triggerResults
      .filter((r) => r.success && r.jobId)
      .map((r) => r.jobId);
    
    const failedTriggers = triggerResults.filter((r) => !r.success);
    
    if (failedTriggers.length > 0) {
      failedTriggers.forEach((ft) => {
        result.errors.push({
          jobId: "",
          error: ft.error || "Unknown error",
          category: categorizeError(ft.error || ""),
        });
      });
    }
    
    result.jobIds = jobIds;
    
    if (jobIds.length === 0) {
      result.status = "failed";
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - result.startTime.getTime();
      result.failureCount = articlesPerUser * userCount;
      results.push(result);
      console.log(`❌ All jobs failed to start`);
      continue;
    }
    
    // Monitor all jobs
    const { completed, failed, timeout } = await monitorJobs(jobIds, 900000); // 15 min timeout
    
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();
    
    // Collect results from all jobs
    for (const jobId of completed) {
      const [job] = await db
        .select()
        .from(bulkJobs)
        .where(eq(bulkJobs.id, jobId))
        .limit(1);
      
      if (job) {
        result.successCount += job.completedArticles || 0;
        result.failureCount += job.failedArticles || 0;
      }
    }
    
    result.failureCount += failed.length * articlesPerUser;
    result.timeoutCount = timeout.length * articlesPerUser;
    
    if (completed.length === jobIds.length) {
      result.status = "completed";
    } else if (timeout.length > 0) {
      result.status = "timeout";
    } else {
      result.status = "failed";
    }
    
    result.metrics = calculateMetrics(result);
    results.push(result);
    
    // Print summary
    const totalArticles = articlesPerUser * userCount;
    console.log(`\n📈 Results:`);
    console.log(`  Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`  Success: ${result.successCount}/${totalArticles}`);
    console.log(`  Success Rate: ${result.metrics?.successRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.metrics?.throughput.toFixed(2)} articles/min`);
    console.log(`  Completed Jobs: ${completed.length}/${jobIds.length}`);
    
    // Delay before next test
    if (userCounts.indexOf(userCount) < userCounts.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_TESTS / 1000}s before next test...`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }
  
  return results;
}

// Phase 3: Sustained Load Test
async function runSustainedLoadTest(): Promise<TestResult[]> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 3: SUSTAINED LOAD TEST");
  console.log("=".repeat(60));
  
  const waves = 3;
  const articlesPerWave = 15;
  const delayBetweenWaves = 30000; // 30 seconds
  
  console.log(`\n📊 Testing ${waves} waves × ${articlesPerWave} articles...`);
  console.log(`   Wave interval: ${delayBetweenWaves / 1000}s`);
  
  const results: TestResult[] = [];
  const allJobIds: string[] = [];
  
  for (let wave = 0; wave < waves; wave++) {
    console.log(`\n🌊 Wave ${wave + 1}/${waves}...`);
    
    const result: TestResult = {
      testName: `sustained-load-wave${wave + 1}`,
      phase: "Phase 3: Sustained Load",
      articleCount: articlesPerWave,
      userCount: 1,
      startTime: new Date(),
      status: "pending",
      jobIds: [],
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      errors: [],
    };
    
    const { jobId, success, error } = await triggerBulkJob(
      articlesPerWave,
      result.testName
    );
    
    if (!success || !jobId) {
      result.status = "failed";
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - result.startTime.getTime();
      result.failureCount = articlesPerWave;
      result.errors.push({
        jobId: "",
        error: error || "Unknown error",
        category: categorizeError(error || ""),
      });
      results.push(result);
      console.log(`❌ Wave ${wave + 1} failed to start: ${error}`);
      
      // Still wait before next wave
      if (wave < waves - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenWaves));
      }
      continue;
    }
    
    result.jobIds.push(jobId);
    allJobIds.push(jobId);
    
    console.log(`✅ Wave ${wave + 1} started: ${jobId}`);
    
    // Don't wait for completion, move to next wave
    if (wave < waves - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenWaves));
    }
  }
  
  // Now monitor all jobs together
  console.log(`\n⏳ Monitoring all ${allJobIds.length} waves...`);
  const { completed, failed, timeout } = await monitorJobs(allJobIds, 1200000); // 20 min
  
  // Update results for each wave
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const jobId = result.jobIds[0];
    
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();
    
    if (completed.includes(jobId)) {
      const [job] = await db
        .select()
        .from(bulkJobs)
        .where(eq(bulkJobs.id, jobId))
        .limit(1);
      
      result.status = "completed";
      result.successCount = job?.completedArticles || 0;
      result.failureCount = job?.failedArticles || 0;
    } else if (failed.includes(jobId)) {
      result.status = "failed";
      result.failureCount = articlesPerWave;
    } else if (timeout.includes(jobId)) {
      result.status = "timeout";
      result.timeoutCount = articlesPerWave;
    }
    
    result.metrics = calculateMetrics(result);
  }
  
  // Print summary
  const totalArticles = waves * articlesPerWave;
  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);
  const avgSuccessRate = (totalSuccess / totalArticles) * 100;
  
  console.log(`\n📈 Sustained Load Summary:`);
  console.log(`  Total Articles: ${totalArticles}`);
  console.log(`  Successful: ${totalSuccess}`);
  console.log(`  Failed: ${totalFailure}`);
  console.log(`  Success Rate: ${avgSuccessRate.toFixed(2)}%`);
  console.log(`  Completed Waves: ${completed.length}/${waves}`);
  
  return results;
}

// Generate final summary and recommendations
function generateSummary(suite: TestSuite): TestSuite["summary"] {
  const totalArticles = suite.results.reduce(
    (sum, r) => sum + r.articleCount * r.userCount,
    0
  );
  const successfulArticles = suite.results.reduce(
    (sum, r) => sum + r.successCount,
    0
  );
  const failedArticles = suite.results.reduce(
    (sum, r) => sum + r.failureCount + r.timeoutCount,
    0
  );
  
  const completedResults = suite.results.filter((r) => r.metrics);
  const avgSuccessRate =
    completedResults.reduce((sum, r) => sum + (r.metrics?.successRate || 0), 0) /
    completedResults.length;
  const avgThroughput =
    completedResults.reduce((sum, r) => sum + (r.metrics?.throughput || 0), 0) /
    completedResults.length;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // Error analysis
  const errorCategories = suite.results.flatMap((r) => r.errors);
  const rateLimitErrors = errorCategories.filter((e) => e.category === "RATE_LIMIT").length;
  const timeoutErrors = errorCategories.filter((e) => e.category === "TIMEOUT").length;
  const databaseErrors = errorCategories.filter((e) => e.category === "DATABASE").length;
  const triggerErrors = errorCategories.filter((e) => e.category === "TRIGGER").length;
  
  if (rateLimitErrors > 0) {
    recommendations.push(
      `⚠️  RATE LIMITING: ${rateLimitErrors} rate limit errors detected. Check if hitting OpenAI (10K RPM) or Gemini (1K RPM) limits. Implement retry with exponential backoff.`
    );
  }
  
  if (timeoutErrors > 0) {
    recommendations.push(
      `⚠️  TIMEOUTS: ${timeoutErrors} timeout errors. Consider increasing timeout or optimizing generation speed.`
    );
  }
  
  if (databaseErrors > 0) {
    recommendations.push(
      `⚠️  DATABASE: ${databaseErrors} database errors. Check Turso connection limits and query optimization.`
    );
  }
  
  if (triggerErrors > 0) {
    recommendations.push(
      `⚠️  TRIGGER.DEV: ${triggerErrors} Trigger.dev errors. May be hitting concurrency limits (Free: 1 batch, Hobby: 10).`
    );
  }
  
  // Success rate analysis
  if (avgSuccessRate >= 95) {
    recommendations.push(`✅ EXCELLENT: ${avgSuccessRate.toFixed(2)}% success rate. System is performing well.`);
  } else if (avgSuccessRate >= 80) {
    recommendations.push(`⚠️  GOOD: ${avgSuccessRate.toFixed(2)}% success rate. Some improvements needed.`);
  } else {
    recommendations.push(`❌ POOR: ${avgSuccessRate.toFixed(2)}% success rate. Significant issues detected.`);
  }
  
  // Throughput analysis
  if (avgThroughput >= 30) {
    recommendations.push(`✅ High throughput: ${avgThroughput.toFixed(2)} articles/min. Meeting target.`);
  } else if (avgThroughput >= 15) {
    recommendations.push(`⚠️  Moderate throughput: ${avgThroughput.toFixed(2)} articles/min. Room for improvement.`);
  } else {
    recommendations.push(`❌ Low throughput: ${avgThroughput.toFixed(2)} articles/min. Below target.`);
  }
  
  // Scaling recommendations
  const multiUserResults = suite.results.filter((r) => r.userCount > 1);
  if (multiUserResults.length > 0) {
    const multiUserFailures = multiUserResults.filter((r) => r.status === "failed").length;
    if (multiUserFailures > 0) {
      recommendations.push(
        `⚠️  SCALING: ${multiUserFailures}/${multiUserResults.length} multi-user tests failed. Implement user-level rate limiting.`
      );
    } else {
      recommendations.push(
        `✅ SCALING: Multi-user tests passed. System handles concurrent users well.`
      );
    }
  }
  
  // Safe batch size
  const singleUserResults = suite.results.filter((r) => r.userCount === 1 && r.status === "completed");
  if (singleUserResults.length > 0) {
    const maxSuccessful = Math.max(...singleUserResults.map((r) => r.articleCount));
    recommendations.push(`📊 SAFE BATCH SIZE: Up to ${maxSuccessful} articles per batch tested successfully.`);
  }
  
  return {
    totalArticles,
    successfulArticles,
    failedArticles,
    avgSuccessRate,
    avgThroughput,
    recommendations,
  };
}

// Print final report
function printReport(suite: TestSuite) {
  console.log("\n" + "=".repeat(60));
  console.log("FINAL REPORT");
  console.log("=".repeat(60));
  
  const duration = suite.endTime
    ? suite.endTime.getTime() - suite.startTime.getTime()
    : 0;
  
  console.log(`\n⏱️  Total Test Duration: ${(duration / 1000 / 60).toFixed(2)} minutes`);
  console.log(`📊 Tests Completed: ${suite.completedTests}/${suite.totalTests}`);
  
  if (suite.summary) {
    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Articles: ${suite.summary.totalArticles}`);
    console.log(`  Successful: ${suite.summary.successfulArticles}`);
    console.log(`  Failed: ${suite.summary.failedArticles}`);
    console.log(`  Success Rate: ${suite.summary.avgSuccessRate.toFixed(2)}%`);
    console.log(`  Avg Throughput: ${suite.summary.avgThroughput.toFixed(2)} articles/min`);
    
    console.log(`\n💡 Recommendations:`);
    suite.summary.recommendations.forEach((rec) => console.log(`  ${rec}`));
  }
  
  console.log(`\n📋 Detailed Results by Phase:`);
  
  const phases = [...new Set(suite.results.map((r) => r.phase))];
  phases.forEach((phase) => {
    const phaseResults = suite.results.filter((r) => r.phase === phase);
    console.log(`\n  ${phase}:`);
    
    phaseResults.forEach((r) => {
      const status =
        r.status === "completed"
          ? "✅"
          : r.status === "failed"
          ? "❌"
          : r.status === "timeout"
          ? "⏱️"
          : "⏳";
      
      console.log(`    ${status} ${r.testName}`);
      console.log(`       Articles: ${r.successCount}/${r.articleCount * r.userCount} successful`);
      
      if (r.metrics) {
        console.log(`       Duration: ${(r.durationMs! / 1000).toFixed(2)}s`);
        console.log(`       Success Rate: ${r.metrics.successRate.toFixed(2)}%`);
        console.log(`       Throughput: ${r.metrics.throughput.toFixed(2)} articles/min`);
      }
      
      if (r.errors.length > 0) {
        console.log(`       Errors: ${r.errors.length}`);
        r.errors.forEach((e) => {
          console.log(`         [${e.category}] ${e.error.substring(0, 60)}...`);
        });
      }
    });
  });
  
  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "all";
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   BULK GENERATION RATE LIMITING TEST SUITE              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  // Validate session cookie
  validateSessionCookie();
  
  const suite: TestSuite = {
    startTime: new Date(),
    totalTests: 0,
    completedTests: 0,
    results: [],
  };
  
  try {
    // Cleanup old data
    await cleanupTestData();
    
    // Run test phases
    if (mode === "single" || mode === "all") {
      const results = await runSingleUserTests();
      suite.results.push(...results);
      suite.totalTests += 4; // 4 tests in phase 1
    }
    
    if (mode === "multi" || mode === "all") {
      const results = await runMultiUserTests();
      suite.results.push(...results);
      suite.totalTests += 3; // 3 tests in phase 2
    }
    
    if (mode === "sustained" || mode === "all") {
      const results = await runSustainedLoadTest();
      suite.results.push(...results);
      suite.totalTests += 3; // 3 waves in phase 3
    }
    
    suite.endTime = new Date();
    suite.completedTests = suite.results.length;
    
    // Generate summary
    suite.summary = generateSummary(suite);
    
    // Print report
    printReport(suite);
    
    // Cleanup after tests
    if (CLEANUP_ON_END) {
      console.log("\n🧹 Cleaning up test data...");
      await cleanupTestData();
      console.log("✅ Cleanup complete");
    }
    
    console.log("\n✅ Test suite completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test suite failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
