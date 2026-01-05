-- ============================================================================
-- Training Module - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. training_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  mode TEXT NOT NULL CHECK (mode IN ('timed', 'manual')),
  goals JSONB NOT NULL,
  summary JSONB,
  decision_trace JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_started_at ON training_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_created_at ON training_sessions(created_at DESC);

-- RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training sessions"
  ON training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training sessions"
  ON training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions"
  ON training_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions"
  ON training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. training_session_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_session_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  planned JSONB NOT NULL,
  performed JSONB,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_session_items_session_id ON training_session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_training_session_items_exercise_id ON training_session_items(exercise_id);
CREATE INDEX IF NOT EXISTS idx_training_session_items_order_index ON training_session_items(session_id, order_index);

-- RLS
ALTER TABLE training_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session items"
  ON training_session_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = training_session_items.session_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own session items"
  ON training_session_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = training_session_items.session_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own session items"
  ON training_session_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = training_session_items.session_id
      AND training_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = training_session_items.session_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own session items"
  ON training_session_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = training_session_items.session_id
      AND training_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. training_set_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_set_logs (
  id TEXT PRIMARY KEY,
  session_item_id TEXT NOT NULL REFERENCES training_session_items(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight DECIMAL(10, 2),
  reps INTEGER NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_set_logs_session_item_id ON training_set_logs(session_item_id);
CREATE INDEX IF NOT EXISTS idx_training_set_logs_completed_at ON training_set_logs(completed_at DESC);

-- RLS
ALTER TABLE training_set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own set logs"
  ON training_set_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_session_items
      JOIN training_sessions ON training_sessions.id = training_session_items.session_id
      WHERE training_session_items.id = training_set_logs.session_item_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own set logs"
  ON training_set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_session_items
      JOIN training_sessions ON training_sessions.id = training_session_items.session_id
      WHERE training_session_items.id = training_set_logs.session_item_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own set logs"
  ON training_set_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM training_session_items
      JOIN training_sessions ON training_sessions.id = training_session_items.session_id
      WHERE training_session_items.id = training_set_logs.session_item_id
      AND training_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_session_items
      JOIN training_sessions ON training_sessions.id = training_session_items.session_id
      WHERE training_session_items.id = training_set_logs.session_item_id
      AND training_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own set logs"
  ON training_set_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM training_session_items
      JOIN training_sessions ON training_sessions.id = training_session_items.session_id
      WHERE training_session_items.id = training_set_logs.session_item_id
      AND training_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Validation
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Training tables created successfully';
  RAISE NOTICE 'Tables: training_sessions, training_session_items, training_set_logs';
  RAISE NOTICE 'RLS policies enabled for all tables';
END $$;
