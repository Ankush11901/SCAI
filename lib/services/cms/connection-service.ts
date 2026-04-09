/**
 * CMS Connection Service
 * Handles CRUD operations for CMS connections with AES-256-GCM encryption
 */

import { db, cmsConnections, type CMSConnection } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type {
  CMSPlatform,
  CMSCredentials,
  CMSMetadata,
  CMSConnectionData,
  CreateCMSConnectionRequest,
} from './types'

// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.CMS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || ''

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('CMS_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable is required')
  }
  // If key is hex-encoded (64 chars), decode it; otherwise use as-is
  if (ENCRYPTION_KEY.length === 64) {
    return Buffer.from(ENCRYPTION_KEY, 'hex')
  }
  // Pad or truncate to 32 bytes
  const key = Buffer.alloc(32)
  Buffer.from(ENCRYPTION_KEY).copy(key)
  return key
}

/**
 * Encrypt credentials using AES-256-GCM
 */
export function encryptCredentials(credentials: CMSCredentials): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const plaintext = JSON.stringify(credentials)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: base64(iv + authTag + encrypted)
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt credentials using AES-256-GCM
 */
export function decryptCredentials<T extends CMSCredentials>(encrypted: string): T {
  const key = getEncryptionKey()
  const combined = Buffer.from(encrypted, 'base64')

  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const ciphertext = combined.subarray(28)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as T
}

/**
 * Generate a unique ID for connections
 */
function generateId(): string {
  return `cms_${randomBytes(12).toString('hex')}`
}

/**
 * Transform database record to connection data
 */
function toConnectionData(record: CMSConnection): CMSConnectionData {
  return {
    id: record.id,
    userId: record.userId,
    platform: record.platform as CMSPlatform,
    name: record.name,
    metadata: record.metadata ? JSON.parse(record.metadata) : null,
    isActive: record.isActive ?? true,
    lastVerifiedAt: record.lastVerifiedAt,
    createdAt: record.createdAt!,
    updatedAt: record.updatedAt!,
  }
}

/**
 * Get all CMS connections for a user
 */
export async function getConnections(userId: string): Promise<CMSConnectionData[]> {
  const records = await db.query.cmsConnections.findMany({
    where: eq(cmsConnections.userId, userId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })

  return records.map(toConnectionData)
}

/**
 * Get a specific connection by ID
 */
export async function getConnection(
  connectionId: string,
  userId: string
): Promise<CMSConnectionData | null> {
  const record = await db.query.cmsConnections.findFirst({
    where: and(eq(cmsConnections.id, connectionId), eq(cmsConnections.userId, userId)),
  })

  return record ? toConnectionData(record) : null
}

/**
 * Get connection with decrypted credentials (for internal use only)
 */
export async function getConnectionWithCredentials(
  connectionId: string,
  userId: string
): Promise<{ connection: CMSConnectionData; credentials: CMSCredentials } | null> {
  const record = await db.query.cmsConnections.findFirst({
    where: and(eq(cmsConnections.id, connectionId), eq(cmsConnections.userId, userId)),
  })

  if (!record) return null

  return {
    connection: toConnectionData(record),
    credentials: decryptCredentials(record.encryptedCredentials),
  }
}

/**
 * Create a new CMS connection
 */
export async function createConnection(
  userId: string,
  request: CreateCMSConnectionRequest,
  metadata?: CMSMetadata
): Promise<CMSConnectionData> {
  const id = generateId()
  const encryptedCredentials = encryptCredentials(request.credentials)
  const now = new Date()

  await db.insert(cmsConnections).values({
    id,
    userId,
    platform: request.platform,
    name: request.name,
    encryptedCredentials,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isActive: true,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    userId,
    platform: request.platform,
    name: request.name,
    metadata: metadata ?? null,
    isActive: true,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update a CMS connection
 */
export async function updateConnection(
  connectionId: string,
  userId: string,
  updates: {
    name?: string
    credentials?: CMSCredentials
    metadata?: CMSMetadata
    isActive?: boolean
  }
): Promise<CMSConnectionData | null> {
  const existing = await getConnection(connectionId, userId)
  if (!existing) return null

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) {
    updateValues.name = updates.name
  }
  if (updates.credentials !== undefined) {
    updateValues.encryptedCredentials = encryptCredentials(updates.credentials)
    updateValues.lastVerifiedAt = new Date()
  }
  if (updates.metadata !== undefined) {
    updateValues.metadata = JSON.stringify(updates.metadata)
  }
  if (updates.isActive !== undefined) {
    updateValues.isActive = updates.isActive
  }

  await db
    .update(cmsConnections)
    .set(updateValues)
    .where(and(eq(cmsConnections.id, connectionId), eq(cmsConnections.userId, userId)))

  return getConnection(connectionId, userId)
}

/**
 * Delete a CMS connection
 */
export async function deleteConnection(connectionId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(cmsConnections)
    .where(and(eq(cmsConnections.id, connectionId), eq(cmsConnections.userId, userId)))

  return result.rowsAffected > 0
}

/**
 * Update verification timestamp
 */
export async function updateVerificationTime(
  connectionId: string,
  userId: string
): Promise<void> {
  await db
    .update(cmsConnections)
    .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(cmsConnections.id, connectionId), eq(cmsConnections.userId, userId)))
}

/**
 * Get connections by platform
 */
export async function getConnectionsByPlatform(
  userId: string,
  platform: CMSPlatform
): Promise<CMSConnectionData[]> {
  const records = await db.query.cmsConnections.findMany({
    where: and(eq(cmsConnections.userId, userId), eq(cmsConnections.platform, platform)),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })

  return records.map(toConnectionData)
}
