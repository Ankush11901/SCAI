'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface GenerationCostBadgeProps {
  historyId: string
  className?: string
}

interface CostData {
  totalCost: string
  totalInputTokens: number
  totalOutputTokens: number
  totalImages: number
  apiCallCount: number
}

/**
 * Badge component that displays the cost for a specific article generation.
 * Fetches cost data from the API and displays it with a tooltip showing breakdown.
 */
export function GenerationCostBadge({ historyId, className = '' }: GenerationCostBadgeProps) {
  const [cost, setCost] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchCost() {
      try {
        const res = await fetch(`/api/costs/generation/${historyId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.summary) {
            setCost({
              totalCost: data.summary.totalCost,
              totalInputTokens: data.summary.totalInputTokens,
              totalOutputTokens: data.summary.totalOutputTokens,
              totalImages: data.summary.totalImages,
              apiCallCount: data.summary.apiCallCount,
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch cost:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchCost()
  }, [historyId])

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-scai-text-muted ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
      </span>
    )
  }

  if (error || !cost) {
    return null
  }

  // Don't show if no cost data
  if (cost.totalCost === '$0.00' && cost.apiCallCount === 0) {
    return null
  }

  return (
    <span
      className={`text-xs font-medium text-scai-brand1 ${className}`}
      title={`Input: ${cost.totalInputTokens.toLocaleString()} tokens | Output: ${cost.totalOutputTokens.toLocaleString()} tokens${cost.totalImages > 0 ? ` | Images: ${cost.totalImages}` : ''} | API calls: ${cost.apiCallCount}`}
    >
      {cost.totalCost}
    </span>
  )
}
