/**
 * Extract component variations from HTML reference document
 * This script reads the HTML file and extracts CSS and HTML for each component variation
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../documentation/{scai-component-variations}-{v1}-{1-6-2026}.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract the CSS block (between <style> tags)
const cssMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const fullCSS = cssMatch ? cssMatch[1] : '';

// Parse CSS by component class
function extractCSSForClass(className) {
  const regex = new RegExp(`\\/\\*[^*]*${className.replace('.', '\\.')}[^*]*\\*\\/[\\s\\S]*?(?=\\/\\*|<\\/style>)`, 'g');
  const matches = fullCSS.match(regex);
  
  // More precise extraction
  const lines = fullCSS.split('\n');
  let css = '';
  let capturing = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start capturing when we find the comment with our class
    if (line.includes(className)) {
      capturing = true;
    }
    
    // Stop when we hit the next comment
    if (capturing && line.startsWith('/*') && !line.includes(className)) {
      break;
    }
    
    if (capturing) {
      css += lines[i] + '\n';
    }
  }
  
  return css.trim();
}

// Extract HTML for a specific data-component and class
function extractHTML(componentId, className) {
  // Find the div with both data-component and the specific class
  const regex = new RegExp(`<(?:div|nav)\\s+class="${className}"[^>]*data-component="scai-${componentId}"[^>]*>([\\s\\S]*?)<\\/(?:div|nav)>`, 'i');
  const match = htmlContent.match(regex);
  
  if (!match) {
    // Try reverse order (data-component first)
    const regex2 = new RegExp(`<(?:div|nav)\\s+data-component="scai-${componentId}"[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/(?:div|nav)>`, 'i');
    const match2 = htmlContent.match(regex2);
    return match2 ? match2[0] : null;
  }
  
  return match[0];
}

console.log('Extracting FAQ variations...');

// Test with FAQ
const faqA_css = extractCSSForClass('.scai-faq-section-a');
const faqA_html = extractHTML('faq-section', 'scai-faq-section-a');

console.log('FAQ A CSS length:', faqA_css.length);
console.log('FAQ A HTML length:', faqA_html ? faqA_html.length : 0);
console.log('\nCSS Preview:');
console.log(faqA_css.substring(0, 200));
console.log('\nHTML Preview:');
console.log(faqA_html ? faqA_html.substring(0, 300) : 'NOT FOUND');
