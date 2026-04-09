"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { getComponentsForArticleType, type ComponentDefinition } from "@/data/components";
import type { TitleVariation, UsedVariation } from "@/lib/types/generation";
import {
  subscribeToGeneration,
  type ImageCompleteEvent,
  type ImageFailedEvent,
  type GenerationCompleteEvent,
} from "@/lib/services/pusher-client";

export interface GenerationState {
  status: "idle" | "generating" | "complete" | "error";
  phase: "content" | "images" | "validation" | "correction" | "finalizing" | "done";
  progress: number;
  html: string;
  rawContent: string;
  displayedHtml: string;
  wordCount: number;
  statusMessage: string;
  usedVariations?: UsedVariation[];
  currentImage?: {
    heading: string;
    index: number;
    total: number;
    description?: string;
  };
  imageProgress?: {
    completed: number;
    total: number;
    urls?: Map<string, string>;
  };
  error?: string;
  // Background job tracking
  jobId?: string;
  historyId?: string;
  // Keyword extraction (for validation)
  coreKeywords?: string[];
  primaryKeyword?: string;
}

const initialState: GenerationState = {
  status: "idle",
  phase: "content",
  progress: 0,
  html: "",
  rawContent: "",
  displayedHtml: "",
  wordCount: 0,
  statusMessage: "",
};

/**
 * Replace placeholder image URLs with loading spinner divs
 * IMPORTANT: Preserves original alt text when replacing with real URLs
 */
function replaceImagesWithSpinners(
  html: string,
  completedImages: Map<string, string>
): string {
  // Pattern that captures parts before and after src to preserve alt text
  const placeholderRegex =
    /(<img\s+[^>]*?)src=["'](https:\/\/(via\.placeholder\.com|placehold\.co)[^"']+)["']([^>]*>)/gi;

  return html.replace(placeholderRegex, (match, beforeSrc, placeholderUrl, _domain, afterSrc) => {
    for (const [placeholder, realUrl] of Array.from(completedImages.entries())) {
      if (
        placeholderUrl === placeholder ||
        placeholderUrl.includes(placeholder) ||
        placeholder.includes(placeholderUrl)
      ) {
        // Replace only the src, preserve everything else including alt text
        return `${beforeSrc}src="${realUrl}"${afterSrc}`;
      }
    }

    const encodedPlaceholder = placeholderUrl
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    return `<div class="scai-image-loading-wrapper" data-placeholder="${encodedPlaceholder}" style="width:100%;max-height:400px;height:300px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border:2px dashed #40EDC3;border-radius:20px;margin:1.5rem 0;"><div style="display:flex;flex-direction:column;align-items:center;gap:12px;"><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#40EDC3;border-radius:50%;animation:spin 1s linear infinite;"></div><span style="color:#6b7280;font-size:14px;">Generating image...</span></div></div>`;
  });
}

export interface UseArticleGenerationOptions {
  articleType: string;
  topic: string;
  variation: TitleVariation;
  componentColor: string;
  enabledComponents: Set<string>;
}

export interface UseArticleGenerationReturn {
  state: GenerationState;
  isGenerating: boolean;
  availableComponents: ComponentDefinition[];
  requiredComponents: ComponentDefinition[];
  optionalComponents: ComponentDefinition[];
  handleGenerate: () => Promise<void>;
  handleStop: () => void;
  handleReset: () => void;
}

export function useArticleGeneration({
  articleType,
  topic,
  variation,
  componentColor,
  enabledComponents,
}: UseArticleGenerationOptions): UseArticleGenerationReturn {
  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const unsubscribePusherRef = useRef<(() => void) | null>(null);

  // Get components for current article type
  const availableComponents = useMemo(() => {
    return getComponentsForArticleType(articleType);
  }, [articleType]);

  const optionalComponents = useMemo(() => {
    return availableComponents.filter((c) => !c.required);
  }, [availableComponents]);

  const requiredComponents = useMemo(() => {
    return availableComponents.filter((c) => c.required);
  }, [availableComponents]);

  // Cleanup Pusher subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribePusherRef.current) {
        unsubscribePusherRef.current();
        unsubscribePusherRef.current = null;
      }
    };
  }, []);

  // Keep displayedHtml in sync with html - OPTIMIZED with RAF batching
  useEffect(() => {
    if (state.status === "generating" && state.html) {
      // Use RAF to batch display updates and prevent janky rendering
      const rafId = requestAnimationFrame(() => {
        const completedImages = state.imageProgress?.urls || new Map();
        const displayHtml = replaceImagesWithSpinners(state.html, completedImages);

        setState((prev) => {
          // Only update if content actually changed
          if (prev.displayedHtml !== displayHtml) {
            return {
              ...prev,
              displayedHtml: displayHtml,
            };
          }
          return prev;
        });
      });

      return () => cancelAnimationFrame(rafId);
    }
  }, [state.html, state.status, state.imageProgress?.urls]);

  /**
   * Trigger background job for image generation and subscribe to Pusher
   */
  const triggerBackgroundImages = useCallback(async (
    htmlWithPlaceholders: string,
    wordCount: number,
    historyId: string,
    imagePlaceholders: Array<{
      imageId: string;
      placeholder: string;
      description: string;
      imageType: string;
      componentType?: string;
      context?: string;
      stepNumber?: number;
    }>
  ) => {
    console.log('[useArticleGeneration] Triggering background image generation', {
      imageCount: imagePlaceholders.length,
      historyId,
    });

    try {
      const response = await fetch("/api/generate/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleType,
          topic: topic.trim(),
          htmlWithPlaceholders,
          wordCount,
          imagePlaceholders,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[useArticleGeneration] Background trigger failed:", error);
        // Don't fail the whole generation - content is already there
        setState((prev) => ({
          ...prev,
          statusMessage: "Images will load in background...",
        }));
        return;
      }

      const { jobId, channelName } = await response.json();
      console.log("[useArticleGeneration] Background job started:", { jobId, channelName });

      // Update state with job info
      setState((prev) => ({
        ...prev,
        jobId,
        statusMessage: `Generating ${imagePlaceholders.length} images in background...`,
        imageProgress: {
          completed: 0,
          total: imagePlaceholders.length,
          urls: new Map(),
        },
      }));

      // Subscribe to Pusher for real-time image updates
      unsubscribePusherRef.current = subscribeToGeneration(jobId, {
        onImageStart: (event) => {
          setState((prev) => ({
            ...prev,
            currentImage: {
              heading: event.componentType || "Image",
              description: event.prompt,
              index: event.index,
              total: event.total,
            },
            statusMessage: `Generating image ${event.index}/${event.total}...`,
            progress: 35 + ((event.index - 1) / event.total) * 55,
          }));
        },

        onImageComplete: (event: ImageCompleteEvent) => {
          setState((prev) => {
            const newUrls = new Map(prev.imageProgress?.urls || new Map());
            // Map imageId to URL for replacement
            newUrls.set(event.imageId, event.url);

            // Replace ONLY the src URL, preserving the existing alt text from the HTML
            // The HTML already contains SEO-compliant alt texts from initial generation
            let updatedHtml = prev.html;

            // Strategy 1: Match by data-image-id attribute (most reliable)
            // Pattern captures everything before and after src, only replacing the src value
            const imageIdPattern = new RegExp(
              `(<img[^>]*data-image-id=["']${event.imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
              "gi"
            );
            let matched = imageIdPattern.test(updatedHtml);
            if (matched) {
              updatedHtml = updatedHtml.replace(
                new RegExp(
                  `(<img[^>]*data-image-id=["']${event.imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
                  "gi"
                ),
                `$1src="${event.url}"$2`
              );
            }

            // Strategy 2: Try alternate attribute order (src before data-image-id)
            if (!matched) {
              const altPattern = new RegExp(
                `(<img[^>]*?)src=["'][^"']*["']([^>]*data-image-id=["']${event.imageId}["'][^>]*>)`,
                "gi"
              );
              matched = altPattern.test(updatedHtml);
              if (matched) {
                updatedHtml = updatedHtml.replace(
                  altPattern,
                  `$1src="${event.url}"$2`
                );
              }
            }

            // Strategy 3: Match any placehold.co URL in img tags (fallback)
            // This is less precise but catches cases without data-image-id
            if (!matched) {
              const placeholderPattern = new RegExp(
                `(<img[^>]*?)src=["'](https://placehold\.co/[^"']*)["']([^>]*>)`,
                "i" // Only replace first match to avoid replacing wrong images
              );
              updatedHtml = updatedHtml.replace(
                placeholderPattern,
                `$1src="${event.url}"$3`
              );
            }

            return {
              ...prev,
              html: updatedHtml,
              imageProgress: {
                completed: event.index,
                total: event.total,
                urls: newUrls,
              },
              statusMessage: `Image ${event.index}/${event.total} complete`,
              progress: 35 + (event.index / event.total) * 55,
            };
          });
        },

        onImageFailed: (event: ImageFailedEvent) => {
          console.warn("[useArticleGeneration] Image failed:", event);
          setState((prev) => {
            // Replace with fallback URL if provided - preserve original alt text
            let updatedHtml = prev.html;
            if (event.fallbackUrl) {
              // Strategy 1: Match by data-image-id attribute (most reliable)
              const imageIdPattern = new RegExp(
                `(<img[^>]*data-image-id=["']${event.imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
                "gi"
              );
              let matched = imageIdPattern.test(updatedHtml);
              if (matched) {
                updatedHtml = updatedHtml.replace(
                  new RegExp(
                    `(<img[^>]*data-image-id=["']${event.imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
                    "gi"
                  ),
                  `$1src="${event.fallbackUrl}"$2`
                );
              }

              // Strategy 2: Try alternate attribute order
              if (!matched) {
                const altPattern = new RegExp(
                  `(<img[^>]*?)src=["'][^"']*["']([^>]*data-image-id=["']${event.imageId}["'][^>]*>)`,
                  "gi"
                );
                matched = altPattern.test(updatedHtml);
                if (matched) {
                  updatedHtml = updatedHtml.replace(
                    altPattern,
                    `$1src="${event.fallbackUrl}"$2`
                  );
                }
              }

              // Strategy 3: Match any placehold.co URL (fallback)
              if (!matched) {
                const placeholderPattern = new RegExp(
                  `(<img[^>]*?)src=["'](https://placehold\.co/[^"']*)["']([^>]*>)`,
                  "i"
                );
                updatedHtml = updatedHtml.replace(
                  placeholderPattern,
                  `$1src="${event.fallbackUrl}"$3`
                );
              }
            }

            return {
              ...prev,
              html: updatedHtml,
              imageProgress: {
                ...prev.imageProgress!,
                completed: (prev.imageProgress?.completed || 0) + 1,
              },
              statusMessage: `Image ${event.index} failed, using fallback`,
            };
          });
        },

        onComplete: (event: GenerationCompleteEvent) => {
          console.log("[useArticleGeneration] Background generation complete:", event);

          // Unsubscribe from Pusher
          if (unsubscribePusherRef.current) {
            unsubscribePusherRef.current();
            unsubscribePusherRef.current = null;
          }

          setState((prev) => {
            // Use the final HTML from the event if available
            const finalHtml = event.finalHtml || prev.html;

            return {
              ...prev,
              status: "complete",
              phase: "done",
              progress: 100,
              html: finalHtml,
              displayedHtml: finalHtml,
              statusMessage: "Generation complete!",
            };
          });
        },

        onFailed: (event) => {
          console.error("[useArticleGeneration] Background generation failed:", event);

          if (unsubscribePusherRef.current) {
            unsubscribePusherRef.current();
            unsubscribePusherRef.current = null;
          }

          // Don't fail completely - content is still there
          setState((prev) => ({
            ...prev,
            status: "complete",
            phase: "done",
            progress: 100,
            statusMessage: "Content complete (some images may have failed)",
          }));
        },
      });

    } catch (error) {
      console.error("[useArticleGeneration] Background trigger error:", error);
      // Don't fail - content is already generated
      setState((prev) => ({
        ...prev,
        statusMessage: "Images will be generated separately",
      }));
    }
  }, [articleType, topic]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim() || state.status === "generating") return;

    abortControllerRef.current = new AbortController();

    setState({
      status: "generating",
      phase: "content",
      progress: 0,
      html: "",
      rawContent: "",
      displayedHtml: "",
      wordCount: 0,
      statusMessage: "Starting generation...",
      imageProgress: { completed: 0, total: 0, urls: new Map() },
    });

    try {
      const selectedComponents = [
        ...requiredComponents.map((c) => c.id),
        ...Array.from(enabledComponents),
      ];

      // Use backgroundImages mode to avoid Vercel timeouts
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleType,
          topic: topic.trim(),
          variation,
          selectedComponents,
          componentColor,
          stream: true,
          backgroundImages: true, // NEW: Enable background image generation
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Generation failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "phase") {
                setState((prev) => ({
                  ...prev,
                  phase: data.phase as GenerationState["phase"],
                  statusMessage: data.message || prev.statusMessage,
                }));
              }

              if (data.type === "text_chunk") {
                // Accumulate HTML chunks - header comes first, then components are appended
                let chunkHtml = data.chunk || data.accumulated || "";
                const htmlMatch = chunkHtml.match(/```html\n?([\s\S]*?)(?:\n?```|$)/);
                if (htmlMatch) {
                  chunkHtml = htmlMatch[1];
                }

                setState((prev) => {
                  // If this is header (contains h1), it's the initial chunk
                  // Otherwise append to existing content
                  const isHeader = chunkHtml.includes('data-component="scai-h1"');
                  const newHtml = isHeader ? chunkHtml : (prev.html + chunkHtml);

                  // Match validator's word count logic - exclude style/script blocks
                  const text = newHtml
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')  // Remove style blocks
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ') // Remove script blocks
                    .replace(/<!--[\s\S]*?-->/g, ' ')                   // Remove comments
                    .replace(/<[^>]*>/g, ' ')                           // Remove HTML tags
                    .replace(/&[a-z]+;/gi, ' ')                         // Remove HTML entities
                    .replace(/\s+/g, ' ')                               // Normalize whitespace
                    .trim();
                  const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

                  return {
                    ...prev,
                    rawContent: newHtml,
                    html: newHtml,
                    wordCount,
                    progress: Math.min(30, 5 + (wordCount / 1000) * 25),
                  };
                });
              }

              if (data.type === "content_complete") {
                let displayHtml = data.content || "";
                const htmlMatch = displayHtml.match(/```html\n?([\s\S]*?)(?:\n?```|$)/);
                if (htmlMatch) {
                  displayHtml = htmlMatch[1];
                }

                setState((prev) => ({
                  ...prev,
                  rawContent: data.content || "",
                  html: displayHtml,
                  phase: "images",
                  progress: 35,
                  statusMessage: "Content complete. Generating images...",
                }));
              }

              if (data.type === "image_start") {
                setState((prev) => ({
                  ...prev,
                  phase: "images",
                  currentImage: {
                    heading: data.description,
                    description: data.description,
                    index: data.index,
                    total: data.total,
                  },
                  imageProgress: {
                    ...prev.imageProgress,
                    completed: data.index - 1,
                    total: data.total,
                    urls: prev.imageProgress?.urls || new Map(),
                  },
                  statusMessage: `Generating image ${data.index}/${data.total}...`,
                  progress: 35 + ((data.index - 1) / data.total) * 55,
                }));
              }

              if (data.type === "image_complete") {
                setState((prev) => {
                  const newUrls = new Map(prev.imageProgress?.urls || new Map());
                  if (data.placeholder && data.url) {
                    newUrls.set(data.placeholder, data.url);
                  }

                  let updatedHtml = prev.html;
                  if (data.placeholder && data.url) {
                    const escapedPlaceholder = data.placeholder.replace(
                      /[.*+?^${}()|[\]\\]/g,
                      "\\$&"
                    );
                    // Pattern to capture img tag parts and only replace src, preserving alt text
                    const imgRegex = new RegExp(
                      `(<img[^>]*?)src=["']${escapedPlaceholder}["']([^>]*>)`,
                      "gi"
                    );

                    // Only replace the src URL, keep the original alt text from the HTML
                    updatedHtml = prev.html.replace(
                      imgRegex,
                      `$1src="${data.url}"$2`
                    );
                  }

                  return {
                    ...prev,
                    html: updatedHtml,
                    imageProgress: {
                      completed: data.index,
                      total: data.total,
                      urls: newUrls,
                    },
                    statusMessage: `Image ${data.index}/${data.total} complete`,
                    progress: 35 + (data.index / data.total) * 55,
                  };
                });
              }

              if (data.type === "complete") {
                let finalHtml = data.html || state.html;
                const htmlMatch = finalHtml.match(/```html\n?([\s\S]*?)(?:\n?```|$)/);
                if (htmlMatch) {
                  finalHtml = htmlMatch[1];
                }

                const text = finalHtml.replace(/<[^>]*>/g, " ");
                const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

                // BACKGROUND IMAGES MODE: Trigger Trigger.dev job and subscribe to Pusher
                if (data.backgroundImages && data.imagePlaceholders?.length > 0) {
                  setState((prev) => ({
                    ...prev,
                    html: finalHtml,
                    displayedHtml: replaceImagesWithSpinners(finalHtml, new Map()),
                    wordCount,
                    historyId: data.historyId,
                    phase: "images",
                    progress: 35,
                    statusMessage: `Content complete. Starting ${data.imagePlaceholders.length} images in background...`,
                  }));

                  // Trigger background job (non-blocking)
                  triggerBackgroundImages(
                    finalHtml,
                    wordCount,
                    data.historyId,
                    data.imagePlaceholders
                  );
                } else {
                  // DIRECT MODE: All done (no background images)
                  setState((prev) => ({
                    ...prev,
                    status: "complete",
                    phase: "done",
                    progress: 100,
                    html: finalHtml,
                    displayedHtml: finalHtml,
                    wordCount,
                    statusMessage: "Generation complete!",
                  }));
                }
              }

              if (data.type === "error") {
                throw new Error(data.error || "Generation failed");
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          status: "idle",
          statusMessage: "Generation cancelled",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        statusMessage: "Generation failed",
      }));
    }
  }, [topic, state.status, requiredComponents, enabledComponents, articleType, variation, componentColor, triggerBackgroundImages]);

  const handleStop = useCallback(() => {
    // Abort the HTTP request (content streaming)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Unsubscribe from Pusher (background image updates)
    if (unsubscribePusherRef.current) {
      unsubscribePusherRef.current();
      unsubscribePusherRef.current = null;
    }

    // Update state to reflect cancellation
    setState((prev) => ({
      ...prev,
      status: "idle",
      statusMessage: "Generation cancelled",
      currentImage: undefined,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    isGenerating: state.status === "generating",
    availableComponents,
    requiredComponents,
    optionalComponents,
    handleGenerate,
    handleStop,
    handleReset,
  };
}
