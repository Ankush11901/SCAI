-- Add indexes to generation_history for dramatically faster list queries
-- Before: ~18-36s per query (full table scan over 2GB+ of HTML blobs)
-- After: expected <100ms (index-only lookup)

-- Primary composite index: covers the main list query
-- WHERE user_id = ? AND deleted_at IS NULL ORDER BY priority DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_gen_history_user_deleted_priority_created
  ON generation_history(user_id, deleted_at, priority DESC, created_at DESC);

-- Filtered by status (used when status filter is applied)
CREATE INDEX IF NOT EXISTS idx_gen_history_user_status
  ON generation_history(user_id, deleted_at, status, priority DESC, created_at DESC);

-- Filtered by article type (used when type filter is applied)
CREATE INDEX IF NOT EXISTS idx_gen_history_user_type
  ON generation_history(user_id, deleted_at, article_type, priority DESC, created_at DESC);

-- Article images lookup (used in single entry detail view)
CREATE INDEX IF NOT EXISTS idx_article_images_history
  ON article_images(history_id);
