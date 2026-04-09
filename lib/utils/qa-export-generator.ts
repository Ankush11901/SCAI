/**
 * QA Export Generator
 * 
 * Generates a complete QA Matrix HTML file from bulk-generated articles.
 * The output matches the qa-export-preview.html format with dynamic data.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QAArticleData, QAArticleTypeData, QAExportData, TitleVariation } from '@/lib/types/qa-export';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Component detection patterns matching the QA export matrix
 * These are copied from scripts/populate-qa-from-exports.ts for consistency
 */
export const COMPONENT_PATTERNS: Record<string, RegExp> = {
  'H1': /data-component="scai-h1"|<h1[^>]*>/i,
  'Featured Image': /scai-featured-image|data-component="scai-featured-image"/i,
  'Overview': /scai-overview|data-component="scai-overview"/i,
  'H2 Heading': /<h2[^>]*class="scai-h2"|class="scai-h2"[^>]*>|data-component="scai-h2"/i,
  'H2 Image': /scai-h2-image|data-component="scai-h2-image"/i,
  'Paragraph': /scai-paragraph|data-component="scai-paragraph"/i,
  'TOC': /scai-toc|scai-table-of-contents|data-component="scai-table-of-contents"/i,
  'FAQ': /scai-faq|data-component="scai-faq"/i,
  'Closing H2': /scai-closing|data-component="scai-closing"|conclusion|final.*thoughts|wrapping.*up/i,
  'Closing Para': /scai-closing|data-component="scai-closing"/i,
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
  'List Items': /data-component="scai-section"|class="scai-section"/i,
  'Mentions': /scai-honorable-mentions|scai-hm-|data-component="scai-honorable-mentions"/i,
  'Local Info': /scai-service-info|data-component="scai-service-info"/i,
  'Service Box': /scai-service-info-box|data-component="scai-service-info-box"/i,
  'Ingredients': /scai-ingredients|data-component="scai-ingredients"/i,
  'Recipe Tips': /scai-tips-section|recipe-tips|cooking-tips/i,
  'Nutrition': /scai-nutrition|data-component="scai-nutrition"/i,
  'Features List': /scai-features-section|scai-feature-breakdown|features-list/i,
  'Pros/Cons': /scai-pros-cons|data-component="scai-pros-cons"/i,
  'Rating': /scai-rating|data-component="scai-rating"/i,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count words in HTML content (strips tags, scripts, styles)
 */
export function countWords(html: string): number {
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Detect which components are present in the HTML
 */
export function detectComponents(html: string): string[] {
  const detected: string[] = [];
  
  for (const [name, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(html)) {
      detected.push(name);
    }
  }
  
  return detected;
}

/**
 * Escape HTML content for embedding in JavaScript template literal
 */
export function escapeForJavaScript(html: string): string {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Replace keyword throughout the template (handles singular/plural forms)
 */
export function replaceKeywordInTemplate(
  template: string, 
  oldKeyword: string, 
  newKeyword: string
): string {
  // Create variants for both singular and plural
  const oldSingular = oldKeyword.replace(/s$/i, '');
  const oldPlural = oldKeyword.endsWith('s') ? oldKeyword : oldKeyword + 's';
  
  const newSingular = newKeyword.replace(/s$/i, '');
  const newPlural = newKeyword.endsWith('s') ? newKeyword : newKeyword + 's';
  
  // Replace case-insensitively while preserving original casing where appropriate
  let result = template;
  
  // Replace "Air Fryers" (title case plural)
  result = result.replace(/Air Fryers/g, toTitleCase(newPlural));
  result = result.replace(/air fryers/gi, newPlural.toLowerCase());
  
  // Replace "Air Fryer" (title case singular)
  result = result.replace(/Air Fryer/g, toTitleCase(newSingular));
  result = result.replace(/air fryer/gi, newSingular.toLowerCase());
  
  return result;
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Sanitize string for use in filename
 */
export function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE DATA PREPARATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare article data for QA export
 */
export function prepareArticleData(
  htmlContent: string,
  status?: 'complete' | 'error' | 'pending',
  errorMessage?: string
): QAArticleData {
  return {
    wordCount: countWords(htmlContent),
    components: detectComponents(htmlContent),
    htmlContent,
    status,
    errorMessage,
  };
}

/**
 * Group articles by type and variation
 */
export function groupArticlesByTypeAndVariation(
  articles: Array<{
    articleType: string;
    variation: TitleVariation;
    htmlContent?: string | null;
    status: string;
    errorMessage?: string | null;
  }>
): QAExportData {
  const grouped: QAExportData = {};
  
  for (const article of articles) {
    const type = article.articleType;
    const variation = article.variation;
    
    if (!grouped[type]) {
      grouped[type] = {};
    }
    
    if (article.htmlContent) {
      grouped[type][variation] = prepareArticleData(
        article.htmlContent,
        article.status as 'complete' | 'error' | 'pending',
        article.errorMessage || undefined
      );
    }
  }
  
  return grouped;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QA EXPORT HTML GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the ARTICLE_DATA JavaScript object for the template
 */
export function generateArticleDataJS(data: QAExportData): string {
  const dataEntries: string[] = [];
  
  for (const [type, variations] of Object.entries(data)) {
    const varEntries: string[] = [];
    
    for (const [variation, articleData] of Object.entries(variations)) {
      if (articleData) {
        const escapedHtml = escapeForJavaScript(articleData.htmlContent);
        
        varEntries.push(
          `        ${variation}: { wordCount: ${articleData.wordCount}, components: ${JSON.stringify(articleData.components)}, htmlContent: \`${escapedHtml}\` }`
        );
      }
    }
    
    if (varEntries.length > 0) {
      dataEntries.push(`      '${type}': {\n${varEntries.join(',\n')}\n      }`);
    }
  }
  
  return `const ARTICLE_DATA = {\n${dataEntries.join(',\n')}\n    };`;
}

/**
 * Generate the complete QA export HTML file
 */
export function generateQAExportHTML(
  data: QAExportData,
  keyword: string,
  templatePath?: string
): string {
  // Default template path - resolve from project root
  const actualTemplatePath = templatePath || path.join(process.cwd(), 'qa-export-preview.html');
  
  if (!fs.existsSync(actualTemplatePath)) {
    throw new Error(`QA export template not found: ${actualTemplatePath}`);
  }
  
  let template = fs.readFileSync(actualTemplatePath, 'utf-8');
  
  // Generate new ARTICLE_DATA
  const newArticleData = generateArticleDataJS(data);
  
  // Replace the ARTICLE_DATA block in the template
  // Match the pattern: const ARTICLE_DATA = { ... };
  template = template.replace(
    /const ARTICLE_DATA = \{[\s\S]*?\n    \};/,
    newArticleData
  );
  
  // Replace keyword throughout the template
  template = replaceKeywordInTemplate(template, 'air fryers', keyword);
  
  // Update the export title/meta
  template = template.replace(
    /<title>.*?<\/title>/i,
    `<title>SCAI QA Matrix Export - ${keyword}</title>`
  );
  
  return template;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QA EXPORT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a summary of the QA export data
 */
export function generateQAExportSummary(data: QAExportData): {
  totalArticles: number;
  totalWords: number;
  articlesByType: Record<string, number>;
  variationCounts: { question: number; statement: number; listicle: number };
} {
  let totalArticles = 0;
  let totalWords = 0;
  const articlesByType: Record<string, number> = {};
  const variationCounts = { question: 0, statement: 0, listicle: 0 };
  
  for (const [type, variations] of Object.entries(data)) {
    articlesByType[type] = 0;
    
    for (const [variation, articleData] of Object.entries(variations)) {
      if (articleData) {
        totalArticles++;
        totalWords += articleData.wordCount;
        articlesByType[type]++;
        variationCounts[variation as keyof typeof variationCounts]++;
      }
    }
  }
  
  return { totalArticles, totalWords, articlesByType, variationCounts };
}
