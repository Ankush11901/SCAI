import { NextResponse } from "next/server";
import { ARTICLE_TYPES } from "@/data/article-types";

/**
 * GET /api/article-types
 * Returns all available article types with their configuration
 */
export async function GET() {
  try {
    const articleTypes = ARTICLE_TYPES.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      icon: type.icon,
      variations: type.variations,
      uniqueComponents: type.uniqueComponents,
    }));

    return NextResponse.json({
      success: true,
      data: articleTypes,
      count: articleTypes.length,
    });
  } catch (error) {
    console.error("[article-types] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article types",
      },
      { status: 500 }
    );
  }
}
