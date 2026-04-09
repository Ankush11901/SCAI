import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { verifyCMSCredentials, type CMSPlatform, type CMSCredentials } from '@/lib/services/cms'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * POST /api/cms/verify
 * Verify CMS credentials without saving.
 *
 * Body: { platform: CMSPlatform, credentials: CMSCredentials }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { platform, credentials } = body as {
      platform: CMSPlatform
      credentials: CMSCredentials
    }

    if (!platform || !credentials) {
      return NextResponse.json(
        { error: 'platform and credentials are required' },
        { status: 400 }
      )
    }

    const result = await verifyCMSCredentials(platform, credentials)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('[cms-verify] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
