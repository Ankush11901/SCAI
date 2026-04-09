/**
 * Pusher Server-Side Client
 * 
 * Used by Trigger.dev jobs to push real-time updates to clients
 * during image generation
 */

import Pusher from "pusher";

// Initialize Pusher server client
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

// Event types for generation progress
export type GenerationEventType =
  | "generation:start"
  | "generation:phase"
  | "generation:progress"
  | "content:streaming"
  | "content:complete"
  | "image:start"
  | "image:progress"
  | "image:complete"
  | "image:failed"
  | "generation:complete"
  | "generation:failed";

// Event payloads
export interface GenerationStartEvent {
  jobId: string;
  historyId: string;
  articleType: string;
  topic: string;
  estimatedImages: number;
}

export interface GenerationPhaseEvent {
  jobId: string;
  phase: "content" | "images" | "finalizing";
  progress: number;
}

export interface ContentCompleteEvent {
  jobId: string;
  historyId: string;
  htmlWithPlaceholders: string;
  wordCount: number;
  imagePlaceholders: Array<{
    imageId: string;
    componentType: string;
    prompt: string;
  }>;
}

export interface ImageStartEvent {
  jobId: string;
  imageId: string;
  componentType: string;
  prompt: string;
  index: number;
  total: number;
}

export interface ImageProgressEvent {
  jobId: string;
  imageId: string;
  step: "orchestrating" | "fact-checking" | "generating" | "uploading";
}

export interface ImageCompleteEvent {
  jobId: string;
  imageId: string;
  url: string;
  r2Key: string;
  width: number;
  height: number;
  index: number;
  total: number;
  altText: string; // Descriptive alt text for accessibility and SEO
}

export interface ImageFailedEvent {
  jobId: string;
  imageId: string;
  error: string;
  fallbackUrl: string;
  index: number;
  total: number;
  altText: string; // Descriptive alt text for the fallback image
}

export interface GenerationCompleteEvent {
  jobId: string;
  historyId: string;
  finalHtml?: string; // Optional - not sent to avoid Pusher's 10KB payload limit
  wordCount: number;
  imageCount: number;
  successfulImages: number;
  failedImages: number;
}

export interface GenerationFailedEvent {
  jobId: string;
  historyId?: string;
  error: string;
  phase: string;
}

type EventPayloadMap = {
  "generation:start": GenerationStartEvent;
  "generation:phase": GenerationPhaseEvent;
  "generation:progress": { jobId: string; progress: number };
  "content:streaming": { jobId: string; chunk: string };
  "content:complete": ContentCompleteEvent;
  "image:start": ImageStartEvent;
  "image:progress": ImageProgressEvent;
  "image:complete": ImageCompleteEvent;
  "image:failed": ImageFailedEvent;
  "generation:complete": GenerationCompleteEvent;
  "generation:failed": GenerationFailedEvent;
};

/**
 * Get the channel name for a specific job
 */
export function getJobChannel(jobId: string): string {
  return `private-generation-${jobId}`;
}

/**
 * Get the channel name for a user's generations
 */
export function getUserChannel(userId: string): string {
  return `private-user-${userId}`;
}

/**
 * Push an event to a specific job channel
 */
export async function pushJobEvent<T extends GenerationEventType>(
  jobId: string,
  eventType: T,
  data: EventPayloadMap[T]
): Promise<void> {
  try {
    const channel = getJobChannel(jobId);
    await pusher.trigger(channel, eventType, data);
    console.log(`[Pusher] Sent ${eventType} to ${channel}`);
  } catch (error) {
    console.error(`[Pusher] Failed to send ${eventType}:`, error);
    // Don't throw - Pusher failures shouldn't break generation
  }
}

/**
 * Push an event to a user's channel
 */
export async function pushUserEvent<T extends GenerationEventType>(
  userId: string,
  eventType: T,
  data: EventPayloadMap[T]
): Promise<void> {
  try {
    const channel = getUserChannel(userId);
    await pusher.trigger(channel, eventType, data);
    console.log(`[Pusher] Sent ${eventType} to ${channel}`);
  } catch (error) {
    console.error(`[Pusher] Failed to send user event ${eventType}:`, error);
  }
}

/**
 * Push to both job and user channels
 */
export async function pushEvent<T extends GenerationEventType>(
  jobId: string,
  userId: string,
  eventType: T,
  data: EventPayloadMap[T]
): Promise<void> {
  await Promise.all([
    pushJobEvent(jobId, eventType, data),
    pushUserEvent(userId, eventType, data),
  ]);
}

/**
 * Authenticate a Pusher channel subscription (for private channels)
 */
export function authenticateChannel(
  socketId: string,
  channel: string,
  userId?: string
): Pusher.AuthResponse {
  // For private channels, we can add user data
  if (channel.startsWith("private-")) {
    return pusher.authorizeChannel(socketId, channel, {
      user_id: userId || "anonymous",
    });
  }

  return pusher.authorizeChannel(socketId, channel);
}

/**
 * Helper to create progress updates
 */
export function createProgressHelper(jobId: string, userId: string) {
  return {
    start: (data: Omit<GenerationStartEvent, "jobId">) =>
      pushEvent(jobId, userId, "generation:start", { jobId, ...data }),

    phase: (phase: "content" | "images" | "finalizing", progress: number) =>
      pushEvent(jobId, userId, "generation:phase", { jobId, phase, progress }),

    contentComplete: (data: Omit<ContentCompleteEvent, "jobId">) =>
      pushEvent(jobId, userId, "content:complete", { jobId, ...data }),

    imageStart: (data: Omit<ImageStartEvent, "jobId">) =>
      pushEvent(jobId, userId, "image:start", { jobId, ...data }),

    imageProgress: (imageId: string, step: ImageProgressEvent["step"]) =>
      pushEvent(jobId, userId, "image:progress", { jobId, imageId, step }),

    imageComplete: (data: Omit<ImageCompleteEvent, "jobId">) =>
      pushEvent(jobId, userId, "image:complete", { jobId, ...data }),

    imageFailed: (data: Omit<ImageFailedEvent, "jobId">) =>
      pushEvent(jobId, userId, "image:failed", { jobId, ...data }),

    complete: (data: Omit<GenerationCompleteEvent, "jobId">) =>
      pushEvent(jobId, userId, "generation:complete", { jobId, ...data }),

    failed: (error: string, phase: string, historyId?: string) =>
      pushEvent(jobId, userId, "generation:failed", { jobId, historyId, error, phase }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORDPRESS EXPORT EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportStartEvent {
  jobId: string;
  totalArticles: number;
}

export interface ExportArticleProgressEvent {
  jobId: string;
  historyId: string;
  status: "uploading-images" | "creating-post";
  index: number;
  total: number;
}

export interface ExportArticleCompleteEvent {
  jobId: string;
  historyId: string;
  postId: number;
  postUrl: string;
  editUrl?: string;
  index: number;
  total: number;
}

export interface ExportArticleFailedEvent {
  jobId: string;
  historyId: string;
  error: string;
  index: number;
  total: number;
}

export interface ExportCompleteEvent {
  jobId: string;
  completed: number;
  failed: number;
  total: number;
}

export interface ExportFailedEvent {
  jobId: string;
  error: string;
  completed: number;
  failed: number;
}

export { pusher };
