-- ============================================================================
-- Add Missing Columns to Existing Tables
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. Add missing columns to meds_log table
-- ============================================================================

DO $$
BEGIN
    -- Add scheduled_for column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meds_log' 
        AND column_name = 'scheduled_for'
    ) THEN
        ALTER TABLE meds_log 
        ADD COLUMN scheduled_for TIMESTAMPTZ;
        
        RAISE NOTICE 'Added column: meds_log.scheduled_for';
    ELSE
        RAISE NOTICE 'Column already exists: meds_log.scheduled_for';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meds_log' 
        AND column_name = 'created_at'
    ) THEN
        -- Add column as nullable first, then update existing rows, then set NOT NULL
        ALTER TABLE meds_log 
        ADD COLUMN created_at TIMESTAMPTZ;
        
        -- Update existing rows that have NULL created_at
        UPDATE meds_log 
        SET created_at = COALESCE(taken_at, now())
        WHERE created_at IS NULL;
        
        -- Set default for future rows
        ALTER TABLE meds_log 
        ALTER COLUMN created_at SET DEFAULT now();
        
        -- Make it NOT NULL now that all rows have values
        ALTER TABLE meds_log 
        ALTER COLUMN created_at SET NOT NULL;
        
        RAISE NOTICE 'Added column: meds_log.created_at';
    ELSE
        RAISE NOTICE 'Column already exists: meds_log.created_at';
        
        -- Update any NULL values to now() or taken_at
        UPDATE meds_log 
        SET created_at = COALESCE(taken_at, now())
        WHERE created_at IS NULL;
        
        -- If it exists but doesn't have a default, add the default
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meds_log' 
            AND column_name = 'created_at'
            AND column_default IS NOT NULL
        ) THEN
            ALTER TABLE meds_log 
            ALTER COLUMN created_at SET DEFAULT now();
            
            RAISE NOTICE 'Added default to column: meds_log.created_at';
        END IF;
        
        -- Ensure it's NOT NULL
        ALTER TABLE meds_log 
        ALTER COLUMN created_at SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This script adds missing columns to existing tables
-- 2. scheduled_for is optional (can be NULL) - stores when the dose was scheduled
-- 3. Run this script in your Supabase SQL Editor
-- ============================================================================

