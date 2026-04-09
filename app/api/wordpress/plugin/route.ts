import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import {
  checkPluginReadiness,
  installPluginViaRest,
  verifyPluginInstallation,
  getWpAdminInstallUrl,
} from '@/lib/services/wordpress/plugin-service'
import { getConnectionWithCredentials } from '@/lib/services/wordpress/connection-service'

async function getAuthenticatedUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id || null
}

/**
 * POST /api/wordpress/plugin
 *
 * Actions:
 *   - check:   Check if plugin is installed and whether REST install is available
 *   - install: Attempt to install the plugin via WP REST API
 *   - verify:  Verify the plugin is active (after manual install)
 *
 * Body: { connectionId: string, action: 'check' | 'install' | 'verify' }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { connectionId, action } = body

    if (!connectionId || !action) {
      return NextResponse.json(
        { error: 'connectionId and action are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'check': {
        const readiness = await checkPluginReadiness(connectionId, userId)
        return NextResponse.json({ success: true, data: readiness })
      }

      case 'install': {
        const result = await installPluginViaRest(connectionId, userId, body.pluginZipUrl)
        return NextResponse.json({ success: result.success, data: result })
      }

      case 'verify': {
        const result = await verifyPluginInstallation(connectionId, userId)
        return NextResponse.json({ success: true, data: result })
      }

      case 'manual-url': {
        const conn = await getConnectionWithCredentials(connectionId, userId)
        if (!conn) {
          return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
        }
        const url = getWpAdminInstallUrl(conn.connection.siteUrl)
        return NextResponse.json({ success: true, data: { url } })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[wp-plugin] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
