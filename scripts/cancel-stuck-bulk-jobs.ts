/**
 * Cancel Stuck Bulk Jobs
 * 
 * Use this script to manually cancel bulk jobs that are stuck in 'running' or 'pending' state
 * when Trigger.dev is not running or jobs failed to start properly.
 * 
 * Usage: npx tsx scripts/cancel-stuck-bulk-jobs.ts
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';

// Try loading .env.local first, fallback to .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Check if required environment variables are present
if (!process.env.TURSO_DATABASE_URL) {
  console.error('❌ TURSO_DATABASE_URL environment variable is not set');
  console.error('   Make sure you have a .env.local or .env file with TURSO_DATABASE_URL');
  process.exit(1);
}

import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, inArray, or } from 'drizzle-orm';
import { releaseQuota } from '@/lib/services/quota-service';

async function cancelStuckJobs() {
  console.log('🔍 Finding stuck bulk jobs...\n');

  // Find all jobs that are stuck in running/pending/queued state
  const stuckJobs = await db
    .select()
    .from(bulkJobs)
    .where(
      or(
        eq(bulkJobs.status, 'running'),
        eq(bulkJobs.status, 'pending'),
        eq(bulkJobs.status, 'queued')
      )
    );

  if (stuckJobs.length === 0) {
    console.log('✅ No stuck jobs found. All bulk jobs are in a valid state.');
    return;
  }

  console.log(`Found ${stuckJobs.length} stuck job(s):\n`);

  for (const job of stuckJobs) {
    console.log(`📦 Job ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   User ID: ${job.userId}`);
    console.log(`   Total Articles: ${job.totalArticles}`);
    console.log(`   Created: ${job.createdAt}`);
    console.log(`   Trigger Job ID: ${job.triggerJobId || 'N/A'}`);
    
    // Get article statuses
    const articles = await db
      .select()
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.bulkJobId, job.id));

    const articleStats = {
      pending: articles.filter(a => a.status === 'pending').length,
      generating: articles.filter(a => a.status === 'generating').length,
      complete: articles.filter(a => a.status === 'complete').length,
      error: articles.filter(a => a.status === 'error').length,
    };

    console.log(`   Articles: ${articleStats.complete} complete, ${articleStats.generating} generating, ${articleStats.pending} pending, ${articleStats.error} errors`);
    console.log('');
  }

  console.log('🛑 Cancelling all stuck jobs...\n');

  for (const job of stuckJobs) {
    try {
      // Release quota if job was queued (never actually started)
      const wasQueued = job.status === 'queued';
      if (wasQueued && job.quotaReserved && job.quotaReserved > 0) {
        try {
          await releaseQuota(job.userId, job.quotaReserved);
          console.log(`   ✓ Released ${job.quotaReserved} quota for job ${job.id}`);
        } catch (error) {
          console.warn(`   ⚠ Could not release quota for job ${job.id}:`, error);
        }
      }

      // NOTE: We cannot cancel Trigger.dev runs from here since we'd need the Trigger.dev SDK
      // configured properly. The jobs will timeout naturally if they're stuck.

      // Get pending/generating articles
      const pendingArticles = await db
        .select()
        .from(bulkJobArticles)
        .where(
          and(
            eq(bulkJobArticles.bulkJobId, job.id),
            inArray(bulkJobArticles.status, ['pending', 'generating'])
          )
        );

      // Mark pending articles as cancelled
      if (pendingArticles.length > 0) {
        await db.update(bulkJobArticles)
          .set({
            status: 'error',
            errorMessage: 'Cancelled - job was stuck without Trigger.dev running',
          })
          .where(
            and(
              eq(bulkJobArticles.bulkJobId, job.id),
              inArray(bulkJobArticles.status, ['pending', 'generating'])
            )
          );
        console.log(`   ✓ Marked ${pendingArticles.length} articles as cancelled`);
      }

      // Update job status
      await db.update(bulkJobs)
        .set({
          status: 'cancelled',
          failedArticles: (job.failedArticles || 0) + pendingArticles.length,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkJobs.id, job.id));

      console.log(`   ✅ Cancelled job ${job.id}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to cancel job ${job.id}:`, error);
      console.log('');
    }
  }

  console.log('✅ Done! All stuck jobs have been cancelled.');
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure Trigger.dev is running: pnpm trigger:dev');
  console.log('   2. Start your Next.js dev server: pnpm dev:next');
  console.log('   3. Try creating a new bulk job');
}

// Run the script
cancelStuckJobs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
