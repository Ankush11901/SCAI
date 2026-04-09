/**
 * Fix generation_jobs table by recreating it without FK constraints
 * SQLite doesn't support dropping FK constraints, so we need to recreate the table
 */

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load from .env.local
config({ path: '.env.local' });

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    console.error('DB URL:', dbUrl?.substring(0, 30));
    process.exit(1);
  }

  console.log('Connecting to:', dbUrl.substring(0, 50) + '...');

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  console.log('Fixing generation_jobs table...\n');

  try {
    // Check if table exists
    let tableExists = false;
    try {
      await client.execute('SELECT COUNT(*) as count FROM generation_jobs LIMIT 1');
      tableExists = true;
    } catch (e) {
      console.log('Table does not exist, will create it fresh.');
    }

    if (tableExists) {
      // Step 1: Check data
      const existingData = await client.execute('SELECT COUNT(*) as count FROM generation_jobs');
      const rowCount = (existingData.rows[0] as any).count;
      console.log(`Existing rows in generation_jobs: ${rowCount}`);

      // Step 2: Create new table without FK constraints
      console.log('\nCreating new table without FK constraints...');
      await client.execute(`
        CREATE TABLE IF NOT EXISTS generation_jobs_new (
          id TEXT PRIMARY KEY NOT NULL,
          history_id TEXT,
          user_id TEXT NOT NULL,
          trigger_job_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          phase TEXT,
          progress INTEGER DEFAULT 0,
          total_images INTEGER DEFAULT 0,
          completed_images INTEGER DEFAULT 0,
          error_message TEXT,
          metadata TEXT,
          started_at INTEGER,
          completed_at INTEGER,
          created_at INTEGER,
          updated_at INTEGER
        )
      `);

      // Step 3: Copy existing data (if any)
      if (rowCount > 0) {
        console.log('Copying existing data...');
        await client.execute(`
          INSERT INTO generation_jobs_new 
          SELECT * FROM generation_jobs
        `);
      }

      // Step 4: Drop old table
      console.log('Dropping old table...');
      await client.execute('DROP TABLE generation_jobs');

      // Step 5: Rename new table
      console.log('Renaming new table...');
      await client.execute('ALTER TABLE generation_jobs_new RENAME TO generation_jobs');
    } else {
      // Create fresh table
      console.log('Creating generation_jobs table...');
      await client.execute(`
        CREATE TABLE generation_jobs (
          id TEXT PRIMARY KEY NOT NULL,
          history_id TEXT,
          user_id TEXT NOT NULL,
          trigger_job_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          phase TEXT,
          progress INTEGER DEFAULT 0,
          total_images INTEGER DEFAULT 0,
          completed_images INTEGER DEFAULT 0,
          error_message TEXT,
          metadata TEXT,
          started_at INTEGER,
          completed_at INTEGER,
          created_at INTEGER,
          updated_at INTEGER
        )
      `);
    }

    // Step 6: Verify
    const schemaResult = await client.execute("PRAGMA table_info(generation_jobs)");
    console.log('\n✅ Table recreated successfully!');
    console.log('Columns:');
    schemaResult.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (${row.type})`);
    });

    // Step 7: Test insert
    console.log('\nTesting insert...');
    const testId = `test_${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: `INSERT INTO generation_jobs (id, history_id, user_id, status, phase, progress, total_images, completed_images, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testId, 'test-history-id', 'test-user-id', 'pending', 'queued', 0, 0, 0, '{}', now, now]
    });
    console.log('✅ Test insert successful!');

    // Cleanup test row
    await client.execute({
      sql: 'DELETE FROM generation_jobs WHERE id = ?',
      args: [testId]
    });
    console.log('✅ Test row cleaned up');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

main();
