/**
 * Apply performance indexes to generation_history table
 * Run: npx tsx scripts/apply-history-indexes.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@libsql/client/http'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const indexes = [
  {
    name: 'idx_gen_history_user_deleted_priority_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_user_deleted_priority_created
           ON generation_history(user_id, deleted_at, priority DESC, created_at DESC)`,
  },
  {
    name: 'idx_gen_history_user_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_user_status
           ON generation_history(user_id, deleted_at, status, priority DESC, created_at DESC)`,
  },
  {
    name: 'idx_gen_history_user_type',
    sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_user_type
           ON generation_history(user_id, deleted_at, article_type, priority DESC, created_at DESC)`,
  },
  {
    name: 'idx_article_images_history',
    sql: `CREATE INDEX IF NOT EXISTS idx_article_images_history
           ON article_images(history_id)`,
  },
]

async function run() {
  console.log('Applying indexes to Turso database...\n')

  for (const index of indexes) {
    const start = performance.now()
    try {
      await client.execute(index.sql)
      const ms = performance.now() - start
      console.log(`  ✅ ${index.name} (${ms.toFixed(0)}ms)`)
    } catch (err) {
      const ms = performance.now() - start
      console.error(`  ❌ ${index.name} (${ms.toFixed(0)}ms): ${err}`)
    }
  }

  // Verify indexes exist
  console.log('\nVerifying indexes...')
  const result = await client.execute(
    `SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('generation_history', 'article_images') ORDER BY tbl_name, name`
  )
  for (const row of result.rows) {
    console.log(`  📋 ${row.tbl_name}.${row.name}`)
  }

  console.log('\nDone! Now run the performance test again to compare.')
}

run().catch(console.error)
