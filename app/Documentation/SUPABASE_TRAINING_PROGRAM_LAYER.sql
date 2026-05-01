-- Training Program Layer - Enables 4-week block planning and weekly structure
-- Migration: Adds program instance and program day tables
-- Soft migration: Existing training_sessions remain valid with null program fields

-- =====================================================
-- 1. TRAINING PROGRAM INSTANCES
-- =====================================================
-- Represents a 4-week training block with selected weekdays and plan structure

CREATE TABLE IF NOT EXISTS training_program_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Program timing
  start_date DATE NOT NULL,
  duration_weeks INT NOT NULL DEFAULT 4,
  
  -- Selected training days (array of weekday numbers: 1=Monday, 7=Sunday)
  selected_weekdays INT[] NOT NULL CHECK (
    array_length(selected_weekdays, 1) > 0 AND
    array_length(selected_weekdays, 1) <= 7
  ),
  
  -- Program structure (weekly plan with day labels and intents)
  plan JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "weeks": [
  --     {
  --       "weekIndex": 1,
  --       "days": {
  --         "1": { "label": "Upper Strength", "intents": ["horizontal_push", "vertical_pull"], "template": "upper" },
  --         "3": { "label": "Lower Power", "intents": ["knee_dominant", "hip_hinge"], "template": "lower" },
  --         "5": { "label": "Full Body", "intents": ["push", "pull", "legs"], "template": "full_body" }
  --       }
  --     },
  --     ...
  --   ]
  -- }
  
  -- Profile snapshot at program creation (for consistency)
  profile_snapshot JSONB NOT NULL,
  -- Contains: goals, equipment, constraints, baselines
  
  -- Program status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_training_program_instances_user_id ON training_program_instances(user_id);
CREATE INDEX idx_training_program_instances_user_status ON training_program_instances(user_id, status);
CREATE INDEX idx_training_program_instances_start_date ON training_program_instances(start_date);

-- RLS Policies
ALTER TABLE training_program_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own program instances"
  ON training_program_instances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own program instances"
  ON training_program_instances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program instances"
  ON training_program_instances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own program instances"
  ON training_program_instances FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. TRAINING PROGRAM DAYS
-- =====================================================
-- Individual planned training days within a program instance

CREATE TABLE IF NOT EXISTS training_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_program_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Day identification
  date DATE NOT NULL,
  week_index INT NOT NULL CHECK (week_index >= 1 AND week_index <= 52),
  day_index INT NOT NULL CHECK (day_index >= 1 AND day_index <= 7),
  
  -- Session plan
  label TEXT NOT NULL, -- e.g., "Upper Strength", "Lower Hypertrophy"
  intents JSONB NOT NULL, -- Array of movement intents for this day
  template_key TEXT, -- e.g., "upper", "lower", "full_body", "push", "pull", "legs"
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one program day per date per program
  UNIQUE(program_id, date)
);

-- Indexes
CREATE INDEX idx_training_program_days_program_id ON training_program_days(program_id);
CREATE INDEX idx_training_program_days_user_id ON training_program_days(user_id);
CREATE INDEX idx_training_program_days_date ON training_program_days(date);
CREATE INDEX idx_training_program_days_user_date ON training_program_days(user_id, date);

-- RLS Policies
ALTER TABLE training_program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own program days"
  ON training_program_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own program days"
  ON training_program_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program days"
  ON training_program_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own program days"
  ON training_program_days FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. MODIFY TRAINING_SESSIONS (Soft Migration)
-- =====================================================
-- Add nullable program references to existing sessions table

-- Add program reference columns (nullable for backward compatibility)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES training_program_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_day_id UUID REFERENCES training_program_days(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS week_index INT,
  ADD COLUMN IF NOT EXISTS day_index INT,
  ADD COLUMN IF NOT EXISTS session_type_label TEXT;

-- Indexes for program queries
CREATE INDEX IF NOT EXISTS idx_training_sessions_program_id ON training_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_program_day_id ON training_sessions(program_day_id);

-- =====================================================
-- 4. POST-SESSION CHECK-INS (Mood after workout)
-- =====================================================

CREATE TABLE IF NOT EXISTS training_post_session_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  
  -- Mood/feeling after session
  felt TEXT NOT NULL CHECK (felt IN ('energized', 'neutral', 'drained', 'frustrated', 'proud', 'accomplished')),
  
  -- Optional note
  note TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One check-in per session
  UNIQUE(session_id)
);

-- Indexes
CREATE INDEX idx_training_post_session_checkins_user_id ON training_post_session_checkins(user_id);
CREATE INDEX idx_training_post_session_checkins_session_id ON training_post_session_checkins(session_id);

-- RLS Policies
ALTER TABLE training_post_session_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post-session check-ins"
  ON training_post_session_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own post-session check-ins"
  ON training_post_session_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post-session check-ins"
  ON training_post_session_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post-session check-ins"
  ON training_post_session_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. HELPER VIEWS (Optional, for easier querying)
-- =====================================================

-- Active program for user
CREATE OR REPLACE VIEW user_active_programs AS
SELECT 
  pi.*,
  COUNT(DISTINCT pd.id) as total_planned_days,
  COUNT(DISTINCT ts.id) as completed_sessions
FROM training_program_instances pi
LEFT JOIN training_program_days pd ON pd.program_id = pi.id
LEFT JOIN training_sessions ts ON ts.program_id = pi.id AND ts.ended_at IS NOT NULL
WHERE pi.status = 'active'
GROUP BY pi.id;

-- Program progress view
CREATE OR REPLACE VIEW program_progress AS
SELECT
  pi.id as program_id,
  pi.user_id,
  pi.start_date,
  pi.duration_weeks,
  COUNT(DISTINCT pd.id) as total_days,
  COUNT(DISTINCT CASE WHEN ts.ended_at IS NOT NULL THEN ts.id END) as completed_days,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN ts.ended_at IS NOT NULL THEN ts.id END) / 
    NULLIF(COUNT(DISTINCT pd.id), 0),
    1
  ) as completion_percentage
FROM training_program_instances pi
LEFT JOIN training_program_days pd ON pd.program_id = pi.id
LEFT JOIN training_sessions ts ON ts.program_day_id = pd.id
GROUP BY pi.id, pi.user_id, pi.start_date, pi.duration_weeks;

-- =====================================================
-- 6. MIGRATION NOTES
-- =====================================================

-- Existing training_sessions rows remain valid:
-- - program_id, program_day_id, week_index, day_index, session_type_label will be NULL
-- - They represent "legacy" one-off sessions generated before program layer
-- - History view must handle both program-linked and legacy sessions

-- New sessions created from program days will have:
-- - program_id: links to training_program_instances
-- - program_day_id: links to specific planned day
-- - week_index, day_index: for quick filtering
-- - session_type_label: for display and comparison logic

COMMENT ON TABLE training_program_instances IS 'Represents a 4-week training block with selected weekdays and structured plan';
COMMENT ON TABLE training_program_days IS 'Individual planned training days within a program instance';
COMMENT ON TABLE training_post_session_checkins IS 'Post-workout mood/feeling check-ins';
COMMENT ON COLUMN training_sessions.program_id IS 'Nullable FK to program instance (NULL for legacy sessions)';
COMMENT ON COLUMN training_sessions.program_day_id IS 'Nullable FK to specific program day (NULL for legacy sessions)';
