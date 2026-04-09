/**
 * HTML to Markdown Converter
 * Converts article HTML to Markdown for CMS platforms that require it
 * (Medium, Dev.to, Hashnode)
 */

/**
 * Convert HTML content to Markdown
 * Handles common HTML elements used in generated articles
 */
export function htmlToMarkdown(html: string): string {
  let markdown = html

  // Remove script and style tags completely
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Convert headings (preserve hierarchy)
  markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
  markdown = markdown.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
  markdown = markdown.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')

  // Convert bold/strong
  markdown = markdown.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')

  // Convert italic/em
  markdown = markdown.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')

  // Convert underline to bold (no underline in standard markdown)
  markdown = markdown.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '**$1**')

  // Convert strikethrough
  markdown = markdown.replace(/<(s|strike|del)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~')

  // Convert code blocks
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    '\n```$1\n$2\n```\n'
  )
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
  markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')

  // Convert inline code
  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content.trim().split('\n')
    return '\n' + lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n'
  })

  // Convert unordered lists
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return '\n' + convertListItems(content, '-') + '\n'
  })

  // Convert ordered lists
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    return '\n' + convertOrderedListItems(content) + '\n'
  })

  // Convert images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  // Convert links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n')

  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n')

  // Remove div, span, and other container tags
  markdown = markdown.replace(/<(div|span|section|article|main|aside|nav|header|footer)[^>]*>/gi, '')
  markdown = markdown.replace(/<\/(div|span|section|article|main|aside|nav|header|footer)>/gi, '')

  // Remove figure and figcaption (keep inner content)
  markdown = markdown.replace(/<figure[^>]*>/gi, '')
  markdown = markdown.replace(/<\/figure>/gi, '')
  markdown = markdown.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, '*$1*\n')

  // Remove table elements (convert to simple format)
  markdown = convertTables(markdown)

  // Decode HTML entities
  markdown = decodeHtmlEntities(markdown)

  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  markdown = markdown.trim()

  return markdown
}

/**
 * Convert list items to markdown
 */
function convertListItems(html: string, marker: string): string {
  const items: string[] = []
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    let content = match[1].trim()
    // Remove any remaining HTML tags
    content = content.replace(/<[^>]+>/g, '')
    items.push(`${marker} ${content}`)
  }

  return items.join('\n')
}

/**
 * Convert ordered list items to markdown
 */
function convertOrderedListItems(html: string): string {
  const items: string[] = []
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match
  let index = 1

  while ((match = regex.exec(html)) !== null) {
    let content = match[1].trim()
    // Remove any remaining HTML tags
    content = content.replace(/<[^>]+>/g, '')
    items.push(`${index}. ${content}`)
    index++
  }

  return items.join('\n')
}

/**
 * Convert HTML tables to markdown tables
 */
function convertTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = []
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells: string[] = []
      const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi
      let cellMatch

      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        let content = cellMatch[2].trim()
        content = content.replace(/<[^>]+>/g, '')
        cells.push(content)
      }

      if (cells.length > 0) {
        rows.push(cells)
      }
    }

    if (rows.length === 0) return ''

    // Build markdown table
    const maxCols = Math.max(...rows.map((r) => r.length))
    let markdown = '\n'

    // Header row
    markdown += '| ' + rows[0].map((c) => c.padEnd(15)).join(' | ') + ' |\n'

    // Separator
    markdown += '| ' + Array(maxCols).fill('---------------').join(' | ') + ' |\n'

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      while (row.length < maxCols) row.push('')
      markdown += '| ' + row.map((c) => c.padEnd(15)).join(' | ') + ' |\n'
    }

    return markdown + '\n'
  })
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(html: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '-',
    '&mdash;': '--',
    '&copy;': '(c)',
    '&reg;': '(R)',
    '&trade;': '(TM)',
    '&hellip;': '...',
    '&bull;': '*',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
  }

  let result = html
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return result
}

/**
 * Extract title from HTML content
 * Looks for first H1 or first heading
 */
export function extractTitle(html: string): string | null {
  // Try H1 first
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim()
  }

  // Try any heading
  const headingMatch = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
  if (headingMatch) {
    return headingMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  return null
}

/**
 * Extract first image URL from HTML
 */
export function extractFeaturedImage(html: string): string | null {
  const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
  return imgMatch ? imgMatch[1] : null
}

/**
 * Strip all HTML tags and return plain text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Create an excerpt from HTML content
 */
export function createExcerpt(html: string, maxLength: number = 160): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3).trim() + '...'
}
