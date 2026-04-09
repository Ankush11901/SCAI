/**
 * Populate QA Export from Exported HTML Files
 * 
 * Usage: pnpm tsx scripts/populate-qa-from-exports.ts [export-folder]
 * 
 * Reads exported HTML articles and generates qa-export.html with real content
 */

import * as fs from 'fs';
import * as path from 'path';

const ARTICLE_TYPES = [
  'affiliate', 'commercial', 'comparison', 'how-to', 
  'informational', 'listicle', 'local', 'recipe', 'review'
];

const VARIATIONS = ['Question', 'Statement', 'Listicle'];

interface ArticleData {
  wordCount: number;
  components: string[];
  htmlContent: string;
}

interface ArticleTypeData {
  question?: ArticleData;
  statement?: ArticleData;
  listicle?: ArticleData;
}

// Component detection patterns matching the QA export matrix
const COMPONENT_PATTERNS: Record<string, RegExp> = {
  'H1': /data-component="scai-h1"|<h1[^>]*>/i,
  'Featured Image': /scai-featured-image|data-component="scai-featured-image"/i,
  'Overview': /scai-overview|data-component="scai-overview"/i,
  'H2 Heading': /<h2[^>]*class="scai-h2"|class="scai-h2"[^>]*>|data-component="scai-h2"/i,
  'H2 Image': /scai-h2-image|data-component="scai-h2-image"/i,
  'Paragraph': /scai-paragraph|data-component="scai-paragraph"/i,
  'TOC': /scai-toc|scai-table-of-contents|data-component="scai-table-of-contents"/i,
  'FAQ': /scai-faq|data-component="scai-faq"/i,
  // Closing H2 is inside the scai-closing section
  'Closing H2': /scai-closing|data-component="scai-closing"|conclusion|final.*thoughts|wrapping.*up/i,
  'Closing Para': /scai-closing|data-component="scai-closing"/i,
  // Type-specific
  'Product Card': /scai-product-card|data-component="scai-product-card"/i,
  'Feature List': /scai-feature-list|scai-features-section|data-component="scai-features"/i,
  'CTA Box': /scai-cta|data-component="scai-cta"/i,
  'Topic Overview': /topic-overview|scai-topic/i,
  'Compare Table': /scai-comparison-table|data-component="scai-comparison"/i,
  'Quick Verdict': /quick-verdict|verdict-box/i,
  'Requirements': /scai-requirements|data-component="scai-requirements"/i,
  'Instructions': /scai-step|scai-instructions|data-component="scai-instructions"/i,
  'Pro Tips': /scai-tips|data-component="scai-tips"/i,
  'Key Takeaways': /key-takeaways|scai-takeaways/i,
  'Quick Facts': /quick-facts|scai-facts/i,
  // Listicle: scai-section = numbered list items (1., 2., 3., etc.)
  'List Items': /data-component="scai-section"|class="scai-section"/i,
  // Listicle: honorable mentions section
  'Mentions': /scai-honorable-mentions|scai-hm-|data-component="scai-honorable-mentions"/i,
  // Local: service info contains local business details
  'Local Info': /scai-service-info|data-component="scai-service-info"/i,
  'Service Box': /scai-service-info-box|data-component="scai-service-info-box"/i,
  'Ingredients': /scai-ingredients|data-component="scai-ingredients"/i,
  'Recipe Tips': /scai-tips-section|recipe-tips|cooking-tips/i,
  'Nutrition': /scai-nutrition|data-component="scai-nutrition"/i,
  'Features List': /scai-features-section|scai-feature-breakdown|features-list/i,
  'Pros/Cons': /scai-pros-cons|data-component="scai-pros-cons"/i,
  'Rating': /scai-rating|data-component="scai-rating"/i,
};

function countWords(html: string): number {
  // Strip HTML tags and count words
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function detectComponents(html: string): string[] {
  const detected: string[] = [];
  
  for (const [name, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(html)) {
      detected.push(name);
    }
  }
  
  return detected;
}

function readArticles(exportFolder: string): Record<string, ArticleTypeData> {
  const data: Record<string, ArticleTypeData> = {};
  
  for (const type of ARTICLE_TYPES) {
    data[type] = {};
    
    for (const variation of VARIATIONS) {
      // Try both singular and plural forms (listicle uses plural)
      const fileNames = [
        `${type}-air-fryer.html`,   // singular (Question/Statement)
        `${type}-air-fryers.html`,  // plural (Listicle)
      ];
      
      let filePath: string | null = null;
      for (const fileName of fileNames) {
        const testPath = path.join(exportFolder, variation, fileName);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
      
      if (filePath) {
        const htmlContent = fs.readFileSync(filePath, 'utf-8');
        const wordCount = countWords(htmlContent);
        const components = detectComponents(htmlContent);
        
        const variationKey = variation.toLowerCase() as 'question' | 'statement' | 'listicle';
        data[type][variationKey] = {
          wordCount,
          components,
          htmlContent,
        };
        
        console.log(`✓ ${type}/${variation}: ${wordCount} words, ${components.length} components detected`);
      } else {
        console.log(`○ ${type}/${variation}: not found`);
      }
    }
  }
  
  return data;
}

function generateSummary(articleData: Record<string, ArticleTypeData>): void {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('              QA EXPORT SUMMARY                    ');
  console.log('═══════════════════════════════════════════════════\n');
  
  let totalArticles = 0;
  let totalWords = 0;
  
  console.log('Type            | Question  | Statement | Listicle');
  console.log('───────────────────────────────────────────────────');
  
  for (const [type, variations] of Object.entries(articleData)) {
    const q = variations.question?.wordCount ?? '---';
    const s = variations.statement?.wordCount ?? '---';
    const l = variations.listicle?.wordCount ?? '---';
    
    console.log(`${type.padEnd(15)} | ${String(q).padStart(7)}w | ${String(s).padStart(7)}w | ${String(l).padStart(7)}w`);
    
    for (const data of Object.values(variations)) {
      if (data) {
        totalArticles++;
        totalWords += data.wordCount;
      }
    }
  }
  
  console.log('───────────────────────────────────────────────────');
  console.log(`Total: ${totalArticles}/27 articles, ${totalWords.toLocaleString()} words`);
  console.log('═══════════════════════════════════════════════════\n');
}

// Main
const args = process.argv.slice(2);
const exportFolder = args[0] || 'C:\\Users\\USER\\Downloads\\Exported HTML Articles';

if (!fs.existsSync(exportFolder)) {
  console.error(`❌ Export folder not found: ${exportFolder}`);
  console.error('   Please provide the path to your exported HTML articles folder.');
  process.exit(1);
}

console.log(`📂 Reading articles from: ${exportFolder}\n`);

const articleData = readArticles(exportFolder);
generateSummary(articleData);

// Generate QA export HTML with real article content
function generateQAExport(articleData: Record<string, ArticleTypeData>): void {
  const templatePath = path.join(__dirname, '..', 'qa-export-preview.html');
  const outputPath = path.join(__dirname, '..', 'qa-export.html');
  
  if (!fs.existsSync(templatePath)) {
    console.error('❌ Template not found:', templatePath);
    return;
  }
  
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Build the new ARTICLE_DATA object with real HTML content
  const dataEntries: string[] = [];
  
  for (const [type, variations] of Object.entries(articleData)) {
    const varEntries: string[] = [];
    
    for (const [variation, data] of Object.entries(variations)) {
      if (data) {
        // Escape the HTML for embedding in JavaScript string
        const escapedHtml = data.htmlContent
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$/g, '\\$');
        
        varEntries.push(
          `        ${variation}: { wordCount: ${data.wordCount}, components: ${JSON.stringify(data.components)}, htmlContent: \`${escapedHtml}\` }`
        );
      }
    }
    
    if (varEntries.length > 0) {
      dataEntries.push(`      '${type}': {\n${varEntries.join(',\n')}\n      }`);
    }
  }
  
  const newArticleData = `const ARTICLE_DATA = {\n${dataEntries.join(',\n')}\n    };`;
  
  // Replace the ARTICLE_DATA block in the template
  template = template.replace(
    /const ARTICLE_DATA = \{[\s\S]*?\n    \};/,
    newArticleData
  );
  
  fs.writeFileSync(outputPath, template, 'utf-8');
  console.log(`\n✅ Generated: ${outputPath}`);
  console.log('   Open this file in your browser to view the QA matrix with real articles!\n');
}

generateQAExport(articleData);
