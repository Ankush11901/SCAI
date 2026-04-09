import { db, generationHistory } from "@/lib/db";
import { eq, desc, isNull, and, sql } from "drizzle-orm";
import crypto from "crypto";
import type { GenerationHistory } from "@/lib/db/schema";

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

export interface CreateHistoryInput {
  userId: string;
  articleType: string;
  keyword: string;
  variation?: string;
  wordCount?: number;
  htmlContent?: string;
  status?: "pending" | "completed" | "failed";
  priority?: number; // 0=normal/supporting, 1=pillar article
}

export interface HistoryListOptions {
  limit?: number;
  offset?: number;
  articleType?: string;
  status?: string;
}

/**
 * Create a new history entry
 */
export async function createHistoryEntry(
  input: CreateHistoryInput
): Promise<GenerationHistory> {
  const id = generateId();

  await db.insert(generationHistory).values({
    id,
    userId: input.userId,
    articleType: input.articleType,
    keyword: input.keyword,
    wordCount: input.wordCount || 0,
    htmlContent: input.htmlContent || "",
    status: input.status || "pending",
    priority: input.priority ?? 0,
    metadata: JSON.stringify({
      variation: input.variation,
      createdAt: new Date().toISOString(),
    }),
  });

  const [entry] = await db
    .select()
    .from(generationHistory)
    .where(eq(generationHistory.id, id))
    .limit(1);

  return entry;
}

/**
 * Update a history entry
 */
export async function updateHistoryEntry(
  id: string,
  updates: Partial<{
    wordCount: number;
    htmlContent: string;
    status: "pending" | "completed" | "failed";
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.wordCount !== undefined) {
    updateData.wordCount = updates.wordCount;
  }
  if (updates.htmlContent !== undefined) {
    updateData.htmlContent = updates.htmlContent;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.metadata !== undefined) {
    // Merge with existing metadata instead of overwriting
    const [existing] = await db
      .select({ metadata: generationHistory.metadata })
      .from(generationHistory)
      .where(eq(generationHistory.id, id))
      .limit(1);

    let merged: Record<string, unknown> = {};
    try {
      if (existing?.metadata) merged = JSON.parse(existing.metadata);
    } catch { /* ignore */ }

    updateData.metadata = JSON.stringify({ ...merged, ...updates.metadata });
  }

  await db
    .update(generationHistory)
    .set(updateData)
    .where(eq(generationHistory.id, id));
}

/**
 * Get user's generation history (list view - excludes htmlContent for performance)
 */
export async function getUserHistory(
  userId: string,
  options: HistoryListOptions = {}
): Promise<{ entries: Omit<GenerationHistory, 'htmlContent'>[]; total: number }> {
  const { limit = 20, offset = 0, articleType, status } = options;

  // Build where conditions
  const conditions = [
    eq(generationHistory.userId, userId),
    isNull(generationHistory.deletedAt),
    // Exclude bulk-generated articles (uses indexed isBulk column)
    eq(generationHistory.isBulk, 0),
  ];

  if (articleType) {
    conditions.push(eq(generationHistory.articleType, articleType));
  }
  if (status) {
    conditions.push(eq(generationHistory.status, status));
  }

  // Run entries + count in parallel (each is an HTTP round-trip to Turso)
  const [entries, [countResult]] = await Promise.all([
    // Get entries - SELECT only needed columns (exclude htmlContent for performance)
    // Order by priority DESC (pillar articles first), then createdAt DESC (newest first)
    db.select({
        id: generationHistory.id,
        userId: generationHistory.userId,
        articleType: generationHistory.articleType,
        keyword: generationHistory.keyword,
        wordCount: generationHistory.wordCount,
        status: generationHistory.status,
        metadata: generationHistory.metadata,
        jobId: generationHistory.jobId,
        imageUrls: generationHistory.imageUrls,
        priority: generationHistory.priority,
        isBulk: generationHistory.isBulk,
        createdAt: generationHistory.createdAt,
        updatedAt: generationHistory.updatedAt,
        deletedAt: generationHistory.deletedAt,
      })
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.priority), desc(generationHistory.createdAt))
      .limit(limit)
      .offset(offset),
    // Get total count
    db.select({ count: sql<number>`count(*)` })
      .from(generationHistory)
      .where(and(...conditions)),
  ]);

  return {
    entries,
    total: countResult?.count ?? 0,
  };
}

/**
 * Get a single history entry
 */
export async function getHistoryEntry(
  id: string,
  userId: string
): Promise<GenerationHistory | null> {
  const [entry] = await db
    .select()
    .from(generationHistory)
    .where(
      and(
        eq(generationHistory.id, id),
        eq(generationHistory.userId, userId),
        isNull(generationHistory.deletedAt)
      )
    )
    .limit(1);

  return entry || null;
}

/**
 * Soft delete a history entry
 */
export async function deleteHistoryEntry(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(generationHistory)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(generationHistory.id, id),
        eq(generationHistory.userId, userId)
      )
    );

  return true;
}

/**
 * Get usage statistics for a user
 */
export async function getUserStats(userId: string): Promise<{
  totalGenerations: number;
  totalWords: number;
  articleTypeCounts: Record<string, number>;
}> {
  // Get total generations
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(generationHistory)
    .where(
      and(
        eq(generationHistory.userId, userId),
        isNull(generationHistory.deletedAt),
        eq(generationHistory.status, "completed")
      )
    );

  // Get total words
  const [wordsResult] = await db
    .select({ total: sql<number>`coalesce(sum(word_count), 0)` })
    .from(generationHistory)
    .where(
      and(
        eq(generationHistory.userId, userId),
        isNull(generationHistory.deletedAt),
        eq(generationHistory.status, "completed")
      )
    );

  // Get article type counts
  const typeCounts = await db
    .select({
      articleType: generationHistory.articleType,
      count: sql<number>`count(*)`,
    })
    .from(generationHistory)
    .where(
      and(
        eq(generationHistory.userId, userId),
        isNull(generationHistory.deletedAt),
        eq(generationHistory.status, "completed")
      )
    )
    .groupBy(generationHistory.articleType);

  const articleTypeCounts: Record<string, number> = {};
  for (const row of typeCounts) {
    articleTypeCounts[row.articleType] = row.count;
  }

  return {
    totalGenerations: totalResult?.count ?? 0,
    totalWords: wordsResult?.total ?? 0,
    articleTypeCounts,
  };
}
