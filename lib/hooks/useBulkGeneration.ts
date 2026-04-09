"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  subscribeToBulkGeneration,
  type BulkStartEvent,
  type BulkProgressEvent,
  type BulkCompleteEvent,
  type BulkFailedEvent,
  type ArticleStartEvent,
  type ArticleProgressEvent,
  type ArticleCompleteEvent,
  type ArticleErrorEvent,
} from "@/lib/services/pusher-client";
import type { TitleVariation } from "@/lib/types/generation";
import type { AIProvider } from "@/lib/ai/providers";
import type { BaseVariationName } from "@/lib/services/template-hydrator";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BulkArticleStatus = "pending" | "generating" | "complete" | "error";
export type BulkArticlePhase = "queued" | "content" | "images" | "finalizing" | "complete";

export interface BulkArticle {
  id: string;
  articleType: string;
  keyword: string;
  status: BulkArticleStatus;
  phase: BulkArticlePhase;
  progress: number;
  wordCount?: number;
  imageCount?: number;
  htmlContent?: string;
  historyId?: string;
  errorMessage?: string;
  priority?: number;
}

export interface BulkJobStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  progress: number;
}

export type BulkJobStatus = "idle" | "starting" | "running" | "queued" | "completed" | "failed" | "cancelled";

export interface QueuedJob {
  id: string;
  mode: string;
  keyword: string | null;
  variation: string;
  variations?: string[];
  status: string;
  queuePosition: number;
  quotaReserved: number;
  totalArticles: number;
  createdAt: string;
  articles: Array<{
    id: string;
    articleType: string;
    keyword: string;
    status: string;
    progress: number;
  }>;
}

export interface BulkGenerationState {
  status: BulkJobStatus;
  jobId: string | null;
  articles: BulkArticle[];
  stats: BulkJobStats;
  error?: string;
  queuedJobs: QueuedJob[];
}

export interface BulkGenerationSettings {
  targetWordCount?: number;
  variationName?: BaseVariationName | "random";
  componentColor?: string;
  provider?: AIProvider;
  skipImages?: boolean;
  imageProvider?: "gemini" | "flux";
  excludeComponents?: string[];
}

interface CSVRow {
  keyword: string;
  articleType: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "scai-bulk-job-id";

function saveJobId(jobId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, jobId);
  }
}

function loadJobId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null;
}

function clearJobId() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: BulkGenerationState = {
  status: "idle",
  jobId: null,
  articles: [],
  stats: {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    progress: 0,
  },
  queuedJobs: [],
};

export interface UseBulkGenerationReturn {
  state: BulkGenerationState;
  isRunning: boolean;
  hasQueue: boolean;
  startGeneration: (params: {
    mode: "single" | "csv";
    keyword?: string;
    csvData?: CSVRow[];
    variations: TitleVariation[];
    settings?: BulkGenerationSettings;
  }) => Promise<{ queued?: boolean; position?: number }>;
  retryFailed: (articleIds?: string[]) => Promise<void>;
  cancelJob: (jobId?: string) => Promise<void>;
  clearJob: () => void;
  resumeJob: (jobId: string) => Promise<void>;
  fetchQueue: () => Promise<void>;
  removeFromQueue: (jobId: string) => Promise<void>;
}

export function useBulkGeneration(): UseBulkGenerationReturn {
  const [state, setState] = useState<BulkGenerationState>(initialState);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch queue from API
  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/bulk/queue");
      if (!response.ok) return;

      const data = await response.json();
      const { runningJob, queuedJobs } = data;

      setState((prev) => {
        const newState = { ...prev, queuedJobs: queuedJobs || [] };

        // If there's a running job and we're not tracking it, load it
        if (runningJob && prev.status === "idle") {
          return {
            ...newState,
            status: "running",
            jobId: runningJob.id,
            articles: runningJob.articles?.map((a: any) => ({
              id: a.id,
              articleType: a.articleType,
              keyword: a.keyword,
              status: a.status,
              phase: a.phase || "queued",
              progress: a.progress || 0,
              priority: a.priority ?? 0,
            })) || [],
            stats: {
              total: runningJob.totalArticles,
              completed: runningJob.completedArticles || 0,
              failed: runningJob.failedArticles || 0,
              pending: runningJob.totalArticles - (runningJob.completedArticles || 0) - (runningJob.failedArticles || 0),
              progress: runningJob.totalArticles > 0
                ? Math.round(((runningJob.completedArticles || 0) / runningJob.totalArticles) * 100)
                : 0,
            },
          };
        }

        return newState;
      });

      // Subscribe to running job if we have one
      if (runningJob) {
        saveJobId(runningJob.id);
        subscribeToPusher(runningJob.id);
      }
    } catch (error) {
      console.error("[useBulkGeneration] Failed to fetch queue:", error);
    }
  }, []);

  // Check for existing job on mount
  useEffect(() => {
    const savedJobId = loadJobId();
    if (savedJobId) {
      // Try to resume the job
      fetchJobStatus(savedJobId);
    }

    // Also fetch the queue
    fetchQueue();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Fetch job status from API
  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/bulk/${jobId}`);
      if (!response.ok) {
        // Job not found or error - clear saved ID
        clearJobId();
        return;
      }

      const data = await response.json();
      const { job, articles } = data;

      // Map articles to our state format
      const mappedArticles: BulkArticle[] = articles.map((a: any) => ({
        id: a.id,
        articleType: a.articleType,
        keyword: a.keyword,
        status: a.status,
        phase: a.phase || "queued",
        progress: a.progress || 0,
        wordCount: a.wordCount,
        imageCount: a.imageCount,
        htmlContent: a.htmlContent,
        historyId: a.historyId,
        errorMessage: a.errorMessage,
        priority: a.priority ?? 0,
      }));

      const stats: BulkJobStats = {
        total: job.totalArticles,
        completed: job.completedArticles || 0,
        failed: job.failedArticles || 0,
        pending: job.totalArticles - (job.completedArticles || 0) - (job.failedArticles || 0),
        progress: job.totalArticles > 0
          ? Math.round(((job.completedArticles || 0) / job.totalArticles) * 100)
          : 0,
      };

      // Determine status
      let status: BulkJobStatus = "idle";
      if (job.status === "running" || job.status === "queued" || job.status === "pending") {
        status = "running";
        // Subscribe to Pusher for updates
        subscribeToPusher(jobId);
      } else if (job.status === "completed") {
        status = "completed";
        clearJobId();
      } else if (job.status === "failed") {
        status = "failed";
      } else if (job.status === "cancelled") {
        status = "cancelled";
        clearJobId();
      }

      setState((prev) => ({
        ...prev,
        status,
        jobId,
        articles: mappedArticles,
        stats,
        error: job.errorMessage,
      }));
    } catch (error) {
      console.error("[useBulkGeneration] Failed to fetch job status:", error);
      clearJobId();
    }
  }, []);

  // Subscribe to Pusher events
  const subscribeToPusher = useCallback((jobId: string) => {
    // Unsubscribe from previous if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    console.log("[useBulkGeneration] Subscribing to Pusher:", jobId);

    unsubscribeRef.current = subscribeToBulkGeneration(jobId, {
      onBulkStart: (event: BulkStartEvent) => {
        console.log("[useBulkGeneration] bulk:start", event);
        setState((prev) => ({
          ...prev,
          status: "running",
          stats: {
            ...prev.stats,
            total: event.totalArticles,
            pending: event.totalArticles,
          },
        }));
      },

      onBulkProgress: (event: BulkProgressEvent) => {
        setState((prev) => ({
          ...prev,
          stats: {
            total: prev.stats.total,
            completed: event.completed,
            failed: event.failed,
            pending: event.pending,
            progress: event.progress,
          },
        }));
      },

      onBulkComplete: async (event: BulkCompleteEvent) => {
        console.log("[useBulkGeneration] bulk:complete", event);

        // Unsubscribe
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        // Fetch full job status to get htmlContent for completed articles
        try {
          const response = await fetch(`/api/bulk/${jobId}`);
          if (response.ok) {
            const data = await response.json();
            const { articles } = data;

            // Map articles with full content
            const mappedArticles: BulkArticle[] = articles.map((a: any) => ({
              id: a.id,
              articleType: a.articleType,
              keyword: a.keyword,
              status: a.status,
              phase: a.phase || "complete",
              progress: a.status === "complete" ? 100 : a.progress || 0,
              wordCount: a.wordCount,
              imageCount: a.imageCount,
              htmlContent: a.htmlContent,
              historyId: a.historyId,
              errorMessage: a.errorMessage,
              priority: a.priority ?? 0,
            }));

            clearJobId();

            setState((prev) => ({
              ...prev,
              status: event.failed === event.total ? "failed" : "completed",
              articles: mappedArticles,
              stats: {
                total: event.total,
                completed: event.completed,
                failed: event.failed,
                pending: 0,
                progress: 100,
              },
            }));
            return;
          }
        } catch (error) {
          console.error("[useBulkGeneration] Failed to fetch completed job:", error);
        }

        // Fallback if fetch fails
        clearJobId();
        setState((prev) => ({
          ...prev,
          status: event.failed === event.total ? "failed" : "completed",
          stats: {
            total: event.total,
            completed: event.completed,
            failed: event.failed,
            pending: 0,
            progress: 100,
          },
        }));
      },

      onBulkFailed: (event: BulkFailedEvent) => {
        console.error("[useBulkGeneration] bulk:failed", event);
        clearJobId();

        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          status: "failed",
          error: event.error,
        }));
      },

      onArticleStart: (event: ArticleStartEvent) => {
        setState((prev) => ({
          ...prev,
          articles: prev.articles.map((a) =>
            a.id === event.articleId
              ? { ...a, status: "generating" as const, phase: "content" as const, progress: 5 }
              : a
          ),
        }));
      },

      onArticleProgress: (event: ArticleProgressEvent) => {
        setState((prev) => ({
          ...prev,
          articles: prev.articles.map((a) =>
            a.id === event.articleId
              ? { ...a, phase: event.phase, progress: event.progress }
              : a
          ),
        }));
      },

      onArticleComplete: async (event: ArticleCompleteEvent) => {
        // Update status immediately
        setState((prev) => ({
          ...prev,
          articles: prev.articles.map((a) =>
            a.id === event.articleId
              ? {
                  ...a,
                  status: "complete" as const,
                  phase: "complete" as const,
                  progress: 100,
                  wordCount: event.wordCount,
                  imageCount: event.imageCount,
                }
              : a
          ),
        }));

        // Fetch the article HTML in the background for preview
        try {
          const response = await fetch(`/api/bulk/${jobId}`);
          if (response.ok) {
            const data = await response.json();
            const completedArticle = data.articles?.find((a: any) => a.id === event.articleId);
            if (completedArticle?.htmlContent) {
              setState((prev) => ({
                ...prev,
                articles: prev.articles.map((a) =>
                  a.id === event.articleId
                    ? { ...a, htmlContent: completedArticle.htmlContent }
                    : a
                ),
              }));
            }
          }
        } catch (error) {
          // Silently fail - HTML will be fetched on job completion
          console.debug("[useBulkGeneration] Failed to fetch article HTML:", error);
        }
      },

      onArticleError: (event: ArticleErrorEvent) => {
        setState((prev) => ({
          ...prev,
          articles: prev.articles.map((a) =>
            a.id === event.articleId
              ? {
                  ...a,
                  status: "error" as const,
                  progress: 0,
                  errorMessage: event.error,
                }
              : a
          ),
        }));
      },
    });
  }, []);

  // Start generation
  const startGeneration = useCallback(
    async (params: {
      mode: "single" | "csv";
      keyword?: string;
      csvData?: CSVRow[];
      variations: TitleVariation[];
      settings?: BulkGenerationSettings;
    }): Promise<{ queued?: boolean; position?: number }> => {
      setState((prev) => ({ ...prev, status: "starting" }));

      try {
        const response = await fetch("/api/bulk/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = await response.json();
          // Pass through 402 (Payment Required) with full details for paywall
          if (response.status === 402) {
            const paywallError = new Error(error.error || "Insufficient credits");
            (paywallError as any).status = 402;
            (paywallError as any).details = error;
            throw paywallError;
          }
          // Pass through 403 (Subscription Required) with details for paywall
          if (response.status === 403 && error.upgradeRequired) {
            const paywallError = new Error(error.error || "Subscription required");
            (paywallError as any).status = 403;
            (paywallError as any).details = error;
            throw paywallError;
          }
          throw new Error(error.error || "Failed to start bulk generation");
        }

        const data = await response.json();
        const { jobId, articles, status, queuePosition } = data;

        // Map articles to state
        const mappedArticles: BulkArticle[] = articles.map((a: any) => ({
          id: a.id,
          articleType: a.articleType,
          keyword: a.keyword,
          status: "pending" as const,
          phase: "queued" as const,
          progress: 0,
          priority: a.priority ?? 0,
        }));

        // If job was queued (not started immediately)
        if (status === "queued") {
          // Add to queued jobs list
          const newQueuedJob: QueuedJob = {
            id: jobId,
            mode: params.mode,
            keyword: params.keyword || null,
            variation: params.variations.join(", "),
            variations: params.variations,
            status: "queued",
            queuePosition: queuePosition || 1,
            quotaReserved: articles.length,
            totalArticles: articles.length,
            createdAt: new Date().toISOString(),
            articles: mappedArticles.map((a) => ({
              id: a.id,
              articleType: a.articleType,
              keyword: a.keyword,
              status: a.status,
              progress: a.progress,
            })),
          };

          setState((prev) => ({
            ...prev,
            status: prev.status === "running" ? "running" : "idle", // Keep running if already running
            queuedJobs: [...prev.queuedJobs, newQueuedJob],
          }));

          return { queued: true, position: queuePosition };
        }

        // Job started immediately
        saveJobId(jobId);

        setState((prev) => ({
          ...prev,
          status: "running",
          jobId,
          articles: mappedArticles,
          stats: {
            total: articles.length,
            completed: 0,
            failed: 0,
            pending: articles.length,
            progress: 0,
          },
        }));

        // Subscribe to Pusher
        subscribeToPusher(jobId);

        return { queued: false };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: prev.queuedJobs.length > 0 || prev.jobId ? prev.status : "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    [subscribeToPusher]
  );

  // Retry failed articles
  const retryFailed = useCallback(
    async (articleIds?: string[]) => {
      if (!state.jobId) return;

      try {
        const response = await fetch(`/api/bulk/${state.jobId}/retry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleIds }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to retry articles");
        }

        const { retriedCount, articleIds: retriedIds } = await response.json();

        // Update state - mark retried articles as pending
        setState((prev) => ({
          ...prev,
          status: "running",
          articles: prev.articles.map((a) =>
            retriedIds.includes(a.id)
              ? { ...a, status: "pending" as const, phase: "queued" as const, progress: 0, errorMessage: undefined }
              : a
          ),
          stats: {
            ...prev.stats,
            failed: prev.stats.failed - retriedCount,
            pending: prev.stats.pending + retriedCount,
          },
        }));

        // Save job ID and subscribe to Pusher
        saveJobId(state.jobId);
        subscribeToPusher(state.jobId);
      } catch (error) {
        console.error("[useBulkGeneration] Retry failed:", error);
      }
    },
    [state.jobId, subscribeToPusher]
  );

  // Cancel job (can cancel current job or a specific queued job)
  const cancelJob = useCallback(async (jobId?: string) => {
    const targetJobId = jobId || state.jobId;
    if (!targetJobId) return;

    try {
      const response = await fetch(`/api/bulk/${targetJobId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel job");
      }

      // If cancelling the current running job
      if (targetJobId === state.jobId) {
        // Unsubscribe from Pusher
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        clearJobId();

        setState((prev) => ({
          ...prev,
          status: "cancelled",
          articles: prev.articles.map((a) =>
            a.status === "pending" || a.status === "generating"
              ? { ...a, status: "error" as const, errorMessage: "Cancelled by user" }
              : a
          ),
        }));
      } else {
        // Cancelling a queued job - remove from queue
        setState((prev) => ({
          ...prev,
          queuedJobs: prev.queuedJobs.filter((j) => j.id !== targetJobId),
        }));
      }

      // Refresh queue after cancel
      await fetchQueue();
    } catch (error) {
      console.error("[useBulkGeneration] Cancel failed:", error);
    }
  }, [state.jobId, fetchQueue]);

  // Remove from queue (alias for cancelJob on queued jobs)
  const removeFromQueue = useCallback(async (jobId: string) => {
    await cancelJob(jobId);
  }, [cancelJob]);

  // Clear job (reset state)
  const clearJob = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    clearJobId();
    setState(initialState);
  }, []);

  // Resume job
  const resumeJob = useCallback(
    async (jobId: string) => {
      saveJobId(jobId);
      await fetchJobStatus(jobId);
    },
    [fetchJobStatus]
  );

  return {
    state,
    isRunning: state.status === "starting" || state.status === "running",
    hasQueue: state.queuedJobs.length > 0,
    startGeneration,
    retryFailed,
    cancelJob,
    clearJob,
    resumeJob,
    fetchQueue,
    removeFromQueue,
  };
}
