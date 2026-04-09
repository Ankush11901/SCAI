CREATE TABLE `ai_usage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`history_id` text,
	`user_id` text NOT NULL,
	`bulk_job_id` text,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`operation_type` text NOT NULL,
	`operation_name` text,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`total_tokens` integer DEFAULT 0,
	`image_count` integer DEFAULT 0,
	`input_cost_usd` integer DEFAULT 0,
	`output_cost_usd` integer DEFAULT 0,
	`image_cost_usd` integer DEFAULT 0,
	`total_cost_usd` integer DEFAULT 0,
	`duration_ms` integer,
	`success` integer DEFAULT true,
	`error_message` text,
	`metadata` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `generation_cost_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`history_id` text NOT NULL,
	`user_id` text NOT NULL,
	`total_input_tokens` integer DEFAULT 0,
	`total_output_tokens` integer DEFAULT 0,
	`total_image_count` integer DEFAULT 0,
	`gemini_cost_usd` integer DEFAULT 0,
	`claude_cost_usd` integer DEFAULT 0,
	`openai_cost_usd` integer DEFAULT 0,
	`image_cost_usd` integer DEFAULT 0,
	`total_cost_usd` integer DEFAULT 0,
	`api_call_count` integer DEFAULT 0,
	`duration_ms` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_cost_summaries_history_id_unique` ON `generation_cost_summaries` (`history_id`);