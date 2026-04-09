import { sqliteTable, AnySQLiteColumn, foreignKey, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const accounts = sqliteTable("accounts", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text(),
	idToken: text("id_token"),
	password: text(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const generationHistory = sqliteTable("generation_history", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	articleType: text("article_type").notNull(),
	keyword: text().notNull(),
	wordCount: integer("word_count"),
	status: text().default("completed").notNull(),
	htmlContent: text("html_content"),
	metadata: text(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	deletedAt: integer("deleted_at"),
	priority: integer().default(0),
	jobId: text("job_id"),
	imageUrls: text("image_urls"),
});

export const quotaUsage = sqliteTable("quota_usage", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	date: text().notNull(),
	count: integer().default(0).notNull(),
	lastGeneratedAt: integer("last_generated_at"),
});

export const sessions = sqliteTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	uniqueIndex("sessions_token_unique").on(table.token),
]);

export const users = sqliteTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	image: text(),
	emailVerified: integer("email_verified").default(0),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	amazonAffiliateTag: text("amazon_affiliate_tag"),
	stripeCustomerId: text("stripe_customer_id"),
	planType: text("plan_type").default("free").notNull(),
},
(table) => [
	uniqueIndex("users_email_unique").on(table.email),
]);

export const verifications = sqliteTable("verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const generationJobs = sqliteTable("generation_jobs", {
	id: text().primaryKey().notNull(),
	historyId: text("history_id"),
	userId: text("user_id").notNull(),
	triggerJobId: text("trigger_job_id"),
	status: text().default("pending").notNull(),
	phase: text(),
	progress: integer().default(0),
	totalImages: integer("total_images").default(0),
	completedImages: integer("completed_images").default(0),
	errorMessage: text("error_message"),
	metadata: text(),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const promptTestRuns = sqliteTable("prompt_test_runs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	promptId: text("prompt_id").notNull(),
	promptName: text("prompt_name").notNull(),
	category: text().notNull(),
	provider: text().notNull(),
	model: text().notNull(),
	params: text().notNull(),
	prompt: text().notNull(),
	overrideUsed: integer("override_used").default(0),
	output: text().notNull(),
	tokens: text(),
	duration: integer(),
	error: text(),
	createdAt: integer("created_at"),
	batchId: text("batch_id"),
	iterationNumber: integer("iteration_number"),
});

export const articleImages = sqliteTable("article_images", {
	id: text().primaryKey().notNull(),
	historyId: text("history_id").notNull(),
	r2Key: text("r2_key").notNull(),
	publicUrl: text("public_url").notNull(),
	imageType: text("image_type"),
	componentType: text("component_type"),
	prompt: text(),
	status: text().default("completed").notNull(),
	width: integer(),
	height: integer(),
	sizeBytes: integer("size_bytes"),
	mimeType: text("mime_type"),
	metadata: text(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const bulkJobArticles = sqliteTable("bulk_job_articles", {
	id: text().primaryKey().notNull(),
	bulkJobId: text("bulk_job_id").notNull(),
	historyId: text("history_id"),
	articleType: text("article_type").notNull(),
	keyword: text().notNull(),
	variation: text(),
	status: text().default("pending").notNull(),
	phase: text().default("queued"),
	progress: integer().default(0),
	wordCount: integer("word_count"),
	imageCount: integer("image_count"),
	htmlContent: text("html_content"),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at"),
	priority: integer().default(0),
});

export const bulkJobs = sqliteTable("bulk_jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	triggerJobId: text("trigger_job_id"),
	mode: text().notNull(),
	keyword: text(),
	variation: text().notNull(),
	status: text().default("pending").notNull(),
	totalArticles: integer("total_articles").notNull(),
	completedArticles: integer("completed_articles").default(0),
	failedArticles: integer("failed_articles").default(0),
	settings: text(),
	errorMessage: text("error_message"),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	queuePosition: integer("queue_position").default(0),
	quotaReserved: integer("quota_reserved").default(0),
	clusterId: text("cluster_id"),
});

export const articleClusters = sqliteTable("article_clusters", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	bulkJobId: text("bulk_job_id"),
	topic: text().notNull(),
	primaryKeyword: text("primary_keyword").notNull(),
	urlPattern: text("url_pattern").notNull(),
	articleCount: integer("article_count").notNull(),
	clusterPlan: text("cluster_plan"),
	status: text().default("pending").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const aiUsageLogs = sqliteTable("ai_usage_logs", {
	id: text().primaryKey().notNull(),
	historyId: text("history_id"),
	userId: text("user_id").notNull(),
	bulkJobId: text("bulk_job_id"),
	provider: text().notNull(),
	modelId: text("model_id").notNull(),
	operationType: text("operation_type").notNull(),
	operationName: text("operation_name"),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	totalTokens: integer("total_tokens").default(0),
	imageCount: integer("image_count").default(0),
	inputCostUsd: integer("input_cost_usd").default(0),
	outputCostUsd: integer("output_cost_usd").default(0),
	imageCostUsd: integer("image_cost_usd").default(0),
	totalCostUsd: integer("total_cost_usd").default(0),
	durationMs: integer("duration_ms"),
	success: integer().default(1),
	errorMessage: text("error_message"),
	metadata: text(),
	createdAt: integer("created_at"),
});

export const generationCostSummaries = sqliteTable("generation_cost_summaries", {
	id: text().primaryKey().notNull(),
	historyId: text("history_id").notNull(),
	userId: text("user_id").notNull(),
	totalInputTokens: integer("total_input_tokens").default(0),
	totalOutputTokens: integer("total_output_tokens").default(0),
	totalImageCount: integer("total_image_count").default(0),
	geminiCostUsd: integer("gemini_cost_usd").default(0),
	claudeCostUsd: integer("claude_cost_usd").default(0),
	openaiCostUsd: integer("openai_cost_usd").default(0),
	imageCostUsd: integer("image_cost_usd").default(0),
	totalCostUsd: integer("total_cost_usd").default(0),
	apiCallCount: integer("api_call_count").default(0),
	durationMs: integer("duration_ms"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	fluxCostUsd: integer("flux_cost_usd").default(0),
},
(table) => [
	uniqueIndex("generation_cost_summaries_history_id_unique").on(table.historyId),
]);

export const wordpressConnections = sqliteTable("wordpress_connections", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	siteUrl: text("site_url").notNull(),
	username: text().notNull(),
	encryptedCredentials: text("encrypted_credentials").notNull(),
	siteName: text("site_name"),
	siteHome: text("site_home"),
	wpVersion: text("wp_version"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	pluginStatus: text("plugin_status").default("not_checked"),
	installMethod: text("install_method"),
	pluginVersion: text("plugin_version"),
});

export const anonymousUsage = sqliteTable("anonymous_usage", {
	id: text().primaryKey().notNull(),
	fingerprint: text().notNull(),
	ipAddress: text("ip_address").notNull(),
	dailyUsed: integer("daily_used").default(0),
	dailyResetDate: text("daily_reset_date").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const apiTokens = sqliteTable("api_tokens", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	tokenPrefix: text("token_prefix").notNull(),
	tokenHash: text("token_hash").notNull(),
	scopes: text(),
	lastUsedAt: integer("last_used_at"),
	expiresAt: integer("expires_at"),
	createdAt: integer("created_at"),
	revokedAt: integer("revoked_at"),
});

export const billingEvents = sqliteTable("billing_events", {
	id: text().primaryKey().notNull(),
	stripeEventId: text("stripe_event_id").notNull(),
	eventType: text("event_type").notNull(),
	processedAt: integer("processed_at"),
	payload: text(),
	createdAt: integer("created_at"),
},
(table) => [
	uniqueIndex("billing_events_stripe_event_id_unique").on(table.stripeEventId),
]);

export const creditBalances = sqliteTable("credit_balances", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	tier: text().default("free").notNull(),
	monthlyCredits: integer("monthly_credits").default(100), // Free = 100, Pro = 2000
	monthlyUsed: integer("monthly_used").default(0),
	billingPeriodStart: integer("billing_period_start"),
	billingPeriodEnd: integer("billing_period_end"),
	paygBalance: integer("payg_balance").default(0),
	dailyCredits: integer("daily_credits").default(0), // Legacy, now 0 for all tiers
	dailyUsed: integer("daily_used").default(0),
	dailyResetDate: text("daily_reset_date"),
	overageCreditsUsed: integer("overage_credits_used").default(0),
	overageCap: integer("overage_cap"),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	uniqueIndex("credit_balances_user_id_unique").on(table.userId),
]);

export const creditTransactions = sqliteTable("credit_transactions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	amount: integer().notNull(),
	balanceAfter: integer("balance_after").notNull(),
	type: text().notNull(),
	source: text(),
	description: text(),
	historyId: text("history_id"),
	bulkJobId: text("bulk_job_id"),
	stripePaymentId: text("stripe_payment_id"),
	metadata: text(),
	createdAt: integer("created_at"),
});

export const subscriptions = sqliteTable("subscriptions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	status: text().default("none").notNull(),
	planType: text("plan_type").default("free").notNull(),
	creditsIncluded: integer("credits_included").default(0),
	creditsUsed: integer("credits_used").default(0),
	creditsBalance: integer("credits_balance").default(0),
	currentPeriodStart: integer("current_period_start"),
	currentPeriodEnd: integer("current_period_end"),
	cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
	updatedAt: integer("updated_at"),
});

export const exportJobs = sqliteTable("export_jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	connectionId: text("connection_id").notNull(),
	triggerJobId: text("trigger_job_id"),
	status: text().default("pending").notNull(),
	postStatus: text("post_status").default("draft").notNull(),
	totalArticles: integer("total_articles").notNull(),
	completedArticles: integer("completed_articles").default(0),
	failedArticles: integer("failed_articles").default(0),
	articles: text().notNull(),
	errorMessage: text("error_message"),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

