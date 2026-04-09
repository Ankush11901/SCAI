import { NextRequest, NextResponse } from "next/server";
import { STRUCTURE_FLOWS, COMPONENT_LABELS, getStructureFlow } from "@/data/structure-flows";

/**
 * GET /api/structure-flows
 * Returns structure flows for article types
 * 
 * Query params:
 * - articleType: Get flow for a specific article type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleType = searchParams.get("articleType");

    if (articleType) {
      // Return flow for specific article type
      const flow = getStructureFlow(articleType);
      const flowWithLabels = flow.map((componentId) => ({
        id: componentId,
        label: COMPONENT_LABELS[componentId] || componentId,
      }));

      return NextResponse.json({
        success: true,
        data: {
          articleType,
          flow,
          flowWithLabels,
          componentCount: flow.length,
        },
      });
    }

    // Return all flows with summary
    const summary = Object.entries(STRUCTURE_FLOWS).map(([type, flow]) => ({
      articleType: type,
      componentCount: flow.length,
      flow: flow.map((id) => ({
        id,
        label: COMPONENT_LABELS[id] || id,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        flows: summary,
        labels: COMPONENT_LABELS,
        articleTypeCount: summary.length,
      },
    });
  } catch (error) {
    console.error("[structure-flows] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch structure flows",
      },
      { status: 500 }
    );
  }
}
