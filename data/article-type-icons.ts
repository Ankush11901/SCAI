/**
 * Article type icon mapping (type ID → icon filenames in /Icons/)
 * Used by GeneratorForm (single select) and ClusterModeForm (multi-select)
 */
export const ARTICLE_TYPE_ICONS: Record<string, { grey: string; white: string }> = {
  affiliate: { grey: "/Icons/affiliate-grey.svg", white: "/Icons/affiliate-white.svg" },
  commercial: { grey: "/Icons/commercial-grey.svg", white: "/Icons/commercial-white.svg" },
  comparison: { grey: "/Icons/comparison-grey.svg", white: "/Icons/comparison-white.svg" },
  "how-to": { grey: "/Icons/how-to-grey.svg", white: "/Icons/how-to-white.svg" },
  informational: { grey: "/Icons/informational-grey.svg", white: "/Icons/informational-white.svg" },
  listicle: { grey: "/Icons/listicle-grey.svg", white: "/Icons/listicle-white.svg" },
  local: { grey: "/Icons/local-grey.svg", white: "/Icons/local-white.svg" },
  recipe: { grey: "/Icons/recipe-grey.svg", white: "/Icons/recipe-white.svg" },
  review: { grey: "/Icons/review-grey.svg", white: "/Icons/review-white.svg" },
};
