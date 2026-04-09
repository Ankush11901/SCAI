/**
 * Article Builder
 * Constructs final HTML from generated components
 * Implements three-layer naming convention:
 *   Layer 1: CSS Class (scai-{component})
 *   Layer 2: Data Attribute (data-component="scai-{type}")
 *   Layer 3: Unique ID (scai-{q|s|l}-{component}-{number})
 */

export interface ComponentContent {
  id: string
  type: string
  content: string
}

export interface ImageContent {
  id: string
  placeholder: string
  url: string
  alt: string
}

// Version prefix mapping for unique IDs
type VariationType = 'question' | 'statement' | 'listicle'
const VERSION_PREFIXES: Record<VariationType, string> = {
  question: 'q',
  statement: 's',
  listicle: 'l',
}

/**
 * Generate unique component ID based on variation type
 * Format: scai-{q|s|l}-{component}-{number}
 */
function generateComponentId(
  variation: VariationType,
  component: string,
  instanceNumber: number
): string {
  const prefix = VERSION_PREFIXES[variation] || 'q'
  return `scai-${prefix}-${component}-${instanceNumber}`
}

/**
 * Inject unique IDs into HTML content based on variation type
 * This processes generated HTML and adds scai-{version}-{component}-{number} IDs
 */
function injectUniqueIds(html: string, variation: VariationType): string {
  // Track instance counts for each component type
  const instanceCounts: Record<string, number> = {}

  // Regex to find elements with data-component attribute but no id
  const componentRegex = /<([a-z0-9]+)(\s+[^>]*?data-component="([^"]+)"[^>]*?)(?:\s*>)/gi

  return html.replace(componentRegex, (match, tag, attrs, componentType) => {
    // Skip if already has an id
    if (attrs.includes(' id=')) {
      return match
    }

    // Normalize component type for ID generation
    const componentId = componentType.replace(/\s+/g, '-').toLowerCase()

    // Track instance number
    instanceCounts[componentId] = (instanceCounts[componentId] || 0) + 1
    const instanceNum = instanceCounts[componentId]

    // Generate unique ID
    const uniqueId = generateComponentId(variation, componentId, instanceNum)

    // Insert id attribute after the tag name
    return `<${tag} id="${uniqueId}"${attrs}>`
  })
}

/**
 * Build complete HTML article from components
 */
export function buildHtml(
  components: ComponentContent[],
  images: ImageContent[],
  title: string,
  articleType: string,
  variation: VariationType = 'question',
  metaTitle?: string,
  metaDescription?: string
): string {
  // Start with the article content
  let html = components.map(c => c.content).join('\n\n')

  // Replace image placeholders with actual images
  for (const image of images) {
    html = html.replace(
      new RegExp(`\\[IMAGE_PLACEHOLDER:${escapeRegExp(image.placeholder)}\\]`, 'g'),
      image.url
    )
  }

  // Inject unique IDs based on variation type
  html = injectUniqueIds(html, variation)

  // Get version prefix for article-level ID
  const versionPrefix = VERSION_PREFIXES[variation] || 'q'

  // Wrap in full HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="SCAI Article Generator">
  <meta name="article-type" content="${articleType}">
  <meta name="variation-type" content="${variation}">
  ${metaDescription ? `<meta name="description" content="${escapeHtml(metaDescription)}">` : ''}
  <title>${escapeHtml(metaTitle || title)}</title>
  
  <!-- SCAI Article Styles -->
  <style>
    ${getArticleStyles()}
  </style>
</head>
<body>
  <article id="scai-${versionPrefix}-article-1" class="scai-article" data-article-type="${articleType}" data-variation="${variation}">
    ${html}
  </article>
</body>
</html>`
}

/**
 * Get embedded CSS styles for articles
 */
function getArticleStyles(): string {
  return `
    /* SCAI Article Base Styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.8;
      color: #111827;
      background: #ffffff;
    }

    .scai-article {
      max-width: 768px;
      margin: 0 auto;
      padding: 40px 0;
    }

    /* Typography */
    .scai-h1 {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 2.5rem;
      font-weight: 900;
      line-height: 1.1;
      color: #000000;
      margin-bottom: 1.5rem;
      letter-spacing: -0.03em;
    }

    .scai-h2 {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.2;
      color: #000000;
      margin-top: 2.5rem;
      margin-bottom: 1.25rem;
      letter-spacing: -0.02em;
    }

    .scai-h3 {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .scai-paragraph {
      font-size: 1.1rem;
      color: #171717;
      margin-bottom: 1.5rem;
    }

    /* Images */
    .scai-featured-image {
      margin: 2rem 0;
    }

    .scai-featured-image img {
      width: 100%;
      height: auto;
      border-radius: 4px;
      filter: grayscale(100%);
    }

    .scai-h2-image {
      margin: 1.5rem 0;
    }

    .scai-h2-image img {
      width: 100%;
      max-width: 600px;
      height: auto;
      border-radius: 4px;
      filter: grayscale(100%);
    }

    .scai-image-caption {
      font-size: 0.875rem;
      color: #404040;
      text-align: center;
      margin-top: 0.5rem;
      font-style: italic;
    }

    /* Table of Contents */
    .scai-toc {
      background: #ffffff;
      border: 1px solid #171717;
      border-radius: 0;
      padding: 1.5rem;
      margin: 2rem 0;
    }

    .scai-toc-title {
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .scai-toc-list {
      list-style: decimal;
      padding-left: 1.5rem;
    }

    .scai-toc-list li {
      margin-bottom: 0.5rem;
      color: #404040;
    }

    .scai-toc-list a {
      color: #000000;
      text-decoration: none;
      border-bottom: 1px solid #e5e7eb;
      transition: border-color 0.2s;
    }

    .scai-toc-list a:hover {
      border-bottom-color: #000000;
    }

    /* FAQ */
    .scai-faq {
      margin: 2.5rem 0;
    }

    .scai-faq-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.75rem;
      font-weight: 800;
      color: #000000;
      margin-bottom: 1.5rem;
    }

    .scai-faq-item {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .scai-faq-item:last-child {
      border-bottom: none;
    }

    .scai-faq-question {
      font-family: 'Inter', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: #000000;
      margin-bottom: 0.5rem;
    }

    .scai-faq-answer {
      color: #171717;
      font-size: 1rem;
    }

    /* Product Card */
    .scai-product-card {
      background: #ffffff;
      border: 1px solid #171717;
      border-radius: 4px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }

    .scai-product-card--horizontal {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
    }

    .scai-product-image {
      flex-shrink: 0;
      width: 150px;
      height: 150px;
      border-radius: 0;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    .scai-product-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: grayscale(100%);
    }

    .scai-product-details {
      flex: 1;
    }

    .scai-product-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #000000;
      background: #f3f4f6;
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      border: 1px solid #e5e7eb;
    }

    .scai-product-name {
      font-family: 'Inter', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.5rem;
    }

    .scai-product-description {
      font-size: 0.95rem;
      color: #404040;
      margin-bottom: 1rem;
    }

    .scai-product-rating {
      font-size: 0.875rem;
      color: #000000;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .scai-amazon-button {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0;
      text-decoration: none;
      border: 1px solid #000000;
      transition: all 0.2s;
    }

    .scai-amazon-button:hover {
      background: #ffffff;
      color: #000000;
    }

    /* Pros & Cons */
    .scai-pros-cons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .scai-pros,
    .scai-cons {
      padding: 1.25rem;
      border-radius: 0;
    }

    .scai-pros {
      background: #ffffff;
      border: 1px solid #171717;
    }

    .scai-cons {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }

    .scai-pros-title,
    .scai-cons-title {
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .scai-pros-title {
      color: #000000;
    }

    .scai-cons-title {
      color: #404040;
    }

    .scai-pros ul,
    .scai-cons ul {
      list-style: none;
      padding: 0;
    }

    .scai-pros li,
    .scai-cons li {
      padding: 0.25rem 0;
      font-size: 0.95rem;
      color: #171717;
    }

    /* Closing Section */
    .scai-closing {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #000000;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .scai-h1 {
        font-size: 1.875rem;
      }

      .scai-h2 {
        font-size: 1.5rem;
      }

      .scai-product-card--horizontal {
        flex-direction: column;
      }

      .scai-product-image {
        width: 100%;
        height: 200px;
      }

      .scai-pros-cons {
        grid-template-columns: 1fr;
      }
      
      /* Why Choose Local - Stack on mobile */
      .scai-why-local-content {
        flex-direction: column;
      }
      
      .scai-why-local-image {
        width: 100%;
        max-width: 400px;
      }
    }
    
    /* ========================================== */
    /* Why Choose Local - Side by Side Layout    */
    /* ========================================== */
    .scai-why-local {
      margin: 2rem 0;
    }
    
    .scai-why-local-content {
      display: flex;
      gap: 2rem;
      align-items: flex-start;
      margin-top: 1rem;
    }
    
    .scai-why-local-image {
      flex-shrink: 0;
      width: 300px;
    }
    
    .scai-why-local-image img {
      width: 100%;
      height: auto;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      filter: grayscale(100%);
    }
    
    .scai-why-local-list {
      flex: 1;
    }
    
    .scai-why-local-list ul {
      list-style: disc;
      padding-left: 1.5rem;
      margin: 0;
    }
    
    .scai-why-local-list li {
      margin-bottom: 0.75rem;
      color: #171717;
      font-size: 1rem;
      line-height: 1.6;
    }
    
    /* ========================================== */
    /* Service Info Table (Local)                */
    /* ========================================== */
    .scai-service-info {
      background: #ffffff;
      border: 1px solid #171717;
      border-radius: 4px;
      padding: 1.25rem;
      margin: 1.5rem 0;
    }
    
    .scai-service-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    .scai-service-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.95rem;
      color: #171717;
    }
    
    .scai-service-table tr:last-child td {
      border-bottom: none;
    }
    
    .scai-service-table td:first-child {
      font-weight: 600;
      width: 40%;
    }
    
    .scai-service-table a {
      color: #171717;
      text-decoration: underline;
    }
    
    /* ========================================== */
    /* Honorable Mentions (Listicle)             */
    /* ========================================== */
    .scai-honorable-mentions {
      margin: 2rem 0;
    }
    
    .scai-honorable-item {
      margin-bottom: 1.5rem;
    }
    
    .scai-honorable-h3 {
      font-family: 'Inter', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.5rem;
    }
    
    .scai-honorable-item p {
      font-size: 1rem;
      color: #171717;
      line-height: 1.6;
    }
    
    /* ========================================== */
    /* Ingredients & Instructions (Recipe)       */
    /* ========================================== */
    .scai-ingredients,
    .scai-instructions {
      margin: 2rem 0;
    }
    
    .scai-ingredients-list,
    .scai-instructions-list {
      padding-left: 1.5rem;
      margin-top: 1rem;
    }
    
    .scai-ingredients-list li,
    .scai-instructions-list li {
      margin-bottom: 0.5rem;
      color: #171717;
      line-height: 1.6;
    }
    
    /* ========================================== */
    /* Materials Box (How-To)                    */
    /* ========================================== */
    .scai-materials-box {
      background: #ffffff;
      border: 1px solid #171717;
      padding: 1.25rem;
      margin: 1.5rem 0;
    }
    
    .scai-materials-box ul {
      list-style: disc;
      padding-left: 1.5rem;
      margin-top: 0.75rem;
    }
    
    .scai-materials-box li {
      margin-bottom: 0.5rem;
      color: #171717;
    }
  `.trim()
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

