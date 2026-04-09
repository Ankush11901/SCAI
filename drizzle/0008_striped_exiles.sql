CREATE TABLE `anonymous_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`ip_address` text NOT NULL,
	`daily_used` integer DEFAULT 0,
	`daily_reset_date` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`scopes` text,
	`last_used_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`processed_at` integer,
	`payload` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_events_stripe_event_id_unique` ON `billing_events` (`stripe_event_id`);--> statement-breakpoint
CREATE TABLE `credit_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`monthly_credits` integer DEFAULT 0,
	`monthly_used` integer DEFAULT 0,
	`billing_period_start` integer,
	`billing_period_end` integer,
	`payg_balance` integer DEFAULT 0,
	`daily_credits` integer DEFAULT 3,
	`daily_used` integer DEFAULT 0,
	`daily_reset_date` text,
	`overage_credits_used` integer DEFAULT 0,
	`overage_cap` integer,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_balances_user_id_unique` ON `credit_balances` (`user_id`);--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`type` text NOT NULL,
	`source` text,
	`description` text,
	`history_id` text,
	`bulk_job_id` text,
	`stripe_payment_id` text,
	`metadata` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`status` text DEFAULT 'none' NOT NULL,
	`plan_type` text DEFAULT 'free' NOT NULL,
	`credits_included` integer DEFAULT 0,
	`credits_used` integer DEFAULT 0,
	`credits_balance` integer DEFAULT 0,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `wordpress_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_url` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_credentials` text NOT NULL,
	`site_name` text,
	`site_home` text,
	`wp_version` text,
	`plugin_status` text DEFAULT 'not_checked',
	`install_method` text,
	`plugin_version` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `generation_cost_summaries` ADD `flux_cost_usd` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generation_history` ADD `job_id` text;--> statement-breakpoint
ALTER TABLE `generation_history` ADD `image_urls` text;--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `plan_type` text DEFAULT 'free' NOT NULL;