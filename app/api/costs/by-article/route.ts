/**
 * Cost by Article API
 *
 * GET /api/costs/by-article - Get costs grouped by article (admin only)
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'all' (default: 'week')
 * - page: number (default: 1)
 * - limit: number (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generationHistory, generationCostSummaries } from '@/lib/db/schema'
import { eq, and, gte, desc, isNull, sql } from 'drizzle-orm'
import { formatCost } from '@/lib/services/cost-tracking-service'

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const offset = (page - 1) * limit

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

    // Build where conditions - filter out soft-deleted articles
    const whereConditions = [isNull(generationHistory.deletedAt)]
    if (startDate) {
      whereConditions.push(gte(generationCostSummaries.createdAt, startDate))
    }

    // Get total count (only articles WITH cost summaries)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationCostSummaries)
      .innerJoin(generationHistory, eq(generationHistory.id, generationCostSummaries.historyId))
      .where(and(...whereConditions))

    const totalCount = Number(countResult[0]?.count || 0)
    const totalPages = Math.ceil(totalCount / limit)

    // Get paginated results - INNER JOIN to only get articles with cost summaries
    const results = await db
      .select({
        historyId: generationHistory.id,
        keyword: generationHistory.keyword,
        articleType: generationHistory.articleType,
        wordCount: generationHistory.wordCount,
        status: generationHistory.status,
        createdAt: generationHistory.createdAt,
        // Cost summary fields
        totalCostUsd: generationCostSummaries.totalCostUsd,
        apiCallCount: generationCostSummaries.apiCallCount,
        totalInputTokens: generationCostSummaries.totalInputTokens,
        totalOutputTokens: generationCostSummaries.totalOutputTokens,
        totalImageCount: generationCostSummaries.totalImageCount,
        geminiCostUsd: generationCostSummaries.geminiCostUsd,
        claudeCostUsd: generationCostSummaries.claudeCostUsd,
        openaiCostUsd: generationCostSummaries.openaiCostUsd,
        imageCostUsd: generationCostSummaries.imageCostUsd,
      })
      .from(generationCostSummaries)
      .innerJoin(generationHistory, eq(generationHistory.id, generationCostSummaries.historyId))
      .where(and(...whereConditions))
      .orderBy(desc(generationCostSummaries.createdAt))
      .limit(limit)
      .offset(offset)

    // Format response
    const articles = results.map(r => ({
      historyId: r.historyId,
      keyword: r.keyword,
      articleType: r.articleType,
      wordCount: r.wordCount,
      status: r.status,
      createdAt: r.createdAt?.toISOString(),
      cost: {
        totalCost: formatCost(r.totalCostUsd || 0),
        totalCostMicro: r.totalCostUsd || 0,
        apiCallCount: r.apiCallCount || 0,
        totalTokens: (r.totalInputTokens || 0) + (r.totalOutputTokens || 0),
        totalImages: r.totalImageCount || 0,
        byProvider: {
          gemini: formatCost(r.geminiCostUsd || 0),
          claude: formatCost(r.claudeCostUsd || 0),
          openai: formatCost(r.openaiCostUsd || 0),
          images: formatCost(r.imageCostUsd || 0),
        }
      }
    }))

    // Calculate totals for current page
    const pageTotalCost = articles.reduce((sum, a) => sum + (a.cost.totalCostMicro || 0), 0)

    // Get grand total for all matching articles
    const grandTotalResult = await db
      .select({ total: sql<number>`sum(${generationCostSummaries.totalCostUsd})` })
      .from(generationCostSummaries)
      .innerJoin(generationHistory, eq(generationHistory.id, generationCostSummaries.historyId))
      .where(and(...whereConditions))

    const grandTotalMicro = Number(grandTotalResult[0]?.total || 0)

    return NextResponse.json({
      period,
      startDate: startDate?.toISOString() || null,
      endDate: now.toISOString(),
      articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      totals: {
        totalCost: formatCost(grandTotalMicro),
        totalCostMicro: grandTotalMicro,
        articleCount: totalCount,
        pageTotalCost: formatCost(pageTotalCost),
      },
    })
  } catch (error) {
    console.error('[API/costs/by-article] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article costs' },
      { status: 500 }
    )
  }
}
