-- Migration: Add reserved_credits column to credit_balances
-- Used by bulk/cluster generation to hold credits so single generate
-- cannot consume them while a bulk job is running.
-- Released per-article as each article is deducted or on failure.

ALTER TABLE credit_balances ADD COLUMN reserved_credits INTEGER DEFAULT 0;
