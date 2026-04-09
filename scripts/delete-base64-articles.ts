/**
 * Hard delete articles with base64 images and vacuum the database
 * Run: npx tsx scripts/delete-base64-articles.ts
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
  console.log('DELETE BASE64 ARTICLES + VACUUM')
  console.log('═'.repeat(60))

  // Step 1: Get count before
  const [before] = (await client.execute(
    `SELECT count(*) as cnt, sum(length(html_content)) as bytes FROM generation_history`
  )).rows
  console.log(`\nBefore: ${before.cnt} rows, ${(Number(before.bytes) / (1024 * 1024)).toFixed(1)} MB HTML`)

  // Step 2: Delete related records first (article_images, cost records, etc.)
  // Find IDs of base64 articles
  console.log('\n1. Finding base64 article IDs...')
  const idResult = await client.execute(
    `SELECT id FROM generation_history WHERE html_content LIKE '%data:image%base64%'`
  )
  const ids = idResult.rows.map(r => r.id as string)
  console.log(`   Found ${ids.length} articles to delete`)

  if (ids.length === 0) {
    console.log('   Nothing to delete!')
    return
  }

  // Step 3: Delete related records in batches
  console.log('\n2. Deleting related records...')

  // Process in batches of 50 IDs to avoid query size limits
  const batchSize = 50
  let totalImages = 0
  let totalCosts = 0
  let totalArticles = 0

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const placeholders = batch.map(() => '?').join(',')

    // Delete article_images
    const imgResult = await client.execute({
      sql: `DELETE FROM article_images WHERE history_id IN (${placeholders})`,
      args: batch,
    })
    totalImages += imgResult.rowsAffected

    // Delete cost tracking records
    try {
      const costResult = await client.execute({
        sql: `DELETE FROM cost_tracking WHERE history_id IN (${placeholders})`,
        args: batch,
      })
      totalCosts += costResult.rowsAffected
    } catch {
      // Table might not exist or no matching records
    }

    // Delete the articles themselves
    const artResult = await client.execute({
      sql: `DELETE FROM generation_history WHERE id IN (${placeholders})`,
      args: batch,
    })
    totalArticles += artResult.rowsAffected

    console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)}: deleted ${artResult.rowsAffected} articles`)
  }

  console.log(`\n   Total deleted:`)
  console.log(`     Articles:       ${totalArticles}`)
  console.log(`     Article images: ${totalImages}`)
  console.log(`     Cost records:   ${totalCosts}`)

  // Step 4: Check after
  const [after] = (await client.execute(
    `SELECT count(*) as cnt, sum(length(html_content)) as bytes FROM generation_history`
  )).rows
  console.log(`\n3. After delete: ${after.cnt} rows, ${(Number(after.bytes || 0) / (1024 * 1024)).toFixed(1)} MB HTML`)
  console.log(`   Freed: ${((Number(before.bytes) - Number(after.bytes || 0)) / (1024 * 1024)).toFixed(1)} MB`)

  // Step 5: Vacuum
  console.log('\n4. Running VACUUM to reclaim disk space...')
  const vacStart = performance.now()
  await client.execute('VACUUM')
  console.log(`   ✅ VACUUM complete (${((performance.now() - vacStart) / 1000).toFixed(1)}s)`)

  console.log('\n' + '═'.repeat(60))
  console.log('DONE')
  console.log('═'.repeat(60))
}

run().catch(console.error)
