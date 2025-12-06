-- ============================================================================
-- Add Missing Indexes
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. Indexes for logs table
-- ============================================================================

-- Index on logs.user_id
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

-- Index on logs.created_at
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- ============================================================================
-- 2. Indexes for mood_checkins table
-- ============================================================================

-- Index on mood_checkins.user_id
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_id ON mood_checkins(user_id);

-- Index on mood_checkins.created_at
CREATE INDEX IF NOT EXISTS idx_mood_checkins_created_at ON mood_checkins(created_at DESC);

-- ============================================================================
-- 3. Indexes for meds_log table
-- ============================================================================

-- Index on meds_log.user_id
CREATE INDEX IF NOT EXISTS idx_meds_log_user_id ON meds_log(user_id);

-- Index on meds_log.created_at (if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meds_log' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_meds_log_created_at ON meds_log(created_at DESC);
        RAISE NOTICE 'Created index: idx_meds_log_created_at';
    ELSE
        RAISE NOTICE 'Skipped index: idx_meds_log_created_at (column does not exist)';
    END IF;
END $$;

-- Index on meds_log.taken_at
CREATE INDEX IF NOT EXISTS idx_meds_log_taken_at ON meds_log(taken_at DESC);

-- ============================================================================
-- 4. Additional useful indexes
-- ============================================================================

-- Index on meds.user_id
CREATE INDEX IF NOT EXISTS idx_meds_user_id ON meds(user_id);

-- Index on entries.user_id
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);

-- Index on entries.ts
CREATE INDEX IF NOT EXISTS idx_entries_ts ON entries(ts DESC);

-- Index on mood_entries.user_id (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mood_entries'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);
        RAISE NOTICE 'Created indexes for mood_entries';
    END IF;
END $$;

-- Index on mindfulness_events.user_id (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mindfulness_events'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mindfulness_events_user_id ON mindfulness_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_mindfulness_events_created_at ON mindfulness_events(created_at DESC);
        RAISE NOTICE 'Created indexes for mindfulness_events';
    END IF;
END $$;

-- Index on sleep_sessions.user_id (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sleep_sessions'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON sleep_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sleep_sessions_start_time ON sleep_sessions(start_time DESC);
        RAISE NOTICE 'Created indexes for sleep_sessions';
    END IF;
END $$;

-- Index on meditation_sessions.user_id (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'meditation_sessions'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON meditation_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_meditation_sessions_start_time ON meditation_sessions(start_time DESC);
        RAISE NOTICE 'Created indexes for meditation_sessions';
    END IF;
END $$;

-- Index on app_logs table (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_logs'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_app_logs_event_name ON app_logs(event_name);
        RAISE NOTICE 'Created indexes for app_logs';
    END IF;
END $$;

-- Index on activity_daily table (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_daily'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_activity_daily_user_id ON activity_daily(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_daily_activity_date ON activity_daily(activity_date DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_daily_user_date ON activity_daily(user_id, activity_date DESC);
        RAISE NOTICE 'Created indexes for activity_daily';
    END IF;
END $$;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This script creates indexes that are expected by the validation script
-- 2. All indexes use IF NOT EXISTS, so it's safe to run multiple times
-- 3. Indexes on user_id improve query performance for user-specific queries
-- 4. Indexes on created_at/date columns improve time-range queries
-- 5. Run this script in your Supabase SQL Editor
-- ============================================================================

