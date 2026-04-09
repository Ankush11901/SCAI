import { NextRequest, NextResponse } from "next/server";
import { getComponentsForArticleType, COMPONENTS } from "@/data/components";

/**
 * GET /api/components
 * Returns components, optionally filtered by article type
 * 
 * Query params:
 * - articleType: Filter components for a specific article type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleType = searchParams.get("articleType");

    if (articleType) {
      // Return components for specific article type
      const components = getComponentsForArticleType(articleType);

      const required = components.filter((c) => c.required);
      const optional = components.filter((c) => !c.required);

      return NextResponse.json({
        success: true,
        data: {
          articleType,
          components,
          required,
          optional,
          counts: {
            total: components.length,
            required: required.length,
            optional: optional.length,
          },
        },
      });
    }

    // Return all components
    return NextResponse.json({
      success: true,
      data: {
        components: COMPONENTS,
        count: COMPONENTS.length,
      },
    });
  } catch (error) {
    console.error("[components] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch components",
      },
      { status: 500 }
    );
  }
}
