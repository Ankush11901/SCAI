import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  amazonAffiliateTag: text('amazon_affiliate_tag'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  // Generation preferences (JSON)
  settings: text('settings'),
  // Billing fields
  stripeCustomerId: text('stripe_customer_id'),
  planType: text('plan_type').default('free').notNull(),
})

// Sessions table for Better Auth
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Accounts table for OAuth providers
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Verification tokens for email verification
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Quota usage tracking
export const quotaUsage = sqliteTable('quota_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD format for daily tracking
  count: integer('count').notNull().default(0),
  lastGeneratedAt: integer('last_generated_at', { mode: 'timestamp' }),
})

// Generation history
export const generationHistory = sqliteTable('generation_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  articleType: text('article_type').notNull(),
  keyword: text('keyword').notNull(),
  wordCount: integer('word_count'),
  status: text('status').notNull().default('completed'), // 'pending', 'completed', 'failed'
  htmlContent: text('html_content'),
  metadata: text('metadata'), // JSON string for additional data
  jobId: text('job_id'),
  imageUrls: text('image_urls'),
  priority: integer('priority').default(0), // 0=normal/supporting, 1=pillar article
  isBulk: integer('is_bulk').default(0), // 0=single article, 1=bulk-generated (denormalized for fast filtering)
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
})

// Article images stored in Cloudflare R2
// Note: FK constraint removed due to Turso replication lag issues
export const articleImages = sqliteTable('article_images', {
  id: text('id').primaryKey(),
  historyId: text('history_id').notNull(), // References generation_history.id (no FK constraint)
  r2Key: text('r2_key').notNull(),
  publicUrl: text('public_url').notNull(),
  imageType: text('image_type'), // 'featured', 'component', 'product', etc.
  componentType: text('component_type'), // 'hero', 'comparison', 'step', etc.
  prompt: text('prompt'), // Original prompt used for generation
  status: text('status').notNull().default('completed'), // 'pending', 'generating', 'completed', 'failed'
  width: integer('width'),
  height: integer('height'),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Generation jobs for tracking Trigger.dev background tasks
// Note: FK constraints removed due to Turso replication lag issues
export const generationJobs = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(),
  historyId: text('history_id'), // References generation_history.id (no FK constraint)
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  triggerJobId: text('trigger_job_id'), // Trigger.dev job ID
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  phase: text('phase'), // 'queued', 'content', 'images', 'finalizing', 'complete'
  progress: integer('progress').default(0), // 0-100
  totalImages: integer('total_images').default(0),
  completedImages: integer('completed_images').default(0),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON string
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Article clusters for AI-driven bulk generation with interlinking
// Note: FK constraints removed due to Turso replication lag issues
export const articleClusters = sqliteTable('article_clusters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  bulkJobId: text('bulk_job_id'), // References bulk_jobs.id when generation starts (no FK constraint)
  topic: text('topic').notNull(), // e.g., "Home Fitness"
  primaryKeyword: text('primary_keyword').notNull(), // e.g., "home gym equipment"
  urlPattern: text('url_pattern').notNull(), // e.g., "/blog/{slug}"
  articleCount: integer('article_count').notNull(),
  clusterPlan: text('cluster_plan'), // JSON stringified ClusterPlan
  status: text('status').notNull().default('pending'), // 'pending', 'generating', 'interlinking', 'completed', 'failed'
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Bulk generation jobs for tracking multi-article background tasks
// Note: FK constraints removed due to Turso replication lag issues
export const bulkJobs = sqliteTable('bulk_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  triggerJobId: text('trigger_job_id'), // Trigger.dev job ID
  clusterId: text('cluster_id'), // References article_clusters.id for cluster mode (no FK constraint)
  mode: text('mode').notNull(), // 'single' | 'csv' | 'cluster'
  keyword: text('keyword'), // For single mode - the main keyword
  variation: text('variation').notNull(), // 'question' | 'statement' | 'listicle'
  status: text('status').notNull().default('pending'), // 'pending', 'queued', 'running', 'completed', 'failed', 'cancelled'
  queuePosition: integer('queue_position').default(0), // Position in user's queue (0 = running, 1+ = queued)
  quotaReserved: integer('quota_reserved').default(0), // Quota reserved when job was queued
  totalArticles: integer('total_articles').notNull(),
  completedArticles: integer('completed_articles').default(0),
  failedArticles: integer('failed_articles').default(0),
  settings: text('settings'), // JSON: { targetWordCount, variationName, provider, skipImages, etc. }
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Individual articles within a bulk generation job
// Note: FK constraints removed due to Turso replication lag issues
export const bulkJobArticles = sqliteTable('bulk_job_articles', {
  id: text('id').primaryKey(),
  bulkJobId: text('bulk_job_id').notNull(), // References bulk_jobs.id (no FK constraint)
  historyId: text('history_id'), // References generation_history.id when complete (no FK constraint)
  articleType: text('article_type').notNull(),
  keyword: text('keyword').notNull(),
  variation: text('variation'), // 'question', 'statement', 'listicle' - per-article variation
  status: text('status').notNull().default('pending'), // 'pending', 'generating', 'complete', 'error'
  phase: text('phase').default('queued'), // 'queued', 'content', 'images', 'finalizing', 'complete'
  progress: integer('progress').default(0), // 0-100
  wordCount: integer('word_count'),
  imageCount: integer('image_count'),
  htmlContent: text('html_content'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  priority: integer('priority').default(0), // 0 = sub topic, 1 = parent topic (pillar)
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Prompt test runs for the admin prompt testing page
export const promptTestRuns = sqliteTable('prompt_test_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  promptId: text('prompt_id').notNull(), // e.g., 'structure.h1', 'content.overview'
  promptName: text('prompt_name').notNull(), // Human-readable name
  category: text('category').notNull(), // 'structure', 'content', 'component', 'keyword'
  provider: text('provider').notNull(), // 'gemini', 'openai', 'claude'
  model: text('model').notNull(), // Actual model ID used
  params: text('params').notNull(), // JSON: input parameters
  prompt: text('prompt').notNull(), // JSON: { system, user, rendered }
  overrideUsed: integer('override_used', { mode: 'boolean' }).default(false),
  output: text('output').notNull(), // JSON: { raw, parsed }
  tokens: text('tokens'), // JSON: { input, output }
  duration: integer('duration'), // milliseconds
  error: text('error'), // Error message if failed
  batchId: text('batch_id'), // Groups multiple iterations of the same test
  iterationNumber: integer('iteration_number'), // 1-based iteration index within batch
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// AI Usage Logs - tracks every AI API call for cost tracking
// Note: FK constraints removed due to Turso replication lag issues
export const aiUsageLogs = sqliteTable('ai_usage_logs', {
  id: text('id').primaryKey(),
  historyId: text('history_id'), // References generation_history.id (no FK constraint)
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  bulkJobId: text('bulk_job_id'), // For bulk generation tracking (no FK constraint)
  provider: text('provider').notNull(), // 'gemini', 'openai', 'claude'
  modelId: text('model_id').notNull(), // 'gpt-4o', 'gemini-2.0-flash', etc.
  operationType: text('operation_type').notNull(), // 'text', 'object', 'stream', 'image'
  operationName: text('operation_name'), // 'generateStructure', 'streamSection', 'generateImage', etc.
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  imageCount: integer('image_count').default(0), // For image generation
  // Costs stored in micro-dollars (USD * 1,000,000) for precision
  inputCostUsd: integer('input_cost_usd').default(0),
  outputCostUsd: integer('output_cost_usd').default(0),
  imageCostUsd: integer('image_cost_usd').default(0),
  totalCostUsd: integer('total_cost_usd').default(0),
  durationMs: integer('duration_ms'),
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON for additional context
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Generation Cost Summaries - aggregated costs per article generation
// Note: FK constraints removed due to Turso replication lag issues
export const generationCostSummaries = sqliteTable('generation_cost_summaries', {
  id: text('id').primaryKey(),
  historyId: text('history_id').notNull().unique(), // References generation_history.id (no FK constraint)
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  // Aggregated token counts
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalImageCount: integer('total_image_count').default(0),
  // Provider-specific costs (micro-dollars)
  geminiCostUsd: integer('gemini_cost_usd').default(0),
  claudeCostUsd: integer('claude_cost_usd').default(0),
  openaiCostUsd: integer('openai_cost_usd').default(0),
  fluxCostUsd: integer('flux_cost_usd').default(0),
  imageCostUsd: integer('image_cost_usd').default(0),
  totalCostUsd: integer('total_cost_usd').default(0),
  // Summary metadata
  apiCallCount: integer('api_call_count').default(0),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// WordPress site connections for article export
// Note: FK constraints removed due to Turso replication lag issues
export const wordpressConnections = sqliteTable('wordpress_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  siteUrl: text('site_url').notNull(),
  username: text('username').notNull(), // WP username (for display)
  encryptedCredentials: text('encrypted_credentials').notNull(), // Encrypted "username:appPassword"
  siteName: text('site_name'),
  siteHome: text('site_home'),
  wpVersion: text('wp_version'),
  pluginStatus: text('plugin_status').default('not_checked'), // 'not_checked' | 'not_installed' | 'installing' | 'active' | 'blocked'
  installMethod: text('install_method'), // 'rest' | 'wp_admin' | 'none'
  pluginVersion: text('plugin_version'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// CMS connections for third-party platforms (Medium, Dev.to, Ghost, Hashnode, Shopify, Webflow)
// Note: FK constraints removed due to Turso replication lag issues
export const cmsConnections = sqliteTable('cms_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  platform: text('platform').notNull(), // 'medium' | 'devto' | 'ghost' | 'hashnode' | 'shopify' | 'webflow'
  name: text('name').notNull(), // User-friendly connection name
  encryptedCredentials: text('encrypted_credentials').notNull(), // AES-256-GCM encrypted JSON
  metadata: text('metadata'), // JSON: platform-specific info (blog URL, publication ID, etc.)
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastVerifiedAt: integer('last_verified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// =============================================================================
// Billing & Subscription Tables
// =============================================================================

// Subscriptions - track user plan subscriptions
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  status: text('status').notNull().default('none'), // 'none', 'active', 'past_due', 'canceled', 'incomplete'
  planType: text('plan_type').notNull().default('free'), // 'free', 'pro', 'payg'
  creditsIncluded: integer('credits_included').default(0), // Monthly credits for Pro plan
  creditsUsed: integer('credits_used').default(0), // Credits used this period
  creditsBalance: integer('credits_balance').default(0), // PAYG balance
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
// WordPress export jobs for background article export via Trigger.dev
// Note: FK constraints removed due to Turso replication lag issues
export const exportJobs = sqliteTable('export_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  connectionId: text('connection_id').notNull(), // References wordpress_connections.id (no FK constraint)
  triggerJobId: text('trigger_job_id'), // Trigger.dev job ID
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  postStatus: text('post_status').notNull().default('draft'), // 'draft' | 'publish'
  totalArticles: integer('total_articles').notNull(),
  completedArticles: integer('completed_articles').default(0),
  failedArticles: integer('failed_articles').default(0),
  // Per-article state as JSON array:
  // [{ historyId, keyword, categories, tags, status, postId?, postUrl?, editUrl?, error? }]
  articles: text('articles').notNull(),
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Credit balances - detailed credit tracking per user
export const creditBalances = sqliteTable('credit_balances', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().unique(), // References users.id
  tier: text('tier').notNull().default('free'), // 'free', 'pro', 'payg'
  // Monthly allocation (both Free and Pro)
  monthlyCredits: integer('monthly_credits').default(100), // Free = 100, Pro = 2000
  monthlyUsed: integer('monthly_used').default(0),
  billingPeriodStart: integer('billing_period_start', { mode: 'timestamp' }),
  billingPeriodEnd: integer('billing_period_end', { mode: 'timestamp' }),
  // PAYG balance (never expires)
  paygBalance: integer('payg_balance').default(0),
  // Daily credits (deprecated - now using monthly allocation for all tiers)
  dailyCredits: integer('daily_credits').default(0), // Legacy, now 0 for all tiers
  dailyUsed: integer('daily_used').default(0),
  dailyResetDate: text('daily_reset_date'), // 'YYYY-MM-DD' format
  // Credit reservation for bulk jobs (prevents single generate from consuming held credits)
  reservedCredits: integer('reserved_credits').default(0),
  // Overage tracking (Pro only)
  overageCreditsUsed: integer('overage_credits_used').default(0),
  overageCap: integer('overage_cap'), // null = unlimited
  // Stripe integration
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Credit transactions - ledger of all credit changes
export const creditTransactions = sqliteTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  amount: integer('amount').notNull(), // Positive = credit, negative = debit
  balanceAfter: integer('balance_after').notNull(), // Running balance after transaction
  type: text('type').notNull(), // 'deduction', 'refund', 'purchase', 'monthly_reset', 'daily_reset', 'subscription', 'overage'
  source: text('source'), // 'daily', 'monthly', 'payg', 'overage' - which pool credits came from
  description: text('description'),
  historyId: text('history_id'), // References generation_history.id
  bulkJobId: text('bulk_job_id'), // References bulk_jobs.id
  stripePaymentId: text('stripe_payment_id'),
  metadata: text('metadata'), // JSON for additional context
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Anonymous usage tracking for non-authenticated users
export const anonymousUsage = sqliteTable('anonymous_usage', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull(), // Browser fingerprint hash
  ipAddress: text('ip_address').notNull(), // Client IP
  dailyUsed: integer('daily_used').default(0), // Credits used today
  dailyResetDate: text('daily_reset_date').notNull(), // 'YYYY-MM-DD'
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Billing events - idempotency tracking for Stripe webhooks
export const billingEvents = sqliteTable('billing_events', {
  id: text('id').primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  payload: text('payload'), // JSON webhook payload
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// API Tokens for programmatic access
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References users.id (no FK constraint)
  name: text('name').notNull(),
  tokenPrefix: text('token_prefix').notNull(), // First 8 chars for display: 'scai_****'
  tokenHash: text('token_hash').notNull(), // SHA-256 hash of full token
  scopes: text('scopes'), // JSON array: ['generate', 'read', 'usage']
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
})

// Saved business profiles for local SEO articles
export const savedBusinesses = sqliteTable('saved_businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  businessName: text('business_name'),
  phone: text('phone'),
  hours: text('hours'),
  city: text('city'),
  stateRegion: text('state_region'),
  postalCode: text('postal_code'),
  servicesOffered: text('services_offered'),
  email: text('email'),
  website: text('website'),
  gbpUrl: text('gbp_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Saved commercial profiles for commercial articles
export const savedCommercialProfiles = sqliteTable('saved_commercial_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  productName: text('product_name'),
  category: text('category'),
  targetAudience: text('target_audience'),
  painPoint: text('pain_point'),
  keyBenefits: text('key_benefits'),
  keyFeatures: text('key_features'),
  uniqueValue: text('unique_value'),
  ctaSuggestion: text('cta_suggestion'),
  pricePosition: text('price_position'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Type exports for use in application
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type QuotaUsage = typeof quotaUsage.$inferSelect
export type NewQuotaUsage = typeof quotaUsage.$inferInsert
export type GenerationHistory = typeof generationHistory.$inferSelect
export type NewGenerationHistory = typeof generationHistory.$inferInsert
export type ArticleImage = typeof articleImages.$inferSelect
export type NewArticleImage = typeof articleImages.$inferInsert
export type GenerationJob = typeof generationJobs.$inferSelect
export type NewGenerationJob = typeof generationJobs.$inferInsert
export type PromptTestRun = typeof promptTestRuns.$inferSelect
export type NewPromptTestRun = typeof promptTestRuns.$inferInsert
export type BulkJob = typeof bulkJobs.$inferSelect
export type NewBulkJob = typeof bulkJobs.$inferInsert
export type BulkJobArticle = typeof bulkJobArticles.$inferSelect
export type NewBulkJobArticle = typeof bulkJobArticles.$inferInsert
export type ArticleCluster = typeof articleClusters.$inferSelect
export type NewArticleCluster = typeof articleClusters.$inferInsert
export type AiUsageLog = typeof aiUsageLogs.$inferSelect
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert
export type GenerationCostSummary = typeof generationCostSummaries.$inferSelect
export type NewGenerationCostSummary = typeof generationCostSummaries.$inferInsert
export type WordPressConnection = typeof wordpressConnections.$inferSelect
export type NewWordPressConnection = typeof wordpressConnections.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type CreditBalance = typeof creditBalances.$inferSelect
export type NewCreditBalance = typeof creditBalances.$inferInsert
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
export type AnonymousUsage = typeof anonymousUsage.$inferSelect
export type NewAnonymousUsage = typeof anonymousUsage.$inferInsert
export type BillingEvent = typeof billingEvents.$inferSelect
export type NewBillingEvent = typeof billingEvents.$inferInsert
export type ApiToken = typeof apiTokens.$inferSelect
export type NewApiToken = typeof apiTokens.$inferInsert
export type ExportJob = typeof exportJobs.$inferSelect
export type NewExportJob = typeof exportJobs.$inferInsert
export type CMSConnection = typeof cmsConnections.$inferSelect
export type NewCMSConnection = typeof cmsConnections.$inferInsert
export type SavedBusiness = typeof savedBusinesses.$inferSelect
export type NewSavedBusiness = typeof savedBusinesses.$inferInsert
export type SavedCommercialProfile = typeof savedCommercialProfiles.$inferSelect
export type NewSavedCommercialProfile = typeof savedCommercialProfiles.$inferInsert
