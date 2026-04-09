/**
 * CMS Platform Handlers
 * Verification and export functions for each supported platform
 */

import { createHmac } from 'crypto'
import type {
  CMSPlatform,
  CMSCredentials,
  CMSMetadata,
  MediumCredentials,
  DevToCredentials,
  GhostCredentials,
  HashnodeCredentials,
  ShopifyCredentials,
  WebflowCredentials,
  HubSpotCredentials,
  WixCredentials,
  BloggerCredentials,
  ContentfulCredentials,
  StrapiCredentials,
  DrupalCredentials,
  BigCommerceCredentials,
  VerifyCMSConnectionResponse,
  ExportToCMSResponse,
} from './types'
import { htmlToMarkdown, extractTitle, extractFeaturedImage, createExcerpt } from './html-to-markdown'

// ============================================================================
// MEDIUM
// ============================================================================

async function verifyMedium(credentials: MediumCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const response = await fetch('https://api.medium.com/v1/me', {
      headers: {
        Authorization: `Bearer ${credentials.integrationToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Medium API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const user = data.data

    return {
      success: true,
      message: `Connected as ${user.name || user.username}`,
      metadata: {
        authorId: user.id,
        username: user.username,
        blogUrl: `https://medium.com/@${user.username}`,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToMedium(
  credentials: MediumCredentials,
  metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const authorId = metadata.authorId
    if (!authorId) {
      return { success: false, message: 'Author ID not found. Please reconnect.' }
    }

    const markdown = htmlToMarkdown(html)

    const response = await fetch(`https://api.medium.com/v1/users/${authorId}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.integrationToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title,
        contentFormat: 'markdown',
        content: markdown,
        tags: tags.slice(0, 5), // Medium allows max 5 tags
        publishStatus: publishStatus === 'publish' ? 'public' : 'draft',
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Medium API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const post = data.data

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Medium' : 'Created draft on Medium',
      postId: post.id,
      postUrl: post.url,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// DEV.TO
// ============================================================================

async function verifyDevTo(credentials: DevToCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const response = await fetch('https://dev.to/api/users/me', {
      headers: {
        'api-key': credentials.apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Dev.to API error: ${response.status} - ${text}` }
    }

    const user = await response.json()

    return {
      success: true,
      message: `Connected as ${user.name || user.username}`,
      metadata: {
        username: user.username,
        blogUrl: `https://dev.to/${user.username}`,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToDevTo(
  credentials: DevToCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const markdown = htmlToMarkdown(html)

    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': credentials.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        article: {
          title,
          body_markdown: markdown,
          published: publishStatus === 'publish',
          tags: tags.slice(0, 4), // Dev.to allows max 4 tags
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Dev.to API error: ${response.status} - ${text}` }
    }

    const article = await response.json()

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Dev.to' : 'Created draft on Dev.to',
      postId: String(article.id),
      postUrl: article.url,
      editUrl: `https://dev.to/${article.path}/edit`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// GHOST
// ============================================================================

/**
 * Generate Ghost Admin API JWT using native crypto
 */
function generateGhostJWT(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(':')
  if (!id || !secret) {
    throw new Error('Invalid Ghost Admin API key format. Expected: {id}:{secret}')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT', kid: id }
  const payload = { iat: now, exp: now + 300, aud: '/admin/' }

  const base64url = (data: string) =>
    Buffer.from(data).toString('base64url')

  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`

  const keyBuffer = Buffer.from(secret, 'hex')
  const signature = createHmac('sha256', keyBuffer).update(signingInput).digest('base64url')

  return `${signingInput}.${signature}`
}

async function verifyGhost(credentials: GhostCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const token = generateGhostJWT(credentials.adminApiKey)
    const apiUrl = credentials.apiUrl.replace(/\/$/, '')

    const response = await fetch(`${apiUrl}/ghost/api/admin/site/`, {
      headers: {
        Authorization: `Ghost ${token}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Ghost API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const site = data.site

    return {
      success: true,
      message: `Connected to ${site.title}`,
      metadata: {
        blogUrl: site.url,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToGhost(
  credentials: GhostCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const token = generateGhostJWT(credentials.adminApiKey)
    const apiUrl = credentials.apiUrl.replace(/\/$/, '')
    const featuredImage = extractFeaturedImage(html)
    const excerpt = createExcerpt(html, 300)

    const response = await fetch(`${apiUrl}/ghost/api/admin/posts/`, {
      method: 'POST',
      headers: {
        Authorization: `Ghost ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        posts: [
          {
            title,
            html,
            status: publishStatus === 'publish' ? 'published' : 'draft',
            tags: tags.map((t) => ({ name: t })),
            feature_image: featuredImage,
            custom_excerpt: excerpt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Ghost API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const post = data.posts[0]

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Ghost' : 'Created draft on Ghost',
      postId: post.id,
      postUrl: post.url,
      editUrl: `${apiUrl}/ghost/#/editor/post/${post.id}`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// HASHNODE
// ============================================================================

async function verifyHashnode(credentials: HashnodeCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const query = `
      query Publication($id: ObjectId!) {
        publication(id: $id) {
          id
          title
          url
        }
      }
    `

    const response = await fetch('https://gql.hashnode.com/', {
      method: 'POST',
      headers: {
        Authorization: credentials.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: credentials.publicationId },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Hashnode API error: ${response.status} - ${text}` }
    }

    const data = await response.json()

    if (data.errors) {
      return { success: false, message: `Hashnode error: ${data.errors[0].message}` }
    }

    const pub = data.data.publication

    return {
      success: true,
      message: `Connected to ${pub.title}`,
      metadata: {
        hashnodePublicationId: pub.id,
        hashnodePublicationName: pub.title,
        blogUrl: pub.url,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToHashnode(
  credentials: HashnodeCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  _publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const markdown = htmlToMarkdown(html)
    const featuredImage = extractFeaturedImage(html)

    const mutation = `
      mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
          post {
            id
            slug
            url
          }
        }
      }
    `

    const response = await fetch('https://gql.hashnode.com/', {
      method: 'POST',
      headers: {
        Authorization: credentials.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            publicationId: credentials.publicationId,
            title,
            contentMarkdown: markdown,
            tags: tags.map((t) => ({ slug: t.toLowerCase().replace(/\s+/g, '-'), name: t })),
            coverImageOptions: featuredImage ? { coverImageURL: featuredImage } : undefined,
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Hashnode API error: ${response.status} - ${text}` }
    }

    const data = await response.json()

    if (data.errors) {
      return { success: false, message: `Hashnode error: ${data.errors[0].message}` }
    }

    const post = data.data.publishPost.post

    return {
      success: true,
      message: 'Published to Hashnode',
      postId: post.id,
      postUrl: post.url,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// SHOPIFY
// ============================================================================

async function verifyShopify(credentials: ShopifyCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const shopDomain = credentials.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Shopify API error: ${response.status} - ${text}` }
    }

    const data = await response.json()

    // Fetch blogs to get the default blog ID
    const blogsResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/blogs.json`, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        Accept: 'application/json',
      },
    })

    let blogId: string | undefined
    let blogHandle: string | undefined

    if (blogsResponse.ok) {
      const blogsData = await blogsResponse.json()
      if (blogsData.blogs && blogsData.blogs.length > 0) {
        blogId = String(blogsData.blogs[0].id)
        blogHandle = blogsData.blogs[0].handle
      }
    }

    return {
      success: true,
      message: `Connected to ${data.shop.name}`,
      metadata: {
        shopName: data.shop.name,
        blogUrl: `https://${data.shop.domain}`,
        blogId,
        blogHandle,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToShopify(
  credentials: ShopifyCredentials,
  metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const shopDomain = credentials.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const blogId = metadata.blogId

    if (!blogId) {
      return { success: false, message: 'Blog ID not found. Please reconnect.' }
    }

    const featuredImage = extractFeaturedImage(html)
    const excerpt = createExcerpt(html, 300)

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        article: {
          title,
          body_html: html,
          tags: tags.join(', '),
          published: publishStatus === 'publish',
          summary_html: excerpt,
          image: featuredImage ? { src: featuredImage } : undefined,
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Shopify API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const article = data.article

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Shopify' : 'Created draft on Shopify',
      postId: String(article.id),
      postUrl: `https://${shopDomain}/blogs/${metadata.blogHandle || 'news'}/${article.handle}`,
      editUrl: `https://${shopDomain}/admin/articles/${article.id}`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// WEBFLOW
// ============================================================================

async function verifyWebflow(credentials: WebflowCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    // Verify site access
    const siteResponse = await fetch(`https://api.webflow.com/v2/sites/${credentials.siteId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!siteResponse.ok) {
      const text = await siteResponse.text()
      return { success: false, message: `Webflow API error: ${siteResponse.status} - ${text}` }
    }

    const site = await siteResponse.json()

    // Verify collection access
    const collectionResponse = await fetch(
      `https://api.webflow.com/v2/collections/${credentials.collectionId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!collectionResponse.ok) {
      const text = await collectionResponse.text()
      return { success: false, message: `Collection error: ${collectionResponse.status} - ${text}` }
    }

    const collection = await collectionResponse.json()

    return {
      success: true,
      message: `Connected to ${site.displayName || site.shortName}`,
      metadata: {
        webflowSiteName: site.displayName || site.shortName,
        collectionName: collection.displayName || collection.slug,
        blogUrl: site.previewUrl,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToWebflow(
  credentials: WebflowCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    // Get collection fields to understand the schema
    const fieldsResponse = await fetch(
      `https://api.webflow.com/v2/collections/${credentials.collectionId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!fieldsResponse.ok) {
      const text = await fieldsResponse.text()
      return { success: false, message: `Failed to get collection schema: ${text}` }
    }

    const collection = await fieldsResponse.json()
    const fields = collection.fields || []

    // Build field data based on available fields
    const fieldData: Record<string, unknown> = {
      name: title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100),
    }

    // Look for common field names
    for (const field of fields) {
      const slug = field.slug?.toLowerCase()
      if (slug === 'post-body' || slug === 'body' || slug === 'content') {
        fieldData[field.slug] = html
      } else if (slug === 'title' || slug === 'name') {
        // Already set via name
      }
    }

    const response = await fetch(
      `https://api.webflow.com/v2/collections/${credentials.collectionId}/items${publishStatus === 'publish' ? '/live' : ''}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fieldData,
          isArchived: false,
          isDraft: publishStatus !== 'publish',
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Webflow API error: ${response.status} - ${text}` }
    }

    const item = await response.json()

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Webflow' : 'Created draft on Webflow',
      postId: item.id,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// BIGCOMMERCE
// ============================================================================

async function verifyBigCommerce(credentials: BigCommerceCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const storeHash = credentials.storeHash.trim()
    const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v2/store`, {
      headers: {
        'X-Auth-Token': credentials.accessToken,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `BigCommerce API error: ${response.status} - ${text}` }
    }

    const store = await response.json()

    return {
      success: true,
      message: `Connected to ${store.name}`,
      metadata: {
        bigcommerceStoreName: store.name,
        blogUrl: store.secure_url || store.domain,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToBigCommerce(
  credentials: BigCommerceCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const storeHash = credentials.storeHash.trim()

    const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v2/blog/posts`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': credentials.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title,
        body: html,
        is_published: publishStatus === 'publish',
        tags: tags,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `BigCommerce API error: ${response.status} - ${text}` }
    }

    const post = await response.json()

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to BigCommerce' : 'Created draft on BigCommerce',
      postId: String(post.id),
      postUrl: post.url,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// HUBSPOT
// ============================================================================

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100)
}

async function verifyHubSpot(credentials: HubSpotCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const response = await fetch(
      `https://api.hubapi.com/cms/v3/blogs/posts?contentGroupId=${credentials.blogId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `HubSpot API error: ${response.status} - ${text}` }
    }

    await response.json()

    return {
      success: true,
      message: 'Connected to HubSpot CMS',
      metadata: {
        hubspotBlogName: 'HubSpot Blog',
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToHubSpot(
  credentials: HubSpotCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const excerpt = createExcerpt(html, 160)

    const response = await fetch('https://api.hubapi.com/cms/v3/blogs/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: title,
        postBody: html,
        contentGroupId: credentials.blogId,
        slug: slugify(title),
        state: publishStatus === 'publish' ? 'PUBLISHED' : 'DRAFT',
        metaDescription: excerpt,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `HubSpot API error: ${response.status} - ${text}` }
    }

    const post = await response.json()

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to HubSpot' : 'Created draft on HubSpot',
      postId: post.id,
      postUrl: post.url,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// DRUPAL
// ============================================================================

async function verifyDrupal(credentials: DrupalCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const siteUrl = credentials.siteUrl.replace(/\/$/, '')
    const contentType = credentials.contentType || 'article'
    const authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')

    const response = await fetch(`${siteUrl}/jsonapi/node/${contentType}?page[limit]=1`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.api+json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Drupal API error: ${response.status} - ${text}` }
    }

    await response.json()

    return {
      success: true,
      message: `Connected to Drupal site`,
      metadata: {
        drupalSiteName: new URL(siteUrl).hostname,
        blogUrl: siteUrl,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToDrupal(
  credentials: DrupalCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const siteUrl = credentials.siteUrl.replace(/\/$/, '')
    const contentType = credentials.contentType || 'article'
    const authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')

    const response = await fetch(`${siteUrl}/jsonapi/node/${contentType}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: `node--${contentType}`,
          attributes: {
            title,
            body: { value: html, format: 'full_html' },
            status: publishStatus === 'publish',
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Drupal API error: ${response.status} - ${text}` }
    }

    const data = await response.json()
    const node = data.data

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Drupal' : 'Created draft on Drupal',
      postId: node.id,
      postUrl: node.links?.self?.href || `${siteUrl}/node/${node.attributes?.drupal_internal__nid}`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// STRAPI
// ============================================================================

async function verifyStrapi(credentials: StrapiCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const apiUrl = credentials.apiUrl.replace(/\/$/, '')

    const response = await fetch(`${apiUrl}/api/${credentials.contentType}?pagination[limit]=1`, {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Strapi API error: ${response.status} - ${text}` }
    }

    await response.json()

    return {
      success: true,
      message: `Connected to Strapi (${credentials.contentType})`,
      metadata: {
        blogUrl: apiUrl,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToStrapi(
  credentials: StrapiCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const apiUrl = credentials.apiUrl.replace(/\/$/, '')

    const response = await fetch(`${apiUrl}/api/${credentials.contentType}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          title,
          content: html,
          slug: slugify(title),
          publishedAt: publishStatus === 'publish' ? new Date().toISOString() : null,
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Strapi API error: ${response.status} - ${text}` }
    }

    const result = await response.json()
    const entry = result.data

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Strapi' : 'Created draft on Strapi',
      postId: String(entry.id),
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// BLOGGER
// ============================================================================

async function verifyBlogger(credentials: BloggerCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${credentials.blogId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: 'application/json',
      },
    })

    if (response.status === 401) {
      return { success: false, message: 'Access token expired. Please generate a new token from Google OAuth Playground.' }
    }

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Blogger API error: ${response.status} - ${text}` }
    }

    const blog = await response.json()

    return {
      success: true,
      message: `Connected to ${blog.name}`,
      metadata: {
        bloggerBlogName: blog.name,
        blogUrl: blog.url,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToBlogger(
  credentials: BloggerCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const isDraft = publishStatus !== 'publish'

    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${credentials.blogId}/posts?isDraft=${isDraft}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title,
          content: html,
          labels: tags,
        }),
      }
    )

    if (response.status === 401) {
      return { success: false, message: 'Access token expired. Please generate a new token from Google OAuth Playground.' }
    }

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Blogger API error: ${response.status} - ${text}` }
    }

    const post = await response.json()

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Blogger' : 'Created draft on Blogger',
      postId: post.id,
      postUrl: post.url,
      editUrl: `https://www.blogger.com/blog/post/edit/${credentials.blogId}/${post.id}`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// WIX
// ============================================================================

async function verifyWix(credentials: WixCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const response = await fetch('https://www.wixapis.com/blog/v3/posts?paging.limit=1', {
      headers: {
        Authorization: credentials.apiKey,
        'wix-site-id': credentials.siteId,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, message: `Wix API error: ${response.status} - ${text}` }
    }

    await response.json()

    return {
      success: true,
      message: 'Connected to Wix Blog',
      metadata: {
        wixSiteName: 'Wix Site',
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToWix(
  credentials: WixCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    // Step 1: Create draft post with HTML content node
    const createResponse = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers: {
        Authorization: credentials.apiKey,
        'wix-site-id': credentials.siteId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        draftPost: {
          title,
          richContent: {
            nodes: [
              {
                type: 'HTML',
                id: 'html-content',
                htmlData: { html },
              },
            ],
          },
        },
      }),
    })

    if (!createResponse.ok) {
      const text = await createResponse.text()
      return { success: false, message: `Wix API error: ${createResponse.status} - ${text}` }
    }

    const draft = await createResponse.json()
    const draftPostId = draft.draftPost?.id

    if (!draftPostId) {
      return { success: false, message: 'Failed to create draft post on Wix' }
    }

    // Step 2: Publish if requested
    if (publishStatus === 'publish') {
      const publishResponse = await fetch(
        `https://www.wixapis.com/blog/v3/draft-posts/${draftPostId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: credentials.apiKey,
            'wix-site-id': credentials.siteId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )

      if (!publishResponse.ok) {
        return {
          success: true,
          message: 'Created draft on Wix (publish step failed — publish manually)',
          postId: draftPostId,
        }
      }

      const published = await publishResponse.json()
      return {
        success: true,
        message: 'Published to Wix',
        postId: published.post?.id || draftPostId,
        postUrl: published.post?.url,
      }
    }

    return {
      success: true,
      message: 'Created draft on Wix',
      postId: draftPostId,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// CONTENTFUL
// ============================================================================

async function verifyContentful(credentials: ContentfulCredentials): Promise<VerifyCMSConnectionResponse> {
  try {
    const envId = credentials.environmentId || 'master'

    // Verify space access
    const spaceResponse = await fetch(`https://api.contentful.com/spaces/${credentials.spaceId}`, {
      headers: {
        Authorization: `Bearer ${credentials.managementToken}`,
        Accept: 'application/json',
      },
    })

    if (!spaceResponse.ok) {
      const text = await spaceResponse.text()
      return { success: false, message: `Contentful API error: ${spaceResponse.status} - ${text}` }
    }

    const space = await spaceResponse.json()

    // Verify content type exists
    const ctResponse = await fetch(
      `https://api.contentful.com/spaces/${credentials.spaceId}/environments/${envId}/content_types/${credentials.contentTypeId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.managementToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!ctResponse.ok) {
      return { success: false, message: `Content type "${credentials.contentTypeId}" not found in space` }
    }

    return {
      success: true,
      message: `Connected to ${space.name}`,
      metadata: {
        contentfulSpaceName: space.name,
      },
    }
  } catch (error) {
    return { success: false, message: `Failed to connect: ${(error as Error).message}` }
  }
}

async function exportToContentful(
  credentials: ContentfulCredentials,
  _metadata: CMSMetadata,
  html: string,
  title: string,
  _tags: string[],
  publishStatus: 'draft' | 'publish'
): Promise<ExportToCMSResponse> {
  try {
    const envId = credentials.environmentId || 'master'

    // Create entry — assumes content type has 'title' (Symbol) and 'body' (Text) fields
    const createResponse = await fetch(
      `https://api.contentful.com/spaces/${credentials.spaceId}/environments/${envId}/entries`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.managementToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Content-Type': credentials.contentTypeId,
        },
        body: JSON.stringify({
          fields: {
            title: { 'en-US': title },
            body: { 'en-US': html },
          },
        }),
      }
    )

    if (!createResponse.ok) {
      const text = await createResponse.text()
      return { success: false, message: `Contentful API error: ${createResponse.status} - ${text}` }
    }

    const entry = await createResponse.json()
    const entryId = entry.sys.id
    const version = entry.sys.version

    // Publish if requested
    if (publishStatus === 'publish') {
      const publishResponse = await fetch(
        `https://api.contentful.com/spaces/${credentials.spaceId}/environments/${envId}/entries/${entryId}/published`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${credentials.managementToken}`,
            'X-Contentful-Version': String(version),
          },
        }
      )

      if (!publishResponse.ok) {
        return {
          success: true,
          message: 'Created entry on Contentful (publish step failed — publish manually)',
          postId: entryId,
          editUrl: `https://app.contentful.com/spaces/${credentials.spaceId}/entries/${entryId}`,
        }
      }
    }

    return {
      success: true,
      message: publishStatus === 'publish' ? 'Published to Contentful' : 'Created draft on Contentful',
      postId: entryId,
      editUrl: `https://app.contentful.com/spaces/${credentials.spaceId}/entries/${entryId}`,
    }
  } catch (error) {
    return { success: false, message: `Export failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// MAIN EXPORTS
// ============================================================================

/**
 * Verify credentials for any CMS platform
 */
export async function verifyCMSCredentials(
  platform: CMSPlatform,
  credentials: CMSCredentials
): Promise<VerifyCMSConnectionResponse> {
  switch (platform) {
    case 'medium':
      return verifyMedium(credentials as MediumCredentials)
    case 'devto':
      return verifyDevTo(credentials as DevToCredentials)
    case 'ghost':
      return verifyGhost(credentials as GhostCredentials)
    case 'hashnode':
      return verifyHashnode(credentials as HashnodeCredentials)
    case 'shopify':
      return verifyShopify(credentials as ShopifyCredentials)
    case 'webflow':
      return verifyWebflow(credentials as WebflowCredentials)
    case 'hubspot':
      return verifyHubSpot(credentials as HubSpotCredentials)
    case 'wix':
      return verifyWix(credentials as WixCredentials)
    case 'blogger':
      return verifyBlogger(credentials as BloggerCredentials)
    case 'contentful':
      return verifyContentful(credentials as ContentfulCredentials)
    case 'strapi':
      return verifyStrapi(credentials as StrapiCredentials)
    case 'drupal':
      return verifyDrupal(credentials as DrupalCredentials)
    case 'bigcommerce':
      return verifyBigCommerce(credentials as BigCommerceCredentials)
    default:
      return { success: false, message: `Unknown platform: ${platform}` }
  }
}

/**
 * Export article to any CMS platform
 */
export async function exportToCMS(
  platform: CMSPlatform,
  credentials: CMSCredentials,
  metadata: CMSMetadata,
  html: string,
  title: string,
  tags: string[] = [],
  publishStatus: 'draft' | 'publish' = 'draft'
): Promise<ExportToCMSResponse> {
  // Extract title from HTML if not provided
  const articleTitle = title || extractTitle(html) || 'Untitled Article'

  switch (platform) {
    case 'medium':
      return exportToMedium(credentials as MediumCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'devto':
      return exportToDevTo(credentials as DevToCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'ghost':
      return exportToGhost(credentials as GhostCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'hashnode':
      return exportToHashnode(credentials as HashnodeCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'shopify':
      return exportToShopify(credentials as ShopifyCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'webflow':
      return exportToWebflow(credentials as WebflowCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'hubspot':
      return exportToHubSpot(credentials as HubSpotCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'wix':
      return exportToWix(credentials as WixCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'blogger':
      return exportToBlogger(credentials as BloggerCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'contentful':
      return exportToContentful(credentials as ContentfulCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'strapi':
      return exportToStrapi(credentials as StrapiCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'drupal':
      return exportToDrupal(credentials as DrupalCredentials, metadata, html, articleTitle, tags, publishStatus)
    case 'bigcommerce':
      return exportToBigCommerce(credentials as BigCommerceCredentials, metadata, html, articleTitle, tags, publishStatus)
    default:
      return { success: false, message: `Unknown platform: ${platform}` }
  }
}
