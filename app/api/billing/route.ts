import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSubscription } from "@/lib/services/billing-service";
import { getCreditInfo } from "@/lib/services/credit-service";
import { getCustomerPaymentMethods, isStripeConfigured } from "@/lib/services/stripe-service";

/**
 * GET /api/billing
 * Get current billing and subscription info
 * 
 * Response: { tier, subscription, nextBilling, credits }
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

    // Get subscription and credit info in parallel
    const [subscription, creditInfo] = await Promise.all([
      getSubscription(userId),
      getCreditInfo(userId),
    ]);

    // Fetch payment methods if Stripe is configured and user has a customer ID
    let paymentMethod = null;
    if (isStripeConfigured() && subscription.stripeCustomerId) {
      try {
        const methods = await getCustomerPaymentMethods(subscription.stripeCustomerId);
        if (methods.length > 0) {
          paymentMethod = methods[0];
        }
      } catch (error) {
        console.error("[billing] Failed to fetch payment methods:", error);
      }
    }

    return NextResponse.json({
      tier: creditInfo.tier,
      subscription: {
        status: subscription.status,
        planType: subscription.planType,
        creditsIncluded: subscription.creditsIncluded,
        creditsUsed: subscription.creditsUsed,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      nextBilling: subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toISOString()
        : null,
      credits: creditInfo,
      paymentMethod,
    });
  } catch (error) {
    console.error("[billing] Error:", error);
    return NextResponse.json(
      { error: "Failed to get billing info" },
      { status: 500 }
    );
  }
}
