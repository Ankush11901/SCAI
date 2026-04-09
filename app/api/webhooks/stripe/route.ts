import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { 
  constructWebhookEvent, 
  getStripeClient,
} from "@/lib/services/stripe-service";
import {
  createSubscription,
  cancelSubscription,
  updateSubscriptionStatus,
  handleSubscriptionRenewal,
  handleCreditPurchase,
  processEventIdempotently,
  getUserByStripeCustomerId,
} from "@/lib/services/billing-service";
import { upgradeTier, downgradeTier } from "@/lib/services/credit-service";

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * Events handled:
 * - checkout.session.completed: New subscription or credit purchase
 * - invoice.paid: Subscription renewal
 * - invoice.payment_failed: Payment failure notification
 * - customer.subscription.updated: Status changes
 * - customer.subscription.deleted: Subscription canceled
 */
export async function POST(request: NextRequest) {
  console.log("[webhook/stripe] *** POST received ***");

  const body = await request.text();
  console.log(`[webhook/stripe] Body length: ${body.length}, has content: ${body.length > 0}`);

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  console.log(`[webhook/stripe] Signature present: ${!!signature}`);

  if (!signature) {
    console.error("[webhook/stripe] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    console.error("[webhook/stripe] Signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log(`[webhook/stripe] Received event: ${event.type} (${event.id})`);

  try {
    // Process with idempotency protection
    const result = await processEventIdempotently(event.id, event.type, async () => {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case "invoice.paid":
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`[webhook/stripe] Unhandled event type: ${event.type}`);
      }
    });

    if (result.skipped) {
      console.log(`[webhook/stripe] Event ${event.id} already processed, skipping`);
    } else {
      console.log(`[webhook/stripe] Event ${event.id} processed successfully`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[webhook/stripe] Error processing ${event.type}:`, error);
    // Return 200 anyway to prevent Stripe from retrying
    // The error is logged and can be investigated
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle checkout.session.completed
 * Called when a customer completes checkout for subscription or credit purchase
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.client_reference_id || session.metadata?.userId;

  console.log(`[webhook/stripe] handleCheckoutCompleted: mode=${session.mode}, customer=${customerId}, client_reference_id=${session.client_reference_id}, metadata.userId=${session.metadata?.userId}, resolved userId=${userId}`);

  if (!userId) {
    console.error("[webhook/stripe] No user ID in checkout session (checked client_reference_id and metadata.userId)");
    return;
  }

  if (session.mode === "subscription") {
    // New subscription created
    const subscriptionId = session.subscription as string;
    console.log(`[webhook/stripe] Processing subscription: ${subscriptionId} for user ${userId}`);

    // Get subscription details from Stripe
    const stripe = getStripeClient();
    if (!stripe) {
      console.error("[webhook/stripe] Stripe client not available!");
      return;
    }

    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    // Access the subscription data
    const subscription = subscriptionResponse as unknown as {
      current_period_start: number;
      current_period_end: number;
      items: { data: Array<{ price: { id: string } }> };
    };
    const priceId = subscription.items.data[0]?.price.id || "";

    console.log(`[webhook/stripe] Stripe sub details: priceId=${priceId}, periodStart=${subscription.current_period_start}, periodEnd=${subscription.current_period_end}`);

    // Create subscription in our database
    await createSubscription(userId, "pro", {
      customerId,
      subscriptionId,
      priceId,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd: new Date(subscription.current_period_end * 1000),
      creditsIncluded: 2000, // Pro tier monthly credits
    });
    console.log(`[webhook/stripe] createSubscription completed for user ${userId}`);

    // Upgrade user to Pro tier
    await upgradeTier(userId, "pro", subscriptionId);
    console.log(`[webhook/stripe] upgradeTier completed for user ${userId}`);
  } else if (session.mode === "payment") {
    // One-time credit purchase
    const metadata = session.metadata || {};
    const packId = metadata.pack_id || "unknown";
    const credits = parseInt(metadata.credits || "0");

    if (credits > 0) {
      await handleCreditPurchase(
        userId,
        credits,
        session.payment_intent as string,
        packId
      );
      console.log(`[webhook/stripe] Credit purchase: ${credits} credits for user ${userId}`);
    }
  }
}

/**
 * Handle invoice.paid
 * Called when a subscription invoice is paid (including renewals)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Type assertion for subscription field (may be string, object, or null)
  const inv = invoice as unknown as { 
    subscription: string | { id: string } | null;
    customer: string | { id: string };
  };
  
  const subscriptionId = typeof inv.subscription === "string" 
    ? inv.subscription 
    : inv.subscription?.id;
    
  if (!subscriptionId) {
    // Not a subscription invoice
    return;
  }

  const customerId = typeof inv.customer === "string"
    ? inv.customer
    : inv.customer?.id;
    
  if (!customerId) return;

  const userId = await getUserByStripeCustomerId(customerId);

  if (!userId) {
    console.error(`[webhook/stripe] No user found for customer ${customerId}`);
    return;
  }

  // Get subscription details from Stripe
  const stripe = getStripeClient();
  if (!stripe) return;

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = subscriptionResponse as unknown as {
    current_period_start: number;
    current_period_end: number;
  };

  // Reset monthly credits on renewal
  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);
  
  // handleSubscriptionRenewal() calls resetMonthlyCredits() internally
  await handleSubscriptionRenewal(userId, periodStart, periodEnd);

  console.log(`[webhook/stripe] Invoice paid, credits reset for user ${userId}`);
}

/**
 * Handle invoice.payment_failed
 * Called when a subscription payment fails
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Type assertion for invoice fields
  const inv = invoice as unknown as { 
    subscription: string | { id: string } | null;
    customer: string | { id: string };
  };
  
  const subscriptionId = typeof inv.subscription === "string" 
    ? inv.subscription 
    : inv.subscription?.id;
    
  if (!subscriptionId) return;

  const customerId = typeof inv.customer === "string"
    ? inv.customer
    : inv.customer?.id;
    
  if (!customerId) return;

  const userId = await getUserByStripeCustomerId(customerId);
  if (!userId) return;

  // Update subscription status to past_due
  await updateSubscriptionStatus(userId, "past_due");

  // TODO: Send notification email to user about payment failure
  console.log(`[webhook/stripe] Payment failed for user ${userId}`);
}

/**
 * Handle customer.subscription.updated
 * Called when subscription status changes
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
    
  const userId = await getUserByStripeCustomerId(customerId);

  if (!userId) return;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    trialing: "trialing",
    unpaid: "past_due",
    paused: "canceled",
  };

  const ourStatus = statusMap[subscription.status] || "active";
  await updateSubscriptionStatus(userId, ourStatus as any);

  console.log(`[webhook/stripe] Subscription updated for user ${userId}: ${ourStatus}`);
}

/**
 * Handle customer.subscription.deleted
 * Called when subscription is canceled/deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
    
  const userId = await getUserByStripeCustomerId(customerId);

  if (!userId) return;

  // Cancel subscription in our database
  await cancelSubscription(userId, true);

  // Downgrade user to free tier
  await downgradeTier(userId);

  console.log(`[webhook/stripe] Subscription deleted, user ${userId} downgraded to free`);
}
