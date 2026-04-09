/**
 * Merge Script: Combines basic components from original variations.ts
 * with extracted components from HTML reference document
 */

const fs = require('fs');
const path = require('path');

// Read the extracted variations (from HTML reference)
const extractedPath = path.join(__dirname, '../data/variations-extracted.ts');
const extractedContent = fs.readFileSync(extractedPath, 'utf-8');

// Extract just the component data from the extracted file (after the opening brace)
const extractedMatch = extractedContent.match(/export const COMPONENT_VARIATIONS[^{]*\{([\s\S]*)\};/);
const extractedComponents = extractedMatch ? extractedMatch[1] : '';

// Define the basic components that we keep from the original
// (These are NOT in the HTML reference document)
const BASIC_COMPONENTS = `
  // ══════════════════════════════════════════════════════════════════════════
  // BASIC UNIVERSAL COMPONENTS (kept from original - not in HTML reference)
  // ══════════════════════════════════════════════════════════════════════════
  
  // H1 Title Component
  'h1': [
    {
      name: 'Classic Serif',
      html: \`<header data-component="scai-h1">
  <h1 class="scai-h1-v1">The Complete Guide to Wireless Headphones in 2025</h1>
</header>\`,
      css: \`.scai-h1-v1 {
  font-family: 'Georgia', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}\`,
    },
    {
      name: 'Bold Sans-Serif',
      html: \`<header data-component="scai-h1">
  <h1 class="scai-h1-v2">The Complete Guide to Wireless Headphones in 2025</h1>
</header>\`,
      css: \`.scai-h1-v2 {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 2.75rem;
  font-weight: 900;
  color: #000;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}\`,
    },
    {
      name: 'Underlined Accent',
      html: \`<header data-component="scai-h1">
  <h1 class="scai-h1-v3">The Complete Guide to Wireless Headphones in 2025</h1>
</header>\`,
      css: \`.scai-h1-v3 {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 4px solid #000;
}\`,
    },
  ],

  // Featured Image Component
  'featured-image': [
    {
      name: 'Simple Full Width',
      html: \`<figure data-component="scai-featured-image" class="scai-featured-v1">
  <img src="https://placehold.co/800x450/e5e7eb/374151?text=Featured+Image" alt="Wireless headphones on a desk" />
</figure>\`,
      css: \`.scai-featured-v1 { margin: 2rem 0; }
.scai-featured-v1 img { width: 100%; height: auto; border-radius: 4px; }\`,
    },
    {
      name: 'With Caption',
      html: \`<figure data-component="scai-featured-image" class="scai-featured-v2">
  <img src="https://placehold.co/800x450/e5e7eb/374151?text=Featured+Image" alt="Wireless headphones on a desk" />
  <figcaption>Premium wireless headphones for everyday use</figcaption>
</figure>\`,
      css: \`.scai-featured-v2 { margin: 2rem 0; }
.scai-featured-v2 img { width: 100%; height: auto; border-radius: 8px; }
.scai-featured-v2 figcaption { margin-top: 0.75rem; font-size: 0.875rem; color: #6b7280; text-align: center; font-style: italic; }\`,
    },
    {
      name: 'Bordered Frame',
      html: \`<figure data-component="scai-featured-image" class="scai-featured-v3">
  <img src="https://placehold.co/800x450/e5e7eb/374151?text=Featured+Image" alt="Wireless headphones on a desk" />
</figure>\`,
      css: \`.scai-featured-v3 { margin: 2rem 0; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.scai-featured-v3 img { width: 100%; height: auto; border-radius: 4px; }\`,
    },
  ],

  // Overview Paragraph Component
  'overview-paragraph': [
    {
      name: 'Statement Opener',
      html: \`<div data-component="scai-overview-paragraph" class="scai-overview-v1">
  <p>Wireless headphones have revolutionized how we experience audio. Whether you're commuting to work, hitting the gym, or relaxing at home, the freedom from tangled cables has made them an essential gadget for millions worldwide.</p>
</div>\`,
      css: \`.scai-overview-v1 { margin: 1.5rem 0; }
.scai-overview-v1 p { font-family: 'Georgia', serif; font-size: 1.125rem; line-height: 1.8; color: #374151; }\`,
    },
    {
      name: 'Question Opener',
      html: \`<div data-component="scai-overview-paragraph" class="scai-overview-v2">
  <p>What makes a pair of wireless headphones truly exceptional? Is it the sound quality, the battery life, or perhaps the comfort during long listening sessions? This comprehensive guide explores all the factors that matter most.</p>
</div>\`,
      css: \`.scai-overview-v2 { margin: 1.5rem 0; }
.scai-overview-v2 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1.0625rem; line-height: 1.75; color: #4b5563; }\`,
    },
    {
      name: 'Statistic Opener',
      html: \`<div data-component="scai-overview-paragraph" class="scai-overview-v3">
  <p><strong class="stat-highlight">Over 300 million</strong> wireless headphones were sold globally last year alone. With so many options, finding the right pair can feel overwhelming. Let us break down everything you need to know.</p>
</div>\`,
      css: \`.scai-overview-v3 { margin: 1.5rem 0; }
.scai-overview-v3 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1rem; line-height: 1.75; color: #374151; }
.scai-overview-v3 .stat-highlight { color: #000; font-weight: 700; }\`,
    },
  ],

  // Standard Paragraph Component
  'standard-paragraph': [
    {
      name: 'Classic Serif',
      html: \`<div data-component="scai-standard-paragraph" class="scai-stdpara-v1">
  <p>Sound quality remains the most important factor when choosing wireless headphones. The best models deliver rich, balanced audio with clear highs, defined mids, and punchy bass.</p>
</div>\`,
      css: \`.scai-stdpara-v1 { margin-bottom: 1.5rem; }
.scai-stdpara-v1 p { font-family: 'Georgia', serif; font-size: 1.125rem; line-height: 1.8; color: #374151; }\`,
    },
    {
      name: 'Modern Sans',
      html: \`<div data-component="scai-standard-paragraph" class="scai-stdpara-v2">
  <p>Sound quality remains the most important factor when choosing wireless headphones. The best models deliver rich, balanced audio with clear highs, defined mids, and punchy bass.</p>
</div>\`,
      css: \`.scai-stdpara-v2 { margin-bottom: 1.25rem; }
.scai-stdpara-v2 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1rem; line-height: 1.75; color: #4b5563; }\`,
    },
    {
      name: 'Highlighted Lead',
      html: \`<div data-component="scai-standard-paragraph" class="scai-stdpara-v3">
  <p>Sound quality remains the most important factor when choosing wireless headphones. The best models deliver rich, balanced audio with clear highs, defined mids, and punchy bass.</p>
</div>\`,
      css: \`.scai-stdpara-v3 { margin-bottom: 1.5rem; padding-left: 1rem; border-left: 3px solid #e5e7eb; }
.scai-stdpara-v3 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1rem; line-height: 1.75; color: #374151; }\`,
    },
  ],

  // Closing Paragraph Component
  'closing-paragraph': [
    {
      name: 'Call-to-Action Style',
      html: \`<div data-component="scai-closing-paragraph" class="scai-closing-v1">
  <p>Ready to find your perfect pair of wireless headphones? Start by identifying your primary use case, set your budget, and check out the top picks we've highlighted. Your perfect listening experience awaits!</p>
</div>\`,
      css: \`.scai-closing-v1 { margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px; }
.scai-closing-v1 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1.0625rem; line-height: 1.7; color: #374151; margin: 0; }\`,
    },
    {
      name: 'Summary Reinforcement',
      html: \`<div data-component="scai-closing-paragraph" class="scai-closing-v2">
  <p>In summary, choosing the right wireless headphones comes down to balancing sound quality, comfort, battery life, and price. The key is finding a pair that matches your lifestyle and listening habits.</p>
</div>\`,
      css: \`.scai-closing-v2 { margin-top: 2rem; }
.scai-closing-v2 p { font-family: 'Georgia', serif; font-size: 1.125rem; line-height: 1.8; color: #374151; }\`,
    },
    {
      name: 'Future-Looking',
      html: \`<div data-component="scai-closing-paragraph" class="scai-closing-v3">
  <p>As wireless audio technology continues to evolve, we can expect even better sound quality, longer battery life, and more innovative features. For now, the headphones we've covered represent the best the market has to offer.</p>
</div>\`,
      css: \`.scai-closing-v3 { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
.scai-closing-v3 p { font-family: system-ui, -apple-system, sans-serif; font-size: 1rem; line-height: 1.75; color: #4b5563; font-style: italic; }\`,
    },
  ],

  // H2 Heading Component
  'h2': [
    {
      name: 'Simple Bold',
      html: \`<h2 class="scai-h2-v1">Understanding Sound Quality</h2>\`,
      css: \`.scai-h2-v1 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.75rem; font-weight: 700; color: #111827; margin-top: 2.5rem; margin-bottom: 1rem; }\`,
    },
    {
      name: 'With Top Border',
      html: \`<h2 class="scai-h2-v2">Understanding Sound Quality</h2>\`,
      css: \`.scai-h2-v2 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.5rem; font-weight: 800; color: #000; margin-top: 3rem; margin-bottom: 1rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }\`,
    },
    {
      name: 'Accent Bar',
      html: \`<h2 class="scai-h2-v3"><span class="accent"></span>Understanding Sound Quality</h2>\`,
      css: \`.scai-h2-v3 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.75rem; font-weight: 700; color: #111827; margin-top: 2.5rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
.scai-h2-v3 .accent { display: inline-block; width: 4px; height: 1.5rem; background: #000; border-radius: 2px; }\`,
    },
  ],

  // H3 Heading Component
  'h3': [
    {
      name: 'Simple',
      html: \`<h3 class="scai-h3-v1">Noise Cancellation Technology</h3>\`,
      css: \`.scai-h3-v1 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.25rem; font-weight: 600; color: #111827; margin-top: 1.5rem; margin-bottom: 0.75rem; }\`,
    },
    {
      name: 'Underlined',
      html: \`<h3 class="scai-h3-v2">Noise Cancellation Technology</h3>\`,
      css: \`.scai-h3-v2 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.125rem; font-weight: 700; color: #000; margin-top: 1.5rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #000; }\`,
    },
    {
      name: 'With Icon',
      html: \`<h3 class="scai-h3-v3">▸ Noise Cancellation Technology</h3>\`,
      css: \`.scai-h3-v3 { font-family: system-ui, -apple-system, sans-serif; font-size: 1.25rem; font-weight: 600; color: #111827; margin-top: 1.5rem; margin-bottom: 0.75rem; }\`,
    },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // EXTRACTED COMPONENTS (from HTML reference document)
  // ══════════════════════════════════════════════════════════════════════════
`;

// Build the final file
const finalOutput = `/**
 * Component Variations
 * 
 * This file contains:
 * - Basic universal components (h1, featured-image, paragraphs, etc.)
 * - Specialized components extracted from HTML reference document
 * 
 * BASE_STYLES are injected by the visualize page renderer, not stored here.
 * Generated: ${new Date().toISOString()}
 */

export interface ComponentVariation {
  name: string
  html: string
  css?: string
}

export const COMPONENT_VARIATIONS: Record<string, ComponentVariation[]> = {
${BASIC_COMPONENTS}
${extractedComponents}
};
`;

// Write the merged file
const outputPath = path.join(__dirname, '../data/variations-merged.ts');
fs.writeFileSync(outputPath, finalOutput, 'utf-8');

console.log('='.repeat(60));
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log('Output:', outputPath);
console.log('');
console.log('Contents:');
console.log('- Basic components: h1, featured-image, overview-paragraph,');
console.log('  standard-paragraph, closing-paragraph, h2, h3');
console.log('- Extracted components: 21 from HTML reference (63 variations)');
console.log('='.repeat(60));
