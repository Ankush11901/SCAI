-- Add isBulk column to generation_history for fast filtering without LIKE scan
-- Replaces: metadata NOT LIKE '%"bulkJobId"%' (required full table scan over 2GB+)
-- With:     is_bulk = 0 (uses index, no table row access needed)

ALTER TABLE generation_history ADD COLUMN is_bulk INTEGER DEFAULT 0;
