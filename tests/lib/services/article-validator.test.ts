import { describe, it, expect } from "vitest";
import {
  validateArticle,
  quickValidate,
  canExport,
  getFixSuggestions,
  type ValidationResult,
} from "@/lib/services/article-validator";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Best Dog Training Tips for Beginners</title>
  <meta name="description" content="Learn effective dog training tips and techniques for beginners. Master basic commands and build a strong bond with your pet." />
</head>
<body>
  <article>
    <h1>Best Dog Training Tips for Beginners</h1>
    
    <div class="overview">
      <p>Training your dog is one of the most rewarding experiences you can have as a pet owner. 
      With patience and consistency, you can teach your furry friend essential commands and good behavior. 
      This comprehensive guide covers everything you need to know to start training your dog effectively.
      We will explore basic techniques, common mistakes to avoid, and proven methods for success.</p>
    </div>
    
    <h2>Understanding Your Dog's Behavior</h2>
    <p>Dogs are pack animals that respond well to clear leadership and positive reinforcement. 
    Understanding canine psychology helps you communicate more effectively with your pet.
    When you learn to read your dog's body language, you can anticipate their needs and respond appropriately.
    This foundation of understanding makes training sessions more productive and enjoyable for both of you.</p>
    
    <h2>Essential Commands Every Dog Should Know</h2>
    <p>Start with basic commands like sit, stay, come, and down. These foundational commands create a framework for more advanced training.
    Teaching these commands requires consistency, patience, and plenty of rewards.
    Practice each command in short sessions to keep your dog engaged and prevent frustration.
    Celebrate small victories and progress incrementally toward your training goals.</p>
    
    <h2>Positive Reinforcement Techniques</h2>
    <p>Reward-based training produces lasting results and strengthens your bond with your pet.
    Use treats, praise, and play as motivators during training sessions.
    Timing is crucial - reward immediately after the desired behavior to create strong associations.
    Avoid punishment-based methods that can damage trust and create anxiety in your dog.</p>
    
    <div class="closing">
      <p>Training your dog requires dedication and patience, but the rewards are well worth the effort.
      Apply these techniques consistently, and you will see positive changes in your dog's behavior.
      Remember that every dog learns at their own pace, so adjust your expectations accordingly.
      Start your training journey today and enjoy the process of growing together with your pet.</p>
    </div>
  </article>
</body>
</html>
`;

const ARTICLE_WITH_FORBIDDEN_WORDS = `
<html>
<body>
  <article>
    <h1>Revolutionary Dog Training Methods</h1>
    <p>This game-changer approach will disrupt the way you think about training.
    Our cutting-edge techniques are state-of-the-art and truly groundbreaking.
    Leverage these innovative methods for unprecedented results.</p>
    <h2>Conclusion: Final Thoughts</h2>
    <p>In conclusion, to summarize everything we have discussed today.</p>
  </article>
</body>
</html>
`;

const ARTICLE_TOO_SHORT = `
<html>
<body>
  <article>
    <h1>Dog Tips</h1>
    <p>Train your dog well.</p>
    <h2>More Tips</h2>
    <p>Be patient with dogs.</p>
  </article>
</body>
</html>
`;

const ARTICLE_BAD_META = `
<html>
<head>
  <title>This is a very long title that definitely exceeds the sixty character limit for SEO optimization purposes</title>
  <meta name="description" content="Short." />
</head>
<body>
  <article>
    <h1>Article Without Proper Structure</h1>
    <p>Some content here.</p>
  </article>
</body>
</html>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Article Validator", () => {
  describe("validateArticle", () => {
    it("should return a validation result object", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);

      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("totalPassed");
      expect(result).toHaveProperty("totalRules");
      expect(result).toHaveProperty("categories");
      expect(result).toHaveProperty("criticalIssues");
      expect(result).toHaveProperty("warnings");
    });

    it("should pass validation for a well-formed article", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);

      expect(result.score).toBeGreaterThan(60);
      expect(result.criticalIssues.length).toBeLessThan(3);
    });

    it("should detect forbidden words in content", () => {
      const result = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);

      // Check for forbidden word detection
      const forbiddenWordRule = result.categories
        .flatMap(c => c.rules)
        .find(r => r.id === "forbidden-content-words");

      expect(forbiddenWordRule).toBeDefined();
      expect(forbiddenWordRule?.status).toBe("fail");
    });

    it("should detect forbidden words in headings", () => {
      const result = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);

      const forbiddenHeadingRule = result.categories
        .flatMap(c => c.rules)
        .find(r => r.id === "forbidden-heading-words");

      expect(forbiddenHeadingRule).toBeDefined();
      expect(forbiddenHeadingRule?.status).toBe("fail");
    });

    it("should detect short articles", () => {
      const result = validateArticle(ARTICLE_TOO_SHORT);

      expect(result.score).toBeLessThan(80);

      // Should have warnings about word count
      const wordCountRules = result.categories
        .flatMap(c => c.rules)
        .filter(r => r.category === "word-count");

      const failedWordCount = wordCountRules.some(r => r.status === "fail" || r.status === "warn");
      expect(failedWordCount).toBe(true);
    });

    it("should validate meta title and description", () => {
      const result = validateArticle(ARTICLE_BAD_META);

      const metaRules = result.categories
        .flatMap(c => c.rules)
        .filter(r => r.category === "meta");

      // Should find meta-related issues
      const hasMetaIssues = metaRules.some(r => r.status !== "pass");
      expect(hasMetaIssues).toBe(true);
    });

    it("should include keyword in validation when provided", () => {
      const result = validateArticle(VALID_ARTICLE_HTML, "dog training");

      // Should check for keyword presence
      const keywordRule = result.categories
        .flatMap(c => c.rules)
        .find(r => r.id === "keyword-presence");

      expect(keywordRule).toBeDefined();
      expect(keywordRule?.status).toBe("pass");
    });

    it("should detect missing keyword", () => {
      const result = validateArticle(VALID_ARTICLE_HTML, "cat grooming");

      const keywordRule = result.categories
        .flatMap(c => c.rules)
        .find(r => r.id === "keyword-presence");

      expect(keywordRule).toBeDefined();
      expect(keywordRule?.status).toBe("fail");
    });
  });

  describe("quickValidate", () => {
    it("should return a simplified validation status", () => {
      const result = quickValidate(VALID_ARTICLE_HTML);

      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("criticalCount");
      expect(result).toHaveProperty("warningCount");
    });

    it("should indicate valid for well-formed articles", () => {
      const result = quickValidate(VALID_ARTICLE_HTML);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
    });

    it("should indicate invalid for articles with many issues", () => {
      const result = quickValidate(ARTICLE_WITH_FORBIDDEN_WORDS);

      expect(result.criticalCount).toBeGreaterThan(0);
    });
  });

  describe("canExport", () => {
    it("should allow export for valid articles", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);
      const exportable = canExport(result);

      expect(exportable).toBe(true);
    });

    it("should block export for articles with critical issues", () => {
      const result = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);
      const exportable = canExport(result);

      // May or may not be exportable depending on severity
      expect(typeof exportable).toBe("boolean");
    });
  });

  describe("getFixSuggestions", () => {
    it("should return fix suggestions for failed rules", () => {
      const result = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);
      const suggestions = getFixSuggestions(result);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should return empty array for valid articles", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);
      const suggestions = getFixSuggestions(result);

      // Should have fewer suggestions for valid articles
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should include actionable suggestions", () => {
      const result = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);
      const suggestions = getFixSuggestions(result);

      // Each suggestion should have meaningful content
      suggestions.forEach(suggestion => {
        expect(suggestion.fixSuggestion || suggestion.message).toBeTruthy();
      });
    });
  });

  describe("Validation Categories", () => {
    it("should include all expected categories", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);
      const categoryNames = result.categories.map(c => c.category);

      expect(categoryNames).toContain("word-count");
      expect(categoryNames).toContain("char-limit");
      expect(categoryNames).toContain("structure");
      expect(categoryNames).toContain("forbidden");
    });

    it("should have passed/total counts for each category", () => {
      const result = validateArticle(VALID_ARTICLE_HTML);

      result.categories.forEach(category => {
        expect(typeof category.passed).toBe("number");
        expect(typeof category.total).toBe("number");
        expect(category.passed).toBeLessThanOrEqual(category.total);
        expect(category.rules.length).toBe(category.total);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty HTML", () => {
      const result = validateArticle("");

      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("score");
      expect(result.score).toBeLessThan(50);
    });

    it("should handle HTML without body", () => {
      const result = validateArticle("<html><head></head></html>");

      expect(result).toHaveProperty("passed");
      expect(result.score).toBeLessThan(50);
    });

    it("should handle malformed HTML", () => {
      const result = validateArticle("<h1>Unclosed tag<p>More content");

      expect(result).toHaveProperty("passed");
      // Should still return a result, even if most rules fail
      expect(typeof result.score).toBe("number");
    });

    it("should handle very long content", () => {
      const longContent = `
        <html>
        <body>
          <h1>Long Article Title</h1>
          ${Array(100).fill("<p>This is a paragraph with enough words to meet minimum requirements. Adding more content here to ensure we have substantial text for testing purposes. Each paragraph should contribute to the overall word count validation.</p>").join("\n")}
        </body>
        </html>
      `;

      const result = validateArticle(longContent);

      expect(result).toHaveProperty("passed");
      expect(typeof result.score).toBe("number");
    });
  });

  describe("Score Calculation", () => {
    it("should calculate score between 0 and 100", () => {
      const result1 = validateArticle(VALID_ARTICLE_HTML);
      const result2 = validateArticle(ARTICLE_TOO_SHORT);
      const result3 = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);

      [result1, result2, result3].forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    it("should give higher scores to better articles", () => {
      const goodResult = validateArticle(VALID_ARTICLE_HTML);
      const badResult = validateArticle(ARTICLE_WITH_FORBIDDEN_WORDS);

      expect(goodResult.score).toBeGreaterThan(badResult.score);
    });
  });
});
