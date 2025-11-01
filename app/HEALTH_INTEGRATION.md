# Direct Health Platform Integration

## Overview

Your app now has **direct integration** with multiple health platforms:

- ✅ **Apple HealthKit** (iOS) - Full integration with heart rate, sleep, activity, stress inference
- ✅ **Samsung Health** (Android) - Via Health Connect aggregation (Samsung Health data is accessible through Health Connect)
- ✅ **Google Fit** (Android) - Direct integration with heart rate, sleep, activity
- ✅ **Health Connect** (Android) - Aggregates data from Samsung Health, Google Fit, and other apps

## What Changed

### 1. Unified Health Service
- **Location**: `app/src/lib/health/`
- **Purpose**: Single interface that automatically selects the best available health platform
- **Features**:
  - Auto-detects available platforms
  - Prioritizes native platforms (Apple HealthKit on iOS, Samsung Health/Health Connect on Android)
  - Provides unified API regardless of platform
  - Real-time monitoring capabilities

### 2. Health-Based Notification Triggers
- **Location**: `app/src/lib/health/notificationTriggers.ts`
- **Purpose**: Automatically triggers mindfulness/meditation notifications based on health data
- **Triggers**:
  - **Heart Rate Spikes**: When HR exceeds threshold (default 100 bpm)
  - **High Stress**: When stress level detected (default 70+)
  - **Low Activity**: When daily steps below threshold by afternoon
  - **Sleep End**: Meditation reminder after waking up

### 3. Enhanced Meditation Scheduler
- **Location**: `app/src/hooks/useMeditationScheduler.tsx`
- **Change**: Now uses unified health service instead of just Health Connect
- **Benefit**: Works with Apple Health, Samsung Health, Google Fit, and Health Connect

### 4. Updated Permissions Screen
- **Location**: `app/src/screens/onboarding/PermissionsScreen.tsx`
- **Change**: Now requests all health permissions via unified service
- **Display**: Shows which health platform is being used (Apple Health, Samsung Health, etc.)

### 5. Mindfulness Screen
- **Location**: `app/src/screens/MindfulnessScreen.tsx`
- **Change**: Added toggle for health-based triggers
- **Feature**: Users can enable/disable automatic mindfulness notifications based on health data

## How It Works

### Platform Detection
The app automatically detects and prioritizes:
1. **iOS**: Apple HealthKit
2. **Android**: Samsung Health (via Health Connect) → Health Connect → Google Fit

### Health Monitoring
The service monitors health data in real-time:
- Heart rate checked every 60 seconds
- Stress levels inferred from heart rate variability
- Sleep sessions checked every 5 minutes
- Activity levels checked every hour

### Notification Triggers
When health conditions are met, the app:
1. Sends a notification with mindfulness suggestion
2. Includes deep link to open meditation/mindfulness directly
3. Tracks the trigger reason for analytics

## Usage

### Enable Health Triggers
```typescript
import { useHealthTriggers } from '@/hooks/useHealthTriggers';

function MyComponent() {
  const healthTriggers = useHealthTriggers(true); // enable
  // Triggers will automatically start monitoring
}
```

### Configure Triggers
```typescript
import { updateHealthTriggerConfig } from '@/lib/health';

await updateHealthTriggerConfig({
  heartRateSpikeThreshold: 105, // bpm
  stressThreshold: 75, // 0-100
  meditationType: 'body_scan',
});
```

### Access Health Data Directly
```typescript
import { getUnifiedHealthService } from '@/lib/health';

const healthService = getUnifiedHealthService();
const heartRate = await healthService.getLatestHeartRate();
const sleep = await healthService.getLatestSleepSession();
const stress = await healthService.getLatestStressLevel();
```

## Benefits

1. **Multi-Platform Support**: Works with Apple, Samsung, and Google health platforms
2. **Automatic Platform Selection**: Chooses best available platform automatically
3. **Real-Time Monitoring**: Watches health metrics continuously
4. **Smart Notifications**: Triggers mindfulness reminders at the right time
5. **Unified API**: Same code works across all platforms

## Permissions

The app requests permissions for:
- Heart rate (read)
- Heart rate variability (read)
- Sleep analysis (read)
- Sleep stages (read)
- Steps (read)
- Active energy burned (read)

**Note**: Users must grant these permissions for health-based triggers to work.

## Future Enhancements

Possible future improvements:
- Direct Samsung Health SDK integration (requires native module)
- More sophisticated stress detection
- Custom trigger rules
- Integration with more health metrics (blood pressure, etc.)
- Machine learning for personalized thresholds

## Testing

To test health integration:
1. Grant health permissions during onboarding
2. Enable "Health-based triggers" in Mindfulness screen
3. Ensure your device/app has recent health data
4. Trigger conditions manually (e.g., exercise to spike heart rate)
5. Check that notifications appear appropriately

---

**Note**: Health Connect aggregates Samsung Health data on Android, so you don't need a separate Samsung Health SDK. The app automatically accesses Samsung Health data through Health Connect when available.

