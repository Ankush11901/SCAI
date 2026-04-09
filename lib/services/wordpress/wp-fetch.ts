/**
 * WordPress REST API helpers using HTTP Basic Auth (Application Passwords).
 */

function basicAuthHeader(username: string, password: string): string {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  return `Basic ${credentials}`
}

interface WpFetchOptions {
  siteUrl: string
  username: string
  password: string
  path: string
  method?: string
  body?: Record<string, unknown>
}

/**
 * Make an authenticated JSON request to the WordPress REST API.
 */
export async function wpFetch<T>(opts: WpFetchOptions): Promise<T> {
  const { siteUrl, username, password, path, method = 'GET', body } = opts

  const url = `${siteUrl.replace(/\/$/, '')}/wp-json${path}`

  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(username, password),
  }

  const init: RequestInit = { method, headers }

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const res = await fetch(url, init)

  if (!res.ok) {
    const errBody = await res.text()
    let message: string
    try {
      const parsed = JSON.parse(errBody)
      message = parsed.message || parsed.code || errBody
    } catch {
      message = errBody
    }
    throw new Error(`WordPress API error (${res.status}): ${message}`)
  }

  return res.json() as Promise<T>
}

interface WpUploadMediaOptions {
  siteUrl: string
  username: string
  password: string
  filename: string
  mime: string
  bytes: Buffer
  altText?: string
}

interface WpMediaResponse {
  id: number
  source_url: string
  title: { rendered: string }
}

/**
 * Upload an image to the WordPress media library via REST API.
 */
export async function wpUploadMedia(opts: WpUploadMediaOptions): Promise<WpMediaResponse> {
  const { siteUrl, username, password, filename, mime, bytes, altText } = opts

  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(username, password),
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: new Uint8Array(bytes),
  })

  if (!res.ok) {
    const errBody = await res.text()
    let message: string
    try {
      const parsed = JSON.parse(errBody)
      message = parsed.message || parsed.code || errBody
    } catch {
      message = errBody
    }
    throw new Error(`WordPress media upload error (${res.status}): ${message}`)
  }

  const media: WpMediaResponse = await res.json()

  // Set alt text if provided
  if (altText && media.id) {
    try {
      await wpFetch({
        siteUrl,
        username,
        password,
        path: `/wp/v2/media/${media.id}`,
        method: 'POST',
        body: { alt_text: altText },
      })
    } catch {
      // Non-critical — image still uploaded successfully
    }
  }

  return media
}

interface WpSiteInfo {
  name: string
  url: string
  home: string
  description: string
  namespaces: string[]
}

/**
 * Fetch basic site info from the WordPress REST API root.
 */
export async function wpGetSiteInfo(
  siteUrl: string,
  username: string,
  password: string
): Promise<WpSiteInfo> {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/`

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuthHeader(username, password),
    },
  })

  if (!res.ok) {
    throw new Error(`Cannot reach WordPress site (${res.status})`)
  }

  const data = await res.json()
  return {
    name: data.name || '',
    url: data.url || siteUrl,
    home: data.home || siteUrl,
    description: data.description || '',
    namespaces: data.namespaces || [],
  }
}

/**
 * Resolve a category name to its ID, creating it if it doesn't exist.
 */
export async function resolveCategory(
  siteUrl: string,
  username: string,
  password: string,
  name: string
): Promise<number> {
  // Search for existing category
  const existing = await wpFetch<Array<{ id: number; name: string }>>({
    siteUrl,
    username,
    password,
    path: `/wp/v2/categories?search=${encodeURIComponent(name)}&per_page=5`,
  })

  const match = existing.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  if (match) return match.id

  // Create new category
  const created = await wpFetch<{ id: number }>({
    siteUrl,
    username,
    password,
    path: '/wp/v2/categories',
    method: 'POST',
    body: { name },
  })

  return created.id
}

/**
 * Resolve a tag name to its ID, creating it if it doesn't exist.
 */
export async function resolveTag(
  siteUrl: string,
  username: string,
  password: string,
  name: string
): Promise<number> {
  const existing = await wpFetch<Array<{ id: number; name: string }>>({
    siteUrl,
    username,
    password,
    path: `/wp/v2/tags?search=${encodeURIComponent(name)}&per_page=5`,
  })

  const match = existing.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  )
  if (match) return match.id

  const created = await wpFetch<{ id: number }>({
    siteUrl,
    username,
    password,
    path: '/wp/v2/tags',
    method: 'POST',
    body: { name },
  })

  return created.id
}
