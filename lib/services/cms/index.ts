/**
 * CMS Integration Services
 * Re-exports all CMS-related functionality
 */

// Types
export * from './types'

// Connection management
export {
  getConnections,
  getConnection,
  getConnectionWithCredentials,
  createConnection,
  updateConnection,
  deleteConnection,
  updateVerificationTime,
  getConnectionsByPlatform,
  encryptCredentials,
  decryptCredentials,
} from './connection-service'

// Platform-specific operations
export { verifyCMSCredentials, exportToCMS } from './platforms'

// HTML to Markdown conversion
export {
  htmlToMarkdown,
  extractTitle,
  extractFeaturedImage,
  createExcerpt,
  stripHtml,
} from './html-to-markdown'
