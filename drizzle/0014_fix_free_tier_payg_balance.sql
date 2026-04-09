-- Migration: Fix invalid PAYG balance for free tier users
-- Issue: refundCredits() was always adding refunds to paygBalance regardless of tier
-- This caused free tier users to incorrectly accumulate PAYG credits
-- 
-- This migration:
-- 1. Resets paygBalance to 0 for all free tier accounts
-- 2. Resets overageCreditsUsed to 0 for all free tier accounts (free tier doesn't have overage)
-- 3. Sets overageCap to NULL for free tier accounts

-- Reset PAYG balance for free tier users (should always be 0)
UPDATE credit_balances 
SET payg_balance = 0 
WHERE tier = 'free' AND payg_balance != 0;

-- Reset overage credits used for free tier users (free tier doesn't have overage)
UPDATE credit_balances 
SET overage_credits_used = 0 
WHERE tier = 'free' AND overage_credits_used != 0;

-- Reset overage cap for free tier users (free tier doesn't have overage)
UPDATE credit_balances 
SET overage_cap = NULL 
WHERE tier = 'free' AND overage_cap IS NOT NULL;
