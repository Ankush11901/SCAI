/**
 * History Page Performance Test
 *
 * Simulates the exact queries the history page runs when loading
 * the "Single Articles" tab, and measures timing for each.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import { eq, desc, isNull, and, sql, notLike, or } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const { generationHistory } = schema

// ═══════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const db = drizzle(tursoClient, { schema })

async function timeQuery<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  const ms = performance.now() - start
  return { result, ms }
}

// ═══════════════════════════════════════════════════════════════════
// Main Test
// ═══════════════════════════════════════════════════════════════════

async function run() {
  console.log('═'.repeat(70))
  console.log('HISTORY PAGE PERFORMANCE TEST')
  console.log('═'.repeat(70))

  // Step 1: Find a real user ID to test with
  const { result: users, ms: userMs } = await timeQuery('Find test user', () =>
    db.select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .limit(5)
  )

  console.log(`\n[Setup] Found ${users.length} user(s) in ${userMs.toFixed(0)}ms`)
  if (users.length === 0) {
    console.error('No users found in database!')
    process.exit(1)
  }

  // Find user with most history entries
  let bestUser = users[0]
  let bestCount = 0
  for (const user of users) {
    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(eq(generationHistory.userId, user.id))
    if ((countRes?.count ?? 0) > bestCount) {
      bestCount = countRes?.count ?? 0
      bestUser = user
    }
  }

  const userId = bestUser.id
  console.log(`[Setup] Testing with user: ${bestUser.email} (${bestCount} total entries)`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 1: Exact getUserHistory query (what the page runs on load)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 1: getUserHistory (page load query)')
  console.log('─'.repeat(70))

  const conditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
    or(
      isNull(generationHistory.metadata),
      notLike(generationHistory.metadata, '%"bulkJobId"%')
    ),
  ]

  // Query A: Main paginated entries (page 1, limit 10)
  const { result: entries, ms: entriesMs } = await timeQuery(
    'Main entries query (LIMIT 10 OFFSET 0)',
    () => db
      .select({
        id: generationHistory.id,
        userId: generationHistory.userId,
        articleType: generationHistory.articleType,
        keyword: generationHistory.keyword,
        wordCount: generationHistory.wordCount,
        status: generationHistory.status,
        metadata: generationHistory.metadata,
        jobId: generationHistory.jobId,
        imageUrls: generationHistory.imageUrls,
        priority: generationHistory.priority,
        createdAt: generationHistory.createdAt,
        updatedAt: generationHistory.updatedAt,
        deletedAt: generationHistory.deletedAt,
      })
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
      .offset(0)
  )

  console.log(`  [A] Entries query: ${entriesMs.toFixed(0)}ms (returned ${entries.length} rows)`)

  // Query B: Count query
  const { result: countResult, ms: countMs } = await timeQuery(
    'Count query',
    () => db
      .select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(and(...conditions))
  )

  const total = countResult[0]?.count ?? 0
  console.log(`  [B] Count query:   ${countMs.toFixed(0)}ms (total: ${total} entries)`)

  // Combined = what the API endpoint actually takes
  const totalListMs = entriesMs + countMs
  console.log(`\n  TOTAL getUserHistory: ${totalListMs.toFixed(0)}ms`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 2: Metadata JSON.parse overhead
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 2: Metadata JSON.parse overhead')
  console.log('─'.repeat(70))

  const parseStart = performance.now()
  const parsed = entries.map(e => ({
    ...e,
    metadata: e.metadata ? JSON.parse(e.metadata) : null,
  }))
  const parseMs = performance.now() - parseStart
  console.log(`  JSON.parse for ${entries.length} entries: ${parseMs.toFixed(2)}ms`)

  // Check metadata sizes
  const metadataSizes = entries
    .filter(e => e.metadata)
    .map(e => e.metadata!.length)
  if (metadataSizes.length > 0) {
    console.log(`  Metadata sizes: min=${Math.min(...metadataSizes)} max=${Math.max(...metadataSizes)} avg=${Math.round(metadataSizes.reduce((a, b) => a + b, 0) / metadataSizes.length)} bytes`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 3: Deep pagination (page 5, 10, etc.)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 3: Deep pagination performance')
  console.log('─'.repeat(70))

  for (const page of [0, 2, 5, 10]) {
    const offset = page * 10
    if (offset >= total) {
      console.log(`  Page ${page + 1} (offset ${offset}): skipped (only ${total} total entries)`)
      continue
    }
    const { ms } = await timeQuery(`Page ${page + 1}`, () =>
      db.select({
        id: generationHistory.id,
        articleType: generationHistory.articleType,
        keyword: generationHistory.keyword,
        wordCount: generationHistory.wordCount,
        status: generationHistory.status,
        metadata: generationHistory.metadata,
        priority: generationHistory.priority,
        createdAt: generationHistory.createdAt,
      })
        .from(generationHistory)
        .where(and(...conditions))
        .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
        .limit(10)
        .offset(offset)
    )
    console.log(`  Page ${page + 1} (offset ${offset}): ${ms.toFixed(0)}ms`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 4: Filter queries
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 4: Filtered queries')
  console.log('─'.repeat(70))

  // By status
  for (const status of ['completed', 'pending', 'failed']) {
    const filterConditions = [
      ...conditions,
      eq(generationHistory.status, status),
    ]
    const { result: filtered, ms } = await timeQuery(`Status=${status}`, () =>
      db.select({ id: generationHistory.id })
        .from(generationHistory)
        .where(and(...filterConditions))
        .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
        .limit(10)
    )
    console.log(`  Status="${status}": ${ms.toFixed(0)}ms (${filtered.length} results)`)
  }

  // By article type
  for (const type of ['informational', 'recipe', 'listicle']) {
    const filterConditions = [
      ...conditions,
      eq(generationHistory.articleType, type),
    ]
    const { result: filtered, ms } = await timeQuery(`Type=${type}`, () =>
      db.select({ id: generationHistory.id })
        .from(generationHistory)
        .where(and(...filterConditions))
        .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
        .limit(10)
    )
    console.log(`  Type="${type}": ${ms.toFixed(0)}ms (${filtered.length} results)`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 5: The LIKE query impact (bulkJobId filter)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 5: LIKE filter impact (bulkJobId exclusion)')
  console.log('─'.repeat(70))

  // Without the LIKE filter
  const withoutLikeConditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
  ]

  const { ms: withoutLikeMs } = await timeQuery('Without LIKE', () =>
    db.select({ id: generationHistory.id })
      .from(generationHistory)
      .where(and(...withoutLikeConditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  const { ms: withLikeMs } = await timeQuery('With LIKE', () =>
    db.select({ id: generationHistory.id })
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  console.log(`  Without LIKE filter: ${withoutLikeMs.toFixed(0)}ms`)
  console.log(`  With LIKE filter:    ${withLikeMs.toFixed(0)}ms`)
  console.log(`  LIKE overhead:       ${(withLikeMs - withoutLikeMs).toFixed(0)}ms`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 6: Full-table scan check (htmlContent column size)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 6: Table size analysis')
  console.log('─'.repeat(70))

  const { result: sizeResult, ms: sizeMs } = await timeQuery('Table size', () =>
    db.select({
      totalRows: sql<number>`count(*)`,
      avgHtmlSize: sql<number>`avg(length(html_content))`,
      avgMetadataSize: sql<number>`avg(length(metadata))`,
      totalHtmlSize: sql<number>`sum(length(html_content))`,
    })
      .from(generationHistory)
      .where(eq(generationHistory.userId, userId))
  )

  const size = sizeResult[0]
  if (size) {
    console.log(`  Total rows: ${size.totalRows}`)
    console.log(`  Avg HTML content size: ${size.avgHtmlSize ? Math.round(size.avgHtmlSize / 1024) : 0} KB`)
    console.log(`  Avg metadata size: ${size.avgMetadataSize ? Math.round(size.avgMetadataSize) : 0} bytes`)
    console.log(`  Total HTML storage: ${size.totalHtmlSize ? (size.totalHtmlSize / (1024 * 1024)).toFixed(1) : 0} MB`)
  }
  console.log(`  Query time: ${sizeMs.toFixed(0)}ms`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 7: SELECT * vs selective columns
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 7: SELECT * vs selective columns')
  console.log('─'.repeat(70))

  const { ms: selectAllMs } = await timeQuery('SELECT * (includes htmlContent)', () =>
    db.select()
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  const { ms: selectSlimMs } = await timeQuery('SELECT slim (no htmlContent)', () =>
    db.select({
      id: generationHistory.id,
      articleType: generationHistory.articleType,
      keyword: generationHistory.keyword,
      wordCount: generationHistory.wordCount,
      status: generationHistory.status,
      priority: generationHistory.priority,
      createdAt: generationHistory.createdAt,
    })
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  console.log(`  SELECT * (with HTML):  ${selectAllMs.toFixed(0)}ms`)
  console.log(`  SELECT slim (no HTML): ${selectSlimMs.toFixed(0)}ms`)
  console.log(`  Savings:               ${(selectAllMs - selectSlimMs).toFixed(0)}ms`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 8: Simulated combined API call (entries + count sequential)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 8: Full API simulation (sequential vs parallel)')
  console.log('─'.repeat(70))

  // Sequential (current implementation)
  const seqStart = performance.now()
  const seqEntries = await db
    .select({
      id: generationHistory.id,
      articleType: generationHistory.articleType,
      keyword: generationHistory.keyword,
      wordCount: generationHistory.wordCount,
      status: generationHistory.status,
      metadata: generationHistory.metadata,
      priority: generationHistory.priority,
      createdAt: generationHistory.createdAt,
      updatedAt: generationHistory.updatedAt,
    })
    .from(generationHistory)
    .where(and(...conditions))
    .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
    .limit(10)
    .offset(0)

  const [seqCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(generationHistory)
    .where(and(...conditions))

  const seqMs = performance.now() - seqStart

  // Parallel (potential optimization)
  const parStart = performance.now()
  const [parEntries, [parCount]] = await Promise.all([
    db.select({
      id: generationHistory.id,
      articleType: generationHistory.articleType,
      keyword: generationHistory.keyword,
      wordCount: generationHistory.wordCount,
      status: generationHistory.status,
      metadata: generationHistory.metadata,
      priority: generationHistory.priority,
      createdAt: generationHistory.createdAt,
      updatedAt: generationHistory.updatedAt,
    })
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
      .offset(0),
    db.select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(and(...conditions)),
  ])
  const parMs = performance.now() - parStart

  console.log(`  Sequential (current): ${seqMs.toFixed(0)}ms`)
  console.log(`  Parallel (Promise.all): ${parMs.toFixed(0)}ms`)
  console.log(`  Savings:               ${(seqMs - parMs).toFixed(0)}ms (${((seqMs - parMs) / seqMs * 100).toFixed(0)}%)`)

  // ═══════════════════════════════════════════════════════════════════
  // Test 9: Raw SQL single-query approach
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(70))
  console.log('TEST 9: Single combined query (entries + count in one)')
  console.log('─'.repeat(70))

  const { ms: singleQueryMs } = await timeQuery('Single CTE query', () =>
    tursoClient.execute({
      sql: `
        WITH filtered AS (
          SELECT id, article_type, keyword, word_count, status, metadata, priority, created_at, updated_at
          FROM generation_history
          WHERE user_id = ?
            AND deleted_at IS NULL
            AND (metadata IS NULL OR metadata NOT LIKE '%"bulkJobId"%')
        )
        SELECT
          f.*,
          (SELECT count(*) FROM filtered) as total_count
        FROM filtered f
        ORDER BY f.priority DESC, f.created_at DESC
        LIMIT 10 OFFSET 0
      `,
      args: [userId],
    })
  )

  console.log(`  Single CTE query: ${singleQueryMs.toFixed(0)}ms`)
  console.log(`  vs Sequential:    ${seqMs.toFixed(0)}ms`)
  console.log(`  vs Parallel:      ${parMs.toFixed(0)}ms`)

  // ═══════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(70))
  console.log('PERFORMANCE SUMMARY')
  console.log('═'.repeat(70))
  console.log(`
  User: ${bestUser.email}
  Total articles (non-bulk): ${total}
  Total articles (all):      ${bestCount}

  Current page load (sequential):  ${seqMs.toFixed(0)}ms
  With Promise.all (parallel):     ${parMs.toFixed(0)}ms
  With single CTE query:           ${singleQueryMs.toFixed(0)}ms

  Entries query alone:  ${entriesMs.toFixed(0)}ms
  Count query alone:    ${countMs.toFixed(0)}ms
  LIKE filter overhead: ${(withLikeMs - withoutLikeMs).toFixed(0)}ms
  SELECT * vs slim:     ${(selectAllMs - selectSlimMs).toFixed(0)}ms difference

  Bottlenecks:
  1. Network round-trips (Turso HTTP): ~${Math.round(entriesMs)}ms per query
  2. Two sequential queries: entries + count = ${totalListMs.toFixed(0)}ms
  3. No indexes on generation_history table
  4. LIKE '%bulkJobId%' requires full text scan of metadata column
  `)
}

run().catch(console.error)
