import { NextRequest, NextResponse } from "next/server";
import { estimateArticleCredits, calculateImageCount } from "@/lib/services/credit-estimator";
import type { ImageProvider } from "@/lib/services/credit-estimator";

const ALL_ARTICLE_TYPES = [
  "affiliate", "commercial", "comparison", "how-to",
  "informational", "listicle", "local", "recipe", "review",
];

/**
 * POST /api/credits/estimate-bulk
 *
 * Estimate total credits for a cluster/bulk generation job.
 * Averages per-type costs across allowed article types, then multiplies by articleCount.
 *
 * Body: { wordCount, imageProvider, allowedArticleTypes?, articleCount, selectedComponents? }
 * Response: { totalCredits, perArticleAverage, breakdown }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      wordCount = 1000,
      imageProvider = "flux",
      allowedArticleTypes,
      articleCount = 1,
      selectedComponents, // Optional: enabled component IDs (applies to all articles)
    } = body as {
      wordCount?: number;
      imageProvider?: string;
      allowedArticleTypes?: string[];
      articleCount?: number;
      selectedComponents?: string[];
    };

    if (typeof articleCount !== "number" || articleCount < 1) {
      return NextResponse.json(
        { error: "articleCount must be a positive number" },
        { status: 400 }
      );
    }

    const types =
      allowedArticleTypes && allowedArticleTypes.length > 0
        ? allowedArticleTypes
        : ALL_ARTICLE_TYPES;

    const provider = (imageProvider as ImageProvider) || "flux";

    const breakdown: Array<{ type: string; credits: number }> = [];
    let totalPerType = 0;

    for (const type of types) {
      const imageCount = calculateImageCount(type, wordCount, selectedComponents);
      const est = estimateArticleCredits({
        articleType: type,
        wordCount,
        imageCount,
        imageProvider: provider,
        selectedComponents,
      });
      breakdown.push({ type, credits: est.totalCredits });
      totalPerType += est.totalCredits;
    }

    const perArticleAverage = Math.round(totalPerType / types.length);
    const totalCredits = perArticleAverage * articleCount;

    return NextResponse.json({
      totalCredits,
      perArticleAverage,
      breakdown,
    });
  } catch (error) {
    console.error("[credits/estimate-bulk] Error:", error);
    return NextResponse.json(
      { error: "Failed to estimate bulk credits" },
      { status: 500 }
    );
  }
}
