# How to Get Sleep Data from Samsung Health and Save It

## Overview

This document explains the complete flow of how sleep data from Samsung Health is fetched, processed, and saved to your Supabase database so it can be viewed in the app.

## Current State

### ✅ What's Already Implemented

1. **Samsung Health Provider** (`app/src/lib/health/providers/samsungHealth.ts`)
   - A provider class exists that can read sleep sessions from Samsung Health
   - It expects a native module called `SamsungHealth` to be available
   - The provider maps Samsung Health data to the unified `SleepSession` format

2. **Unified Health Service** (`app/src/lib/health/unifiedService.ts`)
   - Automatically selects the best available health provider
   - Provides a unified interface for fetching sleep data
   - Handles provider priority (Google Fit > Health Connect > Samsung Health)

3. **Sync Function** (`app/src/lib/sync.ts`)
   - `syncHealthData()` function fetches latest sleep from the active provider
   - Calls `upsertSleepSessionFromHealth()` to save to Supabase

4. **Database Save Function** (`app/src/lib/api.ts`)
   - `upsertSleepSessionFromHealth()` saves sleep data to `sleep_sessions` table
   - Handles sleep stages, efficiency, heart rate, and other metadata

5. **UI Display** (`app/src/screens/SleepScreen.tsx`)
   - Shows last night's sleep data
   - Displays sleep stages (hypnogram)
   - Shows heart rate and body temperature if available

### ⚠️ What's Missing

1. **Native Module**: The `SamsungHealth` native module is not implemented
   - The code expects `NativeModules.SamsungHealth` to exist
   - This requires either:
     - Samsung Health Partner SDK (official, requires partnership approval)
     - OR a custom React Native bridge to Samsung Health APIs

2. **Current Workaround**: 
   - Samsung Health data can be accessed **indirectly** through Google Fit
   - If Samsung Health syncs to Google Fit, the app can read it via Google Fit provider
   - This is already working if Google Fit is connected

## Complete Data Flow

### Step 1: User Connects Samsung Health

**Location**: `app/src/lib/health/integrations.ts` → `connectSamsungHealth()`

1. User taps "Samsung Health" in the Sleep screen's "Connect & Sync" card
2. App calls `SamsungHealthProvider.requestPermissions()`
3. Provider checks if native module `SamsungHealth` is available
4. If available, calls `SamsungHealthNative.connect()` to request permissions
5. Connection status is saved to `integrationStore`

### Step 2: Fetch Sleep Data from Samsung Health

**Location**: `app/src/lib/health/providers/samsungHealth.ts` → `getSleepSessions()`

1. App calls `SamsungHealthProvider.getSleepSessions(startDate, endDate)`
2. Provider calls native module: `SamsungHealthNative.readSleepSessions(startTimestamp, endTimestamp)`
3. Native module returns raw Samsung Health data:
   ```typescript
   {
     start: number,        // Unix timestamp (ms)
     end: number,          // Unix timestamp (ms)
     stages?: Array<{      // Sleep stage segments
       start: number,
       end: number,
       stage: string       // "deep", "rem", "light", "awake"
     }>,
     efficiency?: number,   // 0-1
     deepSleep?: number,    // minutes
     remSleep?: number,     // minutes
     lightSleep?: number,   // minutes
     awake?: number,        // minutes
     avgHeartRate?: number,
     minHeartRate?: number,
     maxHeartRate?: number,
     bodyTemperature?: number
   }
   ```
4. Provider converts to unified format:
   ```typescript
   {
     startTime: Date,
     endTime: Date,
     durationMinutes: number,
     efficiency?: number,
     stages?: Array<{
       start: Date,
       end: Date,
       stage: 'awake' | 'light' | 'deep' | 'rem'
     }>,
     source: 'samsung_health',
     metadata: {
       avgHeartRate, minHeartRate, maxHeartRate,
       bodyTemperature, deepSleepMinutes, etc.
     }
   }
   ```

### Step 3: Save to Supabase Database

**Location**: `app/src/lib/api.ts` → `upsertSleepSessionFromHealth()`

1. `syncHealthData()` calls `upsertSleepSessionFromHealth()` with the sleep session
2. Function creates/updates a row in `sleep_sessions` table:
   ```sql
   INSERT INTO sleep_sessions (
     id,                    -- Format: "{user_id}_{startISO}"
     user_id,
     start_time,            -- ISO timestamp
     end_time,              -- ISO timestamp
     source,                -- Maps to 'googlefit' (see HEALTH_PLATFORM_TO_SLEEP_SOURCE)
     duration_minutes,
     efficiency,
     stages,                -- JSONB array of stage segments
     metadata               -- JSONB with heart rate, temperature, etc.
   ) VALUES (...) 
   ON CONFLICT (id) DO UPDATE ...
   ```

3. Database table structure (expected):
   ```sql
   CREATE TABLE sleep_sessions (
     id TEXT PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     start_time TIMESTAMPTZ NOT NULL,
     end_time TIMESTAMPTZ NOT NULL,
     source TEXT,  -- 'healthkit', 'googlefit', 'manual'
     duration_minutes INTEGER,
     efficiency NUMERIC(3,2),  -- 0.00 to 1.00
     stages JSONB,  -- Array of {start, end, stage}
     metadata JSONB,  -- {avgHeartRate, bodyTemperature, etc.}
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Step 4: Display in UI

**Location**: `app/src/screens/SleepScreen.tsx`

1. `SleepScreen` uses React Query to fetch sleep data:
   - Query key: `['sleep:last']`
   - Query function: `fetchLastSleepSession()`
   - Calls `getUnifiedHealthService().getLatestSleepSession()`

2. UI displays:
   - Sleep duration (hours and minutes)
   - Sleep efficiency percentage
   - Sleep stages breakdown (awake, light, deep, REM)
   - Hypnogram visualization
   - Heart rate and body temperature (if available)

3. User can manually confirm sleep, which saves to `entries` table:
   - Calls `upsertTodayEntry({ sleep_hours: durationInHours })`
   - This is separate from the detailed `sleep_sessions` table

## Implementation Requirements

### Option 1: Use Samsung Health Partner SDK (Recommended)

**Requirements:**
1. Apply for [Samsung Health Partner Program](https://developer.samsung.com/health)
2. Get approved and receive SDK access
3. Integrate Samsung Health SDK as a native module
4. Bridge SDK methods to React Native:
   - `isAvailable()` - Check if Samsung Health is installed
   - `connect()` - Request permissions
   - `readSleepSessions(start, end)` - Read sleep data
   - `readHeartRate(start, end)` - Read heart rate
   - `readDailySteps(start, end)` - Read steps

**Native Module Interface Expected:**
```typescript
// Native module should expose:
interface SamsungHealthNative {
  isAvailable(): Promise<boolean>;
  connect(): Promise<boolean | { success: boolean }>;
  disconnect(): void;
  readSleepSessions(start: number, end: number): Promise<NativeSleepSession[]>;
  readHeartRate(start: number, end: number): Promise<NativeHeartRate[]>;
  readDailySteps(start: number, end: number): Promise<NativeStepResponse>;
}
```

### Option 2: Use Google Fit as Proxy (Current Workaround)

**How it works:**
1. User connects Google Fit in the app
2. If Samsung Health syncs to Google Fit (user must enable this in Samsung Health settings)
3. App reads sleep data from Google Fit
4. Google Fit provider detects Samsung Health as the source:
   ```typescript
   // In googleFit.ts, line 143-151
   const isSamsungSource = 
     sourceName.includes('samsung') ||
     sourceName.includes('shealth') ||
     sourceName.includes('com.samsung');
   ```
5. Data is saved with `source: 'samsung_health'` even though it came through Google Fit

**Limitations:**
- Requires user to manually enable Samsung Health → Google Fit sync
- May not include all Samsung Health-specific data (e.g., body temperature)
- Depends on Google Fit's aggregation accuracy

### Option 3: Use Health Connect (Android 13+)

**How it works:**
1. User connects Health Connect in the app
2. Health Connect aggregates data from multiple sources including Samsung Health
3. App reads sleep data from Health Connect
4. Data is saved to Supabase

**Requirements:**
- Android 13+
- Health Connect app installed
- User grants sleep data permissions

## Automatic Sync Flow

**Location**: `app/src/lib/sync.ts` → `syncHealthData()`

1. **Trigger**: Called automatically when:
   - App launches (if health provider is connected)
   - User taps "Import latest data" in Sleep screen
   - New health provider connects

2. **Process**:
   ```typescript
   // 1. Get unified health service
   const service = getUnifiedHealthService();
   
   // 2. Check permissions
   const hasPermissions = await service.hasAllPermissions();
   
   // 3. Fetch latest sleep session
   const latestSleep = await service.getLatestSleepSession();
   
   // 4. Save to Supabase
   if (latestSleep) {
     await upsertSleepSessionFromHealth({
       startTime: latestSleep.startTime,
       endTime: latestSleep.endTime,
       source: latestSleep.source,  // 'samsung_health'
       durationMinutes: latestSleep.durationMinutes,
       efficiency: latestSleep.efficiency,
       stages: latestSleep.stages,
       metadata: latestSleep.metadata
     });
   }
   ```

3. **Result**: Sleep data is now in `sleep_sessions` table and can be queried/displayed

## Database Schema

### `sleep_sessions` Table

```sql
CREATE TABLE sleep_sessions (
  id TEXT PRIMARY KEY,  -- Format: "{user_id}_{start_time_iso}"
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  source TEXT,  -- 'healthkit', 'googlefit', 'manual'
  duration_minutes INTEGER,
  efficiency NUMERIC(3,2),  -- 0.00 to 1.00
  stages JSONB,  -- Array: [{start: ISO, end: ISO, stage: string}]
  metadata JSONB,  -- {avgHeartRate, minHeartRate, maxHeartRate, bodyTemperature, ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_sleep_sessions_user_start ON sleep_sessions(user_id, start_time DESC);
```

### Example Row

```json
{
  "id": "user-uuid_2024-01-15T22:30:00.000Z",
  "user_id": "user-uuid",
  "start_time": "2024-01-15T22:30:00.000Z",
  "end_time": "2024-01-16T06:45:00.000Z",
  "source": "googlefit",
  "duration_minutes": 495,
  "efficiency": 0.87,
  "stages": [
    {"start": "2024-01-15T22:30:00Z", "end": "2024-01-15T23:00:00Z", "stage": "light"},
    {"start": "2024-01-15T23:00:00Z", "end": "2024-01-16T01:30:00Z", "stage": "deep"},
    {"start": "2024-01-16T01:30:00Z", "end": "2024-01-16T02:00:00Z", "stage": "rem"},
    ...
  ],
  "metadata": {
    "avgHeartRate": 58,
    "minHeartRate": 52,
    "maxHeartRate": 65,
    "bodyTemperature": 36.5,
    "deepSleepMinutes": 150,
    "remSleepMinutes": 90,
    "lightSleepMinutes": 240,
    "awakeMinutes": 15
  }
}
```

## Viewing Sleep Data

### In the App

1. **Sleep Screen** (`app/src/screens/SleepScreen.tsx`):
   - Shows last night's sleep automatically
   - Displays duration, efficiency, stages
   - Shows hypnogram visualization
   - Shows heart rate and temperature if available

2. **Query Function**:
   ```typescript
   // Fetch latest sleep
   const sleep = await getUnifiedHealthService().getLatestSleepSession();
   
   // Fetch multiple sessions
   const sessions = await listSleepSessions(30);  // Last 30 days
   ```

### In Supabase

```sql
-- Get user's sleep sessions
SELECT * FROM sleep_sessions 
WHERE user_id = 'user-uuid' 
ORDER BY start_time DESC 
LIMIT 10;

-- Get average sleep duration
SELECT AVG(duration_minutes) as avg_minutes
FROM sleep_sessions
WHERE user_id = 'user-uuid'
  AND start_time >= NOW() - INTERVAL '30 days';
```

## Summary

**To get Samsung Health sleep data working:**

1. **Short-term (works now)**: 
   - Connect Google Fit
   - Enable Samsung Health → Google Fit sync in Samsung Health app
   - App will read Samsung Health data through Google Fit

2. **Long-term (requires implementation)**:
   - Get Samsung Health Partner SDK access
   - Implement native module bridge
   - Connect Samsung Health directly in app
   - Data flows: Samsung Health → Native Module → Provider → Unified Service → Supabase → UI

**The code is already set up** - you just need the native module implementation to bridge Samsung Health SDK to React Native.

