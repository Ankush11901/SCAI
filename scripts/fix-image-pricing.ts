/**
 * Migration script to fix historical image pricing for gemini-3-pro-image-preview
 *
 * Old price: $0.04 (40,000 micro-dollars)
 * New price: $0.13 (130,000 micro-dollars)
 * Multiplier: 3.25x
 *
 * Run with: npx tsx scripts/fix-image-pricing.ts
 */

import { config } from 'dotenv'

// Load env BEFORE importing db
config({ path: '.env.local' })

// Now import db after env is loaded
async function main() {
  const { db } = await import('../lib/db')
  const { sql } = await import('drizzle-orm')

  console.log('Starting image pricing fix migration...')

  // Step 1: Check how many records will be affected
  const countResult = await db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM ai_usage_logs
    WHERE model_id = 'gemini-3-pro-image-preview'
  `)
  const affectedCount = countResult[0]?.count ?? 0
  console.log(`Found ${affectedCount} records to update`)

  if (affectedCount === 0) {
    console.log('No records to update. Exiting.')
    return
  }

  // Step 2: Update ai_usage_logs - multiply costs by 3.25
  console.log('Updating ai_usage_logs...')
  await db.run(sql`
    UPDATE ai_usage_logs
    SET
      image_cost_usd = CAST(image_cost_usd * 3.25 AS INTEGER),
      total_cost_usd = CAST(total_cost_usd * 3.25 AS INTEGER)
    WHERE model_id = 'gemini-3-pro-image-preview'
  `)
  console.log('ai_usage_logs updated')

  // Step 3: Get affected history IDs
  const affectedHistoryIds = await db.all<{ history_id: string }>(sql`
    SELECT DISTINCT history_id FROM ai_usage_logs
    WHERE model_id = 'gemini-3-pro-image-preview' AND history_id IS NOT NULL
  `)
  console.log(`Found ${affectedHistoryIds.length} articles to recalculate summaries for`)

  // Step 4: Recalculate generation_cost_summaries for affected articles
  console.log('Recalculating generation_cost_summaries...')
  for (const { history_id } of affectedHistoryIds) {
    await db.run(sql`
      UPDATE generation_cost_summaries
      SET
        image_cost_usd = (
          SELECT COALESCE(SUM(image_cost_usd), 0)
          FROM ai_usage_logs
          WHERE history_id = ${history_id}
        ),
        total_cost_usd = (
          SELECT COALESCE(SUM(total_cost_usd), 0)
          FROM ai_usage_logs
          WHERE history_id = ${history_id}
        ),
        updated_at = unixepoch()
      WHERE history_id = ${history_id}
    `)
  }
  console.log('generation_cost_summaries updated')

  // Step 5: Verify the changes
  const verifyResult = await db.all<{ total: number }>(sql`
    SELECT SUM(total_cost_usd) as total FROM ai_usage_logs
    WHERE model_id = 'gemini-3-pro-image-preview'
  `)
  const newTotal = (verifyResult[0]?.total ?? 0) / 1000000
  console.log(`New total cost for gemini-3-pro-image-preview: $${newTotal.toFixed(2)}`)

  console.log('Migration complete!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
