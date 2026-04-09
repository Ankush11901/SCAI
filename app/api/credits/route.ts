import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getCreditInfo, getTransactionHistory } from "@/lib/services/credit-service";

/**
 * GET /api/credits
 * Get current credit balance and recent transactions
 * 
 * Response includes:
 * - Full CreditInfo object
 * - Last 10 transactions
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

    // Get credit info and recent transactions in parallel
    const [creditInfo, transactions] = await Promise.all([
      getCreditInfo(userId),
      getTransactionHistory(userId, 10),
    ]);

    return NextResponse.json({
      credits: creditInfo,
      transactions,
    }, {
      headers: {
        // Cache for 30 seconds to reduce DB load
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[credits] Error:", error);
    return NextResponse.json(
      { error: "Failed to get credit info" },
      { status: 500 }
    );
  }
}
