/**
 * Variation Themes
 *
 * Defines the 4 design variation themes with their visual characteristics.
 * These themes are used to style article mockups consistently.
 *
 * The 4 base variations are:
 * 1. Clean Studio
 * 2. Airy Premium
 * 3. Gradient Glow
 * 4. Soft Stone
 */

import type { BaseVariationName, VariationTheme } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIATION THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const VARIATION_THEMES: Record<BaseVariationName, VariationTheme> = {
  'Clean Studio': {
    id: 'clean-studio',
    name: 'Clean Studio',
    description: 'Minimalist white backgrounds with subtle shadows and refined typography',
    isDark: false,
    colors: {
      background: '#ffffff',
      surface: '#ffffff',
      text: '#171717',
      textSecondary: '#525252',
      textMuted: '#a3a3a3',
      border: 'rgba(0,0,0,0.06)',
      accent: '#171717',
      accentHover: '#262626',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      headingWeight: '600',
      bodyWeight: '400',
      lineHeight: '1.6',
    },
    spacing: {
      borderRadius: '16px',
      padding: '1.5rem',
    },
    effects: {
      shadow: '0 4px 24px rgba(0,0,0,0.06)',
      border: 'none',
    },
  },

  'Airy Premium': {
    id: 'airy-premium',
    name: 'Airy Premium',
    description: 'Light and spacious with luxury brand aesthetics',
    isDark: false,
    colors: {
      background: '#ffffff',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      border: '#f3f4f6',
      accent: '#4f46e5',
      accentHover: '#4338ca',
    },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
      headingWeight: '500',
      bodyWeight: '400',
      lineHeight: '1.7',
    },
    spacing: {
      borderRadius: '24px',
      padding: '2rem',
    },
    effects: {
      shadow: '0 20px 60px rgba(0,0,0,0.05)',
      border: '1px solid #f3f4f6',
    },
  },

  'Gradient Glow': {
    id: 'gradient-glow',
    name: 'Gradient Glow',
    description: 'Vibrant gradients with glowing effects and modern flair',
    isDark: true,
    colors: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      surface: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.9)',
      textMuted: 'rgba(255,255,255,0.7)',
      border: 'rgba(255,255,255,0.2)',
      accent: '#ffffff',
      accentHover: 'rgba(255,255,255,0.9)',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      headingWeight: '600',
      bodyWeight: '400',
      lineHeight: '1.6',
    },
    spacing: {
      borderRadius: '16px',
      padding: '1.5rem',
    },
    effects: {
      shadow: '0 15px 50px rgba(102,126,234,0.4)',
      border: '1px solid rgba(255,255,255,0.2)',
      backdropBlur: 'blur(10px)',
    },
  },

  'Soft Stone': {
    id: 'soft-stone',
    name: 'Soft Stone',
    description: 'Warm grays and soft textures with calming presence',
    isDark: false,
    colors: {
      background: '#f5f5f4',
      surface: '#ffffff',
      text: '#292524',
      textSecondary: '#57534e',
      textMuted: '#a8a29e',
      border: '#e7e5e4',
      accent: '#78716c',
      accentHover: '#57534e',
    },
    typography: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      headingWeight: '500',
      bodyWeight: '400',
      lineHeight: '1.7',
    },
    spacing: {
      borderRadius: '12px',
      padding: '1.5rem',
    },
    effects: {
      shadow: '0 8px 30px rgba(41,37,36,0.08)',
      border: '1px solid #e7e5e4',
    },
  },

};

// ═══════════════════════════════════════════════════════════════════════════════
// THEME UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all variation names
 */
export function getVariationNames(): BaseVariationName[] {
  return Object.keys(VARIATION_THEMES) as BaseVariationName[];
}

/**
 * Get theme by variation name
 */
export function getVariationTheme(name: BaseVariationName): VariationTheme {
  return VARIATION_THEMES[name];
}

/**
 * Get all dark variation themes
 */
export function getDarkVariations(): BaseVariationName[] {
  return (Object.entries(VARIATION_THEMES) as [BaseVariationName, VariationTheme][])
    .filter(([_, theme]) => theme.isDark)
    .map(([name]) => name);
}

/**
 * Get all light variation themes
 */
export function getLightVariations(): BaseVariationName[] {
  return (Object.entries(VARIATION_THEMES) as [BaseVariationName, VariationTheme][])
    .filter(([_, theme]) => !theme.isDark)
    .map(([name]) => name);
}

/**
 * Generate CSS variables from a theme for use in article mockups
 */
export function generateThemeCssVariables(theme: VariationTheme): string {
  return `
    --mockup-bg: ${theme.colors.background};
    --mockup-surface: ${theme.colors.surface};
    --mockup-text: ${theme.colors.text};
    --mockup-text-secondary: ${theme.colors.textSecondary};
    --mockup-text-muted: ${theme.colors.textMuted};
    --mockup-border: ${theme.colors.border};
    --mockup-accent: ${theme.colors.accent};
    --mockup-accent-hover: ${theme.colors.accentHover};
    --mockup-font-family: ${theme.typography.fontFamily};
    --mockup-heading-weight: ${theme.typography.headingWeight};
    --mockup-body-weight: ${theme.typography.bodyWeight};
    --mockup-line-height: ${theme.typography.lineHeight};
    --mockup-radius: ${theme.spacing.borderRadius};
    --mockup-padding: ${theme.spacing.padding};
    --mockup-shadow: ${theme.effects.shadow};
    --mockup-border-style: ${theme.effects.border};
    ${theme.effects.backdropBlur ? `--mockup-backdrop: ${theme.effects.backdropBlur};` : ''}
  `.trim();
}

/**
 * Generate complete CSS theme block with :root selector
 */
export function generateThemeCss(theme: VariationTheme): string {
  return `:root {
  ${generateThemeCssVariables(theme)}
}`;
}

/**
 * Get appropriate page background color for a theme
 * Light themes get slightly off-white, dark themes get dark backgrounds
 */
export function getPageBackground(theme: VariationTheme): string {
  if (theme.isDark) {
    // Dark themes: use a slightly lighter shade than the surface for contrast
    if (theme.name === 'Gradient Glow') return '#0f172a';
    return '#121212';
  }

  // Light themes: use subtle off-white or theme-appropriate bg
  if (theme.name === 'Gradient Glow') return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)';

  return '#fafafa';
}

/**
 * Variation display order (for UI consistency)
 */
export const VARIATION_ORDER: BaseVariationName[] = [
  'Clean Studio',
  'Airy Premium',
  'Gradient Glow',
  'Soft Stone',
];
