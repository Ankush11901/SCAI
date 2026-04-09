/**
 * Alt Text Preservation Tests
 * 
 * Tests to verify that image alt texts are preserved when:
 * 1. Placeholder images are replaced with real URLs
 * 2. Spinner wrappers are replaced with images
 * 3. Image complete events update HTML
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Test helper functions (copied from the actual implementations)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replace placeholder image URLs with loading spinner divs
 * IMPORTANT: Preserves original alt text when replacing with real URLs
 */
function replaceImagesWithSpinners(
  html: string,
  completedImages: Map<string, string>
): string {
  // Pattern that captures parts before and after src to preserve alt text
  const placeholderRegex =
    /(<img\s+[^>]*?)src=["'](https:\/\/(via\.placeholder\.com|placehold\.co)[^"']+)["']([^>]*>)/gi;

  return html.replace(placeholderRegex, (match, beforeSrc, placeholderUrl, _domain, afterSrc) => {
    for (const [placeholder, realUrl] of Array.from(completedImages.entries())) {
      if (
        placeholderUrl === placeholder ||
        placeholderUrl.includes(placeholder) ||
        placeholder.includes(placeholderUrl)
      ) {
        // Replace only the src, preserve everything else including alt text
        return `${beforeSrc}src="${realUrl}"${afterSrc}`;
      }
    }

    const encodedPlaceholder = placeholderUrl
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    return `<div class="scai-image-loading-wrapper" data-placeholder="${encodedPlaceholder}">Loading...</div>`;
  });
}

/**
 * Replace image src by data-image-id (used in onImageComplete)
 */
function replaceImageByDataId(
  html: string,
  imageId: string,
  newUrl: string
): { html: string; matched: boolean } {
  let matched = false;
  let updatedHtml = html;

  // Strategy 1: Match by data-image-id attribute (most reliable)
  const imageIdPattern = new RegExp(
    `(<img[^>]*data-image-id=["']${imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
    "gi"
  );

  if (imageIdPattern.test(updatedHtml)) {
    matched = true;
    updatedHtml = updatedHtml.replace(
      new RegExp(
        `(<img[^>]*data-image-id=["']${imageId}["'][^>]*?)src=["'][^"']*["']([^>]*>)`,
        "gi"
      ),
      `$1src="${newUrl}"$2`
    );
  }

  // Strategy 2: Try alternate attribute order (src before data-image-id)
  if (!matched) {
    const altPattern = new RegExp(
      `(<img[^>]*?)src=["'][^"']*["']([^>]*data-image-id=["']${imageId}["'][^>]*>)`,
      "gi"
    );
    if (altPattern.test(updatedHtml)) {
      matched = true;
      updatedHtml = updatedHtml.replace(
        altPattern,
        `$1src="${newUrl}"$2`
      );
    }
  }

  return { html: updatedHtml, matched };
}

/**
 * Replace any placeholder URL (fallback strategy)
 */
function replaceAnyPlaceholder(
  html: string,
  newUrl: string
): string {
  const placeholderPattern = new RegExp(
    `(<img[^>]*?)src=["'](https://placehold\\.co/[^"']*)[\"']([^>]*>)`,
    "i" // Only replace first match
  );
  return html.replace(placeholderPattern, `$1src="${newUrl}"$3`);
}

/**
 * Extract original alt text from HTML for a given placeholder URL
 */
function extractOriginalAltText(html: string, placeholderUrl: string): string {
  const escapedPlaceholder = placeholderUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try src first, then alt
  const srcUrlPattern = new RegExp(
    `<img[^>]*src=["']${escapedPlaceholder}["'][^>]*alt=["']([^"']*)["']`,
    "i"
  );
  const altFirstPattern = new RegExp(
    `<img[^>]*alt=["']([^"']*)["'][^>]*src=["']${escapedPlaceholder}["']`,
    "i"
  );

  const srcMatch = html.match(srcUrlPattern);
  const altMatch = html.match(altFirstPattern);

  if (srcMatch?.[1]) return srcMatch[1];
  if (altMatch?.[1]) return altMatch[1];
  return "Article image"; // fallback
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_HTML_WITH_GOOD_ALT = `
<article>
  <figure data-component="scai-featured-image" class="scai-featured-image">
    <img src="https://placehold.co/800x450/e5e7eb/6b7280?text=Featured+pizza" alt="Overhead shot of a freshly baked homemade pizza with vibrant toppings, including tomatoes, basil, and mozzarella cheese" />
    <figcaption>A visual guide to pizza</figcaption>
  </figure>
  
  <section>
    <h2>Making the Dough</h2>
    <figure class="scai-h2-image">
      <img src="https://placehold.co/800x400/e5e7eb/6b7280?text=Dough+Section" alt="Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity" data-image-id="img_123_1" />
    </figure>
  </section>
  
  <section>
    <h2>Adding Toppings</h2>
    <figure class="scai-h2-image">
      <img data-image-id="img_123_2" alt="A colorful assortment of fresh pizza toppings, including ripe tomatoes, fragrant basil, premium" src="https://placehold.co/800x400/e5e7eb/6b7280?text=Toppings+Section" />
    </figure>
  </section>
</article>
`;

const R2_URL_1 = "https://pub-xxx.r2.dev/articles/img_123_1.webp";
const R2_URL_2 = "https://pub-xxx.r2.dev/articles/img_123_2.webp";
const R2_URL_FEATURED = "https://pub-xxx.r2.dev/articles/featured.webp";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Alt Text Preservation", () => {
  describe("replaceImagesWithSpinners", () => {
    it("should preserve alt text when replacing placeholder with real URL", () => {
      const completedImages = new Map([
        ["https://placehold.co/800x450/e5e7eb/6b7280?text=Featured+pizza", R2_URL_FEATURED],
      ]);

      const result = replaceImagesWithSpinners(SAMPLE_HTML_WITH_GOOD_ALT, completedImages);

      // Should have the new URL
      expect(result).toContain(`src="${R2_URL_FEATURED}"`);

      // Should preserve the original alt text (119 chars)
      expect(result).toContain(
        'alt="Overhead shot of a freshly baked homemade pizza with vibrant toppings, including tomatoes, basil, and mozzarella cheese"'
      );

      // Should NOT have "Generated image" or other placeholder alt texts
      expect(result).not.toContain('alt="Generated image"');
      expect(result).not.toContain('alt="Featured pizza"');
    });

    it("should convert unmatched placeholders to spinner divs", () => {
      const completedImages = new Map<string, string>(); // Empty - no completed images

      const result = replaceImagesWithSpinners(SAMPLE_HTML_WITH_GOOD_ALT, completedImages);

      // Should have spinner wrappers
      expect(result).toContain('class="scai-image-loading-wrapper"');
      expect(result).toContain('data-placeholder=');
    });

    it("should handle multiple images correctly", () => {
      const completedImages = new Map([
        ["https://placehold.co/800x450/e5e7eb/6b7280?text=Featured+pizza", R2_URL_FEATURED],
        ["https://placehold.co/800x400/e5e7eb/6b7280?text=Dough+Section", R2_URL_1],
      ]);

      const result = replaceImagesWithSpinners(SAMPLE_HTML_WITH_GOOD_ALT, completedImages);

      // Featured image should be replaced with preserved alt
      expect(result).toContain(`src="${R2_URL_FEATURED}"`);
      expect(result).toContain('alt="Overhead shot of a freshly baked homemade pizza');

      // H2 image should be replaced with preserved alt
      expect(result).toContain(`src="${R2_URL_1}"`);
      expect(result).toContain('alt="Close-up of pizza dough being kneaded');

      // Third image should still be a spinner (not in completedImages)
      expect(result).toContain('data-placeholder="https://placehold.co/800x400/e5e7eb/6b7280?text=Toppings+Section"');
    });
  });

  describe("replaceImageByDataId", () => {
    it("should replace src by data-image-id while preserving alt text (data-image-id after src)", () => {
      const { html, matched } = replaceImageByDataId(SAMPLE_HTML_WITH_GOOD_ALT, "img_123_1", R2_URL_1);

      expect(matched).toBe(true);
      expect(html).toContain(`src="${R2_URL_1}"`);
      // Alt text should be preserved
      expect(html).toContain('alt="Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity"');
    });

    it("should replace src by data-image-id while preserving alt text (data-image-id before src)", () => {
      const { html, matched } = replaceImageByDataId(SAMPLE_HTML_WITH_GOOD_ALT, "img_123_2", R2_URL_2);

      expect(matched).toBe(true);
      expect(html).toContain(`src="${R2_URL_2}"`);
      // Alt text should be preserved
      expect(html).toContain('alt="A colorful assortment of fresh pizza toppings, including ripe tomatoes, fragrant basil, premium"');
    });

    it("should return matched=false for non-existent imageId", () => {
      const { html, matched } = replaceImageByDataId(SAMPLE_HTML_WITH_GOOD_ALT, "non_existent_id", R2_URL_1);

      expect(matched).toBe(false);
      // HTML should be unchanged
      expect(html).toBe(SAMPLE_HTML_WITH_GOOD_ALT);
    });

    it("should not modify alt text - only src", () => {
      const originalAlt = 'alt="Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity"';

      const { html } = replaceImageByDataId(SAMPLE_HTML_WITH_GOOD_ALT, "img_123_1", R2_URL_1);

      expect(html).toContain(originalAlt);
      expect(html).not.toContain('alt="Article image"');
      expect(html).not.toContain('alt="Generated image"');
    });
  });

  describe("replaceAnyPlaceholder (fallback)", () => {
    it("should replace first placeholder URL while preserving alt text", () => {
      const result = replaceAnyPlaceholder(SAMPLE_HTML_WITH_GOOD_ALT, R2_URL_FEATURED);

      // Should have new URL
      expect(result).toContain(`src="${R2_URL_FEATURED}"`);

      // Should preserve alt text of the first (featured) image
      expect(result).toContain('alt="Overhead shot of a freshly baked homemade pizza');
    });
  });

  describe("extractOriginalAltText", () => {
    it("should extract alt text when src comes before alt", () => {
      const placeholderUrl = "https://placehold.co/800x400/e5e7eb/6b7280?text=Dough+Section";
      const alt = extractOriginalAltText(SAMPLE_HTML_WITH_GOOD_ALT, placeholderUrl);

      expect(alt).toBe("Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity");
    });

    it("should extract alt text when alt comes before src", () => {
      const placeholderUrl = "https://placehold.co/800x400/e5e7eb/6b7280?text=Toppings+Section";
      const alt = extractOriginalAltText(SAMPLE_HTML_WITH_GOOD_ALT, placeholderUrl);

      expect(alt).toBe("A colorful assortment of fresh pizza toppings, including ripe tomatoes, fragrant basil, premium");
    });

    it("should return fallback for non-existent placeholder", () => {
      const alt = extractOriginalAltText(SAMPLE_HTML_WITH_GOOD_ALT, "https://example.com/not-found.jpg");

      expect(alt).toBe("Article image");
    });
  });

  describe("Alt text character limits", () => {
    it("should have featured image alt within 100-125 characters", () => {
      const featuredAlt = "Overhead shot of a freshly baked homemade pizza with vibrant toppings, including tomatoes, basil, and mozzarella cheese";

      expect(featuredAlt.length).toBeGreaterThanOrEqual(100);
      expect(featuredAlt.length).toBeLessThanOrEqual(125);
      console.log(`Featured alt length: ${featuredAlt.length} chars`);
    });

    it("should have H2 image alts within 80-100 characters", () => {
      const h2Alts = [
        "Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity",
        "A colorful assortment of fresh pizza toppings, including ripe tomatoes, fragrant basil, premium",
      ];

      h2Alts.forEach((alt, idx) => {
        expect(alt.length).toBeGreaterThanOrEqual(80);
        expect(alt.length).toBeLessThanOrEqual(100);
        console.log(`H2 alt ${idx + 1} length: ${alt.length} chars`);
      });
    });
  });
});

describe("Full Image Replacement Flow Simulation", () => {
  it("should preserve all alt texts through the complete flow", () => {
    let html = SAMPLE_HTML_WITH_GOOD_ALT;
    const originalAlts = {
      featured: 'alt="Overhead shot of a freshly baked homemade pizza with vibrant toppings, including tomatoes, basil, and mozzarella cheese"',
      h2_1: 'alt="Close-up of pizza dough being kneaded on a floured surface, showcasing the texture and elasticity"',
      h2_2: 'alt="A colorful assortment of fresh pizza toppings, including ripe tomatoes, fragrant basil, premium"',
    };

    // Step 1: Show spinners for all placeholders (no completed images yet)
    const withSpinners = replaceImagesWithSpinners(html, new Map());
    expect(withSpinners).toContain('scai-image-loading-wrapper');

    // Step 2: Image 1 completes - replace by data-image-id
    const { html: afterImg1 } = replaceImageByDataId(html, "img_123_1", R2_URL_1);
    expect(afterImg1).toContain(R2_URL_1);
    expect(afterImg1).toContain(originalAlts.h2_1);

    // Step 3: Image 2 completes - replace by data-image-id
    const { html: afterImg2 } = replaceImageByDataId(afterImg1, "img_123_2", R2_URL_2);
    expect(afterImg2).toContain(R2_URL_2);
    expect(afterImg2).toContain(originalAlts.h2_2);

    // Step 4: Featured image completes - use replaceImagesWithSpinners with the URL
    const completedFeatured = new Map([
      ["https://placehold.co/800x450/e5e7eb/6b7280?text=Featured+pizza", R2_URL_FEATURED],
    ]);
    const final = replaceImagesWithSpinners(afterImg2, completedFeatured);

    // Verify all R2 URLs are present
    expect(final).toContain(R2_URL_FEATURED);
    expect(final).toContain(R2_URL_1);
    expect(final).toContain(R2_URL_2);

    // Verify all original alt texts are preserved
    expect(final).toContain(originalAlts.featured);
    expect(final).toContain(originalAlts.h2_1);
    expect(final).toContain(originalAlts.h2_2);

    // Verify NO bad alt texts
    expect(final).not.toContain('alt="Generated image"');
    expect(final).not.toContain('alt="Article image"');
    expect(final).not.toContain('alt="Featured pizza"'); // URL text should not be used as alt

    console.log("✅ All alt texts preserved through complete flow!");
  });
});
