-- Migration: Add indexes for bulk generation performance
-- Created: 2026-02-24
-- Purpose: Optimize database queries for concurrent bulk generation operations

-- Bulk jobs queries (filtered by userId and status frequently)
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_user_status 
ON bulk_jobs(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status_queue 
ON bulk_jobs(status, queue_position, created_at DESC);

-- Bulk job articles (queried by job ID and status for progress tracking)
CREATE INDEX IF NOT EXISTS idx_bulk_job_articles_job_status 
ON bulk_job_articles(bulk_job_id, status);

CREATE INDEX IF NOT EXISTS idx_bulk_job_articles_job_phase 
ON bulk_job_articles(bulk_job_id, phase, progress);

-- Generation history (queried by user for recent articles)
CREATE INDEX IF NOT EXISTS idx_generation_history_user_created 
ON generation_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_history_bulk_job 
ON generation_history(bulk_job_id, created_at DESC);

-- AI usage logs (queried by history_id for cost aggregation)
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_history_created 
ON ai_usage_logs(history_id, created_at);

-- Credit transactions (queried by user for balance checks)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
ON credit_transactions(user_id, created_at DESC);

-- Generation cost summaries (queried by user and date range)
CREATE INDEX IF NOT EXISTS idx_generation_cost_summaries_user 
ON generation_cost_summaries(user_id, created_at DESC);
