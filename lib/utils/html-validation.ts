/**
 * HTML Validation Utilities
 * Validates that generated HTML follows SCAI naming convention
 */

export interface NamingConventionIssue {
  component: string
  elementType: string
  issue: string
  severity: 'error' | 'warning'
}

/**
 * Validates that HTML follows SCAI naming convention
 * - CSS classes use scai- prefix
 * - data-component attributes present on major elements
 * - IDs follow scai-{version}-{component}-{number} format (when present)
 * 
 * Note: This is a simplified validation that checks for patterns.
 * Full DOM parsing validation would require a DOM parser library.
 */
export function validateHtmlNamingConvention(
  html: string,
  componentName: string
): NamingConventionIssue[] {
  const issues: NamingConventionIssue[] = []
  
  // Check for scai- prefixed classes
  const classMatches = html.match(/class="([^"]*)"/g) || []
  for (const match of classMatches) {
    const classes = match.match(/class="([^"]*)"/)?.[1].split(' ') || []
    const hasScaiClass = classes.some(c => c.startsWith('scai-'))
    
    if (!hasScaiClass && classes.length > 0) {
      issues.push({
        component: componentName,
        elementType: 'unknown',
        issue: `Class attribute found without scai- prefix: ${match}`,
        severity: 'error'
      })
    }
  }
  
  // Check for data-component attributes on major elements
  const majorElements = ['section', 'div', 'table', 'ul', 'ol']
  for (const tag of majorElements) {
    const tagRegex = new RegExp(`<${tag}[^>]*>`, 'g')
    const tags = html.match(tagRegex) || []
    
    for (const tagMatch of tags) {
      if (!tagMatch.includes('data-component=')) {
        issues.push({
          component: componentName,
          elementType: tag,
          issue: `${tag} element missing data-component attribute: ${tagMatch.substring(0, 50)}...`,
          severity: 'warning'
        })
      }
    }
  }
  
  // Check ID format (if IDs are present)
  const idMatches = html.match(/id="([^"]*)"/g) || []
  for (const match of classMatches) {
    const id = match.match(/id="([^"]*)"/)?.[1]
    if (id && !id.match(/^scai-[qsl]-[\w-]+-\d+$/)) {
      issues.push({
        component: componentName,
        elementType: 'unknown',
        issue: `ID does not follow scai-{version}-{component}-{number} format: ${id}`,
        severity: 'warning'
      })
    }
  }
  
  return issues
}

/**
 * Helper to generate properly formatted SCAI IDs
 */
export function generateScaiId(
  variation: 'question' | 'statement' | 'listicle',
  component: string,
  number: number
): string {
  const versionPrefix = {
    question: 'q',
    statement: 's',
    listicle: 'l'
  }[variation]
  
  return `scai-${versionPrefix}-${component}-${number}`
}
