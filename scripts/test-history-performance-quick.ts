/**
 * Quick history performance test — just the key queries, before vs after indexes
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import { eq, desc, isNull, and, sql, notLike, or } from 'drizzle-orm'
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
  console.log('HISTORY PERFORMANCE (POST-INDEX)')
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
  console.log(`\nUser: ${bestUser.email} (${bestCount} entries)\n`)

  const conditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
    or(
      isNull(generationHistory.metadata),
      notLike(generationHistory.metadata, '%"bulkJobId"%')
    ),
  ]

  // Test 1: Main page load query
  console.log('─'.repeat(60))
  console.log('Main page load (entries + count)')
  console.log('─'.repeat(60))

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

  // Test 2: Filtered queries
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

  // Test 3: Deep pagination
  console.log('\n' + '─'.repeat(60))
  console.log('Deep pagination')
  console.log('─'.repeat(60))

  for (const page of [0, 5, 10]) {
    await time(`Page ${page + 1} (offset ${page * 10})`, () =>
      db.select({ id: generationHistory.id, keyword: generationHistory.keyword })
        .from(generationHistory)
        .where(and(...conditions))
        .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
        .limit(10).offset(page * 10)
    )
  }

  // Test 4: Parallel entries + count
  console.log('\n' + '─'.repeat(60))
  console.log('Parallel fetch (entries + count)')
  console.log('─'.repeat(60))

  const parStart = performance.now()
  await Promise.all([
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
  console.log(`  Parallel total: ${(performance.now() - parStart).toFixed(0)}ms`)

  console.log('\n' + '═'.repeat(60))
}

run().catch(console.error)
