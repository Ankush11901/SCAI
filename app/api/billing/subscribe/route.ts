import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  createSubscriptionCheckout,
  isStripeConfigured,
  StripeNotConfiguredError,
  StripePriceNotConfiguredError,
  type SubscriptionPeriod,
} from "@/lib/services/stripe-service";

const VALID_PERIODS: SubscriptionPeriod[] = ["monthly", "yearly"];

/**
 * POST /api/billing/subscribe
 * Create Stripe checkout session for Pro subscription
 * 
 * Body: { period: 'monthly' | 'yearly' }
 * Response: { checkoutUrl, sessionId }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const authSession = await getAuthSession();

    if (!authSession?.user?.id || !authSession?.user?.email) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { period = "monthly" } = body;

    // Validate period
    if (!VALID_PERIODS.includes(period as SubscriptionPeriod)) {
      return NextResponse.json(
        { 
          error: "Invalid billing period", 
          validPeriods: VALID_PERIODS,
        },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkout = await createSubscriptionCheckout(
      authSession.user.id,
      authSession.user.email,
      period as SubscriptionPeriod
    );

    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    });
  } catch (error) {
    console.error("[billing/subscribe] Error:", error);

    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "Payment system not available" },
        { status: 503 }
      );
    }

    if (error instanceof StripePriceNotConfiguredError) {
      return NextResponse.json(
        { error: "Subscription pricing not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
