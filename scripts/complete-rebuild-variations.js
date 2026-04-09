const fs = require('fs');
const path = require('path');

// Base CSS that gets prepended to every component
const BASE_STYLES = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000; background: #fff; }
h1, h2, h3, h4 { font-weight: 600; }`;

// Component mapping with extraction patterns
const COMPONENT_MAP = {
  toc: {
    tsKey: 'toc',
    dataComp: 'table-of-contents',
    classPattern: 'scai-toc-[abc]',
    htmlTag: 'nav',
    idPrefix: 'scai-q-toc-',
    variationNames: ['Boxed List', 'Numbered', 'Modern Wiki']
  },
  faq: {
    tsKey: 'faq',
    dataComp: 'faq-section',
    classPattern: 'scai-faq-section-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-faq-section-',
    variationNames: ['Accordion', 'Boxed', 'Simple']
  },
  'product-card': {
    tsKey: 'product-card',
    dataComp: 'product-card',
    classPattern: 'scai-product-card-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-product-card-',
    variationNames: ['Horizontal', 'Vertical', 'Minimal']
  },
  'feature-list': {
    tsKey: 'feature-list',
    dataComp: 'feature-section',
    classPattern: 'scai-feature-section-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-feature-section-',
    variationNames: ['Alternating Background', 'List', 'Compact']
  },
  'cta-box': {
    tsKey: 'cta-box',
    dataComp: 'cta-box',
    classPattern: 'scai-cta-box-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-cta-box-',
    variationNames: ['Centered', 'Sidebar', 'Minimal']
  },
  'comparison-table': {
    tsKey: 'comparison-table',
    dataComp: 'comparison-table',
    classPattern: 'scai-comparison-table-[abc]',
    htmlTag: 'table|div',
    idPrefix: 'scai-q-comparison-table-',
    variationNames: ['Striped', 'Card Style', 'Minimal']
  },
  'requirements-box': {
    tsKey: 'requirements-box',
    dataComp: 'requirements-box',
    classPattern: 'scai-requirements-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-requirements-',
    variationNames: ['Boxed', 'Simple', 'Grid']
  },
  'pro-tips': {
    tsKey: 'pro-tips',
    dataComp: 'pro-tips-section',
    classPattern: 'scai-pro-tips-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-pro-tips-',
    variationNames: ['Numbered', 'Boxed', 'Minimal']
  },
  'key-takeaways': {
    tsKey: 'key-takeaways',
    dataComp: 'key-takeaways',
    classPattern: 'scai-key-takeaways-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-key-takeaways-',
    variationNames: ['Highlighted', 'Sidebar', 'Modern']
  },
  'quick-verdict': {
    tsKey: 'quick-verdict',
    dataComp: 'quick-verdict',
    classPattern: 'scai-quick-verdict-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-quick-verdict-',
    variationNames: ['Card', 'Highlight', 'Simple']
  },
  'quick-facts': {
    tsKey: 'quick-facts',
    dataComp: 'quick-facts-section',
    classPattern: 'scai-quick-facts-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-quick-facts-',
    variationNames: ['Executive Summary', 'List', 'Minimal']
  },
  'honorable-mentions': {
    tsKey: 'honorable-mentions',
    dataComp: 'honorable-mentions',
    classPattern: 'scai-honorable-mentions-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-honorable-mentions-',
    variationNames: ['Cards', 'Compact', 'Comparison Rows']
  },
  'why-choose-local': {
    tsKey: 'why-choose-local',
    dataComp: 'why-choose-local',
    classPattern: 'scai-why-local-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-why-local-',
    variationNames: ['Bordered Cards', 'Simple List', 'Compact']
  },
  'service-info-box': {
    tsKey: 'service-info-box',
    dataComp: 'service-info-box',
    classPattern: 'scai-service-info-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-service-info-',
    variationNames: ['Card', 'List', 'Minimal']
  },
  ingredients: {
    tsKey: 'ingredients',
    dataComp: 'ingredients-section',
    classPattern: 'scai-ingredients-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-ingredients-',
    variationNames: ['Grouped', 'Simple List', 'Compact']
  },
  instructions: {
    tsKey: 'instructions',
    dataComp: 'instructions-section',
    classPattern: 'scai-instructions-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-instructions-',
    variationNames: ['Numbered Steps', 'Card Steps', 'Simple']
  },
  'recipe-tips': {
    tsKey: 'recipe-tips',
    dataComp: 'tips-section',
    classPattern: 'scai-tips-section-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-tips-section-',
    variationNames: ['Boxed', 'List', 'Minimal']
  },
  'nutrition-table': {
    tsKey: 'nutrition-table',
    dataComp: 'nutrition-section',
    classPattern: 'scai-nutrition-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-nutrition-',
    variationNames: ['Table', 'List', 'Compact']
  },
  'features-list': {
    tsKey: 'features-list',
    dataComp: 'features-section',
    classPattern: 'scai-features-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-features-',
    variationNames: ['Icons', 'Simple', 'Compact']
  },
  'pros-cons': {
    tsKey: 'pros-cons',
    dataComp: 'pros-cons-section',
    classPattern: 'scai-pros-cons-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-pros-cons-',
    variationNames: ['Side by Side', 'Stacked', 'Minimal']
  },
  rating: {
    tsKey: 'rating',
    dataComp: 'rating-section',
    classPattern: 'scai-rating-[abc]',
    htmlTag: 'div',
    idPrefix: 'scai-q-rating-',
    variationNames: ['Card', 'Inline', 'Compact']
  }
};

// Basic components that don't need extraction
const BASIC_COMPONENTS = {
  h1: [
    {
      name: 'Default H1',
      html: '<h1>Article Title</h1>',
      css: `${BASE_STYLES}

h1 { font-size: 2.5rem; margin-bottom: 1rem; }`
    },
    {
      name: 'H1 with Subtitle',
      html: '<div class="header"><h1>Article Title</h1><p class="subtitle">A comprehensive guide</p></div>',
      css: `${BASE_STYLES}

h1 { font-size: 2.5rem; margin-bottom: 0.5rem; } .subtitle { font-size: 1.25rem; color: #666; }`
    },
    {
      name: 'Centered H1',
      html: '<h1 style="text-align: center;">Article Title</h1>',
      css: `${BASE_STYLES}

h1 { font-size: 2.5rem; margin-bottom: 1rem; text-align: center; }`
    }
  ],
  'featured-image': [
    {
      name: 'Full Width',
      html: '<img src="/placeholder.jpg" alt="Featured Image" style="width: 100%; height: auto;" />',
      css: `${BASE_STYLES}

img { max-width: 100%; height: auto; }`
    },
    {
      name: 'Centered with Caption',
      html: '<figure style="text-align: center;"><img src="/placeholder.jpg" alt="Featured Image" style="width: 100%; height: auto;" /><figcaption style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">Image caption here</figcaption></figure>',
      css: `${BASE_STYLES}

figure { margin: 0; } img { max-width: 100%; height: auto; } figcaption { font-size: 0.875rem; color: #666; margin-top: 0.5rem; }`
    },
    {
      name: 'Bordered',
      html: '<img src="/placeholder.jpg" alt="Featured Image" style="width: 100%; height: auto; border: 2px solid #000;" />',
      css: `${BASE_STYLES}

img { max-width: 100%; height: auto; border: 2px solid #000; }`
    }
  ],
  'overview-paragraph': [
    {
      name: 'Default',
      html: '<p>This is an overview paragraph that introduces the main topic.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; }`
    },
    {
      name: 'Bold Lead',
      html: '<p style="font-weight: 600; font-size: 1.1rem;">This is an overview paragraph that introduces the main topic.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600; }`
    },
    {
      name: 'Highlighted',
      html: '<p style="background: #f5f5f5; padding: 1rem; border-left: 3px solid #000;">This is an overview paragraph that introduces the main topic.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; background: #f5f5f5; padding: 1rem; border-left: 3px solid #000; }`
    }
  ],
  'standard-paragraph': [
    {
      name: 'Default',
      html: '<p>This is a standard paragraph with regular content.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; }`
    },
    {
      name: 'Larger Text',
      html: '<p style="font-size: 1.1rem;">This is a standard paragraph with regular content.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1.1rem; }`
    },
    {
      name: 'Compact',
      html: '<p style="font-size: 0.9rem;">This is a standard paragraph with regular content.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 0.9rem; }`
    }
  ],
  'closing-paragraph': [
    {
      name: 'Default',
      html: '<p>This concluding paragraph wraps up the article.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; }`
    },
    {
      name: 'Emphasized',
      html: '<p style="font-weight: 600; border-top: 2px solid #000; padding-top: 1rem;">This concluding paragraph wraps up the article.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; font-weight: 600; border-top: 2px solid #000; padding-top: 1rem; }`
    },
    {
      name: 'Centered',
      html: '<p style="text-align: center;">This concluding paragraph wraps up the article.</p>',
      css: `${BASE_STYLES}

p { margin-bottom: 1rem; font-size: 1rem; text-align: center; }`
    }
  ]
};

function escapeForTemplate(str) {
  // Escape backticks and ${} for template literals
  return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function extractHTML(htmlContent, className, htmlTag, id) {
  // Build regex pattern to match the full element
  // Handle multiple tag options (e.g., "table|div")
  const tagPattern = htmlTag.includes('|') ? `(?:${htmlTag})` : htmlTag;
  
  // For nested structures, we need a more sophisticated approach
  // Find the start of the element with this class
  const startPattern = new RegExp(
    `<(${tagPattern})[^>]*class="${className}"[^>]*>`,
    'i'
  );
  
  const startMatch = htmlContent.match(startPattern);
  if (!startMatch) {
    return null;
  }
  
  const startIndex = startMatch.index;
  const startTag = startMatch[1]; // The actual tag used (table, div, nav, etc.)
  const startTagEnd = startIndex + startMatch[0].length;
  
  // Now find the matching closing tag by counting nested tags
  let depth = 1;
  let currentIndex = startTagEnd;
  const openTagPattern = new RegExp(`<${startTag}[^>]*>`, 'gi');
  const closeTagPattern = new RegExp(`<\\/${startTag}>`, 'gi');
  
  while (depth > 0 && currentIndex < htmlContent.length) {
    // Find next opening or closing tag
    openTagPattern.lastIndex = currentIndex;
    closeTagPattern.lastIndex = currentIndex;
    
    const nextOpen = openTagPattern.exec(htmlContent);
    const nextClose = closeTagPattern.exec(htmlContent);
    
    if (!nextClose) {
      // No closing tag found
      return null;
    }
    
    if (nextOpen && nextOpen.index < nextClose.index) {
      // Opening tag comes first
      depth++;
      currentIndex = nextOpen.index + nextOpen[0].length;
    } else {
      // Closing tag comes first
      depth--;
      if (depth === 0) {
        // Found the matching closing tag
        const endIndex = nextClose.index + nextClose[0].length;
        return htmlContent.substring(startIndex, endIndex).trim();
      }
      currentIndex = nextClose.index + nextClose[0].length;
    }
  }
  
  return null;
}

function extractCSS(styleContent, className) {
  // Extract all CSS rules for this class and its descendants
  const rules = [];
  
  // Pattern to match CSS rule blocks for this class
  const mainClassPattern = new RegExp(
    `\\.${className.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\s*\\{[^}]+\\}`,
    'g'
  );
  
  // Pattern to match descendant selectors
  const descendantPattern = new RegExp(
    `\\.${className.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\s+[^{]+\\{[^}]+\\}`,
    'g'
  );
  
  // Extract main class rules
  const mainMatches = styleContent.match(mainClassPattern);
  if (mainMatches) {
    rules.push(...mainMatches);
  }
  
  // Extract descendant rules
  const descMatches = styleContent.match(descendantPattern);
  if (descMatches) {
    rules.push(...descMatches);
  }
  
  return rules.join('\n');
}

function extractComponentVariations(htmlContent, styleContent, component) {
  const variations = [];
  const letters = ['a', 'b', 'c'];
  
  console.log(`\n  Extracting: ${component.tsKey}`);
  
  for (let i = 0; i < 3; i++) {
    const letter = letters[i];
    const className = component.classPattern.replace('[abc]', letter);
    const id = `${component.idPrefix}${i + 1}`;
    const variationName = component.variationNames[i];
    
    console.log(`    - Variation ${letter.toUpperCase()}: ${variationName}`);
    
    // Extract HTML
    const html = extractHTML(htmlContent, className, component.htmlTag, id);
    if (!html) {
      console.log(`      ⚠️  HTML not found for ${className}`);
      continue;
    }
    
    // Extract CSS
    const css = extractCSS(styleContent, className);
    if (!css) {
      console.log(`      ⚠️  CSS not found for ${className}`);
      continue;
    }
    
    // Combine base styles with component CSS
    const fullCSS = `${BASE_STYLES}

${css}`;
    
    variations.push({
      name: variationName,
      html: escapeForTemplate(html),
      css: escapeForTemplate(fullCSS)
    });
    
    console.log(`      ✓ Extracted successfully`);
  }
  
  return variations;
}

function generateVariationsTS(allVariations) {
  let output = `// Auto-generated from HTML reference document
// DO NOT EDIT MANUALLY - regenerate using scripts/complete-rebuild-variations.js

export interface ComponentVariation {
  name: string
  html: string
  css?: string
}

export const COMPONENT_VARIATIONS: Record<string, ComponentVariation[]> = {
`;

  // Add basic components first
  output += `  // === BASIC COMPONENTS ===\n`;
  for (const [key, variations] of Object.entries(BASIC_COMPONENTS)) {
    output += `  '${key}': [\n`;
    for (const variation of variations) {
      output += `    {\n`;
      output += `      name: '${variation.name}',\n`;
      output += `      html: \`${variation.html}\`,\n`;
      output += `      css: \`${variation.css}\`\n`;
      output += `    },\n`;
    }
    output += `  ],\n\n`;
  }

  // Add extracted components
  output += `  // === EXTRACTED COMPONENTS ===\n`;
  for (const [key, variations] of Object.entries(allVariations)) {
    if (variations.length === 0) continue;
    
    output += `  '${key}': [\n`;
    for (const variation of variations) {
      output += `    {\n`;
      output += `      name: '${variation.name}',\n`;
      output += `      html: \`${variation.html}\`,\n`;
      output += `      css: \`${variation.css}\`\n`;
      output += `    },\n`;
    }
    output += `  ],\n\n`;
  }

  output += `};\n`;
  return output;
}

function main() {
  console.log('=================================================');
  console.log('  SCAI Variations Extraction Script');
  console.log('=================================================\n');
  
  // Read HTML file
  const htmlPath = path.join(__dirname, '..', 'documentation', '{scai-component-variations}-{v1}-{1-6-2026}.html');
  console.log('Reading HTML reference document...');
  
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ Error: HTML file not found at ${htmlPath}`);
    process.exit(1);
  }
  
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  console.log('✓ HTML loaded successfully\n');
  
  // Extract style block
  console.log('Extracting CSS styles...');
  const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    console.error('❌ Error: Could not find <style> block in HTML');
    process.exit(1);
  }
  const styleContent = styleMatch[1];
  console.log('✓ CSS extracted successfully\n');
  
  // Extract all component variations
  console.log('Extracting component variations:');
  const allVariations = {};
  let totalExtracted = 0;
  let totalFailed = 0;
  
  for (const [key, component] of Object.entries(COMPONENT_MAP)) {
    const variations = extractComponentVariations(htmlContent, styleContent, component);
    allVariations[component.tsKey] = variations;
    
    if (variations.length === 3) {
      totalExtracted += 3;
    } else {
      totalFailed += (3 - variations.length);
    }
  }
  
  // Generate TypeScript file
  console.log('\n\nGenerating variations.ts...');
  const tsContent = generateVariationsTS(allVariations);
  
  // Write to file
  const outputPath = path.join(__dirname, '..', 'data', 'variations.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf-8');
  console.log(`✓ Written to: ${outputPath}\n`);
  
  // Summary
  console.log('=================================================');
  console.log('  EXTRACTION SUMMARY');
  console.log('=================================================');
  console.log(`Total components processed: ${Object.keys(COMPONENT_MAP).length}`);
  console.log(`Total variations extracted: ${totalExtracted}`);
  console.log(`Total variations failed: ${totalFailed}`);
  console.log(`Basic components included: ${Object.keys(BASIC_COMPONENTS).length} (15 variations)`);
  console.log(`\nTotal variations in file: ${totalExtracted + 15}`);
  console.log('=================================================\n');
  
  if (totalFailed > 0) {
    console.log('⚠️  Some variations failed to extract. Review the log above for details.\n');
  } else {
    console.log('✅ All variations extracted successfully!\n');
  }
}

// Run the script
main();
