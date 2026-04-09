import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { verifyConnection } from '@/lib/services/wordpress/connection-service'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * POST /api/wordpress/verify
 * Verify a WordPress connection is healthy.
 * Body: { connectionId: string }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { connectionId } = body

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
    }

    const healthy = await verifyConnection(connectionId, userId)

    return NextResponse.json({ success: true, data: { healthy } })
  } catch (error) {
    console.error('[wp-verify] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
