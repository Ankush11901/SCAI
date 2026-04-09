import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  createCustomerPortalSession,
  isStripeConfigured,
  createOrGetCustomer,
} from "@/lib/services/stripe-service";
import { getSubscription } from "@/lib/services/billing-service";

/**
 * POST /api/billing/portal
 * Create Stripe Customer Portal session for managing subscription
 * 
 * Response: { portalUrl }
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

    const userId = authSession.user.id;
    const userEmail = authSession.user.email;

    // Get or create Stripe customer
    const subscription = await getSubscription(userId);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      // Create a Stripe customer if they don't have one
      customerId = await createOrGetCustomer(userId, userEmail);
    }

    // Optional: get return URL from body
    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl as string | undefined;

    // Create portal session
    const portalUrl = await createCustomerPortalSession(customerId, returnUrl);

    return NextResponse.json({
      portalUrl,
    });
  } catch (error) {
    console.error("[billing/portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
