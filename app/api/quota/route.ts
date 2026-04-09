import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getQuotaInfo, getQuotaHistory } from "@/lib/services/quota-service";
import { getCreditInfo } from "@/lib/services/credit-service";

/**
 * GET /api/quota
 * Check remaining daily quota and credit balance
 * 
 * Response is cached for 30 seconds to reduce database calls
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

    // Get quota and credit info in parallel
    const [quotaInfo, creditInfo] = await Promise.all([
      getQuotaInfo(authSession.user.id),
      getCreditInfo(authSession.user.id),
    ]);

    // Calculate total available credits (use available from creditInfo which handles all cases)
    const totalCredits = creditInfo.available;

    // Return combined quota and credit info with cache headers
    return NextResponse.json({
      quota: quotaInfo,
      credits: {
        tier: creditInfo.tier, // Include tier for UI to conditionally show PAYG
        daily: null, // Daily credits are deprecated — all tiers use monthly
        monthly: creditInfo.monthly ?? null,
        payg: { balance: creditInfo.paygBalance ?? 0 },
        overage: creditInfo.overage ?? null,
        total: totalCredits,
        isUnlimited: creditInfo.isUnlimited ?? false,
      },
    }, {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("[quota] Error:", error);
    return NextResponse.json(
      { error: "Failed to check quota" },
      { status: 500 }
    );
  }
}

