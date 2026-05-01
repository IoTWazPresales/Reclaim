# Training Session Notifications – Handover Document

**Date:** January 2025  
**Context:** Guided training session notification flow on watch + phone, with live rest countdown  
**Current blocker:** Resolved — was Sentry source map upload (missing `SENTRY_AUTH_TOKEN`), not the chronometer patch. See §3 and §8.

---

## 1. Summary of Work Completed

### 1.1 Desired Flow (What We Implemented)

1. **Prep start** – Immediate notification: "Session about to start" with countdown in body (e.g. "Starting in 30s")
2. **First set** – Notification: "Session started" with actions: **Done** (log set), **Skip** (skip set), **Edit** (open phone)
3. **Rest** – Notification with rest duration, **Skip** button, and **live countdown** on Android
4. **Next set** – When countdown ends or Skip is pressed, next set notification replaces the previous one
5. **Phone fallback** – Same notifications on phone when no watch
6. **Done → Rest immediately** – Tapping Done on watch logs the set and shows rest notification right away

### 1.2 Files Changed

| File | Changes |
|------|---------|
| `app/src/components/training/GuidedPrepScreen.tsx` | Added immediate "Session about to start" notification; `prepStartNotificationIdRef`; dismiss on complete/cancel |
| `app/src/hooks/useNotifications.ts` | Added SKIP_SET to TRAINING_SET category; SKIP_SET handler; clear `training_first` on SET_DONE for set 1; clear delayed `training_set` on NEXT_SET; TRAINING_REST button label changed to "Skip" |
| `app/src/lib/notifications/NotificationScheduler.ts` | Added `identifier?: string` to PlannedNotification; pass `identifier: 'reclaim-training-current'` for TRAINING_REST and TRAINING_SET (replace previous); pass `chronometerCountDown` and `chronometerBaseTime` in restData |
| `app/src/lib/notifications/trainingNotificationScheduler.ts` | Added `chronometerCountDown: true` and `chronometerBaseTime` to TRAINING_REST payload |
| `app/plugins/withExpoNotificationsChronometer.js` | **New file** – Config plugin that patches expo-notifications `ExpoNotificationBuilder.kt` for Android chronometer countdown |
| `app/app.config.ts` | Registered `./plugins/withExpoNotificationsChronometer` |

---

## 2. Architecture

### 2.1 Notification Flow

```
GuidedPrepScreen (prep countdown)
    │
    ├─► Immediate: "Session about to start"
    └─► At T=0: "Time to start" → onComplete → TrainingSessionView
                    │
                    └─► scheduleTrainingFirstSet (intent: training_first:...)
                            │
                            └─► buildPlanFromIntents → reconcile → TRAINING_SET (immediate, Done/Skip/Edit)
                                                                    │
User taps Done ─────────────────────────────────────────────────────┘
    │
    └─► processNotificationResponse (SET_DONE)
            │
            ├─► logTrainingSetWithRetry
            ├─► clearIntent(training_set:...) + clearIntent(training_first:...) if set 1
            ├─► scheduleTrainingRest (immediate) + scheduleTrainingSet (delayed)
            │       └─► Rest notification with chronometerCountDown + chronometerBaseTime
            │
            └─► Rest appears immediately with live countdown (Android)

User taps Skip (rest) ──► NEXT_SET handler
    │
    ├─► clearIntent(training_rest:...) + clearIntent(training_set:...)  // prevents duplicate
    └─► scheduleTrainingSetImmediate → next set notification (replaces rest via identifier)
```

### 2.2 Key Concepts

- **Intent store** – `NotificationIntentStore.ts`; intents drive `buildPlanFromIntents` in `NotificationScheduler.ts`
- **Reconcile** – `reconcileNotifications()` syncs scheduled notifications with intents; cancels/stale, schedules new
- **Stable identifier** – `reclaim-training-current` makes new training notifications replace the previous one on Android

### 2.3 Chronometer Patch

The config plugin `withExpoNotificationsChronometer.js` runs during prebuild and patches:

```
node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt
```

It injects Kotlin after `notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }`:

```kotlin
// Chronometer countdown for rest notifications (Reclaim patch)
notificationContent.body?.let { body ->
  if (body.optBoolean("chronometerCountDown", false)) {
    val baseTime = body.optLong("chronometerBaseTime", 0L)
    if (baseTime > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      builder.setUsesChronometer(true)
      builder.setChronometerCountDown(true)
      builder.setWhen(baseTime)
    }
  }
}
```

- **Payload:** `chronometerCountDown: true`, `chronometerBaseTime = Date.now() + restSeconds * 1000`
- **Data flow:** JS `content.data` → expo’s BODY_KEY (`"data"`) → `notificationContent.body` (JSONObject)

---

## 3. Sentry Source Map Upload (Actual Cause of Gradle Failure)

The EAS build was failing because **Sentry's Gradle task** uploads React Native source maps and requires `SENTRY_AUTH_TOKEN`. On EAS the token was not set, so the task failed with:

```text
error: Auth token is required for this request. Please run `sentry-cli login` and try again!
> Task :app:createBundleReleaseJsAndAssets_SentryUpload_... FAILED
```

**Fix applied:** `SENTRY_DISABLE_AUTO_UPLOAD=true` is set in `app/eas.json` for Android build profiles. The Sentry upload task is then skipped and the build succeeds. The app and Sentry runtime reporting still work; only source map uploads are disabled.

**To enable source map uploads (optional):**

1. Create an auth token at [Sentry → Settings → Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) with `project:releases` and `org:read`.
2. Add it as an EAS secret: `eas secret:create --name SENTRY_AUTH_TOKEN --value YOUR_TOKEN --scope project`
3. Remove (or set to `false`) `SENTRY_DISABLE_AUTO_UPLOAD` in the relevant profile(s) in `app/eas.json` so the upload runs when the token is present.


---

## 4. How to Debug Gradle / Chronometer Issues

If a future Gradle failure is **Sentry-related**, see §3. If it’s **chronometer/patch-related**:

1. **Confirm the patch runs** – Check EAS build logs for `[withExpoNotificationsChronometer]`.
2. **Inspect the patched file** – After prebuild locally (`npx expo prebuild --clean`), open `node_modules/expo-notifications/.../ExpoNotificationBuilder.kt` and verify the injected Kotlin.
3. **Temporarily disable the plugin** – Comment it out in `app.config.ts` and rebuild. If the build passes, the plugin is the cause.
4. **Alternatives if patch is unreliable:**
   - Use `patch-package` so the patch is applied deterministically.
   - Drop the chronometer feature and rely on the static rest body (e.g. "Exercise • 1:30 rest") until expo-notifications supports it.
   - Open an issue/PR to expo-notifications for chronometer support.

---

## 5. File Paths (Relative to `app/`)

```
app/
├── app.config.ts
├── plugins/
│   └── withExpoNotificationsChronometer.js
├── src/
│   ├── components/training/
│   │   ├── GuidedPrepScreen.tsx
│   │   └── TrainingSessionView.tsx
│   ├── hooks/
│   │   └── useNotifications.ts
│   └── lib/notifications/
│       ├── NotificationScheduler.ts
│       ├── NotificationIntentStore.ts
│       └── trainingNotificationScheduler.ts
```

---

## 6. Dependencies

- `expo-notifications` ~0.32.16
- `expo` ~54.0.33

---

## 7. Related Documentation

- Conversation summary (training session notification flow)
- Plan file: `notification_system_fixes_34ccea63.plan.md` (if present)
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Android NotificationCompat.setChronometerCountDown: https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder#setChronometerCountDown(boolean)

---

## 8. PROMPT TO PASTE IN NEW CHAT

Copy the block below (including the Gradle error when you have it) and paste it into a new chat:

```
I'm working on the Reclaim app. We implemented guided training session notifications with a live rest countdown on Android. The implementation uses an Expo config plugin that patches expo-notifications' ExpoNotificationBuilder.kt to add chronometer countdown support.

Full context is in: app/Documentation/TRAINING_NOTIFICATIONS_HANDOVER.md

The EAS build is failing with this Gradle error:

```
Check generated source map for Debug ID: d47a69c1-b25a-4ccb-b7d6-3625561f36ad
Sentry Source Maps upload will include the release name and dist.
Sentry-CLI arguments: [..., --release, com.fissioncorporation.reclaim@1.0.2+3, --dist, 3]
INFO Loaded file referenced by SENTRY_PROPERTIES (.../android/sentry.properties)
Processing react-native sourcemaps for Sentry upload.
> Task :app:createBundleReleaseJsAndAssets_SentryUpload_com.fissioncorporation.reclaim@1.0.2+3_3 FAILED
error: Auth token is required for this request. Please run `sentry-cli login` and try again!
...
BUILD FAILED
* Where: Script '.../node_modules/@sentry/react-native/sentry.gradle' line: 149
* What went wrong: Execution failed for task ':app:createBundleReleaseJsAndAssets_SentryUpload_...'.
> Process 'command '.../sentry-cli'' finished with non-zero exit value 1
```

Please help me fix the build. Key files:
- app/plugins/withExpoNotificationsChronometer.js (the config plugin that patches expo-notifications)
- app/app.config.ts (where the plugin is registered)
- app/node_modules/expo-notifications/android/.../ExpoNotificationBuilder.kt (the patched file)

If the patch approach is too fragile, suggest alternatives (e.g. patch-package, or removing chronometer and keeping static rest body).
```
