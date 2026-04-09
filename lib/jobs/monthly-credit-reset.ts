/**
 * Monthly Credit Reset Task
 * 
 * Runs daily at midnight UTC to reset monthly credits for all users
 * (both Free and Pro tiers) whose billing period has ended.
 * 
 * Logic:
 * 1. Find all users where billing_period_end <= now AND monthly_credits > 0
 * 2. Reset monthly_used = 0
 * 3. Reset overage_credits_used = 0 (Pro only)
 * 4. Update billing period dates to next month
 * 5. Log credit_transaction with type='monthly_reset'
 * 
 * Idempotent: Skips users already reset for current period
 * 
 * @module lib/jobs/monthly-credit-reset
 */

import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { creditBalances, creditTransactions } from "@/lib/db/schema";
import { eq, lte, and, gt } from "drizzle-orm";
import crypto from "crypto";

const uuidv4 = () => crypto.randomUUID();

// Credit limits by tier (must match credit-service.ts)
const CREDIT_LIMITS = {
  free: { monthly: 100 },
  pro: { monthly: 2000 },
  payg: { monthly: 0 },
};

export const monthlyCreditsReset = schedules.task({
  id: "monthly-credit-reset",
  // Run daily at midnight UTC - checks for users needing reset
  cron: "0 0 * * *",
  run: async (payload) => {
    const runId = uuidv4().slice(0, 8);
    logger.info(`[${runId}] Monthly credit reset starting`, {
      timestamp: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    const now = new Date();

    // Find all users (free and pro) whose billing period has ended and have monthly credits
    const usersToReset = await db
      .select()
      .from(creditBalances)
      .where(
        and(
          lte(creditBalances.billingPeriodEnd, now),
          gt(creditBalances.monthlyCredits, 0)
        )
      );

    logger.info(`[${runId}] Found ${usersToReset.length} users needing monthly reset`);

    let resetCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of usersToReset) {
      try {
        // Calculate new billing period (next month)
        const oldPeriodEnd = user.billingPeriodEnd!;
        const newPeriodStart = oldPeriodEnd;
        const newPeriodEnd = new Date(oldPeriodEnd);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        // Check if already reset (idempotency)
        // For free tier, we only check monthlyUsed since they don't have overage
        const isPro = user.tier === "pro";
        if (user.monthlyUsed === 0 && (!isPro || user.overageCreditsUsed === 0)) {
          // Check if period was already advanced
          if (user.billingPeriodStart && user.billingPeriodStart >= oldPeriodEnd) {
            logger.info(`[${runId}] Skipping user ${user.userId} (${user.tier}) - already reset for this period`);
            skipCount++;
            continue;
          }
        }

        // Reset credits and update billing period
        // Only reset overage for Pro users (free users don't have overage)
        await db
          .update(creditBalances)
          .set({
            monthlyUsed: 0,
            overageCreditsUsed: isPro ? 0 : user.overageCreditsUsed, // Only reset overage for Pro
            billingPeriodStart: newPeriodStart,
            billingPeriodEnd: newPeriodEnd,
            updatedAt: now,
          })
          .where(eq(creditBalances.userId, user.userId));

        // Get the appropriate credits limit for the tier
        const tier = (user.tier as keyof typeof CREDIT_LIMITS) || "free";
        const creditsRestored = CREDIT_LIMITS[tier]?.monthly ?? user.monthlyCredits ?? 100;

        // Log the reset transaction
        await db.insert(creditTransactions).values({
          id: uuidv4(),
          userId: user.userId,
          type: "reset",
          amount: creditsRestored,
          source: "monthly",
          balanceAfter: creditsRestored,
          description: `Monthly credit reset for billing period ${newPeriodStart.toISOString().split('T')[0]} to ${newPeriodEnd.toISOString().split('T')[0]}`,
          createdAt: now,
        });

        logger.info(`[${runId}] Reset user ${user.userId} (${user.tier} tier)`, {
          tier: user.tier,
          oldPeriodEnd: oldPeriodEnd.toISOString(),
          newPeriodStart: newPeriodStart.toISOString(),
          newPeriodEnd: newPeriodEnd.toISOString(),
          creditsRestored,
        });

        resetCount++;
      } catch (error) {
        logger.error(`[${runId}] Failed to reset user ${user.userId}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        errorCount++;
      }
    }

    const summary = {
      runId,
      timestamp: payload.timestamp,
      totalFound: usersToReset.length,
      resetCount,
      skipCount,
      errorCount,
    };

    logger.info(`[${runId}] Monthly credit reset complete`, summary);

    return summary;
  },
});
