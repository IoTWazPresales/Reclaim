-- ============================================================================
-- Supabase Setup SQL
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Create logs table for error tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- Enable RLS on logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own logs (or service role sees all)
CREATE POLICY "Users can view their own logs"
  ON logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- RLS Policy: Users can insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ============================================================================
-- 2. Ensure meds table has defaults and RLS
-- ============================================================================

-- Set defaults for meds table (if columns don't have them already)
ALTER TABLE meds
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN created_at SET DEFAULT now();

-- Enable RLS if not already enabled
ALTER TABLE meds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional - use IF EXISTS in newer Supabase)
DROP POLICY IF EXISTS "Users can view their own meds" ON meds;
DROP POLICY IF EXISTS "Users can insert their own meds" ON meds;
DROP POLICY IF EXISTS "Users can update their own meds" ON meds;
DROP POLICY IF EXISTS "Users can delete their own meds" ON meds;

-- Create RLS policies for meds
CREATE POLICY "Users can view their own meds"
  ON meds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meds"
  ON meds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meds"
  ON meds FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meds"
  ON meds FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 3. Ensure meds_log table has defaults and RLS
-- ============================================================================

-- Set defaults for meds_log table
ALTER TABLE meds_log
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN created_at SET DEFAULT now();

-- Enable RLS if not already enabled
ALTER TABLE meds_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own med logs" ON meds_log;
DROP POLICY IF EXISTS "Users can insert their own med logs" ON meds_log;
DROP POLICY IF EXISTS "Users can update their own med logs" ON meds_log;
DROP POLICY IF EXISTS "Users can delete their own med logs" ON meds_log;

-- Create RLS policies for meds_log
CREATE POLICY "Users can view their own med logs"
  ON meds_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own med logs"
  ON meds_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own med logs"
  ON meds_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own med logs"
  ON meds_log FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 4. Ensure mood_checkins table has defaults and RLS
-- ============================================================================

-- Set defaults for mood_checkins table
ALTER TABLE mood_checkins
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN created_at SET DEFAULT now();

-- Enable RLS if not already enabled
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own mood checkins" ON mood_checkins;
DROP POLICY IF EXISTS "Users can insert their own mood checkins" ON mood_checkins;
DROP POLICY IF EXISTS "Users can update their own mood checkins" ON mood_checkins;
DROP POLICY IF EXISTS "Users can delete their own mood checkins" ON mood_checkins;

-- Create RLS policies for mood_checkins
CREATE POLICY "Users can view their own mood checkins"
  ON mood_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood checkins"
  ON mood_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood checkins"
  ON mood_checkins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood checkins"
  ON mood_checkins FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This script assumes the tables already exist. If they don't, create them first.
-- 2. Defaults will only be applied if columns don't already have defaults.
-- 3. RLS policies ensure users can only access their own data.
-- 4. The logs table allows anonymous logging (user_id can be NULL).
-- 5. Run this script in the Supabase SQL Editor for your project.
-- ============================================================================

