/**
 * Component Templates with CSS Variables
 * 
 * Each component has:
 * - HTML template with {{PLACEHOLDER}} markers for content injection
 * - CSS using var(--mockup-*) variables for colors (set by theme)
 * - Consistent spacing via .scai-component wrapper
 * 
 * This ensures visual consistency across all 18 design variations
 * by pulling exact structure while theme controls colors.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentTemplate {
  id: string;
  name: string;
  html: string;
  css: string;
}

export interface VariationTemplates {
  [variationName: string]: ComponentTemplate[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE STYLES (shared across all variations)
// ═══════════════════════════════════════════════════════════════════════════════

export const BASE_ARTICLE_STYLES = `
/* ═══════════════════════════════════════════════════════════════════════════════
   SCAI Article Mockup - Base Styles
   All colors use CSS variables set by theme
   ═══════════════════════════════════════════════════════════════════════════════ */

/* CSS Variables - Set by theme, fallbacks for safety */
:root {
  --mockup-bg: #ffffff;
  --mockup-surface: #f5f5f5;
  --mockup-text: #171717;
  --mockup-text-secondary: #525252;
  --mockup-text-muted: #a3a3a3;
  --mockup-border: #e5e5e5;
  --mockup-accent: #3b82f6;
  --mockup-accent-hover: #2563eb;
  --mockup-shadow: 0 4px 24px rgba(0,0,0,0.08);
  --mockup-radius: 12px;
  --mockup-font-family: system-ui, -apple-system, sans-serif;
  --mockup-heading-weight: 700;
  --mockup-body-weight: 400;
  --mockup-line-height: 1.7;
}

/* Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--mockup-font-family);
  font-size: 16px;
  line-height: var(--mockup-line-height);
  color: var(--mockup-text);
  background: var(--mockup-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Article Container */
.scai-article {
  max-width: 768px;
  margin: 0 auto;
  padding: 2rem 0;
}

/* Component Spacing */
.scai-component {
  margin: 1.5rem 0;
}

.scai-section {
  margin: 2.5rem 0;
}

/* Typography */
.scai-h1 {
  font-size: 2.25rem;
  font-weight: var(--mockup-heading-weight);
  line-height: 1.2;
  color: var(--mockup-text);
  margin-bottom: 1.5rem;
}

.scai-h2 {
  font-size: 1.625rem;
  font-weight: var(--mockup-heading-weight);
  line-height: 1.3;
  color: var(--mockup-text);
  margin: 2.5rem 0 1rem;
  padding-top: 1rem;
}

.scai-h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--mockup-text);
  margin: 1.5rem 0 0.75rem;
}

/* Paragraphs */
.scai-paragraph {
  color: var(--mockup-text-secondary);
  margin: 1rem 0;
  font-weight: var(--mockup-body-weight);
}

.scai-overview-paragraph {
  font-size: 1.125rem;
  color: var(--mockup-text-secondary);
  margin: 1.5rem 0;
  line-height: 1.8;
}

/* Images */
.scai-featured-image {
  margin: 1.5rem 0 2rem;
}

.scai-featured-image img {
  width: 100%;
  height: auto;
  border-radius: var(--mockup-radius);
  display: block;
}

.scai-h2-image {
  margin: 1.25rem 0;
}

.scai-h2-image img {
  width: 100%;
  height: auto;
  border-radius: var(--mockup-radius);
  display: block;
}

/* Links */
a {
  color: var(--mockup-accent);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--mockup-accent-hover);
  text-decoration: underline;
}

/* Lists */
ul, ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
  color: var(--mockup-text-secondary);
}

li {
  margin: 0.5rem 0;
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT TEMPLATES
// Each template uses CSS variables and {{PLACEHOLDER}} for content injection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Table of Contents Template
 * Placeholders: {{TOC_ITEMS}} - list of <li><a href="#id">Title</a></li>
 */
export const TOC_TEMPLATE: ComponentTemplate = {
  id: 'toc',
  name: 'Table of Contents',
  html: `<nav class="scai-toc scai-component" data-component="scai-toc">
  <div class="scai-toc-header">
    <span class="scai-toc-icon">📑</span>
    <span class="scai-toc-title">Table of Contents</span>
  </div>
  <ul class="scai-toc-list">
{{TOC_ITEMS}}
  </ul>
</nav>`,
  css: `/* Table of Contents */
.scai-toc {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-toc-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  background: var(--mockup-bg);
}
.scai-toc-icon {
  font-size: 1rem;
}
.scai-toc-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--mockup-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.scai-toc-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
}
.scai-toc-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--mockup-border);
}
.scai-toc-list li:last-child {
  border-bottom: none;
}
.scai-toc-list a {
  color: var(--mockup-text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-toc-list a::before {
  content: '→';
  color: var(--mockup-text-muted);
  font-size: 0.875rem;
}
.scai-toc-list a:hover {
  color: var(--mockup-accent);
  text-decoration: none;
}
.scai-toc-list a:hover::before {
  color: var(--mockup-accent);
}`
};

/**
 * FAQ Section Template
 * Placeholders: {{FAQ_ITEMS}} - FAQ item divs
 */
export const FAQ_TEMPLATE: ComponentTemplate = {
  id: 'faq',
  name: 'FAQ Section',
  html: `<div class="scai-faq scai-component" data-component="scai-faq">
{{FAQ_ITEMS}}
</div>`,
  css: `/* FAQ Section */
.scai-faq {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.scai-faq-item {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-faq-question {
  font-size: 1rem;
  font-weight: 600;
  color: var(--mockup-text);
  padding: 1rem 1.25rem;
  background: var(--mockup-bg);
  border-bottom: 1px solid var(--mockup-border);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.scai-faq-question::before {
  content: 'Q';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--mockup-accent);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}
.scai-faq-answer {
  padding: 1rem 1.25rem;
  color: var(--mockup-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.7;
}`
};

/**
 * Product Card Template (Affiliate)
 * Placeholders: {{PRODUCT_NAME}}, {{PRODUCT_PRICE}}, {{PRODUCT_RATING}}, {{PRODUCT_DESCRIPTION}}, {{PRODUCT_URL}}, {{PRODUCT_IMAGE}}
 */
export const PRODUCT_CARD_TEMPLATE: ComponentTemplate = {
  id: 'product-card',
  name: 'Product Card',
  html: `<div class="scai-product-card scai-component" data-component="scai-product-card">
  <div class="scai-product-image">
    <img src="{{PRODUCT_IMAGE}}" alt="{{PRODUCT_NAME}}" loading="lazy" />
  </div>
  <div class="scai-product-content">
    <h3 class="scai-product-name">{{PRODUCT_NAME}}</h3>
    <div class="scai-product-meta">
      <span class="scai-product-price">{{PRODUCT_PRICE}}</span>
      <span class="scai-product-rating">{{PRODUCT_RATING}}</span>
    </div>
    <p class="scai-product-description">{{PRODUCT_DESCRIPTION}}</p>
    <a href="{{PRODUCT_URL}}" class="scai-product-cta" target="_blank" rel="nofollow noopener">
      Check Price on Amazon →
    </a>
  </div>
</div>`,
  css: `/* Product Card */
.scai-product-card {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@media (min-width: 640px) {
  .scai-product-card {
    flex-direction: row;
  }
}
.scai-product-image {
  flex-shrink: 0;
  background: var(--mockup-bg);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scai-product-image img {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
}
.scai-product-content {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.scai-product-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--mockup-text);
  margin: 0;
}
.scai-product-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.scai-product-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--mockup-accent);
}
.scai-product-rating {
  color: #f59e0b;
  font-size: 0.875rem;
}
.scai-product-description {
  color: var(--mockup-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.6;
  margin: 0;
}
.scai-product-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--mockup-accent);
  color: white !important;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none !important;
  align-self: flex-start;
  margin-top: 0.5rem;
  transition: background 0.2s;
}
.scai-product-cta:hover {
  background: var(--mockup-accent-hover);
}`
};

/**
 * Feature List Template (Commercial)
 * Placeholders: {{FEATURE_ITEMS}} - list items
 */
export const FEATURE_LIST_TEMPLATE: ComponentTemplate = {
  id: 'feature-list',
  name: 'Feature List',
  html: `<div class="scai-feature-list scai-component" data-component="scai-feature-list">
  <ul class="scai-features">
{{FEATURE_ITEMS}}
  </ul>
</div>`,
  css: `/* Feature List */
.scai-feature-list {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  padding: 1.5rem;
}
.scai-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.scai-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.scai-feature-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--mockup-accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  margin-top: 0.125rem;
}
.scai-feature-content {
  flex: 1;
}
.scai-feature-title {
  font-weight: 600;
  color: var(--mockup-text);
  margin-bottom: 0.25rem;
}
.scai-feature-desc {
  color: var(--mockup-text-secondary);
  font-size: 0.9375rem;
}`
};

/**
 * CTA Box Template (Commercial)
 * Placeholders: {{CTA_TITLE}}, {{CTA_TEXT}}, {{CTA_BUTTON_TEXT}}, {{CTA_URL}}
 */
export const CTA_BOX_TEMPLATE: ComponentTemplate = {
  id: 'cta-box',
  name: 'CTA Box',
  html: `<div class="scai-cta-box scai-component" data-component="scai-cta-box">
  <div class="scai-cta-content">
    <h3 class="scai-cta-title">{{CTA_TITLE}}</h3>
    <p class="scai-cta-text">{{CTA_TEXT}}</p>
  </div>
  <a href="{{CTA_URL}}" class="scai-cta-button">{{CTA_BUTTON_TEXT}}</a>
</div>`,
  css: `/* CTA Box */
.scai-cta-box {
  background: linear-gradient(135deg, var(--mockup-accent), var(--mockup-accent-hover));
  border-radius: var(--mockup-radius);
  padding: 2rem;
  text-align: center;
  color: white;
}
.scai-cta-content {
  margin-bottom: 1.5rem;
}
.scai-cta-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: white;
}
.scai-cta-text {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
.scai-cta-button {
  display: inline-block;
  background: white;
  color: var(--mockup-accent) !important;
  padding: 0.875rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none !important;
  transition: transform 0.2s, box-shadow 0.2s;
}
.scai-cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}`
};

/**
 * Comparison Table Template
 * Placeholders: {{TABLE_HEADERS}}, {{TABLE_ROWS}}
 */
export const COMPARISON_TABLE_TEMPLATE: ComponentTemplate = {
  id: 'comparison-table',
  name: 'Comparison Table',
  html: `<div class="scai-comparison-table scai-component" data-component="scai-comparison-table">
  <div class="scai-table-wrapper">
    <table>
      <thead>
        <tr>{{TABLE_HEADERS}}</tr>
      </thead>
      <tbody>
{{TABLE_ROWS}}
      </tbody>
    </table>
  </div>
</div>`,
  css: `/* Comparison Table */
.scai-comparison-table {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-table-wrapper {
  overflow-x: auto;
}
.scai-comparison-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.scai-comparison-table th {
  background: var(--mockup-bg);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--mockup-text);
  border-bottom: 2px solid var(--mockup-border);
  white-space: nowrap;
}
.scai-comparison-table td {
  padding: 1rem;
  color: var(--mockup-text-secondary);
  border-bottom: 1px solid var(--mockup-border);
  vertical-align: top;
}
.scai-comparison-table tr:last-child td {
  border-bottom: none;
}
.scai-comparison-table tr:hover td {
  background: var(--mockup-bg);
}`
};

/**
 * Quick Verdict Box Template
 * Placeholders: {{VERDICT_TEXT}}, {{WINNER_NAME}}
 */
export const QUICK_VERDICT_TEMPLATE: ComponentTemplate = {
  id: 'quick-verdict',
  name: 'Quick Verdict',
  html: `<div class="scai-quick-verdict scai-component" data-component="scai-quick-verdict">
  <div class="scai-verdict-header">
    <span class="scai-verdict-icon">🏆</span>
    <span class="scai-verdict-label">Quick Verdict</span>
  </div>
  <div class="scai-verdict-content">
    <p class="scai-verdict-text">{{VERDICT_TEXT}}</p>
    <div class="scai-verdict-winner">
      <strong>Our Pick:</strong> {{WINNER_NAME}}
    </div>
  </div>
</div>`,
  css: `/* Quick Verdict */
.scai-quick-verdict {
  background: var(--mockup-surface);
  border: 2px solid var(--mockup-accent);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-verdict-header {
  background: var(--mockup-accent);
  color: white;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.scai-verdict-icon {
  font-size: 1.25rem;
}
.scai-verdict-content {
  padding: 1.25rem;
}
.scai-verdict-text {
  color: var(--mockup-text-secondary);
  margin: 0 0 1rem;
  line-height: 1.7;
}
.scai-verdict-winner {
  background: var(--mockup-bg);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: var(--mockup-text);
  font-size: 0.9375rem;
}
.scai-verdict-winner strong {
  color: var(--mockup-accent);
}`
};

/**
 * Materials/Requirements Box Template (How-To)
 * Placeholders: {{MATERIALS_ITEMS}}
 */
export const MATERIALS_BOX_TEMPLATE: ComponentTemplate = {
  id: 'materials-box',
  name: 'Materials Box',
  html: `<div class="scai-materials-box scai-component" data-component="scai-materials-box">
  <div class="scai-materials-header">
    <span class="scai-materials-icon">🛠️</span>
    <span class="scai-materials-title">What You'll Need</span>
  </div>
  <ul class="scai-materials-list">
{{MATERIALS_ITEMS}}
  </ul>
</div>`,
  css: `/* Materials Box */
.scai-materials-box {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-materials-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-materials-icon {
  font-size: 1.25rem;
}
.scai-materials-title {
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-materials-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
}
.scai-materials-list li {
  padding: 0.5rem 0;
  color: var(--mockup-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px dashed var(--mockup-border);
}
.scai-materials-list li:last-child {
  border-bottom: none;
}
.scai-materials-list li::before {
  content: '✓';
  color: var(--mockup-accent);
  font-weight: 600;
}`
};

/**
 * Pro Tips Template
 * Placeholders: {{TIP_ITEMS}}
 */
export const PRO_TIPS_TEMPLATE: ComponentTemplate = {
  id: 'pro-tips',
  name: 'Pro Tips',
  html: `<div class="scai-pro-tips scai-component" data-component="scai-pro-tips">
  <div class="scai-tips-header">
    <span class="scai-tips-icon">💡</span>
    <span class="scai-tips-title">Pro Tips</span>
  </div>
  <ul class="scai-tips-list">
{{TIP_ITEMS}}
  </ul>
</div>`,
  css: `/* Pro Tips */
.scai-pro-tips {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-tips-header {
  background: #f59e0b;
  color: white;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.scai-tips-icon {
  font-size: 1.25rem;
}
.scai-tips-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
}
.scai-tips-list li {
  padding: 0.75rem 0;
  color: #92400e;
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.scai-tips-list li:last-child {
  border-bottom: none;
}
.scai-tips-list li::before {
  content: '→';
  color: #d97706;
  font-weight: 700;
  flex-shrink: 0;
}`
};

/**
 * Key Takeaways Template (Informational)
 * Placeholders: {{TAKEAWAY_ITEMS}}
 */
export const KEY_TAKEAWAYS_TEMPLATE: ComponentTemplate = {
  id: 'key-takeaways',
  name: 'Key Takeaways',
  html: `<div class="scai-key-takeaways scai-component" data-component="scai-key-takeaways">
  <div class="scai-takeaways-header">
    <span class="scai-takeaways-icon">📌</span>
    <span class="scai-takeaways-title">Key Takeaways</span>
  </div>
  <ul class="scai-takeaways-list">
{{TAKEAWAY_ITEMS}}
  </ul>
</div>`,
  css: `/* Key Takeaways */
.scai-key-takeaways {
  background: var(--mockup-surface);
  border-left: 4px solid var(--mockup-accent);
  border-radius: 0 var(--mockup-radius) var(--mockup-radius) 0;
  overflow: hidden;
}
.scai-takeaways-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-takeaways-icon {
  font-size: 1.25rem;
}
.scai-takeaways-title {
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-takeaways-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
}
.scai-takeaways-list li {
  padding: 0.625rem 0;
  color: var(--mockup-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.scai-takeaways-list li::before {
  content: '✓';
  color: var(--mockup-accent);
  font-weight: 700;
  flex-shrink: 0;
}`
};

/**
 * Quick Facts Template (Informational)
 * Placeholders: {{FACT_ITEMS}}
 */
export const QUICK_FACTS_TEMPLATE: ComponentTemplate = {
  id: 'quick-facts',
  name: 'Quick Facts',
  html: `<div class="scai-quick-facts scai-component" data-component="scai-quick-facts">
  <div class="scai-facts-header">
    <span class="scai-facts-icon">📊</span>
    <span class="scai-facts-title">Quick Facts</span>
  </div>
  <dl class="scai-facts-list">
{{FACT_ITEMS}}
  </dl>
</div>`,
  css: `/* Quick Facts */
.scai-quick-facts {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-facts-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-facts-icon {
  font-size: 1.25rem;
}
.scai-facts-title {
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-facts-list {
  padding: 0;
  margin: 0;
}
.scai-fact-item {
  display: flex;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
}
.scai-fact-item:last-child {
  border-bottom: none;
}
.scai-fact-item dt {
  flex: 0 0 40%;
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-fact-item dd {
  flex: 1;
  margin: 0;
  color: var(--mockup-text-secondary);
}`
};

/**
 * Honorable Mentions Template (Listicle)
 * Placeholders: {{MENTION_ITEMS}}
 */
export const HONORABLE_MENTIONS_TEMPLATE: ComponentTemplate = {
  id: 'honorable-mentions',
  name: 'Honorable Mentions',
  html: `<div class="scai-honorable-mentions scai-component" data-component="scai-honorable-mentions">
  <div class="scai-mentions-header">
    <span class="scai-mentions-icon">🎖️</span>
    <span class="scai-mentions-title">Honorable Mentions</span>
  </div>
  <div class="scai-mentions-list">
{{MENTION_ITEMS}}
  </div>
</div>`,
  css: `/* Honorable Mentions */
.scai-honorable-mentions {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-mentions-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-mentions-icon {
  font-size: 1.25rem;
}
.scai-mentions-title {
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-mentions-list {
  padding: 0.5rem;
}
.scai-mention-item {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: background 0.2s;
}
.scai-mention-item:hover {
  background: var(--mockup-bg);
}
.scai-mention-item:last-child {
  margin-bottom: 0;
}
.scai-mention-title {
  font-weight: 600;
  color: var(--mockup-text);
  margin-bottom: 0.25rem;
}
.scai-mention-desc {
  color: var(--mockup-text-secondary);
  font-size: 0.9375rem;
  margin: 0;
}`
};

/**
 * Local Service Info Box Template
 * Placeholders: {{SERVICE_NAME}}, {{SERVICE_ADDRESS}}, {{SERVICE_PHONE}}, {{SERVICE_HOURS}}, {{SERVICE_WEBSITE}}
 */
export const SERVICE_INFO_TEMPLATE: ComponentTemplate = {
  id: 'service-info',
  name: 'Service Info Box',
  html: `<div class="scai-service-info scai-component" data-component="scai-service-info">
  <div class="scai-service-header">
    <span class="scai-service-icon">📍</span>
    <span class="scai-service-name">{{SERVICE_NAME}}</span>
  </div>
  <div class="scai-service-details">
    <div class="scai-service-row">
      <span class="scai-service-label">Address</span>
      <span class="scai-service-value">{{SERVICE_ADDRESS}}</span>
    </div>
    <div class="scai-service-row">
      <span class="scai-service-label">Phone</span>
      <span class="scai-service-value">{{SERVICE_PHONE}}</span>
    </div>
    <div class="scai-service-row">
      <span class="scai-service-label">Hours</span>
      <span class="scai-service-value">{{SERVICE_HOURS}}</span>
    </div>
    <a href="{{SERVICE_WEBSITE}}" class="scai-service-link" target="_blank">Visit Website →</a>
  </div>
</div>`,
  css: `/* Service Info Box */
.scai-service-info {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-service-header {
  background: var(--mockup-accent);
  color: white;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-service-icon {
  font-size: 1.25rem;
}
.scai-service-name {
  font-weight: 600;
  font-size: 1.125rem;
}
.scai-service-details {
  padding: 1rem 1.25rem;
}
.scai-service-row {
  display: flex;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--mockup-border);
}
.scai-service-row:last-of-type {
  border-bottom: none;
}
.scai-service-label {
  flex: 0 0 80px;
  font-weight: 600;
  color: var(--mockup-text-muted);
  font-size: 0.8125rem;
  text-transform: uppercase;
}
.scai-service-value {
  flex: 1;
  color: var(--mockup-text);
}
.scai-service-link {
  display: block;
  text-align: center;
  padding: 0.75rem;
  background: var(--mockup-bg);
  border-radius: 8px;
  margin-top: 0.75rem;
  font-weight: 600;
}`
};

/**
 * Recipe Ingredients Template
 * Placeholders: {{SERVINGS}}, {{INGREDIENT_ITEMS}}
 */
export const INGREDIENTS_TEMPLATE: ComponentTemplate = {
  id: 'ingredients',
  name: 'Recipe Ingredients',
  html: `<div class="scai-ingredients scai-component" data-component="scai-ingredients">
  <div class="scai-ingredients-header">
    <span class="scai-ingredients-icon">🥗</span>
    <span class="scai-ingredients-title">Ingredients</span>
    <span class="scai-ingredients-servings">{{SERVINGS}}</span>
  </div>
  <ul class="scai-ingredients-list">
{{INGREDIENT_ITEMS}}
  </ul>
</div>`,
  css: `/* Recipe Ingredients */
.scai-ingredients {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-ingredients-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-ingredients-icon {
  font-size: 1.25rem;
}
.scai-ingredients-title {
  font-weight: 600;
  color: var(--mockup-text);
  flex: 1;
}
.scai-ingredients-servings {
  font-size: 0.875rem;
  color: var(--mockup-text-muted);
  background: var(--mockup-surface);
  padding: 0.25rem 0.75rem;
  border-radius: 100px;
}
.scai-ingredients-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
  columns: 2;
  column-gap: 2rem;
}
@media (max-width: 500px) {
  .scai-ingredients-list { columns: 1; }
}
.scai-ingredients-list li {
  padding: 0.5rem 0;
  color: var(--mockup-text-secondary);
  break-inside: avoid;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-ingredients-list li::before {
  content: '•';
  color: var(--mockup-accent);
  font-size: 1.25rem;
  line-height: 1;
}`
};

/**
 * Recipe Instructions Template
 * Placeholders: {{INSTRUCTION_ITEMS}}
 */
export const INSTRUCTIONS_TEMPLATE: ComponentTemplate = {
  id: 'instructions',
  name: 'Recipe Instructions',
  html: `<div class="scai-instructions scai-component" data-component="scai-instructions">
  <div class="scai-instructions-header">
    <span class="scai-instructions-icon">👨‍🍳</span>
    <span class="scai-instructions-title">Instructions</span>
  </div>
  <ol class="scai-instructions-list">
{{INSTRUCTION_ITEMS}}
  </ol>
</div>`,
  css: `/* Recipe Instructions */
.scai-instructions {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-instructions-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-instructions-icon {
  font-size: 1.25rem;
}
.scai-instructions-title {
  font-weight: 600;
  color: var(--mockup-text);
}
.scai-instructions-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
  counter-reset: step;
}
.scai-instructions-list li {
  padding: 1rem 0;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  counter-increment: step;
}
.scai-instructions-list li:last-child {
  border-bottom: none;
}
.scai-instructions-list li::before {
  content: counter(step);
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background: var(--mockup-accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}
.scai-step-content {
  flex: 1;
  color: var(--mockup-text-secondary);
  line-height: 1.7;
}`
};

/**
 * Nutrition Table Template
 * Placeholders: {{NUTRITION_ITEMS}}
 */
export const NUTRITION_TEMPLATE: ComponentTemplate = {
  id: 'nutrition',
  name: 'Nutrition Table',
  html: `<div class="scai-nutrition scai-component" data-component="scai-nutrition">
  <div class="scai-nutrition-header">
    <span class="scai-nutrition-icon">📊</span>
    <span class="scai-nutrition-title">Nutrition Facts</span>
    <span class="scai-nutrition-serving">Per Serving</span>
  </div>
  <div class="scai-nutrition-grid">
{{NUTRITION_ITEMS}}
  </div>
</div>`,
  css: `/* Nutrition Table */
.scai-nutrition {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-nutrition-header {
  background: var(--mockup-bg);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--mockup-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scai-nutrition-icon {
  font-size: 1.25rem;
}
.scai-nutrition-title {
  font-weight: 600;
  color: var(--mockup-text);
  flex: 1;
}
.scai-nutrition-serving {
  font-size: 0.8125rem;
  color: var(--mockup-text-muted);
}
.scai-nutrition-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--mockup-border);
}
@media (max-width: 500px) {
  .scai-nutrition-grid { grid-template-columns: repeat(2, 1fr); }
}
.scai-nutrition-item {
  background: var(--mockup-surface);
  padding: 1rem;
  text-align: center;
}
.scai-nutrition-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--mockup-text);
  display: block;
}
.scai-nutrition-label {
  font-size: 0.8125rem;
  color: var(--mockup-text-muted);
  margin-top: 0.25rem;
  display: block;
}`
};

/**
 * Pros & Cons Template (Review)
 * Placeholders: {{PRO_ITEMS}}, {{CON_ITEMS}}
 */
export const PROS_CONS_TEMPLATE: ComponentTemplate = {
  id: 'pros-cons',
  name: 'Pros & Cons',
  html: `<div class="scai-pros-cons scai-component" data-component="scai-pros-cons">
  <div class="scai-pros">
    <div class="scai-pros-header">
      <span class="scai-pros-icon">👍</span>
      <span class="scai-pros-title">Pros</span>
    </div>
    <ul class="scai-pros-list">
{{PRO_ITEMS}}
    </ul>
  </div>
  <div class="scai-cons">
    <div class="scai-cons-header">
      <span class="scai-cons-icon">👎</span>
      <span class="scai-cons-title">Cons</span>
    </div>
    <ul class="scai-cons-list">
{{CON_ITEMS}}
    </ul>
  </div>
</div>`,
  css: `/* Pros & Cons */
.scai-pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) {
  .scai-pros-cons { grid-template-columns: 1fr; }
}
.scai-pros, .scai-cons {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
}
.scai-pros-header, .scai-cons-header {
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.scai-pros-header {
  background: #dcfce7;
  color: #166534;
  border-bottom: 1px solid #86efac;
}
.scai-cons-header {
  background: #fee2e2;
  color: #991b1b;
  border-bottom: 1px solid #fca5a5;
}
.scai-pros-list, .scai-cons-list {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0;
}
.scai-pros-list li, .scai-cons-list li {
  padding: 0.5rem 0;
  color: var(--mockup-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.scai-pros-list li::before {
  content: '✓';
  color: #16a34a;
  font-weight: 700;
}
.scai-cons-list li::before {
  content: '✗';
  color: #dc2626;
  font-weight: 700;
}`
};

/**
 * Rating Section Template (Review)
 * Placeholders: {{OVERALL_SCORE}}, {{RATING_ITEMS}}
 */
export const RATING_TEMPLATE: ComponentTemplate = {
  id: 'rating',
  name: 'Rating Section',
  html: `<div class="scai-rating scai-component" data-component="scai-rating">
  <div class="scai-rating-overall">
    <div class="scai-rating-score">{{OVERALL_SCORE}}</div>
    <div class="scai-rating-label">Overall Rating</div>
    <div class="scai-rating-stars">★★★★★</div>
  </div>
  <div class="scai-rating-breakdown">
{{RATING_ITEMS}}
  </div>
</div>`,
  css: `/* Rating Section */
.scai-rating {
  background: var(--mockup-surface);
  border: 1px solid var(--mockup-border);
  border-radius: var(--mockup-radius);
  overflow: hidden;
  display: grid;
  grid-template-columns: auto 1fr;
}
@media (max-width: 500px) {
  .scai-rating { grid-template-columns: 1fr; }
}
.scai-rating-overall {
  background: var(--mockup-accent);
  color: white;
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 160px;
}
.scai-rating-score {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}
.scai-rating-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-top: 0.5rem;
}
.scai-rating-stars {
  color: #fbbf24;
  font-size: 1.25rem;
  margin-top: 0.5rem;
}
.scai-rating-breakdown {
  padding: 1.25rem;
}
.scai-rating-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}
.scai-rating-category {
  flex: 0 0 100px;
  font-size: 0.875rem;
  color: var(--mockup-text-muted);
}
.scai-rating-bar {
  flex: 1;
  height: 8px;
  background: var(--mockup-border);
  border-radius: 4px;
  overflow: hidden;
}
.scai-rating-fill {
  height: 100%;
  background: var(--mockup-accent);
  border-radius: 4px;
}
.scai-rating-value {
  flex: 0 0 40px;
  text-align: right;
  font-weight: 600;
  color: var(--mockup-text);
  font-size: 0.875rem;
}`
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_TEMPLATES: Record<string, ComponentTemplate> = {
  'toc': TOC_TEMPLATE,
  'faq': FAQ_TEMPLATE,
  'product-card': PRODUCT_CARD_TEMPLATE,
  'feature-list': FEATURE_LIST_TEMPLATE,
  'cta-box': CTA_BOX_TEMPLATE,
  'comparison-table': COMPARISON_TABLE_TEMPLATE,
  'quick-verdict': QUICK_VERDICT_TEMPLATE,
  'materials-box': MATERIALS_BOX_TEMPLATE,
  'pro-tips': PRO_TIPS_TEMPLATE,
  'key-takeaways': KEY_TAKEAWAYS_TEMPLATE,
  'quick-facts': QUICK_FACTS_TEMPLATE,
  'honorable-mentions': HONORABLE_MENTIONS_TEMPLATE,
  'service-info': SERVICE_INFO_TEMPLATE,
  'ingredients': INGREDIENTS_TEMPLATE,
  'instructions': INSTRUCTIONS_TEMPLATE,
  'nutrition': NUTRITION_TEMPLATE,
  'pros-cons': PROS_CONS_TEMPLATE,
  'rating': RATING_TEMPLATE,
};

/**
 * Get a component template by ID
 */
export function getTemplate(componentId: string): ComponentTemplate | null {
  return COMPONENT_TEMPLATES[componentId] || null;
}

/**
 * Get all component CSS combined
 */
export function getAllComponentCss(): string {
  return Object.values(COMPONENT_TEMPLATES)
    .map(t => t.css)
    .join('\n\n');
}

/**
 * Inject content into template placeholders
 * @param html Template HTML with {{PLACEHOLDER}} markers
 * @param replacements Object with placeholder keys (without braces) and values
 */
export function injectContent(html: string, replacements: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
