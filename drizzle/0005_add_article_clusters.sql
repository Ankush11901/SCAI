CREATE TABLE `article_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bulk_job_id` text,
	`topic` text NOT NULL,
	`primary_keyword` text NOT NULL,
	`url_pattern` text NOT NULL,
	`article_count` integer NOT NULL,
	`cluster_plan` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `bulk_jobs` ADD `cluster_id` text;