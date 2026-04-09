import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { setOverageCap, getCreditInfo } from "@/lib/services/credit-service";

/**
 * POST /api/billing/overage-cap
 * Set the overage spending cap for Pro users
 * 
 * Body: { cap: number | null }
 * - number: Maximum overage credits allowed (e.g., 100 = ~$6 max overage)
 * - null: Unlimited overage (no cap)
 * 
 * Response: { success, currentCap }
 */
export async function POST(request: NextRequest) {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;

    // Check if user is Pro tier
    const creditInfo = await getCreditInfo(userId);
    if (creditInfo.tier !== "pro") {
      return NextResponse.json(
        { error: "Overage cap is only available for Pro subscribers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cap } = body;

    // Validate cap value
    if (cap !== null && (typeof cap !== "number" || cap < 0)) {
      return NextResponse.json(
        { error: "Cap must be a positive number or null for unlimited" },
        { status: 400 }
      );
    }

    // Set the overage cap
    await setOverageCap(userId, cap);

    // Get updated credit info
    const updatedInfo = await getCreditInfo(userId);

    return NextResponse.json({
      success: true,
      currentCap: updatedInfo.overage?.cap ?? null,
      overageUsed: updatedInfo.overage?.used ?? 0,
      overageRemaining: updatedInfo.overage?.remaining ?? null,
    });
  } catch (error) {
    console.error("[billing/overage-cap] Error:", error);
    return NextResponse.json(
      { error: "Failed to set overage cap" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/overage-cap
 * Get current overage cap and usage
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

    const creditInfo = await getCreditInfo(authSession.user.id);

    if (creditInfo.tier !== "pro") {
      return NextResponse.json({
        available: false,
        message: "Overage cap is only available for Pro subscribers",
      });
    }

    return NextResponse.json({
      available: true,
      currentCap: creditInfo.overage?.cap ?? null,
      overageUsed: creditInfo.overage?.used ?? 0,
      overageRemaining: creditInfo.overage?.remaining ?? null,
      costSoFar: creditInfo.overage?.costSoFar ?? "$0.00",
    });
  } catch (error) {
    console.error("[billing/overage-cap] Error:", error);
    return NextResponse.json(
      { error: "Failed to get overage info" },
      { status: 500 }
    );
  }
}
