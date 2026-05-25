-- Cursor state on training_sessions
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS current_exercise_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'work'
    CHECK (phase IN ('work', 'rest')),
  ADD COLUMN IF NOT EXISTS rest_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rest_ends_at timestamptz NULL;

-- Autoregulation persistence on training_session_items
ALTER TABLE training_session_items
  ADD COLUMN IF NOT EXISTS autoregulation_adjustments jsonb NULL;

-- Direct exercise_id on training_set_logs for join-free queries
ALTER TABLE training_set_logs
  ADD COLUMN IF NOT EXISTS exercise_id text NULL;
