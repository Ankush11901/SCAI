/**
 * Slug Generator Utilities
 *
 * Utilities for generating URL-safe slugs from article titles
 * and applying URL patterns for cluster mode interlinking.
 */

/**
 * Generates a URL-safe slug from an article title
 *
 * @param title - The article title to convert
 * @returns A lowercase, hyphenated slug
 *
 * @example
 * generateSlugFromTitle("Best Home Gym Equipment for Beginners")
 * // => "best-home-gym-equipment-for-beginners"
 *
 * generateSlugFromTitle("What's the Best Way to Build Muscle?")
 * // => "whats-the-best-way-to-build-muscle"
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Limit length to 60 characters (good for SEO)
    .slice(0, 60)
    // Ensure we don't end mid-word if truncated
    .replace(/-[^-]*$/, (match) => (match.length < 10 ? '' : match));
}

/**
 * Applies a URL pattern by replacing {slug} placeholder
 *
 * @param pattern - The URL pattern with {slug} placeholder
 * @param slug - The slug to insert
 * @returns The complete URL
 *
 * @example
 * applyUrlPattern("/blog/{slug}", "best-home-gym-equipment")
 * // => "/blog/best-home-gym-equipment"
 *
 * applyUrlPattern("https://example.com/articles/{slug}/", "my-article")
 * // => "https://example.com/articles/my-article/"
 */
export function applyUrlPattern(pattern: string, slug: string): string {
  return pattern.replace('{slug}', slug);
}

/**
 * Validates a URL pattern has the required {slug} placeholder
 *
 * @param pattern - The URL pattern to validate
 * @returns True if pattern is valid
 */
export function isValidUrlPattern(pattern: string): boolean {
  return pattern.includes('{slug}');
}

/**
 * Generates a unique slug by appending a number if needed
 * Used when multiple articles might have similar titles
 *
 * @param title - The article title
 * @param existingSlugs - Set of slugs already used
 * @returns A unique slug
 */
export function generateUniqueSlug(
  title: string,
  existingSlugs: Set<string>
): string {
  let slug = generateSlugFromTitle(title);
  let counter = 1;

  while (existingSlugs.has(slug)) {
    slug = `${generateSlugFromTitle(title)}-${counter}`;
    counter++;
  }

  return slug;
}
