/**
 * WordPress plugin install, verify, and handshake service.
 *
 * Manages the lifecycle of our SCAI Renderer plugin on connected WP sites:
 *   1. Check if plugin is already active (ping)
 *   2. Check if REST plugin management is available
 *   3. Install via REST API or provide manual-install URL
 *   4. Verify installation via ping
 */

import { db, wordpressConnections } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { wpFetch } from './wp-fetch'
import { getConnectionWithCredentials } from './connection-service'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PluginStatus = 'not_checked' | 'not_installed' | 'installing' | 'active' | 'blocked'
export type InstallMethod = 'rest' | 'wp_admin' | 'none'

interface PluginReadiness {
  pluginInstalled: boolean
  pluginVersion?: string
  canRestInstall: boolean
}

interface PluginInstallResult {
  success: boolean
  version?: string
  error?: string
}

interface PluginPingResponse {
  active: boolean
  version: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Attempt a raw fetch to the WP REST API without using wpFetch
 * (which throws on non-200). Returns { ok, status, data? }.
 */
async function wpProbe<T>(
  siteUrl: string,
  username: string,
  password: string,
  path: string,
  method = 'GET',
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data?: T }> {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json${path}`
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }
  const init: RequestInit = { method, headers }

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, init)
    if (res.ok) {
      const data = (await res.json()) as T
      return { ok: true, status: res.status, data }
    }
    return { ok: false, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

async function updatePluginFields(
  connectionId: string,
  fields: {
    pluginStatus?: PluginStatus
    installMethod?: InstallMethod
    pluginVersion?: string | null
  }
) {
  await db
    .update(wordpressConnections)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(wordpressConnections.id, connectionId))
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether the SCAI plugin is installed and whether REST install is possible.
 */
export async function checkPluginReadiness(
  connectionId: string,
  userId: string
): Promise<PluginReadiness> {
  const connData = await getConnectionWithCredentials(connectionId, userId)
  if (!connData) throw new Error('Connection not found')

  const { connection, username, password } = connData

  // 1. Ping the plugin's custom endpoint
  const ping = await wpProbe<PluginPingResponse>(
    connection.siteUrl,
    username,
    password,
    '/scai/v1/ping'
  )

  if (ping.ok && ping.data?.active) {
    await updatePluginFields(connectionId, {
      pluginStatus: 'active',
      pluginVersion: ping.data.version || null,
    })
    return {
      pluginInstalled: true,
      pluginVersion: ping.data.version,
      canRestInstall: false, // irrelevant when already installed
    }
  }

  // 2. Check if REST plugin management endpoint is accessible
  const plugins = await wpProbe(
    connection.siteUrl,
    username,
    password,
    '/wp/v2/plugins'
  )

  const canRestInstall = plugins.ok || plugins.status === 200

  await updatePluginFields(connectionId, {
    pluginStatus: 'not_installed',
  })

  return {
    pluginInstalled: false,
    canRestInstall,
  }
}

/**
 * Attempt to install the SCAI plugin via the WP REST API.
 *
 * Uses the `/wp/v2/plugins` endpoint to install from a slug.
 * If that fails (plugin not on wordpress.org yet), this will return an error
 * and the frontend should fall back to manual install.
 */
export async function installPluginViaRest(
  connectionId: string,
  userId: string,
  pluginZipUrl?: string
): Promise<PluginInstallResult> {
  const connData = await getConnectionWithCredentials(connectionId, userId)
  if (!connData) throw new Error('Connection not found')

  const { connection, username, password } = connData

  await updatePluginFields(connectionId, { pluginStatus: 'installing' })

  try {
    // Attempt install — the WP REST API accepts either a slug (wordpress.org)
    // or a download URL (self-hosted zip).
    const installBody: Record<string, unknown> = pluginZipUrl
      ? { source: pluginZipUrl, status: 'active' }
      : { slug: 'seo-content-ai', status: 'active' }

    const install = await wpProbe<{ plugin: string; status: string }>(
      connection.siteUrl,
      username,
      password,
      '/wp/v2/plugins',
      'POST',
      installBody
    )

    if (!install.ok) {
      await updatePluginFields(connectionId, { pluginStatus: 'not_installed' })
      return {
        success: false,
        error: `REST install failed (HTTP ${install.status}). Use manual install instead.`,
      }
    }

    // Verify via ping
    const ping = await wpProbe<PluginPingResponse>(
      connection.siteUrl,
      username,
      password,
      '/scai/v1/ping'
    )

    if (ping.ok && ping.data?.active) {
      await updatePluginFields(connectionId, {
        pluginStatus: 'active',
        installMethod: 'rest',
        pluginVersion: ping.data.version || null,
      })
      return { success: true, version: ping.data.version }
    }

    // Installed but not responding — may need activation
    await updatePluginFields(connectionId, { pluginStatus: 'not_installed' })
    return {
      success: false,
      error: 'Plugin was installed but ping endpoint did not respond. Try activating it manually in wp-admin.',
    }
  } catch (err) {
    await updatePluginFields(connectionId, { pluginStatus: 'not_installed' })
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Verify that the plugin is currently active by pinging it.
 * Used after manual install to confirm installation.
 */
export async function verifyPluginInstallation(
  connectionId: string,
  userId: string
): Promise<{ installed: boolean; version?: string }> {
  const connData = await getConnectionWithCredentials(connectionId, userId)
  if (!connData) throw new Error('Connection not found')

  const { connection, username, password } = connData

  const ping = await wpProbe<PluginPingResponse>(
    connection.siteUrl,
    username,
    password,
    '/scai/v1/ping'
  )

  if (ping.ok && ping.data?.active) {
    await updatePluginFields(connectionId, {
      pluginStatus: 'active',
      installMethod: connection.installMethod as InstallMethod || 'wp_admin',
      pluginVersion: ping.data.version || null,
    })
    return { installed: true, version: ping.data.version }
  }

  await updatePluginFields(connectionId, { pluginStatus: 'not_installed' })
  return { installed: false }
}

/**
 * Get the wp-admin URL for manually uploading a plugin zip.
 */
export function getWpAdminInstallUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/wp-admin/plugin-install.php?tab=upload`
}
