import { getConnectionWithCredentials } from './connection-service'
import { generateSlugFromTitle } from '@/lib/utils/slug-generator'
import { wpFetch, wpUploadMedia, resolveCategory, resolveTag } from './wp-fetch'
import { getHistoryEntry } from '@/lib/services/history-service'
import { db, articleImages } from '@/lib/db'
import { eq } from 'drizzle-orm'

export interface ExportOptions {
  connectionId: string
  historyId: string
  userId: string
  status?: 'draft' | 'publish'
  categories?: string[]
  tags?: string[]
}

// ─── Gutenberg Block Helpers ─────────────────────────────────────────────────

/**
 * Extract the inner article body from a full HTML document.
 *
 * Strips `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, and `<style>` blocks.
 * Returns only the content inside the `<article>` tag (or between `<body>` tags
 * as fallback), plus the data-variation/data-color-theme values parsed from
 * the `<article>` element.
 */
export function extractArticleBody(html: string): {
  body: string
  variation: string
  colorTheme: string
  articleType: string
} {
  // Parse variation, color theme, and article type from the <article> tag
  const variationMatch = html.match(/data-variation="([^"]*)"/)
  const colorMatch = html.match(/data-color-theme="([^"]*)"/)
  const typeMatch = html.match(/data-article-type="([^"]*)"/)
  const variation = variationMatch?.[1] || 'Clean Studio'
  const colorTheme = colorMatch?.[1] || 'default'
  const articleType = typeMatch?.[1] || ''

  // Try to extract inner content of <article ...>...</article>
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/)
  if (articleMatch) {
    return { body: articleMatch[1].trim(), variation, colorTheme, articleType }
  }

  // Fallback: extract inner content of <body>...</body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  if (bodyMatch) {
    // Strip any remaining <style> blocks
    const body = bodyMatch[1].replace(/<style[\s\S]*?<\/style>/gi, '').trim()
    return { body, variation, colorTheme, articleType }
  }

  // Last resort: strip doctype/html/head/body wrapper and style blocks
  let body = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim()

  return { body, variation, colorTheme, articleType }
}

/**
 * Normalize a design variation name into a CSS-safe slug.
 *
 * "Clean Studio" → "clean-studio"
 * "Neo-Brutalist" → "neo-brutalist"
 */
function variationSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Wrap article body HTML in Gutenberg block comment markers
 * so WordPress recognises it as a registered `scai/article` block.
 */
export function wrapInGutenbergBlock(
  articleBody: string,
  opts: { variation: string; colorTheme: string; articleType?: string }
): string {
  // Use the display name (e.g. "Clean Studio") — the article CSS attribute
  // selectors target display names, not slugs.
  const blockAttrs: Record<string, string> = { align: 'full', variation: opts.variation, colorTheme: opts.colorTheme }
  if (opts.articleType) blockAttrs.articleType = opts.articleType
  const attrs = JSON.stringify(blockAttrs)

  const typeAttr = opts.articleType ? ` data-article-type="${opts.articleType}"` : ''

  return (
    `<!-- wp:scai/article ${attrs} -->\n` +
    `<div class="wp-block-scai-article alignfull">\n` +
    `<div class="scai-wrapper" data-variation="${opts.variation}" data-color-theme="${opts.colorTheme}"${typeAttr}>\n` +
    `${articleBody}\n` +
    `</div>\n` +
    `</div>\n` +
    `<!-- /wp:scai/article -->`
  )
}

export interface ExportResult {
  postId: number
  postUrl: string
  editUrl?: string
  mediaIds: number[]
}

/**
 * Export a single article to WordPress using the standard REST API.
 *
 * 1. Load the history entry + images
 * 2. Upload images to WP media library via REST API
 * 3. Replace image URLs in HTML with WordPress media URLs
 * 4. Resolve category/tag names to IDs
 * 5. Create the WP post
 */
export async function exportToWordPress(opts: ExportOptions): Promise<ExportResult> {
  const { connectionId, historyId, userId, status = 'draft', categories = [], tags = [] } = opts

  // Load connection with credentials
  const connData = await getConnectionWithCredentials(connectionId, userId)
  if (!connData) throw new Error('WordPress connection not found')

  const { connection, username, password } = connData
  const siteUrl = connection.siteUrl

  // Load article
  const entry = await getHistoryEntry(historyId, userId)
  if (!entry) throw new Error('Article not found')
  if (!entry.htmlContent) throw new Error('Article has no content')

  // Parse title from metadata or keyword
  let metadata: Record<string, unknown> = {}
  try {
    if (entry.metadata) metadata = JSON.parse(entry.metadata)
  } catch { /* ignore */ }
  const title = (metadata.title as string) || entry.keyword

  // Load images for this article
  const images = await db
    .select()
    .from(articleImages)
    .where(eq(articleImages.historyId, historyId))

  let html = entry.htmlContent
  const mediaIds: number[] = []

  // ─── FALLBACK: Replace any remaining placehold.co URLs with R2 URLs ───
  // The orchestration task should have replaced these, but if it failed
  // (e.g. regex mismatch), the HTML may still contain placeholder URLs.
  // This mirrors the same fallback used in the history preview API route.
  if (html.includes('placehold.co')) {
    console.log('[wp-export] HTML contains placehold.co URLs, applying R2 URL fallback')
    const sortedImages = [...images]
      .filter(img => img.publicUrl && img.status === 'completed')
      .sort((a, b) => {
        // Sort by imageType priority: featured first, then by creation order
        if (a.imageType === 'featured' || a.imageType === 'featured-hero') return -1
        if (b.imageType === 'featured' || b.imageType === 'featured-hero') return 1
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      })
    for (const img of sortedImages) {
      if (img.publicUrl && html.includes('placehold.co')) {
        html = html.replace(
          /https:\/\/placehold\.co\/[^"'\s)]+/,
          img.publicUrl
        )
      }
    }
    console.log('[wp-export] Placeholder URLs remaining after fallback:', 
      (html.match(/placehold\.co/g) || []).length)
  }

  // Upload each image and replace URLs in the HTML
  for (const img of images) {
    if (!img.publicUrl || img.status !== 'completed') continue

    try {
      // Fetch image bytes from R2 / public URL
      const imgRes = await fetch(img.publicUrl)
      if (!imgRes.ok) continue

      const bytes = Buffer.from(await imgRes.arrayBuffer())
      const ext = img.mimeType?.split('/')[1] || 'png'
      const filename = `scai-${historyId.slice(0, 8)}-${img.id.slice(0, 8)}.${ext}`

      // Upload to WordPress media library
      const uploaded = await wpUploadMedia({
        siteUrl,
        username,
        password,
        filename,
        mime: img.mimeType || 'image/png',
        bytes,
      })

      mediaIds.push(uploaded.id)

      // Replace the image URL in HTML
      // Strategy 1: Replace by data-image-id attribute (handles placeholder URLs still in HTML)
      const imageIdPattern = new RegExp(
        `(<img[^>]*data-image-id=["']${img.id}["'][^>]*?)src=["'][^"']*["']`,
        'gi'
      )
      if (imageIdPattern.test(html)) {
        html = html.replace(
          new RegExp(
            `(<img[^>]*data-image-id=["']${img.id}["'][^>]*?)src=["'][^"']*["']`,
            'gi'
          ),
          `$1src="${uploaded.source_url}"`
        )
      }

      // Strategy 2: Also replace the R2 public URL directly (for any other occurrences)
      if (img.publicUrl && uploaded.source_url) {
        html = html.split(img.publicUrl).join(uploaded.source_url)
      }
    } catch (err) {
      console.warn(`[wp-export] Failed to upload image ${img.id}:`, err)
      // Continue with remaining images
    }
  }

  // Determine featured image (hero/featured type, or first uploaded)
  const heroImage = images.find(i => i.imageType === 'featured' || i.componentType === 'hero')
  const heroIdx = heroImage ? images.indexOf(heroImage) : 0
  const featuredMediaId = mediaIds[heroIdx] || mediaIds[0] || 0

  // Resolve category names → IDs
  const categoryIds: number[] = []
  for (const name of categories) {
    try {
      const id = await resolveCategory(siteUrl, username, password, name)
      categoryIds.push(id)
    } catch (err) {
      console.warn(`[wp-export] Failed to resolve category "${name}":`, err)
    }
  }

  // Resolve tag names → IDs
  const tagIds: number[] = []
  for (const name of tags) {
    try {
      const id = await resolveTag(siteUrl, username, password, name)
      tagIds.push(id)
    } catch (err) {
      console.warn(`[wp-export] Failed to resolve tag "${name}":`, err)
    }
  }

  // Wrap in Gutenberg block if plugin is active
  let content = html
  const pluginActive = connection.pluginStatus === 'active'

  if (pluginActive) {
    const { body, variation, colorTheme, articleType } = extractArticleBody(html)
    content = wrapInGutenbergBlock(body, { variation, colorTheme, articleType })
    console.log(`[wp-export] Plugin active — wrapped in Gutenberg block (variation: ${variation}, color: ${colorTheme}, type: ${articleType})`)
  } else {
    console.log('[wp-export] Plugin not active — sending raw HTML (graceful degradation)')
  }

  // Create the post via WP REST API
  const postData: Record<string, unknown> = {
    title,
    content,
    status,
    slug: generateSlugFromTitle(title),
  }

  if (categoryIds.length > 0) postData.categories = categoryIds
  if (tagIds.length > 0) postData.tags = tagIds
  if (featuredMediaId > 0) postData.featured_media = featuredMediaId

  const result = await wpFetch<{
    id: number
    link: string
    slug: string
    _links?: { 'wp:action'?: Array<{ href: string }> }
  }>({
    siteUrl,
    username,
    password,
    path: '/wp/v2/posts',
    method: 'POST',
    body: postData,
  })

  return {
    postId: result.id,
    postUrl: status === 'publish' ? result.link : `${siteUrl}/${result.slug}/`,
    editUrl: `${siteUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
    mediaIds,
  }
}
