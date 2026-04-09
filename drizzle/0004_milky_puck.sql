ALTER TABLE `bulk_jobs` ADD `queue_position` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bulk_jobs` ADD `quota_reserved` integer DEFAULT 0;