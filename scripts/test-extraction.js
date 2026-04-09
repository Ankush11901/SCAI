/**
 * Complete rebuild of variations.ts from HTML reference document
 * Extracts EXACT HTML and CSS with base styles for each component
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

// Base styles that should be included with every component
const baseStyles = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000; background: #fff; }
h1, h2, h3, h4 { font-weight: 600; }`;

// Component mapping: [variations.ts key, HTML data-component attribute, CSS class prefix]
const componentMap = {
  faq: {
    key: 'faq',
    dataComponent: 'faq-section',
    variations: [
      { name: 'Variation A: Accordion', cssClass: 'scai-faq-section-a', htmlId: 'scai-q-faq-section-1' },
      { name: 'Variation B: Boxed', cssClass: 'scai-faq-section-b', htmlId: 'scai-q-faq-section-2' },
      { name: 'Variation C: Simple', cssClass: 'scai-faq-section-c', htmlId: 'scai-q-faq-section-3' }
    ]
  },
  toc: {
    key: 'toc',
    dataComponent: 'table-of-contents',
    variations: [
      { name: 'Variation A: Boxed List', cssClass: 'scai-toc-a', htmlId: 'scai-q-toc-1' },
      { name: 'Variation B: Numbered', cssClass: 'scai-toc-b', htmlId: 'scai-q-toc-2' },
      { name: 'Variation C: Modern Wiki', cssClass: 'scai-toc-c', htmlId: 'scai-q-toc-3' }
    ]
  },
  'product-card': {
    key: 'product-card',
    dataComponent: 'product-card',
    variations: [
      { name: 'Variation A: Horizontal', cssClass: 'scai-product-card-a', htmlId: 'scai-q-product-card-1' },
      { name: 'Variation B: Vertical', cssClass: 'scai-product-card-b', htmlId: 'scai-q-product-card-2' },
      { name: 'Variation C: Minimal', cssClass: 'scai-product-card-c', htmlId: 'scai-q-product-card-3' }
    ]
  }
  // Add more components as needed
};

// Extract CSS for a specific class (including all nested selectors)
function extractCSSForClass(cssClass) {
  const lines = fullCSS.split('\n');
  let css = '';
  let capturing = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start capturing when we find the comment or first rule for our class
    if (line.includes(cssClass) || (capturing && line.startsWith('.' + cssClass))) {
      capturing = true;
    }
    
    // Stop when we hit a new component comment (but not other comments)
    if (capturing && line.match(/^\/\* [A-Z].*Variation [A-Z]/)) {
      if (!line.includes(cssClass.split('-').slice(0, -1).join('-'))) {
        break;
      }
    }
    
    // Stop at major section breaks
    if (capturing && line.match(/^\/\* ={10,}/)) {
      break;
    }
    
    if (capturing && !line.startsWith('/*') && line) {
      css += '        ' + line + '\n';
    }
  }
  
  return css.trim();
}

// Extract HTML for a specific element
function extractHTML(htmlId, cssClass, dataComponent) {
  // Try multiple patterns
  const patterns = [
    new RegExp(`<(div|nav)\\s+class="${cssClass}"[^>]*id="${htmlId}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'),
    new RegExp(`<(div|nav)\\s+[^>]*id="${htmlId}"[^>]*class="${cssClass}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'),
    new RegExp(`<(div|nav)\\s+class="${cssClass}"[^>]*data-component="scai-${dataComponent}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      // Clean up indentation
      const html = match[0]
        .split('\n')
        .map(line => line.replace(/^                    /, '  '))
        .join('\n')
        .trim();
      return html;
    }
  }
  
  return null;
}

console.log('Building variations.ts from reference document...\n');

// Test extraction
const testComp = componentMap.faq;
console.log(`Testing ${testComp.key}:`);

testComp.variations.forEach((variant, idx) => {
  console.log(`\n${idx + 1}. ${variant.name}`);
  
  const css = extractCSSForClass(variant.cssClass);
  const html = extractHTML(variant.htmlId, variant.cssClass, testComp.dataComponent);
  
  console.log(`   CSS: ${css ? css.length + ' chars' : 'NOT FOUND'}`);
  console.log(`   HTML: ${html ? html.length + ' chars' : 'NOT FOUND'}`);
  
  if (html && idx === 0) {
    console.log('\n   HTML Preview:');
    console.log(html.substring(0, 200) + '...');
  }
});

console.log('\n\nExtraction test complete!');
console.log('Next: Run full rebuild script to generate complete variations.ts');
