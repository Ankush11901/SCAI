/**
 * WordPress Export Task
 *
 * Trigger.dev background task that exports articles to WordPress.
 * Processes articles sequentially, sending Pusher events for real-time progress.
 * Reuses the existing exportToWordPress() service function.
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@/lib/db";
import { exportJobs, wordpressConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { exportToWordPress } from "@/lib/services/wordpress/export-service";
import { sendExportCompletionEmail } from "@/lib/services/email-service";
import Pusher from "pusher";

// Local Pusher instance for Trigger.dev runtime (same pattern as bulk-generate.ts)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WpExportPayload {
  jobId: string;
  userId: string;
  connectionId: string;
  postStatus: "draft" | "publish";
  articles: Array<{
    historyId: string;
    keyword: string;
    categories: string[];
    tags: string[];
  }>;
}

export interface WpExportResult {
  success: boolean;
  jobId: string;
  completedArticles: number;
  failedArticles: number;
}

interface ArticleState {
  historyId: string;
  keyword: string;
  categories: string[];
  tags: string[];
  status: "pending" | "exporting" | "completed" | "failed";
  postId?: number;
  postUrl?: string;
  editUrl?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendExportEvent(
  jobId: string,
  userId: string,
  event: string,
  data: Record<string, unknown>
) {
  try {
    await pusher.trigger(`private-export-${jobId}`, event, {
      ...data,
      timestamp: Date.now(),
    });

    await pusher.trigger(`private-user-${userId}`, event, {
      ...data,
      jobId,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.warn("Failed to send Pusher export event", { event, error: String(error) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK
// ═══════════════════════════════════════════════════════════════════════════════

export const wpExportTask = task({
  id: "wp-export",
  maxDuration: 3600, // 1 hour
  machine: { preset: "small-1x" }, // I/O bound, not CPU intensive
  retry: { maxAttempts: 1 }, // Don't retry whole job; per-article errors are caught
  run: async (payload: WpExportPayload): Promise<WpExportResult> => {
    const { jobId, userId, connectionId, postStatus, articles } = payload;

    logger.info("Starting WordPress export", {
      jobId,
      articleCount: articles.length,
      postStatus,
    });

    let completedArticles = 0;
    let failedArticles = 0;

    // Load current articles state from DB
    const [job] = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.id, jobId))
      .limit(1);

    let articlesState: ArticleState[] = [];
    try {
      articlesState = JSON.parse(job?.articles || "[]");
    } catch {
      articlesState = articles.map((a) => ({ ...a, status: "pending" as const }));
    }

    try {
      // Mark job as running
      await db
        .update(exportJobs)
        .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(exportJobs.id, jobId));

      await sendExportEvent(jobId, userId, "export:start", {
        totalArticles: articles.length,
      });

      // Process articles sequentially
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        // Update article status to exporting
        articlesState = articlesState.map((a) =>
          a.historyId === article.historyId ? { ...a, status: "exporting" as const } : a
        );
        await db
          .update(exportJobs)
          .set({ articles: JSON.stringify(articlesState), updatedAt: new Date() })
          .where(eq(exportJobs.id, jobId));

        await sendExportEvent(jobId, userId, "export:article-progress", {
          historyId: article.historyId,
          status: "uploading-images",
          index: i + 1,
          total: articles.length,
        });

        try {
          const result = await exportToWordPress({
            connectionId,
            historyId: article.historyId,
            userId,
            status: postStatus,
            categories: article.categories,
            tags: article.tags,
          });

          completedArticles++;

          articlesState = articlesState.map((a) =>
            a.historyId === article.historyId
              ? {
                  ...a,
                  status: "completed" as const,
                  postId: result.postId,
                  postUrl: result.postUrl,
                  editUrl: result.editUrl,
                }
              : a
          );

          await db
            .update(exportJobs)
            .set({
              completedArticles,
              articles: JSON.stringify(articlesState),
              updatedAt: new Date(),
            })
            .where(eq(exportJobs.id, jobId));

          await sendExportEvent(jobId, userId, "export:article-complete", {
            historyId: article.historyId,
            postId: result.postId,
            postUrl: result.postUrl,
            editUrl: result.editUrl,
            index: i + 1,
            total: articles.length,
          });

          logger.info("Article exported", {
            historyId: article.historyId,
            postId: result.postId,
            index: i + 1,
          });
        } catch (error) {
          failedArticles++;
          const errorMsg = error instanceof Error ? error.message : String(error);

          articlesState = articlesState.map((a) =>
            a.historyId === article.historyId
              ? { ...a, status: "failed" as const, error: errorMsg }
              : a
          );

          await db
            .update(exportJobs)
            .set({
              failedArticles,
              articles: JSON.stringify(articlesState),
              updatedAt: new Date(),
            })
            .where(eq(exportJobs.id, jobId));

          await sendExportEvent(jobId, userId, "export:article-failed", {
            historyId: article.historyId,
            error: errorMsg,
            index: i + 1,
            total: articles.length,
          });

          logger.warn("Article export failed", {
            historyId: article.historyId,
            error: errorMsg,
            index: i + 1,
          });
        }
      }

      // Finalize job
      const finalStatus = failedArticles === articles.length ? "failed" : "completed";
      await db
        .update(exportJobs)
        .set({
          status: finalStatus,
          completedArticles,
          failedArticles,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(exportJobs.id, jobId));

      await sendExportEvent(jobId, userId, "export:complete", {
        completed: completedArticles,
        failed: failedArticles,
        total: articles.length,
      });

      // Send completion email
      try {
        const [connection] = await db
          .select({ siteName: wordpressConnections.siteName, siteUrl: wordpressConnections.siteUrl })
          .from(wordpressConnections)
          .where(eq(wordpressConnections.id, connectionId))
          .limit(1);

        await sendExportCompletionEmail({
          userId,
          jobId,
          siteName: connection?.siteName || connection?.siteUrl,
          completedArticles,
          failedArticles,
          totalArticles: articles.length,
          postStatus,
        });
      } catch (emailError) {
        logger.warn("Failed to send export completion email", { emailError });
      }

      logger.info("WordPress export complete", {
        jobId,
        completedArticles,
        failedArticles,
      });

      return { success: true, jobId, completedArticles, failedArticles };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("WordPress export failed", { jobId, error: errorMsg });

      await db
        .update(exportJobs)
        .set({
          status: "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(exportJobs.id, jobId));

      await sendExportEvent(jobId, userId, "export:failed", {
        error: errorMsg,
        completed: completedArticles,
        failed: failedArticles,
      });

      // Send failure email
      try {
        const [connection] = await db
          .select({ siteName: wordpressConnections.siteName, siteUrl: wordpressConnections.siteUrl })
          .from(wordpressConnections)
          .where(eq(wordpressConnections.id, connectionId))
          .limit(1);

        await sendExportCompletionEmail({
          userId,
          jobId,
          siteName: connection?.siteName || connection?.siteUrl,
          completedArticles,
          failedArticles,
          totalArticles: articles.length,
          postStatus,
          error: errorMsg,
        });
      } catch (emailError) {
        logger.warn("Failed to send export failure email", { emailError });
      }

      return { success: false, jobId, completedArticles, failedArticles };
    }
  },
});
