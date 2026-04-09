import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import {
  getConnections,
  createConnection,
  deleteConnection,
  verifyCMSCredentials,
  type CMSPlatform,
  type CMSCredentials,
} from '@/lib/services/cms'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * GET /api/cms/connections
 * List all CMS connections for the authenticated user.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const connections = await getConnections(userId)
    return NextResponse.json({ success: true, data: connections })
  } catch (error) {
    console.error('[cms-connections] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to fetch connections: ${msg}` }, { status: 500 })
  }
}

/**
 * POST /api/cms/connections
 * Create a new CMS connection.
 *
 * Body: { platform: CMSPlatform, name: string, credentials: CMSCredentials }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { platform, name, credentials } = body as {
      platform: CMSPlatform
      name: string
      credentials: CMSCredentials
    }

    if (!platform || !name || !credentials) {
      return NextResponse.json(
        { error: 'platform, name, and credentials are required' },
        { status: 400 }
      )
    }

    // Verify credentials before saving
    const verification = await verifyCMSCredentials(platform, credentials)
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.message, verified: false },
        { status: 400 }
      )
    }

    // Create the connection with verified metadata
    const connection = await createConnection(
      userId,
      { platform, name, credentials },
      verification.metadata
    )

    return NextResponse.json({
      success: true,
      data: connection,
      message: verification.message,
    })
  } catch (error) {
    console.error('[cms-connections] Create error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * DELETE /api/cms/connections?id=<connectionId>
 * Delete a CMS connection.
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

    const deleted = await deleteConnection(id, userId)

    if (!deleted) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('[cms-connections] Delete error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
