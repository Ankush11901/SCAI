import { createClient } from '@libsql/client';
import 'dotenv/config';

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const testId = `test_job_${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);

  console.log('Testing insert into generation_jobs...');
  console.log('Test ID:', testId);
  console.log('Timestamp:', now);

  try {
    // Try a simple insert
    await client.execute({
      sql: `INSERT INTO generation_jobs (id, user_id, status, phase, progress, total_images, completed_images, metadata, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testId, 'test_user', 'pending', 'queued', 0, 0, 0, '{}', now, now]
    });
    console.log('✅ Insert successful!');

    // Clean up
    await client.execute({
      sql: `DELETE FROM generation_jobs WHERE id = ?`,
      args: [testId]
    });
    console.log('✅ Cleanup successful!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }

  process.exit(0);
}

main();
