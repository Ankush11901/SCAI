import { db, quotaUsage, users } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { hasUnlimitedQuota } from "@/lib/auth";

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get midnight UTC of the next day
 */
function getResetTime(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  unlimited?: boolean;
}

/**
 * Check if a user has unlimited quota by their userId
 * Fetches the user's email and checks the domain
 */
export async function isUserUnlimited(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) return false;
    return hasUnlimitedQuota(user.email);
  } catch (error) {
    console.error("[quota-service] Error checking unlimited status:", error);
    return false;
  }
}

/**
 * Get quota info for a user
 */
export async function getQuotaInfo(userId: string): Promise<QuotaInfo> {
  const today = getTodayString();
  const limit = parseInt(process.env.DAILY_QUOTA || "10", 10);

  try {
    // Check if user has unlimited quota
    const unlimited = await isUserUnlimited(userId);

    if (unlimited) {
      // For unlimited users, still track usage for stats but don't enforce limits
      const [usage] = await db
        .select()
        .from(quotaUsage)
        .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
        .limit(1);

      return {
        used: usage?.count ?? 0,
        limit: -1, // -1 indicates unlimited
        remaining: -1, // -1 indicates unlimited
        resetsAt: getResetTime().toISOString(),
        unlimited: true,
      };
    }

    // Get today's usage record for regular users
    const [usage] = await db
      .select()
      .from(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
      .limit(1);

    const used = usage?.count ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      resetsAt: getResetTime().toISOString(),
      unlimited: false,
    };
  } catch (error) {
    console.error("[quota-service] Error getting quota info:", error);
    // Return default values on error
    return {
      used: 0,
      limit,
      remaining: limit,
      resetsAt: getResetTime().toISOString(),
      unlimited: false,
    };
  }
}

/**
 * Check if user has quota available
 */
export async function hasQuotaAvailable(userId: string): Promise<boolean> {
  const quota = await getQuotaInfo(userId);
  // Unlimited users always have quota available
  if (quota.unlimited) return true;
  return quota.remaining > 0;
}

/**
 * Increment quota usage for a user
 * Returns the new usage count, or throws if quota exceeded
 * Unlimited users can always generate (still tracks usage for stats)
 */
export async function incrementQuotaUsage(userId: string): Promise<number> {
  const today = getTodayString();
  const limit = parseInt(process.env.DAILY_QUOTA || "10", 10);

  try {
    // Check if user has unlimited quota
    const unlimited = await isUserUnlimited(userId);

    // Get or create today's usage record
    const [existing] = await db
      .select()
      .from(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
      .limit(1);

    if (existing) {
      // Check if quota exceeded (only for non-unlimited users)
      if (!unlimited && existing.count >= limit) {
        throw new QuotaExceededError(existing.count, limit);
      }

      // Increment existing record
      await db
        .update(quotaUsage)
        .set({
          count: existing.count + 1,
          lastGeneratedAt: new Date(),
        })
        .where(eq(quotaUsage.id, existing.id));

      return existing.count + 1;
    } else {
      // Create new record for today
      await db.insert(quotaUsage).values({
        id: generateId(),
        userId,
        date: today,
        count: 1,
        lastGeneratedAt: new Date(),
      });

      return 1;
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      throw error;
    }
    console.error("[quota-service] Error incrementing quota:", error);
    throw new Error("Failed to update quota usage");
  }
}

/**
 * Decrement quota usage (e.g., for refunds or cancellations)
 */
export async function decrementQuotaUsage(userId: string): Promise<number> {
  const today = getTodayString();

  try {
    const [existing] = await db
      .select()
      .from(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
      .limit(1);

    if (!existing || existing.count <= 0) {
      return 0;
    }

    await db
      .update(quotaUsage)
      .set({
        count: existing.count - 1,
      })
      .where(eq(quotaUsage.id, existing.id));

    return existing.count - 1;
  } catch (error) {
    console.error("[quota-service] Error decrementing quota:", error);
    throw new Error("Failed to update quota usage");
  }
}

/**
 * Reserve quota for a bulk job (increments usage by specified amount)
 * Used when queueing jobs to ensure quota is available when job runs
 */
export async function reserveQuota(userId: string, amount: number): Promise<number> {
  const today = getTodayString();
  const limit = parseInt(process.env.DAILY_QUOTA || "10", 10);

  try {
    // Check if user has unlimited quota
    const unlimited = await isUserUnlimited(userId);

    // Get or create today's usage record
    const [existing] = await db
      .select()
      .from(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
      .limit(1);

    if (existing) {
      // Check if quota would be exceeded (only for non-unlimited users)
      if (!unlimited && existing.count + amount > limit) {
        throw new QuotaExceededError(existing.count, limit);
      }

      // Increment by amount
      await db
        .update(quotaUsage)
        .set({
          count: existing.count + amount,
          lastGeneratedAt: new Date(),
        })
        .where(eq(quotaUsage.id, existing.id));

      return existing.count + amount;
    } else {
      // Check if amount exceeds limit for new users
      if (!unlimited && amount > limit) {
        throw new QuotaExceededError(0, limit);
      }

      // Create new record for today
      await db.insert(quotaUsage).values({
        id: generateId(),
        userId,
        date: today,
        count: amount,
        lastGeneratedAt: new Date(),
      });

      return amount;
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      throw error;
    }
    console.error("[quota-service] Error reserving quota:", error);
    throw new Error("Failed to reserve quota");
  }
}

/**
 * Release reserved quota (e.g., when a queued job is cancelled before starting)
 * Only releases up to the current usage (won't go negative)
 */
export async function releaseQuota(userId: string, amount: number): Promise<number> {
  const today = getTodayString();

  try {
    const [existing] = await db
      .select()
      .from(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)))
      .limit(1);

    if (!existing || existing.count <= 0) {
      return 0;
    }

    const newCount = Math.max(0, existing.count - amount);

    await db
      .update(quotaUsage)
      .set({
        count: newCount,
      })
      .where(eq(quotaUsage.id, existing.id));

    return newCount;
  } catch (error) {
    console.error("[quota-service] Error releasing quota:", error);
    throw new Error("Failed to release quota");
  }
}

/**
 * Reset quota for a user (admin function)
 */
export async function resetQuota(userId: string): Promise<void> {
  const today = getTodayString();

  try {
    await db
      .delete(quotaUsage)
      .where(and(eq(quotaUsage.userId, userId), eq(quotaUsage.date, today)));
  } catch (error) {
    console.error("[quota-service] Error resetting quota:", error);
    throw new Error("Failed to reset quota");
  }
}

/**
 * Get quota history for a user (last N days)
 */
export async function getQuotaHistory(
  userId: string,
  days: number = 7
): Promise<Array<{ date: string; count: number }>> {
  try {
    const records = await db
      .select({
        date: quotaUsage.date,
        count: quotaUsage.count,
      })
      .from(quotaUsage)
      .where(eq(quotaUsage.userId, userId))
      .orderBy(sql`${quotaUsage.date} DESC`)
      .limit(days);

    return records;
  } catch (error) {
    console.error("[quota-service] Error getting quota history:", error);
    return [];
  }
}

/**
 * Custom error for quota exceeded
 */
export class QuotaExceededError extends Error {
  used: number;
  limit: number;
  resetsAt: Date;

  constructor(used: number, limit: number) {
    super(`Daily quota exceeded. Used: ${used}/${limit}`);
    this.name = "QuotaExceededError";
    this.used = used;
    this.limit = limit;
    this.resetsAt = getResetTime();
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY LAYER
// ============================================================================
// These functions bridge the legacy quota system with the new credit-based system.
// During migration, code can continue using the old quota functions while
// the underlying implementation gradually shifts to the credit system.
// After migration is complete, legacy callers should be updated to use
// the credit service directly.

import {
  getCreditInfo,
  deductCredits,
  refundCredits,
  type CreditInfo,
  InsufficientCreditsError,
} from "./credit-service";
import {
  getUserTier,
  getTierFeatures,
} from "./access-service";

/**
 * Maps credit info to the legacy QuotaInfo format
 * This allows existing code to work with the new credit system
 */
export function creditInfoToQuotaInfo(creditInfo: CreditInfo): QuotaInfo {
  // Map the credit system to the old quota format
  // For pro users with large monthly pools, treat as "unlimited" in legacy terms
  const monthlyRemaining = creditInfo.monthly?.remaining ?? 0;
  const isUnlimited = creditInfo.tier === "pro" && monthlyRemaining > 1000;

  const dailyUsed = creditInfo.daily?.used ?? 0;
  const dailyLimit = creditInfo.daily?.limit ?? 0;
  const dailyRemaining = creditInfo.daily?.remaining ?? 0;
  const dailyResetsAt = creditInfo.daily?.resetsAt ?? new Date().toISOString();

  return {
    used: dailyUsed,
    limit: isUnlimited ? -1 : dailyLimit,
    remaining: isUnlimited ? -1 : dailyRemaining,
    resetsAt: dailyResetsAt,
    unlimited: isUnlimited,
  };
}

/**
 * Get quota info using the new credit system
 * Wrapper that delegates to getCreditInfo and maps the result
 */
export async function getQuotaInfoV2(userId: string): Promise<QuotaInfo> {
  try {
    const creditInfo = await getCreditInfo(userId);
    return creditInfoToQuotaInfo(creditInfo);
  } catch (error) {
    console.error("[quota-service] Error in getQuotaInfoV2:", error);
    // Fall back to legacy implementation on error
    return getQuotaInfo(userId);
  }
}

/**
 * Check quota availability using the new credit system
 */
export async function hasQuotaAvailableV2(userId: string): Promise<boolean> {
  try {
    const creditInfo = await getCreditInfo(userId);
    return creditInfo.available > 0;
  } catch (error) {
    console.error("[quota-service] Error in hasQuotaAvailableV2:", error);
    // Fall back to legacy implementation
    return hasQuotaAvailable(userId);
  }
}

/**
 * Increment quota using the new credit deduction system
 * Deducts 1 credit (base article cost)
 */
export async function incrementQuotaUsageV2(userId: string, creditsToDeduct: number = 1): Promise<number> {
  try {
    const result = await deductCredits(userId, creditsToDeduct, "article_generation", {
      description: "Article generation (legacy quota increment)",
    });
    
    // Return the new usage count (daily used after deduction)
    const creditInfo = await getCreditInfo(userId);
    return creditInfo.daily?.used ?? 0;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      // Map to the legacy QuotaExceededError
      const creditInfo = await getCreditInfo(userId);
      throw new QuotaExceededError(creditInfo.daily?.used ?? 0, creditInfo.daily?.limit ?? 0);
    }
    console.error("[quota-service] Error in incrementQuotaUsageV2:", error);
    // Fall back to legacy implementation
    return incrementQuotaUsage(userId);
  }
}

/**
 * Decrement quota using the new credit refund system
 */
export async function decrementQuotaUsageV2(userId: string, creditsToRefund: number = 1): Promise<number> {
  try {
    // Legacy quota was always monthly-based, so refund to monthly
    await refundCredits(userId, creditsToRefund, "Usage refund (legacy quota decrement)", undefined, 'monthly');

    // Return the new usage count
    const creditInfo = await getCreditInfo(userId);
    return creditInfo.daily?.used ?? 0;
  } catch (error) {
    console.error("[quota-service] Error in decrementQuotaUsageV2:", error);
    // Fall back to legacy implementation
    return decrementQuotaUsage(userId);
  }
}

/**
 * Reserve quota using the new credit system
 * Used for bulk jobs - reserves credits upfront
 */
export async function reserveQuotaV2(userId: string, amount: number): Promise<number> {
  try {
    await deductCredits(userId, amount, "reservation", {
      description: `Reserved ${amount} credits for bulk job`,
    });
    
    const creditInfo = await getCreditInfo(userId);
    return creditInfo.daily?.used ?? 0;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      const creditInfo = await getCreditInfo(userId);
      throw new QuotaExceededError(creditInfo.daily?.used ?? 0, creditInfo.daily?.limit ?? 0);
    }
    console.error("[quota-service] Error in reserveQuotaV2:", error);
    // Fall back to legacy implementation
    return reserveQuota(userId, amount);
  }
}

/**
 * Release reserved quota using the new credit system
 */
export async function releaseQuotaV2(userId: string, amount: number): Promise<number> {
  try {
    // Reservations typically come from monthly credits, refund to monthly
    await refundCredits(userId, amount, `Released ${amount} reserved credits`, undefined, 'monthly');

    const creditInfo = await getCreditInfo(userId);
    return creditInfo.daily?.used ?? 0;
  } catch (error) {
    console.error("[quota-service] Error in releaseQuotaV2:", error);
    // Fall back to legacy implementation
    return releaseQuota(userId, amount);
  }
}

/**
 * Feature flag to enable the new credit system
 * Set to true to use the new system, false to use legacy
 */
const USE_CREDIT_SYSTEM = process.env.USE_CREDIT_SYSTEM === "true";

/**
 * Unified quota info function that uses either system based on feature flag
 */
export async function getUnifiedQuotaInfo(userId: string): Promise<QuotaInfo> {
  if (USE_CREDIT_SYSTEM) {
    return getQuotaInfoV2(userId);
  }
  return getQuotaInfo(userId);
}

/**
 * Unified quota increment that uses either system based on feature flag
 */
export async function incrementUnifiedQuotaUsage(userId: string, credits: number = 1): Promise<number> {
  if (USE_CREDIT_SYSTEM) {
    return incrementQuotaUsageV2(userId, credits);
  }
  return incrementQuotaUsage(userId);
}

/**
 * Unified quota decrement that uses either system based on feature flag
 */
export async function decrementUnifiedQuotaUsage(userId: string, credits: number = 1): Promise<number> {
  if (USE_CREDIT_SYSTEM) {
    return decrementQuotaUsageV2(userId, credits);
  }
  return decrementQuotaUsage(userId);
}
