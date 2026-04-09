/**
 * Fix a specific article that completed regeneration but didn't update bulkJobArticles.
 * This is a one-time fix for the article regenerated before we added the update logic.
 */

import { db } from '../lib/db';
import { generationHistory, bulkJobArticles } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

console.log('='.repeat(60));
console.log('Fix Stuck Regeneration Script');
console.log('='.repeat(60));

async function fixStuckRegeneration() {
  try {
    // This is the historyId from the logs you showed
    const historyId = 'bPXA8FQkShvu-xPGWeGVZ';

    console.log(`\n🔍 Looking for history entry: ${historyId}\n`);

    // Get the history entry
    const [history] = await db
      .select()
      .from(generationHistory)
      .where(eq(generationHistory.id, historyId))
      .limit(1);

    if (!history) {
      console.error('❌ History entry not found!');
      return;
    }

    console.log(`✅ Found history entry:`);
    console.log(`   Status: ${history.status}`);
    console.log(`   Word count: ${history.wordCount}`);
    console.log(`   HTML length: ${history.htmlContent?.length || 0} chars\n`);

    // Parse metadata to get bulkArticleId
    let metadata: any = {};
    try {
      if (history.metadata) {
        metadata = JSON.parse(history.metadata);
      }
    } catch (e) {
      console.error('❌ Failed to parse metadata:', e);
      return;
    }

    const bulkArticleId = metadata.bulkArticleId;

    if (!bulkArticleId) {
      console.error('❌ No bulkArticleId found in metadata');
      console.log('Metadata keys:', Object.keys(metadata));
      return;
    }

    console.log(`📝 Found bulk article ID: ${bulkArticleId}\n`);

    // Get current bulk article status
    const [article] = await db
      .select()
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.id, bulkArticleId))
      .limit(1);

    if (!article) {
      console.error('❌ Bulk article not found!');
      return;
    }

    console.log(`📊 Current article status:`);
    console.log(`   Status: ${article.status}`);
    console.log(`   Phase: ${article.phase}`);
    console.log(`   Progress: ${article.progress}`);
    console.log(`   Word count: ${article.wordCount}\n`);

    if (article.status === 'complete') {
      console.log('✅ Article is already marked as complete. No update needed.\n');
      return;
    }

    // Update the article
    console.log(`🔧 Updating bulk article to complete status...\n`);

    await db
      .update(bulkJobArticles)
      .set({
        status: 'complete',
        phase: 'complete',
        progress: 100,
        wordCount: history.wordCount,
        errorMessage: null,
        completedAt: new Date(),
      })
      .where(eq(bulkJobArticles.id, bulkArticleId));

    console.log(`✅ Update successful!\n`);

    // Verify the update
    const [updated] = await db
      .select()
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.id, bulkArticleId))
      .limit(1);

    console.log(`✅ Verified updated status:`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   Phase: ${updated.phase}`);
    console.log(`   Progress: ${updated.progress}`);
    console.log(`   Word count: ${updated.wordCount}\n`);
    console.log('✨ Done! Refresh the page to see the updated article.\n');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error in fixStuckRegeneration:', error);
    throw error;
  }
}

fixStuckRegeneration()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

