import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  getUserHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  getUserStats,
} from "@/lib/services/history-service";

/**
 * GET /api/history
 * Get user's generation history
 * 
 * Query params:
 * - limit: Number of entries (default: 20)
 * - offset: Pagination offset (default: 0)
 * - articleType: Filter by article type
 * - status: Filter by status
 * - stats: If "true", return usage statistics instead
 */
export async function GET(request: NextRequest) {
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Check if requesting stats
    if (searchParams.get("stats") === "true") {
      const stats = await getUserStats(userId);
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Get history entries
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const articleType = searchParams.get("articleType") || undefined;
    const status = searchParams.get("status") || undefined;

    const { entries, total } = await getUserHistory(userId, {
      limit,
      offset,
      articleType,
      status,
    });

    // Transform entries for response (exclude full HTML content in list)
    const transformedEntries = entries.map((entry) => ({
      id: entry.id,
      articleType: entry.articleType,
      keyword: entry.keyword,
      wordCount: entry.wordCount,
      status: entry.status,
      priority: entry.priority ?? 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        entries: transformedEntries,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + entries.length < total,
        },
      },
    });
  } catch (error) {
    console.error("[history] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch history: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history
 * Delete a history entry
 * 
 * Query params:
 * - id: Entry ID to delete
 */
export async function DELETE(request: NextRequest) {
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID required" },
        { status: 400 }
      );
    }

    await deleteHistoryEntry(id, userId);

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    console.error("[history] Delete error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to delete entry: ${errorMessage}` },
      { status: 500 }
    );
  }
}
