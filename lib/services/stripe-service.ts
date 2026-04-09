/**
 * Stripe Service
 * 
 * Handles all Stripe API interactions including:
 * - Customer management
 * - Checkout sessions
 * - Customer portal
 * - Webhook verification
 * - Subscription management
 * 
 * @module lib/services/stripe-service
 */

import Stripe from "stripe";
import { db, users, subscriptions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CREDIT_PACKS, type CreditPackId } from "./billing-service";

// =============================================================================
// Configuration
// =============================================================================

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe-service] STRIPE_SECRET_KEY not set - Stripe features disabled");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-expect-error - Using latest API version, types may lag behind
      apiVersion: "2025-01-27.acacia",
    })
  : null;

/**
 * Price IDs from environment
 */
const PRICE_IDS = {
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  creditPack100: process.env.STRIPE_CREDIT_PACK_100_PRICE_ID,
  creditPack500: process.env.STRIPE_CREDIT_PACK_500_PRICE_ID,
  creditPack1000: process.env.STRIPE_CREDIT_PACK_1000_PRICE_ID,
  creditPack5000: process.env.STRIPE_CREDIT_PACK_5000_PRICE_ID,
} as const;

// =============================================================================
// Types
// =============================================================================

export type SubscriptionPeriod = "monthly" | "yearly";

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
}

// =============================================================================
// Errors
// =============================================================================

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
    this.name = "StripeNotConfiguredError";
  }
}

export class StripePriceNotConfiguredError extends Error {
  constructor(priceType: string) {
    super(`Stripe price ID not configured for: ${priceType}`);
    this.name = "StripePriceNotConfiguredError";
  }
}

// =============================================================================
// Helpers
// =============================================================================

function ensureStripe(): Stripe {
  if (!stripe) throw new StripeNotConfiguredError();
  return stripe;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// =============================================================================
// Customer Management
// =============================================================================

/**
 * Create or get existing Stripe customer for user
 */
export async function createOrGetCustomer(
  userId: string,
  email: string
): Promise<string> {
  const s = ensureStripe();

  // Check if user already has a Stripe customer ID
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) {
    // Verify customer exists in Stripe
    try {
      const customer = await s.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) {
        return user.stripeCustomerId;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  const customer = await s.customers.create({
    email,
    metadata: {
      userId,
      source: "scai-article-generator",
    },
  });

  // Save customer ID to database
  await db
    .update(users)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Also update subscriptions table
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  return customer.id;
}

// =============================================================================
// Checkout Sessions
// =============================================================================

/**
 * Create checkout session for Pro subscription
 */
export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  period: SubscriptionPeriod,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutResult> {
  const s = ensureStripe();
  const appUrl = getAppUrl();

  const priceId = period === "yearly" ? PRICE_IDS.proYearly : PRICE_IDS.proMonthly;
  if (!priceId) {
    throw new StripePriceNotConfiguredError(`pro_${period}`);
  }

  const customerId = await createOrGetCustomer(userId, email);

  const session = await s.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${appUrl}/settings?tab=billing&success=true`,
    cancel_url: cancelUrl || `${appUrl}/settings?tab=billing&canceled=true`,
    metadata: {
      userId,
      type: "subscription",
      period,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
  };
}

/**
 * Create checkout session for credit pack purchase
 */
export async function createCreditPurchaseCheckout(
  userId: string,
  email: string,
  packId: CreditPackId,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutResult> {
  const s = ensureStripe();
  const appUrl = getAppUrl();

  const priceKey = `creditPack${packId}` as keyof typeof PRICE_IDS;
  const priceId = PRICE_IDS[priceKey];
  
  if (!priceId) {
    throw new StripePriceNotConfiguredError(`credit_pack_${packId}`);
  }

  const pack = CREDIT_PACKS[packId];
  const customerId = await createOrGetCustomer(userId, email);

  const session = await s.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${appUrl}/settings?tab=billing&purchase=success`,
    cancel_url: cancelUrl || `${appUrl}/settings?tab=billing&purchase=canceled`,
    metadata: {
      userId,
      type: "credit_purchase",
      packId,
      credits: pack.credits.toString(),
    },
    payment_intent_data: {
      metadata: {
        userId,
        type: "credit_purchase",
        packId,
        credits: pack.credits.toString(),
      },
      // Use saved card if available
      setup_future_usage: "off_session",
    },
    // Enable saved payment methods for returning customers
    saved_payment_method_options: {
      allow_redisplay_filters: ["always"],
      payment_method_save: "enabled",
    },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
  };
}

// =============================================================================
// Customer Portal
// =============================================================================

/**
 * Create Stripe Customer Portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<string> {
  const s = ensureStripe();
  const appUrl = getAppUrl();

  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${appUrl}/settings?tab=billing`,
  });

  return session.url;
}

// =============================================================================
// Subscription Management
// =============================================================================

/**
 * Get subscription status from Stripe
 */
export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<{
  status: Stripe.Subscription.Status;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}> {
  const s = ensureStripe();

  const subscription = await s.subscriptions.retrieve(subscriptionId);

  // Access raw data structure - Stripe types may not match API response
  const subData = subscription as unknown as {
    status: Stripe.Subscription.Status;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };

  return {
    status: subData.status,
    currentPeriodStart: new Date(subData.current_period_start * 1000),
    currentPeriodEnd: new Date(subData.current_period_end * 1000),
    cancelAtPeriodEnd: subData.cancel_at_period_end,
  };
}

/**
 * Cancel subscription in Stripe
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<void> {
  const s = ensureStripe();

  if (immediately) {
    await s.subscriptions.cancel(subscriptionId);
  } else {
    await s.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Resume a subscription set to cancel at period end
 */
export async function resumeSubscription(subscriptionId: string): Promise<void> {
  const s = ensureStripe();

  await s.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Construct and verify webhook event from Stripe
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const s = ensureStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  return s.webhooks.constructEvent(payload, signature, webhookSecret);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!stripe && !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Get customer invoices
 */
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const s = ensureStripe();

  const invoices = await s.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Get upcoming invoice for subscription
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  const s = ensureStripe();

  try {
    // List draft invoices as a fallback since retrieveUpcoming may not be available
    const upcoming = await s.invoices.list({
      customer: customerId,
      status: 'draft',
      limit: 1,
    });
    return upcoming.data[0] ?? null;
  } catch {
    // No upcoming invoice (e.g., no active subscription)
    return null;
  }
}

/**
 * Get customer's payment methods (cards)
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<{ brand: string; last4: string; expMonth: number; expYear: number }[]> {
  const s = ensureStripe();

  const methods = await s.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 5,
  });

  return methods.data.map((pm) => ({
    brand: pm.card?.brand ?? "unknown",
    last4: pm.card?.last4 ?? "0000",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
  }));
}

/**
 * Export the stripe instance for advanced usage
 */
export function getStripeClient(): Stripe | null {
  return stripe;
}
