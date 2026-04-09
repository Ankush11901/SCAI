'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  DollarSign,
  Cpu,
  Image,
  Loader2,
  RefreshCcw,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { MODEL_SPECS, IMAGE_PRICING } from '@/lib/ai/models'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { ArticleCostList } from '@/components/costs/article-cost-list'
import { useCosts } from '@/lib/hooks/queries'

export default function CostsPage() {
  const [viewMode, setViewMode] = useState<'operations' | 'articles'>('operations')
  const [period, setPeriod] = useState('week')
  const [groupBy, setGroupBy] = useState('provider')

  // TanStack Query hook
  const queryOptions = useMemo(() => ({ period, groupBy }), [period, groupBy])
  const { data, isLoading, error, refetch } = useCosts(queryOptions)

  // Calculate max for bar chart scaling
  const maxCost = data?.breakdown?.reduce((max: number, item: { totalCost: number }) => Math.max(max, item.totalCost), 0) || 1

  if (error?.message === 'Admin access required') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-scai-text-muted" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Admin Access Required</h1>
          <p className="text-scai-text-sec">You need admin privileges to view cost statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-scai-brand1" />
            </div>
            AI Cost Dashboard
          </h1>
          <p className="text-scai-text-sec mt-1">Monitor AI usage and costs across all generations</p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'operations' && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-scai-input rounded-lg">
          <button
            onClick={() => setViewMode('operations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'operations'
                ? 'bg-scai-card shadow-sm text-scai-text'
                : 'text-scai-text-sec hover:text-scai-text'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Operations
          </button>
          <button
            onClick={() => setViewMode('articles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'articles'
                ? 'bg-scai-card shadow-sm text-scai-text'
                : 'text-scai-text-sec hover:text-scai-text'
            }`}
          >
            <FileText className="w-4 h-4" />
            By Article
          </button>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24h</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === 'operations' && (
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="provider">By Provider</SelectItem>
              <SelectItem value="model">By Model</SelectItem>
              <SelectItem value="operation">By Operation</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Article View */}
      {viewMode === 'articles' && (
        <ArticleCostList period={period} />
      )}

      {/* Operations View */}
      {viewMode === 'operations' && (isLoading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-scai-brand1" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-scai-text-sec mb-4">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-scai-brand1/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-scai-brand1" />
                </div>
                <span className="text-sm font-medium text-scai-text-sec">Total Cost</span>
              </div>
              <p className="text-3xl font-bold text-white">{data.totals.totalCost}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-scai-text-sec">API Calls</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.totals.totalCalls.toLocaleString()}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-scai-text-sec">Tokens Used</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {((data.totals.totalInputTokens + data.totals.totalOutputTokens) / 1000).toFixed(1)}K
              </p>
              <p className="text-xs text-scai-text-sec mt-1">
                In: {(data.totals.totalInputTokens / 1000).toFixed(1)}K | Out: {(data.totals.totalOutputTokens / 1000).toFixed(1)}K
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Image className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-scai-text-sec">Images Generated</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.totals.totalImages.toLocaleString()}
              </p>
            </motion.div>
          </div>

          {/* Cost Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">
              Cost Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
            </h2>

            {data.breakdown.length === 0 ? (
              <p className="text-scai-text-sec text-center py-8">No data available for this period</p>
            ) : (
              <div className="space-y-4">
                {data.breakdown.map((item: { group: string; totalCost: number; totalCostFormatted: string; callCount: number }, index: number) => (
                  <motion.div
                    key={item.group}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-32 font-medium text-scai-text-sec truncate" title={item.group}>
                      {item.group}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 bg-scai-surface rounded-full overflow-hidden border border-scai-border">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.totalCost / maxCost) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.1 * index }}
                          className="h-full bg-gradient-to-r from-scai-brand1 to-scai-brand2 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-semibold text-white">{item.totalCostFormatted}</span>
                    </div>
                    <div className="w-20 text-right text-sm text-scai-text-sec">
                      {item.callCount} calls
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Model Pricing Reference */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0a] rounded-xl border border-scai-border-bright p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-scai-brand1" />
              Model Pricing Reference
            </h2>

            {/* Text Models Table */}
            <h3 className="text-sm font-medium text-scai-text-sec mb-3">Text Generation</h3>
            <div className="overflow-x-auto mb-6 rounded-lg border border-scai-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-scai-surface border-b border-scai-border">
                    <th className="text-left py-3 px-4 font-medium text-scai-text-sec">Model</th>
                    <th className="text-left py-3 px-4 font-medium text-scai-text-sec">Provider</th>
                    <th className="text-right py-3 px-4 font-medium text-scai-text-sec">Input / 1K tokens</th>
                    <th className="text-right py-3 px-4 font-medium text-scai-text-sec">Output / 1K tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(MODEL_SPECS).map((model) => (
                    <tr key={model.id} className="border-b border-scai-border/50 hover:bg-scai-surface/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{model.name}</td>
                      <td className="py-3 px-4 text-scai-text-sec capitalize">{model.provider}</td>
                      <td className="py-3 px-4 text-right font-mono text-scai-brand1">
                        ${model.costPer1kInputTokens.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-scai-brand1">
                        ${model.costPer1kOutputTokens.toFixed(5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Image Models Table */}
            <h3 className="text-sm font-medium text-scai-text-sec mb-3">Image Generation</h3>
            <div className="overflow-x-auto rounded-lg border border-scai-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-scai-surface border-b border-scai-border">
                    <th className="text-left py-3 px-4 font-medium text-scai-text-sec">Model</th>
                    <th className="text-right py-3 px-4 font-medium text-scai-text-sec">Cost per Image</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(IMAGE_PRICING).map(([modelId, cost]) => (
                    <tr key={modelId} className="border-b border-scai-border/50 hover:bg-scai-surface/30 transition-colors">
                      <td className="py-3 px-4 font-medium font-mono text-white">{modelId}</td>
                      <td className="py-3 px-4 text-right font-mono text-scai-brand1">${cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Footer info */}
          <p className="text-sm text-scai-text-muted text-center">
            Data from {data.startDate ? new Date(data.startDate).toLocaleDateString() : 'all time'} to{' '}
            {new Date(data.endDate).toLocaleDateString()}
          </p>
        </>
      ) : null)}
    </div>
  )
}
