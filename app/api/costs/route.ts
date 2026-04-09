/**
 * Cost Statistics API
 *
 * GET /api/costs - Get aggregated cost statistics (admin only)
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'all' (default: 'week')
 * - groupBy: 'provider' | 'model' | 'operation' (default: 'provider')
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCostStatistics, formatCost } from '@/lib/services/cost-tracking-service'

// Check if user is admin/whitelabel
function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
  if (allowedDomain && email.endsWith(`@${allowedDomain}`)) {
    return true
  }
  return false
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!isAdminUser(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    const groupBy = (searchParams.get('groupBy') || 'provider') as 'provider' | 'model' | 'operation'

    // Calculate date range
    const now = new Date()
    let startDate: Date | undefined
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = undefined
        break
    }

    // Get statistics
    const stats = await getCostStatistics({ startDate, groupBy })

    return NextResponse.json({
      period,
      groupBy,
      startDate: startDate?.toISOString() || null,
      endDate: now.toISOString(),
      totals: stats.totals,
      breakdown: stats.breakdown,
    })
  } catch (error) {
    console.error('[API/costs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost statistics' },
      { status: 500 }
    )
  }
}
