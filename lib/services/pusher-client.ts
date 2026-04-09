/**
 * Pusher Client-Side Setup
 * 
 * Client-side Pusher initialization for receiving real-time
 * updates during article generation
 */

"use client";

import Pusher from "pusher-js";
import type {
  GenerationStartEvent,
  GenerationPhaseEvent,
  ContentCompleteEvent,
  ImageStartEvent,
  ImageProgressEvent,
  ImageCompleteEvent,
  ImageFailedEvent,
  GenerationCompleteEvent,
  GenerationFailedEvent,
} from "./pusher-server";

// Re-export event types for client use
export type {
  GenerationStartEvent,
  GenerationPhaseEvent,
  ContentCompleteEvent,
  ImageStartEvent,
  ImageProgressEvent,
  ImageCompleteEvent,
  ImageFailedEvent,
  GenerationCompleteEvent,
  GenerationFailedEvent,
};

let pusherClient: Pusher | null = null;

/**
 * Get or create the Pusher client instance
 */
export function getPusherClient(): Pusher {
  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";

    if (!key) {
      throw new Error("NEXT_PUBLIC_PUSHER_KEY is not configured");
    }

    pusherClient = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      authTransport: "ajax",
    });

    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      pusherClient.connection.bind("connected", () => {
        console.log("[Pusher] Connected");
      });
      pusherClient.connection.bind("disconnected", () => {
        console.log("[Pusher] Disconnected");
      });
      pusherClient.connection.bind("error", (error: Error) => {
        console.error("[Pusher] Connection error:", error);
      });
    }
  }

  return pusherClient;
}

/**
 * Disconnect and cleanup Pusher client
 */
export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}

/**
 * Event handlers type definition
 */
export interface GenerationEventHandlers {
  onStart?: (event: GenerationStartEvent) => void;
  onPhase?: (event: GenerationPhaseEvent) => void;
  onProgress?: (progress: number) => void;
  onContentStreaming?: (chunk: string) => void;
  onContentComplete?: (event: ContentCompleteEvent) => void;
  onImageStart?: (event: ImageStartEvent) => void;
  onImageProgress?: (event: ImageProgressEvent) => void;
  onImageComplete?: (event: ImageCompleteEvent) => void;
  onImageFailed?: (event: ImageFailedEvent) => void;
  onComplete?: (event: GenerationCompleteEvent) => void;
  onFailed?: (event: GenerationFailedEvent) => void;
}

/**
 * Subscribe to generation events for a specific job
 */
export function subscribeToGeneration(
  jobId: string,
  handlers: GenerationEventHandlers
): () => void {
  const pusher = getPusherClient();
  const channelName = `private-generation-${jobId}`;
  const channel = pusher.subscribe(channelName);

  // Bind event handlers
  if (handlers.onStart) {
    channel.bind("generation:start", handlers.onStart);
  }
  if (handlers.onPhase) {
    channel.bind("generation:phase", handlers.onPhase);
  }
  if (handlers.onProgress) {
    channel.bind("generation:progress", (data: { progress: number }) => {
      handlers.onProgress!(data.progress);
    });
  }
  if (handlers.onContentStreaming) {
    channel.bind("content:streaming", (data: { chunk: string }) => {
      handlers.onContentStreaming!(data.chunk);
    });
  }
  if (handlers.onContentComplete) {
    channel.bind("content:complete", handlers.onContentComplete);
  }
  if (handlers.onImageStart) {
    channel.bind("image:start", handlers.onImageStart);
  }
  if (handlers.onImageProgress) {
    channel.bind("image:progress", handlers.onImageProgress);
  }
  if (handlers.onImageComplete) {
    channel.bind("image:complete", handlers.onImageComplete);
  }
  if (handlers.onImageFailed) {
    channel.bind("image:failed", handlers.onImageFailed);
  }
  if (handlers.onComplete) {
    channel.bind("generation:complete", handlers.onComplete);
  }
  if (handlers.onFailed) {
    channel.bind("generation:failed", handlers.onFailed);
  }

  // Return unsubscribe function
  return () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
  };
}

/**
 * Subscribe to all generations for a user
 */
export function subscribeToUserGenerations(
  userId: string,
  handlers: GenerationEventHandlers
): () => void {
  const pusher = getPusherClient();
  const channelName = `private-user-${userId}`;
  const channel = pusher.subscribe(channelName);

  // Bind all handlers (same as job subscription)
  Object.entries(handlers).forEach(([key, handler]) => {
    if (handler) {
      const eventName = key
        .replace("on", "")
        .replace(/([A-Z])/g, ":$1")
        .toLowerCase()
        .slice(1);
      channel.bind(eventName, handler);
    }
  });

  return () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
  };
}

/**
 * Replace image placeholders in HTML with actual URLs
 */
export function replaceImagePlaceholder(
  html: string,
  imageId: string,
  url: string
): string {
  // Replace placeholder img src
  const placeholderPattern = new RegExp(
    `<img([^>]*?)data-image-id="${imageId}"([^>]*?)src="[^"]*"`,
    "g"
  );

  let updated = html.replace(
    placeholderPattern,
    `<img$1data-image-id="${imageId}"$2src="${url}"`
  );

  // Also update any loading states
  updated = updated.replace(
    new RegExp(`data-image-id="${imageId}"([^>]*?)data-loading="true"`, "g"),
    `data-image-id="${imageId}"$1data-loading="false"`
  );

  return updated;
}

/**
 * Mark an image as failed in the HTML
 */
export function markImageFailed(
  html: string,
  imageId: string,
  fallbackUrl: string
): string {
  const pattern = new RegExp(
    `<img([^>]*?)data-image-id="${imageId}"([^>]*?)src="[^"]*"`,
    "g"
  );

  return html.replace(
    pattern,
    `<img$1data-image-id="${imageId}"$2src="${fallbackUrl}" data-failed="true"`
  );
}

/**
 * Check if all images in HTML have been loaded
 */
export function areAllImagesLoaded(html: string): boolean {
  const loadingPattern = /data-loading="true"/g;
  return !loadingPattern.test(html);
}

/**
 * Count images with different states in HTML
 */
export function countImageStates(html: string): {
  total: number;
  loading: number;
  completed: number;
  failed: number;
} {
  const imagePattern = /data-image-id="[^"]+"/g;
  const loadingPattern = /data-loading="true"/g;
  const failedPattern = /data-failed="true"/g;

  const total = (html.match(imagePattern) || []).length;
  const loading = (html.match(loadingPattern) || []).length;
  const failed = (html.match(failedPattern) || []).length;
  const completed = total - loading - failed;

  return { total, loading, completed, failed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK GENERATION EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkStartEvent {
  totalArticles: number;
  timestamp: number;
}

export interface BulkProgressEvent {
  completed: number;
  failed: number;
  pending: number;
  progress: number;
  timestamp: number;
}

export interface BulkCompleteEvent {
  completed: number;
  failed: number;
  total: number;
  timestamp: number;
}

export interface BulkFailedEvent {
  error: string;
  completed: number;
  failed: number;
  timestamp: number;
}

export interface ArticleStartEvent {
  articleId: string;
  articleType: string;
  keyword: string;
  index: number;
  total: number;
  timestamp: number;
}

export interface ArticleProgressEvent {
  articleId: string;
  phase: "queued" | "content" | "images" | "finalizing" | "complete";
  progress: number;
  timestamp: number;
}

export interface ArticleCompleteEvent {
  articleId: string;
  wordCount: number;
  imageCount: number;
  index: number;
  total: number;
  timestamp: number;
}

export interface ArticleErrorEvent {
  articleId: string;
  error: string;
  index: number;
  total: number;
  timestamp: number;
}

/**
 * Event handlers type definition for bulk generation
 */
export interface BulkEventHandlers {
  onBulkStart?: (event: BulkStartEvent) => void;
  onBulkProgress?: (event: BulkProgressEvent) => void;
  onBulkComplete?: (event: BulkCompleteEvent) => void;
  onBulkFailed?: (event: BulkFailedEvent) => void;
  onArticleStart?: (event: ArticleStartEvent) => void;
  onArticleProgress?: (event: ArticleProgressEvent) => void;
  onArticleComplete?: (event: ArticleCompleteEvent) => void;
  onArticleError?: (event: ArticleErrorEvent) => void;
}

/**
 * Subscribe to bulk generation events for a specific job
 */
export function subscribeToBulkGeneration(
  jobId: string,
  handlers: BulkEventHandlers
): () => void {
  const pusher = getPusherClient();
  const channelName = `private-bulk-${jobId}`;
  const channel = pusher.subscribe(channelName);

  // Bind event handlers
  if (handlers.onBulkStart) {
    channel.bind("bulk:start", handlers.onBulkStart);
  }
  if (handlers.onBulkProgress) {
    channel.bind("bulk:progress", handlers.onBulkProgress);
  }
  if (handlers.onBulkComplete) {
    channel.bind("bulk:complete", handlers.onBulkComplete);
  }
  if (handlers.onBulkFailed) {
    channel.bind("bulk:failed", handlers.onBulkFailed);
  }
  if (handlers.onArticleStart) {
    channel.bind("article:start", handlers.onArticleStart);
  }
  if (handlers.onArticleProgress) {
    channel.bind("article:progress", handlers.onArticleProgress);
  }
  if (handlers.onArticleComplete) {
    channel.bind("article:complete", handlers.onArticleComplete);
  }
  if (handlers.onArticleError) {
    channel.bind("article:error", handlers.onArticleError);
  }

  // Return unsubscribe function
  return () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORDPRESS EXPORT EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportStartEvent {
  jobId: string;
  totalArticles: number;
  timestamp: number;
}

export interface ExportArticleProgressEvent {
  jobId: string;
  historyId: string;
  status: "uploading-images" | "creating-post";
  index: number;
  total: number;
  timestamp: number;
}

export interface ExportArticleCompleteEvent {
  jobId: string;
  historyId: string;
  postId: number;
  postUrl: string;
  editUrl?: string;
  index: number;
  total: number;
  timestamp: number;
}

export interface ExportArticleFailedEvent {
  jobId: string;
  historyId: string;
  error: string;
  index: number;
  total: number;
  timestamp: number;
}

export interface ExportCompleteEvent {
  jobId: string;
  completed: number;
  failed: number;
  total: number;
  timestamp: number;
}

export interface ExportFailedEvent {
  jobId: string;
  error: string;
  completed: number;
  failed: number;
  timestamp: number;
}

/**
 * Event handlers type definition for WordPress export
 */
export interface ExportEventHandlers {
  onExportStart?: (event: ExportStartEvent) => void;
  onArticleProgress?: (event: ExportArticleProgressEvent) => void;
  onArticleComplete?: (event: ExportArticleCompleteEvent) => void;
  onArticleFailed?: (event: ExportArticleFailedEvent) => void;
  onExportComplete?: (event: ExportCompleteEvent) => void;
  onExportFailed?: (event: ExportFailedEvent) => void;
}

/**
 * Subscribe to WordPress export events for a specific job
 */
export function subscribeToExport(
  jobId: string,
  handlers: ExportEventHandlers
): () => void {
  const pusher = getPusherClient();
  const channelName = `private-export-${jobId}`;
  const channel = pusher.subscribe(channelName);

  if (handlers.onExportStart) {
    channel.bind("export:start", handlers.onExportStart);
  }
  if (handlers.onArticleProgress) {
    channel.bind("export:article-progress", handlers.onArticleProgress);
  }
  if (handlers.onArticleComplete) {
    channel.bind("export:article-complete", handlers.onArticleComplete);
  }
  if (handlers.onArticleFailed) {
    channel.bind("export:article-failed", handlers.onArticleFailed);
  }
  if (handlers.onExportComplete) {
    channel.bind("export:complete", handlers.onExportComplete);
  }
  if (handlers.onExportFailed) {
    channel.bind("export:failed", handlers.onExportFailed);
  }

  return () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
  };
}
