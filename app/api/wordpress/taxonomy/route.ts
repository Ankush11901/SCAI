import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { getConnectionWithCredentials } from '@/lib/services/wordpress/connection-service'
import { wpFetch } from '@/lib/services/wordpress/wp-fetch'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

export interface WpTaxonomyItem {
  id: number
  name: string
  slug: string
  count: number
}

/**
 * GET /api/wordpress/taxonomy?connectionId=xxx
 * Fetch categories and tags from a connected WordPress site.
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const connectionId = req.nextUrl.searchParams.get('connectionId')
  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
  }

  try {
    const connData = await getConnectionWithCredentials(connectionId, userId)
    if (!connData) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { connection, username, password } = connData
    const siteUrl = connection.siteUrl

    // Fetch categories and tags in parallel
    const [categories, tags] = await Promise.all([
      wpFetch<Array<{ id: number; name: string; slug: string; count: number }>>({
        siteUrl,
        username,
        password,
        path: '/wp/v2/categories?per_page=100&orderby=count&order=desc',
      }),
      wpFetch<Array<{ id: number; name: string; slug: string; count: number }>>({
        siteUrl,
        username,
        password,
        path: '/wp/v2/tags?per_page=100&orderby=count&order=desc',
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count })),
        tags: tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, count: t.count })),
      },
    })
  } catch (error) {
    console.error('[wp-taxonomy] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to fetch taxonomy: ${msg}` }, { status: 500 })
  }
}
