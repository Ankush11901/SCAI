import crypto from 'crypto'
import { db, wordpressConnections } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt } from '@/lib/utils/encryption'
import { wpGetSiteInfo } from './wp-fetch'
import type { WordPressConnection } from '@/lib/db/schema'

function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Build the WordPress Application Passwords authorization URL.
 * The `state` parameter is an encrypted token containing the userId
 * to prevent CSRF when the callback is received.
 */
export function buildAuthUrl(siteUrl: string, userId: string, callbackBaseUrl: string): string {
  const normalizedUrl = siteUrl.replace(/\/+$/, '')

  // Encrypt userId + siteUrl + timestamp into a state token
  const statePayload = JSON.stringify({
    userId,
    siteUrl: normalizedUrl,
    ts: Date.now(),
  })
  const state = encrypt(statePayload)

  const params = new URLSearchParams({
    app_name: 'SCAI Article Generator',
    app_id: crypto.randomUUID(),
    success_url: `${callbackBaseUrl}/api/wordpress/callback?state=${encodeURIComponent(state)}`,
    reject_url: `${callbackBaseUrl}/api/wordpress/callback?rejected=1&state=${encodeURIComponent(state)}`,
  })

  return `${normalizedUrl}/wp-admin/authorize-application.php?${params.toString()}`
}

/**
 * Decrypt and validate the state token from the OAuth callback.
 */
export function decryptState(state: string): { userId: string; siteUrl: string; ts: number } {
  const payload = decrypt(state)
  const parsed = JSON.parse(payload)

  // Validate timestamp (15-minute expiry)
  if (Date.now() - parsed.ts > 15 * 60 * 1000) {
    throw new Error('Authorization expired. Please try again.')
  }

  return parsed
}

/**
 * Save a WordPress connection after successful OAuth callback.
 * Called when WP redirects back with user_login + password.
 */
export async function saveConnection(
  userId: string,
  siteUrl: string,
  username: string,
  appPassword: string
): Promise<WordPressConnection> {
  const normalizedUrl = siteUrl.replace(/\/+$/, '')

  // Encrypt credentials for storage
  const encryptedCredentials = encrypt(`${username}:${appPassword}`)

  // Fetch site info
  let siteName: string | null = null
  let siteHome: string | null = null
  let wpVersion: string | null = null

  try {
    const info = await wpGetSiteInfo(normalizedUrl, username, appPassword)
    siteName = info.name || null
    siteHome = info.home || null
  } catch {
    // Non-critical — we still save the connection
  }

  const now = new Date()

  // Check if connection already exists for this site + user
  const existing = await db
    .select()
    .from(wordpressConnections)
    .where(
      and(
        eq(wordpressConnections.userId, userId),
        eq(wordpressConnections.siteUrl, normalizedUrl)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(wordpressConnections)
      .set({
        username,
        encryptedCredentials,
        siteName,
        siteHome,
        wpVersion,
        updatedAt: now,
      })
      .where(eq(wordpressConnections.id, existing[0].id))

    const [updated] = await db
      .select()
      .from(wordpressConnections)
      .where(eq(wordpressConnections.id, existing[0].id))
      .limit(1)

    return updated
  }

  // Create new connection
  const id = generateId()
  await db.insert(wordpressConnections).values({
    id,
    userId,
    siteUrl: normalizedUrl,
    username,
    encryptedCredentials,
    siteName,
    siteHome,
    wpVersion,
    createdAt: now,
    updatedAt: now,
  })

  const [connection] = await db
    .select()
    .from(wordpressConnections)
    .where(eq(wordpressConnections.id, id))
    .limit(1)

  return connection
}

/**
 * Get all WordPress connections for a user (credentials stripped).
 */
export async function getUserConnections(userId: string) {
  const connections = await db
    .select({
      id: wordpressConnections.id,
      userId: wordpressConnections.userId,
      siteUrl: wordpressConnections.siteUrl,
      username: wordpressConnections.username,
      siteName: wordpressConnections.siteName,
      siteHome: wordpressConnections.siteHome,
      wpVersion: wordpressConnections.wpVersion,
      pluginStatus: wordpressConnections.pluginStatus,
      installMethod: wordpressConnections.installMethod,
      pluginVersion: wordpressConnections.pluginVersion,
      createdAt: wordpressConnections.createdAt,
      updatedAt: wordpressConnections.updatedAt,
    })
    .from(wordpressConnections)
    .where(eq(wordpressConnections.userId, userId))

  return connections
}

/**
 * Get a single connection with decrypted credentials (internal use only).
 */
export async function getConnectionWithCredentials(
  id: string,
  userId: string
): Promise<{ connection: WordPressConnection; username: string; password: string } | null> {
  const [conn] = await db
    .select()
    .from(wordpressConnections)
    .where(
      and(
        eq(wordpressConnections.id, id),
        eq(wordpressConnections.userId, userId)
      )
    )
    .limit(1)

  if (!conn) return null

  const decrypted = decrypt(conn.encryptedCredentials)
  const colonIndex = decrypted.indexOf(':')
  const username = decrypted.substring(0, colonIndex)
  const password = decrypted.substring(colonIndex + 1)

  return { connection: conn, username, password }
}

/**
 * Verify a WordPress connection is still healthy by calling the REST API.
 */
export async function verifyConnection(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await getConnectionWithCredentials(id, userId)
  if (!result) throw new Error('Connection not found')

  try {
    const info = await wpGetSiteInfo(result.connection.siteUrl, result.username, result.password)

    // Update site info if available
    if (info.name) {
      await db
        .update(wordpressConnections)
        .set({
          siteName: info.name,
          siteHome: info.home,
          updatedAt: new Date(),
        })
        .where(eq(wordpressConnections.id, id))
    }

    return true
  } catch {
    return false
  }
}

/**
 * Disconnect a WordPress site (just remove from our DB).
 */
export async function disconnectSite(id: string, userId: string): Promise<void> {
  await db
    .delete(wordpressConnections)
    .where(
      and(
        eq(wordpressConnections.id, id),
        eq(wordpressConnections.userId, userId)
      )
    )
}
