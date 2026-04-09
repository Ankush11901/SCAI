/**
 * Keyword Extraction Tests
 * 
 * Tests for the keyword extractor utility that extracts core keywords
 * from user phrases to enable natural H2 integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractCoreKeywords,
  headingContainsKeyword,
  countKeywordHeadings,
  calculateKeywordDensity,
  validateKeywordDensity,
} from '../lib/ai/utils/keyword-extractor'

// ═══════════════════════════════════════════════════════════════════════════════
// HEURISTIC EXTRACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractCoreKeywords - Heuristic', () => {
  describe('Short phrases (1-2 words)', () => {
    it('should return single word phrases as-is', async () => {
      const result = await extractCoreKeywords('tacos', { heuristicOnly: true })
      expect(result.coreKeywords).toEqual(['tacos'])
      expect(result.method).toBe('heuristic')
    })

    it('should return two-word phrases as-is', async () => {
      const result = await extractCoreKeywords('wireless headphones', { heuristicOnly: true })
      expect(result.coreKeywords).toEqual(['wireless headphones'])
      expect(result.method).toBe('heuristic')
    })
  })

  describe('Filler word removal', () => {
    it('should remove common filler words: "aspects"', async () => {
      const result = await extractCoreKeywords('funny aspects of wwe', { heuristicOnly: true })
      // Should extract meaningful words, not "aspects" or "of"
      // Check case-insensitively since the heuristic may uppercase brands
      expect(result.coreKeywords.some(k => k.toLowerCase() === 'wwe')).toBe(true)
      expect(result.coreKeywords.some(k => k.toLowerCase() === 'funny')).toBe(true)
      expect(result.coreKeywords.map(k => k.toLowerCase())).not.toContain('aspects')
      expect(result.coreKeywords.map(k => k.toLowerCase())).not.toContain('of')
    })

    it('should remove "ways" and "guide"', async () => {
      const result = await extractCoreKeywords('best ways to cook pasta guide', { heuristicOnly: true })
      expect(result.coreKeywords).not.toContain('ways')
      expect(result.coreKeywords).not.toContain('guide')
      expect(result.coreKeywords).toContain('pasta')
    })

    it('should remove "tips" and "tricks"', async () => {
      const result = await extractCoreKeywords('tips and tricks for javascript', { heuristicOnly: true })
      expect(result.coreKeywords).not.toContain('tips')
      expect(result.coreKeywords).not.toContain('tricks')
      expect(result.coreKeywords).toContain('javascript')
    })

    it('should remove "how to" prefix', async () => {
      const result = await extractCoreKeywords('how to make italian tacos', { heuristicOnly: true })
      expect(result.coreKeywords).not.toContain('how')
      expect(result.coreKeywords).not.toContain('to')
      // Should preserve "italian" and "tacos"
      expect(result.coreKeywords.some(k => k.toLowerCase().includes('taco'))).toBe(true)
    })

    it('should remove "what is" prefix', async () => {
      const result = await extractCoreKeywords('what is machine learning', { heuristicOnly: true })
      expect(result.coreKeywords).not.toContain('what')
      expect(result.coreKeywords).not.toContain('is')
      expect(result.coreKeywords.some(k => k.toLowerCase().includes('machine') || k.toLowerCase().includes('learning'))).toBe(true)
    })
  })

  describe('Brand/proper noun preservation', () => {
    it('should preserve known brands: WWE', async () => {
      const result = await extractCoreKeywords('funny aspects of wwe', { heuristicOnly: true })
      // WWE should be preserved (case-insensitive match)
      expect(result.coreKeywords.some(k => k.toLowerCase() === 'wwe')).toBe(true)
    })

    it('should preserve known brands: iPhone', async () => {
      const result = await extractCoreKeywords('reasons why iphone 15 is worth buying', { heuristicOnly: true })
      expect(result.coreKeywords.some(k => k.toLowerCase().includes('iphone'))).toBe(true)
    })

    it('should preserve known brands: Nike', async () => {
      const result = await extractCoreKeywords('best nike shoes for running', { heuristicOnly: true })
      expect(result.coreKeywords.some(k => k.toLowerCase() === 'nike')).toBe(true)
    })
  })

  describe('Complex phrases', () => {
    it('should extract meaningful keywords from long phrases', async () => {
      const result = await extractCoreKeywords(
        'complete guide to meditation for beginners',
        { heuristicOnly: true }
      )
      expect(result.coreKeywords).toContain('meditation')
      expect(result.coreKeywords).toContain('beginners')
      expect(result.coreKeywords).not.toContain('complete')
      expect(result.coreKeywords).not.toContain('guide')
    })

    it('should handle "best X under $Y" pattern', async () => {
      const result = await extractCoreKeywords(
        'best wireless headphones under $200',
        { heuristicOnly: true }
      )
      expect(result.coreKeywords.some(k => k.toLowerCase().includes('wireless') || k.toLowerCase().includes('headphones'))).toBe(true)
      expect(result.coreKeywords).not.toContain('best')
    })

    it('should limit to 3 keywords max', async () => {
      const result = await extractCoreKeywords(
        'the ultimate comprehensive definitive guide to advanced python programming techniques for data science machine learning',
        { heuristicOnly: true }
      )
      expect(result.coreKeywords.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', async () => {
      const result = await extractCoreKeywords('', { heuristicOnly: true })
      expect(result.coreKeywords.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle all filler words', async () => {
      const result = await extractCoreKeywords('the best ways to guide', { heuristicOnly: true })
      // Should return something, even if it's a fallback
      expect(result).toBeDefined()
      expect(result.coreKeywords).toBeDefined()
    })

    it('should preserve numbers in keywords', async () => {
      const result = await extractCoreKeywords('iphone 15 pro max review', { heuristicOnly: true })
      // Should keep "15" with "iphone" if they're kept together
      expect(result.coreKeywords.some(k => k.toLowerCase().includes('iphone'))).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('headingContainsKeyword', () => {
  it('should detect keyword in heading (case insensitive)', () => {
    expect(headingContainsKeyword('The Funniest WWE Moments', ['WWE', 'funny'])).toBe(true)
    // Note: "funniest" does NOT contain "funny" (i vs y), but does contain WWE
    expect(headingContainsKeyword('The funny moments ever', ['funny'])).toBe(true)
  })

  it('should return false when no keywords found', () => {
    expect(headingContainsKeyword('Best Laptops for Gaming', ['WWE', 'funny'])).toBe(false)
  })

  it('should handle partial matches (substring)', () => {
    // "Funniest" contains "fun" as substring
    expect(headingContainsKeyword('The Funniest Wrestlers', ['fun'])).toBe(true)
    expect(headingContainsKeyword('WWE Superstars', ['wwe'])).toBe(true)
  })

  it('should handle empty arrays', () => {
    expect(headingContainsKeyword('Some Heading', [])).toBe(false)
  })
})

describe('countKeywordHeadings', () => {
  const testHeadings = [
    'The Funniest WWE Moments',
    'Best Wrestling Matches',
    'Why WWE Fans Love Drama',
    'Classic Entertainment Moments',
    'Top Funny Fails in Wrestling',
  ]

  it('should count headings containing keywords', () => {
    const count = countKeywordHeadings(testHeadings, ['WWE', 'funny'])
    // 1. "The Funniest WWE Moments" - has both
    // 2. "Best Wrestling Matches" - has neither
    // 3. "Why WWE Fans Love Drama" - has WWE
    // 4. "Classic Entertainment Moments" - has neither
    // 5. "Top Funny Fails in Wrestling" - has "Funny"
    expect(count).toBe(3) // #1, #3, #5
  })

  it('should handle empty headings array', () => {
    expect(countKeywordHeadings([], ['WWE'])).toBe(0)
  })

  it('should handle empty keywords array', () => {
    expect(countKeywordHeadings(testHeadings, [])).toBe(0)
  })
})

describe('calculateKeywordDensity', () => {
  const testHeadings = [
    'WWE Match Analysis',
    'Best Laptops',
    'WWE Superstars',
    'Gaming Setup',
    'WWE History',
  ]

  it('should calculate correct density percentage', () => {
    const density = calculateKeywordDensity(testHeadings, ['WWE'])
    // 3 out of 5 = 60%
    expect(density).toBe(60)
  })

  it('should return 0 for no matches', () => {
    const density = calculateKeywordDensity(testHeadings, ['basketball'])
    expect(density).toBe(0)
  })

  it('should return 0 for empty headings', () => {
    const density = calculateKeywordDensity([], ['WWE'])
    expect(density).toBe(0)
  })
})

describe('validateKeywordDensity', () => {
  const testHeadings = [
    'WWE Match 1',
    'WWE Match 2',
    'WWE Match 3',
    'Other Topic 1',
    'Other Topic 2',
    'WWE Match 4',
    'Other Topic 3',
    'Other Topic 4',
    'Other Topic 5',
    'Other Topic 6',
  ] // 4 out of 10 = 40%

  it('should pass valid density within range', () => {
    const result = validateKeywordDensity(testHeadings, ['WWE'], 30, 60)
    expect(result.valid).toBe(true)
    expect(result.density).toBe(40)
  })

  it('should fail when density is too low', () => {
    const result = validateKeywordDensity(testHeadings, ['WWE'], 50, 70)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('too low')
  })

  it('should fail when density is too high', () => {
    const highDensityHeadings = [
      'WWE Topic 1',
      'WWE Topic 2',
      'WWE Topic 3',
      'WWE Topic 4',
      'Other',
    ] // 4 out of 5 = 80%
    const result = validateKeywordDensity(highDensityHeadings, ['WWE'], 30, 60)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('too high')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Real-world keyword extraction scenarios', () => {
  it('should fix the "funny aspects of wwe" problem', async () => {
    const result = await extractCoreKeywords('funny aspects of wwe', { heuristicOnly: true })

    // Should NOT include "aspects" or "of"
    expect(result.coreKeywords).not.toContain('aspects')
    expect(result.coreKeywords).not.toContain('of')

    // Should include the meaningful keywords
    expect(result.coreKeywords.some(k => k.toLowerCase() === 'wwe')).toBe(true)
    expect(result.coreKeywords.some(k => k.toLowerCase() === 'funny')).toBe(true)

    // Confidence should be reasonable
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('should handle affiliate/product reviews', async () => {
    const result = await extractCoreKeywords(
      'best running shoes for beginners under $100',
      { heuristicOnly: true }
    )
    expect(result.coreKeywords.some(k =>
      k.toLowerCase().includes('running') || k.toLowerCase().includes('shoes')
    )).toBe(true)
    expect(result.coreKeywords).not.toContain('best')
    expect(result.coreKeywords).not.toContain('under')
  })

  it('should handle how-to guides', async () => {
    const result = await extractCoreKeywords(
      'how to start a successful youtube channel in 2024',
      { heuristicOnly: true }
    )
    expect(result.coreKeywords.some(k => k.toLowerCase().includes('youtube'))).toBe(true)
    expect(result.coreKeywords.map(k => k.toLowerCase())).not.toContain('how')
    expect(result.coreKeywords.map(k => k.toLowerCase())).not.toContain('to')
    // Note: "start" and "successful" may be kept as meaningful words
  })

  it('should handle listicle topics', async () => {
    const result = await extractCoreKeywords(
      'top 10 reasons to visit japan',
      { heuristicOnly: true }
    )
    expect(result.coreKeywords.some(k => k.toLowerCase() === 'japan')).toBe(true)
    expect(result.coreKeywords).not.toContain('top')
    expect(result.coreKeywords).not.toContain('reasons')
  })
})
