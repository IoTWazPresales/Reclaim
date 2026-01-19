-- ============================================================================
-- Supabase Schema Validation Script
-- Run this in your Supabase SQL Editor to validate all tables, columns, and usage
-- ============================================================================

-- ============================================================================
-- PART 1: VALIDATE TABLE EXISTENCE
-- ============================================================================

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'logs',
        'profiles',
        'entries',
        'meds',
        'meds_log',
        'mood_checkins',
        'mood_entries',
        'mindfulness_events',
        'sleep_prefs',
        'sleep_sessions',
        'sleep_candidates',
        'activity_daily',
        'meditation_sessions',
        'app_logs'
    ];
    missing_tables TEXT[];
    tbl_name TEXT;
BEGIN
    RAISE NOTICE '=== CHECKING TABLE EXISTENCE ===';
    
    FOREACH tbl_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) THEN
            missing_tables := array_append(missing_tables, tbl_name);
            RAISE WARNING 'Missing table: %', tbl_name;
        ELSE
            RAISE NOTICE '✓ Table exists: %', tbl_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required tables exist ✓';
END $$;

-- ============================================================================
-- PART 2: VALIDATE COLUMNS FOR EACH TABLE
-- ============================================================================

-- 1. logs table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING logs TABLE ===';
    
    -- Check required columns
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'id') = 1, 'Missing column: logs.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'user_id') = 1, 'Missing column: logs.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'level') = 1, 'Missing column: logs.level';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'message') = 1, 'Missing column: logs.message';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'details') = 1, 'Missing column: logs.details';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'logs' 
            AND column_name = 'created_at') = 1, 'Missing column: logs.created_at';
    
    RAISE NOTICE '✓ logs table columns validated';
END $$;

-- 2. profiles table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING profiles TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'id') = 1, 'Missing column: profiles.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'has_onboarded') = 1, 'Missing column: profiles.has_onboarded';
    
    RAISE NOTICE '✓ profiles table columns validated';
END $$;

-- 3. entries table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING entries TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'id') = 1, 'Missing column: entries.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'user_id') = 1, 'Missing column: entries.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'ts') = 1, 'Missing column: entries.ts';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'mood') = 1, 'Missing column: entries.mood';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'sleep_hours') = 1, 'Missing column: entries.sleep_hours';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'focus_minutes') = 1, 'Missing column: entries.focus_minutes';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'meds_taken') = 1, 'Missing column: entries.meds_taken';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'entries' 
            AND column_name = 'note') = 1, 'Missing column: entries.note';
    
    RAISE NOTICE '✓ entries table columns validated';
END $$;

-- 4. meds table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING meds TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'id') = 1, 'Missing column: meds.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'user_id') = 1, 'Missing column: meds.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'name') = 1, 'Missing column: meds.name';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'dose') = 1, 'Missing column: meds.dose';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'schedule') = 1, 'Missing column: meds.schedule';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds' 
            AND column_name = 'created_at') = 1, 'Missing column: meds.created_at';
    
    RAISE NOTICE '✓ meds table columns validated';
END $$;

-- 5. meds_log table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING meds_log TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'id') = 1, 'Missing column: meds_log.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'user_id') = 1, 'Missing column: meds_log.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'med_id') = 1, 'Missing column: meds_log.med_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'taken_at') = 1, 'Missing column: meds_log.taken_at';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'status') = 1, 'Missing column: meds_log.status';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'scheduled_for') = 1, 'Missing column: meds_log.scheduled_for';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'note') = 1, 'Missing column: meds_log.note';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'created_at') = 1, 'Missing column: meds_log.created_at';
    
    RAISE NOTICE '✓ meds_log table columns validated';
END $$;

-- 6. mood_checkins table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING mood_checkins TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'id') = 1, 'Missing column: mood_checkins.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'user_id') = 1, 'Missing column: mood_checkins.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'created_at') = 1, 'Missing column: mood_checkins.created_at';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'mood') = 1, 'Missing column: mood_checkins.mood';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'energy') = 1, 'Missing column: mood_checkins.energy';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'tags') = 1, 'Missing column: mood_checkins.tags';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'note') = 1, 'Missing column: mood_checkins.note';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'ctx') = 1, 'Missing column: mood_checkins.ctx';
    
    RAISE NOTICE '✓ mood_checkins table columns validated';
END $$;

-- 7. mood_entries table (for sync)
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING mood_entries TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_entries' 
            AND column_name = 'id') = 1, 'Missing column: mood_entries.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_entries' 
            AND column_name = 'user_id') = 1, 'Missing column: mood_entries.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_entries' 
            AND column_name = 'rating') = 1, 'Missing column: mood_entries.rating';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_entries' 
            AND column_name = 'note') = 1, 'Missing column: mood_entries.note';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_entries' 
            AND column_name = 'created_at') = 1, 'Missing column: mood_entries.created_at';
    
    RAISE NOTICE '✓ mood_entries table columns validated';
END $$;

-- 8. mindfulness_events table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING mindfulness_events TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'id') = 1, 'Missing column: mindfulness_events.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'user_id') = 1, 'Missing column: mindfulness_events.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'created_at') = 1, 'Missing column: mindfulness_events.created_at';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'trigger_type') = 1, 'Missing column: mindfulness_events.trigger_type';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'reason') = 1, 'Missing column: mindfulness_events.reason';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'intervention') = 1, 'Missing column: mindfulness_events.intervention';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'outcome') = 1, 'Missing column: mindfulness_events.outcome';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mindfulness_events' 
            AND column_name = 'ctx') = 1, 'Missing column: mindfulness_events.ctx';
    
    RAISE NOTICE '✓ mindfulness_events table columns validated';
END $$;

-- 9. sleep_prefs table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING sleep_prefs TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'user_id') = 1, 'Missing column: sleep_prefs.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'target_sleep_minutes') = 1, 'Missing column: sleep_prefs.target_sleep_minutes';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'typical_wake_time') = 1, 'Missing column: sleep_prefs.typical_wake_time';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'work_days') = 1, 'Missing column: sleep_prefs.work_days';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'bedtime_window_start') = 1, 'Missing column: sleep_prefs.bedtime_window_start';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'bedtime_window_end') = 1, 'Missing column: sleep_prefs.bedtime_window_end';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'updated_at') = 1, 'Missing column: sleep_prefs.updated_at';
    
    RAISE NOTICE '✓ sleep_prefs table columns validated';
END $$;

-- 10. sleep_sessions table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING sleep_sessions TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'id') = 1, 'Missing column: sleep_sessions.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'user_id') = 1, 'Missing column: sleep_sessions.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'start_time') = 1, 'Missing column: sleep_sessions.start_time';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'end_time') = 1, 'Missing column: sleep_sessions.end_time';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'source') = 1, 'Missing column: sleep_sessions.source';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'quality') = 1, 'Missing column: sleep_sessions.quality';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'note') = 1, 'Missing column: sleep_sessions.note';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_sessions' 
            AND column_name = 'created_at') = 1, 'Missing column: sleep_sessions.created_at';
    
    RAISE NOTICE '✓ sleep_sessions table columns validated';
END $$;

-- 11. sleep_candidates table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING sleep_candidates TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'id') = 1, 'Missing column: sleep_candidates.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'user_id') = 1, 'Missing column: sleep_candidates.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'start_guess') = 1, 'Missing column: sleep_candidates.start_guess';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'end_guess') = 1, 'Missing column: sleep_candidates.end_guess';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'confidence') = 1, 'Missing column: sleep_candidates.confidence';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'ctx') = 1, 'Missing column: sleep_candidates.ctx';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_candidates' 
            AND column_name = 'created_at') = 1, 'Missing column: sleep_candidates.created_at';
    
    RAISE NOTICE '✓ sleep_candidates table columns validated';
END $$;

-- 12. activity_daily table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING activity_daily TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'id') = 1, 'Missing column: activity_daily.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'user_id') = 1, 'Missing column: activity_daily.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'activity_date') = 1, 'Missing column: activity_daily.activity_date';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'steps') = 1, 'Missing column: activity_daily.steps';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'active_energy') = 1, 'Missing column: activity_daily.active_energy';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'source') = 1, 'Missing column: activity_daily.source';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'activity_daily' 
            AND column_name = 'created_at') = 1, 'Missing column: activity_daily.created_at';
    
    RAISE NOTICE '✓ activity_daily table columns validated';
END $$;

-- 13. meditation_sessions table
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING meditation_sessions TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'id') = 1, 'Missing column: meditation_sessions.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'user_id') = 1, 'Missing column: meditation_sessions.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'meditation_type') = 1, 'Missing column: meditation_sessions.meditation_type';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'start_time') = 1, 'Missing column: meditation_sessions.start_time';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'end_time') = 1, 'Missing column: meditation_sessions.end_time';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'duration_sec') = 1, 'Missing column: meditation_sessions.duration_sec';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meditation_sessions' 
            AND column_name = 'note') = 1, 'Missing column: meditation_sessions.note';
    
    RAISE NOTICE '✓ meditation_sessions table columns validated';
END $$;

-- 14. app_logs table (telemetry)
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING app_logs TABLE ===';
    
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'id') = 1, 'Missing column: app_logs.id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'user_id') = 1, 'Missing column: app_logs.user_id';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'event_name') = 1, 'Missing column: app_logs.event_name';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'severity') = 1, 'Missing column: app_logs.severity';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'properties') = 1, 'Missing column: app_logs.properties';
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'app_logs' 
            AND column_name = 'created_at') = 1, 'Missing column: app_logs.created_at';
    
    RAISE NOTICE '✓ app_logs table columns validated';
END $$;

-- ============================================================================
-- PART 3: VALIDATE COLUMN TYPES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING COLUMN TYPES ===';
    
    -- Check key types
    -- user_id should be UUID in tables that have it
    -- created_at should be TIMESTAMPTZ
    -- JSONB columns (details, schedule, ctx, properties, tags, work_days)
    
    -- Example checks (add more as needed)
    ASSERT (SELECT data_type FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mood_checkins' 
            AND column_name = 'tags') IN ('jsonb', 'ARRAY', 'text[]'), 
            'mood_checkins.tags should be JSONB or ARRAY type';
    
    ASSERT (SELECT data_type FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sleep_prefs' 
            AND column_name = 'work_days') IN ('jsonb', 'ARRAY', 'integer[]'), 
            'sleep_prefs.work_days should be JSONB or ARRAY type';
    
    RAISE NOTICE '✓ Key column types validated';
END $$;

-- ============================================================================
-- PART 4: VALIDATE RLS POLICIES
-- ============================================================================

DO $$
DECLARE
    expected_tables_with_rls TEXT[] := ARRAY[
        'logs',
        'profiles',
        'entries',
        'meds',
        'meds_log',
        'mood_checkins',
        'mood_entries',
        'mindfulness_events',
        'sleep_prefs',
        'sleep_sessions',
        'sleep_candidates',
        'activity_daily',
        'meditation_sessions',
        'app_logs'
    ];
    tbl_name TEXT;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== VALIDATING RLS POLICIES ===';
    
    FOREACH tbl_name IN ARRAY expected_tables_with_rls
    LOOP
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = tbl_name;
        
        IF rls_enabled THEN
            RAISE NOTICE '✓ RLS enabled: %', tbl_name;
        ELSE
            RAISE WARNING 'RLS not enabled: %', tbl_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- PART 5: VALIDATE INDEXES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== VALIDATING INDEXES ===';
    
    -- Check for indexes on user_id (should exist on most tables)
    ASSERT (SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'logs' 
            AND indexname LIKE '%user_id%') > 0, 
            'Missing index on logs.user_id';
    
    ASSERT (SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'mood_checkins' 
            AND indexname LIKE '%user_id%') > 0, 
            'Missing index on mood_checkins.user_id';
    
    ASSERT (SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'meds_log' 
            AND indexname LIKE '%user_id%') > 0, 
            'Missing index on meds_log.user_id';
    
    -- Check for indexes on created_at
    ASSERT (SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'logs' 
            AND indexname LIKE '%created_at%') > 0, 
            'Missing index on logs.created_at';
    
    RAISE NOTICE '✓ Key indexes validated';
END $$;

-- ============================================================================
-- PART 6: SUMMARY REPORT
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    column_count INTEGER;
    index_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VALIDATION SUMMARY ===';
    
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'logs', 'profiles', 'entries', 'meds', 'meds_log',
        'mood_checkins', 'mood_entries', 'mindfulness_events',
        'sleep_prefs', 'sleep_sessions', 'sleep_candidates',
        'activity_daily', 'meditation_sessions', 'app_logs'
    );
    
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name IN (
        'logs', 'profiles', 'entries', 'meds', 'meds_log',
        'mood_checkins', 'mood_entries', 'mindfulness_events',
        'sleep_prefs', 'sleep_sessions', 'sleep_candidates',
        'activity_daily', 'meditation_sessions', 'app_logs'
    );
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
        'logs', 'profiles', 'entries', 'meds', 'meds_log',
        'mood_checkins', 'mood_entries', 'mindfulness_events',
        'sleep_prefs', 'sleep_sessions', 'sleep_candidates',
        'activity_daily', 'meditation_sessions', 'app_logs'
    );
    
    RAISE NOTICE 'Tables: %', table_count;
    RAISE NOTICE 'Columns: %', column_count;
    RAISE NOTICE 'Indexes: %', index_count;
    RAISE NOTICE '';
    RAISE NOTICE '✓ Schema validation complete!';
    RAISE NOTICE 'All required tables and columns are present.';
END $$;

