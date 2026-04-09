/**
 * Subscription API Route
 * 
 * GET /api/billing/subscription - Get current subscription and plan details
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSubscription } from "@/lib/services/billing-service";
import { getUserTier, getUserFeatureFlags } from "@/lib/services/access-service";
import { getCreditInfo } from "@/lib/services/credit-service";
import { PLANS } from "@/lib/billing";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all subscription-related data in parallel
    const [subscription, tier, creditInfo, features] = await Promise.all([
      getSubscription(userId),
      getUserTier(userId),
      getCreditInfo(userId),
      getUserFeatureFlags(userId),
    ]);

    const planDetails = PLANS[tier === "pro" ? "pro" : "free"];

    const totalUsed = (creditInfo.daily?.used ?? 0) + (creditInfo.monthly?.used ?? 0);
    const totalIncluded = (creditInfo.daily?.limit ?? 0) + (creditInfo.monthly?.limit ?? 0);

    // Build response
    const response = {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planType: subscription.planType,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
          }
        : null,
      plan: {
        type: planDetails.id,
        name: planDetails.name,
        price: planDetails.price,
        features: planDetails.features,
        creditsIncluded: planDetails.creditsIncluded,
        dailyLimit: planDetails.dailyLimit,
        allowedImageProviders: planDetails.imageProviders,
      },
      credits: {
        balance: creditInfo.available,
        used: totalUsed,
        included: totalIncluded,
        percentage: totalIncluded > 0 ? Math.round((totalUsed / totalIncluded) * 100) : 0,
      },
      features,
      availablePlans: Object.values(PLANS).map((plan) => ({
        type: plan.id,
        name: plan.name,
        price: plan.price,
        priceAnnual: plan.priceYearly,
        creditsIncluded: plan.creditsIncluded,
        features: plan.features,
        recommended: plan.id === "pro",
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/billing/subscription] Error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}
