/**
 * Template Hydrator
 * 
 * Bridges AI-generated text content with HTML/CSS templates from variations.ts
 * 
 * Key principle: AI generates TEXT ONLY, this service injects it into component templates
 * from COMPONENT_VARIATIONS, preserving exact HTML/CSS from the 18 design variations.
 */

import { COMPONENT_VARIATIONS, type ComponentVariation } from '@/data/variations';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: ESCAPE REGEX REPLACEMENT SPECIAL CHARS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escapes special characters in regex replacement strings.
 * Prevents $ signs (like "$25") from being interpreted as backreferences.
 * @param text - Text to escape
 * @returns Escaped text safe for use in String.replace()
 */
function escapeReplacement(text: string): string {
  return text.replace(/\$/g, '$$$$'); // $$ becomes literal $
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BaseVariationName =
  | 'Clean Studio'
  | 'Neo-Brutalist'
  | 'Glass Frost'
  | 'Dark Elegance'
  | 'Swiss Grid'
  | 'Eco Paper'
  | 'Heavy Industrial'
  | 'Airy Premium'
  | 'Cyber Dark'
  | 'Gradient Glow'
  | 'Minimal Outline'
  | 'Technical Grid'
  | 'Soft Stone'
  | 'Editorial Serif'
  | 'Corporate Pro'
  | 'Polaroid Frame'
  | 'Wired Dashed'
  | 'Pill Pop';

export const ALL_VARIATIONS: BaseVariationName[] = [
  'Clean Studio',
  'Neo-Brutalist',
  'Glass Frost',
  'Dark Elegance',
  'Swiss Grid',
  'Eco Paper',
  'Heavy Industrial',
  'Airy Premium',
  'Cyber Dark',
  'Gradient Glow',
  'Minimal Outline',
  'Technical Grid',
  'Soft Stone',
  'Editorial Serif',
  'Corporate Pro',
  'Polaroid Frame',
  'Wired Dashed',
  'Pill Pop',
];

export interface HydratedComponent {
  html: string;
  css: string;
}

// Content types for hydration
export interface TocContent {
  items: Array<{ href: string; text: string }>;
}

export interface FaqContent {
  items: Array<{ question: string; answer: string }>;
}

export interface ProductCardContent {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  ctaUrl: string;
  badge?: string;
}

export interface FeatureListContent {
  h2?: string; // AI-generated H2
  features: Array<{ title: string; description: string }>;
}

export interface ProsConsContent {
  h2?: string; // AI-generated H2
  pros: string[];
  cons: string[];
}

export interface IngredientsContent {
  h2?: string; // AI-generated H2
  items: Array<{ amount: string; item: string }>;
}

export interface InstructionsContent {
  h2?: string; // AI-generated H2
  steps: Array<{ stepNumber: number; content: string }>;
}

export interface KeyTakeawaysContent {
  h2?: string; // AI-generated H2
  items: string[];
}

export interface QuickFactsContent {
  h2?: string; // AI-generated H2
  facts: Array<{ label: string; value: string }>;
}

export interface ComparisonTableContent {
  h2?: string; // AI-generated H2
  /** Schema-based: itemNames tuple and criteria array */
  itemNames?: [string, string];
  criteria?: Array<{ name: string; valueA: string; valueB: string }>;
  /** Legacy: direct headers and rows */
  headers?: string[];
  rows?: string[][];
}

export interface QuickVerdictContent {
  /** AI-generated H2 */
  h2?: string;
  /** Item names being compared */
  itemNames?: string[];
  /** Schema-based: chooseA and chooseB */
  chooseA?: string;
  chooseB?: string;
  /** Legacy: single verdict string */
  verdict?: string;
}

export interface RequirementsContent {
  h2?: string; // AI-generated H2
  items: Array<{ name: string; optional?: boolean }>;
}

export interface ProTipsContent {
  h2?: string; // AI-generated H2
  tips: string[];
}

export interface RatingContent {
  h2?: string; // AI-generated H2
  score: string; // Score display (e.g., "8.5")
  title: string; // Rating label (e.g., "Excellent")
  summary: string; // Rating justification paragraph
}

export interface CtaBoxContent {
  title: string;
  text: string;
  buttonText: string;
  buttonUrl?: string;
}

export interface ServiceInfoContent {
  h2?: string; // AI-generated H2
  businessName?: string;
  hours?: string;
  address?: string;
  phone?: string;
  website?: string;
  additional?: string;
  // For row-based content generation
  rows?: Array<{ label: string; value: string }>;
}

export interface WhyLocalContent {
  title?: string;
  h2?: string;  // Schema uses h2, content uses title - support both
  reasons: string[];
  imageUrl?: string;  // Optional placeholder URL for dynamic image generation
}

export interface HonorableMentionsContent {
  h2?: string; // AI-generated H2
  items: Array<{ h3: string; description: string }>;
}

export interface NutritionContent {
  h2?: string; // AI-generated H2 (max 40 chars per reference spec)
  calories: number;
  fat: string;
  carbs: string;
  protein: string;
  disclaimer?: string; // Required disclaimer per reference spec
}

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE FORMAT TYPE (for format-specific H2s)
// ═══════════════════════════════════════════════════════════════════════════════

export type TitleFormat = 'question' | 'statement' | 'listicle';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT H2 VARIATIONS (matches mockup system TitleVariations)
// These H2s are used inside components and follow the same format rules as H1
// Component H2s are NEVER numbered (even for listicle) - they're structural, not list items
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_H2_VARIATIONS: Record<string, Record<TitleFormat, string>> = {
  'pros-cons': {
    question: 'What Are the Pros and Cons?',
    statement: 'Pros and Cons Breakdown',
    listicle: 'Advantages and Drawbacks',
  },
  'rating': {
    question: 'What Is Our Final Score?',
    statement: 'Final Rating Score',
    listicle: 'Our Final Verdict',
  },
  'ingredients': {
    question: 'What Ingredients Do You Need?',
    statement: 'Required Ingredients',
    listicle: 'Ingredients for This Recipe',
  },
  'instructions': {
    question: 'How Do You Make This?',
    statement: 'Step-by-Step Instructions',
    listicle: 'Instructions to Follow',
  },
  'nutrition': {
    question: 'What Are the Nutritional Facts?',
    statement: 'Nutritional Information',
    listicle: 'Nutrition Facts Breakdown',
  },
  'quick-facts': {
    question: 'What Key Facts Should You Know?',
    statement: 'Essential Facts to Know',
    listicle: 'Key Facts at a Glance',
  },
  'honorable-mentions': {
    question: 'What Other Options Are Worth Noting?',
    statement: 'Honorable Mentions to Consider',
    listicle: 'Other Notable Options',
  },
  'why-local': {
    question: 'Why Choose a Local Provider?',
    statement: 'Why Choose Local',
    listicle: 'Reasons to Choose Local',
  },
  'feature-list': {
    question: 'What Features Does This Offer?',
    statement: 'Key Features Overview',
    listicle: 'Top Features Included',
  },
};

/**
 * Get the format-specific H2 for a component type
 * Returns the H2 text matching the current title format (question/statement/listicle)
 */
export function getComponentH2(
  componentType: string,
  titleFormat: TitleFormat
): string {
  const variations = COMPONENT_H2_VARIATIONS[componentType];
  if (!variations) {
    console.warn(`No H2 variations found for component "${componentType}"`);
    return ''; // Return empty, let the template's default H2 be used
  }
  return variations[titleFormat];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get component HTML/CSS from variations.ts
 * Returns the exact HTML and CSS for a specific component type and variation
 */
export function getComponentVariation(
  componentType: string,
  variationName: BaseVariationName
): ComponentVariation | null {
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

  return variation;
}

/**
 * Get a random variation using seeded randomness (consistent per seed)
 */
export function getRandomVariation(seed?: string): BaseVariationName {
  if (!seed) {
    return ALL_VARIATIONS[Math.floor(Math.random() * ALL_VARIATIONS.length)];
  }

  // Simple hash function for seeded randomness
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % ALL_VARIATIONS.length;
  return ALL_VARIATIONS[index];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base hydration function - gets component template and returns it with CSS
 * Specific hydrators will extend this with content replacement logic
 */
export function hydrateComponent(
  componentType: string,
  variationName: BaseVariationName
): HydratedComponent | null {
  const variation = getComponentVariation(componentType, variationName);
  if (!variation) return null;

  return {
    html: variation.html,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateToc(
  variationName: BaseVariationName,
  content: TocContent
): HydratedComponent | null {
  const variation = getComponentVariation('toc', variationName);
  if (!variation) return null;

  // Build TOC items
  const tocItems = content.items.map(item =>
    `<li><a href="${item.href}">${item.text}</a></li>`
  ).join('\n');

  // Replace the sample TOC list in the template with actual content
  let html = variation.html;
  html = html.replace(
    /<ul[^>]*class="scai-toc-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-toc-list">\n${tocItems}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateFaq(
  variationName: BaseVariationName,
  content: FaqContent
): HydratedComponent | null {
  const variation = getComponentVariation('faq', variationName);
  if (!variation) return null;

  // Build FAQ items from content
  const faqItems = content.items.map(faq => `
<div class="scai-faq-item">
  <h3 class="scai-faq-h3">${faq.question}</h3>
  <p class="scai-faq-answer">${faq.answer}</p>
</div>`).join('\n');

  // Replace the sample FAQ items in the template
  let html = variation.html;

  // Find the FAQ items section and replace
  const faqItemsMatch = html.match(/<div class="scai-faq-item">[\s\S]*?<\/div>\s*(?:<div class="scai-faq-item">[\s\S]*?<\/div>\s*)*/);
  if (faqItemsMatch) {
    html = html.replace(faqItemsMatch[0], faqItems);
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CARD HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateProductCard(
  variationName: BaseVariationName,
  content: ProductCardContent
): HydratedComponent | null {
  const variation = getComponentVariation('product-card', variationName);
  if (!variation) return null;

  let html = variation.html;

  // Replace product name
  html = html.replace(
    /data-component="scai-product-card-name">[^<]+</,
    `data-component="scai-product-card-name">${content.name}<`
  );

  // Replace product description
  html = html.replace(
    /<p class="scai-pc-desc">[^<]+<\/p>/,
    `<p class="scai-pc-desc">${content.description}</p>`
  );

  // Replace price
  html = html.replace(
    /\$\d+\.\d{2}/,
    content.price
  );

  // Replace image
  html = html.replace(
    /src="[^"]+"/,
    `src="${content.imageUrl}"`
  );

  // Replace CTA links
  html = html.replace(
    /href="#"/g,
    `href="${content.ctaUrl}"`
  );

  // Replace badge text (contextual badge like "Best Value", "Best Overall", etc.)
  if (content.badge) {
    html = html.replace(
      /<span class="scai-pc-badge">(?:\{\{BADGE\}\}|[^<]*)<\/span>/,
      `<span class="scai-pc-badge">${content.badge}</span>`
    );
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE LIST HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateFeatureList(
  variationName: BaseVariationName,
  content: FeatureListContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('feature-list', variationName);
  if (!variation) return null;

  const featureItems = content.features.map(f =>
    `<li>${f.title}: ${f.description}</li>`
  ).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('feature-list', titleFormat) : null);
  if (h2Text) {
    // Only replace the text content inside the H2, preserving the original tag and classes
    html = html.replace(
      /(<h2[^>]*class="[^"]*scai-(fl-h2|feature-h2)[^"]*"[^>]*>)[^<]*(<\/h2>)/,
      `$1${h2Text}$3`
    );
  }

  // Replace feature list items
  html = html.replace(
    /<ul[^>]*class="scai-feature-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-feature-list" data-component="scai-feature-list">\n${featureItems}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROS/CONS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateProsCons(
  variationName: BaseVariationName,
  content: ProsConsContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('pros-cons', variationName);
  if (!variation) return null;

  const prosItems = content.pros.map(p => `<li>${p}</li>`).join('\n');
  const consItems = content.cons.map(c => `<li>${c}</li>`).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('pros-cons', titleFormat) : null);
  if (h2Text) {
    // Only replace the text content inside the H2, preserving the original tag and classes
    html = html.replace(
      /(<h2[^>]*class="[^"]*scai-pc-(h2|title)[^"]*"[^>]*>)[^<]*(<\/h2>)/,
      `$1${h2Text}$3`
    );
  }

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

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INGREDIENTS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateIngredients(
  variationName: BaseVariationName,
  content: IngredientsContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('ingredients', variationName);
  if (!variation) return null;

  const items = content.items.map(ing =>
    `<li>${ing.amount} ${ing.item}</li>`
  ).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('ingredients', titleFormat) : null);
  if (h2Text) {
    // Variations use h2.scai-ing-h2
    html = html.replace(
      /(<h2[^>]*class="scai-ing-h2"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    console.log('[hydrateIngredients] Replaced h2 with:', h2Text);
  }

  // Replace ingredients list
  html = html.replace(
    /<ul[^>]*class="scai-ing-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-ing-list" data-component="scai-ingredients-list">\n${items}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateInstructions(
  variationName: BaseVariationName,
  content: InstructionsContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('instructions', variationName);
  if (!variation) return null;

  const items = content.steps.map(step => `<li>${step.content}</li>`).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('instructions', titleFormat) : null);
  if (h2Text) {
    // Variations use h2.scai-instructions-h2
    html = html.replace(
      /(<h2[^>]*class="scai-instructions-h2"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    console.log('[hydrateInstructions] Replaced h2 with:', h2Text);
  }

  // Replace instructions list
  html = html.replace(
    /<ol[^>]*class="scai-instructions-list"[^>]*>[\s\S]*?<\/ol>/,
    `<ol class="scai-instructions-list" data-component="scai-instructions-list">\n${items}\n</ol>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateKeyTakeaways(
  variationName: BaseVariationName,
  content: KeyTakeawaysContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('key-takeaways', variationName);
  if (!variation) return null;

  const items = content.items.map(t => `<li>${t}</li>`).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('key-takeaways', titleFormat) : null);
  if (h2Text) {
    // Replace the text content inside the title element (div/span with class scai-takeaways-title)
    html = html.replace(
      /(<(?:div|span|h2)[^>]*class="[^"]*scai-takeaways-title[^"]*"[^>]*>)[^<]*(<\/(?:div|span|h2)>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
  }

  // Replace takeaways list
  html = html.replace(
    /<ul[^>]*class="scai-takeaways-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-takeaways-list">\n${items}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK FACTS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateQuickFacts(
  variationName: BaseVariationName,
  content: QuickFactsContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('quick-facts', variationName);
  if (!variation) return null;

  const items = content.facts.map(f => `<li>${f.label}: ${f.value}</li>`).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('quick-facts', titleFormat) : null);
  if (h2Text) {
    // Replace the text content inside the title element (span/div with class scai-facts-title)
    html = html.replace(
      /(<(?:span|div|h2)[^>]*class="[^"]*scai-facts-title[^"]*"[^>]*>)[^<]*(<\/(?:span|div|h2)>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
  }

  // Replace facts list
  html = html.replace(
    /<ul[^>]*class="scai-facts-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-facts-list" data-component="scai-quick-facts-list">\n${items}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateComparisonTable(
  variationName: BaseVariationName,
  content: ComparisonTableContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('comparison-table', variationName);
  if (!variation) {
    console.warn(`[hydrateComparisonTable] No variation found for: ${variationName}`);
    return null;
  }

  let headers: string[];
  let rows: string[][];

  // Transform schema-based format to legacy format
  if (content.itemNames && content.criteria) {
    // Schema format: { itemNames: [A, B], criteria: [{name, valueA, valueB}...] }
    headers = ['Feature', content.itemNames[0], content.itemNames[1]];
    rows = content.criteria.map(c => [c.name, c.valueA, c.valueB]);
  } else if (content.headers && content.rows) {
    // Legacy format: { headers: [], rows: [[]] }
    headers = content.headers;
    rows = content.rows;
  } else {
    console.warn('[hydrateComparisonTable] Invalid content format:', content);
    return null;
  }

  // Build table headers HTML
  const headersHtml = headers.map(h => `<th>${h}</th>`).join('');

  // Build table rows HTML
  const rowsHtml = rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('\n');

  let html = variation.html;

  // Use AI-generated title if provided
  if (content.h2) {
    // Replace the text content inside the title element (templates use h3 with scai-comp-title)
    html = html.replace(
      /(<h[23][^>]*class="[^"]*scai-comp-title[^"]*"[^>]*>)[^<]*(<\/h[23]>)/,
      `$1${content.h2}$2`
    );
  }

  // Replace table content
  html = html.replace(
    /<thead>[\s\S]*?<\/thead>/,
    `<thead><tr>${headersHtml}</tr></thead>`
  );
  html = html.replace(
    /<tbody>[\s\S]*?<\/tbody>/,
    `<tbody>\n${rowsHtml}\n</tbody>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK VERDICT HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateQuickVerdict(
  variationName: BaseVariationName,
  content: QuickVerdictContent
): HydratedComponent | null {
  const variation = getComponentVariation('quick-verdict', variationName);
  if (!variation) {
    console.warn(`[hydrateQuickVerdict] No variation found for: ${variationName}`);
    return null;
  }

  let html = variation.html;

  // Use AI-generated title if provided
  if (content.h2) {
    // Replace the text content inside the verdict title element (templates use div with scai-verdict-title)
    html = html.replace(
      /(<(?:div|h[2-4])[^>]*class="[^"]*scai-verdict-title[^"]*"[^>]*>)[^<]*(<\/(?:div|h[2-4])>)/,
      `$1${content.h2}$2`
    );
  }

  // Handle schema-based format: { chooseA, chooseB, itemNames }
  if (content.chooseA && content.chooseB) {
    // Replace item names in labels if provided
    if (content.itemNames && content.itemNames.length === 2) {
      // Replace generic "Product A" / "Product B" labels with actual item names
      html = html.replace(
        /<div class="scai-verdict-label">Choose Product A<\/div>/gi,
        `<div class="scai-verdict-label">Choose ${content.itemNames[0]}</div>`
      );
      html = html.replace(
        /<div class="scai-verdict-label">Choose Product B<\/div>/gi,
        `<div class="scai-verdict-label">Choose ${content.itemNames[1]}</div>`
      );
      // Also handle variations like "PRODUCT A" in different variations
      html = html.replace(
        /<div class="scai-verdict-label">PRODUCT A<\/div>/gi,
        `<div class="scai-verdict-label">${content.itemNames[0].toUpperCase()}</div>`
      );
      html = html.replace(
        /<div class="scai-verdict-label">PRODUCT B<\/div>/gi,
        `<div class="scai-verdict-label">${content.itemNames[1].toUpperCase()}</div>`
      );
    }

    // Find the two verdict-text elements and replace them
    // The variation HTML has two verdict options with scai-verdict-text elements
    const verdictTextRegex = /<p class="scai-verdict-text">[^<]*<\/p>/g;
    const matches = html.match(verdictTextRegex);

    if (matches && matches.length >= 2) {
      // Replace first verdict text (Product A)
      html = html.replace(matches[0], `<p class="scai-verdict-text">${content.chooseA}</p>`);
      // Replace second verdict text (Product B)
      html = html.replace(matches[1], `<p class="scai-verdict-text">${content.chooseB}</p>`);
    } else {
      // Fallback: replace all verdict text elements with combined text
      html = html.replace(
        verdictTextRegex,
        `<p class="scai-verdict-text">${content.chooseA}</p>`
      );
    }
  } else if (content.verdict) {
    // Legacy format: single verdict string
    html = html.replace(
      /<p class="scai-verdict-text">[^<]*<\/p>/g,
      `<p class="scai-verdict-text">${content.verdict}</p>`
    );
  } else {
    console.warn('[hydrateQuickVerdict] Invalid content format:', content);
    return null;
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}
// ═══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateRequirements(
  variationName: BaseVariationName,
  content: RequirementsContent
): HydratedComponent | null {
  const variation = getComponentVariation('requirements-box', variationName);
  if (!variation) return null;

  const items = content.items.map(m =>
    `<li>${m.name}${m.optional ? ' (optional)' : ''}</li>`
  ).join('\n');

  let html = variation.html;

  // Replace heading text if AI-generated h2 provided
  if (content.h2) {
    html = html.replace(
      /(<h2[^>]*class="[^"]*scai-requirements-h2[^"]*"[^>]*>)[^<]*(<\/h2>)/,
      `$1${content.h2}$2`
    );
  }

  // Replace requirements list
  html = html.replace(
    /<ul[^>]*class="scai-requirements-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-requirements-list" data-component="scai-requirements-list">\n${items}\n</ul>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRO TIPS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateProTips(
  variationName: BaseVariationName,
  content: ProTipsContent
): HydratedComponent | null {
  const variation = getComponentVariation('pro-tips', variationName);
  if (!variation) return null;

  const items = content.tips.map(t => `<li>${t}</li>`).join('\n');

  let html = variation.html;

  // Replace heading text if AI-generated h2 provided
  if (content.h2) {
    html = html.replace(
      /(<h2[^>]*class="[^"]*scai-tips-h2[^"]*"[^>]*>)[^<]*(<\/h2>)/,
      `$1${content.h2}$2`
    );
  }

  // Replace tips list
  html = html.replace(
    /<ol[^>]*class="scai-tips-list"[^>]*>[\s\S]*?<\/ol>/,
    `<ol class="scai-tips-list" data-component="scai-tips-list">\n${items}\n</ol>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATING HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateRating(
  variationName: BaseVariationName,
  content: RatingContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('rating', variationName);
  if (!variation) return null;

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('rating', titleFormat) : null);
  if (h2Text) {
    // Only replace the text content inside the H2, preserving the original tag and classes
    const hasH2 = /<h2[^>]*class="[^"]*scai-rt-h2[^"]*"[^>]*>[^<]*<\/h2>/.test(html);
    if (hasH2) {
      html = html.replace(
        /(<h2[^>]*class="[^"]*scai-rt-h2[^"]*"[^>]*>)[^<]*(<\/h2>)/,
        `$1${escapeReplacement(h2Text)}$2`
      );
    } else {
      // For variations without H2, add one after the opening rating div
      html = html.replace(
        /(<div[^>]*data-component="scai-rating-section"[^>]*>)\n/,
        `$1\n<h2 class="scai-rt-h2" data-component="scai-rating-h2">${escapeReplacement(h2Text)}</h2>\n`
      );
    }
  }

  // Replace score
  html = html.replace(
    /data-component="scai-rating-score">[^<]+</,
    `data-component="scai-rating-score">${content.score}<`
  );
  console.log('[hydrateRating] Replaced score with:', content.score);

  // Replace title (e.g., "Excellent")
  if (content.title) {
    html = html.replace(
      /(<h3[^>]*class="scai-rt-title"[^>]*>)[^<]*(<\/h3>)/,
      `$1${escapeReplacement(content.title)}$2`
    );
    console.log('[hydrateRating] Replaced title with:', content.title);
  }

  // Replace rating paragraph
  html = html.replace(
    /data-component="scai-rating-paragraph">[^<]+</,
    `data-component="scai-rating-paragraph">${content.summary}<`
  );
  console.log('[hydrateRating] Replaced paragraph with:', content.summary?.substring(0, 50) + '...');

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA BOX HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateCtaBox(
  variationName: BaseVariationName,
  content: CtaBoxContent
): HydratedComponent | null {
  const variation = getComponentVariation('cta-box', variationName);
  if (!variation) return null;

  let html = variation.html;

  // Replace CTA title
  html = html.replace(
    /data-component="scai-cta-title">[^<]+</,
    `data-component="scai-cta-title">${content.title}<`
  );

  // Replace CTA text
  html = html.replace(
    /<p class="scai-cta-text">[^<]+<\/p>/,
    `<p class="scai-cta-text">${content.text}</p>`
  );

  // Replace button text
  html = html.replace(
    />Get Started</,
    `>${content.buttonText}<`
  );

  // Replace button URL if provided
  if (content.buttonUrl) {
    html = html.replace(
      /href="#"/g,
      `href="${content.buttonUrl}"`
    );
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INFO HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateServiceInfo(
  variationName: BaseVariationName,
  content: ServiceInfoContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('service-info-box', variationName);
  if (!variation) return null;

  let html = variation.html;

  // Use AI-generated header if provided
  const headerText = content.h2 || (titleFormat ? getComponentH2('service-info', titleFormat) : null);
  if (headerText) {
    // Service Info uses div.scai-svc-header, not h2 - replace the text inside the div
    html = html.replace(
      /(<div[^>]*class="scai-svc-header"[^>]*>)[^<]*(<\/div>)/,
      `$1${headerText}$2`
    );
  }

  // If rows are provided, replace all rows with AI-generated content
  if (content.rows && content.rows.length > 0) {
    const rowsHtml = content.rows.map(row =>
      `<div class="scai-svc-row"><span class="scai-svc-label">${row.label}</span><span class="scai-svc-value">${row.value}</span></div>`
    ).join('\n');

    // Replace all existing rows with new ones
    html = html.replace(
      /(<div[^>]*class="scai-svc-header"[^>]*>[^<]*<\/div>)[\s\S]*$/,
      `$1\n${rowsHtml}\n</div>`
    );
  } else {
    // Fallback: Update individual service details by matching the value spans
    if (content.hours) {
      html = html.replace(/(<span class="scai-svc-value">)Available 24\/7[^<]*(<\/span>)/, `$1${content.hours}$2`);
    }
    if (content.address) {
      html = html.replace(/(<span class="scai-svc-value">)Guaranteed arrival[^<]*(<\/span>)/, `$1${content.address}$2`);
    }
    if (content.phone) {
      html = html.replace(/(<span class="scai-svc-value">)\$49 flat rate[^<]*(<\/span>)/, `$1${content.phone}$2`);
    }
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY CHOOSE LOCAL HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateWhyLocal(
  variationName: BaseVariationName,
  content: WhyLocalContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('why-choose-local', variationName);
  if (!variation) return null;

  const reasons = content.reasons.map(r => `<li>${r}</li>`).join('\n');

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || content.title || (titleFormat ? getComponentH2('why-local', titleFormat) : null) || 'Why Choose a Local Provider';

  console.log('[hydrateWhyLocal] h2Text to use:', h2Text);

  let html = variation.html;
  let replaced = false;

  // Pattern 1: h2.scai-local-title (most common)
  if (/<h2[^>]*class="scai-local-title"[^>]*>/.test(html)) {
    html = html.replace(
      /(<h2[^>]*class="scai-local-title"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    replaced = true;
    console.log('[hydrateWhyLocal] Replaced h2.scai-local-title');
  }

  // Pattern 2: h2.scai-local-h2 (older variations)
  if (!replaced && /<h2[^>]*class="scai-local-h2"[^>]*>/.test(html)) {
    html = html.replace(
      /(<h2[^>]*class="scai-local-h2"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    replaced = true;
    console.log('[hydrateWhyLocal] Replaced h2.scai-local-h2');
  }

  // Pattern 3: div.scai-local-header (Corporate Pro and similar variations)
  if (!replaced && /<div[^>]*class="scai-local-header"[^>]*>/.test(html)) {
    html = html.replace(
      /(<div[^>]*class="scai-local-header"[^>]*>)[^<]*(<\/div>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    replaced = true;
    console.log('[hydrateWhyLocal] Replaced div.scai-local-header');
  }

  if (!replaced) {
    console.warn('[hydrateWhyLocal] No header pattern matched!');
  }

  // Replace reasons list
  html = html.replace(
    /<ul[^>]*class="scai-local-list"[^>]*>[\s\S]*?<\/ul>/,
    `<ul class="scai-local-list">\n${reasons}\n</ul>`
  );

  // Replace hardcoded Unsplash image URL with dynamic placeholder if provided
  if (content.imageUrl) {
    html = html.replace(
      /src="https:\/\/images\.unsplash\.com\/[^"]+"/,
      `src="${content.imageUrl}"`
    );
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HONORABLE MENTIONS HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateHonorableMentions(
  variationName: BaseVariationName,
  content: HonorableMentionsContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('honorable-mentions', variationName);
  if (!variation) return null;

  const items = content.items.map(m => `
<div class="scai-hm-item">
  <h3 class="scai-hm-h3">${m.h3}</h3>
  <p class="scai-hm-paragraph">${m.description}</p>
</div>`).join('\n');

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('honorable-mentions', titleFormat) : null);
  if (h2Text) {
    // Only replace the text content inside the H2, preserving the original tag and classes
    html = html.replace(
      /(<h2[^>]*class="[^"]*scai-hm-h2[^"]*"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
  }

  // Replace mentions list
  html = html.replace(
    /<div class="scai-hm-list">[\s\S]*?<\/div>\s*<\/div>$/,
    `<div class="scai-hm-list">${items}</div></div>`
  );

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUTRITION HYDRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function hydrateNutrition(
  variationName: BaseVariationName,
  content: NutritionContent,
  titleFormat?: TitleFormat
): HydratedComponent | null {
  const variation = getComponentVariation('nutrition-table', variationName);
  if (!variation) return null;

  let html = variation.html;

  // Use AI-generated H2 if provided, otherwise fall back to format-specific H2
  const h2Text = content.h2 || (titleFormat ? getComponentH2('nutrition', titleFormat) : null);
  if (h2Text) {
    // Variations use h2.scai-nutr-h2
    html = html.replace(
      /(<h2[^>]*class="scai-nutr-h2"[^>]*>)[^<]*(<\/h2>)/,
      `$1${escapeReplacement(h2Text)}$2`
    );
    console.log('[hydrateNutrition] Replaced h2 with:', h2Text);
  }

  // Update nutrition values in table
  html = html.replace(/<td>Calories<\/td><td>\d+<\/td>/, `<td>Calories</td><td>${content.calories}</td>`);
  html = html.replace(/<td>Total Fat<\/td><td>[^<]+<\/td>/, `<td>Total Fat</td><td>${content.fat}</td>`);
  html = html.replace(/<td>Carbohydrates<\/td><td>[^<]+<\/td>/, `<td>Carbohydrates</td><td>${content.carbs}</td>`);
  html = html.replace(/<td>Protein<\/td><td>[^<]+<\/td>/, `<td>Protein</td><td>${content.protein}</td>`);

  // Add disclaimer if not already present in template (required per reference spec)
  const disclaimer = content.disclaimer || 'Approximate nutritional values. Actual nutrition may vary.';
  if (!html.includes('scai-nutr-disclaimer')) {
    // Insert disclaimer after the table
    html = html.replace(
      /(<\/table>)/,
      `$1<p class="scai-nutr-disclaimer" style="font-size: 0.875rem; color: #666; margin-top: 8px; font-style: italic;">${disclaimer}</p>`
    );
    console.log('[hydrateNutrition] Added disclaimer:', disclaimer);
  }

  return {
    html: `<div class="scai-component">${html}</div>`,
    css: variation.css || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Collect all CSS for components used in an article
 */
export function collectComponentCss(
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
