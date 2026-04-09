import { createClient } from '@libsql/client';
import 'dotenv/config';

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Checking database tables...');

  try {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', result.rows.map((r: any) => r.name));

    // Check if generation_jobs exists
    const hasGenerationJobs = result.rows.some((r: any) => r.name === 'generation_jobs');
    console.log('generation_jobs table exists:', hasGenerationJobs);

    if (hasGenerationJobs) {
      // Get table schema
      const schemaResult = await client.execute("PRAGMA table_info(generation_jobs)");
      console.log('\ngeneration_jobs columns:');
      schemaResult.rows.forEach((row: any) => {
        console.log(`  - ${row.name} (${row.type})`);
      });
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

main();
