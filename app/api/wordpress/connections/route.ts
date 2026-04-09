import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAuthSession } from '@/lib/auth'
import {
  getUserConnections,
  buildAuthUrl,
  disconnectSite,
} from '@/lib/services/wordpress/connection-service'

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const authSession = await getAuthSession()
    return authSession?.user?.id || null
  } catch {
    return null
  }
}

/**
 * GET /api/wordpress/connections
 * List all WordPress connections for the authenticated user.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const connections = await getUserConnections(userId)
    return NextResponse.json({ success: true, data: connections })
  } catch (error) {
    console.error('[wp-connections] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to fetch connections: ${msg}` }, { status: 500 })
  }
}

/**
 * POST /api/wordpress/connections
 * Initiate WordPress Application Passwords authorization.
 * Returns { authUrl } that the frontend opens in a popup.
 *
 * Body: { siteUrl: string }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { siteUrl } = body

    if (!siteUrl) {
      return NextResponse.json({ error: 'siteUrl is required' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = siteUrl.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, '')

    // Determine callback base URL from request headers
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'https'
    const callbackBaseUrl = `${protocol}://${host}`

    const authUrl = buildAuthUrl(normalizedUrl, userId, callbackBaseUrl)

    return NextResponse.json({ success: true, data: { authUrl } })
  } catch (error) {
    console.error('[wp-connections] Auth URL error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/**
 * DELETE /api/wordpress/connections?id=<connectionId>
 * Disconnect and remove a WordPress connection.
 */
export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 })
    }

    await disconnectSite(id, userId)

    return NextResponse.json({ success: true, message: 'Disconnected successfully' })
  } catch (error) {
    console.error('[wp-connections] Disconnect error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
