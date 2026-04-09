"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  subscribeToExport,
  type ExportStartEvent,
  type ExportArticleProgressEvent,
  type ExportArticleCompleteEvent,
  type ExportArticleFailedEvent,
  type ExportCompleteEvent,
  type ExportFailedEvent,
} from "@/lib/services/pusher-client";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportArticle {
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

export type ExportJobStatus =
  | "idle"
  | "starting"
  | "running"
  | "completed"
  | "failed";

export interface ExportState {
  status: ExportJobStatus;
  jobId: string | null;
  articles: ExportArticle[];
  completed: number;
  failed: number;
  total: number;
  error?: string;
}

export interface StartExportParams {
  connectionId: string;
  postStatus: "draft" | "publish";
  articles: Array<{
    historyId: string;
    keyword: string;
    categories: string[];
    tags: string[];
  }>;
}

export interface UseWordPressExportReturn {
  state: ExportState;
  isExporting: boolean;
  startExport: (params: StartExportParams) => Promise<void>;
  retryFailed: () => Promise<void>;
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: ExportState = {
  status: "idle",
  jobId: null,
  articles: [],
  completed: 0,
  failed: 0,
  total: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useWordPressExport(): UseWordPressExportReturn {
  const [state, setState] = useState<ExportState>(initialState);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // Store last export params for retry
  const lastParamsRef = useRef<StartExportParams | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Subscribe to Pusher events
  const subscribeToPusher = useCallback((jobId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeToExport(jobId, {
      onExportStart: (_event: ExportStartEvent) => {
        setState((prev) => ({
          ...prev,
          status: "running",
        }));
      },

      onArticleProgress: (event: ExportArticleProgressEvent) => {
        setState((prev) => ({
          ...prev,
          articles: prev.articles.map((a) =>
            a.historyId === event.historyId
              ? { ...a, status: "exporting" as const }
              : a
          ),
        }));
      },

      onArticleComplete: (event: ExportArticleCompleteEvent) => {
        setState((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          articles: prev.articles.map((a) =>
            a.historyId === event.historyId
              ? {
                  ...a,
                  status: "completed" as const,
                  postId: event.postId,
                  postUrl: event.postUrl,
                  editUrl: event.editUrl,
                }
              : a
          ),
        }));
      },

      onArticleFailed: (event: ExportArticleFailedEvent) => {
        setState((prev) => ({
          ...prev,
          failed: prev.failed + 1,
          articles: prev.articles.map((a) =>
            a.historyId === event.historyId
              ? { ...a, status: "failed" as const, error: event.error }
              : a
          ),
        }));
      },

      onExportComplete: (_event: ExportCompleteEvent) => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          status: prev.failed === prev.total ? "failed" : "completed",
        }));
      },

      onExportFailed: (event: ExportFailedEvent) => {
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
    });
  }, []);

  // Start export
  const startExport = useCallback(
    async (params: StartExportParams) => {
      lastParamsRef.current = params;

      setState({
        status: "starting",
        jobId: null,
        articles: params.articles.map((a) => ({
          ...a,
          status: "pending" as const,
        })),
        completed: 0,
        failed: 0,
        total: params.articles.length,
      });

      try {
        const response = await fetch("/api/wordpress/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: params.connectionId,
            postStatus: params.postStatus,
            articles: params.articles,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to start export");
        }

        const data = await response.json();
        const { jobId } = data;

        setState((prev) => ({
          ...prev,
          status: "running",
          jobId,
        }));

        subscribeToPusher(jobId);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [subscribeToPusher]
  );

  // Retry failed articles
  const retryFailed = useCallback(async () => {
    if (!lastParamsRef.current) return;

    const failedArticles = state.articles
      .filter((a) => a.status === "failed")
      .map((a) => ({
        historyId: a.historyId,
        keyword: a.keyword,
        categories: a.categories,
        tags: a.tags,
      }));

    if (failedArticles.length === 0) return;

    await startExport({
      connectionId: lastParamsRef.current.connectionId,
      postStatus: lastParamsRef.current.postStatus,
      articles: failedArticles,
    });
  }, [state.articles, startExport]);

  // Reset state
  const reset = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    lastParamsRef.current = null;
    setState(initialState);
  }, []);

  return {
    state,
    isExporting: state.status === "starting" || state.status === "running",
    startExport,
    retryFailed,
    reset,
  };
}
