-- ============================================================================
-- Create Missing Tables: activity_daily and app_logs
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. Create activity_daily table for daily activity summaries
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_daily (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  steps INTEGER,
  active_energy INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Indexes for activity_daily
CREATE INDEX IF NOT EXISTS idx_activity_daily_user_id ON activity_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_daily_activity_date ON activity_daily(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_daily_user_date ON activity_daily(user_id, activity_date DESC);

-- Enable RLS on activity_daily
ALTER TABLE activity_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity" ON activity_daily;
DROP POLICY IF EXISTS "Users can insert their own activity" ON activity_daily;
DROP POLICY IF EXISTS "Users can update their own activity" ON activity_daily;
DROP POLICY IF EXISTS "Users can delete their own activity" ON activity_daily;

-- Create RLS policies for activity_daily
CREATE POLICY "Users can view their own activity"
  ON activity_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON activity_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity"
  ON activity_daily FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity"
  ON activity_daily FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Create app_logs table for telemetry/analytics events
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for app_logs
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_event_name ON app_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_app_logs_severity ON app_logs(severity);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);

-- Enable RLS on app_logs
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own logs" ON app_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON app_logs;
DROP POLICY IF EXISTS "Users can insert anonymous logs" ON app_logs;

-- Create RLS policies for app_logs
CREATE POLICY "Users can view their own logs"
  ON app_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Users can insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON app_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous logging (for error tracking before login)
CREATE POLICY "Users can insert anonymous logs"
  ON app_logs FOR INSERT
  WITH CHECK (user_id IS NULL);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. activity_daily stores daily activity summaries (steps, active energy)
--    from health integrations (Apple HealthKit, Google Fit, etc.)
-- 2. app_logs stores telemetry events for analytics and debugging
-- 3. Both tables have RLS enabled for security
-- 4. Run this script in your Supabase SQL Editor
-- ============================================================================

