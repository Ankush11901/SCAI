import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type {
  CMSPlatform,
  CMSCredentials,
  CMSConnectionData,
  CMSMetadata,
} from '@/lib/services/cms/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateConnectionRequest {
  platform: CMSPlatform
  name: string
  credentials: CMSCredentials
}

export interface VerifyCredentialsRequest {
  platform: CMSPlatform
  credentials: CMSCredentials
}

export interface VerifyCredentialsResponse {
  success: boolean
  message: string
  metadata?: CMSMetadata
}

export interface ExportRequest {
  connectionId: string
  historyId: string
  title?: string
  tags?: string[]
  publishStatus?: 'draft' | 'publish'
}

export interface ExportResponse {
  success: boolean
  message: string
  postId?: string
  postUrl?: string
  editUrl?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchCMSConnections(): Promise<CMSConnectionData[]> {
  const response = await fetch('/api/cms/connections')
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch CMS connections')
  }
  const json = await response.json()
  return json.data
}

async function createCMSConnection(request: CreateConnectionRequest): Promise<CMSConnectionData> {
  const response = await fetch('/api/cms/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create connection')
  }
  const json = await response.json()
  return json.data
}

async function deleteCMSConnection(id: string): Promise<void> {
  const response = await fetch(`/api/cms/connections?id=${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete connection')
  }
}

async function verifyCMSCredentials(
  request: VerifyCredentialsRequest
): Promise<VerifyCredentialsResponse> {
  const response = await fetch('/api/cms/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Verification failed')
  }
  return data
}

async function exportToCMS(request: ExportRequest): Promise<ExportResponse> {
  const response = await fetch('/api/cms/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Export failed')
  }
  return data
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch user's CMS connections
 */
export function useCMSConnections() {
  return useQuery({
    queryKey: ['cms-connections'],
    queryFn: fetchCMSConnections,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Create a new CMS connection
 */
export function useCreateCMSConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCMSConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-connections'] })
    },
  })
}

/**
 * Delete a CMS connection
 */
export function useDeleteCMSConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCMSConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-connections'] })
    },
  })
}

/**
 * Verify CMS credentials without saving
 */
export function useVerifyCMSCredentials() {
  return useMutation({
    mutationFn: verifyCMSCredentials,
  })
}

/**
 * Export article to CMS
 */
export function useExportToCMS() {
  return useMutation({
    mutationFn: exportToCMS,
  })
}

/**
 * Invalidate CMS queries
 */
export function useInvalidateCMSQueries() {
  const queryClient = useQueryClient()
  return {
    invalidateCMS: () => queryClient.invalidateQueries({ queryKey: ['cms-connections'] }),
  }
}
