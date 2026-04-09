/**
 * Complete rebuild of variations.ts from HTML reference document
 * Generates EXACT file with all components, base styles, and proper formatting
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../documentation/{scai-component-variations}-{v1}-{1-6-2026}.html');
const outputPath = path.join(__dirname, '../data/variations.ts');

// Read the HTML reference document
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract the full CSS block
const cssMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const fullCSS = cssMatch ? cssMatch[1] : '';

// Base styles that MUST be included with every component
const BASE_STYLES = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000; background: #fff; }
h1, h2, h3, h4 { font-weight: 600; }

`;

// Complete component mapping
const COMPONENTS = [
  {
    key: 'toc',
    dataComponent: 'table-of-contents',
    variations: [
      { name: 'Variation A: Boxed List', cssClass: 'scai-toc-a', htmlId: 'scai-q-toc-1' },
      { name: 'Variation B: Numbered', cssClass: 'scai-toc-b', htmlId: 'scai-q-toc-2' },
      { name: 'Variation C: Modern Wiki', cssClass: 'scai-toc-c', htmlId: 'scai-q-toc-3' }
    ]
  },
  {
    key: 'faq',
    dataComponent: 'faq-section',
    variations: [
      { name: 'Variation A: Accordion', cssClass: 'scai-faq-section-a', htmlId: 'scai-q-faq-section-1' },
      { name: 'Variation B: Boxed', cssClass: 'scai-faq-section-b', htmlId: 'scai-q-faq-section-2' },
      { name: 'Variation C: Simple', cssClass: 'scai-faq-section-c', htmlId: 'scai-q-faq-section-3' }
    ]
  },
  {
    key: 'product-card',
    dataComponent: 'product-card',
    variations: [
      { name: 'Variation A: Horizontal', cssClass: 'scai-product-card-a', htmlId: 'scai-q-product-card-1' },
      { name: 'Variation B: Vertical', cssClass: 'scai-product-card-b', htmlId: 'scai-q-product-card-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-product-card-c', htmlId: 'scai-q-product-card-3' }
    ]
  },
  {
    key: 'feature-list',
    dataComponent: 'feature-list',
    variations: [
      { name: 'Variation A: Icon Grid', cssClass: 'scai-feature-list-a', htmlId: 'scai-q-feature-list-1' },
      { name: 'Variation B: Stacked Cards', cssClass: 'scai-feature-list-b', htmlId: 'scai-q-feature-list-2' },
      { name: 'Variation C: Checklist', cssClass: 'scai-feature-list-c', htmlId: 'scai-q-feature-list-3' }
    ]
  },
  {
    key: 'cta-box',
    dataComponent: 'cta-box',
    variations: [
      { name: 'Variation A: Centered', cssClass: 'scai-cta-box-a', htmlId: 'scai-q-cta-box-1' },
      { name: 'Variation B: Left Aligned', cssClass: 'scai-cta-box-b', htmlId: 'scai-q-cta-box-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-cta-box-c', htmlId: 'scai-q-cta-box-3' }
    ]
  },
  {
    key: 'comparison-table',
    dataComponent: 'comparison-table',
    variations: [
      { name: 'Variation A: Standard', cssClass: 'scai-comparison-table-a', htmlId: 'scai-q-comparison-table-1' },
      { name: 'Variation B: Striped', cssClass: 'scai-comparison-table-b', htmlId: 'scai-q-comparison-table-2' },
      { name: 'Variation C: Cards', cssClass: 'scai-comparison-table-c', htmlId: 'scai-q-comparison-table-3' }
    ]
  },
  {
    key: 'requirements-box',
    dataComponent: 'requirements-box',
    variations: [
      { name: 'Variation A: Bordered', cssClass: 'scai-requirements-box-a', htmlId: 'scai-q-requirements-box-1' },
      { name: 'Variation B: Card', cssClass: 'scai-requirements-box-b', htmlId: 'scai-q-requirements-box-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-requirements-box-c', htmlId: 'scai-q-requirements-box-3' }
    ]
  },
  {
    key: 'pro-tips',
    dataComponent: 'pro-tips',
    variations: [
      { name: 'Variation A: Icon Sidebar', cssClass: 'scai-pro-tips-a', htmlId: 'scai-q-pro-tips-1' },
      { name: 'Variation B: Boxed', cssClass: 'scai-pro-tips-b', htmlId: 'scai-q-pro-tips-2' },
      { name: 'Variation C: Minimalist', cssClass: 'scai-pro-tips-c', htmlId: 'scai-q-pro-tips-3' }
    ]
  },
  {
    key: 'key-takeaways',
    dataComponent: 'key-takeaways',
    variations: [
      { name: 'Variation A: Numbered', cssClass: 'scai-key-takeaways-a', htmlId: 'scai-q-key-takeaways-1' },
      { name: 'Variation B: Bullet Points', cssClass: 'scai-key-takeaways-b', htmlId: 'scai-q-key-takeaways-2' },
      { name: 'Variation C: Highlight Box', cssClass: 'scai-key-takeaways-c', htmlId: 'scai-q-key-takeaways-3' }
    ]
  },
  {
    key: 'quick-verdict',
    dataComponent: 'quick-verdict',
    variations: [
      { name: 'Variation A: Card Format', cssClass: 'scai-quick-verdict-a', htmlId: 'scai-q-quick-verdict-1' },
      { name: 'Variation B: Banner', cssClass: 'scai-quick-verdict-b', htmlId: 'scai-q-quick-verdict-2' },
      { name: 'Variation C: Simple Box', cssClass: 'scai-quick-verdict-c', htmlId: 'scai-q-quick-verdict-3' }
    ]
  },
  {
    key: 'quick-facts',
    dataComponent: 'quick-facts',
    variations: [
      { name: 'Variation A: Grid', cssClass: 'scai-quick-facts-a', htmlId: 'scai-q-quick-facts-1' },
      { name: 'Variation B: Vertical List', cssClass: 'scai-quick-facts-b', htmlId: 'scai-q-quick-facts-2' },
      { name: 'Variation C: Compact', cssClass: 'scai-quick-facts-c', htmlId: 'scai-q-quick-facts-3' }
    ]
  },
  {
    key: 'honorable-mentions',
    dataComponent: 'honorable-mentions',
    variations: [
      { name: 'Variation A: Cards', cssClass: 'scai-honorable-mentions-a', htmlId: 'scai-q-honorable-mentions-1' },
      { name: 'Variation B: List', cssClass: 'scai-honorable-mentions-b', htmlId: 'scai-q-honorable-mentions-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-honorable-mentions-c', htmlId: 'scai-q-honorable-mentions-3' }
    ]
  },
  {
    key: 'why-choose-local',
    dataComponent: 'why-choose-local',
    variations: [
      { name: 'Variation A: Benefits Grid', cssClass: 'scai-why-choose-local-a', htmlId: 'scai-q-why-choose-local-1' },
      { name: 'Variation B: Feature List', cssClass: 'scai-why-choose-local-b', htmlId: 'scai-q-why-choose-local-2' },
      { name: 'Variation C: Callout Box', cssClass: 'scai-why-choose-local-c', htmlId: 'scai-q-why-choose-local-3' }
    ]
  },
  {
    key: 'service-info-box',
    dataComponent: 'service-info-box',
    variations: [
      { name: 'Variation A: Detailed Card', cssClass: 'scai-service-info-box-a', htmlId: 'scai-q-service-info-box-1' },
      { name: 'Variation B: Sidebar', cssClass: 'scai-service-info-box-b', htmlId: 'scai-q-service-info-box-2' },
      { name: 'Variation C: Compact', cssClass: 'scai-service-info-box-c', htmlId: 'scai-q-service-info-box-3' }
    ]
  },
  {
    key: 'ingredients',
    dataComponent: 'ingredients',
    variations: [
      { name: 'Variation A: Grouped', cssClass: 'scai-ingredients-a', htmlId: 'scai-q-ingredients-1' },
      { name: 'Variation B: Simple List', cssClass: 'scai-ingredients-b', htmlId: 'scai-q-ingredients-2' },
      { name: 'Variation C: Two Column', cssClass: 'scai-ingredients-c', htmlId: 'scai-q-ingredients-3' }
    ]
  },
  {
    key: 'instructions',
    dataComponent: 'instructions',
    variations: [
      { name: 'Variation A: Numbered Steps', cssClass: 'scai-instructions-a', htmlId: 'scai-q-instructions-1' },
      { name: 'Variation B: Timeline', cssClass: 'scai-instructions-b', htmlId: 'scai-q-instructions-2' },
      { name: 'Variation C: Simple', cssClass: 'scai-instructions-c', htmlId: 'scai-q-instructions-3' }
    ]
  },
  {
    key: 'recipe-tips',
    dataComponent: 'recipe-tips',
    variations: [
      { name: 'Variation A: Icon Cards', cssClass: 'scai-recipe-tips-a', htmlId: 'scai-q-recipe-tips-1' },
      { name: 'Variation B: List', cssClass: 'scai-recipe-tips-b', htmlId: 'scai-q-recipe-tips-2' },
      { name: 'Variation C: Callout', cssClass: 'scai-recipe-tips-c', htmlId: 'scai-q-recipe-tips-3' }
    ]
  },
  {
    key: 'nutrition-table',
    dataComponent: 'nutrition-table',
    variations: [
      { name: 'Variation A: Standard Table', cssClass: 'scai-nutrition-table-a', htmlId: 'scai-q-nutrition-table-1' },
      { name: 'Variation B: Grid', cssClass: 'scai-nutrition-table-b', htmlId: 'scai-q-nutrition-table-2' },
      { name: 'Variation C: Compact', cssClass: 'scai-nutrition-table-c', htmlId: 'scai-q-nutrition-table-3' }
    ]
  },
  {
    key: 'features-list',
    dataComponent: 'features-list',
    variations: [
      { name: 'Variation A: Detailed Grid', cssClass: 'scai-features-list-a', htmlId: 'scai-q-features-list-1' },
      { name: 'Variation B: Compact List', cssClass: 'scai-features-list-b', htmlId: 'scai-q-features-list-2' },
      { name: 'Variation C: Icon Based', cssClass: 'scai-features-list-c', htmlId: 'scai-q-features-list-3' }
    ]
  },
  {
    key: 'pros-cons',
    dataComponent: 'pros-cons',
    variations: [
      { name: 'Variation A: Two Column', cssClass: 'scai-pros-cons-a', htmlId: 'scai-q-pros-cons-1' },
      { name: 'Variation B: Stacked', cssClass: 'scai-pros-cons-b', htmlId: 'scai-q-pros-cons-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-pros-cons-c', htmlId: 'scai-q-pros-cons-3' }
    ]
  },
  {
    key: 'rating',
    dataComponent: 'rating',
    variations: [
      { name: 'Variation A: Detailed', cssClass: 'scai-rating-a', htmlId: 'scai-q-rating-1' },
      { name: 'Variation B: Simple', cssClass: 'scai-rating-b', htmlId: 'scai-q-rating-2' },
      { name: 'Variation C: Inline', cssClass: 'scai-rating-c', htmlId: 'scai-q-rating-3' }
    ]
  }
];

// Extract CSS for a specific class
function extractCSSForClass(cssClass) {
  const regex = new RegExp(`\\/\\* .* ${cssClass.replace('scai-', '').replace(/-[abc]$/, '')}.*?\\*\\/([\\s\\S]*?)(?=\\/\\* |$)`, 'i');
  const match = fullCSS.match(regex);
  
  if (match) {
    const lines = match[1].trim().split('\n');
    const relevantLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.includes(cssClass) || 
             (trimmed && !trimmed.startsWith('/*') && !trimmed.match(/^\.scai-[a-z]+-[a-z]+-[abc]/));
    });
    return relevantLines.join('\n').trim();
  }
  
  // Fallback: simple search
  const classIndex = fullCSS.indexOf('.' + cssClass);
  if (classIndex === -1) return '';
  
  let endIndex = fullCSS.indexOf('\n.' + cssClass.split('-').slice(0, -1).join('-'), classIndex + 1);
  if (endIndex === -1) endIndex = fullCSS.indexOf('\n/* ', classIndex + 100);
  if (endIndex === -1) endIndex = fullCSS.length;
  
  return fullCSS.substring(classIndex, endIndex).trim();
}

// Extract HTML for a specific element
function extractHTML(htmlId, cssClass, dataComponent) {
  const patterns = [
    new RegExp(`<(div|nav)\\s+class="${cssClass}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'),
    new RegExp(`<(div|nav)[^>]+id="${htmlId}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return '';
}

// Escape backticks and backslashes in strings
function escapeString(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

// Generate TypeScript code
let output = `// Auto-generated from HTML reference document
// DO NOT EDIT MANUALLY - regenerate using scripts/rebuild-variations.js

export interface ComponentVariation {
  name: string
  html: string
  css?: string
}

export const COMPONENT_VARIATIONS: Record<string, ComponentVariation[]> = {
  // === BASIC COMPONENTS ===
  h1: [
    {
      name: 'Default H1',
      html: '<h1>Article Title</h1>',
      css: '${BASE_STYLES}h1 { font-size: 2.5rem; margin-bottom: 1rem; }'
    },
    {
      name: 'H1 with Subtitle',
      html: '<div class="header"><h1>Article Title</h1><p class="subtitle">A comprehensive guide</p></div>',
      css: '${BASE_STYLES}h1 { font-size: 2.5rem; margin-bottom: 0.5rem; } .subtitle { font-size: 1.25rem; color: #666; }'
    },
    {
      name: 'Centered H1',
      html: '<h1 style="text-align: center;">Article Title</h1>',
      css: '${BASE_STYLES}h1 { font-size: 2.5rem; margin-bottom: 1rem; text-align: center; }'
    }
  ],

  'featured-image': [
    {
      name: 'Full Width',
      html: '<img src="/placeholder.jpg" alt="Featured Image" style="width: 100%; height: auto;" />',
      css: '${BASE_STYLES}img { max-width: 100%; height: auto; }'
    },
    {
      name: 'With Caption',
      html: '<figure><img src="/placeholder.jpg" alt="Featured Image" /><figcaption>Image caption</figcaption></figure>',
      css: '${BASE_STYLES}figure { margin: 2rem 0; } img { width: 100%; height: auto; } figcaption { text-align: center; font-size: 0.875rem; color: #666; margin-top: 0.5rem; }'
    },
    {
      name: 'Rounded',
      html: '<img src="/placeholder.jpg" alt="Featured Image" style="width: 100%; border-radius: 8px;" />',
      css: '${BASE_STYLES}img { width: 100%; height: auto; border-radius: 8px; }'
    }
  ],

  'overview-paragraph': [
    {
      name: 'Standard Overview',
      html: '<p class="overview">This comprehensive guide will walk you through everything you need to know.</p>',
      css: '${BASE_STYLES}.overview { font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.8; }'
    }
  ],

  'standard-paragraph': [
    {
      name: 'Standard',
      html: '<p>This is a standard paragraph with regular text content.</p>',
      css: '${BASE_STYLES}p { margin-bottom: 1rem; line-height: 1.8; }'
    }
  ],

  'closing-paragraph': [
    {
      name: 'Standard Closing',
      html: '<p class="closing">In conclusion, following these guidelines will help you achieve the best results.</p>',
      css: '${BASE_STYLES}.closing { font-size: 1.125rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #ddd; }'
    }
  ],

  // === EXTRACTED COMPONENTS ===
`;

console.log('Extracting all components from reference document...\n');

let successCount = 0;
let failureCount = 0;

COMPONENTS.forEach(component => {
  console.log(`Processing: ${component.key}`);
  
  output += `  ${component.key}: [\n`;
  
  component.variations.forEach((variant, idx) => {
    const css = extractCSSForClass(variant.cssClass);
    const html = extractHTML(variant.htmlId, variant.cssClass, component.dataComponent);
    
    if (html && css) {
      const fullCSS = BASE_STYLES + css;
      output += `    {\n`;
      output += `      name: '${variant.name}',\n`;
      output += `      html: \`${escapeString(html)}\`,\n`;
      output += `      css: \`${escapeString(fullCSS)}\`\n`;
      output += `    }${idx < component.variations.length - 1 ? ',' : ''}\n`;
      successCount++;
      console.log(`  ✓ ${variant.name}`);
    } else {
      failureCount++;
      console.log(`  ✗ ${variant.name} - FAILED (CSS: ${css ? 'OK' : 'MISSING'}, HTML: ${html ? 'OK' : 'MISSING'})`);
    }
  });
  
  output += `  ],\n\n`;
});

output += `};\n`;

// Write to file
fs.writeFileSync(outputPath, output, 'utf-8');

console.log(`\n${'='.repeat(60)}`);
console.log(`Rebuild complete!`);
console.log(`Success: ${successCount} variations`);
console.log(`Failed: ${failureCount} variations`);
console.log(`Output: ${outputPath}`);
console.log(`${'='.repeat(60)}\n`);
