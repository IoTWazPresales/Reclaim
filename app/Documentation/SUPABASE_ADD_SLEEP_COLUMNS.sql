-- ============================================================================
-- Add Missing Columns to sleep_sessions Table
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add duration_minutes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sleep_sessions' 
        AND column_name = 'duration_minutes'
    ) THEN
        ALTER TABLE sleep_sessions 
        ADD COLUMN duration_minutes INTEGER;
        
        RAISE NOTICE 'Added column: sleep_sessions.duration_minutes';
    ELSE
        RAISE NOTICE 'Column already exists: sleep_sessions.duration_minutes';
    END IF;
END $$;

-- Add efficiency column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sleep_sessions' 
        AND column_name = 'efficiency'
    ) THEN
        ALTER TABLE sleep_sessions 
        ADD COLUMN efficiency NUMERIC(5,2); -- 0.00 to 100.00
        
        RAISE NOTICE 'Added column: sleep_sessions.efficiency';
    ELSE
        RAISE NOTICE 'Column already exists: sleep_sessions.efficiency';
    END IF;
END $$;

-- Add stages column (JSONB) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sleep_sessions' 
        AND column_name = 'stages'
    ) THEN
        ALTER TABLE sleep_sessions 
        ADD COLUMN stages JSONB;
        
        RAISE NOTICE 'Added column: sleep_sessions.stages';
    ELSE
        RAISE NOTICE 'Column already exists: sleep_sessions.stages';
    END IF;
END $$;

-- Add metadata column (JSONB) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sleep_sessions' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE sleep_sessions 
        ADD COLUMN metadata JSONB;
        
        RAISE NOTICE 'Added column: sleep_sessions.metadata';
    ELSE
        RAISE NOTICE 'Column already exists: sleep_sessions.metadata';
    END IF;
END $$;

-- Add index on duration_minutes for analytics queries
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_duration_minutes 
ON sleep_sessions(user_id, duration_minutes) 
WHERE duration_minutes IS NOT NULL;

-- Add index on efficiency for analytics queries
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_efficiency 
ON sleep_sessions(user_id, efficiency) 
WHERE efficiency IS NOT NULL;

-- Add GIN index on stages JSONB for efficient queries
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_stages_gin 
ON sleep_sessions USING GIN (stages) 
WHERE stages IS NOT NULL;

-- Add GIN index on metadata JSONB for efficient queries
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_metadata_gin 
ON sleep_sessions USING GIN (metadata) 
WHERE metadata IS NOT NULL;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. duration_minutes: Total sleep duration in minutes
-- 2. efficiency: Sleep efficiency as a percentage (0-100)
-- 3. stages: JSONB array of sleep stage segments with start, end, and stage type
--    Example: [{"start": "2024-01-01T22:00:00Z", "end": "2024-01-01T23:00:00Z", "stage": "light"}, ...]
-- 4. metadata: JSONB object containing additional sleep data:
--    - avgHeartRate, minHeartRate, maxHeartRate
--    - bodyTemperature / skinTemperature (Celsius)
--    - deepSleepMinutes, remSleepMinutes, lightSleepMinutes, awakeMinutes
-- 5. Run this script in your Supabase SQL Editor
-- ============================================================================

