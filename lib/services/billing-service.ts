/**
 * Billing Service
 * 
 * Manages subscription lifecycle and billing operations including:
 * - Subscription creation/cancellation
 * - Invoice history
 * - Idempotent webhook processing
 * 
 * @module lib/services/billing-service
 */

import { db, subscriptions, billingEvents, users } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { 
  upgradeTier, 
  downgradeTier, 
  addPurchasedCredits,
  resetMonthlyCredits,
  type CreditTier 
} from "./credit-service";

// =============================================================================
// Types
// =============================================================================

export type PlanType = "free" | "pro" | "payg";
export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "trialing";

export interface SubscriptionInfo {
  id: string | null;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  creditsIncluded: number;
  creditsUsed: number;
}

export interface BillingInvoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  date: Date;
  description: string;
  invoiceUrl?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// Subscription Management
// =============================================================================

/**
 * Get or create subscription record for user
 */
async function getOrCreateSubscription(userId: string) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) return existing;

  // Get user's current plan type
  const [user] = await db
    .select({ planType: users.planType })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const newSub = {
    id: generateId(),
    userId,
    status: "none" as const,
    planType: (user?.planType as PlanType) || "free",
    creditsIncluded: 0,
    creditsUsed: 0,
    creditsBalance: 0,
  };

  await db.insert(subscriptions).values(newSub);
  return newSub;
}

/**
 * Get subscription info for a user
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const sub = await getOrCreateSubscription(userId);

  // Type guard for database row (has all Stripe fields)
  const hasStripeFields = (s: typeof sub): s is typeof sub & {
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean | null;
  } => 'stripeCustomerId' in s;

  if (hasStripeFields(sub)) {
    return {
      id: sub.id,
      userId: sub.userId,
      planType: sub.planType as PlanType,
      status: sub.status as SubscriptionStatus,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
      creditsIncluded: sub.creditsIncluded ?? 0,
      creditsUsed: sub.creditsUsed ?? 0,
    };
  }

  // Fallback for new subscription object (no Stripe fields yet)
  return {
    id: sub.id,
    userId: sub.userId,
    planType: sub.planType as PlanType,
    status: sub.status as SubscriptionStatus,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    creditsIncluded: sub.creditsIncluded ?? 0,
    creditsUsed: sub.creditsUsed ?? 0,
  };
}

/**
 * Create new subscription (from Stripe webhook)
 * 
 * This function is ATOMIC - subscription update is transactional,
 * and upgradeTier is separately atomic.
 */
export async function createSubscription(
  userId: string,
  planType: PlanType,
  stripeData: {
    customerId: string;
    subscriptionId: string;
    priceId: string;
    periodStart: Date;
    periodEnd: Date;
    creditsIncluded: number;
  }
): Promise<void> {
  // Ensure the subscription row exists before updating
  await getOrCreateSubscription(userId);

  // ATOMIC: Update subscription record
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        planType,
        status: "active",
        stripeCustomerId: stripeData.customerId,
        stripeSubscriptionId: stripeData.subscriptionId,
        stripePriceId: stripeData.priceId,
        currentPeriodStart: stripeData.periodStart,
        currentPeriodEnd: stripeData.periodEnd,
        creditsIncluded: stripeData.creditsIncluded,
        creditsUsed: 0,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  });

  // Upgrade tier in credit system (separately atomic)
  await upgradeTier(userId, planType as CreditTier, stripeData.subscriptionId);
}

/**
 * Cancel subscription
 * 
 * This function is ATOMIC - subscription update is transactional,
 * and downgradeTier is separately atomic.
 */
export async function cancelSubscription(
  userId: string,
  immediately: boolean = false
): Promise<void> {
  if (immediately) {
    // ATOMIC: Update subscription status
    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          status: "canceled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));
    });

    // Downgrade immediately (separately atomic)
    await downgradeTier(userId);
  } else {
    // Cancel at end of billing period
    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));
    });
  }
}

/**
 * Update subscription status
 * 
 * This function is ATOMIC - subscription update is transactional,
 * and downgradeTier (if called) is separately atomic.
 */
export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
  updates?: {
    periodStart?: Date;
    periodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<void> {
  const setData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (updates?.periodStart) setData.currentPeriodStart = updates.periodStart;
  if (updates?.periodEnd) setData.currentPeriodEnd = updates.periodEnd;
  if (updates?.cancelAtPeriodEnd !== undefined) {
    setData.cancelAtPeriodEnd = updates.cancelAtPeriodEnd;
  }

  // ATOMIC: Update subscription status
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set(setData)
      .where(eq(subscriptions.userId, userId));
  });

  // Handle status changes (separately atomic)
  if (status === "canceled") {
    await downgradeTier(userId);
  }
}

/**
 * Handle subscription renewal (invoice.paid)
 * 
 * This function is ATOMIC - subscription update is transactional,
 * and resetMonthlyCredits is separately atomic.
 */
export async function handleSubscriptionRenewal(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // ATOMIC: Update subscription record
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        creditsUsed: 0,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  });

  // Reset monthly credits (separately atomic)
  await resetMonthlyCredits(userId, periodStart, periodEnd);
}

// =============================================================================
// Credit Purchase Processing
// =============================================================================

/**
 * Handle credit pack purchase
 */
export async function handleCreditPurchase(
  userId: string,
  credits: number,
  stripePaymentId: string,
  packId: string
): Promise<void> {
  await addPurchasedCredits(
    userId,
    credits,
    stripePaymentId,
    `PAYG Credit Pack: ${packId} (${credits} credits)`
  );
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Check if a Stripe event has already been processed
 */
export async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, stripeEventId))
    .limit(1);

  return !!existing;
}

/**
 * Record a processed Stripe event
 */
export async function recordProcessedEvent(
  stripeEventId: string,
  eventType: string,
  payload?: unknown
): Promise<void> {
  await db.insert(billingEvents).values({
    id: generateId(),
    stripeEventId,
    eventType,
    processedAt: new Date(),
    payload: payload ? JSON.stringify(payload) : null,
  });
}

/**
 * Process an event with idempotency check
 */
export async function processEventIdempotently<T>(
  stripeEventId: string,
  eventType: string,
  processor: () => Promise<T>,
  payload?: unknown
): Promise<{ processed: boolean; result?: T; skipped?: boolean }> {
  // Check if already processed
  if (await isEventProcessed(stripeEventId)) {
    return { processed: false, skipped: true };
  }

  // Process the event
  const result = await processor();

  // Record as processed
  await recordProcessedEvent(stripeEventId, eventType, payload);

  return { processed: true, result };
}

// =============================================================================
// Invoice / Transaction History
// =============================================================================

/**
 * Get billing history for user
 * Note: This queries our local records. For full invoice data,
 * we'd need to integrate with Stripe's invoice API
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  transactions: Array<{
    id: string;
    date: Date;
    type: string;
    amount: string;
    description: string;
  }>;
  hasMore: boolean;
}> {
  // Import here to avoid circular dependency
  const { creditTransactions } = await import("@/lib/db");

  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = transactions.length > limit;
  const items = transactions.slice(0, limit).map((t) => ({
    id: t.id,
    date: t.createdAt || new Date(),
    type: t.type,
    amount: t.amount > 0 ? `+${t.amount}` : `${t.amount}`,
    description: t.description || t.type,
  }));

  return { transactions: items, hasMore };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return sub?.userId || null;
}

/**
 * Link Stripe customer to user
 */
export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await getOrCreateSubscription(userId);

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  // Also update user record
  await db
    .update(users)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Get credit pack configuration
 */
export const CREDIT_PACKS = {
  "100": { credits: 100, price: 500, priceDisplay: "$5.00" },
  "500": { credits: 500, price: 2500, priceDisplay: "$25.00" },
  "1000": { credits: 1000, price: 5000, priceDisplay: "$50.00" },
  "5000": { credits: 5000, price: 25000, priceDisplay: "$250.00" },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;
