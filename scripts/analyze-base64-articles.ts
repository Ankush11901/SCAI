/**
 * Analyze articles with base64 images embedded in HTML
 * Determines how many exist, their size impact, and what cleanup would save
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
  console.log('BASE64 IMAGE ANALYSIS')
  console.log('═'.repeat(60))

  // Count articles with base64 images
  const base64Stats = await client.execute(`
    SELECT
      count(*) as total_with_base64,
      sum(length(html_content)) as total_html_bytes,
      avg(length(html_content)) as avg_html_bytes,
      min(length(html_content)) as min_html_bytes,
      max(length(html_content)) as max_html_bytes
    FROM generation_history
    WHERE html_content LIKE '%data:image%base64%'
  `)

  const allStats = await client.execute(`
    SELECT
      count(*) as total_articles,
      sum(length(html_content)) as total_html_bytes,
      avg(length(html_content)) as avg_html_bytes
    FROM generation_history
    WHERE html_content IS NOT NULL AND length(html_content) > 0
  `)

  const noBase64Stats = await client.execute(`
    SELECT
      count(*) as total_without_base64,
      sum(length(html_content)) as total_html_bytes,
      avg(length(html_content)) as avg_html_bytes
    FROM generation_history
    WHERE html_content IS NOT NULL
      AND length(html_content) > 0
      AND html_content NOT LIKE '%data:image%base64%'
  `)

  const b64 = base64Stats.rows[0]
  const all = allStats.rows[0]
  const noB64 = noBase64Stats.rows[0]

  console.log('\n📊 Overview:')
  console.log(`  Total articles with HTML:     ${all.total_articles}`)
  console.log(`  Articles WITH base64 images:  ${b64.total_with_base64}`)
  console.log(`  Articles WITHOUT base64:      ${noB64.total_without_base64}`)

  console.log('\n📦 Storage:')
  console.log(`  Total HTML storage:           ${(Number(all.total_html_bytes) / (1024 * 1024)).toFixed(1)} MB`)
  console.log(`  Base64 articles storage:      ${(Number(b64.total_html_bytes) / (1024 * 1024)).toFixed(1)} MB`)
  console.log(`  Non-base64 articles storage:  ${(Number(noB64.total_html_bytes) / (1024 * 1024)).toFixed(1)} MB`)
  console.log(`  Base64 % of total storage:    ${(Number(b64.total_html_bytes) / Number(all.total_html_bytes) * 100).toFixed(1)}%`)

  console.log('\n📏 Average HTML size:')
  console.log(`  Base64 articles:     ${(Number(b64.avg_html_bytes) / 1024).toFixed(0)} KB avg (${(Number(b64.min_html_bytes) / 1024).toFixed(0)} - ${(Number(b64.max_html_bytes) / 1024).toFixed(0)} KB range)`)
  console.log(`  Non-base64 articles: ${(Number(noB64.avg_html_bytes) / 1024).toFixed(0)} KB avg`)

  // Breakdown by status
  console.log('\n📋 Base64 articles by status:')
  const statusBreakdown = await client.execute(`
    SELECT status, count(*) as cnt,
           sum(length(html_content)) as bytes
    FROM generation_history
    WHERE html_content LIKE '%data:image%base64%'
    GROUP BY status
  `)
  for (const row of statusBreakdown.rows) {
    console.log(`  ${row.status}: ${row.cnt} articles (${(Number(row.bytes) / (1024 * 1024)).toFixed(1)} MB)`)
  }

  // Breakdown by date range
  console.log('\n📅 Base64 articles by creation date:')
  const dateBreakdown = await client.execute(`
    SELECT
      CASE
        WHEN created_at < strftime('%s', '2025-01-01') THEN 'Before 2025'
        WHEN created_at < strftime('%s', '2025-06-01') THEN 'Jan-May 2025'
        WHEN created_at < strftime('%s', '2026-01-01') THEN 'Jun-Dec 2025'
        ELSE '2026+'
      END as period,
      count(*) as cnt,
      sum(length(html_content)) as bytes
    FROM generation_history
    WHERE html_content LIKE '%data:image%base64%'
    GROUP BY period
    ORDER BY min(created_at)
  `)
  for (const row of dateBreakdown.rows) {
    console.log(`  ${row.period}: ${row.cnt} articles (${(Number(row.bytes) / (1024 * 1024)).toFixed(1)} MB)`)
  }

  // Check if any have associated R2 images (meaning they were migrated)
  console.log('\n🔗 Base64 articles with R2 images (already migrated):')
  const migratedCount = await client.execute(`
    SELECT count(DISTINCT gh.id) as cnt
    FROM generation_history gh
    INNER JOIN article_images ai ON ai.history_id = gh.id
    WHERE gh.html_content LIKE '%data:image%base64%'
  `)
  console.log(`  ${migratedCount.rows[0].cnt} articles have both base64 AND R2 images`)

  // Check if any are soft-deleted already
  const deletedCount = await client.execute(`
    SELECT count(*) as cnt
    FROM generation_history
    WHERE html_content LIKE '%data:image%base64%'
      AND deleted_at IS NOT NULL
  `)
  console.log(`  ${deletedCount.rows[0].cnt} are already soft-deleted`)

  // Sample a few to see what they look like
  console.log('\n🔍 Sample base64 articles (5 most recent):')
  const samples = await client.execute(`
    SELECT id, keyword, article_type, status,
           length(html_content) as html_size,
           created_at
    FROM generation_history
    WHERE html_content LIKE '%data:image%base64%'
    ORDER BY created_at DESC
    LIMIT 5
  `)
  for (const row of samples.rows) {
    const date = row.created_at ? new Date(Number(row.created_at) * 1000).toISOString().split('T')[0] : 'unknown'
    console.log(`  ${date} | ${row.article_type} | "${row.keyword}" | ${(Number(row.html_size) / 1024).toFixed(0)} KB | ${row.status}`)
  }

  // Potential savings
  console.log('\n' + '═'.repeat(60))
  console.log('CLEANUP IMPACT')
  console.log('═'.repeat(60))
  const savings = Number(b64.total_html_bytes) / (1024 * 1024)
  const totalStorage = Number(all.total_html_bytes) / (1024 * 1024)
  console.log(`
  If we DELETE base64 articles:
    Storage freed:  ${savings.toFixed(1)} MB (${(savings / totalStorage * 100).toFixed(0)}% of total)
    Rows removed:   ${b64.total_with_base64}
    Remaining:      ${noB64.total_without_base64} articles

  If we STRIP base64 from HTML (keep articles, remove images):
    Storage freed:  ~${(savings * 0.95).toFixed(1)} MB (images are ~95% of these articles' HTML)
    Rows kept:      All ${all.total_articles}
  `)
}

run().catch(console.error)
