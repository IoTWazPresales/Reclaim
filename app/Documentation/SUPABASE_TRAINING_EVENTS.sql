-- ============================================================================
-- Training Events Table - Minimal analytics/events (privacy-respecting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_events_user_id ON training_events(user_id);
CREATE INDEX IF NOT EXISTS idx_training_events_event_name ON training_events(event_name);
CREATE INDEX IF NOT EXISTS idx_training_events_created_at ON training_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_events_user_event ON training_events(user_id, event_name, created_at DESC);

-- RLS Policies
ALTER TABLE training_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training events"
  ON training_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training events"
  ON training_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete events (append-only log)
CREATE POLICY "Users cannot update training events"
  ON training_events FOR UPDATE
  USING (false);

CREATE POLICY "Users cannot delete training events"
  ON training_events FOR DELETE
  USING (false);

-- ============================================================================
-- Validation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Training events table created successfully';
  RAISE NOTICE 'RLS policies enabled - users can only insert/view their own events';
  RAISE NOTICE 'Events are append-only (no updates/deletes)';
END $$;
