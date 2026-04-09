/**
 * Apply performance indexes for bulk generation
 * Run: npx tsx scripts/apply-bulk-indexes.ts
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
    name: 'idx_bulk_jobs_user_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_bulk_jobs_user_status 
          ON bulk_jobs(user_id, status, created_at DESC)`,
  },
  {
    name: 'idx_bulk_jobs_status_queue',
    sql: `CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status_queue 
          ON bulk_jobs(status, queue_position, created_at DESC)`,
  },
  {
    name: 'idx_bulk_job_articles_job_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_bulk_job_articles_job_status 
          ON bulk_job_articles(bulk_job_id, status)`,
  },
  {
    name: 'idx_bulk_job_articles_job_phase',
    sql: `CREATE INDEX IF NOT EXISTS idx_bulk_job_articles_job_phase 
          ON bulk_job_articles(bulk_job_id, phase, progress)`,
  },
  {
    name: 'idx_generation_history_user_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_generation_history_user_created 
          ON generation_history(user_id, created_at DESC)`,
  },
  {
    name: 'idx_generation_history_bulk_job',
    sql: `CREATE INDEX IF NOT EXISTS idx_generation_history_bulk_job 
          ON generation_history(bulk_job_id, created_at DESC)`,
  },
  {
    name: 'idx_ai_usage_logs_history_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_history_created 
          ON ai_usage_logs(history_id, created_at)`,
  },
  {
    name: 'idx_credit_transactions_user_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
          ON credit_transactions(user_id, created_at DESC)`,
  },
  {
    name: 'idx_generation_cost_summaries_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_generation_cost_summaries_user 
          ON generation_cost_summaries(user_id, created_at DESC)`,
  },
]

async function run() {
  console.log('Applying bulk generation indexes to Turso database...\n')

  let success = 0
  let failed = 0

  for (const index of indexes) {
    const start = performance.now()
    try {
      await client.execute(index.sql)
      const ms = performance.now() - start
      console.log(`  ✅ ${index.name} (${ms.toFixed(0)}ms)`)
      success++
    } catch (err) {
      const ms = performance.now() - start
      console.log(`  ❌ ${index.name} (${ms.toFixed(0)}ms): ${(err as Error).message}`)
      failed++
    }
  }

  console.log(`\n✅ Done: ${success} indexes applied, ${failed} failed`)
}

run().catch(console.error)
