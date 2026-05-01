# Debugging: Why Sleep Data Isn't Saving to sleep_sessions

## Potential Issues

### 1. **Permissions Not Granted** (Most Likely)
**Location**: `app/src/lib/sync.ts:127-129`

```typescript
if (!hasPermissions) {
  logger.debug('Health permissions not granted; skipping health sync.');
  return result;  // ← Returns early, nothing saved
}
```

**Check**: 
- Is a health provider connected? (Google Fit, Health Connect, etc.)
- Are permissions actually granted in the provider app?
- Check logs for: `"Health permissions not granted; skipping health sync."`

### 2. **No Sleep Data Returned**
**Location**: `app/src/lib/sync.ts:137`

```typescript
if (latestSleep?.startTime && latestSleep?.endTime) {
  // Only saves if both startTime and endTime exist
}
```

**Check**:
- Is there actually sleep data in the health provider?
- Check logs for errors from `getLatestSleepSession()`
- The function silently returns if no sleep data found

### 3. **Database Error (Silently Caught)**
**Location**: `app/src/lib/sync.ts:149-151`

```typescript
try {
  await upsertSleepSessionFromHealth({...});
  result.sleepSynced = true;
} catch (error) {
  logger.warn('Failed to upsert sleep session from health provider:', error);
  // ← Error logged but not thrown, function continues
}
```

**Check**:
- Does the `sleep_sessions` table exist in Supabase?
- Are there RLS policies blocking writes?
- Check logs for: `"Failed to upsert sleep session from health provider"`

### 4. **syncHealthData Not Being Called**
**Location**: `app/src/screens/Dashboard.tsx:532`

The function is only called:
- When user manually triggers sync in Dashboard
- In background sync task (if enabled)
- **NOT automatically on app launch** (unless Dashboard calls it)

**Check**:
- Is `runHealthSync()` being called?
- Check if `syncHealthData()` is actually executing

## How to Debug

### Step 1: Add Logging

Add this to `app/src/lib/sync.ts` in `syncHealthData()`:

```typescript
export async function syncHealthData(): Promise<{...}> {
  logger.debug('=== syncHealthData START ===');
  
  const service = getUnifiedHealthService();
  if (!service) {
    logger.error('Health service unavailable');
    return result;
  }
  logger.debug('Health service available');

  const hasPermissions = await service.hasAllPermissions();
  logger.debug('Has permissions:', hasPermissions);
  if (!hasPermissions) {
    logger.error('PERMISSIONS NOT GRANTED - This is why nothing is saving!');
    return result;
  }

  const [latestSleep, todayActivity] = await Promise.all([...]);
  logger.debug('Latest sleep:', latestSleep ? {
    hasStartTime: !!latestSleep.startTime,
    hasEndTime: !!latestSleep.endTime,
    duration: latestSleep.durationMinutes,
    source: latestSleep.source
  } : 'null');

  if (latestSleep?.startTime && latestSleep?.endTime) {
    try {
      logger.debug('Attempting to save sleep session...');
      await upsertSleepSessionFromHealth({...});
      logger.debug('✅ Sleep session saved successfully!');
      result.sleepSynced = true;
    } catch (error) {
      logger.error('❌ FAILED TO SAVE:', error);
      // Re-throw to see the actual error
      throw error;
    }
  } else {
    logger.warn('No sleep data to save (missing startTime or endTime)');
  }
  
  logger.debug('=== syncHealthData END ===');
  return result;
}
```

### Step 2: Check Database

Run in Supabase SQL editor:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'sleep_sessions';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'sleep_sessions';

-- Try manual insert to test permissions
INSERT INTO sleep_sessions (
  id, user_id, start_time, end_time, source
) VALUES (
  'test_123', 
  (SELECT id FROM auth.users LIMIT 1),
  NOW() - INTERVAL '8 hours',
  NOW(),
  'manual'
);
```

### Step 3: Test syncHealthData Manually

In Dashboard, add a button to manually trigger:

```typescript
<Button onPress={async () => {
  const result = await syncHealthData();
  Alert.alert('Sync Result', JSON.stringify(result, null, 2));
}}>
  Test Health Sync
</Button>
```

### Step 4: Check Provider Connection

In SleepScreen, verify:
1. Is a provider connected? (Check `connectedIntegrations`)
2. Does `getLatestSleepSession()` return data?
3. Are permissions actually granted?

## Most Common Issues

1. **Permissions not granted** - User connected provider but didn't grant permissions
2. **No sleep data** - Health provider has no recent sleep sessions
3. **Table doesn't exist** - `sleep_sessions` table not created in Supabase
4. **RLS blocking writes** - Row Level Security policy preventing inserts
5. **syncHealthData never called** - Function exists but isn't being triggered

## Quick Fix Test

Add this temporary function to test:

```typescript
// In Dashboard or SleepScreen
const testSleepSave = async () => {
  try {
    const testSession = {
      startTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      endTime: new Date(),
      source: 'manual' as const,
      durationMinutes: 480,
    };
    
    await upsertSleepSessionFromHealth({
      ...testSession,
      source: 'google_fit', // or whatever platform
    });
    
    Alert.alert('Success', 'Test sleep session saved!');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

If this works, the issue is with data fetching, not saving.
If this fails, the issue is with database permissions/table.

