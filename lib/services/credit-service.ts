/**
 * Credit Service
 * 
 * Manages credit operations for the billing system including:
 * - Credit balance queries
 * - Credit deduction with waterfall logic
 * - Refunds and purchases
 * - Daily/monthly resets
 * 
 * @module lib/services/credit-service
 */

import { db, creditBalances, creditTransactions, anonymousUsage, users } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { hasUnlimitedQuota } from "@/lib/auth";

// =============================================================================
// Constants
// =============================================================================

export const CREDIT_LIMITS = {
  free: {
    daily: 0, // No daily limit - free tier uses monthly allocation
    monthly: 100, // ~7 articles/month at ~14 credits each
  },
  pro: {
    daily: 0, // No daily limit for Pro - monthly pool is the main allocation
    monthly: 2000, // ~125 articles/month at ~16 credits each
  },
  payg: {
    daily: 0, // No daily limit for PAYG - uses purchased credits
    monthly: 0, // No monthly allocation — funded by PAYG balance
  },
} as const;

export const OVERAGE_RATE_CENTS = 5; // $0.05 per overage credit

// =============================================================================
// Types
// =============================================================================

export type CreditTier = "free" | "pro" | "payg";

export interface CreditInfo {
  tier: CreditTier;
  available: number; // Total available across all sources
  daily?: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string; // ISO timestamp
  };
  monthly?: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string; // ISO timestamp
  };
  paygBalance: number;
  overage?: {
    used: number;
    cap: number | null;
    remaining: number | null;
    costSoFar: string; // Formatted USD
  };
  reservedCredits: number; // Credits held by running bulk jobs
  isAnonymous: boolean;
  isUnlimited?: boolean; // True for whitelabel users (@whitelabelresell.com)
}

export interface DeductionResult {
  success: boolean;
  transactionId?: string;
  amount: number;
  sources: Array<{
    source: "daily" | "monthly" | "payg" | "overage";
    amount: number;
  }>;
  newBalance: CreditInfo;
}

export interface CreditTransactionData {
  userId: string;
  amount: number;
  type: string;
  source?: string;
  description?: string;
  historyId?: string;
  bulkJobId?: string;
  stripePaymentId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Errors
// =============================================================================

export class InsufficientCreditsError extends Error {
  public readonly required: number;
  public readonly available: number;
  public readonly tier: CreditTier;
  public readonly allowOverage: boolean;

  constructor(required: number, available: number, tier: CreditTier, allowOverage: boolean = false) {
    super(
      `Insufficient credits: required ${required}, available ${available} (${tier} tier)`
    );
    this.name = "InsufficientCreditsError";
    this.required = required;
    this.available = available;
    this.tier = tier;
    this.allowOverage = allowOverage;
  }
}

export class CreditOperationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "CreditOperationError";
  }
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getMidnightUTC(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get or create credit balance for a user
 */
async function getOrCreateCreditBalance(userId: string) {
  const [existing] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existing) {
    // Check if daily reset is needed
    const today = getTodayString();
    if (existing.dailyResetDate !== today) {
      await db
        .update(creditBalances)
        .set({
          dailyUsed: 0,
          dailyResetDate: today,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, existing.userId));

      return { ...existing, dailyUsed: 0, dailyResetDate: today };
    }
    return existing;
  }

  // Create new credit balance with free tier defaults
  const [user] = await db
    .select({ planType: users.planType })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const tier = (user?.planType as CreditTier) || "free";

  // Calculate billing period dates (both free and Pro get monthly allocation)
  const now = new Date();
  const monthFromNow = new Date(now);
  monthFromNow.setMonth(monthFromNow.getMonth() + 1);

  const newBalance = {
    id: generateId(),
    userId,
    tier,
    monthlyCredits: CREDIT_LIMITS[tier].monthly, // Both free (100) and pro (2000) get monthly credits
    monthlyUsed: 0,
    billingPeriodStart: now, // All tiers get billing period for monthly reset
    billingPeriodEnd: monthFromNow,
    paygBalance: 0,
    dailyCredits: CREDIT_LIMITS[tier].daily, // Now 0 for all tiers (no daily limits)
    dailyUsed: 0,
    dailyResetDate: getTodayString(),
    overageCreditsUsed: 0,
    overageCap: tier === "pro" ? 100 : null, // Default 100 credit overage cap for Pro
    reservedCredits: 0,
  };

  await db.insert(creditBalances).values(newBalance);
  return newBalance;
}

/**
 * Get credit info for an authenticated user
 */
export async function getCreditInfo(userId: string): Promise<CreditInfo> {
  // Check if user has whitelabel unlimited access
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const isUnlimitedUser = user?.email ? hasUnlimitedQuota(user.email) : false;

  // Return unlimited credits for whitelabel users (@whitelabelresell.com)
  if (isUnlimitedUser) {
    return {
      tier: "pro" as CreditTier,
      available: 999999,
      monthly: {
        used: 0,
        limit: 999999,
        remaining: 999999,
        resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      paygBalance: 0,
      reservedCredits: 0,
      isAnonymous: false,
      isUnlimited: true,
    };
  }

  const balance = await getOrCreateCreditBalance(userId);
  const midnightUTC = getMidnightUTC();

  // Calculate available credits based on tier
  let availableCredits = 0;
  const result: CreditInfo = {
    tier: balance.tier as CreditTier,
    available: 0,
    paygBalance: balance.paygBalance || 0,
    reservedCredits: balance.reservedCredits || 0,
    isAnonymous: false,
  };

  // Daily allocation is deprecated — all tiers use monthly credits now.
  // Stale dailyCredits values in the DB are ignored.

  // Monthly allocation (both free and pro tiers now use monthly credits)
  const monthlyLimit = balance.monthlyCredits || 0;
  if (monthlyLimit > 0) {
    const monthlyRemaining = Math.max(0, monthlyLimit - (balance.monthlyUsed || 0));
    // fallback: if billingPeriodEnd is not set, use one month from now (not midnight tomorrow)
    let resetsAt: string;
    if (balance.billingPeriodEnd) {
      resetsAt = balance.billingPeriodEnd.toISOString();
    } else {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      resetsAt = oneMonthFromNow.toISOString();
    }
    result.monthly = {
      used: balance.monthlyUsed || 0,
      limit: monthlyLimit,
      remaining: monthlyRemaining,
      resetsAt,
    };
    availableCredits += monthlyRemaining;
  }

  // Overage (Pro tier only)
  if (balance.tier === "pro") {
    const overageUsed = balance.overageCreditsUsed || 0;
    const overageCap = balance.overageCap;
    const overageRemaining = overageCap !== null ? Math.max(0, overageCap - overageUsed) : null;
    
    result.overage = {
      used: overageUsed,
      cap: overageCap,
      remaining: overageRemaining,
      costSoFar: formatCurrency(overageUsed * OVERAGE_RATE_CENTS),
    };

    if (overageRemaining !== null) {
      availableCredits += overageRemaining;
    } else {
      // Unlimited overage - add a large number
      availableCredits += 10000;
    }
  }

  // PAYG balance - only count for pro/payg tiers, not free tier
  // Free tier users should NEVER have PAYG credits available
  if (balance.tier !== 'free') {
    availableCredits += balance.paygBalance || 0;
  }

  result.available = Math.max(0, availableCredits - (balance.reservedCredits || 0));
  return result;
}

/**
 * Get credit info for an anonymous user
 */
export async function getAnonymousCreditInfo(
  fingerprint: string,
  ipAddress: string
): Promise<CreditInfo> {
  const today = getTodayString();

  // Find or create anonymous usage record
  const [existing] = await db
    .select()
    .from(anonymousUsage)
    .where(
      and(
        eq(anonymousUsage.fingerprint, fingerprint),
        eq(anonymousUsage.ipAddress, ipAddress)
      )
    )
    .limit(1);

  let dailyUsed = 0;

  if (existing) {
    if (existing.dailyResetDate !== today) {
      // Reset for new day
      await db
        .update(anonymousUsage)
        .set({
          dailyUsed: 0,
          dailyResetDate: today,
          updatedAt: new Date(),
        })
        .where(eq(anonymousUsage.id, existing.id));
    } else {
      dailyUsed = existing.dailyUsed || 0;
    }
  } else {
    // Create new record
    await db.insert(anonymousUsage).values({
      id: generateId(),
      fingerprint,
      ipAddress,
      dailyUsed: 0,
      dailyResetDate: today,
    });
  }

  const dailyLimit = CREDIT_LIMITS.free.daily;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  return {
    tier: "free",
    available: dailyRemaining,
    daily: {
      used: dailyUsed,
      limit: dailyLimit,
      remaining: dailyRemaining,
      resetsAt: getMidnightUTC().toISOString(),
    },
    paygBalance: 0,
    reservedCredits: 0,
    isAnonymous: true,
  };
}

/**
 * Check if user has sufficient credits
 */
export async function hasCreditsAvailable(
  userId: string | null,
  amount: number,
  fingerprint?: string,
  ipAddress?: string
): Promise<boolean> {
  if (userId) {
    const info = await getCreditInfo(userId);
    return info.available >= amount;
  }

  if (fingerprint && ipAddress) {
    const info = await getAnonymousCreditInfo(fingerprint, ipAddress);
    return info.available >= amount;
  }

  return false;
}

/**
 * Deduct credits using waterfall logic
 * 
 * Waterfall order:
 * - FREE: Daily only
 * - PRO: Daily → Monthly → PAYG → Overage
 * - PAYG: PAYG only
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  referenceId: string,
  metadata?: { historyId?: string; bulkJobId?: string; description?: string }
): Promise<DeductionResult> {
  // Pre-check outside transaction for fast fail
  const balance = await getOrCreateCreditBalance(userId);
  const creditInfo = await getCreditInfo(userId);

  if (creditInfo.available < amount) {
    throw new InsufficientCreditsError(amount, creditInfo.available, creditInfo.tier);
  }

  const sources: DeductionResult["sources"] = [];
  let remaining = amount;

  // Track updates
  const updates: Partial<typeof creditBalances.$inferInsert> = {
    updatedAt: new Date(),
  };

  // 1. Deduct from monthly allocation (free and pro)
  if (remaining > 0 && creditInfo.monthly) {
    const fromMonthly = Math.min(remaining, creditInfo.monthly.remaining);
    if (fromMonthly > 0) {
      sources.push({ source: "monthly", amount: fromMonthly });
      updates.monthlyUsed = (balance.monthlyUsed || 0) + fromMonthly;
      remaining -= fromMonthly;
    }
  }

  // 2. Deduct from PAYG balance
  if (remaining > 0 && balance.paygBalance && balance.paygBalance > 0) {
    const fromPayg = Math.min(remaining, balance.paygBalance);
    if (fromPayg > 0) {
      sources.push({ source: "payg", amount: fromPayg });
      updates.paygBalance = balance.paygBalance - fromPayg;
      remaining -= fromPayg;
    }
  }

  // 3. Deduct from overage (Pro only)
  if (remaining > 0 && balance.tier === "pro") {
    const overageRemaining = creditInfo.overage?.remaining;
    // overageRemaining can be: undefined (no overage tracking), null (unlimited), or number
    if (overageRemaining === undefined || overageRemaining === null || overageRemaining > 0) {
      const fromOverage = overageRemaining !== null && overageRemaining !== undefined
        ? Math.min(remaining, overageRemaining)
        : remaining;
      
      if (fromOverage > 0) {
        sources.push({ source: "overage", amount: fromOverage });
        updates.overageCreditsUsed = (balance.overageCreditsUsed || 0) + fromOverage;
        remaining -= fromOverage;
      }
    }
  }

  // Should never happen if hasCreditsAvailable was checked
  if (remaining > 0) {
    throw new InsufficientCreditsError(amount, creditInfo.available, creditInfo.tier);
  }

  const transactionId = generateId();

  // ATOMIC: Apply balance update and record transaction together
  await db.transaction(async (tx) => {
    // Apply balance updates
    await tx
      .update(creditBalances)
      .set(updates)
      .where(eq(creditBalances.userId, userId));

    // Get updated balance for transaction record
    const [updatedBalance] = await tx
      .select({ available: sql<number>`COALESCE(monthly_credits, 0) - COALESCE(monthly_used, 0) + COALESCE(payg_balance, 0)` })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId));

    // Record transaction
    await tx.insert(creditTransactions).values({
      id: transactionId,
      userId,
      amount: -amount,
      balanceAfter: updatedBalance?.available ?? 0,
      type: "deduction",
      source: sources.map((s) => s.source).join(","),
      description: metadata?.description || `Credit deduction for ${referenceId}`,
      historyId: metadata?.historyId,
      bulkJobId: metadata?.bulkJobId,
      metadata: JSON.stringify({ referenceId, sources }),
    });
  });

  // Get final state after transaction commits
  const newInfo = await getCreditInfo(userId);

  return {
    success: true,
    transactionId,
    amount,
    sources,
    newBalance: newInfo,
  };
}

/**
 * Deduct credits for anonymous users
 */
export async function deductAnonymousCredits(
  fingerprint: string,
  ipAddress: string,
  amount: number
): Promise<{ success: boolean; remaining: number }> {
  const info = await getAnonymousCreditInfo(fingerprint, ipAddress);

  if (info.available < amount) {
    throw new InsufficientCreditsError(amount, info.available, "free");
  }

  await db
    .update(anonymousUsage)
    .set({
      dailyUsed: sql`${anonymousUsage.dailyUsed} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(anonymousUsage.fingerprint, fingerprint),
        eq(anonymousUsage.ipAddress, ipAddress)
      )
    );

  return {
    success: true,
    remaining: info.available - amount,
  };
}

/**
 * Refund credits to user
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 * 
 * @param userId - User to refund credits to
 * @param amount - Amount of credits to refund
 * @param referenceId - Reference ID for the refund (e.g., historyId)
 * @param description - Optional description of the refund
 * @param creditSource - Source to refund to: 'monthly' | 'payg' | 'overage'
 *                       For free tier users, ALWAYS refunds to monthly regardless of this parameter.
 *                       If not provided, defaults to 'monthly' for free tier, 'payg' for others.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string,
  creditSource?: 'monthly' | 'payg' | 'overage'
): Promise<{ transactionId: string; newBalance: number }> {
  const balance = await getOrCreateCreditBalance(userId);

  const transactionId = generateId();
  let finalBalance = 0;

  // Determine the actual refund target based on tier
  // Free tier: ALWAYS refund to monthly (decrement usage), ignore creditSource
  // Pro/PAYG tier: Use creditSource if provided, else default to payg
  let actualSource: 'monthly' | 'payg' | 'overage';
  
  if (balance.tier === 'free') {
    // Free tier users should NEVER have PAYG or overage credits
    // Always refund to monthly by decrementing monthlyUsed
    actualSource = 'monthly';
    if (creditSource && creditSource !== 'monthly') {
      console.warn(
        `[refundCredits] Free tier user ${userId} attempted ${creditSource} refund, forcing to monthly`
      );
    }
  } else {
    // Pro/PAYG tier: Use provided source or default to payg
    actualSource = creditSource || 'payg';
  }

  // ATOMIC: Apply refund and record transaction together
  await db.transaction(async (tx) => {
    // Apply refund based on determined source
    if (actualSource === 'monthly') {
      // Refund to monthly by decrementing monthlyUsed (can't go below 0)
      await tx
        .update(creditBalances)
        .set({
          monthlyUsed: sql`GREATEST(0, COALESCE(${creditBalances.monthlyUsed}, 0) - ${amount})`,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    } else if (actualSource === 'overage') {
      // Refund to overage by decrementing overageCreditsUsed (can't go below 0)
      await tx
        .update(creditBalances)
        .set({
          overageCreditsUsed: sql`GREATEST(0, COALESCE(${creditBalances.overageCreditsUsed}, 0) - ${amount})`,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    } else {
      // Refund to PAYG balance (default for pro tier)
      await tx
        .update(creditBalances)
        .set({
          paygBalance: sql`COALESCE(${creditBalances.paygBalance}, 0) + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    }

    // Get updated balance for transaction record
    const [updatedBalance] = await tx
      .select({ available: sql<number>`COALESCE(monthly_credits, 0) - COALESCE(monthly_used, 0) + COALESCE(payg_balance, 0)` })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId));

    finalBalance = updatedBalance?.available ?? 0;

    // Record transaction
    await tx.insert(creditTransactions).values({
      id: transactionId,
      userId,
      amount: amount,
      balanceAfter: finalBalance,
      type: "refund",
      source: actualSource,
      description: description || `Refund for ${referenceId}`,
      metadata: JSON.stringify({ referenceId, requestedSource: creditSource, actualSource }),
    });
  });

  return { transactionId, newBalance: finalBalance };
}

/**
 * Add purchased credits (PAYG)
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 */
export async function addPurchasedCredits(
  userId: string,
  amount: number,
  stripePaymentId: string,
  description?: string
): Promise<{ transactionId: string; newBalance: number }> {
  await getOrCreateCreditBalance(userId);

  const transactionId = generateId();
  let finalBalance = 0;

  // ATOMIC: Apply credit addition and record transaction together
  await db.transaction(async (tx) => {
    // Add to PAYG balance
    await tx
      .update(creditBalances)
      .set({
        paygBalance: sql`COALESCE(${creditBalances.paygBalance}, 0) + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Get updated balance for transaction record
    const [updatedBalance] = await tx
      .select({ available: sql<number>`COALESCE(monthly_credits, 0) - COALESCE(monthly_used, 0) + COALESCE(payg_balance, 0)` })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId));

    finalBalance = updatedBalance?.available ?? 0;

    // Record transaction
    await tx.insert(creditTransactions).values({
      id: transactionId,
      userId,
      amount: amount,
      balanceAfter: finalBalance,
      type: "purchase",
      source: "payg",
      description: description || `Credit purchase: ${amount} credits`,
      stripePaymentId,
      metadata: JSON.stringify({ stripePaymentId }),
    });
  });

  return { transactionId, newBalance: finalBalance };
}

/**
 * Reset monthly credits for Pro users
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 */
export async function resetMonthlyCredits(
  userId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date
): Promise<void> {
  const balance = await getOrCreateCreditBalance(userId);

  if (balance.tier !== "pro") return;

  // ATOMIC: Apply reset and record transaction together
  await db.transaction(async (tx) => {
    await tx
      .update(creditBalances)
      .set({
        monthlyUsed: 0,
        overageCreditsUsed: 0,
        billingPeriodStart: newPeriodStart,
        billingPeriodEnd: newPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Record transaction
    await tx.insert(creditTransactions).values({
      id: generateId(),
      userId,
      amount: 0,
      balanceAfter: CREDIT_LIMITS.pro.monthly,
      type: "monthly_reset",
      description: "Monthly credits reset",
      metadata: JSON.stringify({
        newPeriodStart: newPeriodStart.toISOString(),
        newPeriodEnd: newPeriodEnd.toISOString(),
      }),
    });
  });
}

/**
 * Reset daily credits
 */
export async function resetDailyCredits(userId: string): Promise<void> {
  const today = getTodayString();

  await db
    .update(creditBalances)
    .set({
      dailyUsed: 0,
      dailyResetDate: today,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.userId, userId));
}

/**
 * Upgrade user tier
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 */
export async function upgradeTier(
  userId: string,
  newTier: CreditTier,
  stripeSubscriptionId?: string
): Promise<void> {
  await getOrCreateCreditBalance(userId);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const updates: Partial<typeof creditBalances.$inferInsert> = {
    tier: newTier,
    updatedAt: now,
  };

  if (newTier === "pro") {
    updates.monthlyCredits = CREDIT_LIMITS.pro.monthly;
    updates.monthlyUsed = 0;
    updates.dailyCredits = CREDIT_LIMITS.pro.daily;
    updates.billingPeriodStart = now;
    updates.billingPeriodEnd = periodEnd;
    updates.overageCap = 100; // Default cap
    if (stripeSubscriptionId) {
      updates.stripeSubscriptionId = stripeSubscriptionId;
    }
  }

  // ATOMIC: Update credit balance and user tier together
  await db.transaction(async (tx) => {
    await tx
      .update(creditBalances)
      .set(updates)
      .where(eq(creditBalances.userId, userId));

    // Update user planType
    await tx
      .update(users)
      .set({ planType: newTier, updatedAt: now })
      .where(eq(users.id, userId));
  });
}

/**
 * Downgrade user to free tier
 * 
 * This function is ATOMIC - all operations wrapped in a transaction.
 * Either all updates succeed or all are rolled back.
 */
export async function downgradeTier(userId: string): Promise<void> {
  const now = new Date();

  // ATOMIC: Update credit balance and user tier together
  await db.transaction(async (tx) => {
    await tx
      .update(creditBalances)
      .set({
        tier: "free",
        monthlyCredits: 0,
        monthlyUsed: 0,
        dailyCredits: CREDIT_LIMITS.free.daily,
        overageCreditsUsed: 0,
        overageCap: null,
        stripeSubscriptionId: null,
        updatedAt: now,
      })
      .where(eq(creditBalances.userId, userId));

    await tx
      .update(users)
      .set({ planType: "free", updatedAt: now })
      .where(eq(users.id, userId));
  });
}

/**
 * Set overage cap for Pro users
 */
export async function setOverageCap(
  userId: string,
  cap: number | null
): Promise<void> {
  await db
    .update(creditBalances)
    .set({
      overageCap: cap,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.userId, userId));
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<typeof creditTransactions.$inferSelect>> {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(sql`${creditTransactions.createdAt} DESC`)
    .limit(limit)
    .offset(offset);
}

// =============================================================================
// Credit Reservation (Bulk/Cluster Generation)
// =============================================================================

/**
 * Reserve credits for a bulk/cluster generation job.
 *
 * Atomically increments reserved_credits so that single-generate
 * (which reads `available` via getCreditInfo) cannot consume them.
 *
 * Pre-checks that unreserved available credits >= amount.
 */
export async function reserveCredits(
  userId: string,
  amount: number,
  bulkJobId: string
): Promise<{ transactionId: string }> {
  const creditInfo = await getCreditInfo(userId);

  // available already subtracts existing reservations, so check directly
  if (creditInfo.available < amount) {
    throw new InsufficientCreditsError(amount, creditInfo.available, creditInfo.tier);
  }

  const transactionId = generateId();

  await db.transaction(async (tx) => {
    await tx
      .update(creditBalances)
      .set({
        reservedCredits: sql`COALESCE(${creditBalances.reservedCredits}, 0) + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    await tx.insert(creditTransactions).values({
      id: transactionId,
      userId,
      amount: 0, // Reservation is not a charge
      balanceAfter: creditInfo.available - amount,
      type: "reservation",
      source: "reserved",
      description: `Credit reservation for bulk job ${bulkJobId}`,
      bulkJobId,
      metadata: JSON.stringify({ reservedAmount: amount, bulkJobId }),
    });
  });

  return { transactionId };
}

/**
 * Release reserved credits (partially or fully).
 *
 * Called per-article as each article is processed (success or failure)
 * and as a safety cleanup when the bulk job completes.
 *
 * Atomically decrements reserved_credits (floored at 0).
 */
export async function releaseReservation(
  userId: string,
  amount: number,
  bulkJobId: string
): Promise<void> {
  if (amount <= 0) return;

  await db.transaction(async (tx) => {
    await tx
      .update(creditBalances)
      .set({
        reservedCredits: sql`GREATEST(0, COALESCE(${creditBalances.reservedCredits}, 0) - ${amount})`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    await tx.insert(creditTransactions).values({
      id: generateId(),
      userId,
      amount: 0, // Release is not a charge
      balanceAfter: 0, // Will be recalculated on next getCreditInfo call
      type: "reservation_release",
      source: "reserved",
      description: `Credit reservation release for bulk job ${bulkJobId}`,
      bulkJobId,
      metadata: JSON.stringify({ releasedAmount: amount, bulkJobId }),
    });
  });
}
