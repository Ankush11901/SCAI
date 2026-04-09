import { streams } from "@trigger.dev/sdk/v3"

/**
 * Stream definition for article content generation.
 * Each append() sends one HTML fragment (token-level chunk).
 * Frontend joins parts incrementally to build the accumulated HTML.
 */
export const articleContentStream = streams.define<string>({
  id: "article-content",
})
