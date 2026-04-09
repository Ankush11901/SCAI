/**
 * Daily Credit Reset Task
 * 
 * Runs daily at midnight UTC to reset daily credits for:
 * 1. Free tier users (registered)
 * 2. Anonymous users (tracked via fingerprint)
 * 
 * Logic:
 * - Reset daily_used = 0 for all users
 * - Reset anonymous_usage rows 
 * - Update daily_reset_date to today
 * 
 * Idempotent: Checks if already reset for today
 * 
 * @module lib/jobs/daily-credit-reset
 */

import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { creditBalances, anonymousUsage, creditTransactions } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import crypto from "crypto";

const uuidv4 = () => crypto.randomUUID();

export const dailyCreditsReset = schedules.task({
  id: "daily-credit-reset",
  // Run daily at midnight UTC
  cron: "0 0 * * *",
  run: async (payload) => {
    const runId = uuidv4().slice(0, 8);
    const now = new Date();
    // Format as YYYY-MM-DD string for comparison with dailyResetDate
    const todayString = now.toISOString().split('T')[0];
    
    logger.info(`[${runId}] Daily credit reset starting`, {
      timestamp: payload.timestamp,
      lastRun: payload.lastTimestamp,
      resetDate: todayString,
    });

    // =========================================================================
    // Reset Free Tier Users
    // =========================================================================
    
    // Find free tier users whose daily reset date is before today
    const freeUsersToReset = await db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.tier, "free"));

    let userResetCount = 0;
    let userSkipCount = 0;

    for (const user of freeUsersToReset) {
      // Check if already reset today (idempotency)
      const lastReset = user.dailyResetDate;
      if (lastReset && lastReset >= todayString) {
        userSkipCount++;
        continue;
      }

      // Only reset if they used any credits
      if (user.dailyUsed === 0) {
        // Still update the reset date
        await db
          .update(creditBalances)
          .set({
            dailyResetDate: todayString,
            updatedAt: new Date(),
          })
          .where(eq(creditBalances.userId, user.userId));
        userSkipCount++;
        continue;
      }

      try {
        await db
          .update(creditBalances)
          .set({
            dailyUsed: 0,
            dailyResetDate: todayString,
            updatedAt: new Date(),
          })
          .where(eq(creditBalances.userId, user.userId));

        const creditsRestored = user.dailyCredits ?? 0; // Legacy: was 60, now 0 for all main tiers

        // Log reset transaction
        await db.insert(creditTransactions).values({
          id: uuidv4(),
          userId: user.userId,
          type: "reset",
          amount: creditsRestored,
          source: "daily",
          balanceAfter: creditsRestored,
          description: `Daily credit reset`,
          createdAt: new Date(),
        });

        userResetCount++;
      } catch (error) {
        logger.error(`[${runId}] Failed to reset free user ${user.userId}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info(`[${runId}] Free tier users reset: ${userResetCount}, skipped: ${userSkipCount}`);

    // =========================================================================
    // Reset Anonymous Users
    // =========================================================================
    
    // Find anonymous usage records from before today
    const anonRecords = await db
      .select()
      .from(anonymousUsage)
      .where(lt(anonymousUsage.dailyResetDate, todayString));

    let anonResetCount = 0;
    let anonSkipCount = 0;

    for (const record of anonRecords) {
      // Skip if no credits used
      if (record.dailyUsed === 0) {
        anonSkipCount++;
        continue;
      }

      try {
        await db
          .update(anonymousUsage)
          .set({
            dailyUsed: 0,
            dailyResetDate: todayString,
            updatedAt: new Date(),
          })
          .where(eq(anonymousUsage.fingerprint, record.fingerprint));

        anonResetCount++;
      } catch (error) {
        logger.error(`[${runId}] Failed to reset anonymous user ${record.fingerprint}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info(`[${runId}] Anonymous users reset: ${anonResetCount}, skipped: ${anonSkipCount}`);

    // =========================================================================
    // Cleanup old anonymous records (older than 30 days)
    // =========================================================================
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteResult = await db
      .delete(anonymousUsage)
      .where(lt(anonymousUsage.updatedAt, thirtyDaysAgo));

    logger.info(`[${runId}] Cleaned up old anonymous records`);

    // =========================================================================
    // Summary
    // =========================================================================

    const summary = {
      runId,
      timestamp: payload.timestamp,
      resetDate: todayString,
      freeUsers: {
        total: freeUsersToReset.length,
        reset: userResetCount,
        skipped: userSkipCount,
      },
      anonymous: {
        total: anonRecords.length,
        reset: anonResetCount,
        skipped: anonSkipCount,
      },
    };

    logger.info(`[${runId}] Daily credit reset complete`, summary);

    return summary;
  },
});
