import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string
  articleType: string
  keyword: string
  wordCount: number
  status: 'pending' | 'completed' | 'failed'
  priority?: number
  createdAt: string
  updatedAt: string
  metadata: {
    variation?: string
  } | null
}

export interface HistoryEntryDetail extends HistoryEntry {
  htmlContent: string
}

export interface HistoryOptions {
  limit?: number
  offset?: number
  articleType?: string
  status?: string
}

export interface QuotaInfo {
  used: number
  limit: number
  remaining: number
  unlimited: boolean
  resetDate: string
}

export interface BulkJob {
  id: string
  mode: string
  keyword?: string
  variation: string
  status: string
  totalArticles: number
  completedArticles: number
  failedArticles: number
  stats: {
    total: number
    complete: number
    error: number
    pending: number
    totalWords: number
    totalCostMicroDollars: number
  }
  createdAt: string
  completedAt?: string
}

export interface BulkJobArticle {
  id: string
  articleType: string
  keyword: string
  status: string
  wordCount?: number
  imageCount?: number
  htmlContent?: string
  historyId?: string
  priority: number
  errorMessage?: string
  completedAt?: string
}

export interface BulkJobDetail {
  job: BulkJob
  articles: BulkJobArticle[]
  stats: {
    total: number
    complete: number
    error: number
    pending: number
    generating: number
    totalWords: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchHistory(options: HistoryOptions = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.offset) params.append('offset', options.offset.toString())
  if (options.articleType && options.articleType !== 'all')
    params.append('articleType', options.articleType)
  if (options.status && options.status !== 'all')
    params.append('status', options.status)

  const response = await fetch(`/api/history?${params}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch history')
  }
  return response.json()
}

async function fetchHistoryEntry(id: string) {
  const response = await fetch(`/api/history/${id}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch entry')
  }
  return response.json()
}

async function fetchQuota() {
  const response = await fetch('/api/quota')
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch quota')
  }
  return response.json()
}

async function fetchBulkJobs(limit = 50) {
  const response = await fetch(`/api/bulk/history?limit=${limit}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch bulk jobs')
  }
  return response.json()
}

async function fetchBulkJob(jobId: string) {
  const response = await fetch(`/api/bulk/${jobId}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch job')
  }
  return response.json()
}

export interface CostOptions {
  period?: string
  groupBy?: string
}

async function fetchCosts(options: CostOptions = {}) {
  const params = new URLSearchParams()
  if (options.period) params.append('period', options.period)
  if (options.groupBy) params.append('groupBy', options.groupBy)

  const response = await fetch(`/api/costs?${params}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch costs')
  }
  return response.json()
}

export interface CostsByArticleOptions {
  period?: string
  limit?: number
  offset?: number
}

async function fetchCostsByArticle(options: CostsByArticleOptions = {}) {
  const params = new URLSearchParams()
  if (options.period) params.append('period', options.period)
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.offset) params.append('offset', options.offset.toString())

  const response = await fetch(`/api/costs/by-article?${params}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch costs by article')
  }
  return response.json()
}

async function fetchArticleTypes() {
  const response = await fetch('/api/article-types')
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch article types')
  }
  return response.json()
}

// WordPress connection (credentials stripped)
export interface WordPressConnectionInfo {
  id: string
  siteUrl: string
  username: string
  siteName: string | null
  siteHome: string | null
  wpVersion: string | null
  pluginStatus: string | null
  installMethod: string | null
  pluginVersion: string | null
  createdAt: string
  updatedAt: string
}


async function fetchWordPressConnections(): Promise<WordPressConnectionInfo[]> {
  const response = await fetch('/api/wordpress/connections')
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch WordPress connections')
  }
  const result = await response.json()
  return result.data
}

async function initiateWordPressConnect(siteUrl: string): Promise<string> {
  const response = await fetch('/api/wordpress/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteUrl }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to initiate connection')
  }
  const result = await response.json()
  return result.data.authUrl as string
}

async function deleteWordPressConnection(id: string) {
  const response = await fetch(`/api/wordpress/connections?id=${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to disconnect')
  }
  return response.json()
}

async function verifyWordPressConnection(connectionId: string) {
  const response = await fetch('/api/wordpress/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Verification failed')
  }
  const result = await response.json()
  return result.data.healthy as boolean
}


async function pluginAction(params: { connectionId: string; action: string; pluginZipUrl?: string }) {
  const response = await fetch('/api/wordpress/plugin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Plugin action failed')
  }
  const result = await response.json()
  return result.data
}

async function deleteHistoryEntry(id: string) {
  const response = await fetch(`/api/history?id=${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete entry')
  }
  return response.json()
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch user's generation history with pagination and filtering
 */
export function useHistory(options: HistoryOptions = {}) {
  return useQuery({
    queryKey: ['history', options],
    queryFn: () => fetchHistory(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single history entry with full content
 */
export function useHistoryEntry(id: string | null) {
  return useQuery({
    queryKey: ['history', 'entry', id],
    queryFn: () => fetchHistoryEntry(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch user's quota information
 */
export function useQuota() {
  return useQuery({
    queryKey: ['quota'],
    queryFn: fetchQuota,
    staleTime: 30 * 1000, // 30 seconds — credit balance is critical
    refetchOnWindowFocus: true,
  })
}

/**
 * Fetch user's bulk generation jobs
 */
export function useBulkJobs(limit = 50) {
  return useQuery({
    queryKey: ['bulk-jobs', limit],
    queryFn: () => fetchBulkJobs(limit),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Fetch a single bulk job with all its articles
 */
export function useBulkJobArticles(jobId: string) {
  return useQuery({
    queryKey: ['bulk-job', jobId],
    queryFn: () => fetchBulkJob(jobId),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch cost statistics (admin)
 */
export function useCosts(options: CostOptions = {}) {
  return useQuery({
    queryKey: ['costs', options],
    queryFn: () => fetchCosts(options),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Fetch costs grouped by article
 */
export function useCostsByArticle(options: CostsByArticleOptions = {}) {
  return useQuery({
    queryKey: ['costs', 'by-article', options],
    queryFn: () => fetchCostsByArticle(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch article types (static data)
 */
export function useArticleTypes() {
  return useQuery({
    queryKey: ['article-types'],
    queryFn: fetchArticleTypes,
    staleTime: Infinity, // Never refetch (static data)
  })
}

/**
 * Fetch user's WordPress connections
 */
export function useWordPressConnections() {
  return useQuery({
    queryKey: ['wordpress', 'connections'],
    queryFn: fetchWordPressConnections,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initiate WordPress Application Passwords connection.
 * Returns an auth URL to open in a popup.
 */
export function useInitiateWordPressConnect() {
  return useMutation({
    mutationFn: initiateWordPressConnect,
  })
}

/**
 * Disconnect a WordPress site
 */
export function useDisconnectWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWordPressConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress', 'connections'] })
    },
  })
}

/**
 * Verify a WordPress connection
 */
export function useVerifyWordPress() {
  return useMutation({
    mutationFn: verifyWordPressConnection,
  })
}


// ═══════════════════════════════════════════════════════════════════════════════
// WORDPRESS TAXONOMY HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface WpTaxonomyItem {
  id: number
  name: string
  slug: string
  count: number
}

export interface WpTaxonomyData {
  categories: WpTaxonomyItem[]
  tags: WpTaxonomyItem[]
}

export interface TaxonomySuggestion {
  categories: string[]
  tags: string[]
  newCategories: string[]
  newTags: string[]
}

async function fetchWordPressTaxonomy(connectionId: string): Promise<WpTaxonomyData> {
  const response = await fetch(`/api/wordpress/taxonomy?connectionId=${encodeURIComponent(connectionId)}`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch taxonomy')
  }
  const result = await response.json()
  return result.data
}

async function fetchTaxonomySuggestions(
  connectionId: string,
  historyIds: string[]
): Promise<Record<string, TaxonomySuggestion>> {
  const response = await fetch('/api/wordpress/suggest-taxonomy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId, historyIds }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to suggest taxonomy')
  }
  const result = await response.json()
  return result.data.suggestions
}

/**
 * Fetch categories and tags from a connected WordPress site
 */
export function useWordPressTaxonomy(connectionId: string | null) {
  return useQuery({
    queryKey: ['wordpress', 'taxonomy', connectionId],
    queryFn: () => fetchWordPressTaxonomy(connectionId!),
    enabled: !!connectionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * AI-powered taxonomy suggestions for articles
 */
export function useSuggestTaxonomy() {
  return useMutation({
    mutationFn: ({ connectionId, historyIds }: { connectionId: string; historyIds: string[] }) =>
      fetchTaxonomySuggestions(connectionId, historyIds),
  })
}

/**
 * Check plugin readiness on a WordPress connection
 */
export function useCheckPlugin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) =>
      pluginAction({ connectionId, action: 'check' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress', 'connections'] })
    },
  })
}

/**
 * Install plugin via WP REST API
 */
export function useInstallPlugin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { connectionId: string; pluginZipUrl?: string }) =>
      pluginAction({ ...params, action: 'install' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress', 'connections'] })
    },
  })
}

/**
 * Verify plugin is active (after manual install)
 */
export function useVerifyPlugin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) =>
      pluginAction({ connectionId, action: 'verify' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress', 'connections'] })
    },
  })
}

/**
 * Delete a history entry and invalidate relevant caches
 */
export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteHistoryEntry,
    onSuccess: () => {
      // Invalidate history queries to refetch
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE INVALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to get cache invalidation functions
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateHistory: () =>
      queryClient.invalidateQueries({ queryKey: ['history'] }),
    invalidateQuota: () =>
      queryClient.invalidateQueries({ queryKey: ['quota'] }),
    invalidateBulkJobs: () =>
      queryClient.invalidateQueries({ queryKey: ['bulk-jobs'] }),
    invalidateBulkJob: (jobId: string) =>
      queryClient.invalidateQueries({ queryKey: ['bulk-job', jobId] }),
    invalidateCosts: () =>
      queryClient.invalidateQueries({ queryKey: ['costs'] }),
    invalidateWordPress: () =>
      queryClient.invalidateQueries({ queryKey: ['wordpress'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}
