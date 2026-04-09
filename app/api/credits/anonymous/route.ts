import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAnonymousCreditInfo } from "@/lib/services/credit-service";

/**
 * POST /api/credits/anonymous
 * Check anonymous user credits based on fingerprint and IP
 * 
 * Body: { fingerprint }
 * Headers: X-Forwarded-For or X-Real-IP for IP address
 * Response: CreditInfo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint || typeof fingerprint !== "string") {
      return NextResponse.json(
        { error: "fingerprint is required" },
        { status: 400 }
      );
    }

    // Get IP address from headers
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    
    // Use the first IP in X-Forwarded-For (client's real IP)
    const ipAddress = forwardedFor?.split(",")[0]?.trim() 
      || realIp 
      || "unknown";

    // Get anonymous credit info
    const creditInfo = await getAnonymousCreditInfo(fingerprint, ipAddress);

    return NextResponse.json({
      credits: creditInfo,
    });
  } catch (error) {
    console.error("[credits/anonymous] Error:", error);
    return NextResponse.json(
      { error: "Failed to get anonymous credit info" },
      { status: 500 }
    );
  }
}
