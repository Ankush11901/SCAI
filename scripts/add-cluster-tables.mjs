// Run targeted SQL migration to add article_clusters table
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log('Connected to:', process.env.TURSO_DATABASE_URL?.substring(0, 40) + '...');

  // Check if article_clusters table exists
  const tables = await client.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='article_clusters'
  `);

  if (tables.rows.length > 0) {
    console.log('✓ article_clusters table already exists');
  } else {
    console.log('Creating article_clusters table...');
    await client.execute(`
      CREATE TABLE article_clusters (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        bulk_job_id text,
        topic text NOT NULL,
        primary_keyword text NOT NULL,
        url_pattern text NOT NULL,
        article_count integer NOT NULL,
        cluster_plan text,
        status text DEFAULT 'pending' NOT NULL,
        created_at integer,
        updated_at integer
      )
    `);
    console.log('✓ article_clusters table created');
  }

  // Check if cluster_id column exists in bulk_jobs
  const columns = await client.execute(`PRAGMA table_info(bulk_jobs)`);
  const hasClusterId = columns.rows.some(row => row.name === 'cluster_id');

  if (hasClusterId) {
    console.log('✓ cluster_id column already exists in bulk_jobs');
  } else {
    console.log('Adding cluster_id column to bulk_jobs...');
    await client.execute(`ALTER TABLE bulk_jobs ADD cluster_id text`);
    console.log('✓ cluster_id column added to bulk_jobs');
  }

  console.log('\n✅ Migration complete!');
  client.close();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
