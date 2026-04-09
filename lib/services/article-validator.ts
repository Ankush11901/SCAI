/**
 * Article Validator Service
 * Validates generated articles against documentation standards
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleStatus = 'pass' | 'warn' | 'fail'
export type RuleCategory = 'word-count' | 'char-limit' | 'structure' | 'forbidden' | 'header-consistency' | 'meta' | 'quality'
export type IssueSeverity = 'critical' | 'warning' | 'info'

export interface RuleResult {
    id: string
    name: string
    category: RuleCategory
    status: RuleStatus
    expected: string
    actual: string
    message: string
    severity?: IssueSeverity
    fixSuggestion?: string
}

export interface CategoryResult {
    category: RuleCategory
    label: string
    passed: number
    total: number
    rules: RuleResult[]
}

export interface ValidationResult {
    passed: boolean
    score: number // 0-100
    totalPassed: number
    totalRules: number
    categories: CategoryResult[]
    criticalIssues: RuleResult[]
    warnings: RuleResult[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const FORBIDDEN_WORDS_CONTENT = [
    'game-changer', 'game changer', 'revolutionize', 'revolutionary',
    'cutting-edge', 'cutting edge', 'state-of-the-art', 'state of the art',
    'synergy', 'synergize', 'paradigm', 'leverage',
    'disrupt', 'disruptive', 'innovative', 'seamless',
    'world-class', 'best-in-class', 'next-gen', 'next generation',
    'groundbreaking', 'unprecedented', 'unique', 'amazing',
    'incredible', 'unbelievable', 'spectacular', 'phenomenal'
]

const FORBIDDEN_WORDS_HEADINGS = [
    'conclusion', 'summary', 'final thoughts', 'in summary',
    'to wrap up', 'wrapping up', 'the bottom line', 'key takeaways'
]

const FORBIDDEN_STARTS_CLOSING = [
    'in conclusion', 'to summarize', 'in summary', 'finally',
    'to wrap up', "as we've discussed", "as you can see",
    'all in all', 'at the end of the day'
]

const COMPONENT_WORD_COUNTS: Record<string, { min: number; target: number; max: number }> = {
    overview: { min: 80, target: 100, max: 125 },
    standard: { min: 125, target: 150, max: 175 },
    closing: { min: 40, target: 50, max: 70 },
    faq_answer: { min: 22, target: 28, max: 35 },
    product_intro: { min: 100, target: 125, max: 150 },
    product_description: { min: 140, target: 175, max: 210 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count words in a text string (strips HTML/CSS/scripts)
 */
function countWords(text: string): number {
    const cleaned = text
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')  // Remove style blocks
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ') // Remove script blocks
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/&[a-z]+;/gi, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim()

    if (!cleaned) return 0
    return cleaned.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Get text content from HTML element(s) matching a selector pattern
 */
function getTextFromHtml(html: string, pattern: RegExp): string[] {
    const matches: string[] = []
    let match
    while ((match = pattern.exec(html)) !== null) {
        // Extract text content, removing inner HTML tags
        const content = match[1] || match[0]
        const text = content.replace(/<[^>]*>/g, '').trim()
        matches.push(text)
    }
    return matches
}

/**
 * Determine H1 type (question, statement, listicle)
 */
function detectH1Type(h1Text: string): 'question' | 'statement' | 'listicle' {
    const startsWithQuestion = /^(what|how|why|which|when|where|who|is|are|can|do|does|should|will|would)/i.test(h1Text)
    const endsWithQuestion = h1Text.trim().endsWith('?')
    // Check for listicle patterns:
    // - "5 Best..." (number + space)
    // - "1. First Topic" (number + period + space) - common H2 format
    // - "7 Ways to..." (number + keyword)
    const hasNumber = /^\d+\.?\s/.test(h1Text) || /\d+\s+(best|top|ways|tips|reasons|things|steps|methods|strategies|ideas|examples)/i.test(h1Text)

    if (hasNumber) return 'listicle'
    if (startsWithQuestion || endsWithQuestion) return 'question'
    return 'statement'
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate H1 title character limit
 */
function validateH1CharLimit(html: string): RuleResult {
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const h1Text = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : ''
    const charCount = h1Text.length

    const status: RuleStatus = charCount >= 50 && charCount <= 60 ? 'pass' :
        charCount >= 45 && charCount <= 70 ? 'warn' : 'fail'

    return {
        id: 'h1-char-limit',
        name: 'H1 Title Length',
        category: 'char-limit',
        status,
        expected: '50-60 characters',
        actual: `${charCount} characters`,
        message: status === 'pass' ? 'H1 is within range' :
            charCount < 50 ? `H1 is ${50 - charCount} chars too short` :
                `H1 is ${charCount - 60} chars too long`
    }
}

/**
 * Validate H2 headings character limits
 */
function validateH2CharLimits(html: string): RuleResult {
    const h2Matches = getTextFromHtml(html, /<h2[^>]*class="[^"]*scai-h2[^"]*"[^>]*>(.*?)<\/h2>/gi)

    if (h2Matches.length === 0) {
        // Try without class restriction
        const allH2s = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
        h2Matches.push(...allH2s)
    }

    const tooShort = h2Matches.filter(h2 => h2.length < 50)
    const tooLong = h2Matches.filter(h2 => h2.length > 60)
    const outOfRange = tooShort.length + tooLong.length

    const status: RuleStatus = outOfRange === 0 ? 'pass' :
        outOfRange <= 2 ? 'warn' : 'fail'

    let message = 'All H2s within range'
    if (tooShort.length > 0) {
        message = `${tooShort.length} too short: "${tooShort[0].substring(0, 30)}..." (${tooShort[0].length} chars)`
    } else if (tooLong.length > 0) {
        message = `${tooLong.length} too long: "${tooLong[0].substring(0, 30)}..." (${tooLong[0].length} chars)`
    }

    return {
        id: 'h2-char-limit',
        name: 'H2 Headings Length',
        category: 'char-limit',
        status,
        expected: 'All H2s 50-60 characters',
        actual: outOfRange > 0 ? `${outOfRange}/${h2Matches.length} out of range` : `${h2Matches.length} H2s, all OK`,
        message
    }
}

/**
 * Validate FAQ H2 heading (should be ≤30 chars)
 */
function validateFaqH2(html: string): RuleResult {
    const faqSection = html.match(/<section[^>]*data-component="scai-faq"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<section[^>]*class="[^"]*scai-faq-[abc][^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<div[^>]*class="[^"]*scai-faq[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

    if (!faqSection) {
        return {
            id: 'faq-h2-limit',
            name: 'FAQ H2 Heading',
            category: 'char-limit',
            status: 'warn',
            expected: '≤30 characters',
            actual: 'FAQ section not found',
            message: 'Could not locate FAQ section'
        }
    }

    // Look for h2 or div.scai-faq-title
    const faqH2Match = faqSection[1].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
        faqSection[1].match(/<div[^>]*class="[^"]*scai-faq-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    const faqH2Text = faqH2Match ? faqH2Match[1].replace(/<[^>]*>/g, '').trim() : ''
    const charCount = faqH2Text.length

    const status: RuleStatus = charCount <= 30 ? 'pass' : charCount <= 40 ? 'warn' : 'fail'

    return {
        id: 'faq-h2-limit',
        name: 'FAQ H2 Heading',
        category: 'char-limit',
        status,
        expected: '≤30 characters',
        actual: `${charCount} characters`,
        message: status === 'pass' ? 'FAQ H2 within limit' : `"${faqH2Text.substring(0, 20)}..." is ${charCount - 30} chars over`
    }
}

/**
 * Validate FAQ answer word counts (should be 28 words each)
 */
function validateFaqAnswers(html: string): RuleResult {
    // Look for FAQ answer patterns - p or div with scai-faq-answer class
    const faqAnswerPattern = /<(?:p|div)[^>]*class="[^"]*scai-faq-answer[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi
    let answers = getTextFromHtml(html, faqAnswerPattern)

    // Fallback: look for paragraphs in FAQ section
    if (answers.length === 0) {
        const faqSection = html.match(/<section[^>]*(?:data-component="scai-faq"|class="[^"]*scai-faq-[abc][^"]*")[^>]*>([\s\S]*?)<\/section>/i) ||
            html.match(/<div[^>]*class="[^"]*scai-faq[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        if (faqSection) {
            const paragraphs = getTextFromHtml(faqSection[1], /<p[^>]*>([\s\S]*?)<\/p>/gi)
            answers = paragraphs
        }
    }

    if (answers.length === 0) {
        return {
            id: 'faq-answer-words',
            name: 'FAQ Answer Word Count',
            category: 'word-count',
            status: 'warn',
            expected: '28 words each',
            actual: 'No FAQ answers found',
            message: 'Could not locate FAQ answers'
        }
    }

    const wordCounts = answers.map(a => countWords(a))
    const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    // ±10% tolerance: Target 28 words, pass 25-31, warn 22-34
    const outOfRange = wordCounts.filter(w => w < 25 || w > 31)
    const warnOutOfRange = wordCounts.filter(w => w < 22 || w > 34)

    const status: RuleStatus = outOfRange.length === 0 ? 'pass' :
        warnOutOfRange.length === 0 || outOfRange.length <= 2 ? 'warn' : 'fail'

    return {
        id: 'faq-answer-words',
        name: 'FAQ Answer Word Count',
        category: 'word-count',
        status,
        expected: '28 words each (±10%)',
        actual: `${answers.length} answers, avg ${avgWords} words`,
        message: outOfRange.length > 0 ?
            `${outOfRange.length} answers outside 25-31 word range` :
            'All FAQ answers within range'
    }
}

/**
 * Validate FAQ question count (should be exactly 5)
 */
function validateFaqCount(html: string): RuleResult {
    // Count FAQ H3s - match both scai-faq-question and scai-faq-h3 classes (hydrator uses scai-faq-h3)
    const faqQuestionPattern = /<h3[^>]*class="[^"]*(?:scai-faq-question|scai-faq-h3)[^"]*"[^>]*>/gi
    const questionMatches = html.match(faqQuestionPattern) || []

    // Fallback: count H3s in FAQ section (look for data-component="scai-faq" or scai-faq class)
    let count = questionMatches.length
    if (count === 0) {
        const faqSection = html.match(/<section[^>]*(?:data-component="scai-faq"|class="[^"]*scai-faq(?:-[abc])?[^"]*")[^>]*>([\s\S]*?)<\/section>/i) ||
            html.match(/<div[^>]*class="[^"]*scai-faq[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        if (faqSection) {
            const h3s = faqSection[1].match(/<h3[^>]*>/gi) || []
            count = h3s.length
        }
    }

    const status: RuleStatus = count === 5 ? 'pass' : count >= 4 && count <= 6 ? 'warn' : 'fail'

    return {
        id: 'faq-count',
        name: 'FAQ Question Count',
        category: 'structure',
        status,
        expected: '5 questions',
        actual: `${count} questions`,
        message: count === 5 ? 'Correct FAQ count' : `Expected 5, found ${count}`
    }
}

/**
 * Validate overview paragraph word count (should be ~100 words)
 */
function validateOverviewParagraph(html: string): RuleResult {
    // Method 1: Find overview section with data-component="scai-overview" or class="scai-overview"
    let overviewSection = html.match(/<section[^>]*(?:data-component="scai-overview"|class="[^"]*scai-overview[^"]*")[^>]*>([\s\S]*?)<\/section>/i)

    // Method 2: Fallback - content between H1/figure close and first h2/section/toc
    if (!overviewSection) {
        overviewSection = html.match(/<\/h1>([\s\S]*?)(?:<section[^>]*(?:id="section|data-component="(?!scai-overview))|<h2|<nav[^>]*class="[^"]*scai-toc)/i) ||
            html.match(/<\/figure>([\s\S]*?)(?:<section[^>]*(?:id="section|data-component="(?!scai-overview))|<h2|<nav[^>]*class="[^"]*scai-toc)/i)
    }

    if (!overviewSection) {
        return {
            id: 'overview-words',
            name: 'Overview Paragraph',
            category: 'word-count',
            status: 'warn',
            expected: '100 words (2×50)',
            actual: 'Not found',
            message: 'Could not locate overview section'
        }
    }

    // Extract all paragraphs from overview section
    const overviewHtml = overviewSection[1]
    const overviewParagraphs = getTextFromHtml(overviewHtml, /<p[^>]*>([\s\S]*?)<\/p>/gi)
    const overviewText = overviewParagraphs.join(' ')
    const wordCount = countWords(overviewText)

    // ±10% tolerance: Target 100 words, pass 90-110, warn 80-120
    const status: RuleStatus = wordCount >= 90 && wordCount <= 110 ? 'pass' :
        wordCount >= 80 && wordCount <= 120 ? 'warn' : 'fail'

    return {
        id: 'overview-words',
        name: 'Overview Paragraph',
        category: 'word-count',
        status,
        expected: '100 words (±10%)',
        actual: `${wordCount} words`,
        message: status === 'pass' ? 'Overview within range' :
            wordCount < 90 ? `${90 - wordCount} words under target` : `${wordCount - 110} words over target`
    }
}

/**
 * Validate standard paragraph word counts (should be ~150 words)
 */
function validateStandardParagraphs(html: string): RuleResult {
    // Find paragraphs in H2 sections (not overview, not closing, not FAQ)
    const sectionPattern = /<section[^>]*id="section-\d+"[^>]*>([\s\S]*?)<\/section>/gi
    const sections: string[] = []
    let match
    while ((match = sectionPattern.exec(html)) !== null) {
        sections.push(match[1])
    }

    if (sections.length === 0) {
        return {
            id: 'standard-para-words',
            name: 'Standard Paragraphs',
            category: 'word-count',
            status: 'warn',
            expected: '150 words (3×50) per section',
            actual: 'No standard sections found',
            message: 'Could not locate standard sections'
        }
    }

    // Count total words PER SECTION (not per individual paragraph)
    // Each section should have ~150 words across all its paragraphs
    const sectionWordCounts: number[] = []
    for (const section of sections) {
        const pMatches = getTextFromHtml(section, /<p[^>]*>(.*?)<\/p>/gi)
        const sectionText = pMatches.join(' ')
        const sectionWords = countWords(sectionText)
        if (sectionWords > 0) {
            sectionWordCounts.push(sectionWords)
        }
    }

    if (sectionWordCounts.length === 0) {
        return {
            id: 'standard-para-words',
            name: 'Standard Paragraphs',
            category: 'word-count',
            status: 'warn',
            expected: '150 words (3×50) per section',
            actual: 'No content in sections',
            message: 'Sections have no paragraph content'
        }
    }

    const avgWords = Math.round(sectionWordCounts.reduce((a, b) => a + b, 0) / sectionWordCounts.length)
    const outOfRange = sectionWordCounts.filter(w => w < 135 || w > 165)

    // ±10% tolerance: Target 150 words, pass 135-165, warn 120-180
    const status: RuleStatus = avgWords >= 135 && avgWords <= 165 ? 'pass' :
        avgWords >= 120 && avgWords <= 180 ? 'warn' : 'fail'

    return {
        id: 'standard-para-words',
        name: 'Standard Paragraphs',
        category: 'word-count',
        status,
        expected: '150 words (±10%) per section',
        actual: `${sectionWordCounts.length} sections, avg ${avgWords} words/section`,
        message: status === 'pass' ? 'Sections within range' :
            `Average is ${Math.abs(avgWords - 150)} words ${avgWords < 150 ? 'under' : 'over'} target per section`
    }
}

/**
 * Validate header consistency (H2s should match H1 format)
 * EXEMPTIONS: 
 * - Component H2s (Features, Pros/Cons, Rating, FAQ) detected by data-component attribute
 * - Closing H2 detected by data-component="scai-closing" attribute
 * - For LISTICLE: Component and closing H2s are NOT numbered (they're structural, not list items)
 */
function validateSectionParagraphStructure(html: string): RuleResult {
    // Find sections with data-component="scai-section" or id="section-N"
    const sectionPattern = /<section[^>]*(?:id="section-\d+"|data-component="scai-section")[^>]*>([\s\S]*?)<\/section>/gi
    const sections: Array<{ index: number; paragraphCount: number; charCounts: number[] }> = []
    let match
    let index = 0

    while ((match = sectionPattern.exec(html)) !== null) {
        const sectionHtml = match[1]
        // Find all paragraph tags in the section
        const paragraphMatches = sectionHtml.match(/<p[^>]*class="[^"]*scai-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi) || []

        const charCounts: number[] = []
        for (const pTag of paragraphMatches) {
            const textMatch = pTag.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
            if (textMatch) {
                const text = textMatch[1].replace(/<[^>]*>/g, '').trim()
                charCounts.push(text.length)
            }
        }

        sections.push({
            index,
            paragraphCount: charCounts.length,
            charCounts
        })
        index++
    }

    if (sections.length === 0) {
        return {
            id: 'section-paragraph-structure',
            name: 'Section Paragraph Structure',
            category: 'structure',
            status: 'warn',
            expected: '3 paragraphs per section (250-300 chars each)',
            actual: 'No sections found',
            message: 'Could not locate standard sections'
        }
    }

    // Check each section for 3 paragraphs with 250-300 char target
    const issues: string[] = []
    let correctStructureCount = 0

    for (const section of sections) {
        const { index: sIdx, paragraphCount, charCounts } = section

        // Check paragraph count
        if (paragraphCount !== 3) {
            issues.push(`Section ${sIdx + 1}: ${paragraphCount} paragraphs (expected 3)`)
        } else {
            // Check character counts (200-400 char tolerance for flexibility with word count compliance)
            const outOfRange = charCounts.filter(c => c < 200 || c > 400)
            if (outOfRange.length > 0) {
                issues.push(`Section ${sIdx + 1}: ${outOfRange.length} paragraph(s) outside 200-400 char range`)
            } else {
                correctStructureCount++
            }
        }
    }

    const allCorrect = correctStructureCount === sections.length
    const status: RuleStatus = allCorrect ? 'pass' :
        correctStructureCount >= sections.length * 0.7 ? 'warn' : 'fail'

    return {
        id: 'section-paragraph-structure',
        name: 'Section Paragraph Structure',
        category: 'structure',
        status,
        expected: '3 paragraphs per section (250-300 chars each)',
        actual: `${correctStructureCount}/${sections.length} sections correctly structured`,
        message: allCorrect ? 'All sections have proper 3-paragraph structure' :
            issues.slice(0, 3).join('; ') + (issues.length > 3 ? ` (+${issues.length - 3} more)` : ''),
        fixSuggestion: allCorrect ? undefined : 'Regenerate sections to ensure 3 paragraphs with 250-300 characters each'
    }
}

/**
 * Validate header consistency (H2s should match H1 format)
 * EXEMPTIONS: 
 * - Component H2s (Features, Pros/Cons, Rating, FAQ) detected by data-component attribute
 * - Closing H2 detected by data-component="scai-closing" attribute
 * - For LISTICLE: Component and closing H2s are NOT numbered (they're structural, not list items)
 */
function validateHeaderConsistency(html: string, articleType?: string): RuleResult {
    // Get H1
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const h1Text = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : ''
    const h1Type = detectH1Type(h1Text)

    // Extract H2s with their surrounding HTML context to detect component sections
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi
    const allH2s: Array<{ text: string; isComponent: boolean }> = []
    let h2Match
    while ((h2Match = h2Regex.exec(html)) !== null) {
        const h2Text = h2Match[1].replace(/<[^>]*>/g, '').trim()
        const beforeH2 = html.substring(0, h2Match.index)

        // Check if H2 is inside a component section by looking for data-component attribute
        const lastComponentOpen = Math.max(
            beforeH2.lastIndexOf('data-component="scai-feature-section"'),
            beforeH2.lastIndexOf('data-component="scai-pros-cons-section"'),
            beforeH2.lastIndexOf('data-component="scai-rating-section"'),
            beforeH2.lastIndexOf('data-component="scai-faq-section"'),
            beforeH2.lastIndexOf('data-component="scai-faq"'),
            beforeH2.lastIndexOf('data-component="scai-closing"')
        )

        const lastSectionClose = beforeH2.lastIndexOf('</section>')
        const lastDivClose = beforeH2.lastIndexOf('</div>')

        // H2 is a component if it's inside a component section that hasn't been closed
        const isComponent = lastComponentOpen > -1 &&
            lastComponentOpen > lastSectionClose &&
            lastComponentOpen > lastDivClose

        allH2s.push({ text: h2Text, isComponent })
    }

    // Filter out component H2s from consistency check
    const h2Matches = allH2s.filter(h2 => !h2.isComponent).map(h2 => h2.text)

    let consistentCount = 0
    for (const h2 of h2Matches) {
        const h2Type = detectH1Type(h2)
        // For listicle article types, numbered H2s (listicle type) are always consistent
        // regardless of the H1 format variation (statement, question, or listicle)
        if (h2Type === h1Type) {
            consistentCount++
        } else if (articleType === 'listicle' && h2Type === 'listicle') {
            consistentCount++
        }
    }

    const percentage = h2Matches.length > 0 ? Math.round((consistentCount / h2Matches.length) * 100) : 0
    const status: RuleStatus = percentage >= 80 ? 'pass' : percentage >= 60 ? 'warn' : 'fail'

    const exemptedCount = allH2s.length - h2Matches.length

    return {
        id: 'header-consistency',
        name: 'Header Consistency',
        category: 'header-consistency',
        status,
        expected: `All H2s match H1 type (${h1Type})`,
        actual: `${consistentCount}/${h2Matches.length} consistent (${percentage}%)${exemptedCount > 0 ? ` [${exemptedCount} component]` : ''}`,
        message: status === 'pass' ? 'Headers are consistent' :
            `H1 is ${h1Type}, but ${h2Matches.length - consistentCount} H2s don't match`
    }
}

/**
 * Validate no forbidden conclusion words
 */
function validateForbiddenHeadings(html: string): RuleResult {
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)

    const violations: string[] = []
    for (const h2 of h2Matches) {
        const lowerH2 = h2.toLowerCase()
        for (const forbidden of FORBIDDEN_WORDS_HEADINGS) {
            if (lowerH2.includes(forbidden)) {
                violations.push(`"${h2.substring(0, 30)}..." contains "${forbidden}"`)
                break
            }
        }
    }

    const status: RuleStatus = violations.length === 0 ? 'pass' : 'fail'

    return {
        id: 'forbidden-headings',
        name: 'Forbidden H2 Words',
        category: 'forbidden',
        status,
        expected: 'No "Conclusion", "Summary", etc.',
        actual: violations.length === 0 ? 'No violations' : `${violations.length} violation(s)`,
        message: violations.length > 0 ? violations[0] : 'No forbidden words found',
        severity: violations.length > 0 ? 'critical' : undefined,
        fixSuggestion: violations.length > 0 ? 'Rename heading to avoid summary/conclusion words' : undefined
    }
}

/**
 * Validate H2 headings don't contain "and" or "or" conjunctions
 */
function validateH2Conjunctions(html: string): RuleResult {
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)

    const violations: string[] = []
    for (const h2 of h2Matches) {
        // Check for standalone "and" or "or" (word boundaries)
        if (/\band\b/i.test(h2)) {
            violations.push(`"${h2.substring(0, 30)}..." contains "and"`)
        } else if (/\bor\b/i.test(h2)) {
            violations.push(`"${h2.substring(0, 30)}..." contains "or"`)
        }
    }

    const status: RuleStatus = violations.length === 0 ? 'pass' : 'fail'

    return {
        id: 'h2-no-conjunctions',
        name: 'H2 No Conjunctions',
        category: 'forbidden',
        status,
        expected: 'No "and" or "or" in H2s',
        actual: violations.length === 0 ? 'No violations' : `${violations.length} violation(s)`,
        message: violations.length > 0 ? violations[0] : 'No conjunctions found in H2s',
        severity: violations.length > 0 ? 'warning' : undefined,
        fixSuggestion: violations.length > 0 ? 'Split into separate H2s or rephrase' : undefined
    }
}

/**
 * Validate H2 headings don't contain colons
 */
function validateH2Colons(html: string): RuleResult {
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)

    const violations: string[] = []
    for (const h2 of h2Matches) {
        if (h2.includes(':')) {
            violations.push(`"${h2.substring(0, 30)}..." contains colon`)
        }
    }

    const status: RuleStatus = violations.length === 0 ? 'pass' : 'fail'

    return {
        id: 'h2-no-colons',
        name: 'H2 No Colons',
        category: 'forbidden',
        status,
        expected: 'No colons in H2s',
        actual: violations.length === 0 ? 'No violations' : `${violations.length} violation(s)`,
        message: violations.length > 0 ? violations[0] : 'No colons found in H2s',
        severity: violations.length > 0 ? 'warning' : undefined,
        fixSuggestion: violations.length > 0 ? 'Remove colon and rephrase heading' : undefined
    }
}

/**
 * Validate closing paragraph doesn't start with forbidden phrases
 */
function validateClosingParagraph(html: string): RuleResult {
    // Try to find closing section - check for data-component or scai-closing class
    const closingSection = html.match(/<section[^>]*data-component="scai-closing"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<section[^>]*class="[^"]*scai-closing[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<div[^>]*class="[^"]*scai-closing[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

    let closingPara = ''
    if (closingSection) {
        const pMatch = closingSection[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i)
        closingPara = pMatch ? pMatch[1].replace(/<[^>]*>/g, '').trim() : ''
    }

    if (!closingPara) {
        return {
            id: 'closing-para-start',
            name: 'Closing Paragraph Start',
            category: 'forbidden',
            status: 'warn',
            expected: 'No forbidden starting phrases',
            actual: 'Closing section not found',
            message: 'Could not locate closing paragraph'
        }
    }

    const lowerPara = closingPara.toLowerCase()
    const violation = FORBIDDEN_STARTS_CLOSING.find(phrase => lowerPara.startsWith(phrase))
    const status: RuleStatus = violation ? 'fail' : 'pass'

    return {
        id: 'closing-para-start',
        name: 'Closing Paragraph Start',
        category: 'forbidden',
        status,
        expected: 'No forbidden starting phrases',
        actual: violation ? `Starts with "${violation}"` : 'OK',
        message: violation ? `Closing starts with "${violation}" - not allowed` : 'Closing paragraph starts correctly',
        severity: violation ? 'critical' : undefined,
        fixSuggestion: violation ? 'Start with an action-oriented or benefit-focused sentence' : undefined
    }
}

/**
 * Validate closing paragraph word count (should be ~50 words)
 */
function validateClosingParagraphWordCount(html: string): RuleResult {
    const closingSection = html.match(/<section[^>]*data-component="scai-closing"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<section[^>]*class="[^"]*scai-closing[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
        html.match(/<div[^>]*class="[^"]*scai-closing[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

    if (!closingSection) {
        return {
            id: 'closing-para-words',
            name: 'Closing Paragraph Word Count',
            category: 'word-count',
            status: 'warn',
            expected: '50 words',
            actual: 'Closing section not found',
            message: 'Could not locate closing paragraph'
        }
    }

    const pMatches = getTextFromHtml(closingSection[1], /<p[^>]*>([\s\S]*?)<\/p>/gi)
    const closingText = pMatches.join(' ')
    const wordCount = countWords(closingText)

    // ±10% tolerance: Target 50 words, pass 45-55, warn 40-60
    const status: RuleStatus = wordCount >= 45 && wordCount <= 55 ? 'pass' :
        wordCount >= 40 && wordCount <= 60 ? 'warn' : 'fail'

    return {
        id: 'closing-para-words',
        name: 'Closing Paragraph Word Count',
        category: 'word-count',
        status,
        expected: '50 words (±10%)',
        actual: `${wordCount} words`,
        message: status === 'pass' ? 'Closing paragraph within range' :
            wordCount < 45 ? `${45 - wordCount} words under target` : `${wordCount - 55} words over target`
    }
}

/**
 * Validate content quality - check for overused/forbidden content words
 */
function validateContentQuality(html: string): RuleResult {
    const textContent = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .toLowerCase()

    const foundWords: string[] = []
    for (const word of FORBIDDEN_WORDS_CONTENT) {
        if (textContent.includes(word.toLowerCase())) {
            foundWords.push(word)
        }
    }

    const status: RuleStatus = foundWords.length === 0 ? 'pass' :
        foundWords.length <= 2 ? 'warn' : 'fail'

    return {
        id: 'content-quality',
        name: 'Content Quality Words',
        category: 'quality',
        status,
        expected: 'No overused marketing buzzwords',
        actual: foundWords.length === 0 ? 'Clean' : `${foundWords.length} found`,
        message: foundWords.length > 0 ?
            `Found: ${foundWords.slice(0, 3).join(', ')}${foundWords.length > 3 ? '...' : ''}` :
            'No overused words found',
        severity: foundWords.length > 2 ? 'warning' : undefined,
        fixSuggestion: foundWords.length > 0 ? 'Replace with specific, factual language' : undefined
    }
}

/**
 * Validate meta title (if present)
 */
function validateMetaTitle(html: string): RuleResult {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    if (!title) {
        return {
            id: 'meta-title',
            name: 'Meta Title',
            category: 'meta',
            status: 'warn',
            expected: '50-60 characters',
            actual: 'No title tag found',
            message: 'Add a <title> tag for SEO'
        }
    }

    const charCount = title.length
    const status: RuleStatus = charCount >= 50 && charCount <= 60 ? 'pass' :
        charCount >= 40 && charCount <= 70 ? 'warn' : 'fail'

    return {
        id: 'meta-title',
        name: 'Meta Title',
        category: 'meta',
        status,
        expected: '50-60 characters',
        actual: `${charCount} characters`,
        message: status === 'pass' ? 'Title within optimal range' :
            charCount < 50 ? 'Title too short for SEO' : 'Title may be truncated in search results',
        fixSuggestion: status !== 'pass' ? 'Aim for 50-60 characters including keyword' : undefined
    }
}

/**
 * Validate meta title has no colons
 */
function validateMetaTitleNoColons(html: string): RuleResult {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    if (!title) {
        return {
            id: 'meta-title-no-colons',
            name: 'Meta Title No Colons',
            category: 'meta',
            status: 'pass',
            expected: 'No colons in title',
            actual: 'No title tag',
            message: 'No title to check'
        }
    }

    const hasColon = title.includes(':')
    const status: RuleStatus = hasColon ? 'fail' : 'pass'

    return {
        id: 'meta-title-no-colons',
        name: 'Meta Title No Colons',
        category: 'meta',
        status,
        expected: 'No colons in title',
        actual: hasColon ? 'Contains colon' : 'No colons',
        message: hasColon ? 'Meta title should not contain colons' : 'Meta title format is correct',
        fixSuggestion: hasColon ? 'Remove colon and rephrase title' : undefined
    }
}

/**
 * Validate meta description (if present)
 */
function validateMetaDescription(html: string): RuleResult {
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
    const desc = descMatch ? descMatch[1].trim() : ''

    if (!desc) {
        return {
            id: 'meta-description',
            name: 'Meta Description',
            category: 'meta',
            status: 'warn',
            expected: '150-160 characters',
            actual: 'No meta description found',
            message: 'Add a meta description for SEO'
        }
    }

    const charCount = desc.length
    const status: RuleStatus = charCount >= 150 && charCount <= 160 ? 'pass' :
        charCount >= 120 && charCount <= 180 ? 'warn' : 'fail'

    return {
        id: 'meta-description',
        name: 'Meta Description',
        category: 'meta',
        status,
        expected: '150-160 characters',
        actual: `${charCount} characters`,
        message: status === 'pass' ? 'Description within optimal range' :
            charCount < 150 ? 'Description too short' : 'Description may be truncated',
        fixSuggestion: status !== 'pass' ? 'Aim for 150-160 characters with compelling CTA' : undefined
    }
}

/**
 * Validate featured image alt text (100-125 characters, no "Image of" prefix)
 */
function validateFeaturedImageAlt(html: string): RuleResult {
    // Look for featured image with scai-featured-image class
    const featuredImgMatch = html.match(/<img[^>]*class="[^"]*scai-featured-image[^"]*"[^>]*alt="([^"]*)"[^>]*>/i) ||
        html.match(/<img[^>]*alt="([^"]*)"[^>]*class="[^"]*scai-featured-image[^"]*"[^>]*>/i) ||
        html.match(/<figure[^>]*class="[^"]*scai-featured-image[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"[^>]*>/i)

    if (!featuredImgMatch) {
        return {
            id: 'featured-img-alt',
            name: 'Featured Image Alt Text',
            category: 'meta',
            status: 'warn',
            expected: '100-125 characters, no "Image of"',
            actual: 'Featured image not found',
            message: 'Could not locate featured image'
        }
    }

    const altText = featuredImgMatch[1]
    const charCount = altText.length
    const hasImageOfPrefix = /^(image of|picture of|photo of)/i.test(altText.trim())

    let status: RuleStatus = 'pass'
    let message = 'Alt text is correct'

    if (hasImageOfPrefix) {
        status = 'fail'
        message = 'Alt text should not start with "Image of", "Picture of", etc.'
    } else if (charCount < 100 || charCount > 125) {
        status = charCount >= 80 && charCount <= 150 ? 'warn' : 'fail'
        message = charCount < 100 ? `Alt text too short (${100 - charCount} chars under)` : `Alt text too long (${charCount - 125} chars over)`
    }

    return {
        id: 'featured-img-alt',
        name: 'Featured Image Alt Text',
        category: 'meta',
        status,
        expected: '100-125 characters, no "Image of"',
        actual: `${charCount} chars${hasImageOfPrefix ? ', has forbidden prefix' : ''}`,
        message,
        fixSuggestion: status !== 'pass' ? 'Write descriptive alt text (100-125 chars) without "Image of" prefix' : undefined
    }
}

/**
 * Validate H2 section image alt texts (80-100 characters)
 */
function validateH2ImageAlts(html: string): RuleResult {
    // Look for section images (images after H2s)
    const sectionImages = html.match(/<img[^>]*class="[^"]*scai-section-image[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi) ||
        html.match(/<figure[^>]*class="[^"]*scai-section-image[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"[^>]*>/gi) || []

    // Also check images within sections
    const sectionPattern = /<section[^>]*id="section-\d+"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi
    const sectionImageAlts: string[] = []
    let match
    while ((match = sectionPattern.exec(html)) !== null) {
        if (match[1]) sectionImageAlts.push(match[1])
    }

    // Extract alt texts from matched images
    const altTexts = sectionImages.map(img => {
        const altMatch = img.match(/alt="([^"]*)"/i)
        return altMatch ? altMatch[1] : ''
    }).concat(sectionImageAlts).filter(Boolean)

    if (altTexts.length === 0) {
        return {
            id: 'h2-img-alts',
            name: 'H2 Section Image Alt Texts',
            category: 'meta',
            status: 'warn',
            expected: '80-100 characters each',
            actual: 'No section images found',
            message: 'Could not locate section images'
        }
    }

    const outOfRange = altTexts.filter(alt => alt.length < 80 || alt.length > 100)
    const hasImageOfPrefix = altTexts.some(alt => /^(image of|picture of|photo of)/i.test(alt.trim()))

    let status: RuleStatus = 'pass'
    let message = 'All section image alts within range'

    if (hasImageOfPrefix) {
        status = 'fail'
        message = 'Some alt texts start with forbidden "Image of" prefix'
    } else if (outOfRange.length > 0) {
        status = outOfRange.length <= 2 ? 'warn' : 'fail'
        message = `${outOfRange.length}/${altTexts.length} alt texts outside 80-100 char range`
    }

    return {
        id: 'h2-img-alts',
        name: 'H2 Section Image Alt Texts',
        category: 'meta',
        status,
        expected: '80-100 characters each, no "Image of"',
        actual: `${altTexts.length} images, ${outOfRange.length} out of range`,
        message,
        fixSuggestion: status !== 'pass' ? 'Ensure all section image alts are 80-100 chars without "Image of" prefix' : undefined
    }
}

/**
 * Check if an H2 is inside a component section (by HTML structure)
 */
function isComponentH2(html: string, h2Text: string): boolean {
    // Detect if H2 is inside a component wrapper (scai-component, data-component, or component-specific classes)
    const componentSectionRegex = /<div[^>]*(?:class="scai-component"|data-component="[^"]*")([\s\S]*?)<\/div>/gi
    const matches = html.matchAll(componentSectionRegex)

    for (const match of matches) {
        const componentHtml = match[1]
        if (componentHtml && componentHtml.includes(h2Text)) {
            return true
        }
    }

    // Also check for specific component classes that wrap H2s
    const componentClasses = [
        'scai-feature-', 'scai-pc-', 'scai-rating-', 'scai-ing-', 'scai-inst-',
        'scai-faq-', 'scai-takeaways-', 'scai-facts-', 'scai-comparison-'
    ]

    const h2Regex = new RegExp(`<h2[^>]*>(${h2Text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})<\/h2>`, 'i')
    const h2Match = html.match(h2Regex)

    if (h2Match) {
        const beforeH2 = html.substring(Math.max(0, h2Match.index! - 200), h2Match.index!)
        return componentClasses.some(cls => beforeH2.includes(cls))
    }

    return false
}

/**
 * Validate H2 keyword density (60-70% should contain primary keyword)
 */
function validateH2KeywordDensity(html: string, keyword?: string, coreKeywords?: string[]): RuleResult {
    // Determine which keywords to use
    const keywordsToCheck = coreKeywords && coreKeywords.length > 0
        ? coreKeywords
        : keyword ? [keyword] : []

    if (keywordsToCheck.length === 0) {
        return {
            id: 'h2-keyword-density',
            name: 'H2 Keyword Density',
            category: 'quality',
            status: 'pass',
            expected: '30-60% of H2s contain keywords',
            actual: 'No keywords provided',
            message: 'Keyword check skipped'
        }
    }

    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)

    // Filter out component H2s by both pattern matching AND HTML structure
    // Component H2s are structural (Features, Pros/Cons, Rating, etc.) and may not always contain the keyword
    const componentH2Patterns = [
        'frequently asked', 'faq',
        // Feature list patterns
        'features', 'key features', 'features overview', 'top features',
        // Pros/Cons patterns (AI-generated but still structural - exclude ALL variations)
        'pros', 'cons', 'advantages', 'drawbacks', 'benefits', 'limitations', 'strengths', 'weaknesses',
        'plus', 'versus', 'worth it', 'good', 'bad', 'positives', 'negatives',
        // Rating patterns
        'rating', 'score', 'verdict', 'final score', 'our verdict', 'our rating', 'overall',
        // Recipe components
        'ingredients', 'instructions', 'nutrition', 'step-by-step',
        // Other structural components
        'key takeaways', 'quick facts', 'honorable mentions', 'why choose',
    ]

    const mainH2s = h2Matches.filter(h2 => {
        const lower = h2.toLowerCase()

        // First check: Pattern matching for common component keywords
        const matchesPattern = componentH2Patterns.some(pattern => lower.includes(pattern))
        if (matchesPattern) return false

        // Second check: Structural position (is it inside a component wrapper?)
        const isComponent = isComponentH2(html, h2)
        if (isComponent) return false

        return true
    })

    if (mainH2s.length === 0) {
        return {
            id: 'h2-keyword-density',
            name: 'H2 Keyword Density',
            category: 'quality',
            status: 'warn',
            expected: '30-60% of H2s contain keywords',
            actual: 'No H2s found',
            message: 'Could not find H2 headings'
        }
    }

    // Count H2s containing ANY of the keywords
    const h2sWithKeyword = mainH2s.filter(h2 => {
        const lowerH2 = h2.toLowerCase()
        return keywordsToCheck.some(kw => lowerH2.includes(kw.toLowerCase()))
    })

    const percentage = Math.round((h2sWithKeyword.length / mainH2s.length) * 100)

    // Use smarter density thresholds:
    // - If using extracted keywords: 20-80% (wide range for proper nouns/topics)
    // - If using full phrase fallback: 40-70% (traditional)
    const usesExtractedKeywords = coreKeywords && coreKeywords.length > 0
    const minDensity = usesExtractedKeywords ? 20 : 40
    const maxDensity = usesExtractedKeywords ? 80 : 70

    const status: RuleStatus =
        percentage >= minDensity && percentage <= maxDensity ? 'pass' :
            percentage >= (minDensity - 10) && percentage <= (maxDensity + 20) ? 'warn' :
                'fail'

    const keywordDisplay = usesExtractedKeywords
        ? `keywords (${keywordsToCheck.join(', ')})`
        : `keyword "${keywordsToCheck[0]}"`

    return {
        id: 'h2-keyword-density',
        name: 'H2 Keyword Density',
        category: 'quality',
        status,
        expected: `${minDensity}-${maxDensity}% of H2s contain ${keywordDisplay}`,
        actual: `${h2sWithKeyword.length}/${mainH2s.length} (${percentage}%)`,
        message: status === 'pass'
            ? `Good keyword presence in H2s (${percentage}%)`
            : percentage < minDensity
                ? `Add keywords to ${Math.ceil(mainH2s.length * (minDensity / 100)) - h2sWithKeyword.length} more H2s`
                : `Too many H2s with keywords (${percentage}%) - vary your headings more`,
        fixSuggestion: status !== 'pass'
            ? `Include ${keywordDisplay} naturally in ${minDensity}-${maxDensity}% of H2 headings`
            : undefined
    }
}

/**
 * Validate total article word count
 */
function validateTotalWordCount(html: string, articleType: string): RuleResult {
    const textContent = html
        // CRITICAL: Remove style and script blocks FIRST (including their content)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        // Remove HTML comments (may contain meta info)
        .replace(/<!--[\s\S]*?-->/g, ' ')
        // Remove remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Remove HTML entities
        .replace(/&[a-z]+;/gi, ' ')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()

    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length

    // Different targets per article type
    const targets: Record<string, { min: number; target: number; max: number }> = {
        informational: { min: 1000, target: 1200, max: 1500 },
        'how-to': { min: 1200, target: 1500, max: 1800 },
        affiliate: { min: 800, target: 1000, max: 2000 },
        listicle: { min: 1200, target: 1500, max: 1800 },
        comparison: { min: 1500, target: 2000, max: 2500 },
        review: { min: 1200, target: 1500, max: 1800 },
        news: { min: 600, target: 800, max: 1000 },
        local: { min: 800, target: 1000, max: 1200 },
        pillar: { min: 2500, target: 3000, max: 4000 },
        recipe: { min: 800, target: 1000, max: 1500 },
    }

    const t = targets[articleType] || targets.informational
    const status: RuleStatus = wordCount >= t.min && wordCount <= t.max ? 'pass' :
        wordCount >= t.min * 0.8 && wordCount <= t.max * 1.2 ? 'warn' : 'fail'

    return {
        id: 'total-word-count',
        name: 'Total Word Count',
        category: 'word-count',
        status,
        expected: `${t.min}-${t.max} words (target: ${t.target})`,
        actual: `${wordCount} words`,
        message: status === 'pass' ? 'Word count within range' :
            wordCount < t.min ? `${t.min - wordCount} words under minimum` :
                `${wordCount - t.max} words over maximum`
    }
}

/**
 * Validate keyword density (optional check)
 */
function validateKeywordPresence(html: string, keyword?: string, coreKeywords?: string[]): RuleResult {
    // Determine which keywords to use
    const keywordsToCheck = coreKeywords && coreKeywords.length > 0
        ? coreKeywords
        : keyword ? [keyword] : []

    if (keywordsToCheck.length === 0) {
        return {
            id: 'keyword-presence',
            name: 'Keyword Presence',
            category: 'quality',
            status: 'pass',
            expected: 'N/A',
            actual: 'No keyword provided',
            message: 'Keyword check skipped'
        }
    }

    const textContent = html
        .replace(/<[^>]*>/g, ' ')
        .toLowerCase()

    // Count total occurrences of ANY keyword
    let totalOccurrences = 0
    for (const kw of keywordsToCheck) {
        const kwLower = kw.toLowerCase()
        const count = (textContent.match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
        totalOccurrences += count
    }

    // Check in H1 (matches ANY keyword)
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const h1Text = h1Match ? h1Match[1].toLowerCase() : ''
    const inH1 = keywordsToCheck.some(kw => h1Text.includes(kw.toLowerCase()))

    // Check in first paragraph (matches ANY keyword)
    const firstPMatch = html.match(/<p[^>]*>(.*?)<\/p>/i)
    const firstP = firstPMatch ? firstPMatch[1].toLowerCase() : ''
    const inFirstP = keywordsToCheck.some(kw => firstP.includes(kw.toLowerCase()))

    const status: RuleStatus = inH1 && inFirstP && totalOccurrences >= 3 ? 'pass' :
        (inH1 || inFirstP) && totalOccurrences >= 2 ? 'warn' : 'fail'

    const keywordDisplay = coreKeywords && coreKeywords.length > 0
        ? `keywords (${coreKeywords[0]}${coreKeywords.length > 1 ? '...' : ''})`
        : `keyword "${keyword}"`

    return {
        id: 'keyword-presence',
        name: 'Keyword Presence',
        category: 'quality',
        status,
        expected: `In H1, first paragraph, 3+ occurrences of ${keywordDisplay}`,
        actual: `${totalOccurrences}x total, H1: ${inH1 ? '✓' : '✗'}, Intro: ${inFirstP ? '✓' : '✗'}`,
        message: status === 'pass' ? 'Good keyword placement' :
            !inH1 ? 'Add main keyword to H1 title' :
                !inFirstP ? 'Add main keyword to opening paragraph' : 'Increase keyword mentions',
        fixSuggestion: status !== 'pass' ? 'Naturally include extracted keywords in H1 and opening paragraph' : undefined
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTICLE-SPECIFIC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns for non-list-item H2s that should NOT be counted in listicle numbering
 */
const LISTICLE_NON_LIST_H2_PATTERNS = [
    /pros?\s*(and|&|,)?\s*cons?/i,
    /key\s*features?/i,
    /feature\s*list/i,
    /honorable\s*mentions?/i,
    /product\s*cards?/i,
    /comparison\s*table/i,
    /quick\s*(verdict|facts?|summary)/i,
    /rating|score|verdict/i,
    /specifications?|specs/i,
    /final\s*(thoughts?|verdict|takeaway|summary|word)/i,
    /conclusion|summary|wrap[- ]?up/i,
    /in\s*summary/i,
    /the\s*bottom\s*line/i,
    /our\s*verdict/i,
    /key\s*takeaways?/i,
    /wrapping\s*(it\s*)?up/i,
]

/**
 * Check if an H2 is a non-list-item (component or closing)
 */
function isNonListItemH2ForValidation(h2Text: string): boolean {
    const normalized = h2Text.toLowerCase().trim()
    return LISTICLE_NON_LIST_H2_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * Extract the number from the start of a listicle H1
 */
function extractListicleH1Number(h1: string): number | null {
    const match = h1.match(/^(\d+)\s+/)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Extract the number from the start of a listicle H2
 */
function extractListicleH2Number(h2: string): number | null {
    const match = h2.match(/^(\d+)[.:)\-\s]/)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Validate that H1 number matches the count of list-item H2s
 */
function validateListicleH1MatchesH2Count(html: string, variation: string): RuleResult {
    if (variation !== 'listicle') {
        return {
            id: 'listicle-h1-count',
            name: 'Listicle H1/H2 Count Match',
            category: 'structure',
            status: 'pass',
            expected: 'N/A (not listicle)',
            actual: 'N/A',
            message: 'Not a listicle article'
        }
    }

    // Get H1
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const h1Text = h1Match ? h1Match[1].trim() : ''
    const h1Number = extractListicleH1Number(h1Text)

    if (h1Number === null) {
        return {
            id: 'listicle-h1-count',
            name: 'Listicle H1/H2 Count Match',
            category: 'structure',
            status: 'warn',
            expected: 'H1 starting with number',
            actual: `H1: "${h1Text.substring(0, 50)}..."`,
            message: 'Listicle H1 should start with a number',
            fixSuggestion: 'Update H1 to start with the list item count (e.g., "5 Best Ways...")'
        }
    }

    // Get all H2s and filter to list-item H2s only
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
    const listItemH2s = h2Matches.filter(h2 => {
        const text = h2.trim()
        return !isNonListItemH2ForValidation(text) && extractListicleH2Number(text) !== null
    })

    const actualCount = listItemH2s.length
    const matches = h1Number === actualCount

    return {
        id: 'listicle-h1-count',
        name: 'Listicle H1/H2 Count Match',
        category: 'structure',
        status: matches ? 'pass' : 'fail',
        expected: `H1 number (${h1Number}) = list-item H2 count`,
        actual: `${actualCount} list-item H2s found`,
        message: matches ? 'H1 number matches list item count' :
            `H1 says "${h1Number}" but found ${actualCount} list-item H2s`,
        severity: matches ? undefined : 'critical',
        fixSuggestion: matches ? undefined :
            `Update H1 to start with ${actualCount} or add/remove H2 sections`
    }
}

/**
 * Validate that listicle H2s are numbered sequentially (1, 2, 3, ...)
 */
function validateListicleSequentialNumbering(html: string, variation: string): RuleResult {
    if (variation !== 'listicle') {
        return {
            id: 'listicle-sequential',
            name: 'Listicle Sequential Numbering',
            category: 'structure',
            status: 'pass',
            expected: 'N/A (not listicle)',
            actual: 'N/A',
            message: 'Not a listicle article'
        }
    }

    // Get all H2s that are list items (numbered, not component/closing)
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
    const listItemH2s = h2Matches.filter(h2 => {
        const text = h2.trim()
        return !isNonListItemH2ForValidation(text) && extractListicleH2Number(text) !== null
    })

    const numbers = listItemH2s.map(h2 => extractListicleH2Number(h2.trim())).filter(n => n !== null) as number[]

    if (numbers.length === 0) {
        return {
            id: 'listicle-sequential',
            name: 'Listicle Sequential Numbering',
            category: 'structure',
            status: 'warn',
            expected: 'Numbered H2s (1, 2, 3...)',
            actual: 'No numbered H2s found',
            message: 'Listicle should have numbered H2 sections',
            fixSuggestion: 'Add numbers to H2 headings (e.g., "1. First Item", "2. Second Item")'
        }
    }

    // Check for sequential numbering starting at 1
    const issues: string[] = []
    const seen = new Set<number>()

    for (let i = 0; i < numbers.length; i++) {
        const expected = i + 1
        const actual = numbers[i]

        if (actual !== expected) {
            issues.push(`H2 #${i + 1} has number ${actual}, expected ${expected}`)
        }

        if (seen.has(actual)) {
            issues.push(`Duplicate number ${actual}`)
        }
        seen.add(actual)
    }

    const isSequential = issues.length === 0

    return {
        id: 'listicle-sequential',
        name: 'Listicle Sequential Numbering',
        category: 'structure',
        status: isSequential ? 'pass' : 'fail',
        expected: `Sequential: 1, 2, 3, ... ${numbers.length}`,
        actual: `Found: ${numbers.join(', ')}`,
        message: isSequential ? 'H2s are numbered sequentially' : issues.join('; '),
        severity: isSequential ? undefined : 'critical',
        fixSuggestion: isSequential ? undefined : 'Renumber H2s sequentially starting from 1'
    }
}

/**
 * Validate that closing H2 is NOT numbered (even in listicle)
 */
function validateClosingH2NotNumbered(html: string, variation: string): RuleResult {
    if (variation !== 'listicle') {
        return {
            id: 'listicle-closing-not-numbered',
            name: 'Closing H2 Not Numbered',
            category: 'structure',
            status: 'pass',
            expected: 'N/A (not listicle)',
            actual: 'N/A',
            message: 'Not a listicle article'
        }
    }

    // Find the closing H2 (usually in closing section or has closing pattern)
    const closingSectionMatch = html.match(/<section[^>]*data-component="scai-closing"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/i)
    const closingH2Text = closingSectionMatch ? closingSectionMatch[1].trim() : null

    // Also check for H2s with closing patterns anywhere
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
    const closingPatternH2s = h2Matches.filter(h2 =>
        /final\s*(thoughts?|verdict|takeaway|summary|word)/i.test(h2) ||
        /conclusion|summary|wrap[- ]?up/i.test(h2) ||
        /the\s*bottom\s*line/i.test(h2) ||
        /our\s*verdict/i.test(h2)
    )

    const closingH2ToCheck = closingH2Text || closingPatternH2s[0] || null

    if (!closingH2ToCheck) {
        return {
            id: 'listicle-closing-not-numbered',
            name: 'Closing H2 Not Numbered',
            category: 'structure',
            status: 'pass',
            expected: 'Closing H2 without number',
            actual: 'No closing H2 detected',
            message: 'Could not identify closing H2 to validate'
        }
    }

    const hasNumber = extractListicleH2Number(closingH2ToCheck) !== null

    return {
        id: 'listicle-closing-not-numbered',
        name: 'Closing H2 Not Numbered',
        category: 'structure',
        status: hasNumber ? 'fail' : 'pass',
        expected: 'Closing H2 without number',
        actual: `"${closingH2ToCheck.substring(0, 40)}..."`,
        message: hasNumber ? 'Closing H2 should NOT be numbered' : 'Closing H2 correctly unnumbered',
        severity: hasNumber ? 'critical' : undefined,
        fixSuggestion: hasNumber ? 'Remove the number from the closing H2' : undefined
    }
}

/**
 * Validate listicle has odd number of items
 */
function validateListicleOddNumber(html: string, variation: string): RuleResult {
    if (variation !== 'listicle') {
        return {
            id: 'listicle-odd',
            name: 'Listicle Odd Number',
            category: 'structure',
            status: 'pass',
            expected: 'N/A (not listicle)',
            actual: 'N/A',
            message: 'Not a listicle article'
        }
    }

    // Count main item H2s (numbered ones)
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
    const numberedH2s = h2Matches.filter(h2 => /^\d+[\.\):]?\s/.test(h2.trim()))

    const count = numberedH2s.length
    const isOdd = count % 2 === 1
    const status: RuleStatus = isOdd ? 'pass' : 'fail'

    return {
        id: 'listicle-odd',
        name: 'Listicle Odd Number',
        category: 'structure',
        status,
        expected: 'Odd number (5, 7, 9, 11...)',
        actual: `${count} items`,
        message: isOdd ? 'Correct odd number of items' : `${count} is even, should be odd`
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate an article against all documentation standards
 */
export function validateArticle(
    html: string,
    articleType: string,
    variation: string,
    keyword?: string,
    coreKeywords?: string[]  // Extracted keywords for natural density validation
): ValidationResult {

    // Run all validators
    const allResults: RuleResult[] = [
        // Character limits
        validateH1CharLimit(html),
        validateH2CharLimits(html),
        validateFaqH2(html),

        // Word counts
        validateOverviewParagraph(html),
        validateStandardParagraphs(html),
        validateClosingParagraphWordCount(html),
        validateFaqAnswers(html),
        validateTotalWordCount(html, articleType),

        // Structure
        validateFaqCount(html),
        validateSectionParagraphStructure(html),
        validateListicleOddNumber(html, variation),
        validateListicleH1MatchesH2Count(html, variation),
        validateListicleSequentialNumbering(html, variation),
        validateClosingH2NotNumbered(html, variation),

        // Header consistency
        validateHeaderConsistency(html, articleType),

        // Forbidden content
        validateForbiddenHeadings(html),
        validateH2Conjunctions(html),
        validateH2Colons(html),
        validateClosingParagraph(html),

        // Quality checks
        validateContentQuality(html),
        validateKeywordPresence(html, keyword, coreKeywords),
        validateH2KeywordDensity(html, keyword, coreKeywords),

        // Meta tags & Alt text (SEO)
        validateMetaTitle(html),
        validateMetaTitleNoColons(html),
        validateMetaDescription(html),
        validateFeaturedImageAlt(html),
        validateH2ImageAlts(html),
    ]

    // Group by category
    const categoryMap: Record<RuleCategory, { label: string; rules: RuleResult[] }> = {
        'char-limit': { label: 'Character Limits', rules: [] },
        'word-count': { label: 'Word Counts', rules: [] },
        'structure': { label: 'Structure', rules: [] },
        'header-consistency': { label: 'Header Consistency', rules: [] },
        'forbidden': { label: 'Forbidden Content', rules: [] },
        'quality': { label: 'Content Quality', rules: [] },
        'meta': { label: 'SEO & Meta', rules: [] },
    }

    for (const result of allResults) {
        categoryMap[result.category].rules.push(result)
    }

    // Build category results
    const categories: CategoryResult[] = Object.entries(categoryMap).map(([cat, data]) => ({
        category: cat as RuleCategory,
        label: data.label,
        passed: data.rules.filter(r => r.status === 'pass').length,
        total: data.rules.length,
        rules: data.rules,
    }))

    // Extract critical issues and warnings
    const criticalIssues = allResults.filter(r => r.severity === 'critical' || (r.status === 'fail' && r.category === 'forbidden'))
    const warnings = allResults.filter(r => r.status === 'warn' || r.severity === 'warning')

    // Calculate overall score
    const totalRules = allResults.length
    const passedRules = allResults.filter(r => r.status === 'pass').length
    const warnRules = allResults.filter(r => r.status === 'warn').length
    const score = Math.round(((passedRules + warnRules * 0.5) / totalRules) * 100)

    return {
        passed: score >= 80 && criticalIssues.length === 0,
        score,
        totalPassed: passedRules,
        totalRules,
        categories,
        criticalIssues,
        warnings,
    }
}

/**
 * Quick validation - returns only critical issues (faster)
 */
export function quickValidate(html: string, articleType: string): { passed: boolean; issues: string[] } {
    const issues: string[] = []

    // Check H1 exists and is reasonable
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    if (!h1Match) {
        issues.push('Missing H1 title')
    } else {
        const h1Length = h1Match[1].replace(/<[^>]*>/g, '').length
        if (h1Length > 70) issues.push('H1 title too long (>70 chars)')
    }

    // Check forbidden heading words
    const h2Matches = getTextFromHtml(html, /<h2[^>]*>(.*?)<\/h2>/gi)
    for (const h2 of h2Matches) {
        const lower = h2.toLowerCase()
        if (FORBIDDEN_WORDS_HEADINGS.some(w => lower.includes(w))) {
            issues.push(`H2 contains forbidden word: "${h2.substring(0, 30)}..."`)
            break
        }
    }

    // Check has content
    const wordCount = countWords(html)
    if (wordCount < 500) {
        issues.push(`Article too short (${wordCount} words)`)
    }

    return {
        passed: issues.length === 0,
        issues
    }
}

/**
 * Get a quick summary of validation
 */
export function getValidationSummary(result: ValidationResult): string {
    if (result.criticalIssues.length > 0) {
        return `❌ ${result.criticalIssues.length} critical issue(s)`
    }
    if (result.score >= 90) return '✅ Excellent compliance'
    if (result.score >= 70) return `⚠️ ${result.warnings.length} items need attention`
    return `❌ ${result.totalRules - result.totalPassed} rules failed`
}

/**
 * Get fix suggestions for failed rules
 */
export function getFixSuggestions(result: ValidationResult): Array<{ rule: string; suggestion: string }> {
    const suggestions: Array<{ rule: string; suggestion: string }> = []

    for (const category of result.categories) {
        for (const rule of category.rules) {
            if (rule.status !== 'pass' && rule.fixSuggestion) {
                suggestions.push({
                    rule: rule.name,
                    suggestion: rule.fixSuggestion
                })
            }
        }
    }

    return suggestions
}

/**
 * Check if article can be exported (no critical issues)
 */
export function canExport(result: ValidationResult): { allowed: boolean; reason?: string } {
    if (result.criticalIssues.length > 0) {
        return {
            allowed: false,
            reason: `Cannot export: ${result.criticalIssues[0].message}`
        }
    }
    if (result.score < 50) {
        return {
            allowed: false,
            reason: `Quality score too low (${result.score}%). Fix major issues first.`
        }
    }
    return { allowed: true }
}
