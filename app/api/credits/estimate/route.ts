import { NextRequest, NextResponse } from "next/server";
import { estimateArticleCredits, creditsToCost } from "@/lib/services/credit-estimator";

/**
 * POST /api/credits/estimate
 * Estimate credits required for an article generation
 * 
 * Body: { wordCount, articleType, imageProvider, imageCount?, selectedComponents? }
 * Response: { credits, breakdown, estimatedCost }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      wordCount,
      articleType,
      imageProvider = "flux",
      imageCount,
      selectedComponents, // Array of enabled component IDs (e.g., ['featured-image', 'h2-image', 'faq'])
    } = body;

    // Validate required fields
    if (!wordCount || typeof wordCount !== "number") {
      return NextResponse.json(
        { error: "wordCount is required and must be a number" },
        { status: 400 }
      );
    }

    if (!articleType || typeof articleType !== "string") {
      return NextResponse.json(
        { error: "articleType is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate selectedComponents if provided
    if (selectedComponents !== undefined && !Array.isArray(selectedComponents)) {
      return NextResponse.json(
        { error: "selectedComponents must be an array if provided" },
        { status: 400 }
      );
    }

    // Estimate credits
    const estimate = estimateArticleCredits({
      wordCount,
      articleType,
      imageProvider: imageProvider as "flux" | "gemini" | "none",
      imageCount,
      selectedComponents,
    });

    // Calculate cost (returns string like "5.00")
    const estimatedCost = creditsToCost(estimate.totalCredits);

    return NextResponse.json({
      credits: estimate.totalCredits,
      breakdown: {
        textCredits: estimate.textCredits,
        imageCredits: estimate.imageCredits,
        imageCount: estimate.imageCount,
      },
      estimatedCost: {
        amount: parseFloat(estimatedCost),
        formatted: `$${estimatedCost}`,
      },
    });
  } catch (error) {
    console.error("[credits/estimate] Error:", error);
    return NextResponse.json(
      { error: "Failed to estimate credits" },
      { status: 500 }
    );
  }
}
