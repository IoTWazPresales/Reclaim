-- ============================================================================
-- Training Module - Hardening & Data Integrity
-- Run this AFTER SUPABASE_TRAINING_TABLES.sql and SUPABASE_TRAINING_PROFILES.sql
-- ============================================================================

-- ============================================================================
-- 1. Add NOT NULL constraints where appropriate
-- ============================================================================

-- training_sessions: ensure critical fields are NOT NULL
ALTER TABLE training_sessions
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN mode SET NOT NULL,
  ALTER COLUMN goals SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- training_session_items: ensure critical fields are NOT NULL
ALTER TABLE training_session_items
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN session_id SET NOT NULL,
  ALTER COLUMN exercise_id SET NOT NULL,
  ALTER COLUMN order_index SET NOT NULL,
  ALTER COLUMN planned SET NOT NULL,
  ALTER COLUMN skipped SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- training_set_logs: ensure critical fields are NOT NULL
ALTER TABLE training_set_logs
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN session_item_id SET NOT NULL,
  ALTER COLUMN set_index SET NOT NULL,
  ALTER COLUMN reps SET NOT NULL,
  ALTER COLUMN completed_at SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- ============================================================================
-- 2. Add additional check constraints
-- ============================================================================

-- Ensure reps are positive
ALTER TABLE training_set_logs
  ADD CONSTRAINT training_set_logs_reps_positive CHECK (reps > 0);

-- Ensure set_index is positive
ALTER TABLE training_set_logs
  ADD CONSTRAINT training_set_logs_set_index_positive CHECK (set_index > 0);

-- Ensure order_index is non-negative
ALTER TABLE training_session_items
  ADD CONSTRAINT training_session_items_order_index_non_negative CHECK (order_index >= 0);

-- Ensure weight is non-negative (if provided)
ALTER TABLE training_set_logs
  ADD CONSTRAINT training_set_logs_weight_non_negative CHECK (weight IS NULL OR weight >= 0);

-- Ensure started_at <= ended_at (if both present)
ALTER TABLE training_sessions
  ADD CONSTRAINT training_sessions_time_order CHECK (
    started_at IS NULL OR ended_at IS NULL OR started_at <= ended_at
  );

-- ============================================================================
-- 3. Add composite indexes for common query patterns
-- ============================================================================

-- For fetching user sessions with items (common in history view)
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_started 
  ON training_sessions(user_id, started_at DESC);

-- For fetching session items in order
CREATE INDEX IF NOT EXISTS idx_training_session_items_session_order 
  ON training_session_items(session_id, order_index ASC);

-- For fetching set logs by session item (with ordering)
CREATE INDEX IF NOT EXISTS idx_training_set_logs_item_set 
  ON training_set_logs(session_item_id, set_index ASC);

-- For performance queries: exercise_id + completed_at
CREATE INDEX IF NOT EXISTS idx_training_session_items_exercise_created 
  ON training_session_items(exercise_id, created_at DESC);

-- For batch performance queries
CREATE INDEX IF NOT EXISTS idx_training_set_logs_completed_desc 
  ON training_set_logs(completed_at DESC);

-- ============================================================================
-- 4. Verify RLS is enabled and policies are correct
-- ============================================================================

-- Ensure RLS is enabled (should already be, but verify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'training_sessions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'training_session_items' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE training_session_items ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'training_set_logs' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE training_set_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'training_profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE training_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- 5. Add function to verify user_id integrity (for debugging)
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_training_user_integrity()
RETURNS TABLE (
  table_name TEXT,
  orphaned_count BIGINT,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'training_sessions'::TEXT,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = training_sessions.user_id)),
    'Sessions with invalid user_id'::TEXT
  FROM training_sessions
  UNION ALL
  SELECT 
    'training_session_items'::TEXT,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id = training_session_items.session_id
    )),
    'Items with invalid session_id'::TEXT
  FROM training_session_items
  UNION ALL
  SELECT 
    'training_set_logs'::TEXT,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM training_session_items 
      WHERE training_session_items.id = training_set_logs.session_item_id
    )),
    'Set logs with invalid session_item_id'::TEXT
  FROM training_set_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Validation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Training hardening complete';
  RAISE NOTICE 'Added: NOT NULL constraints, check constraints, composite indexes';
  RAISE NOTICE 'RLS verified on all training tables';
  RAISE NOTICE 'Run verify_training_user_integrity() to check for orphaned records';
END $$;
