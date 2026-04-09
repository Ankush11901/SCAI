import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  createCreditPurchaseCheckout,
  isStripeConfigured,
  StripeNotConfiguredError,
  StripePriceNotConfiguredError,
} from "@/lib/services/stripe-service";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/services/billing-service";

const VALID_PACK_IDS = Object.keys(CREDIT_PACKS) as CreditPackId[];

/**
 * POST /api/credits/purchase
 * Create Stripe checkout session for credit pack purchase
 * 
 * Body: { packId: '100' | '500' | '1000' | '5000' }
 * Response: { checkoutUrl }
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
    const { packId } = body;

    // Validate pack ID
    if (!packId || !VALID_PACK_IDS.includes(packId as CreditPackId)) {
      return NextResponse.json(
        { 
          error: "Invalid pack ID", 
          validPacks: VALID_PACK_IDS,
        },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkout = await createCreditPurchaseCheckout(
      authSession.user.id,
      authSession.user.email,
      packId as CreditPackId
    );

    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    });
  } catch (error) {
    console.error("[credits/purchase] Error:", error);

    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "Payment system not available" },
        { status: 503 }
      );
    }

    if (error instanceof StripePriceNotConfiguredError) {
      return NextResponse.json(
        { error: "Credit pack pricing not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/credits/purchase
 * Get available credit packs and their pricing
 */
export async function GET() {
  const packs = Object.entries(CREDIT_PACKS).map(([id, pack]) => {
    return {
      id,
      credits: pack.credits,
      price: pack.price / 100,
      priceFormatted: pack.priceDisplay,
      pricePerCredit: (pack.price / 100) / pack.credits,
      pricePerCreditFormatted: `$${((pack.price / 100) / pack.credits).toFixed(3)}`,
    };
  });

  return NextResponse.json({
    packs,
    stripeConfigured: isStripeConfigured(),
  });
}
