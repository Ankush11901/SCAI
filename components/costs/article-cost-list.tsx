'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Cpu,
  Image,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ArticleCost {
  historyId: string
  keyword: string
  articleType: string
  wordCount: number | null
  status: string
  createdAt: string
  cost: {
    totalCost: string
    totalCostMicro: number
    apiCallCount: number
    totalTokens: number
    totalImages: number
    byProvider: {
      gemini: string
      claude: string
      openai: string
      images: string
    }
  }
}

interface OperationLog {
  id: string
  provider: string
  modelId: string
  operationType: string
  operationName: string | null
  inputTokens: number
  outputTokens: number
  imageCount: number
  cost: string
  costMicro: number
  durationMs: number
  success: boolean
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ArticleCostListProps {
  period: string
}

export function ArticleCostList({ period }: ArticleCostListProps) {
  const [articles, setArticles] = useState<ArticleCost[]>([])
  const [totals, setTotals] = useState<{ totalCost: string; articleCount: number } | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, OperationLog[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 10

  // Fetch articles on mount/period/page change
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/costs/by-article?period=${period}&page=${page}&limit=${ITEMS_PER_PAGE}`)
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Admin access required')
          }
          throw new Error('Failed to fetch article costs')
        }
        const data = await res.json()
        setArticles(data.articles)
        setTotals(data.totals)
        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [period, page])

  // Reset page when period changes
  useEffect(() => {
    setPage(1)
  }, [period])

  // Handle expand/collapse
  const handleExpand = async (historyId: string) => {
    if (expandedId === historyId) {
      setExpandedId(null)
      return
    }

    setExpandedId(historyId)

    // Fetch details if not already cached
    if (!details[historyId]) {
      setLoadingDetails(historyId)
      try {
        const res = await fetch(`/api/costs/generation/${historyId}`)
        if (res.ok) {
          const data = await res.json()
          setDetails(prev => ({ ...prev, [historyId]: data.logs || [] }))
        }
      } catch (err) {
        console.error('Failed to fetch operation details:', err)
      } finally {
        setLoadingDetails(null)
      }
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Article type badge colors - brighter for dark backgrounds
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      affiliate: 'bg-green-500/20 text-green-400 border-green-500/40',
      informational: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'how-to': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      review: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      comparison: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      recipe: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      commercial: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      listicle: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
      local: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    }
    return colors[type] || 'bg-scai-surface text-scai-text-sec border-scai-border'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-scai-brand1" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
        <p className="text-scai-text-sec">{error}</p>
      </div>
    )
  }

  if (articles.length === 0 && page === 1) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-scai-text-muted" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Tracked Costs</h3>
        <p className="text-scai-text-sec">No articles with tracked costs found for this period</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {totals && (
        <div className="bg-scai-brand1/10 border border-scai-brand1/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-scai-text-sec">
            <strong className="text-white">{totals.articleCount}</strong> articles with tracked costs
          </span>
          <span className="text-scai-brand1 font-semibold text-lg">
            {totals.totalCost}
          </span>
        </div>
      )}

      {/* Article list */}
      <div className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright overflow-hidden">
        {articles.map((article, index) => (
          <div
            key={article.historyId}
            className={index !== 0 ? 'border-t border-scai-border' : ''}
          >
            {/* Article row */}
            <button
              onClick={() => handleExpand(article.historyId)}
              className="w-full px-4 py-3 flex items-center gap-4 hover:bg-scai-surface/50 transition-colors text-left"
            >
              {/* Expand icon */}
              <div className="text-scai-text-sec">
                {expandedId === article.historyId ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>

              {/* Article info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white truncate">
                    {article.keyword}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getTypeBadgeColor(article.articleType)}`}>
                    {article.articleType}
                  </span>
                  {article.status !== 'completed' && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                      article.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {article.status}
                    </span>
                  )}
                </div>
                <div className="text-sm text-scai-text-sec flex items-center gap-3">
                  <span>{formatDate(article.createdAt)}</span>
                  {article.wordCount && (
                    <span>{article.wordCount.toLocaleString()} words</span>
                  )}
                </div>
              </div>

              {/* Cost summary */}
              <div className="text-right">
                <div className="font-semibold text-scai-brand1">{article.cost.totalCost}</div>
                <div className="text-xs text-scai-text-sec">
                  {article.cost.apiCallCount} calls • {article.cost.totalImages} images
                </div>
              </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
              {expandedId === article.historyId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-scai-surface/50 border-t border-scai-border"
                >
                  <div className="px-4 py-4 pl-12">
                    {/* Provider breakdown */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-[#0a0a0a] rounded-lg p-3 border border-scai-border">
                        <div className="text-xs text-scai-text-sec mb-1">Gemini</div>
                        <div className="font-medium text-white">{article.cost.byProvider.gemini}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3 border border-scai-border">
                        <div className="text-xs text-scai-text-sec mb-1">Claude</div>
                        <div className="font-medium text-white">{article.cost.byProvider.claude}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3 border border-scai-border">
                        <div className="text-xs text-scai-text-sec mb-1">OpenAI</div>
                        <div className="font-medium text-white">{article.cost.byProvider.openai}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3 border border-scai-border">
                        <div className="text-xs text-scai-text-sec mb-1">Images</div>
                        <div className="font-medium text-white">{article.cost.byProvider.images}</div>
                      </div>
                    </div>

                    {/* Operation details table */}
                    <div className="text-sm font-medium text-scai-text-sec mb-2">Operation Details</div>
                    {loadingDetails === article.historyId ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-scai-brand1" />
                      </div>
                    ) : details[article.historyId]?.length ? (
                      <div className="bg-[#0a0a0a] rounded-lg border border-scai-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-scai-surface border-b border-scai-border">
                              <th className="text-left px-3 py-2 font-medium text-scai-text-sec">Operation</th>
                              <th className="text-left px-3 py-2 font-medium text-scai-text-sec">Model</th>
                              <th className="text-right px-3 py-2 font-medium text-scai-text-sec">Tokens</th>
                              <th className="text-right px-3 py-2 font-medium text-scai-text-sec">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details[article.historyId].map((log) => (
                              <tr key={log.id} className="border-b border-scai-border/50 last:border-b-0 hover:bg-scai-surface/30 transition-colors">
                                <td className="px-3 py-2 text-white">
                                  <div className="flex items-center gap-2">
                                    {log.operationType === 'image' ? (
                                      <Image className="w-4 h-4 text-amber-400" />
                                    ) : (
                                      <Cpu className="w-4 h-4 text-blue-400" />
                                    )}
                                    {log.operationName || log.operationType}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-scai-text-sec font-mono text-xs">
                                  {log.modelId}
                                </td>
                                <td className="px-3 py-2 text-right text-scai-text-sec">
                                  {log.operationType === 'image'
                                    ? `${log.imageCount} img`
                                    : `${((log.inputTokens + log.outputTokens) / 1000).toFixed(1)}K`
                                  }
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-scai-brand1">
                                  {log.cost}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-scai-text-sec text-center py-4 bg-[#0a0a0a] rounded-lg border border-scai-border">
                        No operation logs available
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border border-scai-border-bright rounded-xl">
          <div className="text-sm text-scai-text-sec">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, pagination.totalCount)} of {pagination.totalCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage(p => p - 1)}
              disabled={!pagination.hasPrev}
              variant="secondary"
              size="icon"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-2 text-scai-text-sec">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        p === page
                          ? 'bg-scai-brand1 text-black font-bold'
                          : 'text-scai-text-sec hover:bg-scai-surface hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </div>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNext}
              variant="secondary"
              size="icon"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
