/**
 * Post-optimization history performance test
 * Uses the new isBulk column instead of LIKE scan
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import { eq, desc, isNull, and, sql } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const { generationHistory } = schema

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const db = drizzle(tursoClient, { schema })

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const ms = performance.now() - start
  console.log(`  ${label}: ${ms.toFixed(0)}ms`)
  return result
}

async function run() {
  console.log('═'.repeat(60))
  console.log('HISTORY PERFORMANCE — AFTER OPTIMIZATION')
  console.log('═'.repeat(60))

  // Find test user
  const users = await db.select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users).limit(5)

  let bestUser = users[0]
  let bestCount = 0
  for (const user of users) {
    const [c] = await db.select({ count: sql<number>`count(*)` })
      .from(generationHistory).where(eq(generationHistory.userId, user.id))
    if ((c?.count ?? 0) > bestCount) {
      bestCount = c?.count ?? 0
      bestUser = user
    }
  }

  const userId = bestUser.id
  console.log(`\nUser: ${bestUser.email} (${bestCount} total entries)\n`)

  // New optimized conditions (isBulk instead of LIKE)
  const conditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
    eq(generationHistory.isBulk, 0),
  ]

  // ── Test 1: Sequential (old pattern) ──
  console.log('─'.repeat(60))
  console.log('Sequential entries + count (old pattern)')
  console.log('─'.repeat(60))

  const seqStart = performance.now()
  const entries = await time('Entries (LIMIT 10)', () =>
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
      .limit(10).offset(0)
  )

  await time('Count query', () =>
    db.select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(and(...conditions))
  )
  console.log(`  TOTAL sequential: ${(performance.now() - seqStart).toFixed(0)}ms`)

  // ── Test 2: Parallel (new pattern) ──
  console.log('\n' + '─'.repeat(60))
  console.log('Parallel entries + count (new pattern)')
  console.log('─'.repeat(60))

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
      .limit(10).offset(0),
    db.select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(and(...conditions)),
  ])
  const parMs = performance.now() - parStart
  console.log(`  Parallel total: ${parMs.toFixed(0)}ms (${parEntries.length} entries, ${parCount.count} total)`)

  // ── Test 3: Filtered queries ──
  console.log('\n' + '─'.repeat(60))
  console.log('Filtered queries')
  console.log('─'.repeat(60))

  await time('Status=completed', () =>
    db.select({ id: generationHistory.id })
      .from(generationHistory)
      .where(and(...conditions, eq(generationHistory.status, 'completed')))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  await time('Type=recipe', () =>
    db.select({ id: generationHistory.id })
      .from(generationHistory)
      .where(and(...conditions, eq(generationHistory.articleType, 'recipe')))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(10)
  )

  // ── Test 4: Deep pagination ──
  console.log('\n' + '─'.repeat(60))
  console.log('Deep pagination')
  console.log('─'.repeat(60))

  for (const page of [0, 5, 10, 20]) {
    const offset = page * 10
    await time(`Page ${page + 1} (offset ${offset})`, () =>
      db.select({ id: generationHistory.id })
        .from(generationHistory)
        .where(and(...conditions))
        .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
        .limit(10).offset(offset)
    )
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(60))
  console.log('BEFORE vs AFTER')
  console.log('═'.repeat(60))
  console.log(`
  BEFORE (no indexes, LIKE scan):
    Entries query:  36,469ms
    Count query:    22,584ms
    Total:          59,053ms

  AFTER (indexes + isBulk column):
    Parallel total: ${parMs.toFixed(0)}ms
    Improvement:    ${(59053 / parMs).toFixed(0)}x faster
  `)
}

run().catch(console.error)
