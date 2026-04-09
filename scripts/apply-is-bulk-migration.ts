/**
 * Add is_bulk column, backfill from metadata, and rebuild indexes
 * Run: npx tsx scripts/apply-is-bulk-migration.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@libsql/client/http'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function run() {
  console.log('═'.repeat(60))
  console.log('MIGRATION: Add is_bulk column + rebuild indexes')
  console.log('═'.repeat(60))

  // Step 1: Add column
  console.log('\n1. Adding is_bulk column...')
  try {
    await client.execute(`ALTER TABLE generation_history ADD COLUMN is_bulk INTEGER DEFAULT 0`)
    console.log('   ✅ Column added')
  } catch (err: any) {
    if (err.message?.includes('duplicate column')) {
      console.log('   ⚠️  Column already exists, skipping')
    } else {
      throw err
    }
  }

  // Step 2: Backfill — set is_bulk=1 for rows with bulkJobId in metadata
  console.log('\n2. Backfilling is_bulk from metadata...')
  const start = performance.now()
  const result = await client.execute(
    `UPDATE generation_history SET is_bulk = 1 WHERE metadata LIKE '%"bulkJobId"%' AND (is_bulk IS NULL OR is_bulk = 0)`
  )
  const ms = performance.now() - start
  console.log(`   ✅ Updated ${result.rowsAffected} rows in ${ms.toFixed(0)}ms`)

  // Step 3: Drop old indexes and create new ones that include is_bulk
  console.log('\n3. Rebuilding indexes with is_bulk...')

  const indexOps = [
    // Drop old indexes
    { sql: `DROP INDEX IF EXISTS idx_gen_history_user_deleted_priority_created`, label: 'Drop old primary index' },
    { sql: `DROP INDEX IF EXISTS idx_gen_history_user_status`, label: 'Drop old status index' },
    { sql: `DROP INDEX IF EXISTS idx_gen_history_user_type`, label: 'Drop old type index' },
    // Create new covering indexes with is_bulk
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_list
            ON generation_history(user_id, deleted_at, is_bulk, priority DESC, created_at DESC)`,
      label: 'Primary list index (user + deleted + is_bulk + sort)',
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_list_status
            ON generation_history(user_id, deleted_at, is_bulk, status, priority DESC, created_at DESC)`,
      label: 'Status filter index',
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_gen_history_list_type
            ON generation_history(user_id, deleted_at, is_bulk, article_type, priority DESC, created_at DESC)`,
      label: 'Article type filter index',
    },
  ]

  for (const op of indexOps) {
    const opStart = performance.now()
    await client.execute(op.sql)
    console.log(`   ✅ ${op.label} (${(performance.now() - opStart).toFixed(0)}ms)`)
  }

  // Step 4: Verify
  console.log('\n4. Verifying...')

  const indexes = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='generation_history' ORDER BY name`
  )
  console.log('   Indexes on generation_history:')
  for (const row of indexes.rows) {
    console.log(`     📋 ${row.name}`)
  }

  const [counts] = (await client.execute(
    `SELECT
       count(*) as total,
       sum(CASE WHEN is_bulk = 1 THEN 1 ELSE 0 END) as bulk,
       sum(CASE WHEN is_bulk = 0 OR is_bulk IS NULL THEN 1 ELSE 0 END) as single
     FROM generation_history`
  )).rows
  console.log(`\n   Row counts: ${counts.total} total, ${counts.bulk} bulk, ${counts.single} single`)

  console.log('\n✅ Migration complete!')
}

run().catch(console.error)
