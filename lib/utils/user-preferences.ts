export interface UserPreferences {
  defaultArticleType: string;
  defaultTitleVariation: "question" | "statement" | "listicle";
  defaultWordCount: "short" | "medium" | "long";
  autoIncludeFeaturedImage: boolean;
  autoIncludeTOC: boolean;
  autoIncludeFAQ: boolean;
  autoIncludeH2Images: boolean;
  autoIncludeMetaTitle: boolean;
  autoIncludeMetaDescription: boolean;
  autoIncludeClosingSection: boolean;
  defaultDesignVariation: "random" | "Clean Studio" | "Airy Premium" | "Gradient Glow" | "Soft Stone";
  defaultComponentColor: "default" | "blue" | "green" | "amber" | "red" | "purple";
}

export const DEFAULTS: UserPreferences = {
  defaultArticleType: "informational",
  defaultTitleVariation: "question",
  defaultWordCount: "medium",
  autoIncludeFeaturedImage: true,
  autoIncludeTOC: true,
  autoIncludeFAQ: true,
  autoIncludeH2Images: true,
  autoIncludeMetaTitle: true,
  autoIncludeMetaDescription: true,
  autoIncludeClosingSection: false,
  defaultDesignVariation: "Clean Studio",
  defaultComponentColor: "default",
};

const WORD_COUNT_MAP: Record<string, number> = {
  short: 500,
  medium: 1000,
  long: 1500,
};

export function getWordCountTarget(pref: UserPreferences): number {
  return WORD_COUNT_MAP[pref.defaultWordCount] ?? 1000;
}

/**
 * Get the word count target adjusted for a specific article type.
 * Some types (review, how-to) need more words to produce enough H2 sections.
 * Returns the higher of the user preference and the type's minimum default.
 */
export function getWordCountTargetForType(pref: UserPreferences, articleType: string): number {
  const TYPE_DEFAULTS: Record<string, number> = {
    'how-to': 1500,
    review: 1500,
  };
  const userTarget = WORD_COUNT_MAP[pref.defaultWordCount] ?? 1000;
  const typeDefault = TYPE_DEFAULTS[articleType] ?? 1000;
  return Math.max(userTarget, typeDefault);
}
