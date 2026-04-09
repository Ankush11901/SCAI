/**
 * Interlinking Service
 *
 * Post-generation service that inserts internal links into article HTML.
 * Follows documented interlinking rules:
 * - Max 1 internal link per 150 words
 * - Primary link in first 200 words
 * - Anchor text variance: 20% exact, 50% semantic, 30% generic
 * - Orphan protection: "Related Reading" section if < 3 links
 *
 * Used exclusively for bulk/cluster generation - does not affect single articles.
 */

import type {
  ClusterArticle,
  InterlinkTarget,
  InterlinkingOptions,
  InterlinkingResult,
  InsertionCandidate,
  LinkDetail,
  ParsedParagraph,
} from '@/lib/types/cluster';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum words between internal links (density limit) */
const WORDS_PER_LINK = 150;

/** Position (in words) where first link should ideally appear */
const FIRST_LINK_WORD_LIMIT = 200;

/** Minimum links before adding Related Reading section */
const MIN_LINKS_BEFORE_FALLBACK = 3;

/** Number of articles to show in Related Reading */
const RELATED_READING_COUNT = 3;

/** Anchor text variance targets */
const ANCHOR_VARIANCE = {
  exact: 0.2, // 20%
  semantic: 0.5, // 50%
  generic: 0.3, // 30%
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INTERLINKING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply interlinking to an article's HTML content
 *
 * @param options - Interlinking options with HTML, word count, and targets
 * @returns Modified HTML with links inserted and stats
 */
export function applyInterlinking(options: InterlinkingOptions): InterlinkingResult {
  const {
    articleHtml,
    wordCount,
    siblingArticles,
    interlinkTargets,
    maxLinksOverride,
  } = options;

  // Calculate max links based on word count (1 per 150 words)
  const maxLinks = maxLinksOverride ?? Math.max(1, Math.floor(wordCount / WORDS_PER_LINK));

  // Parse paragraphs from HTML
  const paragraphs = extractParagraphs(articleHtml);

  // Find all insertion candidates
  const candidates = findInsertionCandidates(articleHtml, paragraphs, interlinkTargets);

  // Select links with proper variance (20/50/30 split)
  const selectedLinks = selectLinksWithVariance(candidates, maxLinks);

  // Redistribute anchor types to match the 20/50/30 variance target
  const linksToInsert = applyAnchorVariance(selectedLinks);

  // Prioritize early links (first 200 words)
  const sortedLinks = prioritizeEarlyLinks(linksToInsert);

  // Insert links into HTML (work backwards to preserve positions)
  let modifiedHtml = articleHtml;
  const linkDetails: LinkDetail[] = [];
  const linkedUrls = new Set<string>();

  // Sort by position descending to insert from end to start
  const insertionOrder = [...sortedLinks].sort((a, b) => b.position - a.position);

  for (const link of insertionOrder) {
    // Skip if we already linked to this URL
    if (linkedUrls.has(link.targetUrl)) continue;

    // Insert the link
    modifiedHtml = insertAnchorTag(modifiedHtml, link);
    linkedUrls.add(link.targetUrl);

    linkDetails.push({
      anchorText: link.phrase,
      targetUrl: link.targetUrl,
      position: link.position,
      anchorType: link.anchorType,
    });
  }

  // Check if we need Related Reading fallback
  let relatedReadingAdded = false;
  if (linkDetails.length < MIN_LINKS_BEFORE_FALLBACK) {
    modifiedHtml = addRelatedReadingSection(modifiedHtml, siblingArticles, linkedUrls);
    relatedReadingAdded = true;
  }

  return {
    modifiedHtml,
    linksInserted: linkDetails.length,
    linkDetails,
    relatedReadingAdded,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAGRAPH EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract paragraphs from HTML for link insertion
 * Only targets <p> tags, excluding content in headings, lists, or existing links
 */
export function extractParagraphs(html: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];

  // Match <p> tags with their content
  const pTagRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  let index = 0;
  let cumulativeWords = 0;

  while ((match = pTagRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const innerHtml = match[1];

    // Strip HTML tags to get plain text
    const plainText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Count words
    const words = plainText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    paragraphs.push({
      text: plainText,
      html: fullMatch,
      startPosition: match.index,
      endPosition: match.index + fullMatch.length,
      index,
      wordCount,
    });

    cumulativeWords += wordCount;
    index++;
  }

  return paragraphs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSERTION CANDIDATE FINDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find all potential positions where links could be inserted
 */
function findInsertionCandidates(
  html: string,
  paragraphs: ParsedParagraph[],
  targets: InterlinkTarget[]
): InsertionCandidate[] {
  const candidates: InsertionCandidate[] = [];
  let cumulativeWordCount = 0;

  for (const para of paragraphs) {
    // Skip if paragraph already contains links
    if (/<a\s/i.test(para.html)) {
      cumulativeWordCount += para.wordCount;
      continue;
    }

    for (const target of targets) {
      for (const phrase of target.suggestedAnchorPhrases) {
        // Find phrase matches in paragraph text (case-insensitive, whole word)
        const matches = findPhraseMatches(para.text, phrase);

        for (const match of matches) {
          // Calculate actual position in HTML
          const positionInParagraph = findPositionInHtml(para.html, match.text, match.index);

          if (positionInParagraph !== -1) {
            const absolutePosition = para.startPosition + positionInParagraph;

            // Calculate approximate word position
            const textBeforeMatch = para.text.substring(0, match.index);
            const wordsBeforeMatch = textBeforeMatch.split(/\s+/).filter(Boolean).length;
            const wordPosition = cumulativeWordCount + wordsBeforeMatch;

            candidates.push({
              phrase: match.text,
              targetUrl: target.targetUrl,
              targetTitle: target.targetTitle,
              position: absolutePosition,
              anchorType: target.anchorTextType,
              paragraphIndex: para.index,
              wordPosition,
            });
          }
        }
      }
    }

    cumulativeWordCount += para.wordCount;
  }

  return candidates;
}

/**
 * Find phrase matches in text (case-insensitive, whole word boundaries)
 * Falls back to sub-phrase matching for multi-word phrases
 */
function findPhraseMatches(
  text: string,
  phrase: string
): Array<{ text: string; index: number }> {
  // Try exact phrase match first
  const exactMatches = findExactPhraseMatches(text, phrase);
  if (exactMatches.length > 0) return exactMatches;

  // Fallback: try longest sub-phrases (minimum 3 words to avoid fragments like "tools for")
  const words = phrase.split(/\s+/);
  if (words.length >= 4) {
    // Try progressively shorter sub-phrases, longest first
    for (let len = words.length - 1; len >= 3; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const subPhrase = words.slice(start, start + len).join(' ');
        const subMatches = findExactPhraseMatches(text, subPhrase);
        if (subMatches.length > 0) return subMatches;
      }
    }
  }

  return [];
}

/**
 * Find exact phrase matches with word boundaries
 */
function findExactPhraseMatches(
  text: string,
  phrase: string
): Array<{ text: string; index: number }> {
  const matches: Array<{ text: string; index: number }> = [];

  // Escape regex special characters
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex with word boundaries
  const regex = new RegExp(`\\b(${escapedPhrase})\\b`, 'gi');

  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      text: match[1], // Use actual matched text to preserve case
      index: match.index,
    });
  }

  return matches;
}

/**
 * Find the position of text within HTML, accounting for nested tags
 */
function findPositionInHtml(html: string, text: string, textIndex: number): number {
  // Remove opening <p> tag
  const contentMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!contentMatch) return -1;

  const content = contentMatch[1];
  const pTagLength = html.indexOf('>') + 1;

  // Find the text, accounting for the fact that we may have stripped tags
  const textLower = text.toLowerCase();
  let htmlIndex = 0;
  let textCounter = 0;
  let inTag = false;

  while (htmlIndex < content.length) {
    if (content[htmlIndex] === '<') {
      inTag = true;
    } else if (content[htmlIndex] === '>') {
      inTag = false;
    } else if (!inTag) {
      // Check if we're at the start position
      if (textCounter === textIndex) {
        // Verify the text matches
        let matchLength = 0;
        let checkIndex = htmlIndex;

        while (matchLength < text.length && checkIndex < content.length) {
          if (content[checkIndex] === '<') {
            // Skip tag
            while (checkIndex < content.length && content[checkIndex] !== '>') {
              checkIndex++;
            }
            checkIndex++;
          } else {
            if (content[checkIndex].toLowerCase() !== textLower[matchLength]) {
              break;
            }
            matchLength++;
            checkIndex++;
          }
        }

        if (matchLength === text.length) {
          return pTagLength + htmlIndex;
        }
      }
      textCounter++;
    }
    htmlIndex++;
  }

  // Fallback: simple indexOf
  const simpleIndex = content.toLowerCase().indexOf(textLower);
  if (simpleIndex !== -1) {
    return pTagLength + simpleIndex;
  }

  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK SELECTION WITH VARIANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select links while maintaining 20/50/30 anchor text variance
 * and distributing links across the article (not just the overview)
 */
function selectLinksWithVariance(
  candidates: InsertionCandidate[],
  maxLinks: number
): InsertionCandidate[] {
  if (candidates.length === 0) return [];

  const selected: InsertionCandidate[] = [];
  const usedUrls = new Set<string>();
  const usedParagraphs = new Set<number>();
  const usedPhrases = new Set<string>();

  // Phase 1: Pick one early link (first 200 words) for the first unique URL found
  const earlyCandidates = candidates
    .filter((c) => c.wordPosition < FIRST_LINK_WORD_LIMIT)
    .sort((a, b) => a.wordPosition - b.wordPosition);

  for (const candidate of earlyCandidates) {
    if (selected.length >= 1) break; // Only need one early link
    if (usedUrls.has(candidate.targetUrl)) continue;

    selected.push(candidate);
    usedUrls.add(candidate.targetUrl);
    usedParagraphs.add(candidate.paragraphIndex);
    usedPhrases.add(candidate.phrase.toLowerCase());
    break;
  }

  // Phase 2: For remaining URLs, prefer body paragraphs (later in article)
  // Sort candidates by word position DESCENDING to pick from body first
  const bodyCandidates = [...candidates]
    .filter((c) => c.wordPosition >= FIRST_LINK_WORD_LIMIT)
    .sort((a, b) => {
      // Spread links out: prefer candidates far from already-selected paragraphs
      const aDistFromUsed = Math.min(...[...usedParagraphs].map((p) => Math.abs(a.paragraphIndex - p)), Infinity);
      const bDistFromUsed = Math.min(...[...usedParagraphs].map((p) => Math.abs(b.paragraphIndex - p)), Infinity);
      return bDistFromUsed - aDistFromUsed; // Prefer greater distance from existing links
    });

  for (const candidate of bodyCandidates) {
    if (selected.length >= maxLinks) break;
    if (usedUrls.has(candidate.targetUrl)) continue;
    if (usedParagraphs.has(candidate.paragraphIndex)) continue;
    // Prevent duplicate anchor text across different URLs
    if (usedPhrases.has(candidate.phrase.toLowerCase())) continue;

    selected.push(candidate);
    usedUrls.add(candidate.targetUrl);
    usedParagraphs.add(candidate.paragraphIndex);
    usedPhrases.add(candidate.phrase.toLowerCase());
  }

  // Phase 3: If some URLs still unlinked, fall back to any paragraph (including early)
  if (selected.length < maxLinks) {
    const remaining = candidates.filter(
      (c) => !usedUrls.has(c.targetUrl) && !usedParagraphs.has(c.paragraphIndex) && !usedPhrases.has(c.phrase.toLowerCase())
    );
    for (const candidate of remaining) {
      if (selected.length >= maxLinks) break;
      selected.push(candidate);
      usedUrls.add(candidate.targetUrl);
      usedParagraphs.add(candidate.paragraphIndex);
      usedPhrases.add(candidate.phrase.toLowerCase());
    }
  }

  // Phase 4: Last resort — allow duplicate phrases if no other option
  if (selected.length < maxLinks) {
    const lastResort = candidates.filter(
      (c) => !usedUrls.has(c.targetUrl) && !usedParagraphs.has(c.paragraphIndex)
    );
    for (const candidate of lastResort) {
      if (selected.length >= maxLinks) break;
      selected.push(candidate);
      usedUrls.add(candidate.targetUrl);
      usedParagraphs.add(candidate.paragraphIndex);
    }
  }

  return selected;
}

/**
 * Redistribute anchor types across selected links to match the 20/50/30 variance target.
 * Ensures the final link set has a mix of exact, semantic, and generic anchor types
 * to avoid anchor text spam signals.
 */
function applyAnchorVariance(links: InsertionCandidate[]): InsertionCandidate[] {
  if (links.length <= 1) return links;

  const exactTarget = Math.max(1, Math.round(links.length * ANCHOR_VARIANCE.exact));
  const genericTarget = Math.max(1, Math.round(links.length * ANCHOR_VARIANCE.generic));
  // Semantic gets whatever remains
  const semanticTarget = Math.max(0, links.length - exactTarget - genericTarget);

  return links.map((link, i) => {
    let anchorType: 'exact' | 'semantic' | 'generic';
    if (i < exactTarget) {
      anchorType = 'exact';
    } else if (i < exactTarget + semanticTarget) {
      anchorType = 'semantic';
    } else {
      anchorType = 'generic';
    }
    return { ...link, anchorType };
  });
}

/**
 * Prioritize links that appear in the first 200 words
 */
function prioritizeEarlyLinks(links: InsertionCandidate[]): InsertionCandidate[] {
  // Sort so that early links (< 200 words) come first
  return [...links].sort((a, b) => {
    const aIsEarly = a.wordPosition < FIRST_LINK_WORD_LIMIT;
    const bIsEarly = b.wordPosition < FIRST_LINK_WORD_LIMIT;

    if (aIsEarly && !bIsEarly) return -1;
    if (!aIsEarly && bIsEarly) return 1;

    // Within same priority, maintain word position order
    return a.wordPosition - b.wordPosition;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK INSERTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Insert an anchor tag at the specified position
 */
function insertAnchorTag(html: string, link: InsertionCandidate): string {
  const { phrase, targetUrl, position } = link;

  // Find the exact text to replace (preserve original case)
  const textAtPosition = html.substring(position, position + phrase.length);

  // Create the anchor tag
  const anchorTag = `<a href="${targetUrl}" class="scai-internal-link">${textAtPosition}</a>`;

  // Replace the text with the anchor tag
  return (
    html.substring(0, position) +
    anchorTag +
    html.substring(position + phrase.length)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATED READING FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a "Related Reading" section if article has insufficient internal links
 */
function addRelatedReadingSection(
  html: string,
  siblingArticles: ClusterArticle[],
  alreadyLinkedUrls: Set<string>
): string {
  // Prefer unlinked articles; fall back to all siblings for small clusters
  let relatedArticles = siblingArticles
    .filter((a) => !alreadyLinkedUrls.has(a.targetUrl))
    .slice(0, RELATED_READING_COUNT);

  // If all siblings are already inline-linked but we still need the section
  // (e.g., small 3-article cluster), include all siblings as Related Reading
  if (relatedArticles.length === 0) {
    relatedArticles = siblingArticles.slice(0, RELATED_READING_COUNT);
  }

  if (relatedArticles.length === 0) return html;

  // Build Related Reading HTML
  const relatedReadingHtml = `
<section data-component="scai-related-reading" class="scai-related-reading">
  <h2 class="scai-related-reading-title">Related Reading</h2>
  <ul class="scai-related-reading-list">
    ${relatedArticles
      .map(
        (a) => `    <li><a href="${a.targetUrl}" class="scai-internal-link">${a.title}</a></li>`
      )
      .join('\n')}
  </ul>
</section>
`;

  // Find insertion point: before FAQ section, or before closing </article>
  const faqMatch = html.match(/<section[^>]*data-component="scai-faq"/i);
  const articleEndMatch = html.match(/<\/article>/i);

  if (faqMatch && faqMatch.index !== undefined) {
    // Insert before FAQ
    return (
      html.substring(0, faqMatch.index) +
      relatedReadingHtml +
      '\n' +
      html.substring(faqMatch.index)
    );
  } else if (articleEndMatch && articleEndMatch.index !== undefined) {
    // Insert before closing article tag
    return (
      html.substring(0, articleEndMatch.index) +
      relatedReadingHtml +
      '\n' +
      html.substring(articleEndMatch.index)
    );
  } else {
    // Append to end
    return html + '\n' + relatedReadingHtml;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate recommended max links for a word count
 */
export function calculateMaxLinks(wordCount: number): number {
  return Math.max(1, Math.floor(wordCount / WORDS_PER_LINK));
}

/**
 * Check if interlinking should be applied based on word count
 */
export function shouldApplyInterlinking(wordCount: number): boolean {
  return wordCount >= WORDS_PER_LINK;
}
