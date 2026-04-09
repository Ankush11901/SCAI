import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

async function runMigration() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const sql = readFileSync('./drizzle/0014_fix_free_tier_payg_balance.sql', 'utf-8');

  // Remove comment lines and split by semicolons
  const cleanedSql = sql.split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  const statements = cleanedSql.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log('Running migration: 0014_fix_free_tier_payg_balance.sql');
  console.log('Statements to execute:', statements.length);

  for (const stmt of statements) {
    if (stmt) {
      console.log('\nExecuting:', stmt.substring(0, 80) + (stmt.length > 80 ? '...' : ''));
      try {
        const result = await client.execute(stmt);
        console.log('Rows affected:', result.rowsAffected);
      } catch (error) {
        console.error('Error executing statement:', error);
        throw error;
      }
    }
  }

  console.log('\n✅ Migration completed successfully!');
}

runMigration().catch(console.error);
