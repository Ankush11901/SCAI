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

async function run() {
  console.log('═'.repeat(60))
  console.log('POST-CLEANUP VERIFICATION')
  console.log('═'.repeat(60))

  // Storage check
  const [stats] = (await tursoClient.execute(
    `SELECT count(*) as cnt, sum(length(html_content)) as bytes,
            avg(length(html_content)) as avg_bytes
     FROM generation_history WHERE html_content IS NOT NULL AND length(html_content) > 0`
  )).rows
  console.log(`\nStorage:`)
  console.log(`  Total articles: ${stats.cnt}`)
  console.log(`  Total HTML:     ${(Number(stats.bytes) / (1024 * 1024)).toFixed(1)} MB`)
  console.log(`  Avg article:    ${(Number(stats.avg_bytes) / 1024).toFixed(0)} KB`)

  // Base64 check
  const [b64check] = (await tursoClient.execute(
    `SELECT count(*) as cnt FROM generation_history WHERE html_content LIKE '%data:image%base64%'`
  )).rows
  console.log(`  Base64 remaining: ${b64check.cnt}`)

  // Performance test — the real page load query
  console.log('\nPage load performance:')

  const users = await db.select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users).limit(5)
  let bestUser = users[0]
  let bestCount = 0
  for (const user of users) {
    const [c] = await db.select({ count: sql<number>`count(*)` })
      .from(generationHistory).where(eq(generationHistory.userId, user.id))
    if ((c?.count ?? 0) > bestCount) { bestCount = c?.count ?? 0; bestUser = user }
  }

  const userId = bestUser.id
  const conditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
    eq(generationHistory.isBulk, 0),
  ]

  // Parallel (what the app now does)
  const start = performance.now()
  const [entries, [countRes]] = await Promise.all([
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
  const ms = performance.now() - start

  console.log(`  User: ${bestUser.email} (${bestCount} entries)`)
  console.log(`  Page load (parallel): ${ms.toFixed(0)}ms (${entries.length} entries, ${countRes.count} total)`)

  console.log('\n' + '═'.repeat(60))
  console.log('SUMMARY: Before → After')
  console.log('═'.repeat(60))
  console.log(`
  Storage:    3,354 MB → ${(Number(stats.bytes) / (1024 * 1024)).toFixed(1)} MB  (${((1 - Number(stats.bytes) / (3354 * 1024 * 1024)) * 100).toFixed(0)}% reduction)
  Avg article: 18 MB → ${(Number(stats.avg_bytes) / 1024).toFixed(0)} KB
  Page load:  59,000ms → ${ms.toFixed(0)}ms  (${(59000 / ms).toFixed(0)}x faster)
  `)
}

run().catch(console.error)
