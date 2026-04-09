import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  getSubscription,
  createSubscription,
} from "@/lib/services/billing-service";
import { getCreditInfo, upgradeTier } from "@/lib/services/credit-service";
import {
  getStripeClient,
  isStripeConfigured,
} from "@/lib/services/stripe-service";

/**
 * GET /api/billing/sync
 *
 * Returns current subscription status for polling.
 * Used to detect if webhook has processed after checkout.
 */
export async function GET() {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;
    const [subscription, creditInfo] = await Promise.all([
      getSubscription(userId),
      getCreditInfo(userId),
    ]);

    return NextResponse.json({
      tier: creditInfo.tier,
      subscription: {
        status: subscription.status,
        planType: subscription.planType,
      },
    });
  } catch (error) {
    console.error("[billing/sync GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/sync
 *
 * Directly checks Stripe for the user's subscription status and syncs
 * it to the database. Used as a fallback after Stripe checkout redirect
 * when the webhook may not have processed yet.
 */
export async function POST() {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;
    const stripe = getStripeClient();

    if (!stripe || !isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }

    // Get our current subscription record
    const ourSub = await getSubscription(userId);

    // If we already show an active pro subscription, no sync needed
    if (ourSub.status === "active" && ourSub.planType === "pro") {
      const creditInfo = await getCreditInfo(userId);
      return NextResponse.json({
        synced: false,
        reason: "already_active",
        tier: creditInfo.tier,
      });
    }

    // Check if user has a Stripe customer ID
    const customerId = ourSub.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({
        synced: false,
        reason: "no_stripe_customer",
        tier: "free",
      });
    }

    // Query Stripe directly for active subscriptions
    const stripeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (stripeSubs.data.length === 0) {
      return NextResponse.json({
        synced: false,
        reason: "no_active_stripe_subscription",
        tier: "free",
      });
    }

    // Found an active subscription on Stripe that we don't have locally — sync it
    const stripeSub = stripeSubs.data[0] as unknown as {
      id: string;
      current_period_start: number;
      current_period_end: number;
      items: { data: Array<{ price: { id: string } }> };
    };
    const priceId = stripeSub.items.data[0]?.price.id || "";

    console.log(`[billing/sync] Syncing Stripe subscription ${stripeSub.id} for user ${userId}`);

    await createSubscription(userId, "pro", {
      customerId,
      subscriptionId: stripeSub.id,
      priceId,
      periodStart: new Date(stripeSub.current_period_start * 1000),
      periodEnd: new Date(stripeSub.current_period_end * 1000),
      creditsIncluded: 2000,
    });

    // upgradeTier is already called inside createSubscription,
    // but call it again to be safe in case the first one had a stale row
    await upgradeTier(userId, "pro", stripeSub.id);

    const creditInfo = await getCreditInfo(userId);

    console.log(`[billing/sync] Sync complete for user ${userId}: tier=${creditInfo.tier}`);

    return NextResponse.json({
      synced: true,
      tier: creditInfo.tier,
      subscriptionId: stripeSub.id,
    });
  } catch (error) {
    console.error("[billing/sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
