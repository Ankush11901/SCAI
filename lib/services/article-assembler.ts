/**
 * Article Assembler
 * Phase 3: Deterministic assembly of generated components into final HTML
 * No LLM involved - pure code-based assembly following structure flows
 */

import { STRUCTURE_FLOWS, buildDynamicFlow } from '@/data/structure-flows'
import { COMPONENT_VARIATIONS } from '@/data/variations'
import { createEnhancedPlaceholder } from '@/lib/services/generator-orchestrator'
import type { ArticleStructure, GeneratedContent, FAQContent } from '@/lib/types/generation'
import { getVariationTheme, getPageBackground } from '@/lib/mockups/variation-themes'
import type { BaseVariationName } from '@/lib/mockups/types'
import { hydrateToc, hydrateFaq } from '@/lib/services/template-hydrator'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT COLOR DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface ColorPalette {
  primary: string      // Main accent color (buttons, links, highlights)
  primaryHover: string // Hover state
  bg: string           // Light background tint
  border: string       // Border color
  text: string         // Text on primary background
}

const COLOR_PALETTES: Record<string, ColorPalette> = {
  default: {
    primary: '#000000',
    primaryHover: '#333333',
    bg: '#f5f5f5',
    border: '#000000',
    text: '#ffffff'
  },
  blue: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    bg: '#eff6ff',
    border: '#2563eb',
    text: '#ffffff'
  },
  green: {
    primary: '#16a34a',
    primaryHover: '#15803d',
    bg: '#f0fdf4',
    border: '#16a34a',
    text: '#ffffff'
  },
  amber: {
    primary: '#d97706',
    primaryHover: '#b45309',
    bg: '#fffbeb',
    border: '#d97706',
    text: '#ffffff'
  },
  red: {
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    bg: '#fef2f2',
    border: '#dc2626',
    text: '#ffffff'
  },
  purple: {
    primary: '#9333ea',
    primaryHover: '#7e22ce',
    bg: '#faf5ff',
    border: '#9333ea',
    text: '#ffffff'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIATION THEME STYLES
// Generate CSS for the selected design variation (Dark Elegance, Neo-Brutalist, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate theme-specific CSS for a design variation
 * This applies the correct background, text colors, and typography for the variation
 */
function generateVariationThemeCss(variationName?: string): string {
  if (!variationName) return ''

  try {
    const theme = getVariationTheme(variationName as BaseVariationName)
    if (!theme) return ''

    return `
/* ═══════════════════════════════════════════════════════════════════════════════
   Design Variation Theme: ${variationName}
   ═══════════════════════════════════════════════════════════════════════════════ */

body {
  background: ${getPageBackground(theme)};
  color: ${theme.colors.text};
}

.scai-article {
  color: ${theme.colors.text};
}

.scai-h1, .scai-h2, .scai-h3 {
  color: ${theme.colors.text};
}

.scai-h2 {
  border-bottom-color: ${theme.colors.border};
}

.scai-paragraph {
  color: ${theme.colors.textSecondary};
}

.scai-featured-image figcaption,
.scai-h2-image figcaption {
  color: ${theme.colors.textMuted};
}

.scai-toc {
  background: ${theme.colors.surface};
  border-color: ${theme.colors.border};
}

.scai-toc-title {
  color: ${theme.colors.text};
}

.scai-toc-list a {
  color: ${theme.colors.text};
  border-bottom-color: ${theme.colors.border};
}

.scai-toc-list a:hover {
  color: ${theme.colors.accent};
  border-bottom-color: ${theme.colors.accent};
}

.scai-faq {
  background: ${theme.colors.surface};
}

a {
  color: ${theme.colors.accent};
}

a:hover {
  color: ${theme.colors.accentHover};
}
`
  } catch (e) {
    console.warn(`[Assembler] Could not get theme for variation "${variationName}":`, e)
    return ''
  }
}

/**
 * Generate CSS overrides for component colors
 * This applies the selected color theme to all SCAI components
 * 
 * PRODUCT CARD COLOR STRATEGY (Per Design Analysis):
 * 
 * Category 1: PRESERVE PALETTE ENTIRELY (No color changes)
 * - Neo-Brutalist: Black/white contrast IS the brutalist design
 * - Eco Paper: Earthy warm tones are the brand identity
 * - Soft Stone: Warm stone palette is intentional
 * - Cyber Dark: Monochrome terminal aesthetic, adding colors breaks it
 * 
 * Category 2: ACCENT-FRIENDLY (CTA + Badge + Special elements)
 * - Clean Studio: CTA bg, Badge bg
 * - Swiss Grid: CTA border + hover bg, 8px top border
 * - Corporate Pro: CTA bg, Badge bg, 6px top border
 * - Technical Grid: CTA bg, Badge bg
 * - Gradient Glow: CTA gradient, hover outline
 * 
 * Category 3: CTA-ONLY (Minimal color application)
 * - Glass Frost: CTA bg only
 * - Airy Premium: CTA bg only
 * - Minimal Outline: CTA bg only
 * - Editorial Serif: CTA bg only
 * - Pill Pop: CTA bg only
 * - Heavy Industrial: CTA bg only
 * - Polaroid Frame: CTA border, price underline
 * - Wired Dashed: CTA dashed border only
 * 
 * Category 4: SPECIAL CASES
 * - Dark Elegance: Badge bg only (white CTA on dark IS the elegance)
 */
function generateComponentColorCss(colorId: string): string {
  if (!colorId || colorId === 'default') {
    return '' // No overrides needed for default black/white theme
  }

  const palette = COLOR_PALETTES[colorId]
  if (!palette) {
    return ''
  }

  return `
/* ═══════════════════════════════════════════════════════════════════════════════
   Component Color Theme: ${colorId}
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════════
   PRODUCT CARD VARIATIONS - Variation-Specific Color Application
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   1. CLEAN STUDIO - Accent-Friendly (CTA + Badge)
   Modern minimal design that adapts well to brand colors
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-clean .scai-pc-badge {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-clean .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-clean .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. NEO-BRUTALIST - PRESERVE ENTIRELY
   Black/white contrast IS the brutalist design. Do NOT apply colors.
   The thick borders, hard shadows, and monochrome palette are intentional.
   ───────────────────────────────────────────────────────────────────────────── */
/* NO COLOR OVERRIDES - Preserving brutalist aesthetic */

/* ─────────────────────────────────────────────────────────────────────────────
   3. DARK ELEGANCE - Special Case (Badge only)
   The white CTA button on dark background IS the premium elegance.
   Only the badge should accept brand color.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-dark .scai-pc-badge {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
  border-color: ${palette.primary} !important;
}
/* CTA stays white on dark - this IS the elegance */

/* ─────────────────────────────────────────────────────────────────────────────
   4. GLASS FROST - CTA Only
   Glassmorphism effect must stay neutral. Only CTA accepts color.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-glass .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-glass .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. SWISS GRID - Accent-Friendly (Top border + CTA)
   Typography-focused design. The 8px top border is THE accent element.
   CTA is outline style - border and hover fill accept color.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-swiss {
  border-top-color: ${palette.primary} !important;
}
.scai-pc-swiss .scai-pc-cta {
  border-color: ${palette.primary} !important;
  color: ${palette.primary} !important;
  background: transparent !important;
}
.scai-pc-swiss .scai-pc-cta:hover {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. ECO PAPER - PRESERVE ENTIRELY
   Earthy warm tones (#F5F2EB, #4A463E) ARE the brand identity.
   Changing to bright colors would destroy the organic aesthetic.
   ───────────────────────────────────────────────────────────────────────────── */
/* NO COLOR OVERRIDES - Preserving earthy organic palette */

/* ─────────────────────────────────────────────────────────────────────────────
   7. HEAVY INDUSTRIAL - CTA Only
   Rugged industrial design. Gray palette must stay. Only CTA accepts color.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-industrial .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-industrial .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. AIRY PREMIUM - CTA Only
   Soft, elevated luxury feel. Pill CTA is the single accent point.
   Everything else stays neutral for the "airy" aesthetic.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-airy .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
  box-shadow: 0 10px 40px ${palette.primary}33 !important;
}
.scai-pc-airy .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
  box-shadow: 0 15px 50px ${palette.primary}40 !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. CYBER DARK - PRESERVE ENTIRELY
   Matrix/terminal monochrome aesthetic. The gray scale IS the design.
   Adding bright colors breaks the tech/hacker vibe.
   ───────────────────────────────────────────────────────────────────────────── */
/* NO COLOR OVERRIDES - Preserving monochrome cyber aesthetic */

/* ─────────────────────────────────────────────────────────────────────────────
   10. GRADIENT GLOW - Accent-Friendly (CTA gradient + Outline)
   Modern design with gradient accents. Replace gradients with brand colors.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-glow .scai-pc-cta {
  background: linear-gradient(to right, ${palette.primary}, ${palette.primaryHover}) !important;
  color: ${palette.text} !important;
  box-shadow: 0 10px 40px ${palette.primary}33 !important;
}
.scai-pc-glow .scai-pc-cta:hover {
  box-shadow: 0 15px 50px ${palette.primary}4D !important;
}
.scai-pc-glow:hover {
  outline-color: ${palette.border} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   11. MINIMAL OUTLINE - CTA Only
   Light, spacious, thin weights. Minimal = restraint. One accent point only.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-outline .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-outline .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   12. TECHNICAL GRID - Accent-Friendly (CTA + Badge)
   Monospace technical look. Badge and CTA accept color. Grid stays gray.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-tech .scai-pc-badge {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-tech .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-tech .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   13. SOFT STONE - PRESERVE ENTIRELY
   Warm stone/beige tones (#fafaf9, #44403c) are intentional.
   Similar to Eco Paper - the color scheme IS the design.
   ───────────────────────────────────────────────────────────────────────────── */
/* NO COLOR OVERRIDES - Preserving warm stone palette */

/* ─────────────────────────────────────────────────────────────────────────────
   14. EDITORIAL SERIF - CTA Only
   Classic editorial with serif typography. Typography is the feature.
   Only CTA accepts color to maintain the editorial look.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-editorial .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-pc-editorial .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   15. CORPORATE PRO - Accent-Friendly (Top border + Badge + CTA)
   Professional design built for customization. Multiple accent points.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-corporate {
  border-top-color: ${palette.primary} !important;
}
.scai-pc-corporate .scai-pc-badge {
  background: ${palette.bg} !important;
  color: ${palette.primary} !important;
}
.scai-pc-corporate .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
  box-shadow: 0 4px 12px ${palette.primary}33 !important;
}
.scai-pc-corporate .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   16. POLAROID FRAME - CTA Border + Price Underline
   Photo frame aesthetic. CTA is outline style. Price underline is accent.
   Frame and shadows must stay white/neutral.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-polaroid .scai-pc-cta {
  border-color: ${palette.primary} !important;
  color: ${palette.primary} !important;
}
.scai-pc-polaroid .scai-pc-cta:hover {
  background: ${palette.bg} !important;
}
.scai-pc-polaroid .scai-pc-price-row {
  border-bottom-color: ${palette.primary} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   17. WIRED DASHED - CTA Dashed Border Only
   Playful dashed borders. CTA dashed border is the natural accent point.
   Container dashes stay gray to maintain the playful structure.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-dashed .scai-pc-cta {
  border-color: ${palette.primary} !important;
  color: ${palette.primary} !important;
}
.scai-pc-dashed .scai-pc-cta:hover {
  border-color: ${palette.primary} !important;
  background: ${palette.bg} !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   18. PILL POP - CTA Only
   Rounded pill shapes. Pill CTA is the primary accent.
   Soft gray backgrounds must stay neutral.
   ───────────────────────────────────────────────────────────────────────────── */
.scai-pc-pill .scai-pc-cta {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
  box-shadow: 0 10px 30px ${palette.primary}33 !important;
}
.scai-pc-pill .scai-pc-cta:hover {
  background: ${palette.primaryHover} !important;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LEGACY/FALLBACK - Generic product card classes (for backwards compatibility)
   ═══════════════════════════════════════════════════════════════════════════════ */
.scai-product-card-cta,
.scai-cta-button,
.scai-button {
  background: ${palette.primary} !important;
  border-color: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-product-card-cta:hover,
.scai-cta-button:hover,
.scai-button:hover {
  background: ${palette.primaryHover} !important;
  border-color: ${palette.primaryHover} !important;
}
.scai-product-card-badge {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}

/* TOC */
.scai-toc-a,
.scai-toc-b,
.scai-toc-c {
  border-color: ${palette.border} !important;
}
.scai-toc-title {
  color: ${palette.primary} !important;
  border-color: ${palette.border} !important;
}
.scai-toc-list a:hover {
  color: ${palette.primary} !important;
}

/* Key Takeaways */
.scai-key-takeaways-a,
.scai-key-takeaways-b,
.scai-key-takeaways-c {
  border-color: ${palette.border} !important;
}
.scai-key-takeaways-title {
  color: ${palette.primary} !important;
}
.scai-key-takeaways-a::before,
.scai-key-takeaways-b::before {
  background: ${palette.primary} !important;
}
.scai-key-takeaways-list li::before {
  color: ${palette.primary} !important;
}

/* Pros/Cons */
.scai-pros-cons-a .scai-pros-column .scai-pros-cons-title,
.scai-pros-cons-b .scai-pros-column .scai-pros-cons-title {
  color: ${palette.primary} !important;
}

/* FAQ */
.scai-faq-a .scai-faq-question,
.scai-faq-b .scai-faq-question,
.scai-faq-c .scai-faq-toggle {
  color: ${palette.primary} !important;
}
.scai-faq-b .scai-faq-item {
  border-left-color: ${palette.primary} !important;
}

/* Instructions */
.scai-instructions-a .scai-step-number,
.scai-instructions-b .scai-step-number,
.scai-instructions-c .scai-step-circle {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-instructions-c .scai-step-line {
  background: ${palette.primary} !important;
}

/* Comparison Table */
.scai-comparison-a th,
.scai-comparison-b th {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
.scai-comparison-c .scai-comparison-header {
  background: ${palette.bg} !important;
  border-bottom-color: ${palette.border} !important;
}

/* Quick Verdict */
.scai-verdict-a .scai-verdict-winner,
.scai-verdict-b .scai-verdict-winner,
.scai-verdict-c .scai-verdict-best::before {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}

/* CTA Box */
.scai-cta-box-a,
.scai-cta-box-b,
.scai-cta-box-c {
  background: ${palette.bg} !important;
  border-color: ${palette.border} !important;
}
.scai-cta-box-a .scai-cta-title,
.scai-cta-box-b .scai-cta-title,
.scai-cta-box-c .scai-cta-title {
  color: ${palette.primary} !important;
}

/* Feature List */
.scai-feature-section-a,
.scai-feature-section-b,
.scai-feature-list-c {
  border-color: ${palette.border} !important;
}
.scai-feature-section-title {
  color: ${palette.primary} !important;
}
.scai-feature-list li::before {
  color: ${palette.primary} !important;
}

/* Materials Box */
.scai-materials-a,
.scai-materials-b,
.scai-materials-c {
  border-color: ${palette.border} !important;
}
.scai-materials-title {
  color: ${palette.primary} !important;
}

/* Pro Tips */
.scai-pro-tips-a,
.scai-pro-tips-b,
.scai-pro-tips-c {
  background: ${palette.bg} !important;
  border-color: ${palette.border} !important;
}
.scai-pro-tips-title {
  color: ${palette.primary} !important;
}

/* Quick Facts */
.scai-quick-facts-a,
.scai-quick-facts-b,
.scai-quick-facts-c {
  border-color: ${palette.border} !important;
}
.scai-quick-facts-title {
  color: ${palette.primary} !important;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NAMED VARIATION COMPONENTS — Color Overrides
   Targets data-component attributes for broad coverage across all variations.
   Constraints: NO heading text, NO paragraph text, NO section backgrounds.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Rating — score display (decorative element, not a heading) */
[data-component="scai-rating-section"] .scai-rt-score {
  color: ${palette.primary} !important;
}

/* Service Info — old-style border accent */
.scai-service-info-c {
  border-left-color: ${palette.primary} !important;
}

/* Honorable Mentions — item divider accent */
[data-component="scai-honorable-mentions"] .scai-hm-item {
  border-bottom-color: ${palette.border} !important;
}

/* Why Choose Local — badge (button-like) + list markers */
[data-component="scai-why-local-section"] .scai-local-badge {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}
[data-component="scai-why-local-section"] .scai-local-list li::before {
  color: ${palette.primary} !important;
}

/* Ingredients — list markers + old-style border accents */
[data-component="scai-ingredients-section"] .scai-ing-list li::before {
  color: ${palette.primary} !important;
}
.scai-ingredients-b {
  border-top-color: ${palette.primary} !important;
}
.scai-ingredients-c {
  border-left-color: ${palette.primary} !important;
}

/* Nutrition Table — old-style table header row */
.scai-nutrition-c th {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}

/* Requirements Box — list markers */
[data-component="scai-requirements-box"] .scai-requirements-list li::before {
  color: ${palette.primary} !important;
}

/* Features List (named variations) — list markers */
[data-component="scai-features-section"] .scai-feat-list li::before {
  color: ${palette.primary} !important;
}

/* Instructions (named variations) — step number circles */
[data-component="scai-instructions-section"] .scai-instructions-list li::before {
  background: ${palette.primary} !important;
  color: ${palette.text} !important;
}

/* Pros/Cons (named variations) — list markers
   CRITICAL: Scoped with data-component to avoid Product Card .scai-pc-* collision */
[data-component="scai-pros-cons-section"] .scai-pc-pros .scai-pc-list li::before {
  color: ${palette.primary} !important;
}

/* Article-level H2 border accent */
.scai-h2 { border-bottom-color: ${palette.border} !important; }

/* Component H2 border accents — decorative dividers under section headings */
[data-component="scai-faq-section"] .scai-faq-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-rating-section"] .scai-rt-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-honorable-mentions"] .scai-hm-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-ingredients-section"] .scai-ing-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-instructions-section"] .scai-instructions-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-tips-section"] .scai-tips-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-nutrition-section"] .scai-nutr-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-features-section"] .scai-feat-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-requirements-box"] .scai-requirements-h2 { border-bottom-color: ${palette.border} !important; }
[data-component="scai-pros-cons-section"] .scai-pc-h2 { border-bottom-color: ${palette.border} !important; }

/* Links */
.scai-article a:not(.scai-product-card-cta):not(.scai-cta-button):not(.scai-button):not(.scai-pc-cta) {
  color: ${palette.primary} !important;
}
.scai-article a:not(.scai-product-card-cta):not(.scai-cta-button):not(.scai-button):not(.scai-pc-cta):hover {
  color: ${palette.primaryHover} !important;
}
`.trim()
}

// Use a class to manage variation CSS per assembly session
class VariationCssCollector {
  private cssSet: Set<string> = new Set()

  add(css: string): void {
    if (css) {
      this.cssSet.add(css)
    }
  }

  getAll(): string[] {
    return Array.from(this.cssSet)
  }

  clear(): void {
    this.cssSet.clear()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML TEMPLATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateTocHtml(structure: ArticleStructure, cssCollector: VariationCssCollector, designVariation?: string): string {
  // Convert TOC items to hydrator format
  const tocContent = {
    items: structure.tocItems.map(item => ({
      href: item.href,
      text: item.title
    }))
  }

  // Use the selected design variation if provided
  if (designVariation) {
    const hydrated = hydrateToc(designVariation as BaseVariationName, tocContent)
    if (hydrated) {
      if (hydrated.css) {
        cssCollector.add(hydrated.css)
      }
      return hydrated.html
    }
  }

  // Fallback: Pick a random TOC variation if no design variation specified
  const variations = COMPONENT_VARIATIONS['toc']
  const index = Math.floor(Math.random() * variations.length)
  const variation = variations[index]
  const letter = (['a', 'b', 'c'] as const)[index]

  // Add the variation CSS
  if (variation.css) {
    cssCollector.add(variation.css)
  }

  const items = structure.tocItems.map((item) =>
    `<li><a href="${item.href}">${item.title}</a></li>`
  ).join('\n')

  const listTag = variation.html.includes('<ol') ? 'ol' : 'ul'

  return `
<nav data-component="scai-toc" class="scai-toc-${letter}">
  <div class="scai-toc-title">Table of Contents</div>
  <${listTag} class="scai-toc-list">
${items}
  </${listTag}>
</nav>`.trim()
}

function generateH1Html(structure: ArticleStructure): string {
  return `
<header data-component="scai-h1">
  <h1 class="scai-h1">${structure.h1}</h1>
</header>`.trim()
}

function generateFeaturedImageHtml(topic: string, articleType: string, altText?: string, caption?: string): string {
  // Use enhanced placeholder with articleType metadata for proper AI image generation
  const placeholderUrl = createEnhancedPlaceholder({
    text: `Featured ${topic.substring(0, 40)}`,
    articleType: articleType as any,
    imageType: 'featured',
    sectionIndex: 0,
    componentType: 'featured-image'
  })
  // Use AI-generated alt text if provided, otherwise use descriptive fallback
  const featuredAlt = altText || `Comprehensive visual guide about ${topic} showing key concepts and practical applications for better understanding`
  // Use AI-generated caption if provided, otherwise use default
  const imageCaption = caption || `A visual guide to ${topic}`
  return `
<figure data-component="scai-featured-image" class="scai-featured-image">
  <img src="${placeholderUrl}" alt="${featuredAlt}" />
  <figcaption>${imageCaption}</figcaption>
</figure>`.trim()
}

function generateFaqHtml(topic: string, faq: FAQContent, cssCollector: VariationCssCollector, designVariation?: string): string {
  // If FAQ already has pre-generated HTML with variation (from template mode), use it
  if (faq.html) {
    if (faq.variationCss) {
      cssCollector.add(faq.variationCss)
    }
    return faq.html
  }

  // Convert FAQ items to hydrator format
  const faqContent = {
    items: faq.items.map(item => ({
      question: item.question,
      answer: item.answer
    }))
  }

  // Use the selected design variation if provided
  if (designVariation) {
    const hydrated = hydrateFaq(designVariation as BaseVariationName, faqContent)
    if (hydrated) {
      if (hydrated.css) {
        cssCollector.add(hydrated.css)
      }
      return hydrated.html
    }
  }

  // Fallback: Pick a random FAQ variation (legacy/LLM mode)
  const variations = COMPONENT_VARIATIONS['faq']
  const index = Math.floor(Math.random() * variations.length)
  const variation = variations[index]
  const letter = (['a', 'b', 'c'] as const)[index]

  // Add the variation CSS
  if (variation.css) {
    cssCollector.add(variation.css)
  }

  const itemsHtml = faq.items.map(item => `
<div class="scai-faq-item">
  <h3 class="scai-faq-question">${item.question}</h3>
  <p class="scai-faq-answer">${item.answer}</p>
</div>`).join('')

  // FAQ H2 must be ≤30 characters per documentation
  // "Frequently Asked Questions" = 27 characters (fits!)
  return `
<section id="faq" data-component="scai-faq" class="scai-faq-${letter}">
  <h2 class="scai-faq-title">Frequently Asked Questions</h2>
${itemsHtml}
</section>`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS STYLES (Monochrome as required)
// ═══════════════════════════════════════════════════════════════════════════════

function getArticleStyles(): string {
  return `
<style>
  /* Reset - matches mockup-generator */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* Base Styles */
  .scai-article {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 768px;
    margin: 0 auto;
    padding: 2rem 0;
  }
  
  /* Component Spacing - matches mockup-generator */
  .scai-component {
    margin: 2rem 0;
  }
  
  .scai-section {
    margin: 2.5rem 0;
  }
  
  /* CRITICAL: Global image constraint - prevents overflow */
  .scai-article img {
    max-width: 100%;
    height: auto;
    display: block;
  }
  
  /* CRITICAL: Reset margins for all major containers */
  .scai-article header,
  .scai-article section,
  .scai-article figure,
  .scai-article nav,
  .scai-article div {
    margin-left: 0;
    margin-right: 0;
  }
  
  /* Typography */
  .scai-h1 {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 1.5rem 0;
    padding: 0;
    color: #000;
  }
  
  .scai-h2 {
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 2.5rem 0 1rem 0;
    padding: 0 0 0.5rem 0;
    color: #000;
    border-bottom: 2px solid #e5e5e5;
  }
  
  .scai-paragraph {
    margin: 1rem 0;
    padding: 0;
    color: #333;
  }
  
  /* Images - consistent alignment */
  .scai-featured-image,
  .scai-h2-image {
    margin: 1.5rem 0;
    padding: 0;
  }
  
  .scai-featured-image img,
  .scai-h2-image img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 0;
    padding: 0;
  }
  
  /* Image captions - centered styling */
  .scai-featured-image figcaption,
  .scai-h2-image figcaption {
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.75rem;
    font-style: italic;
    line-height: 1.4;
  }
  
  /* Table of Contents - Base fallback only (variations provide specific styles) */
  .scai-toc {
    background: #f9f9f9;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 2rem 0;
  }
  
  .scai-toc-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    padding: 0;
    color: #000;
  }
  
  .scai-toc-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .scai-toc-list li {
    /* No margin/padding here - let variations define spacing */
  }
  
  .scai-toc-list a {
    color: #000;
    text-decoration: none;
  }
  
  .scai-toc-list a:hover {
    opacity: 0.7;
  }
  
  /* FAQ Section */
  .scai-faq {
    margin: 3rem 0;
    padding: 2rem;
    background: #fafafa;
    border-radius: 12px;
  }
  
  /* FAQ Section Variations - ensure proper spacing */
  .scai-faq-section-a,
  .scai-faq-section-b,
  .scai-faq-section-c,
  [data-component="scai-faq-section"] {
    margin: 3rem 0;
  }
  
  /* Service Info - Local Articles (Table Layout) */
  .scai-service-info,
  [data-component="scai-service-info"] {
    margin: 3rem 0;
    padding: 1.5rem;
    background: #f3f4f6;
    border-radius: 8px;
  }
  
  .scai-service-info table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .scai-service-info td {
    padding: 0.625rem 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.9375rem;
  }
  
  .scai-service-info td:first-child {
    color: #6b7280;
    width: 40%;
  }
  
  .scai-service-info td:last-child {
    color: #1a1a1a;
    font-weight: 600;
  }
  
  /* Service Info - Variation A (Detailed Card) */
  .scai-service-info-a,
  [data-component="scai-service-info-box"].scai-service-info-a {
    border: 2px solid #000;
    margin: 3rem 0;
  }
  .scai-service-info-a .scai-info-title {
    background: #000;
    color: #fff;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: bold;
  }
  .scai-service-info-a .scai-info-row {
    display: flex;
    border-bottom: 1px solid #eee;
  }
  .scai-service-info-a .scai-info-row:last-child { border-bottom: none; }
  .scai-service-info-a .scai-info-label {
    width: 40%;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: bold;
    background: #f9f9f9;
  }
  .scai-service-info-a .scai-info-value {
    flex: 1;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
  
  /* Service Info - Variation B (Sidebar) */
  .scai-service-info-b,
  [data-component="scai-service-info-box"].scai-service-info-b {
    background: #f5f5f5;
    padding: 1rem;
    margin: 3rem 0;
  }
  .scai-service-info-b .scai-info-title {
    font-size: 0.9rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .scai-service-info-b .scai-info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.35rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid #ddd;
  }
  .scai-service-info-b .scai-info-label { font-weight: bold; }
  
  /* Service Info - Variation C (Compact Grid) */
  .scai-service-info-c,
  [data-component="scai-service-info-box"].scai-service-info-c {
    background: #f9f9f9;
    border-left: 5px solid #000;
    padding: 2rem;
    margin: 3rem 0;
  }
  .scai-service-info-c .scai-info-title {
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }
  .scai-service-info-c .scai-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem 1rem;
  }
  .scai-service-info-c .scai-info-item {
    display: flex;
    flex-direction: column;
  }
  .scai-service-info-c .scai-info-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
  }
  .scai-service-info-c .scai-info-value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #000;
  }
  
  /* Why Choose Local - Variation A (Side-by-Side) */
  .scai-why-local-a,
  [data-component="scai-why-local-section"].scai-why-local-a {
    background: #f5f5f5;
    padding: 1.5rem;
    margin: 3rem 0;
  }
  .scai-why-local-a .scai-local-h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .scai-why-local-a .scai-local-content {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .scai-why-local-a .scai-local-image {
    width: 300px;
    height: 250px;
    flex-shrink: 0;
    border: 2px solid #000;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    overflow: hidden;
  }
  .scai-why-local-a .scai-local-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .scai-why-local-a .scai-local-list {
    list-style: none;
    flex: 1;
    padding: 0;
    margin: 0;
  }
  .scai-why-local-a .scai-local-list li {
    padding: 0.5rem 0 0.5rem 1rem;
    border-bottom: 1px solid #ddd;
    font-size: 0.9rem;
    position: relative;
  }
  .scai-why-local-a .scai-local-list li:last-child { border-bottom: none; }
  .scai-why-local-a .scai-local-list li::before {
    content: '-';
    position: absolute;
    left: 0;
    font-weight: bold;
  }
  
  /* Why Choose Local - Variation B (Feature List) */
  .scai-why-local-b,
  [data-component="scai-why-local-section"].scai-why-local-b {
    display: flex;
    border: 2px solid #000;
    align-items: stretch;
    margin: 3rem 0;
  }
  .scai-why-local-b .scai-local-content {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .scai-why-local-b .scai-local-h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    border-bottom: 4px solid #000;
    padding-bottom: 0.5rem;
    display: inline-block;
    align-self: flex-start;
  }
  .scai-why-local-b .scai-local-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9rem;
  }
  .scai-why-local-b .scai-local-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .scai-why-local-b .scai-local-list li:last-child { border-bottom: none; }
  .scai-why-local-b .scai-local-list li::before {
    content: '→';
    font-weight: bold;
    font-size: 1.1rem;
    line-height: 1;
  }
  .scai-why-local-b .scai-local-image {
    flex: 0 0 45%;
    background: #f0f0f0;
    border-left: 2px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 250px;
    overflow: hidden;
  }
  .scai-why-local-b .scai-local-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  /* Why Choose Local - Variation C (Callout Box) */
  .scai-why-local-c,
  [data-component="scai-why-local-section"].scai-why-local-c {
    display: flex;
    border: 2px solid #000;
    align-items: stretch;
    background: #fff;
    margin: 3rem 0;
  }
  .scai-why-local-c .scai-local-image {
    flex: 0 0 45%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 2px solid #000;
    font-weight: bold;
    color: #666;
    min-height: 250px;
    overflow: hidden;
  }
  .scai-why-local-c .scai-local-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .scai-why-local-c .scai-local-content {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .scai-why-local-c .scai-local-h2 {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 1rem;
    border-bottom: 2px solid #000;
    display: inline-block;
    padding-bottom: 0.5rem;
    align-self: flex-start;
  }
  .scai-why-local-c .scai-local-list {
    list-style: none;
    font-size: 0.95rem;
    padding: 0;
    margin: 0;
  }
  .scai-why-local-c .scai-local-list li {
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
    margin-bottom: 0.5rem;
  }
  .scai-why-local-c .scai-local-list li:last-child { border-bottom: none; margin-bottom: 0; }
  .scai-why-local-c .scai-local-list li::before {
    content: "▸";
    margin-right: 0.5rem;
    font-weight: bold;
  }
  
  /* Fallback for any why-local section */
  [data-component="scai-why-local-section"] {
    margin: 3rem 0;
  }
  
  .scai-faq-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1.5rem 0;
    padding: 0;
    color: #000;
  }
  
  .scai-faq-item {
    /* Spacing only - border/radius handled by variation CSS */
  }
  
  .scai-faq-question {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    padding: 0;
    color: #000;
  }
  
  .scai-faq-answer {
    color: #444;
    margin: 0;
  }
  
  /* Closing Section - same style as other sections */
  .scai-closing {
    margin: 3rem 0;
  }
  
  /* Key Takeaways */
  .scai-key-takeaways {
    background: #f0f0f0;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 2rem 0;
  }
  
  .scai-takeaways-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    padding: 0;
  }
  
  .scai-takeaways-list {
    margin: 0;
    padding: 0 0 0 1.5rem;
  }
  
  .scai-takeaways-list li {
    margin: 0.5rem 0;
  }
  
  /* Pros & Cons */
  .scai-pros-cons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 2rem 0;
  }
  
  .scai-pros, .scai-cons {
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .scai-pros {
    background: #f5f5f5;
    border: 1px solid #ccc;
  }
  
  .scai-cons {
    background: #fafafa;
    border: 1px solid #ddd;
  }
  
  .scai-pros-title, .scai-cons-title {
    font-weight: 600;
    margin: 0 0 1rem 0;
    padding: 0;
  }
  
  .scai-pros ul, .scai-cons ul {
    margin: 0;
    padding: 0 0 0 1.5rem;
  }
  
  /* Comparison Table */
  .scai-comparison-table {
    margin: 2rem 0;
  }
  
  .scai-comparison-table table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }
  
  .scai-comparison-table th,
  .scai-comparison-table td {
    padding: 1rem;
    border: 1px solid #e5e5e5;
    text-align: left;
  }
  
  .scai-comparison-table th {
    background: #f5f5f5;
    font-weight: 600;
  }
  
  .scai-comparison-table tr:nth-child(even) {
    background: #fafafa;
  }
  
  /* Product Card */
  .scai-product-card {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    margin: 2rem 0;
    background: #fff;
  }
  
  .scai-product-image {
    position: relative;
    flex-shrink: 0;
  }
  
  .scai-product-image img {
    width: 200px;
    height: 200px;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .scai-product-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #000;
    color: #fff;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .scai-product-name {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    padding: 0;
  }
  
  .scai-product-rating {
    margin: 0 0 0.5rem 0;
    padding: 0;
    color: #666;
  }
  
  .scai-product-price {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    padding: 0;
  }
  
  .scai-product-pros {
    margin: 0 0 1rem 0;
    padding: 0 0 0 1.5rem;
  }
  
  .scai-amazon-button {
    display: inline-block;
    background: #000;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
  }
  
  /* Recipe Components - Base */
  .scai-ingredients,
  .scai-instructions {
    background: #fafafa;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 3rem 0;
  }
  
  /* Ingredients - Variation A (Grouped Box) */
  .scai-ingredients-a,
  [data-component="scai-ingredients-section"].scai-ingredients-a {
    border: 2px solid #000;
    margin: 3rem 0;
  }
  .scai-ingredients-a .scai-ingredients-h2 {
    background: #000;
    color: #fff;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    margin: 0;
  }
  .scai-ingredients-a .scai-ingredients-list {
    list-style: none;
    padding: 1rem;
  }
  .scai-ingredients-a .scai-ingredients-list li {
    padding: 0.4rem 0;
    font-size: 0.875rem;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    gap: 0.5rem;
  }
  .scai-ingredients-a .scai-ingredients-list li::before { content: '☐'; }
  
  /* Ingredients - Variation B (Simple List) */
  .scai-ingredients-b,
  [data-component="scai-ingredients-section"].scai-ingredients-b {
    border-top: 4px solid #000;
    padding-top: 1rem;
    margin: 3rem 0;
  }
  .scai-ingredients-b .scai-ingredients-h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    font-weight: bold;
  }
  .scai-ingredients-b .scai-ingredients-list {
    list-style: none;
    padding: 0;
  }
  .scai-ingredients-b .scai-ingredients-list li {
    padding: 0.75rem 0;
    border-bottom: 1px solid #f0f0f0;
    position: relative;
    padding-left: 2rem;
  }
  .scai-ingredients-b .scai-ingredients-list li::before {
    content: "";
    width: 8px;
    height: 8px;
    background: #000;
    position: absolute;
    left: 0;
    top: 1.2rem;
    border-radius: 50%;
  }
  
  /* Ingredients - Variation C (Checklist) */
  .scai-ingredients-c,
  [data-component="scai-ingredients-section"].scai-ingredients-c {
    border-left: 6px solid #000;
    padding-left: 2rem;
    margin: 3rem 0;
  }
  .scai-ingredients-c .scai-ingredients-h2 {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 900;
  }
  .scai-ingredients-c .scai-ingredients-list {
    list-style: none;
    padding: 0;
  }
  .scai-ingredients-c .scai-ingredients-list li {
    display: flex;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.95rem;
  }
  .scai-ingredients-c .scai-ingredients-list li::before {
    content: "✓";
    font-weight: bold;
    margin-right: 1.5rem;
    font-size: 1.1rem;
  }
  
  /* Fallback for any ingredients section */
  [data-component="scai-ingredients-section"] {
    margin: 3rem 0;
  }
  
  /* Instructions - Variation A (Numbered Steps) */
  .scai-instructions-a,
  [data-component="scai-instructions-section"].scai-instructions-a {
    margin: 3rem 0;
  }
  .scai-instructions-a .scai-instructions-h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    border-bottom: 2px solid #000;
    padding-bottom: 0.5rem;
  }
  .scai-instructions-a .scai-instructions-list {
    list-style: none;
    counter-reset: step;
    padding: 0;
  }
  .scai-instructions-a .scai-instructions-list li {
    padding: 0.75rem 0;
    border-bottom: 1px solid #eee;
    font-size: 0.875rem;
    display: flex;
    gap: 1rem;
  }
  .scai-instructions-a .scai-instructions-list li::before {
    counter-increment: step;
    content: counter(step);
    background: #000;
    color: #fff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    flex-shrink: 0;
  }
  
  /* Instructions - Variation B (Simple) */
  .scai-instructions-b,
  [data-component="scai-instructions-section"].scai-instructions-b {
    margin: 3rem 0;
  }
  .scai-instructions-b .scai-instructions-h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
  .scai-instructions-b .scai-instructions-list {
    list-style: decimal;
    padding-left: 1.5rem;
    font-size: 0.875rem;
  }
  .scai-instructions-b .scai-instructions-list li {
    padding: 0.5rem 0;
  }
  
  /* Instructions - Variation C (Cards) */
  .scai-instructions-c,
  [data-component="scai-instructions-section"].scai-instructions-c {
    margin: 3rem 0;
  }
  .scai-instructions-c .scai-instructions-h2 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }
  .scai-instructions-c .scai-instructions-list {
    list-style: none;
    padding: 0;
  }
  .scai-instructions-c .scai-instructions-list li {
    border: 1px solid #000;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }
  .scai-instructions-c .scai-step-number {
    font-weight: bold;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  /* Fallback for any instructions section */
  [data-component="scai-instructions-section"] {
    margin: 3rem 0;
  }
  
  /* Recipe Variation Classes - Tips */
  .scai-tips-section-a,
  .scai-tips-section-b,
  .scai-tips-section-c,
  [data-component="scai-tips-section"] {
    margin: 3rem 0;
  }
  
  /* Nutrition - Variation A (Standard Table) */
  .scai-nutrition-a,
  [data-component="scai-nutrition-section"].scai-nutrition-a {
    border: 2px solid #000;
    margin: 3rem 0;
  }
  .scai-nutrition-a .scai-nutrition-h2 {
    background: #000;
    color: #fff;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    margin: 0;
  }
  .scai-nutrition-a .scai-nutrition-table {
    width: 100%;
    border-collapse: collapse;
  }
  .scai-nutrition-a .scai-nutrition-table td {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    border-bottom: 1px solid #eee;
  }
  .scai-nutrition-a .scai-nutrition-table td:last-child {
    text-align: right;
    font-weight: bold;
  }
  
  /* Nutrition - Variation B (Compact Rows) */
  .scai-nutrition-b,
  [data-component="scai-nutrition-section"].scai-nutrition-b {
    background: #f5f5f5;
    padding: 1rem;
    margin: 3rem 0;
  }
  .scai-nutrition-b .scai-nutrition-h2 {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  .scai-nutrition-b .scai-nutrition-row {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.8rem;
    border-bottom: 1px solid #ddd;
  }
  
  /* Nutrition - Variation C (Zebra Striped) */
  .scai-nutrition-c,
  [data-component="scai-nutrition-section"].scai-nutrition-c {
    border: 2px solid #000;
    padding: 1rem;
    margin: 3rem 0;
  }
  .scai-nutrition-c h2,
  .scai-nutrition-c .scai-nutrition-h2 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
    border-bottom: 2px solid #000;
    display: inline-block;
  }
  .scai-nutrition-c table,
  .scai-nutrition-c .scai-nutrition-table {
    width: 100%;
    border-collapse: collapse;
  }
  .scai-nutrition-c tr:nth-child(even) {
    background: #f2f2f2;
  }
  .scai-nutrition-c td {
    padding: 10px;
    font-size: 0.9rem;
  }
  .scai-nutrition-c th {
    background: #000;
    color: #fff;
    padding: 10px;
    text-align: left;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 1px;
  }
  .scai-nutrition-c .scai-nutrition-disclaimer {
    padding: 1rem 1.5rem;
    font-size: 0.75rem;
    color: #666;
    font-style: italic;
    background: #fff;
  }
  
  /* Fallback for any nutrition section */
  [data-component="scai-nutrition-section"] {
    margin: 3rem 0;
  }
  
  /* Features - Variation A (Grid) */
  .scai-features-a,
  [data-component="scai-features-section"].scai-features-a {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    padding: 2rem 0;
    margin: 3rem 0;
  }
  .scai-features-a .scai-features-h2 {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .scai-features-a .scai-features-list {
    list-style: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 0;
  }
  .scai-features-a .scai-features-list li {
    padding-left: 1.5rem;
    font-size: 0.9rem;
    position: relative;
  }
  .scai-features-a .scai-features-list li::before {
    content: '+';
    position: absolute;
    left: 0;
    font-weight: bold;
    font-size: 1.2rem;
    line-height: 1;
  }
  
  /* Features - Variation B/C */
  .scai-features-b,
  .scai-features-c,
  [data-component="scai-features-section"] {
    margin: 3rem 0;
  }
  
  /* Pros/Cons - Variation A (Side by Side) */
  .scai-pros-cons-a,
  [data-component="scai-pros-cons-section"].scai-pros-cons-a {
    display: flex;
    gap: 1rem;
    margin: 3rem 0;
  }
  .scai-pros-cons-a .scai-pros,
  .scai-pros-cons-a .scai-cons {
    flex: 1;
    border: 2px solid #000;
  }
  .scai-pros-cons-a .scai-pros-title,
  .scai-pros-cons-a .scai-cons-title {
    background: #000;
    color: #fff;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: bold;
  }
  .scai-pros-cons-a .scai-pros-list,
  .scai-pros-cons-a .scai-cons-list {
    list-style: none;
    padding: 1rem;
  }
  .scai-pros-cons-a .scai-pros-list li,
  .scai-pros-cons-a .scai-cons-list li {
    padding: 0.35rem 0;
    font-size: 0.85rem;
  }
  .scai-pros-cons-a .scai-pros-list li::before { content: '+ '; font-weight: bold; }
  .scai-pros-cons-a .scai-cons-list li::before { content: '− '; font-weight: bold; }
  
  /* Pros/Cons - Variation B/C */
  .scai-pros-cons-b,
  .scai-pros-cons-c,
  [data-component="scai-pros-cons-section"] {
    margin: 3rem 0;
  }
  
  /* Rating - Variation A (Publisher) */
  .scai-rating-a,
  [data-component="scai-rating-section"].scai-rating-a {
    border: 2px solid #000;
    padding: 2rem;
    background: #fff;
    margin: 3rem 0;
  }
  .scai-rating-a .scai-rating-h2 {
    font-size: 1rem;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
    letter-spacing: 0.1em;
    border-bottom: 1px solid #000;
    display: block;
    padding-bottom: 0.5rem;
  }
  .scai-rating-a .scai-rating-body {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }
  .scai-rating-a .scai-rating-left {
    flex: 0 0 auto;
    text-align: center;
  }
  .scai-rating-a .scai-rating-score {
    font-size: 3.5rem;
    font-weight: bold;
    line-height: 1;
    margin-bottom: 0.25rem;
    display: block;
  }
  .scai-rating-a .scai-rating-stars {
    font-size: 1.25rem;
    letter-spacing: 0.1em;
    display: block;
    margin-bottom: 0.5rem;
  }
  .scai-rating-a .scai-rating-paragraph {
    font-size: 0.95rem;
    line-height: 1.6;
    flex: 1;
  }
  
  /* Rating - Variation B/C */
  .scai-rating-b,
  .scai-rating-c,
  [data-component="scai-rating-section"] {
    margin: 3rem 0;
  }
  
  .scai-ingredients-title,
  .scai-instructions-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    padding: 0;
  }
  
  .scai-ingredients-list,
  .scai-instructions-list {
    margin: 0;
    padding: 0 0 0 1.5rem;
  }
  
  .scai-ingredients-list li,
  .scai-instructions-list li {
    margin: 0.5rem 0;
  }
  
  /* Nutrition Table */
  .scai-nutrition-table {
    margin: 2rem 0;
  }
  
  .scai-nutrition-table table {
    width: 100%;
    max-width: 400px;
    border-collapse: collapse;
    margin: 0;
  }
  
  .scai-nutrition-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e5e5;
  }
  
  .scai-nutrition-table td:first-child {
    font-weight: 600;
  }
  
  /* Animation for image loading */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .scai-article {
      padding: 1rem;
    }
    
    .scai-h1 {
      font-size: 2rem;
    }
    
    .scai-h2 {
      font-size: 1.5rem;
    }
  }
  
  @media (max-width: 480px) {
    .scai-article {
      padding: 0.75rem;
    }
    
    .scai-h1 {
      font-size: 1.75rem;
    }
    
    .scai-h2 {
      font-size: 1.25rem;
    }
  }

  /* Product Card Height Overrides - Reduce card height to match mockups */
  [data-component="scai-product-card"] .scai-pc-image-wrap {
    min-height: 180px !important;
  }
  @media (min-width: 768px) {
    [data-component="scai-product-card"] .scai-pc-image-wrap {
      min-height: 240px !important;
    }
  }
  [data-component="scai-product-card"] .scai-pc-content {
    padding: 1rem 1.25rem !important;
  }
  [data-component="scai-product-card"] .scai-pc-footer {
    padding-top: 1rem !important;
  }
  [data-component="scai-product-card"] .scai-pc-desc {
    margin-bottom: 1rem !important;
  }
  /* Product Card Spacing Overrides - Reduce spacing between elements */
  [data-component="scai-product-card"] .scai-pc-header {
    margin-bottom: 0.5rem !important;
  }
  [data-component="scai-product-card"] .scai-pc-rating {
    margin-bottom: 0.75rem !important;
  }
  [data-component="scai-product-card"] .scai-pc-title {
    margin: 0 !important;
  }
  [data-component="scai-product-card"] .scai-pc-badge {
    margin-bottom: 0.5rem !important;
  }
</style>
`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSEMBLY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssemblyInput {
  structure: ArticleStructure
  overview: GeneratedContent
  sections: GeneratedContent[]
  faq: FAQContent
  closing: GeneratedContent
  uniqueComponents?: GeneratedContent[]
  metaTitle?: string
  metaDescription?: string
  componentColor?: string  // Color theme ID (default, blue, green, etc.)
  designVariation?: string // Design variation name (Clean Studio, Neo-Brutalist, etc.)
  featuredImageAlt?: string // AI-generated featured image alt text (100-125 chars)
  featuredImageCaption?: string // AI-generated featured image caption
  h2ImageAlts?: string[]    // AI-generated H2 section image alt texts (80-100 chars each)
  selectedComponents?: string[] // When provided, optional components NOT in this list are excluded
}

export function assembleArticle(input: AssemblyInput): string {
  // Create a new collector for this assembly session
  const cssCollector = new VariationCssCollector()

  const { structure, overview, sections, faq, closing, uniqueComponents = [], metaTitle, metaDescription, componentColor = 'default', designVariation, featuredImageAlt, featuredImageCaption, h2ImageAlts = [], selectedComponents } = input

  // Helper: check if an optional component is enabled
  const isComponentOn = (id: string) => !selectedComponents || selectedComponents.includes(id)

  // CRITICAL: Use dynamic flow based on actual H2 count in structure
  // This ensures the flow matches what was actually generated
  const h2Count = structure.h2Titles?.length || 0
  const flow = buildDynamicFlow(structure.articleType, h2Count)

  console.log(`[Assembler] Using dynamic flow for ${structure.articleType} with ${h2Count} H2s:`,
    flow.filter(c => c === 'h2' || c === 'product-card' || c.includes('overview')).slice(0, 10))

  const parts: string[] = []

  // Track which section index we're on
  let sectionIndex = 0

  // Build a Map of unique components by ID for direct lookup
  const uniqueComponentMap = new Map<string, GeneratedContent>()
  for (const comp of uniqueComponents) {
    if (comp?.componentId) {
      uniqueComponentMap.set(comp.componentId, comp)
    }
  }

  console.log(`[Assembler] Unique component map has ${uniqueComponentMap.size} components:`, Array.from(uniqueComponentMap.keys()).join(', '))
  console.log(`[Assembler] Flow contains ${flow.length} items`)
  console.log(`[Assembler] Flow items: ${flow.slice(0, 30).join(', ')}`)

  // Track consumed unique components for sequential fallback
  const consumedUniqueIds = new Set<string>()
  let uniqueFallbackIndex = 0

  // Build content based on structure flow
  for (const componentId of flow) {
    switch (componentId) {
      case 'h1':
        parts.push(generateH1Html(structure))
        break

      case 'featured-image':
        parts.push(generateFeaturedImageHtml(structure.topic, structure.articleType, featuredImageAlt, featuredImageCaption))
        break

      case 'overview-paragraph':
        parts.push(overview.html)
        break

      case 'toc':
        if (isComponentOn('toc')) {
          parts.push(generateTocHtml(structure, cssCollector, designVariation))
        }
        break

      case 'h2':
      case 'h2-image':
      case 'standard-paragraph':
        // These are handled together as a section
        if (componentId === 'h2' && sections[sectionIndex]) {
          parts.push(sections[sectionIndex].html)
          sectionIndex++
        }
        break

      case 'faq-h2':
      case 'faq-h3':
      case 'faq-answer':
        // FAQ is handled as a single block
        if (componentId === 'faq-h2') {
          parts.push(generateFaqHtml(structure.topic, faq, cssCollector, designVariation))
        }
        break

      case 'closing-h2':
      case 'closing-paragraph':
        if (componentId === 'closing-h2') {
          parts.push(closing.html)
        }
        break

      case 'product-card': {
        // AFFILIATE SPECIAL CASE: Product cards need the corresponding H2 section FIRST
        // The flow for affiliate is: product-card → product-card → product-card
        // But the orchestrator generates: sections[0], sections[1], sections[2] (H2 + paragraph)
        // AND unique components: product-card-0, product-card-1, product-card-2
        // We need to output BOTH: section (H2 + paragraph) THEN product card

        // Safety check: skip if section doesn't exist (prevents duplication from flow/section mismatch)
        if (!sections[sectionIndex]) {
          console.warn(`[Assembler] Skipping product-card ${sectionIndex}: no section available (sections.length=${sections.length})`)
          sectionIndex++
          break
        }

        // First, output the section with H2 and paragraph
        parts.push(sections[sectionIndex].html)
        console.log(`[Assembler] Added section ${sectionIndex} for product-card`)

        // Then, find and output the product card
        const productCardId = `product-card-${sectionIndex}`
        if (uniqueComponentMap.has(productCardId) && !consumedUniqueIds.has(productCardId)) {
          const productCard = uniqueComponentMap.get(productCardId)
          if (productCard?.html) {
            parts.push(productCard.html)
            consumedUniqueIds.add(productCardId)
            console.log(`[Assembler] Added product card: ${productCardId}`)
          }
        } else {
          // Fallback: try to find any product-card that hasn't been used
          for (const [id, comp] of uniqueComponentMap) {
            if (id.startsWith('product-card') && !consumedUniqueIds.has(id)) {
              parts.push(comp.html)
              consumedUniqueIds.add(id)
              console.log(`[Assembler] Added product card (fallback): ${id}`)
              break
            }
          }
        }

        sectionIndex++
        break
      }

      default: {
        // Handle unique components - try direct ID match first
        let foundComponent: GeneratedContent | undefined

        console.log(`[Assembler] Looking for component: ${componentId}, available: ${Array.from(uniqueComponentMap.keys()).join(', ')}`)

        // Direct ID match (e.g., 'feature-list', 'cta-box', 'key-takeaways', 'comparison-table', 'quick-verdict')
        if (uniqueComponentMap.has(componentId) && !consumedUniqueIds.has(componentId)) {
          foundComponent = uniqueComponentMap.get(componentId)
          consumedUniqueIds.add(componentId)
          console.log(`[Assembler] Found direct match for: ${componentId}`)
        }

        // Try partial match for indexed components (e.g., 'product-card' matches 'product-card-0')
        if (!foundComponent) {
          for (const [id, comp] of uniqueComponentMap) {
            if (id.startsWith(componentId) && !consumedUniqueIds.has(id)) {
              foundComponent = comp
              consumedUniqueIds.add(id)
              console.log(`[Assembler] Found partial match: ${id} for flow ${componentId}`)
              break
            }
          }
        }

        // Try matching flow entry to componentId in the component (e.g., flow 'topic-overview' matches componentId 'topic-overview')
        if (!foundComponent) {
          for (const [id, comp] of uniqueComponentMap) {
            if (comp.componentId?.startsWith(componentId.replace(/-\d+$/, '')) && !consumedUniqueIds.has(id)) {
              foundComponent = comp
              consumedUniqueIds.add(id)
              console.log(`[Assembler] Found componentId match: ${comp.componentId} for flow ${componentId}`)
              break
            }
          }
        }

        // Fallback to sequential for backward compatibility
        if (!foundComponent && uniqueFallbackIndex < uniqueComponents.length) {
          while (uniqueFallbackIndex < uniqueComponents.length) {
            const comp = uniqueComponents[uniqueFallbackIndex]
            uniqueFallbackIndex++
            if (comp && !consumedUniqueIds.has(comp.componentId || '')) {
              foundComponent = comp
              if (comp.componentId) consumedUniqueIds.add(comp.componentId)
              console.log(`[Assembler] Sequential fallback: ${comp.componentId} for flow ${componentId}`)
              break
            }
          }
        }

        if (foundComponent?.html) {
          parts.push(foundComponent.html)
          console.log(`[Assembler] Inserted component: ${foundComponent.componentId || 'unknown'}`)
        } else {
          console.log(`[Assembler] No component found for: ${componentId}`)
        }
        break
      }
    }
  }

  // Collect variation CSS from all generated content
  const allContent = [overview, ...sections, closing, ...uniqueComponents]

  for (const content of allContent) {
    if (content?.variationCss) {
      cssCollector.add(content.variationCss)
    }
  }

  // Combine collected variation CSS (from assembler helpers + content generators)
  const collectedCss = cssCollector.getAll()
  const variationStyles = collectedCss.length > 0
    ? `\n<style>\n/* Component Variation Styles */\n${collectedCss.join('\n')}\n</style>`
    : ''

  // Generate design variation theme CSS (backgrounds, text colors based on variation)
  const themeStyles = generateVariationThemeCss(designVariation)
  const themeStyleBlock = themeStyles
    ? `\n<style>\n${themeStyles}\n</style>`
    : ''

  // Generate component color CSS overrides
  const colorStyles = generateComponentColorCss(componentColor)
  const colorStyleBlock = colorStyles
    ? `\n<style>\n${colorStyles}\n</style>`
    : ''

  // Wrap in complete HTML document
  const articleContent = parts.join('\n\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle || structure.h1}</title>
  <meta name="description" content="${metaDescription || `Comprehensive guide about ${structure.topic}`}">
  ${getArticleStyles()}${variationStyles}${themeStyleBlock}${colorStyleBlock}
</head>
<body>
  <article class="scai-article" data-article-type="${structure.articleType}" data-variation="${designVariation || 'Clean Studio'}" data-color-theme="${componentColor}">
    ${articleContent}
  </article>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORD COUNT UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

export function countTotalWords(html: string): number {
  // Match validator's word count logic - exclude style/script blocks
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')  // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ') // Remove script blocks
    .replace(/<!--[\s\S]*?-->/g, ' ')                   // Remove comments
    .replace(/<[^>]*>/g, ' ')                           // Remove HTML tags
    .replace(/&[a-z]+;/gi, ' ')                         // Remove HTML entities
    .replace(/\s+/g, ' ')                               // Normalize whitespace
    .trim();
  return text.split(/\s+/).filter(w => w.length > 0).length;
}
