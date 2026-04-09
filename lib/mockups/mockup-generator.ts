/**
 * Mockup Generator
 * 
 * Generates complete article mockups using ACTUAL component variations from variations.ts
 * 
 * Key features:
 * - Pulls exact HTML/CSS from COMPONENT_VARIATIONS in data/variations.ts
 * - Maintains visual fidelity of each of the 18 design variations
 * - Proper theme-aware page backgrounds
 * - Consistent spacing between components
 */

import type {
  ArticleTypeId,
  TitleFormat,
  BaseVariationName,
  MockupContent,
  GeneratedMockup,
  MockupGeneratorOptions,
  AffiliateMockupContent,
  CommercialMockupContent,
  ComparisonMockupContent,
  HowToMockupContent,
  InformationalMockupContent,
  ListicleMockupContent,
  LocalMockupContent,
  RecipeMockupContent,
  ReviewMockupContent,
} from './types';

import { STRUCTURE_FLOWS } from '@/data/structure-flows';
import { COMPONENT_VARIATIONS } from '@/data/variations';
import { getVariationTheme, getPageBackground } from './variation-themes';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT LOOKUP
// Get the actual HTML/CSS for a component type + variation name
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get component HTML/CSS from variations.ts
 * Returns the exact HTML and CSS for a specific component type and variation
 */
function getComponentVariation(
  componentType: string,
  variationName: BaseVariationName
): { html: string; css: string } | null {
  const variations = COMPONENT_VARIATIONS[componentType];
  if (!variations) {
    console.warn(`Component type "${componentType}" not found in COMPONENT_VARIATIONS`);
    return null;
  }

  const variation = variations.find(v => v.name === variationName);
  if (!variation) {
    console.warn(`Variation "${variationName}" not found for component "${componentType}"`);
    return null;
  }

  return {
    html: variation.html,
    css: variation.css || '',
  };
}

/**
 * Collect all CSS for components used in a mockup
 */
function collectComponentCss(
  componentTypes: string[],
  variationName: BaseVariationName
): string {
  const cssBlocks: string[] = [];
  const seen = new Set<string>();

  for (const componentType of componentTypes) {
    if (seen.has(componentType)) continue;
    seen.add(componentType);

    const variation = getComponentVariation(componentType, variationName);
    if (variation?.css) {
      cssBlocks.push(variation.css);
    }
  }

  return cssBlocks.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE STYLES
// Shared styles for article layout and typography
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_ARTICLE_STYLES = `
/* ═══════════════════════════════════════════════════════════════════════════════
   SCAI Article Mockup - Base Styles
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Reset */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.7;
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
  margin: 2rem 0;
}

.scai-section {
  margin: 2.5rem 0;
}

/* Typography */
.scai-h1 {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.scai-h2 {
  font-size: 1.625rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 2.5rem 0 1rem;
  padding-top: 1rem;
}

.scai-h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 1.5rem 0 0.75rem;
}

.scai-paragraph {
  margin: 1rem 0;
  line-height: 1.7;
}

/* Images */
.scai-featured-image {
  margin: 1.5rem 0;
}

.scai-featured-image img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  display: block;
}

.scai-featured-image figcaption {
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.75rem;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .scai-article {
    padding: 1.5rem 0;
  }
  
  .scai-h1 {
    font-size: 1.75rem;
  }
  
  .scai-h2 {
    font-size: 1.375rem;
  }
}

/* Product Card Height Overrides - Reduce card height */
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
`;

// ═══════════════════════════════════════════════════════════════════════════════
// THEME-SPECIFIC STYLES
// Override base styles for dark/light themes
// ═══════════════════════════════════════════════════════════════════════════════

function getThemeStyles(variationName: BaseVariationName): string {
  const theme = getVariationTheme(variationName);

  return `
/* Theme: ${variationName} */
body {
  background: ${getPageBackground(theme)};
  color: ${theme.colors.text};
}

.scai-h1, .scai-h2, .scai-h3 {
  color: ${theme.colors.text};
}

.scai-paragraph {
  color: ${theme.colors.textSecondary};
}

.scai-featured-image figcaption {
  color: ${theme.colors.textMuted};
}

a {
  color: ${theme.colors.accent};
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT RENDERERS
// Transform content data into HTML, injecting into variation templates
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render H1 title
 */
function renderH1(content: MockupContent, titleFormat: TitleFormat): string {
  const title = content.titles[titleFormat];
  return `<h1 class="scai-h1">${title}</h1>`;
}

/**
 * Render H2 heading
 */
function renderH2(heading: string): string {
  return `<h2 class="scai-h2">${heading}</h2>`;
}

/**
 * Render paragraph
 */
function renderParagraph(text: string): string {
  return `<p class="scai-paragraph">${text}</p>`;
}

/**
 * Render featured image
 */
function renderFeaturedImage(content: MockupContent): string {
  return `
<figure class="scai-featured-image">
  <img src="${content.featuredImage.url}" alt="${content.featuredImage.alt}">
  <figcaption>${content.featuredImage.alt}</figcaption>
</figure>`;
}

/**
 * Render section image
 */
function renderSectionImage(image: { url: string; alt: string }): string {
  return `
<figure class="scai-featured-image">
  <img src="${image.url}" alt="${image.alt}">
</figure>`;
}

/**
 * Render TOC component using actual variation HTML/CSS
 */
function renderToc(
  content: MockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('toc', variationName);
  if (!variation) return '';

  // Get the H2 headings based on title format
  const h2s = content.h2s[titleFormat];

  // Build TOC items
  const tocItems = h2s.map((h2, index) =>
    `<li><a href="#section${index + 1}">${h2}</a></li>`
  ).join('\n');

  // Replace the sample TOC list in the template with actual content
  let html = variation.html;

  // Find and replace the <ul> contents
  html = html.replace(
    /<ul[^>]*class="scai-toc-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-toc-list">\n${tocItems}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render FAQ component using actual variation HTML/CSS
 */
function renderFaq(
  content: MockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('faq', variationName);
  if (!variation) return '';

  // Build FAQ items from content
  const faqItems = content.faqs.map(faq => `
<div class="scai-faq-item">
  <h3 class="scai-faq-h3">${faq.question}</h3>
  <p class="scai-faq-answer">${faq.answer}</p>
</div>`).join('\n');

  // Replace the sample FAQ items in the template
  let html = variation.html;

  // Find the FAQ items section and replace
  const faqItemsMatch = html.match(/<div class="scai-faq-item">[\s\S]*?<\/div>\s*<div class="scai-faq-item">[\s\S]*?<\/div>/);
  if (faqItemsMatch) {
    html = html.replace(faqItemsMatch[0], faqItems);
  }

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Product Card using actual variation HTML/CSS (for Affiliate articles)
 */
function renderProductCard(
  product: AffiliateMockupContent['products'][0],
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('product-card', variationName);
  if (!variation) return '';

  let html = variation.html;

  // Replace product name
  html = html.replace(
    /data-component="scai-product-card-name">[^<]+</,
    `data-component="scai-product-card-name">${product.name}<`
  );

  // Replace product description
  html = html.replace(
    /<p class="scai-pc-desc">[^<]+<\/p>/,
    `<p class="scai-pc-desc">${product.description}</p>`
  );

  // Replace price
  html = html.replace(
    /\$\d+\.\d{2}/,
    product.price
  );

  // Replace image
  html = html.replace(
    /src="[^"]+"/,
    `src="${product.imageUrl}"`
  );

  // Replace CTA link
  html = html.replace(
    /href="#"/g,
    `href="${product.amazonUrl}"`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Feature List using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces "Key Features" with content H2)
 */
function renderFeatureList(
  content: CommercialMockupContent | ReviewMockupContent,
  variationName: BaseVariationName,
  customH2?: string
): string {
  const variation = getComponentVariation('feature-list', variationName);
  if (!variation) return '';

  const featureItems = content.features.map(f =>
    `<li>${f.title}: ${f.description}</li>`
  ).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the custom H2 from content (if provided)
  if (customH2) {
    html = html.replace(
      /<h2[^>]*class="scai-feature-h2"[^>]*>[^<]*<\/h2>/,
      `<h2 class="scai-feature-h2" data-component="scai-feature-h2">${customH2}</h2>`
    );
  }

  // Replace feature list items
  html = html.replace(
    /<ul[^>]*class="scai-feature-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-feature-list" data-component="scai-feature-list">\n${featureItems}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render CTA Box using actual variation HTML/CSS
 */
function renderCtaBox(
  content: CommercialMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('cta-box', variationName);
  if (!variation) return '';

  let html = variation.html;

  // Replace CTA title
  html = html.replace(
    /data-component="scai-cta-title">[^<]+</,
    `data-component="scai-cta-title">${content.ctaBox.title}<`
  );

  // Replace CTA text
  html = html.replace(
    /<p class="scai-cta-text">[^<]+<\/p>/,
    `<p class="scai-cta-text">${content.ctaBox.text}</p>`
  );

  // Replace button text
  html = html.replace(
    />Get Started</,
    `>${content.ctaBox.buttonText}<`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Comparison Table using actual variation HTML/CSS
 */
function renderComparisonTable(
  content: ComparisonMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('comparison-table', variationName);
  if (!variation) return '';

  // Build table headers
  const headers = content.comparisonTable.headers.map(h => `<th>${h}</th>`).join('');

  // Build table rows
  const rows = content.comparisonTable.rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('\n');

  let html = variation.html;

  // Replace table content
  html = html.replace(
    /<thead>[\s\S]*?<\/thead>/,
    `<thead><tr>${headers}</tr></thead>`
  );
  html = html.replace(
    /<tbody>[\s\S]*?<\/tbody>/,
    `<tbody>\n${rows}\n</tbody>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Quick Verdict using actual variation HTML/CSS
 */
function renderQuickVerdict(
  content: ComparisonMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('quick-verdict', variationName);
  if (!variation) return '';

  let html = variation.html;

  // Replace verdict text (in the first verdict option)
  html = html.replace(
    /<p class="scai-verdict-text">[^<]+<\/p>/,
    `<p class="scai-verdict-text">${content.quickVerdict}</p>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Requirements/Materials using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderRequirements(
  content: HowToMockupContent,
  variationName: BaseVariationName,
  customH2?: string
): string {
  const variation = getComponentVariation('requirements-box', variationName);
  if (!variation) return '';

  const items = content.materials.map(m =>
    `<li>${m.name}${m.optional ? ' (optional)' : ''}</li>`
  ).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the custom H2 from content (if provided)
  if (customH2) {
    html = html.replace(
      /<h2[^>]*class="scai-requirements-h2"[^>]*>[^<]*<\/h2>/,
      `<h2 class="scai-requirements-h2" data-component="scai-requirements-h2">${customH2}</h2>`
    );
  }

  // Replace requirements list
  html = html.replace(
    /<ul[^>]*class="scai-requirements-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-requirements-list" data-component="scai-requirements-list">\n${items}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Pro Tips using actual variation HTML/CSS
 */
function renderProTips(
  content: HowToMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('pro-tips', variationName);
  if (!variation) return '';

  const items = content.proTips.map(t => `<li>${t.tip}</li>`).join('\n');

  let html = variation.html;

  // Replace tips list
  html = html.replace(
    /<ol[^>]*class="scai-tips-list"[^>]*>[\s\S]*?<\/ol>/,
    `<ol class="scai-tips-list" data-component="scai-tips-list">\n${items}\n</ol>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Key Takeaways using actual variation HTML/CSS
 */
function renderKeyTakeaways(
  content: InformationalMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('key-takeaways', variationName);
  if (!variation) return '';

  const items = content.keyTakeaways.map(t => `<li>${t.text}</li>`).join('\n');

  let html = variation.html;

  // Replace takeaways list
  html = html.replace(
    /<ul[^>]*class="scai-takeaways-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-takeaways-list">\n${items}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Quick Facts using actual variation HTML/CSS
 * The component's built-in title serves as the section header (replaces default with content H2)
 */
function renderQuickFacts(
  content: InformationalMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('quick-facts', variationName);
  if (!variation) return '';

  const items = content.quickFacts.map(f => `<li>${f.label}: ${f.value}</li>`).join('\n');

  let html = variation.html;

  // Replace the built-in title (span) with an H2 containing the dynamic content
  const h2Text = content.quickFactsH2[titleFormat];
  html = html.replace(
    /<span[^>]*class="scai-facts-title"[^>]*>[^<]*<\/span>/,
    `<h2 class="scai-facts-title" data-component="scai-quick-facts-h2">${h2Text}</h2>`
  );

  // Replace facts list
  html = html.replace(
    /<ul[^>]*class="scai-facts-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-facts-list" data-component="scai-quick-facts-list">\n${items}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Honorable Mentions using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderHonorableMentions(
  content: ListicleMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('honorable-mentions', variationName);
  if (!variation) return '';

  const items = content.honorableMentions.map(m => `
<div class="scai-hm-item">
  <h3 class="scai-hm-h3">${m.title}</h3>
  <p class="scai-hm-paragraph">${m.description}</p>
</div>`).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content
  const h2Text = content.honorableMentionsH2[titleFormat];
  html = html.replace(
    /<h2[^>]*class="scai-hm-h2"[^>]*>[^<]*<\/h2>/,
    `<h2 class="scai-hm-h2" data-component="scai-hm-h2">${h2Text}</h2>`
  );

  // Replace mentions list
  html = html.replace(
    /<div class="scai-hm-list">[\s\S]*?<\/div>\s*<\/div>$/,
    `<div class="scai-hm-list">${items}</div></div>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Why Choose Local using actual variation HTML/CSS
 * Per structure-flows: Creates H2 (40-50 chars) + Image + List (40-60 words)
 */
function renderWhyLocal(
  content: LocalMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('why-choose-local', variationName);
  if (!variation) return '';

  const reasons = content.whyChooseLocal.reasons.map(r => `<li>${r}</li>`).join('\n');

  let html = variation.html;

  // Replace reasons list
  html = html.replace(
    /<ul[^>]*class="scai-local-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-local-list">\n${reasons}\n</ul>`
  );

  // Component creates its own H2 (40-50 chars per documentation)
  const h2Html = `<h2 class="scai-h2">${content.whyChooseLocal.title}</h2>`;

  // Add section image if available (last section image for why-choose-local)
  const sectionImg = content.sectionImages && content.sectionImages.length > 0
    ? content.sectionImages[content.sectionImages.length - 1]
    : null;
  const imgHtml = sectionImg
    ? `<figure class="scai-h2-image"><img src="${sectionImg.url}" alt="${sectionImg.alt}" loading="lazy" /></figure>`
    : '';

  return `<div class="scai-section">${h2Html}${imgHtml}<div class="scai-component">${html}</div></div>`;
}

/**
 * Render Service Info Box using actual variation HTML/CSS
 */
function renderServiceInfo(
  content: LocalMockupContent,
  variationName: BaseVariationName
): string {
  const variation = getComponentVariation('service-info-box', variationName);
  if (!variation) return '';

  const service = content.serviceInfo;
  let html = variation.html;

  // Replace service details - update the value spans
  html = html.replace(/Available 24\/7[^<]*/g, service.hours);
  html = html.replace(/Guaranteed arrival[^<]*/g, `Located at ${service.address}`);
  html = html.replace(/\$49 flat rate[^<]*/g, `Call ${service.phone}`);

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Ingredients using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderIngredients(
  content: RecipeMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('ingredients', variationName);
  if (!variation) return '';

  const items = content.ingredients.map(ing =>
    `<li>${ing.amount} ${ing.item}</li>`
  ).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content
  const h2Text = content.ingredientsH2[titleFormat];
  html = html.replace(
    /<h2[^>]*class="scai-ing-h2"[^>]*>[^<]*<\/h2>/,
    `<h2 class="scai-ing-h2" data-component="scai-ingredients-h2">${h2Text}</h2>`
  );

  // Replace ingredients list
  html = html.replace(
    /<ul[^>]*class="scai-ing-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-ing-list" data-component="scai-ingredients-list">\n${items}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Instructions using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderInstructions(
  content: RecipeMockupContent | HowToMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('instructions', variationName);
  if (!variation) return '';

  const steps = 'instructions' in content ? content.instructions : (content as HowToMockupContent).steps;
  const items = steps.map(step => `<li>${step.content}</li>`).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content (Recipe only has instructionsH2)
  const h2Text = 'instructionsH2' in content ? (content as RecipeMockupContent).instructionsH2[titleFormat] : 'Step-by-Step Instructions';
  html = html.replace(
    /<h2[^>]*class="scai-instructions-h2"[^>]*>[^<]*<\/h2>/,
    `<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">${h2Text}</h2>`
  );

  // Replace instructions list
  html = html.replace(
    /<ol[^>]*class="scai-instructions-list"[^>]*>[\s\S]*?<\/ol>/,
    `<ol class="scai-instructions-list" data-component="scai-instructions-list">\n${items}\n</ol>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Nutrition using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderNutrition(
  content: RecipeMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('nutrition-table', variationName);
  if (!variation) return '';

  const nutrition = content.nutrition;
  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content
  const h2Text = content.nutritionH2[titleFormat];
  html = html.replace(
    /<h2[^>]*class="scai-nutr-h2"[^>]*>[^<]*<\/h2>/,
    `<h2 class="scai-nutr-h2" data-component="scai-nutrition-h2">${h2Text}</h2>`
  );

  // Update nutrition values in table
  html = html.replace(/<td>Calories<\/td><td>\d+<\/td>/, `<td>Calories</td><td>${nutrition.calories}</td>`);
  html = html.replace(/<td>Total Fat<\/td><td>[^<]+<\/td>/, `<td>Total Fat</td><td>${nutrition.fat}</td>`);
  html = html.replace(/<td>Carbohydrates<\/td><td>[^<]+<\/td>/, `<td>Carbohydrates</td><td>${nutrition.carbs}</td>`);
  html = html.replace(/<td>Protein<\/td><td>[^<]+<\/td>/, `<td>Protein</td><td>${nutrition.protein}</td>`);

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Pros and Cons using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderProsCons(
  content: ReviewMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('pros-cons', variationName);
  if (!variation) return '';

  const prosItems = content.prosCons.pros.map(p => `<li>${p}</li>`).join('\n');
  const consItems = content.prosCons.cons.map(c => `<li>${c}</li>`).join('\n');

  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content
  // Note: Some variations use class="scai-pc-h2", others use class="scai-pc-title"
  const h2Text = content.prosConsH2[titleFormat];
  html = html.replace(
    /<h2[^>]*class="scai-pc-(h2|title)"[^>]*>[^<]*<\/h2>/,
    `<h2 class="scai-pc-h2" data-component="scai-pros-cons-h2">${h2Text}</h2>`
  );

  // Replace pros list
  html = html.replace(
    /<ul[^>]*data-component="scai-pros-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-pc-list" data-component="scai-pros-list">\n${prosItems}\n</ul>`
  );

  // Replace cons list
  html = html.replace(
    /<ul[^>]*data-component="scai-cons-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-pc-list" data-component="scai-cons-list">\n${consItems}\n</ul>`
  );

  return `<div class="scai-component">${html}</div>`;
}

/**
 * Render Rating using actual variation HTML/CSS
 * The component's built-in H2 serves as the section header (replaces default with content H2)
 */
function renderRating(
  content: ReviewMockupContent,
  variationName: BaseVariationName,
  titleFormat: TitleFormat
): string {
  const variation = getComponentVariation('rating', variationName);
  if (!variation) return '';

  const rating = content.rating;
  let html = variation.html;

  // Replace the built-in H2 header with the dynamic H2 from content
  // Some variations use <h2 class="scai-rt-h2">, some don't have an H2 at all
  const h2Text = content.ratingH2[titleFormat];
  const hasH2 = /<h2[^>]*class="scai-rt-h2"[^>]*>[^<]*<\/h2>/.test(html);

  if (hasH2) {
    // Replace existing H2
    html = html.replace(
      /<h2[^>]*class="scai-rt-h2"[^>]*>[^<]*<\/h2>/,
      `<h2 class="scai-rt-h2" data-component="scai-rating-h2">${h2Text}</h2>`
    );
  } else {
    // For variations without H2, add one at the beginning (after the opening div)
    html = html.replace(
      /(<div[^>]*data-component="scai-rating-section"[^>]*>)\n/,
      `$1\n<h2 class="scai-rt-h2" data-component="scai-rating-h2">${h2Text}</h2>\n`
    );
  }

  // Replace score
  html = html.replace(
    /data-component="scai-rating-score">[^<]+</,
    `data-component="scai-rating-score">${rating.score}<`
  );

  // Replace rating paragraph
  html = html.replace(
    /data-component="scai-rating-paragraph">[^<]+</,
    `data-component="scai-rating-paragraph">${rating.summary}<`
  );

  return `<div class="scai-component">${html}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete article mockup
 */
export function generateMockup(options: MockupGeneratorOptions): GeneratedMockup {
  const {
    articleType,
    content,
    variationName,
    titleFormat = 'statement'
  } = options;

  const theme = getVariationTheme(variationName);
  const flow = STRUCTURE_FLOWS[articleType] || [];
  const h2s = content.h2s[titleFormat];
  const closingH2 = content.closingH2[titleFormat];

  const htmlParts: string[] = [];
  const usedComponentTypes: string[] = [];
  let h2Index = 0;
  let paragraphIndex = 0;
  let imageIndex = 0;
  let productIndex = 0;

  // Start article container
  htmlParts.push('<article class="scai-article">');

  // Process each section in the structure flow
  // Section names must match those in structure-flows.ts exactly
  for (const section of flow) {
    switch (section) {
      // ═══════════════════════════════════════════════════════════════════════════════
      // CORE STRUCTURE ELEMENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'h1':
        htmlParts.push(renderH1(content, titleFormat));
        break;

      case 'featured-image':
        htmlParts.push(renderFeaturedImage(content));
        break;

      case 'overview-paragraph':
        htmlParts.push(renderParagraph(content.overviewParagraph));
        break;

      case 'toc':
        htmlParts.push(renderToc(content, variationName, titleFormat));
        usedComponentTypes.push('toc');
        break;

      case 'h2':
        if (h2Index < h2s.length) {
          htmlParts.push(renderH2(h2s[h2Index]));
          h2Index++;
        }
        break;

      case 'h2-image':
        if (imageIndex < content.sectionImages.length) {
          htmlParts.push(renderSectionImage(content.sectionImages[imageIndex]));
          imageIndex++;
        }
        break;

      case 'standard-paragraph':
        if (paragraphIndex < content.standardParagraphs.length) {
          htmlParts.push(renderParagraph(content.standardParagraphs[paragraphIndex]));
          paragraphIndex++;
        }
        break;

      case 'topic-overview':
        // Topic overview for comparison articles - uses next paragraph
        if (paragraphIndex < content.standardParagraphs.length) {
          htmlParts.push(renderParagraph(content.standardParagraphs[paragraphIndex]));
          paragraphIndex++;
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // FAQ SECTION ELEMENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'faq-h2':
        // Render the FAQ H2 heading AND the full FAQ component
        // The faq-h3 and faq-answer entries in structure-flows are just documentation
        htmlParts.push(renderFaq(content, variationName));
        usedComponentTypes.push('faq');
        break;

      case 'faq-h3':
      case 'faq-answer':
        // These are handled by the FAQ component in faq-h2 case above
        // They exist in structure-flows for documentation purposes only
        break;

      case 'faq':
        htmlParts.push(renderFaq(content, variationName));
        usedComponentTypes.push('faq');
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // CLOSING SECTION ELEMENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'closing-h2':
        htmlParts.push(renderH2(closingH2));
        break;

      case 'closing-paragraph':
        htmlParts.push(renderParagraph(content.closingParagraph));
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // AFFILIATE COMPONENTS
      // Per structure-flows: Each product-card outputs H2 + Card + H2 Image + 150-word description
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'product-card':
        if (articleType === 'affiliate') {
          const affiliateContent = content as AffiliateMockupContent;
          if (productIndex < affiliateContent.products.length) {
            const product = affiliateContent.products[productIndex];

            // 1. H2 with product name and badge
            htmlParts.push(renderH2(`${product.badge}: ${product.name}`));

            // 2. Product card component
            htmlParts.push(renderProductCard(product, variationName));
            usedComponentTypes.push('product-card');

            // 3. H2 Image (optional) - use sectionImages if available
            if (affiliateContent.sectionImages && affiliateContent.sectionImages[productIndex]) {
              htmlParts.push(renderSectionImage(affiliateContent.sectionImages[productIndex]));
            }

            // 4. 150-word description paragraph (from standardParagraphs)
            if (affiliateContent.standardParagraphs && affiliateContent.standardParagraphs[productIndex]) {
              htmlParts.push(renderParagraph(affiliateContent.standardParagraphs[productIndex]));
            }

            productIndex++;
          }
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // COMMERCIAL COMPONENTS
      // The feature-list component has a built-in H2 that replaces the separate H2
      // So we grab the next H2 from content and inject it into the component's header
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'feature-list':
        if (articleType === 'commercial' || articleType === 'review') {
          // Get the next H2 from content and inject it into the component's built-in header
          // Then increment h2Index so subsequent H2s are used correctly
          const featureH2 = h2Index < h2s.length ? h2s[h2Index] : undefined;
          htmlParts.push(renderFeatureList(content as CommercialMockupContent | ReviewMockupContent, variationName, featureH2));
          usedComponentTypes.push('feature-list');
          h2Index++; // Consume this H2 since it's now part of the component
        }
        break;

      case 'cta-box':
        if (articleType === 'commercial') {
          htmlParts.push(renderCtaBox(content as CommercialMockupContent, variationName));
          usedComponentTypes.push('cta-box');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // COMPARISON COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'comparison-table':
        if (articleType === 'comparison') {
          htmlParts.push(renderComparisonTable(content as ComparisonMockupContent, variationName));
          usedComponentTypes.push('comparison-table');
        }
        break;

      case 'quick-verdict':
        if (articleType === 'comparison') {
          htmlParts.push(renderQuickVerdict(content as ComparisonMockupContent, variationName));
          usedComponentTypes.push('quick-verdict');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // HOW-TO COMPONENTS
      // The requirements-box component has a built-in H2 that replaces the separate H2
      // So we grab the next H2 from content and inject it into the component's header
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'materials-box':
      case 'requirements-box':
        if (articleType === 'how-to') {
          // Get the next H2 from content and inject it into the component's built-in header
          // Then increment h2Index so subsequent H2s are used correctly
          const requirementsH2 = h2Index < h2s.length ? h2s[h2Index] : undefined;
          htmlParts.push(renderRequirements(content as HowToMockupContent, variationName, requirementsH2));
          usedComponentTypes.push('requirements-box');
          h2Index++; // Consume this H2 since it's now part of the component
        }
        break;

      case 'pro-tips':
        if (articleType === 'how-to') {
          htmlParts.push(renderProTips(content as HowToMockupContent, variationName));
          usedComponentTypes.push('pro-tips');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // INFORMATIONAL COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'key-takeaways':
        if (articleType === 'informational' || articleType === 'review') {
          htmlParts.push(renderKeyTakeaways(content as InformationalMockupContent, variationName));
          usedComponentTypes.push('key-takeaways');
        }
        break;

      case 'quick-facts':
        if (articleType === 'informational') {
          htmlParts.push(renderQuickFacts(content as InformationalMockupContent, variationName, titleFormat));
          usedComponentTypes.push('quick-facts');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // LISTICLE COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'honorable-mentions':
        if (articleType === 'listicle') {
          htmlParts.push(renderHonorableMentions(content as ListicleMockupContent, variationName, titleFormat));
          usedComponentTypes.push('honorable-mentions');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // LOCAL COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'why-choose-local':
        if (articleType === 'local') {
          htmlParts.push(renderWhyLocal(content as LocalMockupContent, variationName));
          usedComponentTypes.push('why-choose-local');
        }
        break;

      case 'service-info':
        if (articleType === 'local') {
          htmlParts.push(renderServiceInfo(content as LocalMockupContent, variationName));
          usedComponentTypes.push('service-info-box');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // RECIPE COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'ingredients':
        if (articleType === 'recipe') {
          htmlParts.push(renderIngredients(content as RecipeMockupContent, variationName, titleFormat));
          usedComponentTypes.push('ingredients');
        }
        break;

      case 'instructions':
        if (articleType === 'recipe') {
          htmlParts.push(renderInstructions(content as RecipeMockupContent, variationName, titleFormat));
          usedComponentTypes.push('instructions');
        }
        break;

      case 'nutrition-table':
        if (articleType === 'recipe') {
          htmlParts.push(renderNutrition(content as RecipeMockupContent, variationName, titleFormat));
          usedComponentTypes.push('nutrition-table');
        }
        break;

      case 'tips-paragraph':
        // Recipe tips - just a paragraph
        if (paragraphIndex < content.standardParagraphs.length) {
          htmlParts.push(renderParagraph(content.standardParagraphs[paragraphIndex]));
          paragraphIndex++;
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // REVIEW COMPONENTS
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'pros-cons':
        if (articleType === 'review') {
          htmlParts.push(renderProsCons(content as ReviewMockupContent, variationName, titleFormat));
          usedComponentTypes.push('pros-cons');
        }
        break;

      case 'rating-paragraph':
        if (articleType === 'review') {
          htmlParts.push(renderRating(content as ReviewMockupContent, variationName, titleFormat));
          usedComponentTypes.push('rating');
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // LEGACY/FALLBACK CASES (for backwards compatibility)
      // ═══════════════════════════════════════════════════════════════════════════════
      case 'title':
        htmlParts.push(renderH1(content, titleFormat));
        break;

      case 'overview':
        htmlParts.push(renderParagraph(content.overviewParagraph));
        break;

      case 'paragraph':
        if (paragraphIndex < content.standardParagraphs.length) {
          htmlParts.push(renderParagraph(content.standardParagraphs[paragraphIndex]));
          paragraphIndex++;
        }
        break;

      case 'image':
        if (imageIndex < content.sectionImages.length) {
          htmlParts.push(renderSectionImage(content.sectionImages[imageIndex]));
          imageIndex++;
        }
        break;

      case 'closing':
        htmlParts.push(renderH2(closingH2));
        htmlParts.push(renderParagraph(content.closingParagraph));
        break;

      case 'requirements':
      case 'materials':
        if (articleType === 'how-to') {
          htmlParts.push(renderRequirements(content as HowToMockupContent, variationName));
          usedComponentTypes.push('requirements-box');
        }
        break;

      case 'steps':
        if (articleType === 'how-to') {
          htmlParts.push(renderInstructions(content as HowToMockupContent, variationName, titleFormat));
          usedComponentTypes.push('instructions');
        }
        break;

      case 'nutrition':
        if (articleType === 'recipe') {
          htmlParts.push(renderNutrition(content as RecipeMockupContent, variationName, titleFormat));
          usedComponentTypes.push('nutrition');
        }
        break;

      case 'rating':
        if (articleType === 'review') {
          htmlParts.push(renderRating(content as ReviewMockupContent, variationName, titleFormat));
          usedComponentTypes.push('rating');
        }
        break;

      case 'why-local':
        if (articleType === 'local') {
          htmlParts.push(renderWhyLocal(content as LocalMockupContent, variationName));
          usedComponentTypes.push('why-choose-local');
        }
        break;
    }
  }

  // Close article container
  htmlParts.push('</article>');

  const html = htmlParts.join('\n');

  // Collect CSS from all used components
  const componentCss = collectComponentCss(usedComponentTypes, variationName);

  // Build complete CSS
  const css = `/* Generated Mockup CSS */
${BASE_ARTICLE_STYLES}

${getThemeStyles(variationName)}

/* Component Styles from variations.ts */
${componentCss}`;

  // Count words
  const textContent = html.replace(/<[^>]*>/g, ' ');
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  return {
    html,
    css,
    articleType,
    variationName,
    titleFormat,
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount,
      componentCount: usedComponentTypes.length,
      theme,
    },
  };
}

/**
 * Get mockup content for rendering
 * This is a convenience export
 */
export function getMockupContent(mockup: GeneratedMockup) {
  return {
    html: mockup.html,
    css: mockup.css,
  };
}

/**
 * Export variation order for UI
 */
export { VARIATION_ORDER } from './variation-themes';
