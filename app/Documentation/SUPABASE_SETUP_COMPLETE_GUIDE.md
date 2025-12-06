# Supabase Setup Complete Guide

This guide walks you through setting up your Supabase database with all required tables, columns, indexes, and policies.

## 📋 Prerequisites

1. A Supabase project created
2. Access to the Supabase SQL Editor
3. Your Supabase project URL and anon key

## 🚀 Quick Setup (Recommended Order)

Run these SQL scripts in your Supabase SQL Editor **in this order**:

### Step 1: Create Missing Tables
**File**: `SUPABASE_MISSING_TABLES.sql`

Creates:
- `activity_daily` - Daily activity summaries from health integrations
- `app_logs` - Telemetry/analytics events

**Why**: These tables are used by your app but may not exist yet.

### Step 2: Add Missing Columns
**File**: `SUPABASE_ADD_MISSING_COLUMNS.sql`

Adds to `meds_log` table:
- `scheduled_for` - When a medication dose was scheduled (optional)
- `created_at` - Timestamp when the log entry was created

**Why**: Your code expects these columns but they may be missing from existing tables.

### Step 3: Add Missing Indexes
**File**: `SUPABASE_ADD_MISSING_INDEXES.sql`

Creates indexes on:
- `logs` table (user_id, created_at)
- `mood_checkins` table (user_id, created_at)
- `meds_log` table (user_id, created_at, taken_at)
- And many other tables for performance

**Why**: Indexes improve query performance, especially for user-specific queries and time-range searches.

### Step 4: Configure RLS and Defaults
**File**: `SUPABASE_SETUP.sql`

Configures:
- Row Level Security (RLS) policies
- Column defaults (user_id, created_at)
- RLS policies for existing tables

**Why**: Ensures data security and proper defaults for new rows.

### Step 5: Validate Everything
**File**: `SUPABASE_SCHEMA_VALIDATION.sql`

Validates:
- All 14 tables exist
- All required columns exist
- Column types are correct
- RLS is enabled
- Indexes exist

**Why**: Confirms your database schema matches what the app expects.

## 📊 Database Schema Overview

Your database should have **14 tables**:

### Core Tables
1. **logs** - Error tracking and logging
2. **app_logs** - Telemetry/analytics events
3. **profiles** - User profile information (onboarding status)

### Mood & Entries
4. **entries** - General daily entries (mood, sleep, focus)
5. **mood_checkins** - Detailed mood check-ins with energy and tags
6. **mood_entries** - Mood entries for sync (legacy/local sync)

### Medications
7. **meds** - Medication definitions
8. **meds_log** - Medication dose logging

### Sleep
9. **sleep_prefs** - User sleep preferences
10. **sleep_sessions** - Sleep session records
11. **sleep_candidates** - Potential sleep sessions to review

### Activity & Mindfulness
12. **activity_daily** - Daily activity summaries (steps, energy)
13. **mindfulness_events** - Mindfulness/meditation events
14. **meditation_sessions** - Meditation session records

## ✅ Validation Checklist

After running all scripts, verify:

- [ ] All 14 tables exist
- [ ] All tables have RLS enabled
- [ ] All tables have proper RLS policies
- [ ] Key columns have indexes (user_id, created_at)
- [ ] Column types are correct (UUID, TIMESTAMPTZ, JSONB, etc.)
- [ ] Defaults are set for user_id and created_at columns

## 🔍 Troubleshooting

### If validation fails:

1. **Missing tables**: Run `SUPABASE_MISSING_TABLES.sql`
2. **Missing columns**: Run `SUPABASE_ADD_MISSING_COLUMNS.sql`
3. **Missing indexes**: Run `SUPABASE_ADD_MISSING_INDEXES.sql`
4. **RLS issues**: Run `SUPABASE_SETUP.sql`

### Common Issues:

**Error: "relation does not exist"**
- The table hasn't been created yet
- Run the appropriate CREATE TABLE script

**Error: "column does not exist"**
- The column is missing from an existing table
- Run `SUPABASE_ADD_MISSING_COLUMNS.sql`

**Error: "permission denied"**
- RLS policies may be blocking access
- Check that RLS policies allow your user to access data
- Verify `auth.uid()` matches your `user_id`

**Error: "duplicate key value violates unique constraint"**
- You're trying to insert a duplicate primary key
- Check your insert logic

## 📝 Next Steps

1. ✅ Run all SQL scripts in order (if you haven't already)
2. ✅ Run validation script to confirm everything is correct
3. ✅ Test your app connection to Supabase
4. ✅ Verify data flows correctly in your app
5. ✅ Monitor logs table for any issues

## 🔒 Security Notes

- All tables have RLS enabled
- Users can only access their own data (via user_id)
- Some tables allow anonymous logging (logs, app_logs) for error tracking
- Always use Supabase client with proper authentication in your app

## 📚 Related Files

- `SUPABASE_SETUP.sql` - Initial setup with RLS policies
- `SUPABASE_MISSING_TABLES.sql` - Creates missing tables
- `SUPABASE_ADD_MISSING_COLUMNS.sql` - Adds missing columns
- `SUPABASE_ADD_MISSING_INDEXES.sql` - Creates missing indexes
- `SUPABASE_SCHEMA_VALIDATION.sql` - Validates entire schema

## 🎯 Summary

Your Supabase database is now fully configured with:
- ✅ All required tables
- ✅ All required columns
- ✅ All required indexes
- ✅ Row Level Security enabled
- ✅ Proper defaults and constraints

You're ready to use your app with Supabase! 🚀

