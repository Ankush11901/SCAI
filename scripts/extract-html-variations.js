/**
 * Extract Component Variations from HTML Reference Document
 * 
 * This script parses the HTML reference document and extracts:
 * 1. CSS for each component variation (component-specific only, NOT base styles)
 * 2. HTML for each component variation (exactly as written)
 * 
 * Output: Generates data/variations-extracted.ts
 */

const fs = require('fs');
const path = require('path');

// Paths
const HTML_PATH = path.join(__dirname, '../documentation/{scai-component-variations}-{v1}-{1-6-2026}.html');
const OUTPUT_PATH = path.join(__dirname, '../data/variations-extracted.ts');

// Read the HTML file
const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');

// Extract the full <style> block
const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const fullCSS = styleMatch ? styleMatch[1] : '';

/**
 * Component definitions - maps our key to the CSS class prefix used in the HTML
 * Format: [variationsKey, cssClassPrefix, variationSuffixes]
 */
const COMPONENT_MAPPINGS = [
  // Universal
  { key: 'toc', prefix: 'scai-toc-', suffixes: ['a', 'b', 'c'], names: ['Boxed List', 'Numbered', 'Modern Wiki'] },
  { key: 'faq', prefix: 'scai-faq-section-', suffixes: ['a', 'b', 'c'], names: ['Accordion', 'Boxed', 'Simple'] },
  
  // Affiliate/Commercial
  { key: 'product-card', prefix: 'scai-product-card-', suffixes: ['a', 'b', 'c'], names: ['Horizontal', 'Vertical', 'Minimal'] },
  { key: 'feature-list', prefix: 'scai-feature-section-', suffixes: ['a', 'b', 'c'], names: ['Alternating Background', 'List', 'Compact'] },
  { key: 'cta-box', prefix: 'scai-cta-box-', suffixes: ['a', 'b', 'c'], names: ['Centered', 'Side-by-side', 'Accent'] },
  
  // Comparison
  { key: 'comparison-table', prefix: 'scai-comparison-table-', suffixes: ['a', 'b', 'c'], names: ['Standard Table', 'Minimal Table', 'Card Columns'] },
  { key: 'quick-verdict', prefix: 'scai-quick-verdict-', suffixes: ['a', 'b', 'c'], names: ['Split', 'Boxed', 'Inline'] },
  
  // How-To
  { key: 'requirements-box', prefix: 'scai-requirements-', suffixes: ['a', 'b', 'c'], names: ['Boxed', 'Simple', 'List'] },
  { key: 'pro-tips', prefix: 'scai-pro-tips-', suffixes: ['a', 'b', 'c'], names: ['Numbered', 'Boxed', 'Minimal'] },
  
  // Informational
  { key: 'key-takeaways', prefix: 'scai-key-takeaways-', suffixes: ['a', 'b', 'c'], names: ['Highlighted', 'Sidebar', 'Modern'] },
  { key: 'quick-facts', prefix: 'scai-quick-facts-', suffixes: ['a', 'b', 'c'], names: ['Executive Summary', 'List', 'Grid'] },
  
  // Listicle
  { key: 'honorable-mentions', prefix: 'scai-honorable-mentions-', suffixes: ['a', 'b', 'c'], names: ['Cards', 'List', 'Minimal'] },
  
  // Local
  { key: 'why-choose-local', prefix: 'scai-why-local-', suffixes: ['a', 'b', 'c'], names: ['Benefits Grid', 'Feature List', 'Callout Box'] },
  { key: 'service-info-box', prefix: 'scai-service-info-', suffixes: ['a', 'b', 'c'], names: ['Detailed Card', 'Sidebar', 'Compact'] },
  
  // Recipe
  { key: 'ingredients', prefix: 'scai-ingredients-', suffixes: ['a', 'b', 'c'], names: ['Grouped', 'Simple List', 'Two Column'] },
  { key: 'instructions', prefix: 'scai-instructions-', suffixes: ['a', 'b', 'c'], names: ['Numbered Steps', 'Simple', 'Cards'] },
  { key: 'recipe-tips', prefix: 'scai-tips-section-', suffixes: ['a', 'b', 'c'], names: ['Highlighted', 'Sidebar', 'Simple'] },
  { key: 'nutrition-table', prefix: 'scai-nutrition-', suffixes: ['a', 'b', 'c'], names: ['Standard', 'Compact', 'Zebra Striped'] },
  
  // Review
  { key: 'features-list', prefix: 'scai-features-', suffixes: ['a', 'b', 'c'], names: ['Grid', 'Simple', 'Boxed'] },
  { key: 'pros-cons', prefix: 'scai-pros-cons-', suffixes: ['a', 'b', 'c'], names: ['Side by Side', 'Stacked', 'Minimal'] },
  { key: 'rating', prefix: 'scai-rating-', suffixes: ['a', 'b', 'c'], names: ['Standard Publisher', 'Editorial Minimal', 'Circle Outline'] },
];

/**
 * Extract CSS rules for a specific class prefix
 * Returns all CSS that starts with the given class
 */
function extractCSSForClass(cssClass) {
  const lines = fullCSS.split('\n');
  const relevantCSS = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines that start with this class or have it as a selector
    if (trimmed.startsWith('.' + cssClass) || trimmed.startsWith('.' + cssClass + ' ') || trimmed.startsWith('.' + cssClass + ':') || trimmed.startsWith('.' + cssClass + '.')) {
      relevantCSS.push(trimmed);
    }
  }
  
  return relevantCSS.join('\n');
}

/**
 * Extract HTML for a specific component variation
 * Looks for elements with the given class
 */
function extractHTML(cssClass) {
  // Build regex to find the element - handles div, nav, table, etc.
  // Pattern: find opening tag with our class, then capture everything until closing tag
  
  // First, try to find the element in the HTML
  const classRegex = new RegExp(`class="${cssClass}"`, 'g');
  const match = htmlContent.match(classRegex);
  
  if (!match) {
    console.log(`  ⚠ No element found with class: ${cssClass}`);
    return null;
  }
  
  // Find the starting position
  const startIndex = htmlContent.indexOf(`class="${cssClass}"`);
  if (startIndex === -1) return null;
  
  // Go back to find the opening tag
  let tagStart = startIndex;
  while (tagStart > 0 && htmlContent[tagStart] !== '<') {
    tagStart--;
  }
  
  // Get the tag name
  const tagMatch = htmlContent.substring(tagStart).match(/^<(\w+)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];
  
  // Now we need to find the matching closing tag
  // This is tricky because of nested same-name tags
  let depth = 0;
  let pos = tagStart;
  let foundEnd = false;
  
  while (pos < htmlContent.length && !foundEnd) {
    // Look for opening or closing tags of this type
    const openTag = `<${tagName}`;
    const closeTag = `</${tagName}>`;
    
    const nextOpen = htmlContent.indexOf(openTag, pos + 1);
    const nextClose = htmlContent.indexOf(closeTag, pos);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Found a nested opening tag
      depth++;
      pos = nextOpen + 1;
    } else {
      // Found a closing tag
      if (depth === 0) {
        // This is our closing tag
        pos = nextClose + closeTag.length;
        foundEnd = true;
      } else {
        depth--;
        pos = nextClose + closeTag.length;
      }
    }
  }
  
  if (!foundEnd) return null;
  
  let html = htmlContent.substring(tagStart, pos);
  
  // Clean up excessive whitespace while preserving structure
  html = html
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return html;
}

/**
 * Escape backticks and template literal syntax for TypeScript output
 */
function escapeForTS(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}

// Start extraction
console.log('='.repeat(60));
console.log('EXTRACTING COMPONENT VARIATIONS FROM HTML REFERENCE');
console.log('='.repeat(60));
console.log('');

let output = `/**
 * Component Variations - EXTRACTED FROM HTML REFERENCE
 * Generated: ${new Date().toISOString()}
 * 
 * These variations are extracted exactly from the HTML reference document.
 * BASE_STYLES are injected by the visualize page, NOT stored here.
 */

export interface ComponentVariation {
  name: string
  html: string
  css?: string
}

export const COMPONENT_VARIATIONS: Record<string, ComponentVariation[]> = {
`;

// Track statistics
let totalSuccess = 0;
let totalFailed = 0;

// Process each component
for (const comp of COMPONENT_MAPPINGS) {
  console.log(`\nProcessing: ${comp.key}`);
  output += `  // ${comp.key.toUpperCase()}\n`;
  output += `  '${comp.key}': [\n`;
  
  for (let i = 0; i < comp.suffixes.length; i++) {
    const suffix = comp.suffixes[i];
    const name = comp.names[i];
    const cssClass = comp.prefix + suffix;
    
    const css = extractCSSForClass(cssClass);
    const html = extractHTML(cssClass);
    
    if (html) {
      console.log(`  ✓ ${name} (${cssClass})`);
      totalSuccess++;
      
      output += `    {\n`;
      output += `      name: '${name}',\n`;
      output += `      html: \`${escapeForTS(html)}\`,\n`;
      output += `      css: \`${escapeForTS(css)}\`\n`;
      output += `    }${i < comp.suffixes.length - 1 ? ',' : ''}\n`;
    } else {
      console.log(`  ✗ ${name} (${cssClass}) - HTML not found`);
      totalFailed++;
      
      // Still add a placeholder
      output += `    {\n`;
      output += `      name: '${name}',\n`;
      output += `      html: \`<div class="${cssClass}"><!-- TODO: Extract from HTML reference --></div>\`,\n`;
      output += `      css: \`${escapeForTS(css)}\`\n`;
      output += `    }${i < comp.suffixes.length - 1 ? ',' : ''}\n`;
    }
  }
  
  output += `  ],\n\n`;
}

output += `};\n`;

// Write output file
fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');

console.log('\n' + '='.repeat(60));
console.log('EXTRACTION COMPLETE');
console.log('='.repeat(60));
console.log(`Success: ${totalSuccess}`);
console.log(`Failed: ${totalFailed}`);
console.log(`Output: ${OUTPUT_PATH}`);
console.log('='.repeat(60));
