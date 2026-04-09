export interface TourStep {
  /** data-tour attribute value to find the target element */
  target: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Preferred tooltip placement relative to target */
  placement: "top" | "bottom" | "left" | "right";
}

// ─── Single Article Generation Tour (/generate) ─────────────────────────────

export const GENERATE_TOUR_STEPS: TourStep[] = [
  {
    target: "article-type",
    title: "Pick Your Article Type",
    description:
      "Choose from 9 specialized formats. Each type generates a different content structure optimized for its purpose.",
    placement: "right",
  },
  {
    target: "topic-input",
    title: "Enter Your Topic",
    description:
      "Type your target keyword or topic. The AI builds a complete SEO-optimized article around it.",
    placement: "right",
  },
  {
    target: "title-variation",
    title: "Title Format",
    description:
      "Control how the title reads: a Statement, a Question, or a numbered Listicle.",
    placement: "right",
  },
  {
    target: "word-count",
    title: "Set Article Length",
    description:
      "Drag to choose your target word count. Section count adjusts automatically to match.",
    placement: "right",
  },
  {
    target: "image-quality",
    title: "Image Quality",
    description:
      "Pick Standard for fast generation or Premium for higher-detail AI images.",
    placement: "right",
  },
  {
    target: "credit-estimate",
    title: "Credit Cost",
    description:
      "See how many credits this article will use before you generate. Free plan includes 100 credits per month.",
    placement: "top",
  },
  {
    target: "generate-button",
    title: "Generate",
    description:
      "Hit Generate and watch your article appear in real-time on the right.",
    placement: "top",
  },
  {
    target: "preview-panel",
    title: "Live Preview",
    description:
      "Your article renders here with AI-generated images. Download as HTML or export to WordPress when done.",
    placement: "left",
  },
];

// ─── Bulk / Cluster Generation Tour (/bulk) ─────────────────────────────────

export const BULK_TOUR_STEPS: TourStep[] = [
  {
    target: "cluster-topic",
    title: "Topic / Niche",
    description:
      "Enter the broad topic your article cluster will cover. AI will plan a comprehensive content strategy with diverse article types.",
    placement: "right",
  },
  {
    target: "cluster-keyword",
    title: "Primary Keyword",
    description:
      "The main keyword to target across all articles. Each article in the cluster focuses on a related sub-topic.",
    placement: "right",
  },
  {
    target: "cluster-count",
    title: "Article Count",
    description:
      "Drag the slider to choose how many articles to generate (1–100). They'll be automatically interlinked for SEO.",
    placement: "right",
  },
  {
    target: "cluster-article-types",
    title: "Article Type Pool",
    description:
      "Select which article types the AI can use. Leave empty to let AI choose from all 9 types. Tap multiple cards to restrict the pool.",
    placement: "right",
  },
  {
    target: "cluster-image-quality",
    title: "Image Quality",
    description:
      "Pick Standard for fast generation or Premium for higher-detail AI images. Premium requires a Pro plan.",
    placement: "right",
  },
  {
    target: "cluster-url-pattern",
    title: "URL Pattern",
    description:
      "Define the URL structure for interlinks between articles. The {slug} placeholder will be replaced with each article's slug.",
    placement: "right",
  },
  {
    target: "cluster-generate",
    title: "Start Generation",
    description:
      "Kick off the batch. Generation runs in the background — you can close the browser and come back later.",
    placement: "top",
  },
];

/** Upsell step shown as first step for free-tier users on the bulk page */
export const BULK_TOUR_UPSELL_STEP: TourStep = {
  target: "cluster-topic",
  title: "Pro Feature: Content Clusters",
  description:
    "Bulk generation is available on the Pro plan. Upgrade to create up to 100 interlinked articles at once with automatic SEO interlinking.",
  placement: "right",
};
