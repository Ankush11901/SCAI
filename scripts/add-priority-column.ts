/**
 * Migration script to add priority column to generation_history table
 *
 * Run with: npx tsx scripts/add-priority-column.ts
 */

import { config } from 'dotenv'

// Load env BEFORE importing db
config({ path: '.env.local' })

async function main() {
  const { db } = await import('../lib/db')
  const { sql } = await import('drizzle-orm')

  console.log('Adding priority column to generation_history table...')

  try {
    // Add priority column with default value of 0
    await db.run(sql`
      ALTER TABLE generation_history ADD COLUMN priority INTEGER DEFAULT 0
    `)
    console.log('Priority column added successfully!')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Check if column already exists
    if (errorMessage.includes('duplicate column name')) {
      console.log('Priority column already exists, skipping.')
    } else {
      throw error
    }
  }

  // Verify the column exists
  const result = await db.all<{ name: string }>(sql`
    SELECT name FROM pragma_table_info('generation_history') WHERE name = 'priority'
  `)

  if (result.length > 0) {
    console.log('Verified: priority column exists in generation_history table')
  } else {
    console.error('Error: priority column was not created!')
    process.exit(1)
  }

  console.log('Migration complete!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
