CREATE TABLE `bulk_job_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`bulk_job_id` text NOT NULL,
	`history_id` text,
	`article_type` text NOT NULL,
	`keyword` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`phase` text DEFAULT 'queued',
	`progress` integer DEFAULT 0,
	`word_count` integer,
	`image_count` integer,
	`html_content` text,
	`error_message` text,
	`retry_count` integer DEFAULT 0,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `bulk_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`trigger_job_id` text,
	`mode` text NOT NULL,
	`keyword` text,
	`variation` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_articles` integer NOT NULL,
	`completed_articles` integer DEFAULT 0,
	`failed_articles` integer DEFAULT 0,
	`settings` text,
	`error_message` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `prompt_test_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`prompt_name` text NOT NULL,
	`category` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`params` text NOT NULL,
	`prompt` text NOT NULL,
	`override_used` integer DEFAULT false,
	`output` text NOT NULL,
	`tokens` text,
	`duration` integer,
	`error` text,
	`batch_id` text,
	`iteration_number` integer,
	`created_at` integer
);
