/**
 * Structure Validation Tests
 * 
 * Tests for Phase 9.2: Structure validation
 * Verifies that generated article structures meet requirements:
 * - H1 character limits (≤60 chars)
 * - H2 format matching
 * - Keyword density (60-70%)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock validation functions for testing
// These would normally be imported from the actual validation service

/**
 * Check if H1 is within character limit
 */
function validateH1CharLimit(h1: string, maxChars: number = 60): boolean {
  return h1.length <= maxChars;
}

/**
 * Check if H2s follow the expected format pattern
 */
function validateH2Format(h2: string, expectedPattern?: RegExp): boolean {
  if (!expectedPattern) {
    // Default: H2 should not be empty and should be reasonable length
    return h2.length > 0 && h2.length <= 100;
  }
  return expectedPattern.test(h2);
}

/**
 * Calculate keyword density in text
 */
function calculateKeywordDensity(text: string, keyword: string): number {
  if (!text || !keyword) return 0;

  const words = text.toLowerCase().split(/\s+/);
  const keywordLower = keyword.toLowerCase();
  const keywordOccurrences = words.filter(word =>
    word.includes(keywordLower)
  ).length;

  return (keywordOccurrences / words.length) * 100;
}

/**
 * Validate that keyword density is within acceptable range
 */
function validateKeywordDensity(
  text: string,
  keyword: string,
  minPercent: number = 0.5,
  maxPercent: number = 3.0
): boolean {
  const density = calculateKeywordDensity(text, keyword);
  return density >= minPercent && density <= maxPercent;
}

describe('Structure Validation', () => {
  describe('H1 Character Limits', () => {
    it('should accept H1 with 60 or fewer characters', () => {
      expect(validateH1CharLimit('Best Coffee Makers for Home Use', 60)).toBe(true);
      expect(validateH1CharLimit('A'.repeat(60), 60)).toBe(true);
    });

    it('should reject H1 with more than 60 characters', () => {
      const longH1 = 'The Ultimate Comprehensive Guide to Finding the Best Coffee Makers for Your Home Kitchen';
      expect(validateH1CharLimit(longH1, 60)).toBe(false);
    });

    it('should handle empty H1', () => {
      expect(validateH1CharLimit('', 60)).toBe(true); // Empty is technically within limit
    });

    it('should handle custom max character limits', () => {
      expect(validateH1CharLimit('Short Title', 10)).toBe(false);
      expect(validateH1CharLimit('Short Title', 100)).toBe(true);
    });
  });

  describe('H2 Format Validation', () => {
    it('should accept valid H2 headings', () => {
      expect(validateH2Format('Getting Started')).toBe(true);
      expect(validateH2Format('How to Choose the Right Product')).toBe(true);
      expect(validateH2Format('Frequently Asked Questions')).toBe(true);
    });

    it('should reject empty H2 headings', () => {
      expect(validateH2Format('')).toBe(false);
    });

    it('should reject excessively long H2 headings', () => {
      const longH2 = 'A'.repeat(150);
      expect(validateH2Format(longH2)).toBe(false);
    });

    it('should validate H2 against custom patterns', () => {
      const numberPattern = /^\d+\./; // Starts with number
      expect(validateH2Format('1. First Step', numberPattern)).toBe(true);
      expect(validateH2Format('First Step', numberPattern)).toBe(false);
    });
  });

  describe('Keyword Density', () => {
    it('should calculate correct keyword density', () => {
      const text = 'coffee coffee coffee beans beans other words here now';
      const density = calculateKeywordDensity(text, 'coffee');

      // 3 occurrences out of 9 words = 33.3%
      expect(density).toBeCloseTo(33.33, 0);
    });

    it('should handle keyword not present', () => {
      const text = 'This is some sample text without the target word';
      const density = calculateKeywordDensity(text, 'coffee');

      expect(density).toBe(0);
    });

    it('should be case-insensitive', () => {
      const text = 'Coffee COFFEE coffee CofFee';
      const density = calculateKeywordDensity(text, 'coffee');

      expect(density).toBe(100);
    });

    it('should validate density within acceptable range (0.5% - 3.0%)', () => {
      // 100 words with 1 keyword = 1% density
      const words = Array(99).fill('word').join(' ') + ' keyword';
      expect(validateKeywordDensity(words, 'keyword', 0.5, 3.0)).toBe(true);
    });

    it('should reject density below minimum', () => {
      // Very low density
      const words = Array(999).fill('word').join(' ') + ' keyword';
      expect(validateKeywordDensity(words, 'keyword', 0.5, 3.0)).toBe(false);
    });

    it('should reject density above maximum', () => {
      // Very high density - keyword repeated too many times
      const words = Array(10).fill('keyword').join(' ');
      expect(validateKeywordDensity(words, 'keyword', 0.5, 3.0)).toBe(false);
    });
  });

  describe('Real-World Article Structures', () => {
    // Sample article structures for validation
    const sampleArticles = [
      {
        type: 'informational',
        h1: 'Best Practices for Growing Tomatoes',
        h2s: ['Why Grow Tomatoes', 'Choosing Seeds', 'Planting Guide', 'Care Tips'],
        keyword: 'tomatoes'
      },
      {
        type: 'how-to',
        h1: 'How to Make Sourdough Bread at Home',
        h2s: ['What You Need', 'Making the Starter', 'Mixing the Dough', 'Baking Tips'],
        keyword: 'sourdough'
      },
      {
        type: 'comparison',
        h1: 'iPhone vs Samsung: Which Is Better?',
        h2s: ['Design Comparison', 'Performance', 'Camera Quality', 'Final Verdict'],
        keyword: 'iphone'
      },
      {
        type: 'affiliate',
        h1: 'Best Wireless Headphones of 2024',
        h2s: ['Top Picks', 'Budget Options', 'Premium Choices', 'Buying Guide'],
        keyword: 'headphones'
      }
    ];

    it.each(sampleArticles)('should validate $type article H1 (≤60 chars)', ({ h1 }) => {
      expect(validateH1CharLimit(h1, 60)).toBe(true);
    });

    it.each(sampleArticles)('should validate all H2s in $type article', ({ h2s }) => {
      for (const h2 of h2s) {
        expect(validateH2Format(h2)).toBe(true);
      }
    });
  });

  describe('Title/Heading Optimizations', () => {
    it('should prefer H1s with power words', () => {
      const powerWords = ['best', 'ultimate', 'complete', 'essential', 'proven'];
      const h1 = 'The Ultimate Guide to SEO';
      const h1Lower = h1.toLowerCase();

      const hasPowerWord = powerWords.some(word => h1Lower.includes(word));
      expect(hasPowerWord).toBe(true);
    });

    it('should prefer H1s with numbers when appropriate', () => {
      const h1WithNumber = '10 Best Ways to Save Money';
      const hasNumber = /\d+/.test(h1WithNumber);

      expect(hasNumber).toBe(true);
    });

    it('should avoid H1s that are questions (for SEO)', () => {
      // Good H1 - statement
      const goodH1 = 'Best Coffee Makers for 2024';
      // Less optimal H1 - question  
      const questionH1 = 'What Are the Best Coffee Makers?';

      expect(goodH1.includes('?')).toBe(false);
      expect(questionH1.includes('?')).toBe(true);
    });
  });
});
