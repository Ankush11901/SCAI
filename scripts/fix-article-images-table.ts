/**
 * Fix article_images table by recreating it without FK constraints
 */

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }

  console.log('Connecting to:', dbUrl.substring(0, 50) + '...');

  const client = createClient({ url: dbUrl, authToken });

  console.log('Fixing article_images table...\n');

  try {
    // Check if table exists
    let tableExists = false;
    let rowCount = 0;
    try {
      const result = await client.execute('SELECT COUNT(*) as count FROM article_images');
      rowCount = (result.rows[0] as any).count;
      tableExists = true;
      console.log(`Existing rows: ${rowCount}`);
    } catch (e) {
      console.log('Table does not exist, will create fresh.');
    }

    if (tableExists) {
      // Create new table
      console.log('Creating new table without FK constraints...');
      await client.execute(`
        CREATE TABLE article_images_new (
          id TEXT PRIMARY KEY NOT NULL,
          history_id TEXT NOT NULL,
          r2_key TEXT NOT NULL,
          public_url TEXT NOT NULL,
          image_type TEXT,
          component_type TEXT,
          prompt TEXT,
          status TEXT NOT NULL DEFAULT 'completed',
          width INTEGER,
          height INTEGER,
          size_bytes INTEGER,
          mime_type TEXT,
          metadata TEXT,
          created_at INTEGER,
          updated_at INTEGER
        )
      `);

      if (rowCount > 0) {
        console.log('Copying existing data...');
        await client.execute('INSERT INTO article_images_new SELECT * FROM article_images');
      }

      console.log('Dropping old table...');
      await client.execute('DROP TABLE article_images');

      console.log('Renaming new table...');
      await client.execute('ALTER TABLE article_images_new RENAME TO article_images');
    } else {
      console.log('Creating article_images table...');
      await client.execute(`
        CREATE TABLE article_images (
          id TEXT PRIMARY KEY NOT NULL,
          history_id TEXT NOT NULL,
          r2_key TEXT NOT NULL,
          public_url TEXT NOT NULL,
          image_type TEXT,
          component_type TEXT,
          prompt TEXT,
          status TEXT NOT NULL DEFAULT 'completed',
          width INTEGER,
          height INTEGER,
          size_bytes INTEGER,
          mime_type TEXT,
          metadata TEXT,
          created_at INTEGER,
          updated_at INTEGER
        )
      `);
    }

    // Verify
    const schema = await client.execute("PRAGMA table_info(article_images)");
    console.log('\n✅ Table fixed! Columns:');
    schema.rows.forEach((row: any) => console.log(`  - ${row.name} (${row.type})`));

    // Test insert
    const testId = `test_${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: `INSERT INTO article_images (id, history_id, r2_key, public_url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [testId, 'test-history', 'test-key', 'https://test.com/img.jpg', 'completed', now, now]
    });
    console.log('\n✅ Test insert successful!');

    await client.execute({ sql: 'DELETE FROM article_images WHERE id = ?', args: [testId] });
    console.log('✅ Test row cleaned up');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

main();
