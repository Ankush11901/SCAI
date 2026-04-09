CREATE TABLE `export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`trigger_job_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`post_status` text DEFAULT 'draft' NOT NULL,
	`total_articles` integer NOT NULL,
	`completed_articles` integer DEFAULT 0,
	`failed_articles` integer DEFAULT 0,
	`articles` text NOT NULL,
	`error_message` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `credit_balances` DROP COLUMN `id`;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `created_at`;