import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getHistoryEntry } from "@/lib/services/history-service";
import { db, articleImages } from "@/lib/db";
import { eq } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/history/[id]
 * Get a specific history entry with full content
 */
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const entry = await getHistoryEntry(id, userId);

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Replace any remaining placeholder URLs with actual image URLs from articleImages
    let htmlContent = entry.htmlContent || '';
    if (htmlContent.includes('placehold.co')) {
      const images = await db.select()
        .from(articleImages)
        .where(eq(articleImages.historyId, id));

      if (images.length > 0) {
        // Sort images by their index/order if available, or just use insertion order
        for (const img of images) {
          if (img.publicUrl) {
            // Replace the first placeholder occurrence with this image URL
            htmlContent = htmlContent.replace(
              /https:\/\/placehold\.co\/[^"'\s)]+/,
              img.publicUrl
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        articleType: entry.articleType,
        keyword: entry.keyword,
        wordCount: entry.wordCount,
        status: entry.status,
        htmlContent,
        metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    console.error("[history/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch entry: ${errorMessage}` },
      { status: 500 }
    );
  }
}
