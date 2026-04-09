/**
 * Mockups Module Index
 * 
 * Central export for all mockup generation utilities.
 * This module provides everything needed to generate full article mockups
 * for each article type using components from any design variation.
 */

// Types
export * from './types';

// Content Data
export {
  AFFILIATE_CONTENT,
  COMMERCIAL_CONTENT,
  COMPARISON_CONTENT,
  HOWTO_CONTENT,
  INFORMATIONAL_CONTENT,
  LISTICLE_CONTENT,
  LOCAL_CONTENT,
  RECIPE_CONTENT,
  REVIEW_CONTENT,
  MOCKUP_CONTENT_MAP,
  getMockupContent,
  getAvailableArticleTypes,
  hasContentForArticleType,
} from './mockup-content';

// Variation Themes
export {
  VARIATION_THEMES,
  VARIATION_ORDER,
  getVariationNames,
  getVariationTheme,
  getDarkVariations,
  getLightVariations,
  generateThemeCssVariables,
  generateThemeCss,
  getPageBackground,
} from './variation-themes';

// Mockup Generator
export {
  generateMockup,
} from './mockup-generator';
